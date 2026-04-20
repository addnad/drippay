const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

async function reviewLinkProof(proofInstructions, submittedLink) {
  if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY not set");

  const prompt = `You are Flowra, an autonomous payment agent. A receiver has submitted a link as proof of work.

Sender's instructions: "${proofInstructions}"
Submitted link: "${submittedLink}"

Evaluate if this link fulfills the sender's requirements. Respond with ONLY a JSON object like:
{"verdict": "approved", "reason": "The link points to a GitHub repository as required"}
or
{"verdict": "rejected", "reason": "The link does not match the required proof type"}

Only respond with the JSON object, no other text.`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://agentflowra.xyz",
      "X-Title": "Flowra Agent"
    },
    body: JSON.stringify({
      model: "google/gemini-2.0-flash-001",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
      temperature: 0.1
    })
  });

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("No response from AI");

  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

module.exports = { reviewLinkProof };
