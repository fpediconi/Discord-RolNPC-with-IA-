const path = require('path');
require('dotenv').config();

module.exports = {
  DISCORD_TOKEN: process.env.DISCORD_TOKEN,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  TARGET_CHANNEL_ID: process.env.TARGET_CHANNEL_ID,
  MEMORY_PATH: path.resolve(__dirname, 'data', 'runtime', 'memory.json'),

  EVENTOS_PATH: path.resolve(__dirname, 'data', 'eventos.json'),
  PERSONALITY_PATH: path.resolve(__dirname, 'data', 'vigoPersonality.json'),

  MAX_HISTORY_MESSAGES: 50,
  MAX_MEMORY_MESSAGES_PER_USER: 30,
  MAX_CONCURRENT_QUERIES: 3,
  IGNORAR_COOLDOWN_CHANNELS: [],
};
