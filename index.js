async function triggerFlowraVerification(streamId) {
  try {
    const proof = proofs.find(p => p.streamId === streamId);
    if (!proof) throw new Error("Proof not found");

    console.log(`Flowra reviewing stream ${streamId}...`);

    const prompt = `
Return ONLY valid JSON:

{
  "valid": true or false,
  "reason": "short explanation"
}

Proof:
${proof.proofContent}
`;

    const result = await model.generateContent(prompt);

    console.log("RAW GEMINI RESPONSE:", JSON.stringify(result, null, 2));

    const aiText =
      result?.response?.candidates?.[0]?.content?.parts?.[0]?.text ||
      result?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiText) {
      throw new Error("Empty Gemini response");
    }

    let parsed;
    try {
      parsed = JSON.parse(aiText);
    } catch (e) {
      console.error("Failed to parse JSON:", aiText);
      throw new Error("Invalid Gemini JSON format");
    }

    proof.aiVerdict = parsed.valid ? "approved" : "rejected";
    proof.status = "reviewed";
    proof.senderNote = parsed.reason || "";

    console.log(`Flowra verdict for ${streamId}:`, proof.aiVerdict);

  } catch (err) {
    console.error("Flowra trigger error:", err.message);
  }
}