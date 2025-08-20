
import { getStore } from "@netlify/blobs";
import type { Handler, HandlerContext } from "@netlify/functions";
import { DismissalRule } from '../../types';

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

        const { workspaceId, findingTitle, reason } = JSON.parse(event.body);
        if (!workspaceId || !findingTitle || !reason) {
            return { statusCode: 400, body: JSON.stringify({ error: "Missing required fields." }) };
        }
        
        const store = getStore("dismissal-rules");
        const rules = (await store.get(workspaceId, { type: "json" })) as DismissalRule[] || [];

        const newRule: DismissalRule = {
            id: `dr-${Date.now()}`,
            workspaceId,
            findingTitle,
            reason,
            timestamp: new Date().toISOString(),
        };
        
        rules.push(newRule);
        await store.setJSON(workspaceId, rules);

        return { statusCode: 201, body: JSON.stringify(newRule) };

    } catch (error) {
        console.error("Error in add-dismissal-rule:", error);
        if (error instanceof Error && error.message === "Authentication required.") {
            return { statusCode: 401, body: JSON.stringify({ error: error.message }) };
        }
        return { statusCode: 500, body: JSON.stringify({ error: "An internal server error occurred." }) };
    }
};
