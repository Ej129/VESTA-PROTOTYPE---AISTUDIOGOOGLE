import { getStore } from "@netlify/blobs";
import type { Context } from "@netlify/functions";

// Redefining types for the serverless function.
interface Workspace {
  id: string;
  name: string;
  creatorId: string;
  createdAt: string;
}
interface WorkspaceMember {
  email: string;
  role: "Administrator" | "Risk Management Officer" | "Strategy Officer" | "Member";
}
enum KnowledgeCategory {
    Government = 'Government Regulations & Compliance',
    Risk = 'In-House Risk Management Plan',
    Strategy = 'Long-Term Strategic Direction'
}
interface KnowledgeSource {
    id: string;
    workspaceId: string;
    title: string;
    content: string;
    category: KnowledgeCategory;
    isEditable: boolean;
}

export default async (req: Request, context: Context) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json" } });
  }

  const user = (context as any).clientContext?.user;
  if (!user) {
    return new Response(JSON.stringify({ error: "Authentication required." }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  try {
    const { name } = await req.json();
    if (!name || typeof name !== 'string' || name.trim() === '') {
        return new Response(JSON.stringify({ error: "Workspace name is required." }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const store = getStore("vesta-data");

    // This is a "read-modify-write" pattern.
    // 1. Read existing data from the store.
    const allWorkspaces = await store.get("workspaces", { type: "json" }) as Workspace[] || [];
    const allMemberships = await store.get("workspace-members", { type: "json" }) as Record<string, WorkspaceMember[]> || {};
    const allKnowledgeSources = await store.get("knowledge-sources", { type: "json" }) as KnowledgeSource[] || [];

    // 2. Modify the data in memory.
    const newWorkspace: Workspace = {
      id: `ws-${Date.now()}`,
      name: name.trim(),
      creatorId: user.email,
      createdAt: new Date().toISOString(),
    };

    allWorkspaces.push(newWorkspace);
    allMemberships[newWorkspace.id] = [{ email: user.email, role: 'Administrator' }];
    
    // Add default knowledge sources for the new workspace
    const initialSources: Omit<KnowledgeSource, 'id'|'workspaceId'>[] = [
        { title: 'BSP Circular No. 1108: Guidelines on Virtual Asset Service Providers', content: 'This circular covers the rules and regulations for Virtual Asset Service Providers (VASPs) operating in the Philippines...', category: KnowledgeCategory.Government, isEditable: false },
        { title: 'Q1 2024 Internal Risk Assessment', content: 'Our primary risk focus for this quarter is supply chain integrity and third-party vendor management...', category: KnowledgeCategory.Risk, isEditable: true },
        { title: '5-Year Plan: Digital Transformation', content: 'Our strategic goal is to become the leading digital-first bank in the SEA region by 2029...', category: KnowledgeCategory.Strategy, isEditable: true },
    ];
    
    initialSources.forEach(source => {
        allKnowledgeSources.push({
            ...source,
            id: `ks-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            workspaceId: newWorkspace.id
        });
    });

    // 3. Write the entire updated data back to the store.
    await store.setJSON("workspaces", allWorkspaces);
    await store.setJSON("workspace-members", allMemberships);
    await store.setJSON("knowledge-sources", allKnowledgeSources);

    return new Response(JSON.stringify(newWorkspace), {
      status: 201, // 201 Created
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error creating workspace:", error);
    return new Response(JSON.stringify({ error: "Failed to create workspace." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
