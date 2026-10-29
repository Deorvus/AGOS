import { GoogleGenAI } from '@google/genai';

export async function analyzeFloodReport(prompt: string): Promise<string> {
  const apiKey = (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) || import.meta.env.VITE_GEMINI_API_KEY || '';
  if (!apiKey) {
    return 'Gemini API key is not configured.';
  }
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || 'No response generated.';
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw error;
  }
}