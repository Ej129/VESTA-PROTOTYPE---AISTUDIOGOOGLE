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

    if (!workspaceId || !email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "workspaceId and email are required." }),
        headers: { "Content-Type": "application/json" },
      };
    }

    // Validate role (default to "Member" if not provided)
    const validRoles: WorkspaceMember["role"][] = ["Administrator", "Risk Management Officer", "Strategy Officer", "Member"];
    const assignedRole = validRoles.includes(role) ? role : "Member";

    const store = getStore("vesta-data");
    const allMemberships = (await store.get("workspace-members", { type: "json" })) as Record<string, WorkspaceMember[]> || {};
    const members = allMemberships[workspaceId] || [];

    // Check if current user is Admin
    const currentUser = members.find(m => m.email === user.email);
    if (!currentUser || currentUser.role !== "Administrator") {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: "Only administrators can invite users." }),
        headers: { "Content-Type": "application/json" },
      };
    }

    // Prevent duplicate membership
    if (members.some(m => m.email === email)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "User is already a member of this workspace." }),
        headers: { "Content-Type": "application/json" },
      };
    }

    // Add new member
    members.push({ email, role: assignedRole });
    allMemberships[workspaceId] = members;
    await store.setJSON("workspace-members", allMemberships);

    return {
      statusCode: 201,
      body: JSON.stringify({ success: true, email, role: assignedRole }),
      headers: { "Content-Type": "application/json" },
    };

  } catch (error) {
    console.error("Error inviting user:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to invite user." }),
      headers: { "Content-Type": "application/json" },
    };
  }
};
