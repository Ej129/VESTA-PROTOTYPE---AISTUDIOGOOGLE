import { getStore } from "@netlify/blobs";
import type { Context } from "@netlify/functions";

interface WorkspaceMember {
    email: string;
    role: "Administrator" | "Risk Management Officer" | "Strategy Officer" | "Member";
}

export default async (req: Request, context: Context) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json" } });
  }
  
  const user = context.netlify.identity;
  if (!user) {
    return new Response(JSON.stringify({ error: "Authentication required." }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  try {
    const { workspaceId, email, role } = await req.json();
    if (!workspaceId || !email || !role) {
      return new Response(JSON.stringify({ error: "Missing required fields." }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const store = getStore("vesta-data");
    const allMemberships = await store.get("workspace-members", { type: "json" }) as Record<string, WorkspaceMember[]> || {};
    const members = allMemberships[workspaceId] || [];

    // Security Check: Only admins can update roles
    const updater = members.find(m => m.email === user.email);
    if (!updater || updater.role !== 'Administrator') {
      return new Response(JSON.stringify({ error: "Forbidden: Only administrators can update roles." }), { status: 403, headers: { "Content-Type": "application/json" } });
    }

    // Prevent demoting the last administrator
    const admins = members.filter(m => m.role === 'Administrator');
    const memberToUpdate = members.find(m => m.email === email);
    if (memberToUpdate && memberToUpdate.role === 'Administrator' && admins.length <= 1 && role !== 'Administrator') {
        return new Response(JSON.stringify({ error: "Cannot demote the last administrator." }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // Update role and save
    const memberIndex = members.findIndex(m => m.email === email);
    if (memberIndex !== -1) {
        members[memberIndex].role = role;
        allMemberships[workspaceId] = members;
        await store.setJSON("workspace-members", allMemberships);
    } else {
        return new Response(JSON.stringify({ error: "User not found in workspace." }), { status: 404, headers: { "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error updating role:", error);
    return new Response(JSON.stringify({ error: "Failed to update role." }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};