import { getStore } from "@netlify/blobs";
import type { Handler } from "@netlify/functions";

interface Workspace {
  id: string;
  name: string;
  creatorId: string;
  createdAt: string;
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
    if (!user || !user.email) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Authentication required." }),
        headers: { "Content-Type": "application/json" },
      };
    }

    const { name } = JSON.parse(event.body || "{}");
    if (!name || typeof name !== "string" || name.trim() === "") {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Workspace name is required." }),
        headers: { "Content-Type": "application/json" },
      };
    }

    // Open the Blobs store
    const store = getStore("vesta-data");

    // Try to load existing workspaces
    const existing = (await store.get("workspaces", { type: "json" })) as Workspace[] | null;

    const allWorkspaces = Array.isArray(existing) ? existing : [];

    // Create new workspace
    const newWorkspace: Workspace = {
      id: `ws-${Date.now()}`,
      name: name.trim(),
      creatorId: user.email,
      createdAt: new Date().toISOString(),
    };

    // Save back
    allWorkspaces.push(newWorkspace);
    await store.setJSON("workspaces", allWorkspaces);

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
