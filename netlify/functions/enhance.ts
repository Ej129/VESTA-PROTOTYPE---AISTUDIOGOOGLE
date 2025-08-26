// netlify/functions/enhance.ts

import { Handler, HandlerEvent } from '@netlify/functions';
import { GoogleGenerativeAI as GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { AnalysisReport } from '../../src/types';
import { diffWordsWithSpace } from 'diff';

// Securely initialize the Gemini client on the server
function getGenAIClient(): GoogleGenAI {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY environment variable is not set in the Netlify build environment.");
    }
    return new GoogleGenAI(apiKey);
}

// Helper function to generate highlighted HTML from text differences
function highlightChanges(original: string, revised: string): string {
  const escapeHtml = (str: string) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const parts = diffWordsWithSpace(original || '', revised || '');
  return parts.map(p => {
    const v = escapeHtml(p.value);
    if (p.added) return `<ins class="vesta-added" style="background:#e6ffed;color:#064e3b;text-decoration:none;">${v}</ins>`;
    if (p.removed) return `<del class="vesta-removed" style="background:#ffecec;color:#991b1b;text-decoration:line-through;">${v}</del>`;
    return v;
  }).join('');
}


export const handler: Handler = async (event: HandlerEvent) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const { planContent, report } = JSON.parse(event.body || '{}') as {
            planContent: string;
            report: AnalysisReport;
        };

        if (!planContent || !report || !report.findings) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Missing planContent or report in the request body.' }) };
        }

        const genAI = getGenAIClient();
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const findingsSummary = report.findings.map(f =>
            `- Finding: "${f.title}" (Severity: ${f.severity})\n` +
            `  - Recommendation: ${f.recommendation}`
        ).join('\n\n');

        const systemPrompt = `You are an expert compliance editor. Your task is to produce a single, fully revised version of the provided project plan that integrates the suggested recommendations. Return ONLY the full revised document text. Do NOT include commentary, annotations, or metadata. Preserve all original formatting and section headings.`;

        const userPrompt = `
        Original Plan:
        ---
        ${planContent}
        ---

        Findings & Recommendations to address:
        ---
        ${findingsSummary}
        ---

        Return the full revised document text only.
        `;

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] },
             safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            ],
        });
        
        const enhancedText = result.response.text().trim();
        const highlightedHtml = highlightChanges(planContent, enhancedText);

        return {
            statusCode: 200,
            body: JSON.stringify({ text: enhancedText, highlightedHtml }),
        };

    } catch (error) {
        console.error('Error in enhance function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'An internal error occurred during enhancement.', details: (error as Error).message }),
        };
    }
};