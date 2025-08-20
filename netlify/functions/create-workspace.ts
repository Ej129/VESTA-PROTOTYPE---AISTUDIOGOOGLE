import { getStore } from "@netlify/blobs";
import type { Handler } from "@netlify/functions";

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
  Government = "Government Regulations & Compliance",
  Risk = "In-House Risk Management Plan",
  Strategy = "Long-Term Strategic Direction"
}
interface KnowledgeSource {
  id: string;
  workspaceId: string;
  title: string;
  content: string;
  category: KnowledgeCategory;
  isEditable: boolean;
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
    const { name } = JSON.parse(event.body || "{}");
    if (!name || typeof name !== "string" || name.trim() === "") {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Workspace name is required." }),
        headers: { "Content-Type": "application/json" },
      };
    }

    const store = getStore("vesta-data");

    const allWorkspaces = (await store.get("workspaces", { type: "json" })) as Workspace[] || [];
    const allMemberships = (await store.get("workspace-members", { type: "json" })) as Record<string, WorkspaceMember[]> || {};
    const allKnowledgeSources = (await store.get("knowledge-sources", { type: "json" })) as KnowledgeSource[] || [];

    const newWorkspace: Workspace = {
      id: `ws-${Date.now()}`,
      name: name.trim(),
      creatorId: user.email,
      createdAt: new Date().toISOString(),
    };

    allWorkspaces.push(newWorkspace);
    allMemberships[newWorkspace.id] = [{ email: user.email, role: "Administrator" }];

    const initialSources: Omit<KnowledgeSource, "id" | "workspaceId">[] = [
      {
        title: "BSP Circular No. 1108: Guidelines on Virtual Asset Service Providers",
        content: "This circular covers the rules and regulations for Virtual Asset Service Providers (VASPs) operating in the Philippines...",
        category: KnowledgeCategory.Government,
        isEditable: false,
      },
      {
        title: "Q1 2024 Internal Risk Assessment",
        content: "Our primary risk focus for this quarter is supply chain integrity and third-party vendor management...",
        category: KnowledgeCategory.Risk,
        isEditable: true,
      },
      {
        title: "5-Year Plan: Digital Transformation",
        content: "Our strategic goal is to become the leading digital-first bank in the SEA region by 2029...",
        category: KnowledgeCategory.Strategy,
        isEditable: true,
      },
    ];

    initialSources.forEach((source) => {
      allKnowledgeSources.push({
        ...source,
        id: `ks-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        workspaceId: newWorkspace.id,
      });
    });

    await store.setJSON("workspaces", allWorkspaces);
    await store.setJSON("workspace-members", allMemberships);
    await store.setJSON("knowledge-sources", allKnowledgeSources);

    return {
      statusCode: 201,
      body: JSON.stringify(newWorkspace),
      headers: { "Content-Type": "application/json" },
    };
  } catch (error) {
    console.error("Error creating workspace:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to create workspace." }),
      headers: { "Content-Type": "application/json" },
    };
  }
};
