require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function listModels() {
    try {
        const response = await ai.models.list();
        console.log("Response:", response);
    } catch (e) {
        console.error("Error listing models:", e);
    }
}

listModels();
