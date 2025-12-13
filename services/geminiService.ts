import { GoogleGenAI, Type } from "@google/genai";
import { ItineraryItem } from "../types";

// ------------------------------------------------------------------
// 設定 API Key
// ------------------------------------------------------------------
const apiKey = process.env.GEMINI_API_KEY || "demo-key";

// 初始化 AI (全域共用一個實例)
const ai = new GoogleGenAI({ apiKey });

/**
 * 根據使用者提示生成行程建議
 */
export const generateItinerarySuggestions = async (prompt: string): Promise<ItineraryItem[]> => {
  try {
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
    
    // Enrich with IDs and fallback coords
    return items.map((item: any, index: number) => ({
      ...item,
      id: `ai-${Date.now()}-${index}`,
      lat: item.lat || 31.2304 + (Math.random() - 0.5) * 0.05, 
      lng: item.lng || 121.4737 + (Math.random() - 0.5) * 0.05,
    }));

  } catch (error) {
    console.error("Gemini API Error:", error);
    return []; 
  }
};

/**
 * 根據分類建議 FontAwesome Icon
 */
export const suggestIconForCategory = async (category: string): Promise<string> => {
  try {
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

/**
 * 取得特定地點的經緯度 (新增功能)
 */
export const getPlaceCoordinates = async (location: string, cityContext?: string): Promise<{ lat: number; lng: number } | null> => {
  try {
    // 直接使用全域的 ai 實例，不需要 getAiClient()
    const prompt = `Find the approximate Latitude and Longitude for this place: "${location}"${cityContext ? ` in ${cityContext}` : ''}.
    Return strictly JSON format: { "lat": number, "lng": number }.
    If the place is unknown or vague, try to find the most likely tourist spot with that name.`;

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
          },
          required: ["lat", "lng"],
        },
      },
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.error("Coordinate Gen Error:", error);
    return null;
  }
};