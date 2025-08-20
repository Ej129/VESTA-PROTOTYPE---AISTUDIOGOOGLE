
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
      return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
    }

    const user = requireAuth(context);

    const { workspaceId } = event.queryStringParameters || {};
    if (!workspaceId) {
      return { statusCode: 400, body: JSON.stringify({ error: "Query parameter 'workspaceId' is required." }) };
    }
    
    // Authorization check: ensure user is a member of this workspace
    const membersStore = getStore("workspace-members");
    const allMemberships = (await membersStore.get("all", { type: "json" })) as Record<string, { email: string }[]> || {};
    if (!allMemberships[workspaceId]?.some(m => m.email === user.email)) {
        return { statusCode: 403, body: JSON.stringify({ error: "Forbidden" }) };
    }

    // Fetch all data for the workspace in parallel
    const reportsStore = getStore("reports");
    const auditLogsStore = getStore("audit-logs");
    const knowledgeStore = getStore("knowledge-sources");
    const dismissalRulesStore = getStore("dismissal-rules");
    const customRegulationsStore = getStore("custom-regulations");

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
    console.error("Error in get-workspace-data:", error);
    if (error instanceof Error && error.message === "Authentication required.") {
      return { statusCode: 401, body: JSON.stringify({ error: error.message }) };
    }
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "An internal server error occurred." }),
      headers: { "Content-Type": "application/json" },
    };
  }
};
