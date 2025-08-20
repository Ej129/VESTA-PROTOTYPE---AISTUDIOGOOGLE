
import { getStore } from "@netlify/blobs";
import type { Handler, HandlerContext } from "@netlify/functions";
import { AnalysisReport } from '../../types';

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
        
        requireAuth(context);
        if (!event.body) {
            return { statusCode: 400, body: JSON.stringify({ error: "Request body is missing." }), headers: { "Content-Type": "application/json" } };
        }

        const { reportId, status } = JSON.parse(event.body);
        if (!reportId || !status || !['active', 'archived'].includes(status)) {
            return { statusCode: 400, body: JSON.stringify({ error: "Missing or invalid required fields." }), headers: { "Content-Type": "application/json" } };
        }

        // We need to find which workspace this report belongs to
        const store = getStore({
            name: "reports",
            siteID: process.env.NETLIFY_SITE_ID,
            token: process.env.NETLIFY_API_TOKEN,
        });
        const { blobs } = await store.list();
        let targetWorkspaceId: string | null = null;
        let reports: AnalysisReport[] = [];
        let reportIndex = -1;

        for (const blob of blobs) {
            const workspaceReports = (await store.get(blob.key, { type: "json" })) as AnalysisReport[];
            const idx = workspaceReports.findIndex(r => r.id === reportId);
            if (idx !== -1) {
                targetWorkspaceId = blob.key;
                reports = workspaceReports;
                reportIndex = idx;
                break;
            }
        }
        
        if (!targetWorkspaceId || reportIndex === -1) {
             return { statusCode: 404, body: JSON.stringify({ error: "Report not found." }), headers: { "Content-Type": "application/json" } };
        }
        
        reports[reportIndex].status = status;
        await store.setJSON(targetWorkspaceId, reports);

        return { statusCode: 204, body: '' };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        console.error(`Error in update-report-status: ${errorMessage}`, error);

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
