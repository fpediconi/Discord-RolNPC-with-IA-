const fs = require('fs');
const { MEMORY_PATH, MAX_MEMORY_MESSAGES_PER_USER } = require('./config');

let memoryData = {};

function cargarMemoria() {
  try {
    if (fs.existsSync(MEMORY_PATH)) {
      memoryData = JSON.parse(fs.readFileSync(MEMORY_PATH, 'utf8'));
    }
  } catch {
    memoryData = {};
  }
}

function guardarMemoria() {
  try {
    fs.writeFileSync(MEMORY_PATH, JSON.stringify(memoryData, null, 2));
  } catch (e) {
    console.error('Error guardando memoria:', e);
  }
}

// Añadir dato de usuario en memoria con timestamp
function actualizarMemoriaUsuario(canalId, user, dato) {
  if (!memoryData[canalId]) memoryData[canalId] = {};
  if (!memoryData[canalId][user]) memoryData[canalId][user] = [];
  memoryData[canalId][user].push({ text: dato, timestamp: Date.now() });
  if (memoryData[canalId][user].length > MAX_MEMORY_MESSAGES_PER_USER) {
    memoryData[canalId][user] = memoryData[canalId][user].slice(-MAX_MEMORY_MESSAGES_PER_USER);
  }
  guardarMemoria();
}

// Limpieza periódica de datos > 7 días
function limpiarMemoriaAntigua() {
  const ahora = Date.now();
  const sieteDias = 1000 * 60 * 60 * 24 * 7;
  for (const canalId in memoryData) {
    for (const user in memoryData[canalId]) {
      memoryData[canalId][user] = memoryData[canalId][user].filter(
        entry => ahora - entry.timestamp < sieteDias
      );
      if (memoryData[canalId][user].length === 0) delete memoryData[canalId][user];
    }
    if (Object.keys(memoryData[canalId]).length === 0) delete memoryData[canalId];
  }
  guardarMemoria();
}

cargarMemoria();
setInterval(limpiarMemoriaAntigua, 1000 * 60 * 60); // limpiar cada hora

module.exports = {
  actualizarMemoriaUsuario,
  limpiarMemoriaAntigua,
  memoryData,
};
