import { runSync } from "../../../lib/runpod";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req) {
  try {
    const { conversation } = await req.json();
    const result = await runSync({ action: "chat", conversation });
    if (result.status !== "COMPLETED") throw new Error(result.error || `RunPod status: ${result.status}`);
    return Response.json(result.output);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
