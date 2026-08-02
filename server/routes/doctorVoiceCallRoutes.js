const express = require('express');
const router = express.Router();
const doctorVoiceCallService = require('../services/doctorVoiceCallService');

/**
 * POST /api/doctor-call/consult
 * Clinical AI Doctor Voice Call turn & visual image triage
 */
router.post('/consult', async (req, res) => {
  try {
    const { messages, language, hasPhoto, photoBase64, patientLocation } = req.body || {};

    const result = await doctorVoiceCallService.processDoctorVoiceCall({
      messages,
      language,
      hasPhoto,
      photoBase64,
      patientLocation
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in doctor voice call consult:', error);
    return res.status(500).json({
      status: 'ERROR',
      message: 'Failed to process AI Doctor voice call turn',
      error: error.message
    });
  }
});

/**
 * POST /api/doctor-call/summary
 * Generate post-call clinical summary & symptom timeline
 */
router.post('/summary', async (req, res) => {
  try {
    const { messages, language } = req.body || {};

    const result = await doctorVoiceCallService.generatePostCallSummary({
      messages,
      language
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error generating post-call summary:', error);
    return res.status(500).json({
      status: 'ERROR',
      message: 'Failed to generate post-call summary',
      error: error.message
    });
  }
});

module.exports = router;
