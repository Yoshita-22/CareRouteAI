const doctorAIService = require('../services/doctorAIService');
const supabaseService = require('../services/supabaseService');
const geminiClient = require('../services/geminiClient');

/**
 * Controller for POST /api/doctor/multimodal-triage
 * Accepts text, image base64, audio base64, and patient_location, passes to Gemini Multimodal API,
 * and returns the exact structured JSON schema required by user.
 */
async function processMultimodalTriageEndpoint(req, res) {
  try {
    const { text, imageBase64, imageMime, audioBase64, audioMime, patient_location, patient_id } = req.body || {};

    const triageResult = await geminiClient.processMultimodalTriage({
      text,
      imageBase64,
      imageMime,
      audioBase64,
      audioMime,
      patientLocation: patient_location
    });

    // Optionally save transcript log in database
    try {
      await supabaseService.saveDoctorConversationInDB({
        patient_id: patient_id || 'PAT-MULTIMODAL-001',
        conversation_transcript: [
          { sender: 'PATIENT', text: text || '[Multimodal Input: Image/Audio]', timestamp: new Date().toISOString() },
          { sender: 'GEMINI_MULTIMODAL_AI', text: triageResult.consultation_summary, timestamp: new Date().toISOString() }
        ],
        lesion_analysis: {
          detected_condition: triageResult.detected_condition,
          confidence: triageResult.confidence,
          red_flags: triageResult.red_flags
        },
        requirement_payload: {
          urgency_level: triageResult.urgency_level,
          detected_condition: triageResult.detected_condition,
          hard_requirements: triageResult.hard_requirements
        },
        patient_location: triageResult.patient_location
      });
    } catch (dbErr) {
      console.warn('Non-blocking DB save notice in processMultimodalTriageEndpoint:', dbErr.message);
    }

    return res.status(200).json(triageResult);
  } catch (error) {
    console.error('Error in processMultimodalTriageEndpoint:', error);
    return res.status(500).json({
      status: 'ERROR',
      message: 'Failed to process Gemini multimodal triage',
      error: error.message
    });
  }
}

/**
 * Controller for POST /api/doctor/consult
 * Analyzes patient input (text/audio/photo), runs vision lesion diagnostic, generates remedies & requirementPayload,
 * and saves full conversation into Supabase table `conversations`.
 */
async function consultDoctorEndpoint(req, res) {
  try {
    const { textInput, hasPhoto, photoBase64, isCameraScan, hasAudio, audioData, patient_location, patient_id } = req.body || {};

    // Run AI Doctor Diagnostic & Vision Lesion Analyzer
    const result = await doctorAIService.analyzePatientCondition({
      textInput,
      hasPhoto,
      photoBase64,
      isCameraScan,
      hasAudio,
      audioData
    });

    // Save Patient & Doctor Conversation log into Supabase database
    const conversationTranscript = [
      {
        sender: 'PATIENT',
        text: textInput || (isCameraScan ? '[Live Webcam Vision Frame Scan]' : hasPhoto ? '[Patient uploaded lesion image/camera capture]' : hasAudio ? '[Patient sent audio recording]' : 'Direct Emergency Call'),
        timestamp: new Date().toISOString()
      },
      {
        sender: 'DOCTOR_AI',
        text: result.doctor_voice_response,
        remedies: result.remedies,
        timestamp: new Date().toISOString()
      }
    ];

    const saveResult = await supabaseService.saveDoctorConversationInDB({
      patient_id: patient_id || 'PAT-LIVE-001',
      conversation_transcript: conversationTranscript,
      lesion_analysis: result.vision_analysis,
      requirement_payload: result.requirementPayload,
      patient_location
    });

    return res.status(200).json({
      status: 'SUCCESS',
      doctor_voice_response: result.doctor_voice_response,
      remedies: result.remedies,
      requirementPayload: result.requirementPayload,
      vision_analysis: result.vision_analysis,
      scenario_node: result.scenario_node,
      supabase_save: saveResult
    });
  } catch (error) {
    console.error('Error in consultDoctorEndpoint:', error);
    return res.status(500).json({
      status: 'ERROR',
      message: 'Failed to process AI Doctor consultation',
      error: error.message
    });
  }
}

/**
 * Controller for POST /api/doctor/beyond-presence/session
 * Handshakes with Beyond Presence API / SDK generator.
 */
async function initiateBeyondPresenceEndpoint(req, res) {
  try {
    const { avatarId, patientId } = req.body || {};
    const session = await doctorAIService.initiateBeyondPresenceSession({ avatarId, patientId });
    return res.status(200).json(session);
  } catch (error) {
    console.error('Error in initiateBeyondPresenceEndpoint:', error);
    return res.status(500).json({
      status: 'ERROR',
      message: 'Failed to initiate Beyond Presence video session',
      error: error.message
    });
  }
}

/**
 * Controller for GET /api/doctor/conversations
 * Fetches saved conversations from Supabase table.
 */
async function getConversationsEndpoint(req, res) {
  try {
    const result = await supabaseService.getDoctorConversationsFromDB();
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ status: 'ERROR', message: error.message });
  }
}

module.exports = {
  processMultimodalTriageEndpoint,
  consultDoctorEndpoint,
  initiateBeyondPresenceEndpoint,
  getConversationsEndpoint
};

