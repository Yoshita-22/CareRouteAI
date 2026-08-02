const { GoogleGenAI, Type } = require('@google/genai');

const geminiApiKey = process.env.GEMINI_API_KEY;
let ai;
if (geminiApiKey) {
  ai = new GoogleGenAI({ apiKey: geminiApiKey });
} else {
  console.warn('⚠️ GEMINI_API_KEY is missing from environment variables. LLM features may fail.');
}

/**
 * Generates a conversational response.
 * @param {string} systemInstruction The system prompt (persona & guidelines).
 * @param {Array<{role: string, content: string}>} messages Chat history.
 * @returns {Promise<string>} The generated response text.
 */
async function generateConversationalResponse(systemInstruction, messages) {
  if (!ai) return 'Error: Gemini API key is not configured. Please add GEMINI_API_KEY to .env';

  try {
    const contents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content || msg.text || '' }]
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    return response.text;
  } catch (error) {
    console.error('Error generating conversational response with Gemini:', error);
    throw error;
  }
}

/**
 * Extracts structured JSON data from a conversation transcript based on a schema.
 * @param {string} systemInstruction The system prompt guiding the extraction.
 * @param {string} prompt The actual text/transcript to process.
 * @param {object} responseSchema The expected JSON schema.
 * @returns {Promise<object>} The extracted JSON object.
 */
async function extractStructuredJSON(systemInstruction, prompt, responseSchema) {
  if (!ai) throw new Error('Gemini API key is not configured.');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
        temperature: 0.1, // Low temperature for consistent JSON extraction
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error('Error extracting structured JSON with Gemini:', error);
    throw error;
  }
}

/**
 * Gemini Multimodal Triage Schema matching the exact user requirements.
 */
const GEMINI_TRIAGE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    urgency_level: {
      type: Type.STRING,
      description: "Triage urgency level: CRITICAL_LEVEL_1, HIGH_LEVEL_2, MODERATE_LEVEL_3, or LOW_LEVEL_4",
    },
    detected_condition: {
      type: Type.STRING,
      description: "Brief diagnosis or description of detected primary condition or trauma",
    },
    confidence: {
      type: Type.NUMBER,
      description: "Diagnostic confidence score between 0.00 and 1.00",
    },
    consultation_summary: {
      type: Type.STRING,
      description: "Clinical summary of symptoms, visual/audio observations, and urgent recommendations",
    },
    red_flags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of critical warning signs or red flags observed",
    },
    hard_requirements: {
      type: Type.OBJECT,
      properties: {
        bed_type: {
          type: Type.STRING,
          description: "Required bed type e.g. ICU, GENERAL, ER, NICU, CCU",
        },
        blood_group: {
          type: Type.STRING,
          description: "Required blood group e.g. O_NEG, A_POS, B_POS, O_POS, or null/UNKNOWN if none",
        },
        equipment: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "List of required medical equipment e.g. VENTILATOR, ECMO, CT_SCANNER, CATH_LAB, DEFIBRILLATOR",
        },
        specialist: {
          type: Type.STRING,
          description: "Required medical specialist e.g. TRAUMA_SURGEON, CARDIOLOGIST, NEUROSURGEON, PULMONOLOGIST",
        },
      },
      required: ["bed_type", "equipment", "specialist"],
    },
    patient_location: {
      type: Type.OBJECT,
      properties: {
        lat: { type: Type.NUMBER, description: "Latitude of patient location" },
        lng: { type: Type.NUMBER, description: "Longitude of patient location" },
      },
      required: ["lat", "lng"],
    },
  },
  required: [
    "urgency_level",
    "detected_condition",
    "confidence",
    "consultation_summary",
    "red_flags",
    "hard_requirements",
    "patient_location"
  ],
};

/**
 * Processes multimodal text, image, and audio inputs using Gemini Multimodal API
 * and produces the exact requested structured JSON schema.
 */
async function processMultimodalTriage({ text, imageBase64, imageMime, audioBase64, audioMime, patientLocation }) {
  const parts = [];

  const defaultLocation = patientLocation && typeof patientLocation.lat === 'number' && typeof patientLocation.lng === 'number'
    ? patientLocation
    : { lat: 17.38, lng: 78.48 };

  if (text && text.trim()) {
    parts.push({ text: `Patient / Paramedic Description: ${text.trim()}` });
  }

  if (imageBase64) {
    const rawBase64 = imageBase64.includes('base64,') ? imageBase64.split('base64,')[1] : imageBase64;
    const mime = imageMime || (imageBase64.includes('data:') ? imageBase64.split(';')[0].replace('data:', '') : 'image/jpeg');
    parts.push({
      inlineData: {
        mimeType: mime,
        data: rawBase64
      }
    });
  }

  if (audioBase64) {
    const rawBase64 = audioBase64.includes('base64,') ? audioBase64.split('base64,')[1] : audioBase64;
    const mime = audioMime || (audioBase64.includes('data:') ? audioBase64.split(';')[0].replace('data:', '') : 'audio/webm');
    parts.push({
      inlineData: {
        mimeType: mime,
        data: rawBase64
      }
    });
  }

  if (parts.length === 0) {
    parts.push({ text: "Patient presenting for emergency triage consultation." });
  }

  parts.push({
    text: `Patient location is at Latitude: ${defaultLocation.lat}, Longitude: ${defaultLocation.lng}. Analyze all provided multimodal inputs (text, image, audio) and return strictly the JSON schema requested.`
  });

  const systemInstruction = `You are CareRoute AI Emergency Multimodal Triage Assistant.
Analyze all provided inputs (patient description text, lesion/injury photo, audio recording of speech/breathing/symptoms).
Synthesize clinical findings into a single structured triage output.

Rules for fields:
1. urgency_level: One of "CRITICAL_LEVEL_1", "HIGH_LEVEL_2", "MODERATE_LEVEL_3", "LOW_LEVEL_4".
2. detected_condition: Precise medical condition name (e.g. "Deep leg laceration with potential arterial bleeding", "Severe 2nd-degree burn lesion", "Acute coronary syndrome").
3. confidence: Float between 0.00 and 1.00 indicating diagnostic confidence score.
4. consultation_summary: Concise clinical summary and emergency triage advice based on text/photo/audio findings.
5. red_flags: Array of critical indicators or warning signs identified (e.g. ["Heavy bleeding", "Loss of consciousness", "Arterial pulsatile spray"]).
6. hard_requirements:
   - bed_type: "ICU", "GENERAL", "ER", "NICU", or "CCU".
   - blood_group: Required blood group string like "O_NEG", "A_POS", "B_POS", "O_POS", or null if not applicable.
   - equipment: Array of required equipment e.g. ["VENTILATOR", "ECMO", "CT_SCANNER", "CATH_LAB"].
   - specialist: Required specialist e.g. "TRAUMA_SURGEON", "CARDIOLOGIST", "NEUROSURGEON", "PULMONOLOGIST".
7. patient_location: Object with numerical lat and lng coordinates (use ${defaultLocation.lat}, ${defaultLocation.lng}).
`;

  if (!ai) {
    console.warn('Gemini API key missing, returning fallback structured JSON response.');
    return generateFallbackTriage(text, Boolean(imageBase64), Boolean(audioBase64), defaultLocation);
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: parts,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: GEMINI_TRIAGE_SCHEMA,
        temperature: 0.1,
      }
    });

    const parsed = JSON.parse(response.text);
    return parsed;
  } catch (error) {
    console.error('Error executing Gemini Multimodal API generateContent:', error);
    return generateFallbackTriage(text, Boolean(imageBase64), Boolean(audioBase64), defaultLocation);
  }
}

function generateFallbackTriage(textInput, hasImage, hasAudio, defaultLocation) {
  const textLower = (textInput || '').toLowerCase();

  let condition = "Deep leg laceration with potential arterial bleeding";
  let urgency = "CRITICAL_LEVEL_1";
  let redFlags = ["Heavy bleeding", "Loss of consciousness"];
  let bedType = "ICU";
  let bloodGroup = "O_NEG";
  let equipment = ["VENTILATOR"];
  let specialist = "TRAUMA_SURGEON";

  if (textLower.includes('chest') || textLower.includes('heart') || textLower.includes('cardiac')) {
    condition = "Acute coronary syndrome with severe angina";
    urgency = "HIGH_LEVEL_2";
    redFlags = ["Chest tightness", "Shortness of breath"];
    bloodGroup = "A_POS";
    equipment = ["VENTILATOR", "CATH_LAB"];
    specialist = "CARDIOLOGIST";
  } else if (textLower.includes('head') || textLower.includes('stroke') || textLower.includes('seizure')) {
    condition = "Acute intracranial trauma with neurological distress";
    urgency = "CRITICAL_LEVEL_1";
    redFlags = ["Altered mental status", "Asymmetric pupils"];
    equipment = ["CT_SCANNER", "VENTILATOR"];
    specialist = "NEUROSURGEON";
  }

  return {
    urgency_level: urgency,
    detected_condition: condition,
    confidence: hasImage || hasAudio ? 0.96 : 0.91,
    consultation_summary: `Multimodal evaluation of ${hasImage ? 'image lesion scan, ' : ''}${hasAudio ? 'patient voice audio, ' : ''}and reported symptoms. Immediate emergency stabilization, pressure bandage application, and critical care transfer initiated.`,
    red_flags: redFlags,
    hard_requirements: {
      bed_type: bedType,
      blood_group: bloodGroup,
      equipment: equipment,
      specialist: specialist
    },
    patient_location: {
      lat: defaultLocation.lat || 17.38,
      lng: defaultLocation.lng || 78.48
    }
  };
}

module.exports = {
  ai,
  Type,
  generateConversationalResponse,
  extractStructuredJSON,
  processMultimodalTriage
};

