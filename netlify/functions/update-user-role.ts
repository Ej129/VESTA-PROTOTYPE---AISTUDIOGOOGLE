
import { getStore } from "@netlify/blobs";
import type { Handler, HandlerContext } from "@netlify/functions";
import { WorkspaceMember } from '../../src/types';

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
    const { workspaceId, email, role } = JSON.parse(event.body);

    if (!workspaceId || !email || !role) {
      return { statusCode: 400, body: JSON.stringify({ error: "Fields 'workspaceId', 'email', and 'role' are required." }), headers: { "Content-Type": "application/json" } };
    }
    const validRoles: WorkspaceMember["role"][] = ["Administrator", "Risk Management Officer", "Strategy Officer", "Member"];
    if (!validRoles.includes(role)) {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid role specified." }), headers: { "Content-Type": "application/json" } };
    }

    const membersStore = getStore({
        name: "workspace-members",
        siteID: process.env.NETLIFY_SITE_ID,
        token: process.env.NETLIFY_API_TOKEN,
    });
    const members = (await membersStore.get(workspaceId, { type: "json" })) as WorkspaceMember[] || [];

    const currentUser = members.find(m => m.email === user.email);
    if (!currentUser || currentUser.role !== "Administrator") {
      return { statusCode: 403, body: JSON.stringify({ error: "Forbidden: Only administrators can update roles." }), headers: { "Content-Type": "application/json" } };
    }

    const memberToUpdateIndex = members.findIndex(m => m.email === email);
    if (memberToUpdateIndex === -1) {
      return { statusCode: 404, body: JSON.stringify({ error: "User not found in this workspace." }), headers: { "Content-Type": "application/json" } };
    }
    
    const memberToUpdate = members[memberToUpdateIndex];
    if (memberToUpdate.role === "Administrator" && role !== "Administrator") {
      const adminCount = members.filter(m => m.role === "Administrator").length;
      if (adminCount <= 1) {
        return { statusCode: 400, body: JSON.stringify({ error: "Cannot change the role of the last administrator." }), headers: { "Content-Type": "application/json" } };
      }
    }

    members[memberToUpdateIndex].role = role;
    await membersStore.setJSON(workspaceId, members);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: `Role for ${email} updated to ${role}.` }),
      headers: { "Content-Type": "application/json" },
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    console.error(`Error in update-user-role: ${errorMessage}`, error);
    
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