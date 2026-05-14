// ─── Stream Cache Service (Redis-backed) ─────────────────────────────────────
// Caches discovered stream IDs so the frontend never rescans the chain.

const DEFAULT_BLOCK = 35141291;

async function getCache(redisGet) {
  const data = await redisGet("streamCache");
  return data || { streamIds: [], lastScannedBlock: DEFAULT_BLOCK };
}

async function updateCache(streamIds, lastScannedBlock, redisGet, redisSet) {
  const db = await getCache(redisGet);
  const merged = [...new Set([...db.streamIds, ...streamIds.map(String)])];
  await redisSet("streamCache", { streamIds: merged, lastScannedBlock });
  return { streamIds: merged, lastScannedBlock };
}

module.exports = { getCache, updateCache };
