
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
    const { workspaceId, email: userToRemoveEmail } = JSON.parse(event.body);
    if (!workspaceId || !userToRemoveEmail) {
      return { statusCode: 400, body: JSON.stringify({ error: "Fields 'workspaceId' and 'email' are required." }), headers: { "Content-Type": "application/json" } };
    }

    const storeOptions = {
        siteID: process.env.NETLIFY_SITE_ID,
        token: process.env.NETLIFY_API_TOKEN,
    };
    const membersStore = getStore({ name: "workspace-members", ...storeOptions });
    const userWorkspacesStore = getStore({ name: "user-workspaces", ...storeOptions });
    
    const members = (await membersStore.get(workspaceId, { type: "json" })) as WorkspaceMember[] || [];

    const currentUser = members.find(m => m.email === user.email);
    if (!currentUser || currentUser.role !== "Administrator") {
      return { statusCode: 403, body: JSON.stringify({ error: "Forbidden: Only administrators can remove members." }), headers: { "Content-Type": "application/json" } };
    }
    
    const memberToRemove = members.find(m => m.email === userToRemoveEmail);
    if (!memberToRemove) {
      return { statusCode: 404, body: JSON.stringify({ error: "User not found in this workspace." }), headers: { "Content-Type": "application/json" } };
    }

    if (memberToRemove.role === "Administrator") {
      const adminCount = members.filter(m => m.role === "Administrator").length;
      if (adminCount <= 1) {
        return { statusCode: 400, body: JSON.stringify({ error: "Cannot remove the last administrator from a workspace." }), headers: { "Content-Type": "application/json" } };
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
