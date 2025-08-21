
import { getStore } from "@netlify/blobs";
import type { Handler, HandlerContext } from "@netlify/functions";
import { AnalysisReport, WorkspaceMember } from '../../types';

const requireAuth = (context: HandlerContext) => {
  const user = context.clientContext?.user;
  if (!user || !user.email) {
    throw new Error("Authentication required.");
  }
  return user;
};

export const handler: Handler = async (event, context) => {
    try {
        if (event.httpMethod !== "POST") {
            return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }), headers: { "Content-Type": "application/json" } };
        }
        
        const user = requireAuth(context);
        if (!event.body) {
            return { statusCode: 400, body: JSON.stringify({ error: "Request body is missing." }), headers: { "Content-Type": "application/json" } };
        }

        const reportData: AnalysisReport = JSON.parse(event.body);
        const { workspaceId, id: reportId } = reportData;

        if (!workspaceId || !reportId || !reportData.title) {
            return { statusCode: 400, body: JSON.stringify({ error: "Missing required report data." }), headers: { "Content-Type": "application/json" } };
        }
        
        const storeOptions = {
            siteID: process.env.NETLIFY_SITE_ID,
            token: process.env.NETLIFY_API_TOKEN,
        };

        // Authorization check: ensure user is a member of this workspace
        const membersStore = getStore({ name: "workspace-members", ...storeOptions });
        const members = (await membersStore.get(workspaceId, { type: "json" })) as WorkspaceMember[] || [];
        if (!members.some(m => m.email === user.email)) {
            return { statusCode: 403, body: JSON.stringify({ error: "Forbidden: You are not a member of this workspace." }), headers: { "Content-Type": "application/json" } };
        }
        
        const reportsStore = getStore({ name: "reports", ...storeOptions });
        const reports = (await reportsStore.get(workspaceId, { type: "json" })) as AnalysisReport[] || [];

        const reportIndex = reports.findIndex(r => r.id === reportId);
        if (reportIndex === -1) {
            return { statusCode: 404, body: JSON.stringify({ error: "Report not found." }), headers: { "Content-Type": "application/json" } };
        }
        
        // Replace the old report with the updated data
        reports[reportIndex] = reportData;
        await reportsStore.setJSON(workspaceId, reports);

        return { statusCode: 200, body: JSON.stringify(reportData), headers: { "Content-Type": "application/json" } };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        console.error(`Error in update-report: ${errorMessage}`, error);

        if (error instanceof Error && error.name === 'MissingBlobsEnvironmentError') {
            return {
                statusCode: 500,
                body: JSON.stringify({ 
                    error: "Netlify Blobs is not configured.",
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
