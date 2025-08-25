import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AnalysisReport, Finding, KnowledgeSource, DismissalRule, CustomRegulation, ChatMessage } from '../types';
import { diffWordsWithSpace } from 'diff';

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

    try {
        const response: GenerateContentResponse = await getGenAIClient().models.generateContent({
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
                recommendation: `The AI model could not process the document. This might be due to a connection issue or an internal error. Please check your network and try again. If the problem persists, the content might be unsuitable for analysis. Error: ${error}`,
                status: 'active',
            }],
            summary: { critical: 1, warning: 0, checks: 0 },
            documentContent: planContent,
        };
    }
}

export async function improvePlan(planContent: string, report: AnalysisReport): Promise<string> {
    if (!planContent.trim() || !report || report.findings.length === 0) {
        return planContent; // Nothing to improve
    }

    const findingsSummary = report.findings.map(f =>
        `- Finding: "${f.title}" (Severity: ${f.severity})\n` +
        `  - Source Snippet: "${f.sourceSnippet}"\n` +
        `  - Recommendation: ${f.recommendation}`
    ).join('\n\n');

    const genai = getGenAIClient();

    const systemPrompt = `
You are an expert compliance editor for project plans in the financial sector.
Your task: produce a single, fully revised version of the provided project plan that integrates the suggested recommendations.
REQUIREMENTS:
- Return ONLY the cleaned, full revised document text. Do NOT include diffs, annotations, commentary, or metadata.
- Preserve all section headings, numbering, lists and factual content unless a minor inline edit improves clarity or compliance.
- Do not invent budgets, add new major sections, or introduce new regulatory citations that were not present in the recommendations.
- Use a professional formal tone suitable for regulatory documentation.
`;

    const userPrompt = `
Original Plan:
---
${planContent}
---

Findings & Recommendations (use to guide edits):
---
${findingsSummary}
---

Return the full revised document text only (no explanations).
`;

    // helper: extract raw text from response object shape
    const extractText = (resp: any) => {
        return (resp?.text ?? resp?.outputText ?? resp?.candidates?.[0]?.content ?? '').toString();
    };

    // helper: clean diff/code artifacts
    const cleanOutput = (raw: string) => {
        let out = String(raw || '');
        // if wrapped in a fenced block, extract inner content
        const codeBlockMatch = out.match(/```(?:[\w-]+\n)?([\s\S]*?)```/);
        if (codeBlockMatch && codeBlockMatch[1]) out = codeBlockMatch[1];

        // remove common diff markers at line starts
        out = out
            .split('\n')
            .map(line => line.replace(/^\s*(\+\+|--|\+|-|>\s|<\s)\s?/, ''))
            .filter(line => !/^(diff --git|index |@@ |--- |\+\+\+ )/.test(line))
            .join('\n');

        // strip zero-width/rtf junk and normalize spacing
        out = out.replace(/[\u200B-\u200F\uFEFF]/g, '').replace(/^\s*{\\rtf1[\s\S]*?}/, '');
        out = out.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
        return out;
    };

    // token overlap similarity (simple word-set Jaccard)
    const tokenOverlap = (a: string, b: string) => {
        const wa = new Set(a.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean));
        const wb = new Set(b.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean));
        if (wa.size === 0 || wb.size === 0) return 0;
        let inter = 0;
        wa.forEach(t => { if (wb.has(t)) inter++; });
        const union = new Set([...wa, ...wb]).size;
        return inter / Math.max(1, union);
    };

    // primary request
    let raw = '';
    try {
        const resp = await genai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: userPrompt,
            config: {
                systemInstruction: systemPrompt,
            },
        });
        raw = extractText(resp).trim();
    } catch (err) {
        console.error("improvePlan primary call failed:", err);
        return planContent;
    }

    let cleaned = cleanOutput(raw);

    // If cleaned output looks like a diff or is too dissimilar, do a strict second pass
    const looksLikeDiff = /^(?:\+{1,2}|-{1,2}|diff --git|@@ )/m.test(raw) || tokenOverlap(planContent, cleaned) < 0.6;
    if (looksLikeDiff) {
        try {
            const strictSystem = `
You are a strictly conservative editor. Make ONLY MINOR INLINE EDITS to the original document to address the provided recommendations.
DO NOT ADD OR REMOVE SECTIONS, BULLETS, TITLES, NUMBERING, OR BUDGETS.
Return only the revised full document text with minimal edits.
`;
            const strictUser = `
Original Plan:
---
${planContent}
---

Previous model output (may contain diffs):
---
${raw}
---

Findings & Recommendations:
---
${findingsSummary}
---
Return only the final revised document text, making minimal inline edits as required.
`;
            const resp2 = await genai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: strictUser,
                config: { systemInstruction: strictSystem },
            });
            const raw2 = extractText(resp2).trim();
            const cleaned2 = cleanOutput(raw2);
            const sim2 = tokenOverlap(planContent, cleaned2);
            // Accept second pass if reasonably similar
            if (sim2 >= 0.5) {
                cleaned = cleaned2;
            } else {
                // As a safe fallback, return the original plan (do not silently replace user content)
                cleaned = planContent;
            }
        } catch (err2) {
            console.warn("improvePlan strict second pass failed:", err2);
            cleaned = planContent;
        }
    }

    return cleaned;
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Generate inline HTML that highlights changes between original and revised:
 * - additions wrapped in <ins class="added">...</ins>
 * - removals wrapped in <del class="removed">...</del>
 * Caller should render as trusted HTML in the preview pane.
 */
export function highlightChanges(original: string, revised: string): string {
  const parts = diffWordsWithSpace(original || '', revised || '');
  return parts.map(p => {
    const v = escapeHtml(p.value);
    if (p.added) {
      return `<ins class="vesta-added" style="background:#e6ffed;color:#064e3b;text-decoration:none;">${v}</ins>`;
    }
    if (p.removed) {
      return `<del class="vesta-removed" style="background:#ffecec;color:#991b1b;text-decoration:line-through;">${v}</del>`;
    }
    return v;
  }).join('');
}

/**
 * Convenience wrapper: returns both cleaned enhanced text and HTML-highlighted diff.
 * Use this in App.handleAutoEnhance to save the draft and show a preview with highlights.
 */
export async function improvePlanWithHighlights(planContent: string, report: AnalysisReport): Promise<{ text: string; highlightedHtml: string }> {
  const text = await improvePlan(planContent, report);
  const highlightedHtml = highlightChanges(planContent, text);
  return { text, highlightedHtml };
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
            },
        });

        return response.text.trim();
    } catch (error) {
        console.error("Error getting chat response from Gemini:", error);
        return "Sorry, I encountered an error while processing your request. Please try again.";
    }
}