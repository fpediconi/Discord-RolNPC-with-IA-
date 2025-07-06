const fs = require('fs');
const path = require('path');
const axios = require('axios');
let Database;
try {
  Database = require('better-sqlite3');
} catch (e) {
  console.error('better-sqlite3 is not installed. Please run `npm install` to enable lore indexing.');
}

const DB_PATH = path.resolve(__dirname, 'data', 'runtime', 'lore.db');
const LORE_PATH = path.resolve(__dirname, 'data', 'lore.json');
const EMBEDDING_URL = process.env.OLLAMA_EMBEDDING_URL || 'http://localhost:11434/api/embeddings';
const EMBED_MODEL = process.env.EMBED_MODEL || 'nomic-embed-text';

function getFragments() {
  const lore = JSON.parse(fs.readFileSync(LORE_PATH, 'utf8'));
  let fragments = [];
  if (lore.ciudades) fragments.push(...lore.ciudades.map(c => `${c.nombre}: ${c.descripcion}`));
  if (lore.historia) fragments.push(...lore.historia);
  if (lore.culturas) fragments.push(...lore.culturas);
  return fragments;
}

async function generateEmbedding(text) {
  try {
    const res = await axios.post(EMBEDDING_URL, { model: EMBED_MODEL, prompt: text });
    return res.data.embedding;
  } catch (e) {
    console.error('Error generating embedding:', e.message);
    return null;
  }
}

function initDb() {
  if (!Database) return null;
  const db = new Database(DB_PATH);
  db.exec(`CREATE TABLE IF NOT EXISTS lore (id INTEGER PRIMARY KEY, fragment TEXT, embedding TEXT)`);
  return db;
}

async function indexLore() {
  const db = initDb();
  if (!db) return;
  const fragments = getFragments();
  const insert = db.prepare('INSERT INTO lore(fragment, embedding) VALUES (?, ?)');
  db.exec('DELETE FROM lore');
  for (const fragment of fragments) {
    const emb = await generateEmbedding(fragment);
    if (emb) insert.run(fragment, JSON.stringify(emb));
  }
  db.close();
}

function cosineSimilarity(a, b) {
  let dot = 0, ma = 0, mb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    ma += a[i] * a[i];
    mb += b[i] * b[i];
  }
  if (ma === 0 || mb === 0) return 0;
  return dot / (Math.sqrt(ma) * Math.sqrt(mb));
}

async function findRelevantLore(query, limit = 5) {
  if (!Database) return [];
  const db = new Database(DB_PATH, { readonly: true });
  if (!fs.existsSync(DB_PATH)) {
    db.close();
    return [];
  }
  const rows = db.prepare('SELECT fragment, embedding FROM lore').all();
  const queryEmb = await generateEmbedding(query);
  db.close();
  if (!queryEmb) return [];
  const ranked = rows.map(r => ({ fragment: r.fragment, sim: cosineSimilarity(queryEmb, JSON.parse(r.embedding)) }))
    .sort((a, b) => b.sim - a.sim)
    .slice(0, limit);
  return ranked.map(r => r.fragment);
}

if (require.main === module) {
  indexLore();
}

module.exports = { indexLore, findRelevantLore };
