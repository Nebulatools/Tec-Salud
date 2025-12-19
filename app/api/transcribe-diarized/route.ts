import { NextRequest, NextResponse } from "next/server"
import Replicate from "replicate"

const WHISPER_DIARIZATION_VERSION =
  "1495a9cddc83b2203b0d8d3516e38b80fd1572ebc4bc5700ac1da56a9b3ed886"

interface WhisperSegment {
  start: number
  end: number
  text: string
  speaker: string
  words?: Array<{
    word: string
    probability: number
  }>
}

interface WhisperDiarizationOutput {
  language: string
  num_speakers: number
  segments: WhisperSegment[]
}

/**
 * Formats segments into a single text with speaker labels
 */
function formatFullText(segments: WhisperSegment[]): string {
  const lines: string[] = []
  let currentSpeaker: string | null = null

  for (const segment of segments) {
    // Add speaker label when speaker changes
    if (segment.speaker !== currentSpeaker) {
      const speakerLabel = segment.speaker.replace("SPEAKER_", "Speaker ")
      lines.push(`\n[${speakerLabel}]:`)
      currentSpeaker = segment.speaker
    }
    lines.push(segment.text.trim())
  }

  return lines.join(" ").trim()
}

export async function POST(request: NextRequest) {
  console.log("=== TRANSCRIBE-DIARIZED API CALLED ===")

  try {
    // Verify API token
    if (!process.env.REPLICATE_API_TOKEN) {
      console.error("REPLICATE_API_TOKEN not found in environment")
      return NextResponse.json(
        { error: "Server configuration error: Missing Replicate API token" },
        { status: 500 }
      )
    }

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    })

    const formData = await request.formData()
    const audioFile = formData.get("audio") as File

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      )
    }

    console.log("Audio file received:", {
      name: audioFile.name,
      type: audioFile.type,
      size: `${(audioFile.size / 1024).toFixed(2)} KB`,
    })

    // Convert audio to base64 data URI for Replicate
    const arrayBuffer = await audioFile.arrayBuffer()
    const base64Audio = Buffer.from(arrayBuffer).toString("base64")
    const mimeType = audioFile.type || "audio/webm"
    const dataUri = `data:${mimeType};base64,${base64Audio}`

    console.log("Calling Replicate whisper-diarization...")
    console.log("Model version:", WHISPER_DIARIZATION_VERSION)

    // Call Replicate
    const output = (await replicate.run(
      `thomasmol/whisper-diarization:${WHISPER_DIARIZATION_VERSION}`,
      {
        input: {
          file: dataUri,
          language: "es",
          num_speakers: 2,
          group_segments: true,
          translate: false,
          prompt: "", // Empty for now, can be customized per doctor later
        },
      }
    )) as WhisperDiarizationOutput

    console.log("Replicate response received:", {
      language: output.language,
      num_speakers: output.num_speakers,
      segments_count: output.segments?.length || 0,
    })

    // Validate output
    if (!output || !output.segments) {
      console.error("Invalid output from Replicate:", output)
      return NextResponse.json(
        { error: "Invalid response from transcription service" },
        { status: 500 }
      )
    }

    // Format full text with speaker labels
    const fullText = formatFullText(output.segments)

    const result = {
      language: output.language,
      num_speakers: output.num_speakers,
      segments: output.segments.map((seg) => ({
        start: seg.start,
        end: seg.end,
        text: seg.text,
        speaker: seg.speaker,
        words: seg.words || [], // Preserve word-level confidence data for validation UI
      })),
      fullText,
    }

    console.log("Transcription completed successfully")
    console.log("Full text preview:", fullText.substring(0, 200) + "...")

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error in transcribe-diarized API:", error)

    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes("Invalid API token")) {
        return NextResponse.json(
          { error: "Invalid Replicate API token. Please check your configuration." },
          { status: 401 }
        )
      }
      if (error.message.includes("rate limit")) {
        return NextResponse.json(
          { error: "Rate limit exceeded. Please try again in a moment." },
          { status: 429 }
        )
      }
    }

    return NextResponse.json(
      {
        error: "Transcription failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
