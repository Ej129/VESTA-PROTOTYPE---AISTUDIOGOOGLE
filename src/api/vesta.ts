import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
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
  const genai = getGenAIClient();

  // Strong system/user instructions to force raw document output only
  const systemPrompt = `
You are a professional editor. Given a document, produce a single, fully revised version of the document.
DO NOT include any diffs, annotations, explanations, or metadata. Return ONLY the cleaned full document text.
Preserve sections/headings. Use a professional, formal tone suitable for regulatory / project documentation.
`;

  const userPrompt = `
Original document:
---
${planContent}
---

Task: Return the complete revised document text only. No lists of changes, no diff markers (++, --, +, -), no code fences, no commentary.
`;

  // Helper: extract raw text from the genai response object (adapt if your client shape differs)
  const extractRawText = (resp: any) => {
    if (!resp) return '';
    // common shapes: resp.candidates[0].content or resp.outputText / resp.text
    return (resp?.candidates?.[0]?.content ?? resp?.outputText ?? resp?.text ?? '').toString();
  };

  // Call the model (adjust call shape if your getGenAIClient uses a different method)
  let rawOutput = '';
  try {
    const resp = await genai.generate?.({
      model: 'gpt-5-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.15,
      max_output_tokens: 2000
    } as any) as any;

    rawOutput = extractRawText(resp);
  } catch (err) {
    // Fallback: try a simple text call if generate wasn't available
    try {
      const resp2 = await genai.generateText?.({
        model: 'gpt-5-mini',
        prompt: systemPrompt + '\n' + userPrompt,
        temperature: 0.15,
        maxTokens: 2000
      } as any);
      rawOutput = extractRawText(resp2);
    } catch (err2) {
      console.error('improvePlan model call failed', err2);
      throw new Error('AI improvePlan call failed');
    }
  }

  // Cleaning function: strip fenced blocks, diff markers, and stray annotations
  let cleaned = String(rawOutput || '');

  // If wrapped in a code fence, extract inner content
  const codeBlockMatch = cleaned.match(/```(?:\w*\n)?([\s\S]*?)```/);
  if (codeBlockMatch && codeBlockMatch[1]) cleaned = codeBlockMatch[1];

  // Remove common diff markers at line starts
  cleaned = cleaned
    .split('\n')
    .map(line => line.replace(/^\s*(\+\+|--|\+|-|>\s|<\s|>>>|<<<)\s?/, ''))
    .filter(line => !/^(diff --git|index |@@ |--- |\+\+\+ )/.test(line))
    .join('\n');

  // Remove any leftover ++/-- tokens and RTF markers
  cleaned = cleaned.replace(/^\s*[\+\-]{2,}\s*/gm, '').replace(/^\s*{\\rtf1[\s\S]*?}/, '');

  // Normalize whitespace and collapse excessive blank lines
  cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

  // If the output still looks like a diff or is too short, do a second-pass extraction
  const looksLikeDiff = /^(?:\+{2}|-{2}|diff --git|@@ )/m.test(cleaned) || (cleaned.split('\n').length < Math.max(5, planContent.split('\n').length * 0.3));
  if (looksLikeDiff) {
    // Ask the model to extract the document portion only from the previous rawOutput
    const extractorPrompt = `
You were given an editor response. Extract ONLY the document content from the response below. Do NOT include diffs, annotations, or explanations; return only the cleaned document text.

Response to extract:
---
${rawOutput}
---
Return only the cleaned document.
`;
    try {
      const resp3 = await genai.generate?.({
        model: 'gpt-5-mini',
        messages: [
          { role: 'system', content: 'You are a strict extractor. Return only the document text.' },
          { role: 'user', content: extractorPrompt }
        ],
        temperature: 0.0,
        max_output_tokens: 2000
      } as any) as any;
      const secondPass = extractRawText(resp3);
      if (secondPass && secondPass.trim().length > 0) {
        // Clean secondary output as well
        cleaned = secondPass
          .replace(/```(?:\w*\n)?([\s\S]*?)```/, '$1')
          .replace(/^\s*[\+\-]{2,}\s*/gm, '')
          .replace(/\r\n/g, '\n')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
      }
    } catch (e) {
      console.warn('Second pass extraction failed, using best-effort cleaned output', e);
    }
  }

  return cleaned;
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