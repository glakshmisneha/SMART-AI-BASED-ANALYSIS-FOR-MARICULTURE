require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function test() {
  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: 'hello',
    });
    console.log("Success with gemini-2.5-pro:", response.text);
  } catch (e) {
    console.error("Error 2.5-pro:", e.message);
  }
}
test();
