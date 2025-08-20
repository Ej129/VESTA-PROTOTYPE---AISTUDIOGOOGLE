import { getStore } from "@netlify/blobs";

export async function handler(event) {
  try {
    const { name } = JSON.parse(event.body);

    if (!name) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Workspace name is required." }),
      };
    }

    // Fake user for testing
    const userEmail = "test@example.com";

    const store = getStore("workspaces", { consistency: "strong" });

    // Create workspace object
    const workspace = {
      id: Date.now().toString(),
      name,
      createdBy: userEmail,
      createdAt: new Date().toISOString(),
    };

    // Save to Blobs
    await store.set(workspace.id, JSON.stringify(workspace));

    return {
      statusCode: 200,
      body: JSON.stringify(workspace),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
}
