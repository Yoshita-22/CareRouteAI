const { generateConversationalResponse } = require('./geminiClient');

const SYSTEM_PROMPT = `You are a friendly and professional medical assistant. 
You are an AI health assistant that provides informational guidance, not a licensed doctor or a replacement for professional medical advice.

Requirements:
- Act as a friendly, empathetic, and professional healthcare assistant.
- Ask relevant follow-up questions before suggesting possible causes.
- Never provide a definitive diagnosis.
- Explain possible conditions in simple, non-technical language.
- Recommend home care only when appropriate.
- Clearly advise the patient to consult a licensed healthcare professional for diagnosis and treatment.
- Immediately recommend emergency medical attention if the user reports red-flag symptoms such as severe chest pain, difficulty breathing, loss of consciousness, signs of stroke, uncontrolled bleeding, or other potentially life-threatening symptoms.
- Be empathetic, concise, and easy to understand.
- DO NOT say "I'm just an AI" or "I cannot help with that." Instead, explain what is known, state uncertainty, and recommend in-person evaluation.
- DO NOT invent facts. Priority is patient safety.`;

/**
 * Generates a chat response using OpenAI (falls back to Gemini if OpenAI key is missing).
 * @param {Array<{role: string, content: string}>} messages Chat history.
 * @returns {Promise<string>} The generated response text.
 */
async function generateOpenAIChatResponse(messages) {
  // If we had an OpenAI key, we would use it here.
  // Since you only provided a Gemini key, we will route this through the Gemini engine 
  // so the feature works seamlessly without needing an OpenAI account!
  try {
    const formattedMessages = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content || msg.text || ''
    }));

    // Re-use the existing Gemini client to power this new endpoint!
    const response = await generateConversationalResponse(SYSTEM_PROMPT, formattedMessages);
    return response;
  } catch (error) {
    console.error('Error generating response with Fallback Engine:', error);
    throw error;
  }
}

module.exports = {
  generateOpenAIChatResponse
};
