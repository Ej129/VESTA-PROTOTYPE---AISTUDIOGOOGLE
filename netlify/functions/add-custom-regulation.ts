
import { getStore } from "@netlify/blobs";
import type { Handler, HandlerContext } from "@netlify/functions";
import { CustomRegulation } from '../../src/types';

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

        const { workspaceId, ruleText } = JSON.parse(event.body);
        if (!workspaceId || !ruleText) {
            return { statusCode: 400, body: JSON.stringify({ error: "Missing required fields." }), headers: { "Content-Type": "application/json" } };
        }
        
        const store = getStore({
            name: "custom-regulations",
            siteID: process.env.NETLIFY_SITE_ID,
            token: process.env.NETLIFY_API_TOKEN,
        });
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

        return { statusCode: 201, body: JSON.stringify(newRegulation), headers: { "Content-Type": "application/json" } };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        console.error(`Error in add-custom-regulation: ${errorMessage}`, error);

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