
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

        const { workspaceId, ruleId } = JSON.parse(event.body);
        if (!workspaceId || !ruleId) {
            return { statusCode: 400, body: JSON.stringify({ error: "Missing required fields." }) };
        }
        
        const store = getStore("dismissal-rules");
        const rules = (await store.get(workspaceId, { type: "json" })) as DismissalRule[] || [];
        
        const updatedRules = rules.filter(r => r.id !== ruleId);
        
        await store.setJSON(workspaceId, updatedRules);

        return { statusCode: 204 }; // No Content

    } catch (error) {
        console.error("Error in delete-dismissal-rule:", error);
        if (error instanceof Error && error.message === "Authentication required.") {
            return { statusCode: 401, body: JSON.stringify({ error: error.message }) };
        }
        return { statusCode: 500, body: JSON.stringify({ error: "An internal server error occurred." }) };
    }
};
