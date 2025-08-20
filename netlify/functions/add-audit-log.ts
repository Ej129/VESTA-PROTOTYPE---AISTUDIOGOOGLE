
import { getStore } from "@netlify/blobs";
import type { Handler, HandlerContext } from "@netlify/functions";
import { AuditLog } from '../../types';

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
        
        const user = requireAuth(context);
        if (!event.body) {
            return { statusCode: 400, body: JSON.stringify({ error: "Request body is missing." }) };
        }

        const { workspaceId, action, details } = JSON.parse(event.body);
        if (!workspaceId || !action || !details) {
            return { statusCode: 400, body: JSON.stringify({ error: "Missing required fields." }) };
        }
        
        const store = getStore("audit-logs");
        const logs = (await store.get(workspaceId, { type: "json" })) as AuditLog[] || [];

        const newLog: AuditLog = {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            userEmail: user.email,
            action,
            details,
        };
        
        logs.unshift(newLog);
        await store.setJSON(workspaceId, logs);

        return { statusCode: 201, body: JSON.stringify(newLog) };

    } catch (error) {
        console.error("Error in add-audit-log:", error);
        if (error instanceof Error && error.message === "Authentication required.") {
            return { statusCode: 401, body: JSON.stringify({ error: error.message }) };
        }
        return { statusCode: 500, body: JSON.stringify({ error: "An internal server error occurred." }) };
    }
};
