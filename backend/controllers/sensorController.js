const mongoose = require('mongoose');
let Reading;
try {
    Reading = require('../models/Reading');
} catch (e) {
    console.warn("Mongoose failed to load model");
}

const { GoogleGenAI } = require('@google/genai');

let mockDB = [];

const AI_RULES = {
    orp: { min: 200, max: 600 },        // mV
    salinity: { min: 25, max: 35 },     // ppt (mariculture ranges)
    temperature: { min: 20, max: 30 }   // Celsius
};

const analyzeData = (data) => {
    let riskLevel = 'Safe';
    let issues = [];

    // ORP Check
    if (data.orp < AI_RULES.orp.min) {
        issues.push(`ORP too low (${data.orp} mV). Contamination risk.`);
    } else if (data.orp > AI_RULES.orp.max) {
        issues.push(`ORP critically high (${data.orp} mV).`);
    }

    // Salinity Check
    if (data.salinity < AI_RULES.salinity.min || data.salinity > AI_RULES.salinity.max) {
        issues.push(`Salinity abnormal (${data.salinity} ppt).`);
    }

    // Temp Check
    if (data.temperature < AI_RULES.temperature.min || data.temperature > AI_RULES.temperature.max) {
        issues.push(`Temperature abnormal (${data.temperature}°C).`);
    }

    if (issues.length === 1) {
        riskLevel = 'Warning';
    } else if (issues.length >= 2) {
        riskLevel = 'Critical';
    }

    // Advanced Trend Detection (simulated continuous decrease)
    // In a real app we'd query last 5 records
    if (mockDB.length >= 2) {
        const last = mockDB[mockDB.length - 1];
        if (data.orp < last.orp && data.orp < AI_RULES.orp.min + 50) {
            issues.push(`Trend: ORP continuously dropping.`);
            riskLevel = 'Critical';
        }
    }

    return { riskLevel, message: issues.length ? issues.join(' ') : 'Water condition is optimal.' };
};

exports.addReading = async (req, res) => {
    try {
        const { orp, salinity, temperature } = req.body;
        
        if (orp === undefined || salinity === undefined || temperature === undefined) {
             return res.status(400).json({ error: "Missing sensor values" });
        }

        const analysis = analyzeData({ orp, salinity, temperature });
        
        const newRecord = {
            orp, salinity, temperature,
            timestamp: new Date(),
            riskLevel: analysis.riskLevel,
            message: analysis.message
        };

        if (mongoose.connection.readyState === 1) {
            const reading = new Reading(newRecord);
            await reading.save();
        } else {
            mockDB.push(newRecord);
            // keep array size manageable
            if (mockDB.length > 500) mockDB.shift();
        }

        // Trigger Alert if critical
        if (analysis.riskLevel !== 'Safe') {
            console.log(`[ALERT Triggered] Risk: ${analysis.riskLevel} - ${analysis.message}`);
            // e.g. Nodemailer logic could go here
        }

        res.status(201).json({ success: true, data: newRecord });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getAllReadings = async (req, res) => {
    try {
        if (mongoose.connection.readyState === 1) {
            const data = await Reading.find().sort({ timestamp: -1 }).limit(100);
            res.status(200).json(data.reverse());
        } else {
            res.status(200).json(mockDB);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getRecentAlerts = async (req, res) => {
    try {
        if (mongoose.connection.readyState === 1) {
            const data = await Reading.find({ riskLevel: { $in: ['Warning', 'Critical'] } }).sort({ timestamp: -1 }).limit(20);
            res.status(200).json(data);
        } else {
            const alerts = mockDB.filter(r => r.riskLevel !== 'Safe').reverse().slice(0, 20);
            res.status(200).json(alerts);
        }
    } catch (error) {
         res.status(500).json({ error: error.message });
    }
};

exports.analyzeManual = async (req, res) => {
    try {
        const { orp, salinity, temperature } = req.body;
        
        if (orp === undefined) {
             return res.status(400).json({ error: "Missing ORP value" });
        }

        const prompt = `As an AI assistant for a Mariculture (aquaculture) system, analyze the following water conditions. 
ORP (Oxidation-Reduction Potential): ${orp} mV. 
${salinity !== undefined ? `Salinity: ${salinity} ppt. ` : ''}
${temperature !== undefined ? `Temperature: ${temperature} °C. ` : ''}

Provide a short, professional analysis of the water conditions. Identify any risks to aquatic life (e.g., contamination, lack of oxygen, dangerous pathogens) and give a brief recommendation. Make it 2-3 sentences.`;

        const aiRulesResult = analyzeData({ 
            orp: Number(orp), 
            salinity: salinity !== undefined ? Number(salinity) : 30, 
            temperature: temperature !== undefined ? Number(temperature) : 25 
        });

        let aiAnalysis = "";

        if (process.env.GEMINI_API_KEY) {
            try {
                const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                });
                aiAnalysis = response.text;
            } catch (aiError) {
                console.error("Gemini API Error:", aiError.message);
                aiAnalysis = `[Note: AI Analysis temporarily unavailable (API Limit/Quota Exceeded). Using Rule-Based Analysis.] ${aiRulesResult.message}`;
            }
        } else {
            // Fallback using simple rule analysis
            aiAnalysis = `[Note: Gemini API key not found. Using Rule-Based Analysis.] ${aiRulesResult.message} For full AI insights, please add GEMINI_API_KEY to your environment.`;
        }

        const newRecord = {
            orp: Number(orp), 
            salinity: salinity !== undefined ? Number(salinity) : 30, 
            temperature: temperature !== undefined ? Number(temperature) : 25,
            timestamp: new Date(),
            riskLevel: aiRulesResult.riskLevel,
            message: aiAnalysis // Use the actual Gemini AI text so it appears in the reports table!
        };

        if (mongoose.connection.readyState === 1) {
            const reading = new Reading(newRecord);
            await reading.save();
        } else {
            mockDB.push(newRecord);
            if (mockDB.length > 500) mockDB.shift();
        }

        res.status(200).json({ 
            success: true, 
            analysis: aiAnalysis,
            riskLevel: aiRulesResult.riskLevel,
            ruleMessage: aiRulesResult.message
        });
    } catch (error) {
        console.error("AI Analysis Error:", error);
        res.status(500).json({ error: "Failed to perform AI analysis. " + error.message });
    }
};
