const fs = require('fs');
const path = require('path');

const { PERSONALITY_PATH, EVENTOS_PATH } = require('./config');
const memoryManager = require('./memoryManager');
const conversationManager = require('./conversationManager');

const vigoPersonality = JSON.parse(fs.readFileSync(path.resolve(__dirname, PERSONALITY_PATH), 'utf8'));
const eventos = JSON.parse(fs.readFileSync(path.resolve(__dirname, EVENTOS_PATH), 'utf8'));

function obtenerDiaEvento() {
  const dayNumber = new Date().getDate();
  const eventoDelDia = eventos.find(e => e.dia === (dayNumber % eventos.length));
  const clima = eventoDelDia?.clima || 'desconocido';
  const evento = eventoDelDia?.evento || 'Nada inusual ha ocurrido últimamente.';
  return { dayNumber, clima, evento };
}

// Estado ánimo según actividad reciente
function calcularAnimo(canalId, conversationHistories) {
  const historial = conversationHistories.get(canalId) || [];
  const msgsUltimos5min = historial.filter(m => Date.now() - m.timestamp < 1000 * 60 * 5).length;
  if (msgsUltimos5min > 20) return 8;
  if (msgsUltimos5min > 10) return 6;
  return 4;
}

// Relaciones sociales simuladas
function construirRelacionesSociales(canalId, memoryData) {
  if (!memoryData[canalId]) return '';
  const usuarios = Object.keys(memoryData[canalId]);
  if (usuarios.length === 0) return '';

  const amigos = usuarios.filter(user => {
    const msgs = memoryData[canalId][user] || [];
    const recientes = msgs.filter(m => Date.now() - m.timestamp < 1000 * 60 * 60 * 24);
    return recientes.length > 10;
  });

  if (amigos.length === 0) return '';

  return `Vigo considera amigos cercanos a: ${amigos.join(', ')}. `;
}

function construirPromptSystem(canalId, conversationHistories, memoryData) {
  const { dayNumber, clima, evento } = obtenerDiaEvento();
  const animo = calcularAnimo(canalId, conversationHistories);
  const relacionesSociales = construirRelacionesSociales(canalId, memoryData);

  const contenido = `
        [INSTRUCCIONES GENERALES]
        Eres un personaje ficticio de un juego MMORPG llamado FuriusAO y tu nombre es ${vigoPersonality.nombre}.
        Tu objetivo: ${vigoPersonality.objetivo}. 

        [PERSONALIDAD]
        - Profesión: ${vigoPersonality.contexto} 
        - Ubicación actual: ${vigoPersonality.estado.ubicacion} 
        - No sabe de: ${vigoPersonality.habla.conocimientosExternos} 
        - Si sabe de: ${vigoPersonality.habla.conocimientosInternos} 
        - Teme a: ${vigoPersonality.emociones.temores} 
        - Odia a: ${vigoPersonality.emociones.odios} 
        - Le gusta: ${vigoPersonality.emociones.gustos} 
        - Ama a: ${vigoPersonality.emociones.adora} 

        [ESTADO ACTUAL]
        - Ánimo: ${animo} de 10 donde 10 es de excelente humor \n
        - Día: ${dayNumber} \n
        - Clima: ${clima} \n
        - Evento reciente: ${evento} \n

        [RELACIONES]
        ${relacionesSociales || 'No tiene amigos cercanos en este momento.'} 

        [REGLAS]
        - Habla como: ${vigoPersonality.habla.estilo} 
        - Usa de manera ocasional: ${vigoPersonality.habla.lenguaje} 
        - Responde de manera: ${vigoPersonality.condiciones.respuesta} 
        - Se explaya si:  ${vigoPersonality.condiciones.reaccion} 
        - Nunca jamas:  ${vigoPersonality.condiciones.consistencia} 
  `.trim();

  return {
    role: 'system',
    content: contenido
  };
}


module.exports = { construirPromptSystem };
