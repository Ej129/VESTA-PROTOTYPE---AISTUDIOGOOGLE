import { getStore } from "@netlify/blobs";
import type { Handler } from "@netlify/functions";

interface Workspace {
  id: string;
  name: string;
  creatorId: string;
  createdAt: string;
}

export const handler: Handler = async (event, context) => {
  // 1. Method Check
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
      headers: { "Content-Type": "application/json" },
    };
  }

  // 2. Authentication Check
  const user = context.clientContext?.user;
  if (!user || !user.email) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "Authentication required." }),
      headers: { "Content-Type": "application/json" },
    };
  }

  try {
    // 3. Business Logic
    const store = getStore("vesta-data");
    const allWorkspaces = (await store.get("workspaces", { type: "json" })) as Workspace[] || [];
    const allMemberships = (await store.get("workspace-members", { type: "json" })) as Record<string, { email: string; role: string }[]> || {};

    // Filter to return only workspaces where the current user is a member
    const userWorkspaces = allWorkspaces.filter((ws) =>
      allMemberships[ws.id]?.some((member) => member.email === user.email)
    );

    // 4. Success Response
    return {
      statusCode: 200,
      body: JSON.stringify(userWorkspaces),
      headers: { "Content-Type": "application/json" },
    };
  } catch (error) {
    // 5. Error Handling
    console.error("Error fetching workspaces:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "An internal server error occurred while fetching workspaces." }),
      headers: { "Content-Type": "application/json" },
    };
  }
};