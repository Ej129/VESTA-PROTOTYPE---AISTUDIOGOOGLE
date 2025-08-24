// netlify/functions/enhance.ts

import { Handler, HandlerEvent } from "@netlify/functions";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, Type as GoogleGenType } from "@google/genai";

// Securely access the API key from Netlify's environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { planContent, report, knowledgeSources } = JSON.parse(event.body || "{}");

    if (!planContent || !report) {
        return { statusCode: 400, body: 'Missing required payload data.' };
    }
    
    // --- This is the same logic from your vesta.ts, now running securely on the server ---
    const findingsSummary = report.findings.map((f: any) => `- Finding: "${f.title}"...\n  - Recommendation: ${f.recommendation}`).join('\n\n');
    let contextPrompt = '';
    if (knowledgeSources && knowledgeSources.length > 0) {
        const sourcesText = knowledgeSources.map((s: any) => `--- KNOWLEDGE SOURCE: ${s.title} ---\n${s.content}`).join('\n\n');
        contextPrompt = `\n\nCONTEXTUAL KNOWLEDGE BASE:\n--- \n${sourcesText}\n---`;
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash", // Use a recent model name
      // Your full system instruction from vesta.ts
      systemInstruction: `You are Vesta, an AI assistant specializing in digital resilience for the financial sector. Your task is to analyze project plans against financial regulations (like those from BSP) and best practices (like the Data Privacy Act of the Philippines). Your analysis must be meticulous and structured. Follow these steps:
1. Read the entire document and all contextual knowledge to fully understand the project's goals and constraints.
2. For each potential issue you identify, you MUST find the single, most relevant and specific sentence or phrase from the original document to use as the \`sourceSnippet\`. Avoid using generic section headers as snippets for multiple, unrelated findings. The snippet must be an exact, verbatim quote.
3. Provide a concise, impactful \`title\` for the finding that clearly summarizes the core problem.
4. Assign a \`severity\` of 'critical' for major compliance/security gaps, or 'warning' for recommendations and best-practice improvements.
5. Write a detailed, actionable \`recommendation\` to fix the issue, citing specific regulations from the knowledge base where applicable.
6. Critically evaluate ALL aspects of the plan, including its stated Objectives, Scope, Timeline, Budget, and Risk Management sections, for potential weaknesses, gaps, or inconsistencies.`,, 
    });

    const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: `ORIGINAL PLAN:\n---\n${planContent}\n---\n\nISSUES & RECOMMENDATIONS:\n---\n${findingsSummary}\n---${contextPrompt}` }] }],
        // Define your generation config including the schema
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: { /* Paste your 'newSchema' object here */ },
            temperature: 0.2,
        },
    });

    const responseText = result.response.text();
    if (!responseText) {
        throw new Error("The AI model returned an empty response during enhancement.");
    }
    
    return {
      statusCode: 200,
      body: responseText, // The body is already a JSON string from the AI
    };
    
  } catch (error) {
    console.error("Error in enhance function:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "An error occurred during enhancement.", details: (error as Error).message }),
    };
  }
};

export { handler };