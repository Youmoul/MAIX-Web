import { runRunPod } from "../../../lib/runpod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json();

    const {
      conversation = [],
      bpm = 92,
      duration = 20,
      reference_audio_base64,
      reference_filename = "reference.wav",
      reference_start = 0,
      reference_seconds = 10,
      latest_maestro_direction = "",
    } = body;

    if (!reference_audio_base64) {
      return Response.json(
        {
          type: "error",
          error: "MAIX B requires a reference song before SAMPLE generation.",
        },
        {
          status: 400,
        }
      );
    }

    const result = await runRunPod({
      action: "sample",
      command: "SAMPLE",
      conversation,
      bpm: Number(bpm),
      duration: Number(duration),
      reference_audio_base64,
      reference_filename,
      reference_start: Number(reference_start),
      reference_seconds: Number(reference_seconds),
      latest_maestro_direction,
    });

    if (result?.type === "error") {
      return Response.json(result, {
        status: 400,
      });
    }

    return Response.json(result);
  } catch (error) {
    console.error("MAIX sample error:", error);

    return Response.json(
      {
        type: "error",
        error: error?.message || "MAIX sample generation failed.",
      },
      {
        status: 500,
      }
    );
  }
}
