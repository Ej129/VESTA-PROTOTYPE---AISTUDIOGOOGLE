
import { getStore } from "@netlify/blobs";
import type { Handler, HandlerContext } from "@netlify/functions";
import { Workspace, WorkspaceMember, AuditLog, AuditLogAction } from '../../types';

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

        const { workspaceId, name } = JSON.parse(event.body);
        if (!workspaceId || !name || typeof name !== 'string' || name.trim() === '') {
            return { statusCode: 400, body: JSON.stringify({ error: "Missing or invalid required fields." }), headers: { "Content-Type": "application/json" } };
        }
        
        const storeOptions = {
            siteID: process.env.NETLIFY_SITE_ID,
            token: process.env.NETLIFY_API_TOKEN,
        };

        const membersStore = getStore({ name: "workspace-members", ...storeOptions });
        const members = (await membersStore.get(workspaceId, { type: "json" })) as WorkspaceMember[] || [];
        const currentUser = members.find(m => m.email === user.email);
        if (!currentUser || currentUser.role !== "Administrator") {
            return { statusCode: 403, body: JSON.stringify({ error: "Forbidden: Only administrators can rename a workspace." }), headers: { "Content-Type": "application/json" } };
        }

        const workspacesStore = getStore({ name: "workspaces", ...storeOptions });
        const workspace = (await workspacesStore.get(workspaceId, { type: "json" })) as Workspace;
        if (!workspace) {
            return { statusCode: 404, body: JSON.stringify({ error: "Workspace not found." }), headers: { "Content-Type": "application/json" } };
        }
        
        const oldName = workspace.name;
        workspace.name = name.trim();
        await workspacesStore.setJSON(workspaceId, workspace);
        
        // Add audit log
        const auditLogsStore = getStore({ name: "audit-logs", ...storeOptions });
        const logs = (await auditLogsStore.get(workspaceId, { type: "json" })) as AuditLog[] || [];
        const newLog: AuditLog = {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            userEmail: user.email,
            action: 'Workspace Renamed',
            details: `Workspace name changed from "${oldName}" to "${workspace.name}".`,
        };
        logs.unshift(newLog);
        await auditLogsStore.setJSON(workspaceId, logs);

        return { statusCode: 204, body: '' };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        console.error(`Error in update-workspace-name: ${errorMessage}`, error);
        
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
