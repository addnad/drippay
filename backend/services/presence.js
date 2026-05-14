// ─── Presence Service (Redis-backed) ─────────────────────────────────────────

async function recordCheckIn(streamId, receiverAddress, redisGet, redisSet) {
  const key = `presence:${streamId}:${receiverAddress.toLowerCase()}`;
  const existing = await redisGet(key);
  if (!existing || existing.exited) {
    await redisSet(key, { checkInTime: Date.now(), exited: false });
  }
  return await redisGet(key);
}

async function recordExit(streamId, receiverAddress, redisGet, redisSet) {
  const key = `presence:${streamId}:${receiverAddress.toLowerCase()}`;
  await redisSet(key, { checkInTime: null, exited: true });
}

async function checkPresenceDuration(streamId, receiverAddress, requiredDurationMs, redisGet) {
  const key = `presence:${streamId}:${receiverAddress.toLowerCase()}`;
  const record = await redisGet(key);
  if (!record || record.exited || !record.checkInTime)
    return { met: false, timeInZoneMs: 0, remainingMs: requiredDurationMs };
  const timeInZoneMs = Date.now() - record.checkInTime;
  const met = timeInZoneMs >= requiredDurationMs;
  return { met, timeInZoneMs, remainingMs: met ? 0 : requiredDurationMs - timeInZoneMs };
}

async function getPresence(streamId, receiverAddress, redisGet) {
  const key = `presence:${streamId}:${receiverAddress.toLowerCase()}`;
  return await redisGet(key) || null;
}

module.exports = { recordCheckIn, recordExit, checkPresenceDuration, getPresence };
