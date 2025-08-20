
import { getStore } from "@netlify/blobs";
import type { Handler, HandlerContext } from "@netlify/functions";
import { KnowledgeSource } from '../../types';

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

        const { workspaceId, sourceId } = JSON.parse(event.body);
        if (!workspaceId || !sourceId) {
            return { statusCode: 400, body: JSON.stringify({ error: "Missing required fields." }) };
        }
        
        const store = getStore("knowledge-sources");
        const sources = (await store.get(workspaceId, { type: "json" })) as KnowledgeSource[] || [];
        
        const updatedSources = sources.filter(s => s.id !== sourceId);
        
        await store.setJSON(workspaceId, updatedSources);

        return { statusCode: 204 }; // No Content

    } catch (error) {
        console.error("Error in delete-knowledge-source:", error);
        if (error instanceof Error && error.message === "Authentication required.") {
            return { statusCode: 401, body: JSON.stringify({ error: error.message }) };
        }
        return { statusCode: 500, body: JSON.stringify({ error: "An internal server error occurred." }) };
    }
};
