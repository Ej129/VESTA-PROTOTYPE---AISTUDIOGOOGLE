

import { getStore } from "@netlify/blobs";
import type { Handler, HandlerContext } from "@netlify/functions";
import { WorkspaceMember } from '../../src/types';

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
      return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }), headers: { "Content-Type": "application/json" } };
    }

    // 2. Authentication Check
    const user = requireAuth(context);

    // 3. Input Validation
    const { workspaceId } = event.queryStringParameters || {};
    if (!workspaceId) {
      return { statusCode: 400, body: JSON.stringify({ error: "Query parameter 'workspaceId' is required." }), headers: { "Content-Type": "application/json" } };
    }

    // 4. Business Logic
    const membersStore = getStore({
        name: "workspace-members",
        siteID: process.env.NETLIFY_SITE_ID,
        token: process.env.NETLIFY_API_TOKEN,
    });
    const members = (await membersStore.get(workspaceId, { type: "json" })) as WorkspaceMember[] || [];

    // Authorization: Ensure the requesting user is a member of the workspace
    if (!members.some(m => m.email === user.email)) {
      return { statusCode: 403, body: JSON.stringify({ error: "Forbidden: You are not a member of this workspace." }), headers: { "Content-Type": "application/json" } };
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

    if (error instanceof Error && error.name === 'MissingBlobsEnvironmentError') {
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: "Netlify Blobs is not configured. Ensure NETLIFY_SITE_ID and NETLIFY_API_TOKEN environment variables are set correctly in your site configuration.",
                details: errorMessage 
            }),
            headers: { "Content-Type": "application/json" },
        };
    }
     if (error instanceof Error && error.message === "Authentication required.") {
      return { statusCode: 401, body: JSON.stringify({ error: error.message }), headers: { "Content-Type": "application/json" } };
    }
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "An internal server error occurred.", details: errorMessage }),
      headers: { "Content-Type": "application/json" },
    };
  }
};