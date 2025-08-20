import { getStore } from "@netlify/blobs";
import type { Handler } from "@netlify/functions";

interface WorkspaceMember {
  email: string;
  role: "Administrator" | "Risk Management Officer" | "Strategy Officer" | "Member";
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
    // 3. Input Validation
    const { workspaceId } = event.queryStringParameters || {};
    if (!workspaceId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Query parameter 'workspaceId' is required." }),
        headers: { "Content-Type": "application/json" },
      };
    }

    // 4. Business Logic
    const store = getStore("vesta-data");
    const allMemberships = (await store.get("workspace-members", { type: "json" })) as Record<string, WorkspaceMember[]> || {};
    const members = allMemberships[workspaceId] || [];

    // Ensure the requesting user is a member of the workspace they're querying
    const isMember = members.some(m => m.email === user.email);
    if (!isMember) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: "You are not a member of this workspace." }),
        headers: { "Content-Type": "application/json" },
      };
    }

    // 5. Success Response
    return {
      statusCode: 200,
      body: JSON.stringify(members),
      headers: { "Content-Type": "application/json" },
    };
  } catch (error) {
    // 6. Error Handling
    console.error("Error fetching workspace members:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "An internal server error occurred while fetching members." }),
      headers: { "Content-Type": "application/json" },
    };
  }
};