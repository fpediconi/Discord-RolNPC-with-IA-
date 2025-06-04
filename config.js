const path = require('path');
const fs = require('fs');
const readline = require('readline');
require('dotenv').config();

class Config {
  constructor() {
    this._personalitiesDir = path.resolve(__dirname, 'data');
    this._configData = null;
  }

  async cargar() {
    const personalityPath = await this._seleccionarPersonalidad();

    if (process.env.DEBUG === 'true') {
      console.log(`Using personality file: ${personalityPath}`);
    }

    this._configData = {
      DISCORD_TOKEN: process.env.DISCORD_TOKEN,
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
      TARGET_CHANNEL_ID: process.env.TARGET_CHANNEL_ID,
      MEMORY_PATH: path.resolve(__dirname, 'data', 'runtime', 'memory.json'),
      EVENTOS_PATH: path.resolve(__dirname, 'data', 'eventos.json'),
      PERSONALITIES_DIR: this._personalitiesDir,
      PERSONALITY_PATH: personalityPath,
      MAX_HISTORY_MESSAGES: 50,
      MAX_MEMORY_MESSAGES_PER_USER: 30,
      MAX_CONCURRENT_QUERIES: 3,
      IGNORAR_COOLDOWN_CHANNELS: [],
    };

    return this._configData;
  }

  async _seleccionarPersonalidad() {
    const files = fs.readdirSync(this._personalitiesDir)
      .filter(f => f.endsWith('Personality.json'));

    if (files.length === 0) {
      throw new Error('No personality files found in /data');
    }

    console.log('Select a personality:');
    files.forEach((file, idx) => {
      console.log(`${idx + 1}: ${file}`);
    });

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve, reject) => {
      rl.question('Enter the number of the personality to use: ', (answer) => {
        rl.close();
        const idx = parseInt(answer, 10) - 1;
        if (idx >= 0 && idx < files.length) {
          resolve(path.join(this._personalitiesDir, files[idx]));
        } else {
          reject(new Error('Invalid selection'));
        }
      });
    });
  }

  // Getters
  get DISCORD_TOKEN() { return this._configData?.DISCORD_TOKEN; }
  get OPENROUTER_API_KEY() { return this._configData?.OPENROUTER_API_KEY; }
  get TARGET_CHANNEL_ID() { return this._configData?.TARGET_CHANNEL_ID; }
  get MEMORY_PATH() { return this._configData?.MEMORY_PATH; }
  get EVENTOS_PATH() { return this._configData?.EVENTOS_PATH; }
  get PERSONALITIES_DIR() { return this._configData?.PERSONALITIES_DIR; }
  get PERSONALITY_PATH() { return this._configData?.PERSONALITY_PATH; }
  get MAX_HISTORY_MESSAGES() { return this._configData?.MAX_HISTORY_MESSAGES; }
  get MAX_MEMORY_MESSAGES_PER_USER() { return this._configData?.MAX_MEMORY_MESSAGES_PER_USER; }
  get MAX_CONCURRENT_QUERIES() { return this._configData?.MAX_CONCURRENT_QUERIES; }
  get IGNORAR_COOLDOWN_CHANNELS() { return this._configData?.IGNORAR_COOLDOWN_CHANNELS; }

  get all() { return this._configData; } // opcional para acceder a todo junto si lo necesitás
}

module.exports = Config;
