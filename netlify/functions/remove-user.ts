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
    const { workspaceId, email } = JSON.parse(event.body || "{}");

    if (!workspaceId || !email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "workspaceId and email are required." }),
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
        body: JSON.stringify({ error: "Only administrators can remove members." }),
        headers: { "Content-Type": "application/json" },
      };
    }

    // Prevent removing the last admin
    const memberToRemove = members.find(m => m.email === email);
    if (!memberToRemove) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "User not found in this workspace." }),
        headers: { "Content-Type": "application/json" },
      };
    }

    if (memberToRemove.role === "Administrator") {
      const otherAdmins = members.filter(m => m.role === "Administrator" && m.email !== email);
      if (otherAdmins.length === 0) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Cannot remove the last administrator." }),
          headers: { "Content-Type": "application/json" },
        };
      }
    }

    // Remove member
    const updatedMembers = members.filter(m => m.email !== email);
    allMemberships[workspaceId] = updatedMembers;

    await store.setJSON("workspace-members", allMemberships);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, removed: email }),
      headers: { "Content-Type": "application/json" },
    };

  } catch (error) {
    console.error("Error removing user:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to remove user." }),
      headers: { "Content-Type": "application/json" },
    };
  }
};
