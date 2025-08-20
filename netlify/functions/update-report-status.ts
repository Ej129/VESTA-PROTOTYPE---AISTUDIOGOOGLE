
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
            return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
        }
        
        requireAuth(context);
        if (!event.body) {
            return { statusCode: 400, body: JSON.stringify({ error: "Request body is missing." }) };
        }

        const { reportId, status } = JSON.parse(event.body);
        if (!reportId || !status || !['active', 'archived'].includes(status)) {
            return { statusCode: 400, body: JSON.stringify({ error: "Missing or invalid required fields." }) };
        }

        // We need to find which workspace this report belongs to
        const store = getStore("reports");
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
             return { statusCode: 404, body: JSON.stringify({ error: "Report not found." }) };
        }
        
        reports[reportIndex].status = status;
        await store.setJSON(targetWorkspaceId, reports);

        return { statusCode: 204 }; // No Content

    } catch (error) {
        console.error("Error in update-report-status:", error);
        if (error instanceof Error && error.message === "Authentication required.") {
            return { statusCode: 401, body: JSON.stringify({ error: error.message }) };
        }
        return { statusCode: 500, body: JSON.stringify({ error: "An internal server error occurred." }) };
    }
};
