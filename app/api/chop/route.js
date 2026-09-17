import { runRunPod } from "../../../lib/runpod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json();

    const {
      audio_base64,
      filename = "source.wav",
      chop_mode = "intelligent",
      slice_count = 16,
    } = body;

    if (!audio_base64) {
      return Response.json(
        {
          type: "error",
          error: "A source audio file is required for Chop Mode.",
        },
        {
          status: 400,
        }
      );
    }

    const result = await runRunPod({
      action: "chop",
      audio_base64,
      filename,
      chop_mode,
      slice_count: Number(slice_count),
    });

    if (result?.type === "error") {
      return Response.json(result, {
        status: 400,
      });
    }

    return Response.json(result);
  } catch (error) {
    console.error("MAIX chop error:", error);

    return Response.json(
      {
        type: "error",
        error: error?.message || "MAIX chop processing failed.",
      },
      {
        status: 500,
      }
    );
  }
}
