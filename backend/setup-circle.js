require("dotenv").config();
const { registerEntitySecretCiphertext } = require("@circle-fin/developer-controlled-wallets");
const fs = require("fs");

async function main() {
  const apiKey = process.env.CIRCLE_API_KEY;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;

  if (!apiKey) throw new Error("Missing CIRCLE_API_KEY in .env");
  if (!entitySecret) throw new Error("Missing CIRCLE_ENTITY_SECRET in .env");

  console.log("Registering Entity Secret with Circle...");
  const response = await registerEntitySecretCiphertext({ apiKey, entitySecret });

  const recoveryFile = response.data?.recoveryFile;
  if (recoveryFile) {
    fs.writeFileSync("circle-recovery.dat", recoveryFile);
    console.log("Recovery file saved to: circle-recovery.dat");
  }

  console.log("Done! CIRCLE_ENTITY_SECRET is already set in .env");
}

main().catch(console.error);
