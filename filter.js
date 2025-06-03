const { TARGET_CHANNEL_ID, IGNORAR_COOLDOWN_CHANNELS = [] } = require('./config');

function hayDialogoRecienteConUsuario(message, historial) {
  const now = Date.now();
  const mensajesRecientes = historial.slice(-6).reverse();
  if (process.env.DEBUG === 'true') console.log(`[DEBUG] Revisando últimos ${mensajesRecientes.length} mensajes para detectar diálogo reciente.`);
  
  for (let i = 0; i < mensajesRecientes.length - 1; i++) {
    const anterior = mensajesRecientes[i];
    const actual = mensajesRecientes[i + 1];

    if (!actual || !anterior || !actual.role || !anterior.role) continue;
    const esUsuario = actual.role === 'user' && actual.userId === message.author.id;

    const esBot = anterior.role === 'assistant';
    if (process.env.DEBUG === 'true') console.log(`[DEBUG] Revisando mensaje: ${actual.content} (Usuario: ${esUsuario}, Bot: ${esBot})`);
    
    if (esUsuario && esBot && now - anterior.timestamp < 1000 * 60 * 2) {
      return true;
    }
  }
  return false;
}

function esMensajeValidoParaResponder(message, conversationManager) {
  if (message.author.bot) return false;

  const channelId = message.channel.id;
  if (channelId !== TARGET_CHANNEL_ID && !IGNORAR_COOLDOWN_CHANNELS.includes(channelId)) return false;

  const texto = message.content.toLowerCase().trim();
  if (!texto || texto.length < 3) return false;
  if (texto.startsWith('!') || texto.startsWith('/')) return false;
  if (texto.includes('http') || texto.includes('www.')) return false;
  if (/^[{}\s.,;!?¡¿'"«»]+$/u.test(texto)) return false;

  if (process.env.DEBUG === 'true') console.log(`[DEBUG] Mensaje de ${message.author.username}: "${texto}"`);

  const palabrasClave = ['vigo', 'nix', 'pesca', 'caña', 'pescador', 'pescadora', 'pesca deportiva', 'pesca con caña', 'pesca en vigo'];
  const mencionaBot = message.mentions.has(message.client.user);
  const contienePalabraClave = palabrasClave.some(p => texto.includes(p));

  const historial = conversationManager.conversationHistories.get(channelId) || [];
  if (process.env.DEBUG === 'true') console.log(`[DEBUG] Canal: ${channelId}, Historial: ${historial.length} mensajes`);
  const canalIgnoraCooldown = IGNORAR_COOLDOWN_CHANNELS.includes(channelId);
  const dialogoEnCurso = hayDialogoRecienteConUsuario(message, historial);
  if (process.env.DEBUG === 'true') console.log(`[DEBUG] Canal: Dialogo en curso: ${dialogoEnCurso}`);

  return (
    mencionaBot ||
    contienePalabraClave ||
    canalIgnoraCooldown ||
    dialogoEnCurso
  );
}

module.exports = { esMensajeValidoParaResponder };
