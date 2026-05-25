const express = require('express');
const router = express.Router();
const sensorController = require('../controllers/sensorController');

// GET all readings
router.get('/sensor', sensorController.getAllReadings);

// POST new reading from ESP32 or Simulator
router.post('/sensor', sensorController.addReading);

// GET analysis/alerts summary
router.get('/alerts', sensorController.getRecentAlerts);

// POST manual analysis request
router.post('/analyze-manual', sensorController.analyzeManual);

module.exports = router;
