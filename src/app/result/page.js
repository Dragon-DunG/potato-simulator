'use client';

import { useEffect, useRef, useState } from "react";
import { useGlobalContext } from "../context/globalContext";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getImageUrl } from "../situation/page";
import { getUserId, uploadResult } from "../firebase";

export default function ResultPage() {
  const { transcription, duration, situationData } = useGlobalContext();
  const [responsType, setResponseType] = useState("voice");
  const router = useRouter();
  const savedRef = useRef(false); // 저장 여부를 확인하기 위한 ref

  useEffect(() => { // firestore에 결과 저장
    const saveResult = async () => {
      if (!situationData) return;
      if (duration === 0) return; // duration이 0인 경우 처리
      if (savedRef.current) return; // 이미 저장된 경우 중복 저장 방지
      savedRef.current = true; // 저장 완료 플래그 설정
      const userId = await getUserId();
      const resultData = makeResultData();
      await uploadResult(userId, resultData);
      console.log("결과 저장 완료:", resultData);
    };
    saveResult();
  }, [situationData, duration]);

  const getResultType = () => {
    const avgPerSecond = 4; // 평균 초당 음절 수
    const wordsCount = getTextCount(); // 음절 수
    if (wordsCount === 0) return "silence"; // 음절 수가 0인 경우 처리
    if (duration === 0) return "silence"; // duration이 0인 경우 처리
    const speed = wordsCount / duration; // 초당 음절 수
    let speedType = "normal";
    if (speed > avgPerSecond) {
      speedType = "fast";
    } else if (speed < avgPerSecond) {
      speedType = "slow";
    } else {
      speedType = "normal";
    }
    return speedType;
  }

  const getDurationText = () => {
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor((duration % 60));
    if (minutes === 0) {
      return `${seconds}초`;
    } else {
      return `${minutes}분 ${seconds}초`;
    }
  }

  const getTextCount = () => { // 음절 수 계산
    if (!transcription) return 0; // transcription이 비어있는 경우 처리
    const wordsCount = transcription.replace(/\s+/g, '').length; // 공백 제거 후 글자 수 계산
    if (wordsCount === 0) return 0; // 음절 수가 0인 경우 처리
    return wordsCount;
  }

  const makeResultData = () => { // 데이터 저장용 객체 생성
    const resultType = getResultType(); // 결과 유형 (fast, slow, normal, silence)
    const durationText = getDurationText(); // 대답 시간
    const textCount = getTextCount(); // 음절 수
    const params = new URLSearchParams(window.location.search);
    const responseType = params.get("responseType") || "voice"; // 응답 유형 (voice, text)
    return {
      resultType,
      durationText,
      textCount,
      transcription,
      situationData,
      responseType
    };
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <div className="bg-image w-full h-1/3 bg-cover bg-center justify-self-start relative" >
        <div className="overlay absolute inset-0 bg-black opacity-50 h-full w-full">
        </div>
        {/* <div className="text-overlay absolute inset-0 flex self-end py-2 bg-gray-300 opacity-70 justify-center text-white">한줄평</div> */}
        <Image
          src={getImageUrl(situationData)}
          alt="상황 이미지"
          width={500}
          height={500}
          className="object-cover w-full h-full"
        />
      </div>
      <div className="text-container w-full flex-grow bg-white p-6">
        {getResultType() === "silence" ?
          <div>
            <h1 className="text-3xl font-bold mb-4">
              <span className="text-primary">아무 말도</span>
              <span> 하지 않았어요</span>
            </h1>
            <div className="text-gray-500 mb-8">
              <p>할 말이 떠오르지 않았나요?</p>
              <p>다음 번엔 자신있게 말해보세요!</p>
            </div>
            <div className="flex justify-center bg-gray-200 rounded-full rounded-br-none p-6 mx-4">
              <div className="flex gap-2">
                { Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="rounded-full bg-gray-500 w-2 h-2"></div>
                ))}
              </div>
            </div>
          </div> :
          <div>
            <h1 className="text-3xl font-bold mb-1">
              {
                getResultType() === "fast" ?
                  <div>
                    <span>평균보다 </span>
                    <span className="text-primary">빠르게, 많이</span>
                  </div> :
                  getResultType() === "slow" ?
                    <div>
                      <span>평균보다 </span>
                      <span className="text-primary">느리게, 적게</span>
                    </div> :
                    <div>
                      <span>평균과</span>
                      <span className="text-primary"> 비슷하게</span>
                    </div>
              }
            </h1>
            <h1 className="text-3xl font-bold mb-4">
              말했어요
            </h1>
            <div className="text-gray-500 mb-8">
              <p className="">
                <span className="underline font-bold">{getDurationText()}</span>
                <span>간의 스피치 동안</span>
              </p>
              <p className="">
                <span>총 </span>
                <span className="underline font-bold">{getTextCount()}</span>
                <span>음절을 말했어요.</span>
              </p>
            </div>
            <div className="border rounded-xl p-6 mb-4">
              <p className="text-lg">{transcription}</p>
            </div>
          </div>

        }



      </div>
      <div className="w-full flex gap-4 justify-center absolute bottom-0 p-4 bg-white">
        <div className="flex-grow button rounded-xl bg-gray-200 p-4 text-center text-xl cursor-pointer" onClick={() => router.push("/")}>메인으로</div>
        <div className="flex-grow button rounded-xl bg-black text-white p-4 text-center text-xl cursor-pointer">다음상황!</div>
      </div>

    </div>
  );
}