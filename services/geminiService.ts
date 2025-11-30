import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AIResponse, ImageSize, Language, AIProvider } from "../types";

const GEMINI_STORY_MODEL = "gemini-3-pro-preview";
const GEMINI_IMAGE_MODEL = "gemini-3-pro-image-preview";
const MISTRAL_MODEL = "mistral-large-latest";
const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";

// Define the schema for the structured JSON response
const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    narrative: {
      type: Type.STRING,
      description: "The next segment of the story. Engaging, descriptive, and reactive to user choice.",
    },
    visualDescription: {
      type: Type.STRING,
      description: "A concise visual description of the current scene for an image generator. Focus on environment, lighting, and key characters. IMPORTANT: If the protagonist is visible, ensure their appearance matches the established character description.",
    },
    inventory: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "The current list of items in the player's inventory. Update based on story events (add/remove).",
    },
    currentQuest: {
      type: Type.STRING,
      description: "The current main objective or quest name.",
    },
    locationName: {
      type: Type.STRING,
      description: "The specific name of the player's current location (e.g., 'The Rusty Anchor Inn', 'Darkwood Forest', 'King's Throne Room').",
    },
    suggestedActions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "3 short, punchy suggested actions the user might take.",
    },
  },
  required: ["narrative", "visualDescription", "inventory", "currentQuest", "locationName", "suggestedActions"],
};

// Helper function for delays
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Wrapper for API calls with Robust Retry Logic
async function runWithRetry<T>(operation: () => Promise<T>, retries = 5, defaultDelay = 4000): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    const errorCode = error?.status || error?.code;
    const errorMessage = error?.message || JSON.stringify(error);
    
    // Check for Quota (429) or Server Overload (503)
    const isQuotaError = 
      errorCode === 429 || 
      errorCode === 503 || 
      errorMessage.includes('429') || 
      errorMessage.includes('Quota') ||
      errorMessage.includes('RESOURCE_EXHAUSTED') ||
      errorMessage.includes('Overloaded');

    if (retries > 0 && isQuotaError) {
      let delay = defaultDelay;
      
      // Try to parse specific retry delay from error message (e.g., "Please retry in 16.68s")
      const retryMatch = errorMessage.match(/retry in ([\d\.]+)s/);
      if (retryMatch && retryMatch[1]) {
        // Parse seconds, convert to ms, add 2s buffer for safety
        delay = Math.ceil(parseFloat(retryMatch[1]) * 1000) + 2000;
      } else {
        // Exponential backoff if no specific time is given
        delay = defaultDelay * 2; 
      }
      
      console.warn(`API Rate Limit/Quota hit. Pausing for ${delay}ms before retry. Attempts remaining: ${retries}`);
      await wait(delay);
      return runWithRetry(operation, retries - 1, delay);
    }
    throw error;
  }
}

// --- GEMINI IMPLEMENTATION ---

const generateStoryGemini = async (
  input: string,
  history: { role: string; parts: { text: string }[] }[],
  systemInstruction: string,
): Promise<AIResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const responseText = await runWithRetry(async () => {
    const chat = ai.chats.create({
      model: GEMINI_STORY_MODEL,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
      history: history,
    });

    const result = await chat.sendMessage({ message: input });
    return result.text;
  });

  if (!responseText) throw new Error("No response from AI");
  return JSON.parse(responseText) as AIResponse;
};

// --- MISTRAL IMPLEMENTATION ---

const generateStoryMistral = async (
  input: string,
  history: { role: string; parts: { text: string }[] }[],
  systemInstruction: string,
  apiKey: string
): Promise<AIResponse> => {
  
  // Convert Gemini history format to Mistral/OpenAI format
  const messages = [
    { role: "system", content: systemInstruction + `\n\nIMPORTANT: You must output a valid JSON object matching this schema: ${JSON.stringify(responseSchema)}` },
    ...history.map(h => ({ role: h.role === 'model' ? 'assistant' : 'user', content: h.parts[0].text })),
    { role: "user", content: input }
  ];

  const responseData = await runWithRetry(async () => {
    const res = await fetch(MISTRAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: MISTRAL_MODEL,
        messages: messages,
        response_format: { type: "json_object" },
        temperature: 0.7
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Mistral API Error: ${res.status} - ${JSON.stringify(err)}`);
    }

    return await res.json();
  });

  const content = responseData.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from Mistral");
  
  return JSON.parse(content) as AIResponse;
};

// --- MAIN EXPORT ---

export const generateStorySegment = async (
  input: string,
  history: { role: string; parts: { text: string }[] }[],
  currentInventory: string[],
  currentQuest: string,
  language: Language,
  provider: AIProvider = 'gemini',
  mistralKey?: string
): Promise<AIResponse> => {
  try {
    const langInstruction = language === 'ru' 
      ? "OUTPUT RULE: The 'narrative', 'inventory', 'currentQuest', 'locationName', and 'suggestedActions' properties MUST be in Russian. The 'visualDescription' MUST be in English."
      : "OUTPUT RULE: All content must be in English.";

    const systemInstruction = `
      You are an advanced Dungeon Master for an immersive, text-based Role Playing Game.
      Your goal is to weave an infinite, evolving story based on the user's choices.
      
      RULES:
      1.  Output valid JSON matching the schema.
      2.  Track the 'inventory' and 'currentQuest' meticulously. If the user picks up an item, add it. If they use/lose it, remove it. Update the quest as the plot evolves.
      3.  Keep the 'narrative' engaging, roughly 100-200 words per turn.
      4.  The 'visualDescription' must be suitable for an art generator. Focus on the physical scene and the protagonist (if present).
      5.  Track the 'locationName'. Update it whenever the player moves to a distinct new area.
      6.  Current Inventory: ${JSON.stringify(currentInventory)}.
      7.  Current Quest: "${currentQuest}".
      8.  If this is the first turn, propose a starting quest, location, and empty inventory (or basic starter gear).
      9.  ${langInstruction}
    `;

    if (provider === 'mistral') {
      if (!mistralKey) throw new Error("Mistral API Key is required.");
      return await generateStoryMistral(input, history, systemInstruction, mistralKey);
    } else {
      return await generateStoryGemini(input, history, systemInstruction);
    }

  } catch (error) {
    console.error("Story Generation Error:", error);
    throw error;
  }
};

export const generateSceneImage = async (
  visualDescription: string,
  size: ImageSize
): Promise<string | undefined> => {
  try {
    // We always use Gemini for images for now, as it's the integrated multimodal provider.
    // If the user uses Mistral for text, we still rely on the env API_KEY for Gemini images.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Enforce consistent art style
    const stylePrefix = "Digital fantasy art, oil painting style, highly detailed, dramatic lighting, cinematic composition. ";
    const prompt = stylePrefix + visualDescription;

    // Helper to abstract the generation call for reuse
    const generateImageCall = async (model: string, config: any) => {
        const response = await ai.models.generateContent({
            model: model,
            contents: {
                parts: [{ text: prompt }],
            },
            config: config,
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
        return undefined;
    };

    try {
        // Attempt 1: Try High Quality Model
        return await runWithRetry(async () => {
            return await generateImageCall(GEMINI_IMAGE_MODEL, {
                imageConfig: {
                    imageSize: size, 
                    aspectRatio: "16:9" 
                }
            });
        });
    } catch (error: any) {
        // Check specifically for 403 Permission Denied
        const isPermissionError = error.status === 403 || error.code === 403 || (error.message && error.message.includes('403'));
        
        if (isPermissionError) {
            console.warn("403 Permission Denied on High-Res Model. Falling back to Standard Model.");
            
            // Attempt 2: Fallback to Standard Model (gemini-2.5-flash-image)
            return await runWithRetry(async () => {
                return await generateImageCall("gemini-2.5-flash-image", {
                    imageConfig: {
                         aspectRatio: "16:9" 
                    }
                });
            });
        }
        throw error;
    }
    
  } catch (error) {
    console.error("Image Generation Error:", error);
    // Return undefined on error so the story can continue even if image fails
    return undefined;
  }
};