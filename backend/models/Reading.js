const mongoose = require('mongoose');

const ReadingSchema = new mongoose.Schema({
    orp: { type: Number, required: true },
    salinity: { type: Number, required: true },
    temperature: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now },
    riskLevel: { type: String, enum: ['Safe', 'Warning', 'Critical'], required: true },
    message: { type: String }
});

module.exports = mongoose.model('Reading', ReadingSchema);
