import { submitJob, jobStatus } from "../../../../lib/runpod";

export const runtime = "nodejs";
export const maxDuration = 300;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req) {
  try {
    const body = await req.json();
    if (!body.reference_audio_base64) {
      return Response.json({ error: "A reference song is required for SAMPLE." }, { status: 400 });
    }

    const submitted = await submitJob({
      action: "sample",
      command: "SAMPLE",
      conversation: body.conversation || [],
      bpm: Number(body.bpm || 92),
      duration: Number(body.duration || 20),
      reference_audio_base64: body.reference_audio_base64,
      reference_filename: body.reference_filename || "reference.wav",
      reference_start: Number(body.reference_start || 0),
      reference_seconds: Number(body.reference_seconds || 10),
      latest_maestro_direction: body.latest_maestro_direction || "",
    });

    if (!submitted.id) throw new Error("RunPod did not return a job id");

    const deadline = Date.now() + 290000;
    while (Date.now() < deadline) {
      const status = await jobStatus(submitted.id);
      if (status.status === "COMPLETED") return Response.json(status.output);
      if (["FAILED", "CANCELLED", "TIMED_OUT"].includes(status.status)) {
        throw new Error(status.error || `RunPod job ${status.status}`);
      }
      await sleep(2000);
    }
    throw new Error("Sample is still running. Web request timed out before RunPod finished.");
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
