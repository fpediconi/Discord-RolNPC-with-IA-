const fs = require('fs');
const path = require('path');

const { loadConfig } = require('./config');
const memoryManager = require('./memoryManager');
const conversationManager = require('./conversationManager');



function obtenerDiaEvento(eventos) {
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

  return `${process.env.PERSONALITY_NAME} considera amigos cercanos a: ${amigos.join(', ')}. `;
}

function construirPromptSystem(canalId, conversationHistories, memoryData, config) {
  const personality = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, config.PERSONALITY_PATH), 'utf8')
  );

  const eventos = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, config.EVENTOS_PATH), 'utf8')
  );

  const { dayNumber, clima, evento } = obtenerDiaEvento(eventos);

  const lore = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, 'data/lore.json'), 'utf8')
  );

  let fragmentos = [];
  if (lore.ciudades) fragmentos.push(...lore.ciudades.map(c => `${c.nombre}: ${c.descripcion}`));
  if (lore.historia) fragmentos.push(...lore.historia);
  if (lore.culturas) fragmentos.push(...lore.culturas);

  const conocimientoMundo = `Conocimiento del mundo de Banderbill:\n- ${fragmentos.slice(0, 10).join('\n- ')}\n\n`;

  const animo = calcularAnimo(canalId, conversationHistories);
  const relacionesSociales = construirRelacionesSociales(canalId, memoryData);

  const contenido = `
        [INSTRUCCIONES GENERALES]
        Eres un personaje ficticio de un juego MMORPG llamado FuriusAO y tu nombre es ${personality.nombre}.
        Tu objetivo: ${personality.objetivo}. 

        [PERSONALIDAD]
        - Profesión: ${personality.contexto} 
        - Ubicación actual: ${personality.estado.ubicacion} 
        - No sabe de: ${personality.habla.conocimientosExternos} 
        - Si sabe de: ${personality.habla.conocimientosInternos} 
        - Teme a: ${personality.emociones.temores} 
        - Odia a: ${personality.emociones.odios} 
        - Le gusta: ${personality.emociones.gustos} 
        - Ama a: ${personality.emociones.adora} 

        [ESTADO ACTUAL]
        - Ánimo: ${animo} de 10 donde 10 es de excelente humor \n
        - Día: ${dayNumber} \n
        - Clima: ${clima} \n
        - Evento reciente: ${evento} \n

        [RELACIONES]
        ${relacionesSociales || 'No tiene amigos cercanos en este momento.'} 

        [REGLAS]
        - Habla como: ${personality.habla.estilo} 
        - Usa de manera ocasional: ${personality.habla.lenguaje} 
        - Responde de manera: ${personality.condiciones.respuesta} 
        - Se explaya si:  ${personality.condiciones.reaccion} 
        - Nunca jamas:  ${personality.condiciones.consistencia} 
  `.trim();

  if (process.env.DEBUG === 'true') console.log(`Construyendo prompt system para canal ${canalId}:\n${contenido}`);
  return {
    role: 'system',
    content: contenido
  };
}


module.exports = { construirPromptSystem };