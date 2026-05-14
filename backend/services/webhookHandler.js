const crypto = require("crypto");
const ledger = require("./ledgerService");

const processedEvents = new Set();

function verifyCircleSignature(rawBody, signature, publicKey) {
  if (!publicKey) {
    console.warn("CIRCLE_WEBHOOK_PUBLIC_KEY not set — skipping signature verification");
    return true; // fail open until key is configured; set to false in production
  }
  if (!signature) return false;
  try {
    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(rawBody);
    return verifier.verify(publicKey, signature, "base64");
  } catch (e) {
    console.error("Webhook signature verification error:", e.message);
    return false;
  }
}

async function handleCircleWebhook(rawBody, signature, redisGet, redisSet) {
  const publicKey = process.env.CIRCLE_WEBHOOK_PUBLIC_KEY;

  if (!verifyCircleSignature(rawBody, signature, publicKey)) {
    return { error: "Invalid webhook signature", status: 401 };
  }

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch (e) {
    return { error: "Invalid JSON body", status: 400 };
  }

  const { notificationType, transfer } = body;

  if (!notificationType || !transfer) return { ignored: true };

  // idempotency — skip already processed events
  const eventKey = `webhook:${transfer.id}`;
  if (processedEvents.has(eventKey)) return { duplicate: true };
  const alreadyProcessed = await redisGet(eventKey);
  if (alreadyProcessed) return { duplicate: true };

  processedEvents.add(eventKey);
  await redisSet(eventKey, { processedAt: Date.now() });

  if (notificationType === "transfers.complete") {
    const { destination, amount } = transfer;
    if (!destination?.address || !amount?.amount) return { error: "Missing transfer fields" };

    const userId = await redisGet(`depositAddress:${destination.address.toLowerCase()}`);
    if (!userId) {
      console.log("Webhook: unknown deposit address", destination.address);
      return { ignored: true };
    }

    await ledger.credit(userId, amount.amount, redisGet, redisSet);
    console.log(`Webhook: credited ${amount.amount} USDC to ${userId}`);
    return { credited: true, userId, amount: amount.amount };
  }

  if (notificationType === "transfers.failed") {
    console.log("Webhook: transfer failed", transfer.id);
    return { failed: true };
  }

  return { ignored: true };
}

module.exports = { handleCircleWebhook };
