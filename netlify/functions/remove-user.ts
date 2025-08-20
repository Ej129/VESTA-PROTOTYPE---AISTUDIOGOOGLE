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
    const { workspaceId, email } = JSON.parse(event.body);

    if (!workspaceId || !email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Fields 'workspaceId' and 'email' are required." }),
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
        body: JSON.stringify({ error: "Forbidden: Only administrators can remove members." }),
        headers: { "Content-Type": "application/json" },
      };
    }
    
    // Check if user to remove exists
    const memberToRemove = members.find(m => m.email === email);
    if (!memberToRemove) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "User not found in this workspace." }),
        headers: { "Content-Type": "application/json" },
      };
    }

    // Safety: Prevent removing the last administrator
    if (memberToRemove.role === "Administrator") {
      const adminCount = members.filter(m => m.role === "Administrator").length;
      if (adminCount <= 1) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Cannot remove the last administrator from a workspace." }),
          headers: { "Content-Type": "application/json" },
        };
      }
    }

    // Remove member and persist
    allMemberships[workspaceId] = members.filter(m => m.email !== email);
    await store.setJSON("workspace-members", allMemberships);

    // 5. Success Response
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: `User ${email} has been removed.` }),
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
    console.error("Error removing user:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "An internal server error occurred while removing the user." }),
      headers: { "Content-Type": "application/json" },
    };
  }
};