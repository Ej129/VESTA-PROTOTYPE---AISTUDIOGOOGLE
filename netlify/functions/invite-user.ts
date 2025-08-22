

import { getStore } from "@netlify/blobs";
import type { Handler, HandlerContext } from "@netlify/functions";
import { Workspace, WorkspaceMember, WorkspaceInvitation } from '../../types';

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
    const { workspaceId, email: invitedUserEmail, role } = JSON.parse(event.body);

    if (!workspaceId || !invitedUserEmail || !role) {
      return { statusCode: 400, body: JSON.stringify({ error: "Fields 'workspaceId', 'email', and 'role' are required." }), headers: { "Content-Type": "application/json" }};
    }
    const validRoles: WorkspaceMember["role"][] = ["Administrator", "Risk Management Officer", "Strategy Officer", "Member"];
    if (!validRoles.includes(role)) {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid role provided." }), headers: { "Content-Type": "application/json" } };
    }

    const storeOptions = {
        siteID: process.env.NETLIFY_SITE_ID,
        token: process.env.NETLIFY_API_TOKEN,
    };
    const workspacesStore = getStore({ name: "workspaces", ...storeOptions });
    const membersStore = getStore({ name: "workspace-members", ...storeOptions });
    const userInvitationsStore = getStore({ name: "user-invitations", ...storeOptions });

    const members = (await membersStore.get(workspaceId, { type: "json" })) as WorkspaceMember[] || [];

    const currentUser = members.find(m => m.email === user.email);
    if (!currentUser || currentUser.role !== "Administrator") {
      return { statusCode: 403, body: JSON.stringify({ error: "Forbidden: Only administrators can invite new users." }), headers: { "Content-Type": "application/json" } };
    }

    if (members.some(m => m.email === invitedUserEmail)) {
      return { statusCode: 409, body: JSON.stringify({ error: "This user is already a member or has a pending invitation." }), headers: { "Content-Type": "application/json" } };
    }

    const workspace = (await workspacesStore.get(workspaceId, { type: "json" })) as Workspace;
    if (!workspace) {
        return { statusCode: 404, body: JSON.stringify({ error: "Workspace not found." }), headers: { "Content-Type": "application/json" } };
    }

    // Add user to the workspace's member list with 'pending' status
    members.push({ email: invitedUserEmail, role, status: 'pending' });
    await membersStore.setJSON(workspaceId, members);

    // Create an invitation record for the invited user
    const userInvitations = (await userInvitationsStore.get(invitedUserEmail, { type: "json" })) as WorkspaceInvitation[] || [];
    const newInvitation: WorkspaceInvitation = {
        workspaceId,
        workspaceName: workspace.name,
        inviterEmail: user.email,
        role,
        timestamp: new Date().toISOString()
    };
    userInvitations.push(newInvitation);
    await userInvitationsStore.setJSON(invitedUserEmail, userInvitations);

    return {
      statusCode: 201,
      body: JSON.stringify({ success: true, message: `Invitation sent to ${invitedUserEmail}.` }),
      headers: { "Content-Type": "application/json" },
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    console.error(`Error in invite-user: ${errorMessage}`, error);

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