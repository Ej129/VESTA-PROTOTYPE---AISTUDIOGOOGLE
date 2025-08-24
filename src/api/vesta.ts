// src/api/vesta.ts

import { AnalysisReport, Finding, KnowledgeSource, DismissalRule, CustomRegulation, ChatMessage, EnhancedAnalysisResponse } from '../types';
import { GoogleGenAI, Type, GenerateContentResponse, HarmCategory, HarmBlockThreshold } from "@google/genai";

let ai: GoogleGenAI | null = null;

function getGenAIClient(): GoogleGenAI {
    const apiKey = import.meta.env.VITE_API_KEY;
    if (!apiKey) {
        throw new Error("VITE_API_KEY environment variable is not set. Please configure it in your deployment settings.");
    }
    if (!ai) {
        ai = new GoogleGenAI({ apiKey: apiKey });
    }
    return ai;
}

const reportSchema = {
    type: Type.OBJECT,
    properties: {
        scores: {
          type: Type.OBJECT,
          properties: {
            project: { type: Type.INTEGER },
            strategicGoals: { type: Type.INTEGER },
            regulations: { type: Type.INTEGER },
            risk: { type: Type.INTEGER }
          }
        },
        findings: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    severity: { type: Type.STRING },
                    sourceSnippet: { type: Type.STRING },
                    recommendation: { type: Type.STRING }
                },
                required: ["title", "severity", "sourceSnippet", "recommendation"],
            },
        },
    },
    required: ["scores", "findings"],
};

export async function enhanceAndAnalyzePlan(planContent: string, report: AnalysisReport, knowledgeSources: KnowledgeSource[]): Promise<EnhancedAnalysisResponse> {
    
    // The new logic: call your own backend endpoint
    const response = await fetch('/.netlify/functions/enhance', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            planContent,
            report,
            knowledgeSources,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error("API Error:", errorData);
        throw new Error(errorData.message || 'The enhancement process failed.');
    }

    // The function returns the JSON directly
    const enhancedData: EnhancedAnalysisResponse = await response.json();
    return enhancedData;
}

export async function enhanceAndAnalyzePlan(planContent: string, report: AnalysisReport, knowledgeSources: KnowledgeSource[]): Promise<EnhancedAnalysisResponse> {
    const findingsSummary = report.findings.map(f => `- Finding: "${f.title}"...\n  - Recommendation: ${f.recommendation}`).join('\n\n');
    let contextPrompt = '';
    if (knowledgeSources.length > 0) {
        const sourcesText = knowledgeSources.map(s => `--- KNOWLEDGE SOURCE: ${s.title} ---\n${s.content}`).join('\n\n');
        contextPrompt = `\n\nCONTEXTUAL KNOWLEDGE BASE:\n--- \n${sourcesText}\n---`;
    }

    const newSchema = {
        type: Type.OBJECT,
        properties: {
            improvedDocumentContent: {
                type: Type.STRING,
                description: "The full, final, and clean rewritten text of the project plan. It must not contain any diff markers like '++' or '--'."
            },
            newAnalysis: {
                type: Type.OBJECT,
                properties: {
                    scores: {
                        type: Type.OBJECT,
                        properties: {
                            project: { type: Type.INTEGER },
                            strategicGoals: { type: Type.INTEGER },
                            regulations: { type: Type.INTEGER },
                            risk: { type: Type.INTEGER }
                        }
                    },
                    findings: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                severity: { type: Type.STRING },
                                sourceSnippet: { type: Type.STRING },
                                recommendation: { type: Type.STRING }
                            },
                            required: ["title", "severity", "sourceSnippet", "recommendation"]
                        }
                    }
                },
                required: ["scores", "findings"]
            }
        },
        required: ["improvedDocumentContent", "newAnalysis"]
    };

    const response = await getGenAIClient().models.generateContent({
        model: "gemini-2.5-flash",
        contents: `ORIGINAL PLAN:\n---\n${planContent}\n---\n\nISSUES & RECOMMENDATIONS:\n---\n${findingsSummary}\n---${contextPrompt}`,
        config: {
            // --- NEW, FINAL SYSTEM INSTRUCTION ---
            systemInstruction: `You are an expert corporate editor and compliance officer. Your task is to perform two steps in order:
1.  **FIRST, rewrite the entire ORIGINAL PLAN** to meticulously incorporate all the given recommendations. The final output must be a clean, professional, and well-formatted business document. **DO NOT use any diff markers like '++' or '--'.** Use formatting like headings, bullet points, and bold text appropriately to improve readability.
2.  **SECOND, perform a brand new, thorough analysis** on YOUR OWN professionally formatted, rewritten document.
You must return a single JSON object containing both the final, clean rewritten document and the new analysis.`,
            responseMimeType: "application/json",
            responseSchema: newSchema,
            temperature: 0.2,
        },
    });

    const jsonText = response.text;
    if (!jsonText) {
        throw new Error("The AI model returned an empty response during enhancement.");
    }
    return JSON.parse(jsonText.trim());
}


export async function getChatResponse(documentContent: string, history: ChatMessage[], newMessage: string): Promise<string> {
    const contents = [
        ...history.map(msg => ({
            role: msg.role,
            parts: [{ text: msg.content }]
        })),
        {
            role: 'user' as const,
            parts: [{ text: newMessage }]
        }
    ];

    try {
        const response: GenerateContentResponse = await getGenAIClient().models.generateContent({
            model: "gemini-2.5-flash",
            contents: contents,
            config: {
                systemInstruction: `You are Vesta, an AI assistant. The user is asking questions about the following document. Use the document as the primary source of truth to answer their questions. Be concise and helpful. If the question cannot be answered from the document, say so. Do not make up information.\n\nDOCUMENT CONTEXT:\n---\n${documentContent}\n---`,
                temperature: 0.2,
            },
        });

        return response.text.trim();
    } catch (error) {
        console.error("Error getting chat response from Gemini:", error);
        return "Sorry, I encountered an error while processing your request. Please try again.";
    }
}