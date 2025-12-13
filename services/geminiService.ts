
import { GoogleGenAI, Type } from "@google/genai";
import { ItineraryItem } from "../types";

// Helper to safely get API key without crashing in browser
const getAiClient = () => {
  const apiKey = (typeof process !== 'undefined' && process.env && process.env.API_KEY) ? process.env.API_KEY : '';
  if (!apiKey) {
    console.warn("Gemini API Key is missing. Please set process.env.API_KEY.");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateItinerarySuggestions = async (prompt: string): Promise<ItineraryItem[]> => {
  try {
    const ai = getAiClient();
    
    const fullPrompt = `You are a professional travel planner for Shanghai.
    Create a list of 3-5 itinerary items based on this request: "${prompt}". 
    Important:
    1. Output strictly in Traditional Chinese (繁體中文).
    2. Focus on specific, real locations in Shanghai.
    3. Include estimated rating (3.5-5.0), price level ($, $$, $$$), and typical opening hours.
    4. Provide approximate Latitude and Longitude for the location (Very Important).
    5. Return strict JSON format.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: fullPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              time: { type: Type.STRING, description: "Suggested time in HH:MM format (24h)" },
              location: { type: Type.STRING, description: "Name of the place in Traditional Chinese" },
              description: { type: Type.STRING, description: "Short activity description in Traditional Chinese" },
              type: { type: Type.STRING, enum: ['food', 'sightseeing', 'transport', 'shopping', 'activity'] },
              rating: { type: Type.NUMBER, description: "Rating from 1.0 to 5.0" },
              price: { type: Type.STRING, description: "Price level: Free, $, $$, $$$" },
              openTime: { type: Type.STRING, description: "Opening hours, e.g. 09:00-22:00" },
              lat: { type: Type.NUMBER, description: "Latitude" },
              lng: { type: Type.NUMBER, description: "Longitude" },
            },
            required: ["time", "location", "description", "type", "lat", "lng"],
          },
        },
      },
    });

    const text = response.text;
    if (!text) return [];
    
    const items = JSON.parse(text);
    
    // Enrich with IDs
    return items.map((item: any, index: number) => ({
      ...item,
      id: `ai-${Date.now()}-${index}`,
      // Fallback random offset if AI fails to give coords (unlikely with schema)
      lat: item.lat || 31.2304 + (Math.random() - 0.5) * 0.05, 
      lng: item.lng || 121.4737 + (Math.random() - 0.5) * 0.05,
    }));

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const suggestIconForCategory = async (category: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const prompt = `Return a single FontAwesome 6 Free Solid icon class name (e.g., 'fa-camera') that best represents this travel category: "${category}". 
    Rules:
    1. Return ONLY the class name string (e.g. 'fa-utensils'). Do not include the 'fa-solid' prefix.
    2. Do NOT use Pro icons.
    3. Examples: "food" -> "fa-utensils", "park" -> "fa-tree", "beach" -> "fa-umbrella-beach", "amusement park" -> "fa-ticket".
    4. If unsure, return "fa-tag".
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    
    const icon = response.text?.trim() || 'fa-tag';
    return icon.replace('fa-solid ', '').replace('fas ', '');
  } catch (error) {
    console.error("Icon Gen Error:", error);
    return 'fa-tag';
  }
};
