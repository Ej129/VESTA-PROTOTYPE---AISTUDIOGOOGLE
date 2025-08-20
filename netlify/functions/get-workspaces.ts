
import { getStore } from "@netlify/blobs";
import type { Handler, HandlerContext } from "@netlify/functions";
import { Workspace } from '../../types';

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
    const workspacesStore = getStore("workspaces");
    const membersStore = getStore("workspace-members");
    
    const allMemberships = (await membersStore.get("all", { type: "json" })) as Record<string, { email: string; role: string }[]> || {};

    const userWorkspaceIds = Object.keys(allMemberships).filter(workspaceId => 
        allMemberships[workspaceId]?.some(member => member.email === user.email)
    );

    if (userWorkspaceIds.length === 0) {
        return {
            statusCode: 200,
            body: JSON.stringify([]),
            headers: { "Content-Type": "application/json" },
        };
    }
    
    const workspacePromises = userWorkspaceIds.map(id => workspacesStore.get(id, { type: "json" }));
    const userWorkspacesData = (await Promise.all(workspacePromises)).filter(Boolean) as Workspace[];

    // 4. Success Response
    return {
      statusCode: 200,
      body: JSON.stringify(userWorkspacesData),
      headers: { "Content-Type": "application/json" },
    };
  } catch (error) {
    console.error("Error in get-workspaces:", error);
    if (error instanceof Error && error.message === "Authentication required.") {
      return { statusCode: 401, body: JSON.stringify({ error: error.message }) };
    }
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "An internal server error occurred." }),
      headers: { "Content-Type": "application/json" },
    };
  }
};
