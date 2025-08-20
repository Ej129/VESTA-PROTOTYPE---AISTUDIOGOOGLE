import { getStore } from "@netlify/blobs";
import type { Handler } from "@netlify/functions";

interface WorkspaceMember {
  email: string;
  role: "Administrator" | "Risk Management Officer" | "Strategy Officer" | "Member";
}

export const handler: Handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
      headers: { "Content-Type": "application/json" },
    };
  }

  const user = context.clientContext?.user;
  if (!user || !user.email) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "Authentication required." }),
      headers: { "Content-Type": "application/json" },
    };
  }

  try {
    const { workspaceId, email, role } = JSON.parse(event.body || "{}");

    if (!workspaceId || !email || !role) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "workspaceId, email, and role are required." }),
        headers: { "Content-Type": "application/json" },
      };
    }

    // Validate role
    const validRoles: WorkspaceMember["role"][] = ["Administrator", "Risk Management Officer", "Strategy Officer", "Member"];
    if (!validRoles.includes(role)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid role." }),
        headers: { "Content-Type": "application/json" },
      };
    }

    const store = getStore("vesta-data");
    const allMemberships = (await store.get("workspace-members", { type: "json" })) as Record<string, WorkspaceMember[]> || {};
    const members = allMemberships[workspaceId] || [];

    // Check if current user is Admin
    const currentUser = members.find(m => m.email === user.email);
    if (!currentUser || currentUser.role !== "Administrator") {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: "Only administrators can update roles." }),
        headers: { "Content-Type": "application/json" },
      };
    }

    // Prevent updating your own role
    if (email === user.email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "You cannot change your own role." }),
        headers: { "Content-Type": "application/json" },
      };
    }

    // Find member to update
    const memberToUpdate = members.find(m => m.email === email);
    if (!memberToUpdate) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "User not found in this workspace." }),
        headers: { "Content-Type": "application/json" },
      };
    }

    // Update role
    memberToUpdate.role = role;

    allMemberships[workspaceId] = members;
    await store.setJSON("workspace-members", allMemberships);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, email, newRole: role }),
      headers: { "Content-Type": "application/json" },
    };

  } catch (error) {
    console.error("Error updating role:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to update role." }),
      headers: { "Content-Type": "application/json" },
    };
  }
};
