
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

        const { reportId } = JSON.parse(event.body);
        if (!reportId) {
            return { statusCode: 400, body: JSON.stringify({ error: "Missing required reportId." }) };
        }

        // We need to find which workspace this report belongs to
        const store = getStore("reports");
        const { blobs } = await store.list();
        let targetWorkspaceId: string | null = null;
        let reports: AnalysisReport[] = [];

        for (const blob of blobs) {
            const workspaceReports = (await store.get(blob.key, { type: "json" })) as AnalysisReport[];
            if (workspaceReports.some(r => r.id === reportId)) {
                targetWorkspaceId = blob.key;
                reports = workspaceReports;
                break;
            }
        }
        
        if (!targetWorkspaceId) {
             return { statusCode: 404, body: JSON.stringify({ error: "Report not found." }) };
        }
        
        const updatedReports = reports.filter(r => r.id !== reportId);
        await store.setJSON(targetWorkspaceId, updatedReports);

        return { statusCode: 204 }; // No Content

    } catch (error) {
        console.error("Error in delete-report:", error);
        if (error instanceof Error && error.message === "Authentication required.") {
            return { statusCode: 401, body: JSON.stringify({ error: error.message }) };
        }
        return { statusCode: 500, body: JSON.stringify({ error: "An internal server error occurred." }) };
    }
};
