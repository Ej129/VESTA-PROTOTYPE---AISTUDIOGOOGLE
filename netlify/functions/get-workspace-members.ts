import { getStore } from "@netlify/blobs";
import type { Context } from "@netlify/functions";

interface WorkspaceMember {
    email: string;
    role: "Administrator" | "Risk Management Officer" | "Strategy Officer" | "Member";
}

export default async (req: Request, context: Context) => {
  const user = context.netlify.identity;
  if (!user) {
    return new Response(JSON.stringify({ error: "Authentication required." }), { 
      status: 401, 
      headers: { "Content-Type": "application/json" }
    });
  }

  const url = new URL(req.url);
  const workspaceId = url.searchParams.get("workspaceId");

  if (!workspaceId) {
    return new Response(JSON.stringify({ error: "workspaceId is required" }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const store = getStore("vesta-data");
    const allMemberships = await store.get("workspace-members", { type: "json" }) as Record<string, WorkspaceMember[]> || {};
    const members = allMemberships[workspaceId] || [];
    
    // Security check: ensure the requesting user is a member of the workspace
    if (!members.some(m => m.email === user.email)) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { 
            status: 403,
            headers: { "Content-Type": "application/json" }
        });
    }

    return new Response(JSON.stringify(members), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching workspace members:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch members" }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
    });
  }
};