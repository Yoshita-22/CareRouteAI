const { generateOpenAIChatResponse } = require('../services/openaiClient');

const chatOpenAI = async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const aiResponse = await generateOpenAIChatResponse(messages);

    res.json({
      status: 'SUCCESS',
      replyText: aiResponse
    });
  } catch (error) {
    console.error('OpenAI Chat Error:', error);
    res.status(500).json({ error: 'Internal Server Error while communicating with OpenAI.' });
  }
};

module.exports = {
  chatOpenAI
};
