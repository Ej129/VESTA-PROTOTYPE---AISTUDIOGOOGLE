
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
    const { workspaceId, email, role } = JSON.parse(event.body);

    if (!workspaceId || !email || !role) {
      return { statusCode: 400, body: JSON.stringify({ error: "Fields 'workspaceId', 'email', and 'role' are required." })};
    }
    const validRoles: WorkspaceMember["role"][] = ["Administrator", "Risk Management Officer", "Strategy Officer", "Member"];
    if (!validRoles.includes(role)) {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid role provided." }) };
    }

    const membersStore = getStore("workspace-members");
    const allMemberships = (await membersStore.get("all", { type: "json" })) as Record<string, WorkspaceMember[]> || {};
    const members = allMemberships[workspaceId] || [];

    const currentUser = members.find(m => m.email === user.email);
    if (!currentUser || currentUser.role !== "Administrator") {
      return { statusCode: 403, body: JSON.stringify({ error: "Forbidden: Only administrators can invite new users." }) };
    }

    if (members.some(m => m.email === email)) {
      return { statusCode: 409, body: JSON.stringify({ error: "This user is already a member of the workspace." }) };
    }

    members.push({ email, role });
    allMemberships[workspaceId] = members;
    await membersStore.setJSON("all", allMemberships);

    return {
      statusCode: 201,
      body: JSON.stringify({ success: true, message: `User ${email} invited as ${role}.` }),
      headers: { "Content-Type": "application/json" },
    };

  } catch (error) {
    console.error("Error in invite-user:", error);
    if (error instanceof SyntaxError) {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON format." }) };
    }
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
