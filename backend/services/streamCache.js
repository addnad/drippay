// ─── Stream Cache Service ─────────────────────────────────────────────────────
// Caches discovered stream IDs so the frontend never rescans the chain.
// On first load: frontend scans chain, posts found IDs here.
// On subsequent loads: frontend fetches from here instantly.

const fs = require("fs");
const path = require("path");
const CACHE_PATH = path.join(__dirname, "../stream-cache.json");

function read() {
  if (!fs.existsSync(CACHE_PATH)) return { streamIds: [], lastScannedBlock: 35141291 };
  return JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"));
}

function write(data) { fs.writeFileSync(CACHE_PATH, JSON.stringify(data, null, 2)); }

function getCache() { return read(); }

function updateCache(streamIds, lastScannedBlock) {
  const db = read();
  // Merge new IDs with existing, deduplicate
  const merged = [...new Set([...db.streamIds, ...streamIds.map(String)])];
  write({ streamIds: merged, lastScannedBlock });
  return { streamIds: merged, lastScannedBlock };
}

module.exports = { getCache, updateCache };
