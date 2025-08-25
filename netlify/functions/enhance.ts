// src/api/vesta.ts

import { AnalysisReport, Finding, KnowledgeSource, DismissalRule, CustomRegulation, ChatMessage, EnhancedAnalysisResponse } from '../../src/types';
import { GoogleGenerativeAI as GoogleGenAI, HarmCategory, HarmBlockThreshold, GenerationConfig, Content } from "@google/generative-ai";

// This function should eventually be moved to a backend function as well to fully secure your API key.
function getGenAIClient(): GoogleGenAI {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("VITE_API_KEY environment variable is not set. Please configure it in your deployment settings.");
    }
    return new GoogleGenAI(apiKey);
}

// NOTE: This function still makes a direct call to the Gemini API from the client.
// For full security, you should refactor this to call a backend Netlify function,
// just like we are doing for enhanceAndAnalyzePlan.
export async function analyzePlan(planContent: string, knowledgeSources: KnowledgeSource[], dismissalRules: DismissalRule[], customRegulations: CustomRegulation[]): Promise<Omit<AnalysisReport, 'id' | 'workspaceId' | 'createdAt' | 'documentContent'>> {
    // ... This function's original code remains unchanged for now ...
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
    
    const model = getGenAIClient().getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const generationConfig: GenerationConfig = {
      temperature: 0.2,
      responseMimeType: "application/json",
      responseSchema: { /* Your original reportSchema object here */ },
    };

    try {
        const result = await model.generateContent({
            contents: [{role: 'user', parts: [{ text: `Analyze the following project plan:\n\n---\n\n${planContent}\n\n---\n\nPlease provide your analysis in the requested JSON format.`}]}],
            systemInstruction: { role: 'system', parts: [{text: `You are Vesta...` /* Your full system instruction */ }]},
            generationConfig,
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                // ... other safety settings
            ],
        });

        const jsonText = result.response.text();
        // ... rest of your original analyzePlan function logic
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

/**
 * [CORRECTED FUNCTION]
 * This is the new, single version of the function. It securely calls our backend
 * Netlify function instead of calling the Google Gemini API directly from the browser.
 */
export async function enhanceAndAnalyzePlan(planContent: string, report: AnalysisReport, knowledgeSources: KnowledgeSource[]): Promise<EnhancedAnalysisResponse> {
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
        console.error("API Error from /netlify/functions/enhance:", errorData);
        throw new Error(errorData.message || 'The enhancement process failed.');
    }

    return await response.json();
}

// NOTE: This function also makes a direct client-side API call.
// This should also be refactored to a backend function to protect your API key.
export async function getChatResponse(documentContent: string, history: ChatMessage[], newMessage: string): Promise<string> {
    // ... This function's original code remains unchanged for now ...
    const model = getGenAIClient().getGenerativeModel({ model: "gemini-1.5-flash" });
    const chat = model.startChat({
      history: history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }]
      })),
      systemInstruction: { role: 'system', parts: [{text: `You are Vesta, an AI assistant...` /* Your full system instruction */ }] },
    });

    try {
        const result = await chat.sendMessage(newMessage);
        return result.response.text().trim();
    } catch (error) {
        console.error("Error getting chat response from Gemini:", error);
        return "Sorry, I encountered an error while processing your request. Please try again.";
    }
}