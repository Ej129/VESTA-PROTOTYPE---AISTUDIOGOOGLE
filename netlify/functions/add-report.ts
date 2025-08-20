
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

        const reportData: Omit<AnalysisReport, 'id' | 'createdAt'> = JSON.parse(event.body);
        if (!reportData.workspaceId || !reportData.title) {
            return { statusCode: 400, body: JSON.stringify({ error: "Missing required report data." }) };
        }
        
        const store = getStore("reports");
        const reports = (await store.get(reportData.workspaceId, { type: "json" })) as AnalysisReport[] || [];

        const newReport: AnalysisReport = {
            ...reportData,
            id: `rep-${Date.now()}`,
            createdAt: new Date().toISOString(),
            status: 'active',
        };
        
        reports.unshift(newReport);
        await store.setJSON(reportData.workspaceId, reports);

        return { statusCode: 201, body: JSON.stringify(newReport) };

    } catch (error) {
        console.error("Error in add-report:", error);
        if (error instanceof Error && error.message === "Authentication required.") {
            return { statusCode: 401, body: JSON.stringify({ error: error.message }) };
        }
        return { statusCode: 500, body: JSON.stringify({ error: "An internal server error occurred." }) };
    }
};
