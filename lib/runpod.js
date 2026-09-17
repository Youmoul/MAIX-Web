const BASE = "https://api.runpod.ai/v2";

function config() {
  const endpoint = process.env.RUNPOD_ENDPOINT_ID;
  const key = process.env.RUNPOD_API_KEY;
  if (!endpoint || !key) throw new Error("Missing RUNPOD_ENDPOINT_ID or RUNPOD_API_KEY");
  return { endpoint, key };
}

export async function runSync(input) {
  const { endpoint, key } = config();
  const res = await fetch(`${BASE}/${endpoint}/runsync`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ input }),
    cache: "no-store"
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `RunPod HTTP ${res.status}`);
  return data;
}

export async function submitJob(input) {
  const { endpoint, key } = config();
  const res = await fetch(`${BASE}/${endpoint}/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ input }),
    cache: "no-store"
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `RunPod HTTP ${res.status}`);
  return data;
}

export async function jobStatus(id) {
  const { endpoint, key } = config();
  const res = await fetch(`${BASE}/${endpoint}/status/${id}`, {
    headers: { Authorization: `Bearer ${key}` }, cache: "no-store"
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `RunPod HTTP ${res.status}`);
  return data;
}
