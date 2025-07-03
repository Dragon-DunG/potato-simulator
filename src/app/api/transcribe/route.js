import { SpeechClient } from "@google-cloud/speech";
import fs from "fs";
import path from "path";

export const config = {
  api: {
    bodyParser: false, // Next.js 기본 bodyParser 비활성화
  },
};

const speechClient = new SpeechClient({
  credentials: {
    client_email: process.env.GOOGLE_APPLICATION_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_APPLICATION_PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
  projectId: process.env.GOOGLE_APPLICATION_PROJECT_ID,
}
);

async function isSpeechClientValid() {
  try {
    await speechClient.getProjectId();
    return true;
  } catch (error) {
    console.error("SpeechClient is not valid:", error);
    return false;
  }
}

export async function POST(req) {
  // Google Speech-to-Text 클라이언트 유효성 검사
  const isValidClient = await isSpeechClientValid();
  if (!isValidClient) {
    return new Response(JSON.stringify({ error: "Invalid Google Speech-to-Text client" }), { status: 500 });
  }

  // 1. 요청 본문에서 오디오 데이터 읽기
  try {
    const chunks = [];
    for await (const chunk of req.body) {
      chunks.push(chunk);
    }
    const audioBuffer = Buffer.concat(chunks);  

    if (audioBuffer.length === 0) {
      throw new Error("Audio buffer is empty");
    }

    // Google Speech-to-Text API 호출
    const audioBytes = audioBuffer.toString("base64");

    if (!audioBytes) {
      throw new Error("Audio bytes are empty");
    }

    const request = {
      audio: {
        content: audioBytes,
      },
      config: {
        encoding: "WEBM_OPUS",
        sampleRateHertz: 48000,
        languageCode: "ko-KR", // 한국어 설정
      },
    };

    const [operation] = await speechClient.longRunningRecognize(request);
    const [response] = await operation.promise();
    const transcription = response.results
      .map((result) => result.alternatives[0].transcript)
      .join("\n");

    console.log("Transcription:", transcription);

    return new Response(JSON.stringify({ text: transcription }), { status: 200 });
  } catch (error) {
    console.error("Error processing request:", error.message);
    if (error.message?.includes("object is not iterable") || error.message?.includes("Temp file was not created")) {
      return new Response(JSON.stringify({ text: "" }), { status: 200 });
    } else {
      return new Response(JSON.stringify({ error: "Failed to process request", details: error.message }), { status: 500 });
    }
  }
}