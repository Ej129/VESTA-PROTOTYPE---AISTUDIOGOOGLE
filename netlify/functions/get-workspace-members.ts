import { getStore } from "@netlify/blobs";
import type { Handler } from "@netlify/functions";

interface WorkspaceMember {
  email: string;
  role: "Administrator" | "Risk Management Officer" | "Strategy Officer" | "Member";
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
    const { workspaceId } = event.queryStringParameters || {};
    if (!workspaceId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "workspaceId is required." }),
        headers: { "Content-Type": "application/json" },
      };
    }

    const store = getStore("vesta-data");

    const allMemberships = (await store.get("workspace-members", { type: "json" })) as Record<string, WorkspaceMember[]> || {};

    const members = allMemberships[workspaceId] || [];

    return {
      statusCode: 200,
      body: JSON.stringify(members),
      headers: { "Content-Type": "application/json" },
    };
  } catch (error) {
    console.error("Error fetching workspace members:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to fetch workspace members." }),
      headers: { "Content-Type": "application/json" },
    };
  }
};
