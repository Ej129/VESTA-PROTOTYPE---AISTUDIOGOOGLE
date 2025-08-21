
import { getStore } from "@netlify/blobs";
import type { Handler, HandlerContext } from "@netlify/functions";
import { WorkspaceMember } from '../../types';

const requireAuth = (context: HandlerContext) => {
  const user = context.clientContext?.user;
  if (!user || !user.email) {
    throw new Error("Authentication required.");
  }
  return user;
};

export const handler: Handler = async (event, context) => {
    try {
        if (event.httpMethod !== "POST") {
            return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }), headers: { "Content-Type": "application/json" } };
        }
        
        const user = requireAuth(context);
        if (!event.body) {
            return { statusCode: 400, body: JSON.stringify({ error: "Request body is missing." }), headers: { "Content-Type": "application/json" } };
        }

        const { workspaceId } = JSON.parse(event.body);
        if (!workspaceId) {
            return { statusCode: 400, body: JSON.stringify({ error: "Missing workspaceId." }), headers: { "Content-Type": "application/json" } };
        }
        
        const storeOptions = {
            siteID: process.env.NETLIFY_SITE_ID,
            token: process.env.NETLIFY_API_TOKEN,
        };

        const membersStore = getStore({ name: "workspace-members", ...storeOptions });
        const members = (await membersStore.get(workspaceId, { type: "json" })) as WorkspaceMember[] || [];
        const currentUser = members.find(m => m.email === user.email);
        if (!currentUser || currentUser.role !== "Administrator") {
            return { statusCode: 403, body: JSON.stringify({ error: "Forbidden: Only administrators can delete a workspace." }), headers: { "Content-Type": "application/json" } };
        }

        // --- DELETION PROCESS ---
        
        // 1. Update user-workspaces for all members
        const userWorkspacesStore = getStore({ name: "user-workspaces", ...storeOptions });
        for (const member of members) {
            const userWorkspaces = (await userWorkspacesStore.get(member.email, { type: "json" })) as string[] || [];
            if(userWorkspaces.length > 0) {
                const updatedUserWorkspaces = userWorkspaces.filter(id => id !== workspaceId);
                await userWorkspacesStore.setJSON(member.email, updatedUserWorkspaces);
            }
        }

        // 2. Delete all workspace-specific data
        const storesToDeleteFrom = [
            "workspaces", 
            "workspace-members", 
            "reports", 
            "audit-logs", 
            "knowledge-sources", 
            "dismissal-rules", 
            "custom-regulations"
        ];

        const deletePromises = storesToDeleteFrom.map(storeName => {
            const store = getStore({ name: storeName, ...storeOptions });
            return store.delete(workspaceId);
        });

        await Promise.all(deletePromises);

        return { statusCode: 204, body: '' };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        console.error(`Error in delete-workspace: ${errorMessage}`, error);

        if (error instanceof Error && error.name === 'MissingBlobsEnvironmentError') {
            return {
                statusCode: 500,
                body: JSON.stringify({ 
                    error: "Netlify Blobs is not configured.",
                    details: errorMessage 
                }),
                headers: { "Content-Type": "application/json" },
            };
        }
        if (error instanceof SyntaxError) {
          return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON format." }), headers: { "Content-Type": "application/json" } };
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
