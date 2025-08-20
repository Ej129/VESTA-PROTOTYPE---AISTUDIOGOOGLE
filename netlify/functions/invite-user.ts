
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
      return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
    }
    
    const user = requireAuth(context);

    if (!event.body) {
      return { statusCode: 400, body: JSON.stringify({ error: "Request body is missing." }) };
    }
    const { workspaceId, email: invitedUserEmail, role } = JSON.parse(event.body);

    if (!workspaceId || !invitedUserEmail || !role) {
      return { statusCode: 400, body: JSON.stringify({ error: "Fields 'workspaceId', 'email', and 'role' are required." })};
    }
    const validRoles: WorkspaceMember["role"][] = ["Administrator", "Risk Management Officer", "Strategy Officer", "Member"];
    if (!validRoles.includes(role)) {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid role provided." }) };
    }

    const membersStore = getStore("workspace-members");
    const userWorkspacesStore = getStore("user-workspaces");

    const members = (await membersStore.get(workspaceId, { type: "json" })) as WorkspaceMember[] || [];

    const currentUser = members.find(m => m.email === user.email);
    if (!currentUser || currentUser.role !== "Administrator") {
      return { statusCode: 403, body: JSON.stringify({ error: "Forbidden: Only administrators can invite new users." }) };
    }

    if (members.some(m => m.email === invitedUserEmail)) {
      return { statusCode: 409, body: JSON.stringify({ error: "This user is already a member of the workspace." }) };
    }

    // Add user to the workspace's member list
    members.push({ email: invitedUserEmail, role });
    await membersStore.setJSON(workspaceId, members);

    // Add workspace to the invited user's list of workspaces
    const invitedUserWorkspaces = (await userWorkspacesStore.get(invitedUserEmail, { type: "json" })) as string[] || [];
    if (!invitedUserWorkspaces.includes(workspaceId)) {
        invitedUserWorkspaces.push(workspaceId);
        await userWorkspacesStore.setJSON(invitedUserEmail, invitedUserWorkspaces);
    }

    return {
      statusCode: 201,
      body: JSON.stringify({ success: true, message: `User ${invitedUserEmail} invited as ${role}.` }),
      headers: { "Content-Type": "application/json" },
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    console.error(`Error in invite-user: ${errorMessage}`, error);

    if (error instanceof SyntaxError) {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON format." }) };
    }
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
