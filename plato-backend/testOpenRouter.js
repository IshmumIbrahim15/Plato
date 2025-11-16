import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

async function testOpenRouter() {
  try {
    const resp = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'anthropic/claude-3.5-sonnet',   
        messages: [
          { role: 'system', content: 'You are a helpful AI.' },
          { role: 'user', content: 'Say hello.' },
        ],
        max_tokens: 50,
        temperature: 0.5,
      },
      { headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}` } }
    );
    console.log('✅ OpenRouter response:', resp.data);
  } catch (err) {
    console.error('❌ Error calling OpenRouter:', err.response?.data || err.message);
  }
}

testOpenRouter();
