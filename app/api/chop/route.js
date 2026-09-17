import { submitJob, jobStatus } from "../../../../lib/runpod";

export const runtime = "nodejs";
export const maxDuration = 300;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req) {
  try {
    const body = await req.json();
    if (!body.audio_base64) {
      return Response.json({ error: "An input song is required for CHOP." }, { status: 400 });
    }

    const submitted = await submitJob({
      action: "chop",
      audio_base64: body.audio_base64,
      filename: body.filename || "input.wav",
      chop_mode: body.chop_mode === "equal" ? "equal" : "intelligent",
      slice_count: Number(body.slice_count || 16),
    });

    if (!submitted.id) throw new Error("RunPod did not return a job id");

    const deadline = Date.now() + 290000;
    while (Date.now() < deadline) {
      const status = await jobStatus(submitted.id);
      if (status.status === "COMPLETED") return Response.json(status.output);
      if (["FAILED", "CANCELLED", "TIMED_OUT"].includes(status.status)) {
        throw new Error(status.error || `RunPod job ${status.status}`);
      }
      await sleep(1500);
    }
    throw new Error("Chop is still running. Web request timed out before RunPod finished.");
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
