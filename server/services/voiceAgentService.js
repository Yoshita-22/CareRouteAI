// Real-Time AI Voice Agent Reasoning Engine
// Supports multi-language conversational reasoning (English, Telugu, Hindi, Spanish),
// conversation memory, emergency triage, and natural spoken output formatting.

const AI_RESPONSE_BEHAVIOR = `## AI RESPONSE BEHAVIOR
You are Dr. Evelyn Vance, a compassionate, highly skilled AI Emergency Physician and Voice Agent for CareRoute AI.

Requirements:
- Reply in complete, detailed, and conversational answers.
- Never give one-line or overly short responses.
- Explain every medical term in simple language.
- Ask follow-up questions before reaching conclusions.
- Maintain memory throughout the conversation.
- Be friendly, empathetic, and professional.
- Provide structured responses with:
  - Possible condition(s)
  - Reasoning
  - Questions for clarification
  - Home care advice (if appropriate)
  - When to seek medical attention
  - Preventive measures
  - Recommended specialist
  - Nearby hospitals (when location permission is granted)

Do not refuse questions simply because they relate to health. Instead:
- Explain what is known.
- State any uncertainty.
- Recommend in-person medical evaluation when appropriate.
- Encourage emergency care for serious warning signs.

Never invent facts or claim certainty when uncertain.
Speak like a real doctor in a hospital, using a calm, reassuring, and professional tone.
Avoid generic responses such as "I'm just an AI" or "I cannot help with that."
Instead, provide the best possible guidance while clearly stating that the information is educational and not a confirmed medical diagnosis.
Prioritize patient safety, but do not unnecessarily decline requests that can be answered safely.
Response quality should match GPT-5 or Claude Opus level (Detailed, Intelligent, Context-aware, Human-like, Step-by-step reasoning, Personalized recommendations).`;

const SYSTEM_PROMPTS = {
  'en-US': `${AI_RESPONSE_BEHAVIOR}\nYou speak English.`,
  'te-IN': `${AI_RESPONSE_BEHAVIOR}\nIMPORTANT: You must speak and output exclusively in fluent Telugu.`,
  'hi-IN': `${AI_RESPONSE_BEHAVIOR}\nIMPORTANT: You must speak and output exclusively in fluent Hindi.`,
  'es-ES': `${AI_RESPONSE_BEHAVIOR}\nIMPORTANT: You must speak and output exclusively in fluent Spanish.`
};

// Goodbye phrase matchers across languages
const GOODBYE_PATTERNS = [
  /goodbye/i,
  /bye/i,
  /see\s+you/i,
  /take\s+care/i,
  /మళ్ళీ\s*కలుద్దాం/i,
  /సెలవు/i,
  /వెళ్తున్నాను/i,
  /अलविदा/i,
  /अलबिदा/i,
  /नमस्ते/i,
  /adios/i,
  /chao/i
];

/**
 * Process incoming voice agent turn
 */
async function processVoiceConversation({ messages, language = 'en-US', userLocation }) {
  const currentLang = SYSTEM_PROMPTS[language] ? language : 'en-US';
  const systemPrompt = SYSTEM_PROMPTS[currentLang];

  // Extract last user message
  const userMessages = (messages || []).filter(m => m.role === 'user');
  const lastUserText = userMessages.length > 0 ? userMessages[userMessages.length - 1].content : '';
  const isGoodbye = GOODBYE_PATTERNS.some(pattern => pattern.test(lastUserText));

  let replyText = '';

  if (isGoodbye) {
    if (currentLang === 'te-IN') {
      replyText = 'ధన్యవాదాలు! మీ ఆరోగ్యం జాగ్రత్త. ఏమైనా అత్యవసర సహాయం కావాలంటే నన్ను ఎప్పుడైనా పిలవండి. సెలవు!';
    } else if (currentLang === 'hi-IN') {
      replyText = 'धन्यवाद! अपना ख्याल रखें। यदि आपको कोई आपातकालीन सहायता चाहिए तो मुझे कभी भी संपर्क करें। अलविदा!';
    } else if (currentLang === 'es-ES') {
      replyText = '¡Gracias por hablar conmigo! Cuídese mucho. Si necesita ayuda de emergencia, estoy aquí. ¡Hasta luego!';
    } else {
      replyText = 'Thank you for consulting CareRoute AI! Please take care of yourself. Goodbye and stay safe!';
    }
    return {
      status: 'SUCCESS',
      replyText,
      isGoodbye: true,
      language: currentLang
    };
  }

  // Use Gemini LLM for dynamic conversational reasoning
  try {
    const { generateConversationalResponse } = require('./geminiClient');
    replyText = await generateConversationalResponse(systemPrompt, messages);
  } catch (error) {
    console.error('Gemini LLM error in voiceAgentService, falling back to basic response:', error);
    replyText = currentLang === 'te-IN' 
      ? `నేను మీ పరిస్థితిని పరిశీలిస్తున్నాను. మీ శరీరాన్ని ప్రశాంతంగా ఉంచుకోండి.` 
      : `I hear you clearly. I am continuously monitoring your condition. How are you feeling right now?`;
  }

  return {
    status: 'SUCCESS',
    replyText,
    isGoodbye: false,
    language: currentLang
  };
}

module.exports = {
  processVoiceConversation,
  SYSTEM_PROMPTS
};
