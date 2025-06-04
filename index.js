const { Client, GatewayIntentBits } = require('discord.js'); 
const Config = require('./config');
const config = new Config();

const express = require('express');
const memoryManager = require('./memoryManager');
memoryManager.cargarMemoria(config);
const conversationManager = require('./conversationManager');
const filter = require('./filter');
const promptBuilder = require('./promptBuilder');
const iaClient = require('./iaClient');

const mensajeBuffer = {};
const AGRUPACION_DELAY_MS = 3000;
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send(proces`${process.env.PERSONALITY_NAME} está despierto.`));
app.listen(PORT, () => console.log(`Servidor web falso activo en puerto ${PORT}`));

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
  if (process.env.DEBUG === 'true') console.log(`Mensaje recibido en canal ${message.channel.id} de ${message.author.username}: ${message.content}`);
  if (filter.esMensajeValidoParaResponder(message, conversationManager, config)) {
    const canalId = message.channel.id;
    const user = message.author;
    const content = message.content.trim();
    if (content) {
      // Mostrar que está escribiendo
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
    }
    
  }else {
    if (process.env.DEBUG === 'true') console.log(`Mensaje ignorado en canal ${message.channel.id} de ${message.author.username}: ${message.content}`); 
  }
});

async function procesarMensajesAgrupados(canalId) {
  const buffer = mensajeBuffer[canalId];
  if (!buffer) return;

  const user = buffer.usuarioActual;
  const mensajesAgrupados = buffer.mensajes.join('\n');
  delete mensajeBuffer[canalId];

  memoryManager.actualizarMemoriaUsuario(canalId, user, mensajesAgrupados, config);
  conversationManager.agregarMensajeHistorial(canalId, user, 'user', mensajesAgrupados, config);

  const systemPrompt = promptBuilder.construirPromptSystem(
    canalId,
    conversationManager.conversationHistories,
    memoryManager.memoryData,
    config
  );

  const contextoGrupo = conversationManager.obtenerContextoParaCanal(canalId);
  const messages = [systemPrompt, ...contextoGrupo];

  try {
    const canal = await client.channels.fetch(canalId);
    if (canal?.sendTyping) canal.sendTyping();

    if (process.env.DEBUG === 'true') console.log('Enviando consulta a IA con mensajes agrupados:', messages);
    const respuesta = await iaClient.procesarConsultaIA(messages, config);
    conversationManager.agregarMensajeHistorial(canalId, user, 'assistant', respuesta, config);

    await canal.send(respuesta);
  } catch (e) {
    console.error('Error al procesar mensajes agrupados:', e);
  }
}

client.once('ready', () => {
  console.log(`Bot listo! Conectado como ${client.user.tag}`);
  config.cargar();
});

client.login(process.env.DISCORD_TOKEN);
