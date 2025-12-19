
import { GoogleGenAI, Type } from "@google/genai";
import { ItineraryItem } from "../types";

// Helper to safely get API key
const getAiClient = () => {
  // Vite 使用 import.meta.env 來讀取變數
  const apiKey = process.env.GEMINI_API_KEY || "demo-key";
  
  if (!apiKey) {
    console.error("Gemini API Key is missing. Please check your .env.local and ensure it starts with VITE_");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateItinerarySuggestions = async (prompt: string): Promise<ItineraryItem[]> => {
  try {
    const ai = getAiClient();
    const fullPrompt = `你是一位專業的旅遊規劃師。請針對以下需求提供 3-5 個行程建議： "${prompt}"。
    請使用「繁體中文」回傳所有描述性內容。包含評分(0-5.0)、價格等級($, $$, $$$)、營業時間、經緯度。
    特別注意：imageKeyword 必須是「具體且精確的英文關鍵字」(例如 'Great Wall of China' 而不是 '長城')。請回傳 JSON。`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
              imageKeyword: { type: Type.STRING },
            },
            required: ["time", "location", "description", "type", "lat", "lng", "imageKeyword"],
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
      imageUrl: item.imageKeyword ? `https://images.unsplash.com/featured/1200x800/?${encodeURIComponent(item.imageKeyword)}` : undefined,
    }));
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const suggestIconForCategory = async (category: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Single FontAwesome 6 icon class for: "${category}". Example: 'fa-utensils'.`,
    });
    return response.text?.trim() || 'fa-tag';
  } catch {
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
  imageKeyword?: string;
}

export const getPlaceDetails = async (location: string, cityContext?: string): Promise<PlaceDetails | null> => {
  try {
    const ai = getAiClient();
    const prompt = `快速查詢地點: "${location}"${cityContext ? ` 在 ${cityContext}` : ''}。
    請回傳「繁體中文」內容。JSON 格式: { "lat": 緯度, "lng": 經度, "rating": 評分, "openTime": "營業時間", "priceLevel": "價格等級", "description": "簡短繁中描述", "imageKeyword": "精確的英文圖片搜尋關鍵字" }。`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
            imageKeyword: { type: Type.STRING },
          },
          required: ["lat", "lng", "imageKeyword"],
        },
      },
    });

    const text = response.text;
    return text ? JSON.parse(text) : null;
  } catch (error) {
    console.error("Place Details Error:", error);
    return null;
  }
};