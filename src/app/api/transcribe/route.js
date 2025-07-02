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

  try {
    // 1. 파일 데이터를 저장할 임시 경로 생성
    const tempDir = path.join(process.cwd(), "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }
    const tempFilePath = path.join(tempDir, "uploaded-audio.webm");

    // 2. Request의 body를 읽어서 파일로 저장
    const fileStream = fs.createWriteStream(tempFilePath);
    let totalBytes = 0;

    for await (const chunk of req.body) {
      fileStream.write(chunk);
      totalBytes += chunk.length;
    }

    console.log("Total bytes written:", totalBytes);

    // 스트림 종료 후 파일 크기 확인
    await new Promise((resolve, reject) => {
      fileStream.end(() => {
        console.log("File stream ended");
        resolve();
      });
    });

    if (!fs.existsSync(tempFilePath)) {
      throw new Error("Temp file was not created");
    }

    const fileSize = fs.statSync(tempFilePath).size;
    console.log("Audio file size:", fileSize);

    if (fileSize === 0) {
      throw new Error("Audio file is empty");
    }

    // 3. Google Speech-to-Text API 호출
    const audio = fs.readFileSync(tempFilePath);
    const audioBytes = audio.toString("base64");

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

    console.log("Speech-to-Text API request:", request);

    const [operation] = speechClient.longRunningRecognize(request);
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
  } finally {
    // 4. 임시 파일 삭제
    const tempFilePath = path.join(process.cwd(), "temp", "uploaded-audio.webm");
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
      console.log("Temporary file deleted:", tempFilePath);
    }
  }
}