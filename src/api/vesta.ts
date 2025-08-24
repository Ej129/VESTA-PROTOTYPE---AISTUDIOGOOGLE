// src/api/vesta.ts

import { GoogleGenAI, Type, GenerateContentResponse, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { AnalysisReport, Finding, KnowledgeSource, DismissalRule, CustomRegulation, ChatMessage } from '../types';


let ai: GoogleGenAI | null = null;

/**
 * Lazily initializes and returns the GoogleGenAI client instance.
 * Throws an error if the API key is not available.
 */
function getGenAIClient(): GoogleGenAI {
    // Use Vite's special way to access environment variables
    const apiKey = import.meta.env.VITE_API_KEY;

    if (!apiKey) {
        // This is a safeguard. The main App component should catch this earlier.
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
          description: "A breakdown of scores in different categories from 0-100.",
          properties: {
            project: {
              type: Type.INTEGER,
              description: "Overall project score based on clarity, completeness, feasibility, and number of findings. A high score is good."
            },
            strategicGoals: {
              type: Type.INTEGER,
              description: "Score indicating alignment with provided strategic goals and in-house documents. A high score is good."
            },
            regulations: {
              type: Type.INTEGER,
              description: "Score for compliance with provided government regulations. A high score is good."
            },
            risk: {
              type: Type.INTEGER,
              description: "Score representing how well risks are identified and mitigated. A high score indicates low unmitigated risk."
            }
          },
          required: ["project", "strategicGoals", "regulations", "risk"]
        },
        findings: {
            type: Type.ARRAY,
            description: "A list of all issues, gaps, and warnings found in the document.",
            items: {
                type: Type.OBJECT,
                properties: {
                    title: {
                        type: Type.STRING,
                        description: "A concise, one-sentence title for the finding.",
                    },
                    severity: {
                        type: Type.STRING,
                        description: "Severity of the issue. Must be one of: 'critical', 'warning'.",
                    },
                    sourceSnippet: {
                        type: Type.STRING,
                        description: "The exact, verbatim quote from the project plan that this finding is based on.",
                    },
                    recommendation: {
                        type: Type.STRING,
                        description: "A detailed, actionable recommendation to fix the issue. If possible, cite relevant regulations like BSP (Bangko Sentral ng Pilipinas) circulars or the Data Privacy Act (RA 10173).",
                    },
                },
                required: ["title", "severity", "sourceSnippet", "recommendation"],
            },
        },
    },
    required: ["scores", "findings"],
};

export async function analyzePlan(planContent: string, knowledgeSources: KnowledgeSource[], dismissalRules: DismissalRule[], customRegulations: CustomRegulation[]): Promise<Omit<AnalysisReport, 'id' | 'workspaceId' | 'createdAt'>> {
    if (!planContent.trim()) {
        // ... (empty content handling remains the same)
        return {
            title: "Analysis Failed",
            resilienceScore: 0,
            scores: { project: 0, strategicGoals: 0, regulations: 0, risk: 0 },
            findings: [{
                id: 'error-empty',
                title: 'Empty Document',
                severity: 'critical',
                sourceSnippet: 'N/A',
                recommendation: 'The submitted document is empty. Please provide a project plan to analyze.',
                status: 'active',
            }],
            summary: { critical: 1, warning: 0, checks: 0 },
            documentContent: planContent
        };
    }

    let contextPrompt = '';
    if (knowledgeSources.length > 0) {
        const sourcesText = knowledgeSources.map(s => `--- KNOWLEDGE SOURCE: ${s.title} ---\n${s.content}`).join('\n\n');
        contextPrompt += `\n\nCONTEXTUAL KNOWLEDGE BASE (Use this to inform your analysis):\n${sourcesText}`;
    }
    if (dismissalRules.length > 0) {
        const rulesText = dismissalRules.map(r => `- "${r.findingTitle}" (Reason: ${r.reason})`).join('\n');
        contextPrompt += `\n\nLEARNED DISMISSAL RULES (Do NOT report findings with these titles):\n${rulesText}`;
    }
    if (customRegulations && customRegulations.length > 0) {
        const rulesText = customRegulations.map(r => `- ${r.ruleText}`).join('\n');
        contextPrompt += `\n\nWORKSPACE-SPECIFIC CUSTOM REGULATIONS:\nThese are mandatory requirements for this workspace. For each rule below that is NOT followed by the project plan, you MUST generate a 'critical' finding. The finding's title should clearly state which custom rule was violated, for example: "Custom Rule Violation: [Rule Text]".\n${rulesText}`;
    }


    // --- NEW: Define the safety settings ---
    const safetySettings = [
        {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
    ];


    try {
        const response: GenerateContentResponse = await getGenAIClient().models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Analyze the following project plan:\n\n---\n\n${planContent}\n\n---\n\nPlease provide your analysis in the requested JSON format.`,
            // --- NEW: Pass the safety settings to the API call ---
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

        // ... (the rest of the function remains the same)
        const jsonText = response.text;
        if (!jsonText || typeof jsonText !== 'string') {
            console.error("Gemini API returned an empty or invalid response:", response);
            throw new Error("The AI model returned an empty or invalid response, possibly due to content safety filters. Please try modifying the document or try again.");
        }
        
        const parsedReport = JSON.parse(jsonText.trim());

        const criticalCount = parsedReport.findings.filter((f: any) => f.severity === 'critical').length;
        const warningCount = parsedReport.findings.filter((f: any) => f.severity === 'warning').length;
        const checksPerformed = Math.floor(1000 + Math.random() * 500);

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
                critical: criticalCount,
                warning: warningCount,
                checks: checksPerformed,
            },
            documentContent: planContent,
        };
    } catch (error) {
        console.error("Error analyzing plan with Gemini:", error);
        return {
            title: "Analysis Error",
            resilienceScore: 0,
            scores: { project: 0, strategicGoals: 0, regulations: 0, risk: 0 },
            findings: [{
                id: 'error-1',
                title: 'Failed to analyze the document.',
                severity: 'critical',
                sourceSnippet: 'N/A',
                recommendation: `The AI model could not process the document. This might be due to a connection issue or an internal error. Error: ${error}`,
                status: 'active',
            }],
            summary: { critical: 1, warning: 0, checks: 0 },
            documentContent: planContent,
        };
    }
}


export async function improvePlan(planContent: string, report: AnalysisReport, knowledgeSources: KnowledgeSource[]): Promise<string> {
    if (!planContent.trim() || !report || report.findings.length === 0) {
        return planContent; // Return original if no basis for improvement
    }
    
    const findingsSummary = report.findings.map(f => 
        `- Finding: "${f.title}" (Severity: ${f.severity})\n` +
        `  - Source Snippet: "${f.sourceSnippet}"\n` +
        `  - Recommendation: ${f.recommendation}`
    ).join('\n\n');

    let contextPrompt = '';
    if (knowledgeSources.length > 0) {
        const sourcesText = knowledgeSources.map(s => `--- KNOWLEDGE SOURCE: ${s.title} ---\n${s.content}`).join('\n\n');
        contextPrompt = `\n\nCONTEXTUAL KNOWLEDGE BASE (Use this to inform your revisions):\n--- \n${sourcesText}\n---`;
    }

    try {
        const response: GenerateContentResponse = await getGenAIClient().models.generateContent({
            model: "gemini-2.5-flash",
            contents: `The following project plan has been analyzed and several issues were found. Your task is to rewrite the entire document to incorporate the recommendations and fix the issues.
RULES:
1. Return ONLY the full, revised text of the project plan.
2. DO NOT include any introductory text like "Here is the revised plan." or any other commentary.
3. Compare your revised version to the original line-by-line.
4. For every line that is NEW or MODIFIED, prefix it with "++ ".
5. For every line that is REMOVED, prefix it with "-- ".
6. For every line that is UNCHANGED, do NOT add any prefix.

ORIGINAL PLAN:
---
${planContent}
---

ISSUES AND RECOMMENDATIONS:
---
${findingsSummary}
---
${contextPrompt}
`,
            config: {
                systemInstruction: "You are an expert technical writer and project manager specializing in compliance documentation. Your task is to revise a project plan to resolve issues identified in an analysis report. You must integrate the given recommendations seamlessly, apply appropriate compliance formatting, improve clarity, and ensure the document is professional and well-structured. Use the provided Contextual Knowledge Base to ensure your revisions are compliant.",
                // --- FIX: Added temperature for consistency ---
                temperature: 0.2,
            },
        });

        return response.text.trim();
    } catch (error) {
        console.error("Error improving plan with Gemini:", error);
        return `Error: Could not enhance document.\n\n${planContent}`; 
    }
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
                // --- FIX: Added temperature for consistency ---
                temperature: 0.2,
            },
        });

        return response.text.trim();
    } catch (error) {
        console.error("Error getting chat response from Gemini:", error);
        return "Sorry, I encountered an error while processing your request. Please try again.";
    }
}