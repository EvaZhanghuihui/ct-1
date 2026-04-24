import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface Variation {
  question: string;
  answer: string;
  analysis: string;
}

export interface OCRResult {
  text: string;
  knowledgePoint: string;
}

export const analyzeMistake = async (base64Image: string): Promise<OCRResult> => {
  const model = "gemini-3-flash-preview";
  
  const prompt = `你是一个全科教师。请识别图片中的错题内容，并提取其核心知识点（如：“一元二次方程根的判别式”、“现在完成时”、“欧姆定律”等）。
请以JSON格式返回结果。`;

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          {
            inlineData: {
              data: base64Image.split(',')[1] || base64Image,
              mimeType: "image/jpeg"
            }
          },
          { text: prompt }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING, description: "识别出的完整题目文本" },
          knowledgePoint: { type: Type.STRING, description: "核心知识点名称" }
        },
        required: ["text", "knowledgePoint"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
};

export const generateVariations = async (knowledgePoint: string, originalText: string): Promise<Variation[]> => {
  const model = "gemini-3-flash-preview";
  
  const prompt = `基于以下知识点和原错题，生成3道难度相当或略有梯度的举一反三变式题。
知识点：${knowledgePoint}
原题内容：${originalText}

要求：
1. 每道题包含题目、答案和解析。
2. 解析应侧重易错点分析（如：“常见错误是忘记讨论二次项系数为零的情况”）。
3. 题目应覆盖该知识点的不同变式。`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING, description: "题目文本" },
            answer: { type: Type.STRING, description: "正确答案" },
            analysis: { type: Type.STRING, description: "针对易错点的解析" }
          },
          required: ["question", "answer", "analysis"]
        }
      }
    }
  });

  return JSON.parse(response.text || "[]");
};
