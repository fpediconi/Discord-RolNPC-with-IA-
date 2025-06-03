const { Client, GatewayIntentBits } = require('discord.js'); 
const {
  DISCORD_TOKEN,
  TARGET_CHANNEL_ID,
} = require('./config');

const memoryManager = require('./memoryManager');
const conversationManager = require('./conversationManager');
const filter = require('./filter');
const promptBuilder = require('./promptBuilder');
const iaClient = require('./iaClient');

const mensajeBuffer = {};
const AGRUPACION_DELAY_MS = 3000;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.conversationHistories = conversationManager.conversationHistories || new Map();

client.on('messageCreate', async (message) => {
  // Incorporar en el mensaje el nombre del usuario
  message.content = `${message.author.username} dice: ${message.content}`;
  if (message.channel.id !== TARGET_CHANNEL_ID) return;
  if (!filter.esMensajeValidoParaResponder(message, conversationManager)) return;

  const canalId = message.channel.id;
  const user = message.author;
  const content = message.content.trim();
  if (!content) return;

  // Mostrar que Vigo está escribiendo
  try {
    await message.channel.sendTyping();
  } catch (e) {
    console.warn('No se pudo enviar typing:', e);
  }

  if (!mensajeBuffer[canalId]) {
    mensajeBuffer[canalId] = {
      usuarioActual: user,
      mensajes: [content],
      timeout: setTimeout(() => {
        procesarMensajesAgrupados(canalId);
      }, AGRUPACION_DELAY_MS)
    };
  } else {
    const buffer = mensajeBuffer[canalId];

    if (buffer.usuarioActual !== user) {
      clearTimeout(buffer.timeout);
      await procesarMensajesAgrupados(canalId);

      mensajeBuffer[canalId] = {
        usuarioActual: user,
        mensajes: [content],
        timeout: setTimeout(() => {
          procesarMensajesAgrupados(canalId);
        }, AGRUPACION_DELAY_MS)
      };
    } else {
      buffer.mensajes.push(content);
      clearTimeout(buffer.timeout);
      buffer.timeout = setTimeout(() => {
        procesarMensajesAgrupados(canalId);
      }, AGRUPACION_DELAY_MS);
    }
  }
});

async function procesarMensajesAgrupados(canalId) {
  const buffer = mensajeBuffer[canalId];
  if (!buffer) return;

  const user = buffer.usuarioActual;
  const mensajesAgrupados = buffer.mensajes.join('\n');
  delete mensajeBuffer[canalId];

  memoryManager.actualizarMemoriaUsuario(canalId, user, mensajesAgrupados);
  conversationManager.agregarMensajeHistorial(canalId, user, 'user', mensajesAgrupados);

  const systemPrompt = promptBuilder.construirPromptSystem(
    canalId,
    conversationManager.conversationHistories,
    memoryManager.memoryData
  );

  const contextoGrupo = conversationManager.obtenerContextoParaCanal(canalId);
  const messages = [systemPrompt, ...contextoGrupo];

  try {
    const canal = await client.channels.fetch(canalId);
    if (canal?.sendTyping) canal.sendTyping();

    if (process.env.DEBUG === 'true') console.log('Enviando consulta a IA con mensajes agrupados:', messages);
    const respuesta = await iaClient.procesarConsultaIA(messages);
    conversationManager.agregarMensajeHistorial(canalId, user, 'assistant', respuesta);

    await canal.send(respuesta);
  } catch (e) {
    console.error('Error al procesar mensajes agrupados:', e);
  }
}

client.once('ready', () => {
  console.log(`Bot listo! Conectado como ${client.user.tag}`);
});

client.login(DISCORD_TOKEN);
