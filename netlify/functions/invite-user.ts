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

    // Security Check: Only admins can invite
    const inviter = members.find(m => m.email === user.email);
    if (!inviter || inviter.role !== 'Administrator') {
      return new Response(JSON.stringify({ error: "Forbidden: Only administrators can invite users." }), { status: 403, headers: { "Content-Type": "application/json" } });
    }

    // Check if user is already a member
    if (members.some(m => m.email === email)) {
      return new Response(JSON.stringify({ error: `User "${email}" is already a member.` }), { status: 409, headers: { "Content-Type": "application/json" } });
    }

    // Add new member and save
    members.push({ email, role });
    allMemberships[workspaceId] = members;
    await store.setJSON("workspace-members", allMemberships);

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error inviting user:", error);
    return new Response(JSON.stringify({ error: "Failed to invite user." }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};
