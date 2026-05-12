require("dotenv").config();
const { generateEntitySecretCiphertext } = require("@circle-fin/developer-controlled-wallets");
const fs = require("fs");
const https = require("https");

async function main() {
  const apiKey = process.env.CIRCLE_API_KEY;
  const newEntitySecret = process.env.CIRCLE_ENTITY_SECRET;
  const recoveryFilePath = process.env.CIRCLE_RECOVERY_FILE_PATH;
  if (!recoveryFilePath) throw new Error("Missing CIRCLE_RECOVERY_FILE_PATH in .env");
  const recoveryFile = fs.readFileSync(recoveryFilePath, "utf8").trim();

  console.log("Generating new ciphertext...");
  const ciphertext = await generateEntitySecretCiphertext({ apiKey, entitySecret: newEntitySecret });
  console.log("Ciphertext generated");

  const body = JSON.stringify({
    entitySecretCiphertext: ciphertext,
    recoveryFile: recoveryFile,
  });

  const options = {
    hostname: "api.circle.com",
    path: "/v1/w3s/config/entity/entitySecret/reset",
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    },
  };

  const result = await new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });

  console.log("Status:", result.status);
  console.log("Response:", result.body);

  if (result.status === 200) {
    const parsed = JSON.parse(result.body);
    const newRecovery = parsed.data?.recoveryFile;
    if (newRecovery) fs.writeFileSync("circle-recovery-new.dat", newRecovery);
    console.log("Done! Entity secret reset successfully.");
  }
}

main().catch(e => console.error("FAIL:", e.message));
