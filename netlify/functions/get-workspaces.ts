import { getStore } from "@netlify/blobs";
import type { Context } from "@netlify/functions";

// In a larger project or monorepo, these types would be shared.
// For simplicity in this serverless function, we redefine the necessary types.
interface Workspace {
  id: string;
  name: string;
  creatorId: string;
  createdAt: string;
}

interface WorkspaceMember {
    email: string;
    role: "Administrator" | "Risk Management Officer" | "Strategy Officer" | "Member";
}

export default async (req: Request, context: Context) => {
  // Netlify Identity automatically provides the authenticated user's context.
  const user = context.netlify.identity;

  // 1. Security Check: Ensure a user is logged in.
  if (!user) {
    return new Response(JSON.stringify({ error: "Authentication required." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // 2. Connect to the data store. We'll use a single store for simplicity.
    const store = getStore("vesta-data");

    // 3. Fetch all workspaces and membership data.
    // This pattern mirrors the localStorage approach. For very large scale,
    // a more granular data structure might be needed.
    const allWorkspaces = await store.get("workspaces", { type: "json" }) as Workspace[] || [];
    const allMemberships = await store.get("workspace-members", { type: "json" }) as Record<string, WorkspaceMember[]> || {};

    // 4. Filter workspaces to only include those the current user is a member of.
    const userWorkspaces = allWorkspaces.filter(ws => 
      allMemberships[ws.id]?.some(member => member.email === user.email)
    );

    // 5. Return the filtered data.
    return new Response(JSON.stringify(userWorkspaces), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error fetching workspaces:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch workspaces." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};