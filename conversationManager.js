

const conversationHistories = new Map(); // canalId => [{author, content, timestamp, role}]

function agregarMensajeHistorial(canalId, author, role, content, config) {
  if (!conversationHistories.has(canalId)) conversationHistories.set(canalId, []);
  const historial = conversationHistories.get(canalId);
  
  historial.push({
    author,
    userId: author.id,
    content,
    timestamp: Date.now(),
    role,
  });

  if (historial.length > config.MAX_HISTORY_MESSAGES) {
    conversationHistories.set(canalId, historial.slice(- config.MAX_HISTORY_MESSAGES));
  }
}

// Obtener contexto filtrado para prompt (últimos 30 mensajes)
function obtenerContextoParaCanal(canalId) {
  const historial = conversationHistories.get(canalId) || [];
  return historial
    .filter(m =>
      m.role === 'assistant' ||
      m.content.toLowerCase().includes(`${process.env.PERSONALITY_NAME}`) ||
      m.role === 'user'
    )
    .slice(-30)
    .map(m => ({ role: m.role, content: m.content }));
}

module.exports = {
  conversationHistories,
  agregarMensajeHistorial,
  obtenerContextoParaCanal,
};
