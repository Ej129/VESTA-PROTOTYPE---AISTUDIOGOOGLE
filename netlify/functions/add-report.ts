// netlify/functions/add-report.ts

import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { getStore } from "@netlify/blobs";
import multipart from 'parse-multipart-data';
// --- CORRECT LIBRARY ---
import PDFParser from "pdf2json";

import { analyzePlan, analyzePlanQuick } from '../../src/api/vesta';
import { AnalysisReport, KnowledgeSource, DismissalRule, CustomRegulation } from '../../src/types';

const requireAuth = (context: HandlerContext) => {
  const user = context.clientContext?.user;
  if (!user || !user.email) {
    throw new Error("Authentication required.");
  }
  return user;
};

// Helper function to wrap the event-based pdf2json in a Promise
const parsePdfBuffer = (buffer: Buffer): Promise<string> => {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on("pdfParser_dataError", (errData: any) => {
      console.error(errData.parserError);
      reject(new Error("Error parsing PDF."));
    });

    pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
      const rawText = pdfParser.getRawTextContent();
      resolve(rawText);
    });

    pdfParser.parseBuffer(buffer);
  });
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
    const storeOptions = {
        siteID: process.env.NETLIFY_SITE_ID,
        token: process.env.NETLIFY_API_TOKEN,
    };

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

    let documentContent = '';
    if (filePart.type === 'application/pdf') {
        documentContent = await parsePdfBuffer(fileContentBuffer);
    } else {
        documentContent = fileContentBuffer.toString('utf-8');
    }

    if (!documentContent) {
        return { statusCode: 400, body: 'Could not extract text from the provided file.' };
    }

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
      title: fileName,
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
      body: JSON.stringify({ error: "An internal server error occurred during analysis.", details: errorMessage }),
    };
  }
};