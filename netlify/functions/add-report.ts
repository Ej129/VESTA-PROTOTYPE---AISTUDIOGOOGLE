// netlify/functions/add-report.ts

import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { getStore } from "@netlify/blobs";
import multipart from 'parse-multipart-data';
import pdf from 'pdf-parse';

// Re-using your existing API and type imports
import { analyzePlan, analyzePlanQuick } from '../../src/api/vesta';
import { AnalysisReport, KnowledgeSource, DismissalRule, CustomRegulation } from '../../src/types';

// Copied directly from your other functions for consistency
const requireAuth = (context: HandlerContext) => {
  const user = context.clientContext?.user;
  if (!user || !user.email) {
    throw new Error("Authentication required.");
  }
  return user;
};

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  if (!event.body || !event.headers['content-type']) {
    return { statusCode: 400, body: 'Bad Request: Missing body or content-type' };
  }

  try {
    const user = requireAuth(context);

    // --- 1. SETUP: Initialize Netlify Blobs store access ---
    const storeOptions = {
        siteID: process.env.NETLIFY_SITE_ID,
        token: process.env.NETLIFY_API_TOKEN,
    };

    // --- 2. PARSE FILE UPLOAD: Handle multipart data and extract file ---
    // Correctly create a buffer, respecting Netlify's isBase64Encoded flag
    const bodyBuffer = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'binary');
    const boundary = multipart.getBoundary(event.headers['content-type']);
    const parts = multipart.parse(bodyBuffer, boundary);

    const filePart = parts.find(part => part.name === 'file');
    const workspaceIdPart = parts.find(part => part.name === 'workspaceId');
    const analysisTypePart = parts.find(part => part.name === 'analysisType');

    if (!filePart || !workspaceIdPart || !analysisTypePart) {
      return { statusCode: 400, body: 'Missing required form parts (file, workspaceId, analysisType)' };
    }
    
    const workspaceId = workspaceIdPart.data.toString();
    const analysisType = analysisTypePart.data.toString();
    const fileName = filePart.filename || 'Untitled Analysis';
    const fileContentBuffer = filePart.data;

    // --- 3. EXTRACT TEXT: Use pdf-parse for PDFs, or treat as text ---
    let documentContent = '';
    if (filePart.type === 'application/pdf') {
        const data = await pdf(fileContentBuffer);
        documentContent = data.text;
    } else {
        documentContent = fileContentBuffer.toString('utf-8');
    }

    if (!documentContent) {
        return { statusCode: 400, body: 'Could not extract text from the provided file.' };
    }

    // --- 4. FETCH CONTEXT: Get Knowledge Base, etc., from Blobs ---
    const knowledgeStore = getStore({ name: "knowledge-sources", ...storeOptions });
    const dismissalRulesStore = getStore({ name: "dismissal-rules", ...storeOptions });
    const customRegulationsStore = getStore({ name: "custom-regulations", ...storeOptions });
    
    const [knowledgeBaseSources, dismissalRules, customRegulations] = await Promise.all([
      knowledgeStore.get(workspaceId, { type: "json" }) as Promise<KnowledgeSource[] | null>,
      dismissalRulesStore.get(workspaceId, { type: "json" }) as Promise<DismissalRule[] | null>,
      customRegulationsStore.get(workspaceId, { type: "json" }) as Promise<CustomRegulation[] | null>,
    ]);

    // --- 5. RUN ANALYSIS: Call your Vesta AI logic ---
    const isQuick = analysisType === 'quick';
    const reportData = isQuick
      ? await analyzePlanQuick(documentContent, knowledgeBaseSources || [], dismissalRules || [], customRegulations || [])
      : await analyzePlan(documentContent, knowledgeBaseSources || [], dismissalRules || [], customRegulations || []);

    // --- 6. SAVE REPORT: Add the new report to the list in Netlify Blobs ---
    const reportsStore = getStore({ name: "reports", ...storeOptions });
    const existingReports = (await reportsStore.get(workspaceId, { type: "json" })) as AnalysisReport[] || [];
    
    const newReport: AnalysisReport = {
      ...reportData,
      id: `rep-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      createdAt: new Date().toISOString(),
      title: fileName,
      documentContent: documentContent,
      workspaceId: workspaceId,
      status: 'active',
    };

    const updatedReports = [newReport, ...existingReports];
    await reportsStore.setJSON(workspaceId, updatedReports);

    // TODO: Add an audit log entry here if desired

    return {
      statusCode: 200,
      body: JSON.stringify(newReport), // Return the newly created report
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    console.error(`Error in add-report: ${errorMessage}`, error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "An internal server error occurred during analysis.", details: errorMessage }),
    };
  }
};