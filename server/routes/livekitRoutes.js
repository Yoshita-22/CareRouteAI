const express = require('express');
const router = express.Router();
const livekitService = require('../services/livekitService');

/**
 * POST /api/livekit/token
 * Grants WebRTC LiveKit room tokens to the frontend
 * Request: { room_name: "emergency-101", participant_name: "Patient" }
 * Response: { token: "JWT_TOKEN_STRING", url: "wss://..." }
 */
router.post('/token', async (req, res) => {
  try {
    const { room_name, participant_name } = req.body || {};
    const result = await livekitService.generateLiveKitToken({ room_name, participant_name });
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error issuing LiveKit token:', error);
    return res.status(500).json({
      status: 'ERROR',
      message: 'Failed to issue LiveKit token',
      error: error.message
    });
  }
});

/**
 * POST /api/livekit/triage-handoff
 * Converts full LiveKit conversation transcript memory into standardized Triage JSON payload
 * for Layer 2 Hospital Ranking Algorithm.
 */
router.post('/triage-handoff', async (req, res) => {
  try {
    const { transcriptMessages, patient_location } = req.body || {};
    const result = await livekitService.extractTriageJsonFromTranscript({
      transcriptMessages,
      patient_location
    });
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error during LiveKit triage handoff:', error);
    return res.status(500).json({
      status: 'ERROR',
      message: 'Failed to extract Triage JSON payload',
      error: error.message
    });
  }
});

module.exports = router;
