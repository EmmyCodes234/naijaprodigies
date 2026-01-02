import { GoogleGenAI } from "@google/genai";

const apiKey = (typeof process !== 'undefined' && process.env && process.env.API_KEY) || '';

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey });

export const getScrabbleAdvice = async (letters: string): Promise<string> => {
  if (!apiKey) {
    console.warn("API Key not found. Word Wizard will not function.");
    throw new Error("API Key not found. Please set your API Key to use the Word Wizard.");
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `I have these Scrabble letters: "${letters}". 
      What is the best high-scoring word I can make? 
      Provide the word, the score (approximate), and a very brief definition.
      Keep it short and punchy. Format: Word - Score - Definition.`,
      config: {
        systemInstruction: "You are a Scrabble Grandmaster and coach. You are helpful, concise, and enthusiastic.",
        temperature: 0.7,
      }
    });

    return response.text || "Could not generate a word at this time.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("The Word Wizard is currently napping. Try again later.");
  }
};

export const analyzePost = async (postContent: string, hasImage: boolean): Promise<string> => {
  if (!apiKey) {
    console.warn("API Key missing. AI Judge will not function.");
    return "The Grandmaster is unavailable (API Key missing).";
  }

  try {
    const prompt = `
      Analyze this social media post from a Scrabble community member: "${postContent}".
      ${hasImage ? "The post includes an image of a Scrabble board or event." : ""}
      
      Act as "The Grandmaster Judge". Provide a witty, slightly critical but encouraging comment (max 2 sentences).
      If they mention a specific word, comment on its obscurity or strategic value.
      If they are boasting, bring them down to earth with humor.
      If they are struggling, offer a philosophical Scrabble quote.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a witty, all-knowing Scrabble sage.",
        temperature: 0.8,
      }
    });

    return response.text || "Interesting play...";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "The Grandmaster is currently studying the dictionary. Try again later.";
  }
};