const axios = require('axios');

const OLLAMA_URL = 'http://localhost:11434/api/generate';
const MODEL_NAME = 'llama3';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = 'meta-llama/llama-3-8b-instruct';

let consultasEnProceso = 0;
const colaConsultas = [];

// Función pública: selecciona si usar IA local o externa
async function procesarConsultaIA(messages, config) {
  if (config.USE_LOCAL_API) {
    return procesarConsultaIAInt(messages, config);
  } else {
    return procesarConsultaIAExt(messages, config);
  }
}

async function procesarConsultaIAInt(messages, config) {
  return new Promise((resolve) => {
    const ejecutar = async () => {
      consultasEnProceso++;
      try {
        const prompt = messages
          .map(m => `${m.role === 'user' ? 'User' : m.role === 'assistant' ? 'Assistant' : 'System'}: ${m.content}`)
          .join('\n') + '\nAssistant:';

        const res = await axios.post(
          OLLAMA_URL,
          {
            model: MODEL_NAME,
            prompt,
            stream: false,
          },
          {
            timeout: 60000,
          }
        );

        const respuesta = res.data.response || 'No hay respuesta del modelo.';
        resolve(respuesta.trim());
      } catch (e) {
        console.error('Error en consultaIA local Ollama:', e.response?.data || e.message);
        resolve('Perdón, tuve un problema para responder.');
      } finally {
        consultasEnProceso--;
        if (colaConsultas.length > 0) colaConsultas.shift()();
      }
    };

    if (consultasEnProceso < config.MAX_CONCURRENT_QUERIES) {
      ejecutar();
    } else {
      colaConsultas.push(ejecutar);
    }
  });
}

async function procesarConsultaIAExt(messages, config) {
  if (process.env.DEBUG === 'true') {
    console.log('API de OpenRouter key loaded');
  }
  
  return new Promise((resolve) => {
    const ejecutar = async () => {
      consultasEnProceso++;
      try {
        const res = await axios.post(
          OPENROUTER_URL,
          {
            model: OPENROUTER_MODEL, // lo podés setear como 'meta-llama/llama-3-8b-instruct'
            messages,
            temperature: 0.85,
            top_p: 0.9,
            presence_penalty: 0.6,
            frequency_penalty: 0.3,
            max_tokens: 500,
            stream: false
          },
          {
            headers: {
              'Authorization': `Bearer ${config.OPENROUTER_API_KEY}`,
              'Content-Type': 'application/json',
            },
            timeout: 60000,
          }
        );

        const respuesta = res.data?.choices?.[0]?.message?.content || 'No hay respuesta del modelo.';
        resolve(respuesta.trim());
      } catch (e) {
        console.error('Error en consultaIA OpenRouter:', e.response?.data || e.message);
        resolve('Perdón, tuve un problema para responder.');
      } finally {
        consultasEnProceso--;
        if (colaConsultas.length > 0) colaConsultas.shift()();
      }
    };

    if (consultasEnProceso < config.MAX_CONCURRENT_QUERIES) {
      ejecutar();
    } else {
      colaConsultas.push(ejecutar);
    }
  });
}


module.exports = { procesarConsultaIA, procesarConsultaIAExt };
