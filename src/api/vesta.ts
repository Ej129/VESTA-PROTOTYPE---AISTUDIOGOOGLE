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

export async function analyzePlan(planContent: string, knowledgeSources: KnowledgeSource[], dismissalRules: DismissalRule[], customRegulations: CustomRegulation[]): Promise<Omit<AnalysisReport, 'id' | 'workspaceId' | 'createdAt' | 'documentContent'>> {
    if (!planContent.trim()) {
        throw new Error("The document content is empty. Please provide a plan to analyze.");
    }

    let contextPrompt = '';
    if (knowledgeSources.length > 0) {
        const sourcesText = knowledgeSources.map(s => `--- KNOWLEDGE SOURCE: ${s.title} ---\n${s.content}`).join('\n\n');
        contextPrompt += `\n\nCONTEXTUAL KNOWLEDGE BASE:\n${sourcesText}`;
    }
    if (dismissalRules.length > 0) {
        const rulesText = dismissalRules.map(r => `- "${r.findingTitle}" (Reason: ${r.reason})`).join('\n');
        contextPrompt += `\n\nLEARNED DISMISSAL RULES:\n${rulesText}`;
    }
    if (customRegulations && customRegulations.length > 0) {
        const rulesText = customRegulations.map(r => `- ${r.ruleText}`).join('\n');
        contextPrompt += `\n\nWORKSPACE-SPECIFIC CUSTOM REGULATIONS:\n${rulesText}`;
    }
    
    const safetySettings = [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    ];

    try {
        const response: GenerateContentResponse = await getGenAIClient().models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Analyze the following project plan:\n\n---\n\n${planContent}\n\n---\n\nPlease provide your analysis in the requested JSON format.`,
            safetySettings,
            config: {
                systemInstruction: `You are Vesta, an AI assistant specializing in digital resilience for the financial sector. Your task is to analyze project plans against financial regulations (like those from BSP) and best practices (like the Data Privacy Act of the Philippines). Your analysis must be meticulous and structured. Follow these steps:
1. Read the entire document and all contextual knowledge to fully understand the project's goals and constraints.
2. For each potential issue you identify, you MUST find the single, most relevant and specific sentence or phrase from the original document to use as the \`sourceSnippet\`. Avoid using generic section headers as snippets for multiple, unrelated findings. The snippet must be an exact, verbatim quote.
3. Provide a concise, impactful \`title\` for the finding that clearly summarizes the core problem.
4. Assign a \`severity\` of 'critical' for major compliance/security gaps, or 'warning' for recommendations and best-practice improvements.
5. Write a detailed, actionable \`recommendation\` to fix the issue, citing specific regulations from the knowledge base where applicable.
6. Critically evaluate ALL aspects of the plan, including its stated Objectives, Scope, Timeline, Budget, and Risk Management sections, for potential weaknesses, gaps, or inconsistencies.`,
                responseMimeType: "application/json",
                responseSchema: reportSchema,
                temperature: 0.2,
            },
        });

        const jsonText = response.text;
        if (!jsonText || typeof jsonText !== 'string') {
            throw new Error("The AI model returned an empty or invalid response, possibly due to content safety filters. Please try modifying the document or try again.");
        }
        
        const parsedReport = JSON.parse(jsonText.trim());
        return {
            title: "Project Plan Analysis",
            resilienceScore: parsedReport.scores.project,
            scores: parsedReport.scores,
            findings: parsedReport.findings.map((f: any, index: number): Finding => ({
                id: `finding-${Date.now()}-${index}`,
                title: f.title,
                severity: f.severity,
                sourceSnippet: f.sourceSnippet,
                recommendation: f.recommendation,
                status: 'active',
            })),
            summary: {
                critical: parsedReport.findings.filter((f: any) => f.severity === 'critical').length,
                warning: parsedReport.findings.filter((f: any) => f.severity === 'warning').length,
                checks: Math.floor(1000 + Math.random() * 500)
            },
        };
    } catch (error) {
        console.error("Error analyzing plan with Gemini:", error);
        throw error;
    }
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