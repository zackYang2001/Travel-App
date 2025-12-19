
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
    
    const fullPrompt = `You are a professional travel planner.
    Create a list of 3-5 itinerary items based on this request: "${prompt}". 
    Important:
    1. Output strictly in Traditional Chinese (繁體中文).
    2. Include estimated rating (3.5-5.0), price level ($, $$, $$$), and typical opening hours.
    3. Provide approximate Latitude and Longitude for the location.
    4. Return strict JSON format.`;

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
              time: { type: Type.STRING },
              location: { type: Type.STRING },
              description: { type: Type.STRING },
              type: { type: Type.STRING },
              rating: { type: Type.NUMBER },
              price: { type: Type.STRING },
              openTime: { type: Type.STRING },
              lat: { type: Type.NUMBER },
              lng: { type: Type.NUMBER },
            },
            required: ["time", "location", "description", "type", "lat", "lng"],
          },
        },
      },
    });

    const text = response.text;
    if (!text) return [];
    const items = JSON.parse(text);
    
    return items.map((item: any, index: number) => ({
      ...item,
      id: `ai-${Date.now()}-${index}`,
    }));

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const suggestIconForCategory = async (category: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const prompt = `Return a single FontAwesome 6 Free Solid icon class name for: "${category}". Rules: Only class name (e.g. 'fa-utensils').`;
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    return response.text?.trim() || 'fa-tag';
  } catch (error) {
    return 'fa-tag';
  }
};

export interface PlaceDetails {
  lat: number;
  lng: number;
  rating?: number;
  openTime?: string;
  priceLevel?: string;
  description?: string;
}

export const getPlaceDetails = async (location: string, cityContext?: string): Promise<PlaceDetails | null> => {
  try {
    const ai = getAiClient();
    const prompt = `Find details for: "${location}"${cityContext ? ` in ${cityContext}` : ''}.
    Return JSON: { "lat": number, "lng": number, "rating": number (1-5), "openTime": string (e.g. 09:00-21:00), "priceLevel": string (Free, $, $$, $$$), "description": string (short summary) }.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            lat: { type: Type.NUMBER },
            lng: { type: Type.NUMBER },
            rating: { type: Type.NUMBER },
            openTime: { type: Type.STRING },
            priceLevel: { type: Type.STRING },
            description: { type: Type.STRING },
          },
          required: ["lat", "lng"],
        },
      },
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.error("Place Details Gen Error:", error);
    return null;
  }
};
