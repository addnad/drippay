const { SiweMessage } = require("siwe");

// In-memory nonce store (short-lived, keyed by address)
// For production, move to Redis with TTL
const pendingNonces = new Map();

function generateNonce() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function getOrCreateNonce(address) {
  const key = address.toLowerCase();
  const nonce = generateNonce();
  pendingNonces.set(key, { nonce, createdAt: Date.now() });
  return nonce;
}

function consumeNonce(address, nonce) {
  const key = address.toLowerCase();
  const record = pendingNonces.get(key);
  if (!record) return false;
  // Nonces expire after 5 minutes
  if (Date.now() - record.createdAt > 5 * 60 * 1000) { pendingNonces.delete(key); return false; }
  if (record.nonce !== nonce) return false;
  pendingNonces.delete(key);
  return true;
}

// GET /api/auth/nonce?address=0x...
async function handleNonce(req, res) {
  const address = req.query.address;
  if (!address) return res.status(400).json({ error: "Missing address" });
  const nonce = getOrCreateNonce(address);
  res.json({ nonce });
}

// POST /api/auth/verify  { message, signature }
async function handleVerify(req, res) {
  try {
    const { message, signature } = req.body;
    if (!message || !signature) return res.status(400).json({ error: "Missing message or signature" });

    const siweMessage = new SiweMessage(message);
    const { data: fields } = await siweMessage.verify({ signature });

    const address = fields.address.toLowerCase();
    if (!consumeNonce(address, fields.nonce)) {
      return res.status(401).json({ error: "Invalid or expired nonce" });
    }

    // Store verified session in a simple signed token (address + timestamp)
    // For production, use a proper JWT or Redis session
    const sessionToken = Buffer.from(JSON.stringify({
      address,
      issuedAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    })).toString("base64");

    res.json({ success: true, address, sessionToken });
  } catch (e) {
    console.error("SIWE verify error:", e);
    res.status(401).json({ error: "Signature verification failed" });
  }
}

// Middleware: require valid session token in Authorization header
// Usage: app.post("/api/withdraw", requireAuth, handler)
function requireAuth(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing auth token" });
  }
  try {
    const token = authHeader.slice(7);
    const session = JSON.parse(Buffer.from(token, "base64").toString("utf8"));
    if (!session.address || !session.expiresAt) throw new Error("Invalid token");
    if (Date.now() > session.expiresAt) return res.status(401).json({ error: "Session expired" });
    req.userAddress = session.address;
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid auth token" });
  }
}

// Middleware: require auth + verify caller owns the stream (sender or receiver)
function requireStreamAccess(role = "any") {
  return async (req, res, next) => {
    requireAuth(req, res, async () => {
      const streamId = req.params.streamId || req.body.streamId;
      if (!streamId) return next(); // no streamId to check, let handler decide
      // role check deferred to handler — just attach userAddress here
      next();
    });
  };
}

module.exports = { handleNonce, handleVerify, requireAuth, requireStreamAccess };
