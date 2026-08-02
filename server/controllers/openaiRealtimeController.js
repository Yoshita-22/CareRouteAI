const fetch = require('node-fetch'); // Ensure node-fetch is available or use native fetch in Node 18+

const SYSTEM_PROMPT = `You are a professional medical assistant.
Your role is to help patients by listening to their concerns and providing informational guidance.
Rules:
- You must ALWAYS ask relevant follow-up questions before suggesting possible causes.
- You must NEVER provide a definitive diagnosis.
- Explain possible conditions in simple, non-technical language.
- Recommend consulting a licensed doctor when appropriate.
- CRITICAL: If emergency symptoms are mentioned (e.g., severe chest pain, difficulty breathing, loss of consciousness, signs of stroke, uncontrolled bleeding), IMMEDIATELY advise the user to seek immediate emergency medical care or call 911.
- You are speaking via audio. Keep responses concise, conversational, empathetic, and easy to understand.
- Do NOT output markdown formatting like asterisks or bullet points since it will be spoken.`;

/**
 * Controller to generate an ephemeral WebRTC token for the OpenAI Realtime API.
 */
const generateRealtimeToken = async (req, res) => {
  try {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OPENAI_API_KEY is not configured in .env' });
    }

    // Call OpenAI to create an ephemeral session token
    // Node 18+ native fetch
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17", // Latest supported realtime model
        voice: "alloy",
        instructions: SYSTEM_PROMPT,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI Realtime Token Error:', errorText);
      return res.status(response.status).json({ error: 'Failed to generate OpenAI Realtime session token' });
    }

    const data = await response.json();
    
    // Return the ephemeral client secret to the frontend
    res.json({ client_secret: data.client_secret.value });

  } catch (error) {
    console.error('Error in generateRealtimeToken:', error);
    res.status(500).json({ error: 'Internal Server Error while communicating with OpenAI.' });
  }
};

module.exports = {
  generateRealtimeToken
};
