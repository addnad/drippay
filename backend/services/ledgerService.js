// All balances stored as integer micro-USDC strings (1 USDC = 1_000_000 units)
// Input amounts are decimal strings e.g. "1.5" (USDC), converted to BigInt internally

function toMicro(amount) {
  if (typeof amount === "bigint") return amount;
  const str = String(amount);
  const [whole, frac = ""] = str.split(".");
  const fracPadded = (frac + "000000").slice(0, 6);
  return BigInt(whole) * 1_000_000n + BigInt(fracPadded);
}

function fromMicro(micro) {
  const m = BigInt(micro);
  const whole = m / 1_000_000n;
  const frac = (m % 1_000_000n).toString().padStart(6, "0");
  return `${whole}.${frac}`;
}

async function getBalance(userId, redisGet) {
  const key = `ledger:${userId.toLowerCase()}`;
  const record = await redisGet(key);
  return record || { available: "0", locked: "0" };
}

async function credit(userId, amount, redisGet, redisSet) {
  const key = `ledger:${userId.toLowerCase()}`;
  const record = await getBalance(userId, redisGet);
  const newAvailable = toMicro(record.available) + toMicro(amount);
  const updated = { available: newAvailable.toString(), locked: record.locked };
  await redisSet(key, updated);
  return { available: fromMicro(newAvailable), locked: fromMicro(record.locked) };
}

async function debit(userId, amount, redisGet, redisSet) {
  const key = `ledger:${userId.toLowerCase()}`;
  const record = await getBalance(userId, redisGet);
  const current = toMicro(record.available);
  const debitAmount = toMicro(amount);
  if (current < debitAmount) throw new Error("Insufficient balance");
  const newAvailable = current - debitAmount;
  const updated = { available: newAvailable.toString(), locked: record.locked };
  await redisSet(key, updated);
  return { available: fromMicro(newAvailable), locked: fromMicro(record.locked) };
}

async function lock(userId, amount, redisGet, redisSet) {
  const key = `ledger:${userId.toLowerCase()}`;
  const record = await getBalance(userId, redisGet);
  const current = toMicro(record.available);
  const lockAmount = toMicro(amount);
  if (current < lockAmount) throw new Error("Insufficient balance to lock");
  const newAvailable = current - lockAmount;
  const newLocked = toMicro(record.locked) + lockAmount;
  const updated = { available: newAvailable.toString(), locked: newLocked.toString() };
  await redisSet(key, updated);
  return { available: fromMicro(newAvailable), locked: fromMicro(newLocked) };
}

async function unlock(userId, amount, redisGet, redisSet) {
  const key = `ledger:${userId.toLowerCase()}`;
  const record = await getBalance(userId, redisGet);
  const currentLocked = toMicro(record.locked);
  const unlockAmount = toMicro(amount);
  if (currentLocked < unlockAmount) throw new Error("Insufficient locked balance");
  const newLocked = currentLocked - unlockAmount;
  const newAvailable = toMicro(record.available) + unlockAmount;
  const updated = { available: newAvailable.toString(), locked: newLocked.toString() };
  await redisSet(key, updated);
  return { available: fromMicro(newAvailable), locked: fromMicro(newLocked) };
}

module.exports = { getBalance, credit, debit, lock, unlock };
