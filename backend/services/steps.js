// ─── Steps Service (Redis-backed) ────────────────────────────────────────────

async function initSteps(streamId, stepIds, config = {}, redisGet, redisSet) {
  const key = `steps:${streamId}`;
  const existing = await redisGet(key);
  if (existing) return existing;
  const data = { steps: stepIds.map(id => ({ id, status: "pending", completedAt: null, config: config[id] || {} })) };
  await redisSet(key, data);
  return data;
}

async function getSteps(streamId, redisGet) {
  const key = `steps:${streamId}`;
  return await redisGet(key) || null;
}

async function completeStep(streamId, stepId, redisGet, redisSet) {
  const key = `steps:${streamId}`;
  const stream = await redisGet(key);
  if (!stream) return { success: false, reason: "Stream steps not initialized." };
  const idx = stream.steps.findIndex(s => s.id === stepId);
  if (idx === -1) return { success: false, reason: `Step "${stepId}" not found.` };
  for (let i = 0; i < idx; i++) {
    if (stream.steps[i].status !== "completed")
      return { success: false, reason: `Step "${stream.steps[i].id}" must be completed first.` };
  }
  stream.steps[idx].status = "completed";
  stream.steps[idx].completedAt = Date.now();
  await redisSet(key, stream);
  return { success: true, reason: `Step "${stepId}" completed.` };
}

async function failStep(streamId, stepId, redisGet, redisSet) {
  const key = `steps:${streamId}`;
  const stream = await redisGet(key);
  if (!stream) return;
  const step = stream.steps.find(s => s.id === stepId);
  if (step) { step.status = "failed"; step.completedAt = null; }
  await redisSet(key, stream);
}

async function resetStepAndAfter(streamId, stepId, redisGet, redisSet) {
  const key = `steps:${streamId}`;
  const stream = await redisGet(key);
  if (!stream) return;
  const idx = stream.steps.findIndex(s => s.id === stepId);
  if (idx === -1) return;
  for (let i = idx; i < stream.steps.length; i++) {
    stream.steps[i].status = "pending";
    stream.steps[i].completedAt = null;
  }
  await redisSet(key, stream);
}

async function allStepsComplete(streamId, redisGet) {
  const stream = await getSteps(streamId, redisGet);
  if (!stream) return false;
  return stream.steps.every(s => s.status === "completed");
}

async function nextPendingStep(streamId, redisGet) {
  const stream = await getSteps(streamId, redisGet);
  if (!stream) return null;
  return stream.steps.find(s => s.status !== "completed") || null;
}

module.exports = { initSteps, getSteps, completeStep, failStep, resetStepAndAfter, allStepsComplete, nextPendingStep };
