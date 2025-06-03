const axios = require('axios');
const { MAX_CONCURRENT_QUERIES, USE_LOCAL_API } = require('./config');

const OLLAMA_URL = 'http://localhost:11434/api/generate';
const MODEL_NAME = 'llama3'; 
const OPENROUTER_API_KEY = process.env.OPEN_ROUTE_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = 'openai/gpt-3.5-turbo'; 

let consultasEnProceso = 0;
const colaConsultas = [];

async function procesarConsultaIA(messages) {
  if (USE_LOCAL_API) {
    return procesarConsultaIAInt(messages);
  }else {
    return procesarConsultaIAExt(messages);
  }
}

async function procesarConsultaIAInt(messages) {
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
            timeout: 60000, // 60s timeout
          }
        );

        const respuesta = res.data.response || 'No hay respuesta del modelo.';
        resolve(respuesta.trim());
      } catch (e) {
        console.error('Error en consultaIA local Ollama:', e.response?.data || e.message);
        resolve('Perdón, tuve un problema para responder.');
      } finally {
        consultasEnProceso--;
        if (colaConsultas.length > 0) {
          const siguiente = colaConsultas.shift();
          siguiente();
        }
      }
    };

    if (consultasEnProceso < MAX_CONCURRENT_QUERIES) {
      ejecutar();
    } else {
      colaConsultas.push(ejecutar);
    }
  });
}

async function procesarConsultaIAExt(messages) {
  return new Promise((resolve) => {
    const ejecutar = async () => {
      consultasEnProceso++;
      try {
        const res = await axios.post(
          OPENROUTER_URL,
          {
            model: OPENROUTER_MODEL,
            messages,
            temperature: 0.8,
            stream: false,
          },
          {
            headers: {
              'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
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
        if (colaConsultas.length > 0) {
          const siguiente = colaConsultas.shift();
          siguiente();
        }
      }
    };

    if (consultasEnProceso < MAX_CONCURRENT_QUERIES) {
      ejecutar();
    } else {
      colaConsultas.push(ejecutar);
    }
  });
}

module.exports = { procesarConsultaIA, procesarConsultaIAExt };
