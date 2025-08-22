
import { getStore } from "@netlify/blobs";
import type { Handler, HandlerContext } from "@netlify/functions";
import { WorkspaceInvitation, WorkspaceMember, AuditLog, AuditLogAction } from '../../src/types';

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

    const { workspaceId, response } = JSON.parse(event.body);
    if (!workspaceId || !response || !['accept', 'decline'].includes(response)) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing or invalid required fields." }), headers: { "Content-Type": "application/json" } };
    }

    const storeOptions = {
        siteID: process.env.NETLIFY_SITE_ID,
        token: process.env.NETLIFY_API_TOKEN,
    };
    const membersStore = getStore({ name: "workspace-members", ...storeOptions });
    const userWorkspacesStore = getStore({ name: "user-workspaces", ...storeOptions });
    const userInvitationsStore = getStore({ name: "user-invitations", ...storeOptions });
    const auditLogsStore = getStore({ name: "audit-logs", ...storeOptions });

    // Remove invitation from user's list regardless of response
    const invitations = (await userInvitationsStore.get(user.email, { type: "json" })) as WorkspaceInvitation[] || [];
    const updatedInvitations = invitations.filter(inv => inv.workspaceId !== workspaceId);
    await userInvitationsStore.setJSON(user.email, updatedInvitations);

    const members = (await membersStore.get(workspaceId, { type: "json" })) as WorkspaceMember[] || [];
    const memberIndex = members.findIndex(m => m.email === user.email && m.status === 'pending');

    if (memberIndex === -1) {
      return { statusCode: 404, body: JSON.stringify({ error: "Invitation not found or already processed." }), headers: { "Content-Type": "application/json" } };
    }
    
    let auditAction: AuditLogAction;
    let auditDetails: string;

    if (response === 'accept') {
      auditAction = 'Invitation Accepted';
      auditDetails = `User ${user.email} accepted the invitation.`;
      
      members[memberIndex].status = 'active';
      await membersStore.setJSON(workspaceId, members);
      
      const userWorkspaces = (await userWorkspacesStore.get(user.email, { type: "json" })) as string[] || [];
      if (!userWorkspaces.includes(workspaceId)) {
        userWorkspaces.push(workspaceId);
        await userWorkspacesStore.setJSON(user.email, userWorkspaces);
      }
    } else { // decline
      auditAction = 'Invitation Declined';
      auditDetails = `User ${user.email} declined the invitation.`;
      
      const updatedMembers = members.filter((_, index) => index !== memberIndex);
      await membersStore.setJSON(workspaceId, updatedMembers);
    }
    
    const logs = (await auditLogsStore.get(workspaceId, { type: "json" })) as AuditLog[] || [];
    logs.unshift({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userEmail: user.email,
        action: auditAction,
        details: auditDetails,
    });
    await auditLogsStore.setJSON(workspaceId, logs);
    
    return { statusCode: 200, body: JSON.stringify({ success: true }) };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    console.error(`Error in respond-to-invitation: ${errorMessage}`, error);

    if (error instanceof Error && error.name === 'MissingBlobsEnvironmentError') {
      return { statusCode: 500, body: JSON.stringify({ error: "Netlify Blobs is not configured." }), headers: { "Content-Type": "application/json" } };
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