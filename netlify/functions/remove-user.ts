
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
    const { workspaceId, email: userToRemoveEmail } = JSON.parse(event.body);
    if (!workspaceId || !userToRemoveEmail) {
      return { statusCode: 400, body: JSON.stringify({ error: "Fields 'workspaceId' and 'email' are required." }) };
    }

    const membersStore = getStore("workspace-members");
    const userWorkspacesStore = getStore("user-workspaces");
    
    const members = (await membersStore.get(workspaceId, { type: "json" })) as WorkspaceMember[] || [];

    const currentUser = members.find(m => m.email === user.email);
    if (!currentUser || currentUser.role !== "Administrator") {
      return { statusCode: 403, body: JSON.stringify({ error: "Forbidden: Only administrators can remove members." }) };
    }
    
    const memberToRemove = members.find(m => m.email === userToRemoveEmail);
    if (!memberToRemove) {
      return { statusCode: 404, body: JSON.stringify({ error: "User not found in this workspace." }) };
    }

    if (memberToRemove.role === "Administrator") {
      const adminCount = members.filter(m => m.role === "Administrator").length;
      if (adminCount <= 1) {
        return { statusCode: 400, body: JSON.stringify({ error: "Cannot remove the last administrator from a workspace." }) };
      }
    }

    // Update workspace's member list
    const updatedMembers = members.filter(m => m.email !== userToRemoveEmail);
    await membersStore.setJSON(workspaceId, updatedMembers);

    // Update removed user's workspace list
    const userWorkspaces = (await userWorkspacesStore.get(userToRemoveEmail, { type: "json" })) as string[] || [];
    const updatedUserWorkspaces = userWorkspaces.filter(id => id !== workspaceId);
    await userWorkspacesStore.setJSON(userToRemoveEmail, updatedUserWorkspaces);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: `User ${userToRemoveEmail} has been removed.` }),
      headers: { "Content-Type": "application/json" },
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    console.error(`Error in remove-user: ${errorMessage}`, error);

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
