import { getStore } from "@netlify/blobs";
import type { Handler } from "@netlify/functions";

interface WorkspaceMember {
  email: string;
  role: "Administrator" | "Risk Management Officer" | "Strategy Officer" | "Member";
}

export const handler: Handler = async (event, context) => {
  // 1. Method Check
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
      headers: { "Content-Type": "application/json" },
    };
  }

  // 2. Authentication Check
  const user = context.clientContext?.user;
  if (!user || !user.email) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "Authentication required." }),
      headers: { "Content-Type": "application/json" },
    };
  }

  try {
    // 3. Safe JSON Parsing and Validation
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Request body is missing." }),
        headers: { "Content-Type": "application/json" },
      };
    }
    const { workspaceId, email, role } = JSON.parse(event.body);

    if (!workspaceId || !email || !role) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Fields 'workspaceId', 'email', and 'role' are required." }),
        headers: { "Content-Type": "application/json" },
      };
    }
    const validRoles: WorkspaceMember["role"][] = ["Administrator", "Risk Management Officer", "Strategy Officer", "Member"];
    if (!validRoles.includes(role)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid role provided." }),
        headers: { "Content-Type": "application/json" },
      };
    }

    // 4. Business Logic
    const store = getStore("vesta-data");
    const allMemberships = (await store.get("workspace-members", { type: "json" })) as Record<string, WorkspaceMember[]> || {};
    const members = allMemberships[workspaceId] || [];

    // Authorization: Check if the current user is an Administrator
    const currentUser = members.find(m => m.email === user.email);
    if (!currentUser || currentUser.role !== "Administrator") {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: "Forbidden: Only administrators can invite new users." }),
        headers: { "Content-Type": "application/json" },
      };
    }

    // Prevent duplicate membership
    if (members.some(m => m.email === email)) {
      return {
        statusCode: 409, // Conflict
        body: JSON.stringify({ error: "This user is already a member of the workspace." }),
        headers: { "Content-Type": "application/json" },
      };
    }

    // Add new member and persist
    members.push({ email, role });
    allMemberships[workspaceId] = members;
    await store.setJSON("workspace-members", allMemberships);

    // 5. Success Response
    return {
      statusCode: 201,
      body: JSON.stringify({ success: true, message: `User ${email} invited as ${role}.` }),
      headers: { "Content-Type": "application/json" },
    };

  } catch (error) {
    // 6. Error Handling
     if (error instanceof SyntaxError) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid JSON format in request body." }),
        headers: { "Content-Type": "application/json" },
      };
    }
    console.error("Error inviting user:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "An internal server error occurred while inviting the user." }),
      headers: { "Content-Type": "application/json" },
    };
  }
};