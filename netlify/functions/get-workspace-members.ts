
import { getStore } from "@netlify/blobs";
import type { Handler, HandlerContext } from "@netlify/functions";
import { WorkspaceMember } from '../../types';

// Helper to check for user authentication
const requireAuth = (context: HandlerContext) => {
  const user = context.clientContext?.user;
  if (!user || !user.email) {
    throw new Error("Authentication required.");
  }
  return user;
};

export const handler: Handler = async (event, context) => {
  try {
    // 1. Method Check
    if (event.httpMethod !== "GET") {
      return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
    }

    // 2. Authentication Check
    const user = requireAuth(context);

    // 3. Input Validation
    const { workspaceId } = event.queryStringParameters || {};
    if (!workspaceId) {
      return { statusCode: 400, body: JSON.stringify({ error: "Query parameter 'workspaceId' is required." }) };
    }

    // 4. Business Logic
    const membersStore = getStore("workspace-members");
    const members = (await membersStore.get(workspaceId, { type: "json" })) as WorkspaceMember[] || [];

    // Authorization: Ensure the requesting user is a member of the workspace
    if (!members.some(m => m.email === user.email)) {
      return { statusCode: 403, body: JSON.stringify({ error: "Forbidden: You are not a member of this workspace." }) };
    }

    // 5. Success Response
    return {
      statusCode: 200,
      body: JSON.stringify(members),
      headers: { "Content-Type": "application/json" },
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    console.error(`Error in get-workspace-members: ${errorMessage}`, error);

     if (error instanceof Error && error.message === "Authentication required.") {
      return { statusCode: 401, body: JSON.stringify({ error: error.message }) };
    }
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "An internal server error occurred.", details: errorMessage }),
      headers: { "Content-Type": "application/json" },
    };
  }
};
