
import { getStore } from "@netlify/blobs";
import type { Handler, HandlerContext } from "@netlify/functions";
import { WorkspaceData } from '../../types';

const requireAuth = (context: HandlerContext) => {
  const user = context.clientContext?.user;
  if (!user || !user.email) {
    throw new Error("Authentication required.");
  }
  return user;
};

export const handler: Handler = async (event, context) => {
  try {
    if (event.httpMethod !== "GET") {
      return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }), headers: { "Content-Type": "application/json" } };
    }

    const user = requireAuth(context);

    const { workspaceId } = event.queryStringParameters || {};
    if (!workspaceId) {
      return { statusCode: 400, body: JSON.stringify({ error: "Query parameter 'workspaceId' is required." }), headers: { "Content-Type": "application/json" } };
    }
    
    const storeOptions = {
        siteID: process.env.NETLIFY_SITE_ID,
        token: process.env.NETLIFY_API_TOKEN,
    };

    // Authorization check: ensure user is a member of this workspace
    const membersStore = getStore({ name: "workspace-members", ...storeOptions });
    const members = (await membersStore.get(workspaceId, { type: "json" })) as { email: string }[] || [];
    if (!members.some(m => m.email === user.email)) {
        return { statusCode: 403, body: JSON.stringify({ error: "Forbidden" }), headers: { "Content-Type": "application/json" } };
    }

    // Fetch all data for the workspace in parallel
    const reportsStore = getStore({ name: "reports", ...storeOptions });
    const auditLogsStore = getStore({ name: "audit-logs", ...storeOptions });
    const knowledgeStore = getStore({ name: "knowledge-sources", ...storeOptions });
    const dismissalRulesStore = getStore({ name: "dismissal-rules", ...storeOptions });
    const customRegulationsStore = getStore({ name: "custom-regulations", ...storeOptions });

    const [
        reports,
        auditLogs,
        knowledgeBaseSources,
        dismissalRules,
        customRegulations,
    ] = await Promise.all([
        reportsStore.get(workspaceId, { type: "json" }),
        auditLogsStore.get(workspaceId, { type: "json" }),
        knowledgeStore.get(workspaceId, { type: "json" }),
        dismissalRulesStore.get(workspaceId, { type: "json" }),
        customRegulationsStore.get(workspaceId, { type: "json" }),
    ]);

    const data: WorkspaceData = {
      reports: (reports as any[] || []).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      auditLogs: auditLogs as any[] || [],
      knowledgeBaseSources: knowledgeBaseSources as any[] || [],
      dismissalRules: dismissalRules as any[] || [],
      customRegulations: customRegulations as any[] || [],
    };

    return {
      statusCode: 200,
      body: JSON.stringify(data),
      headers: { "Content-Type": "application/json" },
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    console.error(`Error in get-workspace-data: ${errorMessage}`, error);

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
