
import { getStore } from "@netlify/blobs";
import type { Handler, HandlerContext } from "@netlify/functions";
import { KnowledgeCategory, KnowledgeSource, Workspace, WorkspaceMember } from '../../types';

// Helper to check for user authentication
const requireAuth = (context: HandlerContext) => {
  const user = context.clientContext?.user;
  if (!user || !user.email) {
    throw new Error("Authentication required.");
  }
  return user;
};

export const handler: Handler = async (event, context) => {
  try {
    // 1. Method Check
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Method Not Allowed" }),
        headers: { "Content-Type": "application/json" },
      };
    }

    // 2. Authentication Check
    const user = requireAuth(context);

    // 3. Safe JSON Parsing and Validation
    if (!event.body) {
      return { statusCode: 400, body: JSON.stringify({ error: "Request body is missing." }) };
    }
    const { name } = JSON.parse(event.body);
    if (!name || typeof name !== "string" || name.trim() === "") {
      return { statusCode: 400, body: JSON.stringify({ error: "Workspace name is required." }) };
    }

    // 4. Business Logic
    const workspacesStore = getStore("workspaces");
    const membersStore = getStore("workspace-members");
    const knowledgeStore = getStore("knowledge-sources");

    const newWorkspace: Workspace = {
      id: `ws-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: name.trim(),
      creatorId: user.email,
      createdAt: new Date().toISOString(),
    };

    // Create the workspace document
    await workspacesStore.setJSON(newWorkspace.id, newWorkspace);

    // Update the central membership list
    const allMemberships = (await membersStore.get("all", { type: "json" })) as Record<string, WorkspaceMember[]> || {};
    allMemberships[newWorkspace.id] = [{ email: user.email, role: "Administrator" }];
    await membersStore.setJSON("all", allMemberships);
    
    // Add default knowledge sources for the new workspace
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
    const workspaceKnowledge: KnowledgeSource[] = initialSources.map(source => ({
        ...source,
        id: `ks-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        workspaceId: newWorkspace.id,
    }));
    await knowledgeStore.setJSON(newWorkspace.id, workspaceKnowledge);

    // 5. Success Response
    return {
      statusCode: 201,
      body: JSON.stringify(newWorkspace),
      headers: { "Content-Type": "application/json" },
    };

  } catch (error) {
    console.error("Error in create-workspace:", error);
    if (error instanceof SyntaxError) {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON format." }) };
    }
    if (error instanceof Error) {
        if (error.message === "Authentication required.") {
            return { statusCode: 401, body: JSON.stringify({ error: error.message }) };
        }
    }
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "An internal server error occurred." }),
      headers: { "Content-Type": "application/json" },
    };
  }
};
