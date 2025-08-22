

import { getStore } from "@netlify/blobs";
import type { Handler, HandlerContext } from "@netlify/functions";
import { Workspace } from '../../src/types';

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
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Method Not Allowed" }),
        headers: { "Content-Type": "application/json" },
      };
    }

    // 2. Authentication Check
    const user = requireAuth(context);
    
    // 3. Business Logic
    const storeOptions = {
        siteID: process.env.NETLIFY_SITE_ID,
        token: process.env.NETLIFY_API_TOKEN,
    };
    const workspacesStore = getStore({ name: "workspaces", ...storeOptions });
    const userWorkspacesStore = getStore({ name: "user-workspaces", ...storeOptions });
    
    // Get the list of workspace IDs associated with the user
    const userWorkspaceIds = (await userWorkspacesStore.get(user.email, { type: "json" })) as string[] || [];

    if (userWorkspaceIds.length === 0) {
        return {
            statusCode: 200,
            body: JSON.stringify([]),
            headers: { "Content-Type": "application/json" },
        };
    }
    
    // Fetch all workspace documents in parallel
    const workspacePromises = userWorkspaceIds.map(id => workspacesStore.get(id, { type: "json" }));
    const userWorkspacesData = (await Promise.all(workspacePromises)).filter(Boolean) as Workspace[];

    // 4. Success Response
    return {
      statusCode: 200,
      body: JSON.stringify(userWorkspacesData),
      headers: { "Content-Type": "application/json" },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    console.error(`Error in get-workspaces: ${errorMessage}`, error);

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