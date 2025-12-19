import { GoogleGenerativeAI } from "@google/generative-ai";
import { ItineraryItem } from "../types";

// 1. 初始化 Helper (使用 Vite 環境變數)
const getAiClient = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Gemini API Key is missing. Check .env.local");
    throw new Error("Missing API Key");
  }
  return new GoogleGenerativeAI(apiKey);
};

// 2. 產生行程建議 (Batch 模式)
export const generateItinerarySuggestions = async (prompt: string): Promise<ItineraryItem[]> => {
  try {
    const genAI = getAiClient();
    // 維持使用你目前可用的 2.5 flash 模型
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const fullPrompt = `你是一位專業的旅遊規劃師。請針對以下需求提供 3-5 個行程建議： "${prompt}"。
    
    請回傳純 JSON Array (不要用 markdown code block 包裹)。每個項目包含：
    - time: 建議時間 (如 "09:00 - 11:00")
    - location: 地點名稱
    - description: 繁體中文詳細介紹 (50-100字)
    - type: 類別 (value 必須是以下之一: sightseeing, food, shopping, activity, transport, accommodation, other)
    - rating: 評分 (0.0-5.0)
    - price: 平均消費 (請估算並顯示當地幣別數字，例如 "300 TWD", "1500 JPY", "20 USD")
    - openTime: 營業時間 (如 "09:00 - 22:00")
    - lat: 緯度 (number)
    - lng: 經度 (number)
    - imageKeyword: 用於搜尋圖片的精確英文關鍵字 (例如 "Taipei 101 building")
    
    確保經緯度精確。`;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    let text = response.text();

    // 清理 Markdown 標記
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    const items = JSON.parse(text);

    return items.map((item: any, index: number) => ({
      ...item,
      id: `ai-${Date.now()}-${index}`,
      imageUrl: item.imageKeyword 
        ? `https://images.unsplash.com/featured/1200x800/?${encodeURIComponent(item.imageKeyword)}` 
        : undefined,
    }));
  } catch (error) {
    console.error("Gemini API Generate Error:", error);
    return [];
  }
};

// 3. 取得單一地點詳情 (手動定位用)
export const getPlaceDetails = async (location: string, cityContext?: string) => {
  try {
    const genAI = getAiClient();
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    // 修改 Prompt：價格部分改為當地幣別
    const prompt = `查詢地點: "${location}"${cityContext ? ` 在 ${cityContext}` : ''}。
    請回傳純 JSON 物件 (不要 Markdown)。
    
    請務必包含以下欄位，若無確切數據請進行「估算」：
    { 
      "lat": number, 
      "lng": number, 
      "rating": number (若無請回傳 4.0), 
      "priceLevel": string (請估算並顯示當地幣別數字，例如 "300 TWD", "1500 JPY"),
      "openTime": string (若不確定請回傳 "09:00 - 22:00"),
      "description": string (簡短繁中描述),
      "imageKeyword": string 
    }`;

    const result = await model.generateContent(prompt);
    let text = result.response.text();
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(text);
  } catch (error) {
    console.error("Place Details Error:", error);
    return null;
  }
};