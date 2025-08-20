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
    const { workspaceId, email } = await req.json();
    if (!workspaceId || !email) {
      return new Response(JSON.stringify({ error: "Missing required fields." }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const store = getStore("vesta-data");
    const allMemberships = await store.get("workspace-members", { type: "json" }) as Record<string, WorkspaceMember[]> || {};
    const members = allMemberships[workspaceId] || [];

    // Security Check: Only admins can remove users
    const remover = members.find(m => m.email === user.email);
    if (!remover || remover.role !== 'Administrator') {
      return new Response(JSON.stringify({ error: "Forbidden: Only administrators can remove users." }), { status: 403, headers: { "Content-Type": "application/json" } });
    }

    // Prevent removing the last administrator
    const admins = members.filter(m => m.role === 'Administrator');
    const memberToRemove = members.find(m => m.email === email);
    if (memberToRemove && memberToRemove.role === 'Administrator' && admins.length <= 1) {
        return new Response(JSON.stringify({ error: "Cannot remove the last administrator." }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // Remove user and save
    allMemberships[workspaceId] = members.filter(m => m.email !== email);
    await store.setJSON("workspace-members", allMemberships);

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error removing user:", error);
    return new Response(JSON.stringify({ error: "Failed to remove user." }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};