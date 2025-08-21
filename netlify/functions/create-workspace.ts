
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
      return { statusCode: 400, body: JSON.stringify({ error: "Request body is missing." }), headers: { "Content-Type": "application/json" } };
    }
    const { name } = JSON.parse(event.body);
    if (!name || typeof name !== "string" || name.trim() === "") {
      return { statusCode: 400, body: JSON.stringify({ error: "Workspace name is required." }), headers: { "Content-Type": "application/json" } };
    }

    // 4. Business Logic
    const storeOptions = {
        siteID: process.env.NETLIFY_SITE_ID,
        token: process.env.NETLIFY_API_TOKEN,
    };
    const workspacesStore = getStore({ name: "workspaces", ...storeOptions });
    const membersStore = getStore({ name: "workspace-members", ...storeOptions });
    const knowledgeStore = getStore({ name: "knowledge-sources", ...storeOptions });
    const userWorkspacesStore = getStore({ name: "user-workspaces", ...storeOptions });

    const newWorkspace: Workspace = {
      id: `ws-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: name.trim(),
      creatorId: user.email,
      createdAt: new Date().toISOString(),
    };

    // Save the main workspace document
    await workspacesStore.setJSON(newWorkspace.id, newWorkspace);

    // Create a dedicated member list for the new workspace
    const initialMembers: WorkspaceMember[] = [{ email: user.email, role: "Administrator" }];
    await membersStore.setJSON(newWorkspace.id, initialMembers);

    // Add this workspace to the creator's list of workspaces
    const userWorkspaceIds = (await userWorkspacesStore.get(user.email, { type: "json" })) as string[] || [];
    userWorkspaceIds.push(newWorkspace.id);
    await userWorkspacesStore.setJSON(user.email, userWorkspaceIds);
    
    // Add default knowledge sources for the new workspace
    const initialSources: Omit<KnowledgeSource, "id" | "workspaceId">[] = [
      {
        title: "Bangko Sentral ng Pilipinas (BSP) Regulations",
        content: "A collection of circulars, memoranda, and guidelines from the BSP, governing banks, financial institutions, and payment systems in the Philippines. Official source: https://www.bsp.gov.ph/",
        category: KnowledgeCategory.Government,
        isEditable: true,
      },
      {
        title: "Bureau of Internal Revenue (BIR) Issuances",
        content: "Regulations concerning taxation of financial transactions, digital services, and corporate income. Official source: https://www.bir.gov.ph/",
        category: KnowledgeCategory.Government,
        isEditable: true,
      },
      {
        title: "Philippine Deposit Insurance Corporation (PDIC) Rules",
        content: "Rules and regulations governing deposit insurance, bank resolutions, and financial stability. Official source: https://www.pdic.gov.ph/",
        category: KnowledgeCategory.Government,
        isEditable: true,
      },
      {
        title: "National Privacy Commission (NPC) Advisories",
        content: "Guidelines and advisories related to the Data Privacy Act of 2012 (RA 10173). Official source: https://www.privacy.gov.ph/",
        category: KnowledgeCategory.Government,
        isEditable: true,
      },
      {
        title: "Philippine Insurance Regulations (PIR)",
        content: "Regulations from the Insurance Commission governing insurance products, operations, and market conduct. Official source: https://www.insurance.gov.ph/",
        category: KnowledgeCategory.Government,
        isEditable: true,
      },
      {
        title: "Securities and Exchange Commission (SEC) Memoranda",
        content: "Memorandum Circulars from the SEC covering corporate governance, securities registration, and investment products. Official source: https://www.sec.gov.ph/",
        category: KnowledgeCategory.Government,
        isEditable: true,
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
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    console.error(`Error in create-workspace: ${errorMessage}`, error);

    if (error instanceof Error && error.name === 'MissingBlobsEnvironmentError') {
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: "Netlify Blobs is not configured. Ensure NETLIFY_SITE_ID and NETLIFY_API_TOKEN environment variables are set correctly in your site configuration.",
                details: errorMessage 
            }),
            headers: { "Content-Type": "application/json" },
        };
    }
    if (error instanceof SyntaxError) {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON format." }), headers: { "Content-Type": "application/json" } };
    }
    if (error instanceof Error && error.message === "Authentication required.") {
        return { statusCode: 401, body: JSON.stringify({ error: error.message }), headers: { "Content-Type": "application/json" } };
    }
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "An internal server error occurred.", details: errorMessage }),
      headers: { "Content-Type": "application/json" },
    };
  }
};
