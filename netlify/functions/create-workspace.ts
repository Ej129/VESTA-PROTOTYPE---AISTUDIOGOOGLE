import { getStore } from "@netlify/blobs";
import type { Handler } from "@netlify/functions";

interface Workspace {
  id: string;
  name: string;
  creatorId: string;
  createdAt: string;
}

function getBlobStore() {
  // Netlify provides these automatically in production
  const siteID = process.env.NETLIFY_SITE_ID;
  const token = process.env.NETLIFY_API_TOKEN;

  if (siteID && token) {
    return getStore("vesta-data", { siteID, token });
  }

  // Fallback for Netlify Functions runtime (no manual config needed there)
  return getStore("vesta-data");
}

export const handler: Handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
      headers: { "Content-Type": "application/json" },
    };
  }

  try {
    const user = context.clientContext?.user;
    if (!user?.email) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Authentication required." }),
        headers: { "Content-Type": "application/json" },
      };
    }

    let body: { name?: string } = {};
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid JSON body." }),
        headers: { "Content-Type": "application/json" },
      };
    }

    const { name } = body;
    if (!name || name.trim() === "") {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Workspace name is required." }),
        headers: { "Content-Type": "application/json" },
      };
    }

    const store = getBlobStore();

    let existing: Workspace[] = [];
    try {
      const stored = await store.get("workspaces", { type: "json" });
      if (Array.isArray(stored)) {
        existing = stored;
      }
    } catch {
      existing = [];
    }

    const newWorkspace: Workspace = {
      id: `ws-${Date.now()}`,
      name: name.trim(),
      creatorId: user.email,
      createdAt: new Date().toISOString(),
    };

    existing.push(newWorkspace);
    await store.setJSON("workspaces", existing);

    return {
      statusCode: 201,
      body: JSON.stringify(newWorkspace),
      headers: { "Content-Type": "application/json" },
    };
  } catch (error) {
    console.error("Error creating workspace:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to create workspace." }),
      headers: { "Content-Type": "application/json" },
    };
  }
};
