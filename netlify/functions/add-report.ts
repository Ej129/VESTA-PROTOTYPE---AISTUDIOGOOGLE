// netlify/functions/add-report.ts

import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { getStore } from "@netlify/blobs";
// No PDF or multipart libraries needed anymore!

import { analyzePlan, analyzePlanQuick } from '../../src/api/vesta';
import { AnalysisReport, KnowledgeSource, DismissalRule, CustomRegulation } from '../../src/types';

const requireAuth = (context: HandlerContext) => {
  const user = context.clientContext?.user;
  if (!user || !user.email) {
    throw new Error("Authentication required.");
  }
  return user;
};

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }
  if (!event.body) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Bad Request: Missing body' }) };
  }

  try {
    const user = requireAuth(context);

    // 1. Parse the incoming JSON body
    const { textContent, fileName, workspaceId, analysisType } = JSON.parse(event.body);
    const documentContent = textContent;

    if (!documentContent) {
      return { statusCode: 400, body: JSON.stringify({ error: 'No text content was provided.' }) };
    }

    // --- The rest of your function logic is the same ---
    const storeOptions = {
        siteID: process.env.NETLIFY_SITE_ID,
        token: process.env.NETLIFY_API_TOKEN,
    };

    const knowledgeStore = getStore({ name: "knowledge-sources", ...storeOptions });
    const dismissalRulesStore = getStore({ name: "dismissal-rules", ...storeOptions });
    const customRegulationsStore = getStore({ name: "custom-regulations", ...storeOptions });
    
    const [knowledgeBaseSources, dismissalRules, customRegulations] = await Promise.all([
      knowledgeStore.get(workspaceId, { type: "json" }) as Promise<KnowledgeSource[] | null>,
      dismissalRulesStore.get(workspaceId, { type: "json" }) as Promise<DismissalRule[] | null>,
      customRegulationsStore.get(workspaceId, { type: "json" }) as Promise<CustomRegulation[] | null>,
    ]);

    const isQuick = analysisType === 'quick';
    const reportData = isQuick
      ? await analyzePlanQuick(documentContent, knowledgeBaseSources || [], dismissalRules || [], customRegulations || [])
      : await analyzePlan(documentContent, knowledgeBaseSources || [], dismissalRules || [], customRegulations || []);

    const reportsStore = getStore({ name: "reports", ...storeOptions });
    const existingReports = (await reportsStore.get(workspaceId, { type: "json" })) as AnalysisReport[] || [];
    
    const newReport: AnalysisReport = {
      ...reportData,
      id: `rep-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      createdAt: new Date().toISOString(),
      title: fileName || 'Untitled Analysis',
      documentContent: documentContent,
      workspaceId: workspaceId,
      status: 'active',
    };

    const updatedReports = [newReport, ...existingReports];
    await reportsStore.setJSON(workspaceId, updatedReports);

    return {
      statusCode: 200,
      body: JSON.stringify(newReport),
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    console.error(`Error in add-report: ${errorMessage}`, error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "An internal server error occurred.", details: errorMessage }),
    };
  }
};