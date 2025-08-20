
import { getStore } from "@netlify/blobs";
import type { Handler, HandlerContext } from "@netlify/functions";
import { CustomRegulation } from '../../types';

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

        const { workspaceId, ruleText } = JSON.parse(event.body);
        if (!workspaceId || !ruleText) {
            return { statusCode: 400, body: JSON.stringify({ error: "Missing required fields." }) };
        }
        
        const store = getStore("custom-regulations");
        const regulations = (await store.get(workspaceId, { type: "json" })) as CustomRegulation[] || [];

        const newRegulation: CustomRegulation = {
            id: `cr-${Date.now()}`,
            workspaceId,
            ruleText,
            createdBy: user.email,
            createdAt: new Date().toISOString(),
        };
        
        regulations.push(newRegulation);
        await store.setJSON(workspaceId, regulations);

        return { statusCode: 201, body: JSON.stringify(newRegulation) };

    } catch (error) {
        console.error("Error in add-custom-regulation:", error);
        if (error instanceof Error && error.message === "Authentication required.") {
            return { statusCode: 401, body: JSON.stringify({ error: error.message }) };
        }
        return { statusCode: 500, body: JSON.stringify({ error: "An internal server error occurred." }) };
    }
};
