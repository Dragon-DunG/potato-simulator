'use client';

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useGlobalContext } from "../context/globalContext";
import { situation_data } from "../data/situationData";

export function getImageUrl(situation) {
  return `/image/situation/potato_situation_${situation?.id}.png`;
}

export default function SituationPage() {
  const { setTranscription, setDuration, situationData, setSituationData, passedSituations, setPassedSituations, userData, fetchAndCacheUserData } = useGlobalContext();
  const [responseType, setResponseType] = useState("voice"); // "voice" or "text"
  const [isLoading, setIsLoading] = useState(true);
  const [counter, setCounter] = useState(5);
  const [isCounterStarted, setIsCounterStarted] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [recognizing, setRecognizing] = useState(false);
  const [responseDuration, setResponseDuration] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const barsRef = useRef([]);
  const startTimeRef = useRef(null);
  const responseTextRef = useRef("");
  const startCounterTimerRef = useRef(null);
  const counterIntervalRef = useRef(null);
  const responseTimerRef = useRef(null);
  const audioBlobRef = useRef(null);
  const router = useRouter();

  const resetState = () => {
    stopRecording();
    resetCounter();
    setIsLoading(true);
    setTranscription("");
    setDuration(0);
    setResponseText("");
    setAudioBlob(null);
    setRecognizing(false);
    setResponseDuration(0);
    setIsStarted(false);
    setTimeRemaining(0);
    startTimeRef.current = null;
    responseTextRef.current = "";
  }

  const startRecording = () => {
    console.log("Starting recording...");
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const mimeType = "audio/webm; codecs=opus"; // "audio/webm" or "audio/wav" or "audio/mp4"
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        console.error(`${mimeType} is not supported in this browser.`);
        return;
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      const audioContext = new window.AudioContext;
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      analyser.fftSize = 256;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const animate = () => {
        analyser.getByteFrequencyData(dataArray);

        // 파형 높이 업데이트
        barsRef.current.forEach((bar, index) => {
          if (bar) {
            const value = dataArray[index] || 0;
            bar.style.height = `${10 + (value / 255) * 40}px`; // 최소 높이 10px, 최대 높이 50px
          }
        });

        requestAnimationFrame(animate);
      };

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          console.log("Data chunk size:", event.data.size);
          audioChunksRef.current.push(event.data);
        } else {
          console.error("No data available from MediaRecorder.");
          audioChunksRef.current = []; // Clear chunks if no data
        }
      };

      mediaRecorder.onstop = () => {
        if (audioChunksRef.current.length === 0) {
          console.error("No audio chunks available.");
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        console.log("Audio Blob size:", audioBlob.size);
        setAudioBlob(audioBlob);
        audioBlobRef.current = audioBlob;
        audioChunksRef.current = []; // Clear chunks
      };

      mediaRecorder.start();
      setIsRecording(true);
      animate();
    });
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (mediaRecorderRef.current?.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }

    barsRef.current.forEach((bar) => {
      if (bar) {
        bar.style.height = "10px"; // Reset height
      }
    });
  };

  const textSubmit = (duration, responseText) => {
    console.log("Text submitted:", responseText);
    const text = responseText.trim();
    setTranscription(text);
    setDuration(duration);
    setResponseText("");
    setTimeout(() => {
      router.push("/result?responseType=text");
    }, 0);
  }

  const getRandomIndex = (excludeIds) => {
    let randomIndex = 0;
    do {
      randomIndex = Math.floor(Math.random() * situation_data.length);
    } while (excludeIds.includes(randomIndex + 1) || (randomIndex + 1) === situationData?.id);
    return randomIndex;
  }

  const skipSituation = async () => {
    setIsLoading(true);
    resetState();
    const passedIds = [...passedSituations, situationData.id];
    setPassedSituations(passedIds);
    if (!userData) await fetchAndCacheUserData(); // 사용자 데이터가 없으면 갱신
    if (userData) {
      const excludeIds = [...passedIds, ...userData.doneIds || []]; // 이미 완료한 상황 제외
      const randomIndex = getRandomIndex(excludeIds);
      const nextSituation = situation_data[randomIndex];
      if (!nextSituation) {
        console.error("다음 상황을 찾을 수 없습니다.");
        return;
      }
      setSituationData(nextSituation);
      router.push(`/situation?index=${randomIndex}&responseType=${responseType}`);
    }
  }

  const startResponse = () => {
    startTimeRef.current = Date.now();
    setIsStarted(true);
    setIsCounterStarted(false);
  }

  useEffect(() => {
    return () => stopRecording();
  }, []);

  const recognize = (duration) => {
    if (audioBlobRef.current) {
      const audioBlob = audioBlobRef.current;
      setRecognizing(true);
      console.log("Audio Blob:", audioBlob);

      fetch("/api/transcribe", {
        method: "POST",
        body: audioBlob,
        headers: {
          "Content-Type": "application/octet-stream",
        },
      })
        .then((response) => {
          console.log("Response:", response.status);
          if (!response.ok) {
            // throw new Error("Network response was not ok");
            console.error("Error with response:", response.statusText);
          }
          return response.json();
        })
        .then((data) => {
          console.log("Transcription:", data.text);
          setTranscription(data.text);
          setDuration(duration);
          setRecognizing(false);
          router.push("/result?responseType=voice");
        })
        .catch((error) => {
          console.error("Error:", error);
        });
    }
  }

  const startCounter = () => {
    startCounterTimerRef.current = setTimeout(() => {
      setIsCounterStarted(true);
      setCounter(5);
      counterIntervalRef.current = setInterval(() => {
        setCounter((prev) => {
          if (prev > 0) {
            return prev - 1;
          } else {
            clearInterval(counterIntervalRef.current);
            startResponse();
            startTimeRef.current = Date.now();
            return 0;
          }
        });
      }, 1000);
    }, 3000);
  };

  const resetCounter = () => {
    if (startCounterTimerRef.current) {
      clearTimeout(startCounterTimerRef.current);
      startCounterTimerRef.current = null;
    }
    if (counterIntervalRef.current) {
      clearInterval(counterIntervalRef.current);
      counterIntervalRef.current = null;
    }
    setIsCounterStarted(false);
  };


  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const responseTypeParam = params.get("responseType");
    const indexParam = params.get("index");
    if (responseTypeParam) {
      setResponseType(responseTypeParam);
    }
    if (!situationData) {
      if (indexParam) {
        const index = parseInt(indexParam, 10);
        const situation = situation_data[index] || {};
        setSituationData(situation);
      }
    }

    if (!isLoading) {
      startCounter();
      return () => {
        resetCounter();
      }
    }
  }, [isLoading]);

  useEffect(() => {
    if (situationData) {
      setIsLoading(false);
    }
  }, [situationData]);

  useEffect(() => { // 음성 응답 시작 시 녹음 시작
    if (isStarted && responseType === "voice") {
      startRecording();
    }
  }, [isStarted, responseType]);

  useEffect(() => { // 타이머 설정
    if (situationData?.time >= 0 && isStarted) {
      setTimeRemaining(responseType === "voice" ? situationData.time : situationData.time * 3); // 텍스트 응답은 3배
    }

    responseTimerRef.current = setInterval(() => {
      if (isStarted) {
        setTimeRemaining((prev) => {
          if (prev > 0) {
            return prev - 1;
          } else {
            clearInterval(responseTimerRef.current);
            handleAnswerComplete();
            return 0;
          }
        });
      }
    }, 1000);

  }, [situationData?.time, isStarted, responseType]);

  // 답변 완료 시 소요 시간 계산
  const handleAnswerComplete = () => {
    console.log("Answer completed");
    clearInterval(responseTimerRef.current);
    const maxDuration = responseType === "voice" ? situationData?.time : situationData?.time * 3;
    let duration = maxDuration || 0; // 기본값 설정
    if (startTimeRef.current) {
      duration = Math.round((Date.now() - startTimeRef.current) / 1000);
      // 최대 시간 초과 방지
      if (situationData?.time && duration > situationData.time) {
        duration = maxDuration;
      }
    }
    setResponseDuration(duration);
    stopRecording();
    console.log("Answer duration:", duration);
    setTimeout(() => {
      if (responseType === "text") {
        textSubmit(duration, responseTextRef.current || responseText);
      }
      if (responseType === "voice") {
        recognize(duration);
      }
    }, 0);
  };

  const loadingAnimation = (
    <div className="loading-container flex flex-col items-center justify-center h-dvh w-screen fixed top-0 left-0 bg-white z-[99] opacity-70">
      <div className="loader h-16 w-16"></div>
      <span className="opacity-50 text-lg ml-4">텍스트 변환중...</span>
    </div>
  );


  const situationIntro = (
    <>
      <div className="text-container flex flex-col items-center justify-center bg-white rounded-t-md animate-text-slide-up relative">
        <div className="text-content w-full opacity-0 flex flex-col items-center h-full p-4 animate-text-content">
          <h1 className="text-xl font-bold mt-2  whitespace-pre-wrap text-center">{situationData?.title}</h1>
          <div
            className="bubble-container flex flex-col w-full items-center gap-6 justify-center mt-8">

            <div className="bubble-left self-start bg-gray-300 px-8 py-2 rounded-full rounded-tl-none shadow-md max-w-xs opacity-0 translate-y-4 animate-bubble-left">
              <span>{situationData?.description}</span>
            </div>

            <div className="bubble-right self-end bg-blue-300 px-8 py-4 rounded-full rounded-tr-none shadow-md max-w-xs ml-2 opacity-0 translate-y-4 animate-bubble-right">
              <div className="dots flex items-center justify-center">
                <div className="dot bg-blue-500 w-2 h-2 rounded-full mr-1"></div>
                <div className="dot bg-blue-500 w-2 h-2 rounded-full mr-1"></div>
                <div className="dot bg-blue-500 w-2 h-2 rounded-full"></div>
              </div>
            </div>
          </div>
          <div className="button-container justify-self-end mt-auto flex flex-col items-center justify-center w-full relative">
            <span className="text-xl text-gray-400 font-bold absolute">5초 뒤 답변 시작...</span>
            <div className="animate-start-button cursor-pointer bg-black text-white rounded-lg capitalize text-xl flex items-center justify-center py-4 w-full opacity-0 z-50" onClick={startResponse}>
              <span>바로 시작</span>
            </div>
          </div>
        </div>
      </div>
    </>

  )

  const voiceResponse = (
    <div className="voice-container w-full flex flex-col grow items-center justify-between">
      <div className="time-remaining flex justify-between items-center w-full">
        <span >남은 답변 시간</span>
        <div className="time-remaining-text flex items-center gap-2">
          <Image src={"/icon/clock.svg"} alt="clock" width={20} height={20} className="w-5 h-5" />
          <span className="text-xl font-bold">{timeRemaining}초</span>
        </div>
      </div>
      <div className="speaker flex justify-center items-center p-4 mt-4 w-full grow relative">
        <div className="wave absolute w-24 h-24 rounded-full bg-gray-200"></div>
        <div className="wave absolute w-24 h-24 rounded-full bg-gray-200"></div>
        <div className="absolute w-24 h-24 rounded-full bg-gray-300"></div>

        <div className="waveform flex items-center gap-1 absolute">
          {[...Array(6)].map((_, index) => (
            <div key={index}
              ref={(el) => (barsRef.current[index] = el)}
              className="bar bg-gray-500 w-1 rounded-2xl"></div>
          ))}
        </div>
      </div>

      <div className="submit-button flex justify-center items-center bg-black text-white rounded-lg capitalize font-bold text-xl py-3 w-full"
        onClick={handleAnswerComplete}
      >
        <span>답변 완료!</span>
      </div>
    </div>

  )

  const textResponse = (
    <div className="text-container w-full flex flex-col grow items-center justify-start gap-2">
      <div className="time-remaining flex justify-between items-center w-full">
        <span >남은 답변 시간</span>
        <div className="time-remaining-text flex items-center gap-2">
          <Image src={"/icon/clock.svg"} alt="clock" width={20} height={20} className="w-5 h-5" />
          <span className="text-xl font-bold">{timeRemaining}초</span>
        </div>
      </div>
      <div className="text-input-container flex items-center justify-between w-full mt-4 gap-2">
        <textarea
          className="text-input w-full h-full p-4 bg-gray-100 rounded-lg resize-none outline-none"
          value={responseText}
          placeholder="답변을 입력하세요..."
          rows={5}
          onChange={(e) => {
            setResponseText(e.target.value);
            responseTextRef.current = e.target.value;
          }}
        ></textarea>
        <div className="submit-button cursor-pointer"
          onClick={handleAnswerComplete}
        >
          <Image src={"/icon/btn_send_chat.svg"} alt="send" width={36} height={36} className="" />
        </div>
      </div>

    </div>
  )


  return (
    <div key={situationData?.id} className="situation-page w-full flex flex-col h-full relative overflow-hidden">
      {recognizing && loadingAnimation}

      <div className="button-group flex items-center justify-between w-full absolute top-0 left-0 z-20">
        <div className="cancel-button flex justify-center items-center self-start w-10 h-10 m-4 mix-blend-difference"
          onClick={() => router.push("/")}>
          <Image src={"/icon/cancel_white.svg"} alt="cancel" width={48} height={48} />
        </div>

        <div
          onClick={skipSituation}
          className="skip-button flex justify-center items-center m-4 py-2 px-4 bg-black rounded-full cursor-pointer">
          <span className="text-white text-sm">이 상황 패스</span>
        </div>
      </div>



      {isStarted && (
        <div className="situation-bubble-container flex flex-col w-full h-1/2 absolute top-0 left-0 p-4">
          <div className="situation-bubble flex flex-col self-start items-start justify-center justify-self-end mt-auto gap-1">
            <span className="text-white">{situationData?.name}</span>
            <div className="bubble-left bg-gray-300 px-8 py-2 rounded-full rounded-tl-none shadow-md max-w-xs opacity-80 z-50">
              <span>{situationData?.description}</span>
            </div>
          </div>
        </div>
      )}

      <div
        key={situationData?.id}
        className="bg-image w-full h-full bg-cover bg-center animate-bg-shrink -z-10 overflow-hidden">

        {isCounterStarted && !isStarted && (
          <div className={`${isCounterStarted && 'counter-overlay'} absolute inset-0 z-10 flex justify-center items-center overflow-hidden bg-[rgba(0,0,0,0.7)]`}>
            <div className="crossline absolute h-full w-full top-0"></div>
            <div className="circle circle1"></div>
            <div className="circle circle2"></div>
            {isCounterStarted && (<div className="needle"></div>)}
            <div className="counter text-white text-9xl font-black animate-fade-in absolute z-10">
              {counter}
            </div>
          </div>
        )}

        <Image
          src={getImageUrl(situationData)}
          alt="situation"
          width={500}
          height={500}
          className="w-full h-full object-cover"
          placeholder="blur"
          blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
        />
      </div>

      {isStarted ? (
        <div className="text-container flex flex-col h-1/2 items-center justify-between bg-white rounded-t-md p-4 px-8">

          {responseType === "voice" ? voiceResponse : textResponse}
        </div>
      ) : situationIntro}




    </div>
  );
}