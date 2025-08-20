import { getStore } from "@netlify/blobs";
import type { Handler } from "@netlify/functions";

interface Workspace {
  id: string;
  name: string;
  creatorId: string;
  createdAt: string;
}

export const handler: Handler = async (event, context) => {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
      headers: { "Content-Type": "application/json" },
    };
  }

  const user = context.clientContext?.user;
  if (!user || !user.email) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "Authentication required." }),
      headers: { "Content-Type": "application/json" },
    };
  }

  try {
    const store = getStore("vesta-data");

    const allWorkspaces = (await store.get("workspaces", { type: "json" })) as Workspace[] || [];
    const allMemberships = (await store.get("workspace-members", { type: "json" })) as Record<string, { email: string; role: string }[]> || {};

    // filter only workspaces where the user is a member
    const userWorkspaces = allWorkspaces.filter((ws) =>
      allMemberships[ws.id]?.some((member) => member.email === user.email)
    );

    return {
      statusCode: 200,
      body: JSON.stringify(userWorkspaces),
      headers: { "Content-Type": "application/json" },
    };
  } catch (error) {
    console.error("Error fetching workspaces:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to fetch workspaces." }),
      headers: { "Content-Type": "application/json" },
    };
  }
};
