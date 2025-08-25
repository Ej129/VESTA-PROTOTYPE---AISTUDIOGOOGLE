// netlify/functions/enhance.ts

import { Handler, HandlerEvent } from '@netlify/functions';
import { GoogleGenerativeAI as GoogleGenAI, HarmCategory, HarmBlockThreshold, GenerationConfig } from "@google/generative-ai";
import { AnalysisReport, KnowledgeSource, EnhancedAnalysisResponse } from '../../src/types';

// Securely initialize the Gemini client on the server
function getGenAIClient(): GoogleGenAI {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        // This error will be visible in the function logs on Netlify
        throw new Error("GEMINI_API_KEY environment variable is not set in the Netlify build environment.");
    }
    return new GoogleGenAI(apiKey);
}

// This is the main entry point for the Netlify Function.
// It MUST be a named export called "handler".
export const handler: Handler = async (event: HandlerEvent) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: 'Method Not Allowed' }),
        };
    }

    try {
        const { planContent, report, knowledgeSources } = JSON.parse(event.body || '{}') as {
            planContent: string;
            report: AnalysisReport;
            knowledgeSources: KnowledgeSource[];
        };

        if (!planContent || !report) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Missing planContent or report in the request body.' }),
            };
        }

        const genAI = getGenAIClient();
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const knowledgeContext = (knowledgeSources || [])
            .map(s => `--- KNOWLEDGE SOURCE: ${s.title} ---\n${s.content}`)
            .join('\n\n');

        const systemInstruction = `You are Vesta, an expert AI assistant specializing in regulatory compliance and risk analysis for the financial sector. Your task is to take a document, a list of its identified flaws (findings), and a knowledge base, and then produce an improved version of the document.

        1.  **Analyze the original document and its findings**: Understand the core issues identified.
        2.  **Use the knowledge base**: Incorporate relevant information from the provided knowledge sources to strengthen the document.
        3.  **Rewrite and Enhance**: Rewrite sections of the document to address the findings directly. Do not just list changes; integrate them seamlessly. The goal is a complete, improved document.
        4.  **Produce a Highlighted HTML Diff**: In addition to the full text, generate an HTML representation showing the changes. Use '<ins>' tags for additions and '<del>' tags for deletions. This is crucial for visualization.
        5.  **Re-analyze the improved document**: After creating the improved text, perform a new analysis on it. Generate a new set of findings and scores based *only* on the improved version.

        You MUST respond in the following JSON format:
        {
          "text": "The full, enhanced version of the document text...",
          "highlightedHtml": "The HTML version of the document with <ins> and <del> tags for changes...",
          "newReportData": {
            "findings": [{ "title": "...", "severity": "...", "sourceSnippet": "...", "recommendation": "..." }],
            "scores": { "project": 0, "strategicGoals": 0, "regulations": 0, "risk": 0 },
            "summary": { "critical": 0, "warning": 0 },
            "resilienceScore": 0
          }
        }`;

        const prompt = `
        Original Document:
        ---
        ${planContent}
        ---

        Identified Findings:
        ---
        ${report.findings.map(f => `- ${f.title}: ${f.recommendation}`).join('\n')}
        ---

        Contextual Knowledge Base:
        ---
        ${knowledgeContext}
        ---

        Now, please provide the enhanced document and a new analysis in the required JSON format.
        `;

        const generationConfig: GenerationConfig = {
            temperature: 0.3,
            responseMimeType: "application/json",
        };

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            systemInstruction: { role: 'system', parts: [{ text: systemInstruction }] },
            generationConfig,
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            ],
        });

        const enhancedResponse: EnhancedAnalysisResponse = JSON.parse(result.response.text());

        return {
            statusCode: 200,
            body: JSON.stringify(enhancedResponse),
        };

    } catch (error) {
        console.error('Error in enhance function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'An internal error occurred during the enhancement process.', details: (error as Error).message }),
        };
    }
};