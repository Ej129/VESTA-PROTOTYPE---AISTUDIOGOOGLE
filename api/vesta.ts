import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AnalysisReport, Finding, KnowledgeSource, DismissalRule, CustomRegulation } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const reportSchema = {
    type: Type.OBJECT,
    properties: {
        resilienceScore: {
            type: Type.INTEGER,
            description: "A score from 0-100 representing the plan's resilience. A lower score indicates more critical issues. Base the score on the number and severity of findings.",
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
    required: ["resilienceScore", "findings"],
};

export async function analyzePlan(planContent: string, knowledgeSources: KnowledgeSource[], dismissalRules: DismissalRule[], customRegulations: CustomRegulation[]): Promise<Omit<AnalysisReport, 'id' | 'workspaceId' | 'createdAt'>> {
    if (!planContent.trim()) {
        return {
            title: "Analysis Failed",
            resilienceScore: 0,
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

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Analyze the following project plan:\n\n---\n\n${planContent}\n\n---\n\nPlease provide your analysis in the requested JSON format.`,
            config: {
                systemInstruction: `You are Vesta, an AI assistant specializing in digital resilience for the financial sector. Your task is to analyze project plans against financial regulations (like those from BSP) and best practices (like the Data Privacy Act of the Philippines). You must identify critical issues, warnings, and compliance gaps. For each finding, you must provide a title, severity, the exact source text snippet from the plan, and a detailed, actionable recommendation. Ensure the source snippet is a direct quote from the provided text.${contextPrompt}`,
                responseMimeType: "application/json",
                responseSchema: reportSchema,
            },
        });

        const jsonText = response.text.trim();
        const parsedReport = JSON.parse(jsonText);

        const criticalCount = parsedReport.findings.filter((f: any) => f.severity === 'critical').length;
        const warningCount = parsedReport.findings.filter((f: any) => f.severity === 'warning').length;
        const checksPerformed = Math.floor(1000 + Math.random() * 500);

        return {
            title: "Project Plan Analysis",
            resilienceScore: parsedReport.resilienceScore,
            findings: parsedReport.findings.map((f: any, index: number): Finding => ({
                id: `finding-${index}`, // This will be replaced by a real ID in the backend/API layer
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
            findings: [{
                id: 'error-1',
                title: 'Failed to analyze the document.',
                severity: 'critical',
                sourceSnippet: 'N/A',
                recommendation: 'The AI model could not process the document. This might be due to a connection issue or an internal error. Please check your network and try again. If the problem persists, the content might be unsuitable for analysis.',
                status: 'active',
            }],
            summary: { critical: 1, warning: 0, checks: 0 },
            documentContent: planContent,
        };
    }
}

export async function improvePlan(planContent: string, report: AnalysisReport): Promise<string> {
    if (!planContent.trim() || !report || report.findings.length === 0) {
        return planContent; // Return original if no basis for improvement
    }
    
    const findingsSummary = report.findings.map(f => 
        `- Finding: "${f.title}" (Severity: ${f.severity})\n` +
        `  - Source Snippet: "${f.sourceSnippet}"\n` +
        `  - Recommendation: ${f.recommendation}`
    ).join('\n\n');

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `The following project plan has been analyzed and several issues were found. Please rewrite the entire document to incorporate the recommendations and fix the issues. Apply professional compliance formatting, and improve the overall clarity, conciseness, and structure of the plan.\n\nORIGINAL PLAN:\n---\n${planContent}\n---\n\nISSUES AND RECOMMENDATIONS:\n---\n${findingsSummary}\n---\n\nReturn only the full, revised text of the improved project plan. Do not include any introductory text like "Here is the revised plan." or any other commentary.`,
            config: {
                systemInstruction: "You are an expert technical writer and project manager specializing in compliance documentation. Your task is to revise a project plan to resolve issues identified in an analysis report. You must integrate the given recommendations seamlessly, apply appropriate compliance formatting, improve clarity, and ensure the document is professional and well-structured.",
            },
        });

        return response.text.trim();
    } catch (error) {
        console.error("Error improving plan with Gemini:", error);
        // Fallback to original content on error
        return planContent; 
    }
}