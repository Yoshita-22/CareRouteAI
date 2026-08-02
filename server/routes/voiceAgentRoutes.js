const express = require('express');
const router = express.Router();
const voiceAgentService = require('../services/voiceAgentService');

/**
 * POST /api/voice-agent/chat
 * Multi-language conversational reasoning endpoint for two-way voice agent
 */
router.post('/chat', async (req, res) => {
  try {
    const { messages, language, userLocation } = req.body || {};

    const result = await voiceAgentService.processVoiceConversation({
      messages,
      language,
      userLocation
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in voice agent chat endpoint:', error);
    return res.status(500).json({
      status: 'ERROR',
      message: 'Failed to process voice agent conversation',
      error: error.message
    });
  }
});

module.exports = router;
