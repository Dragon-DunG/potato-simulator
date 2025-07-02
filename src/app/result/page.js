'use client';

import { useEffect, useRef, useState } from "react";
import { useGlobalContext } from "../context/globalContext";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getImageUrl } from "../situation/page";
import { getUserId, uploadResult } from "../firebase";
import { level_data } from "../data/levelData";
import { situation_data } from "../data/situationData";

export default function ResultPage() {
  const { transcription, duration, situationData, setSituationData, fetchAndCacheUser, userData, passedSituations } = useGlobalContext();
  const [responseType, setResponseType] = useState("voice");
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const savedRef = useRef(false); // 저장 여부를 확인하기 위한 ref
  const offset = 1; // 속도 측정 오프셋

  const getLevel = () => {
    const userExp = userData?.exp || 0; // 기본값 설정
    const levelIdx = level_data.findIndex((level) => userExp < level.exp);
    const userLevel = levelIdx > 0 ? levelIdx : 1; // 레벨이 없으면 1로 설정
    return userLevel;
  }

  const getRandomIndex = (excludeIds) => {
    let randomIndex = 0;
    do {
      randomIndex = Math.floor(Math.random() * situation_data.length);
    } while (excludeIds.includes(randomIndex + 1) || (randomIndex + 1) === situationData?.id);
    return randomIndex;
  }

  const nextSituationHandler = async () => {
    if (!userData) await fetchAndCacheUser(); // 사용자 데이터가 없으면 갱신
    if (userData) {
      const excludeIds = [...passedSituations, ...userData.doneIds || []]; // 이미 완료한 상황 제외
      const nextIndex = getRandomIndex(excludeIds);
      const nextSituation = situation_data[nextIndex];
      if (!nextSituation) {
        console.error("다음 상황을 찾을 수 없습니다.");
        return;
      }
      setSituationData(nextSituation);
      setResponseType("voice"); // 다음 상황으로 넘어갈 때 응답 유형 초기화
      savedRef.current = false; // 저장 완료 플래그 초기화
      router.push(`/situation?index=${nextIndex}&responseType=${responseType}`); // 상황 페이지로 이동}
    }
  }

  useEffect(() => {
    if (!isLoading) return;
    const params = new URLSearchParams(window.location.search);
    const responseTypeParam = params.get("responseType");
    if (responseTypeParam) {
      setResponseType(responseTypeParam);
    }
    setIsLoading(false);
  }, [isLoading]);

  useEffect(() => { // firestore에 결과 저장
    const saveResult = async () => {
      console.log("transcription:", transcription);
      console.log("duration:", duration);
      if (!situationData) return;
      if (!transcription) return; // transcription이 비어있는 경우 처리
      if (duration === 0) return; // duration이 0인 경우 처리
      if (savedRef.current) return; // 이미 저장된 경우 중복 저장 방지
      savedRef.current = true; // 저장 완료 플래그 설정
      const userId = await getUserId();
      const resultData = makeResultData();
      if (resultData.resultType === "silence") return; // silence인 경우 저장하지 않음
      await uploadResult(userId, resultData).then(() => { fetchAndCacheUser(); }); // 결과 저장 후 사용자 데이터 갱신
      console.log("결과 저장 완료:", resultData);
    };
    saveResult();
  }, [situationData, duration, transcription, fetchAndCacheUser]);

  const getResultType = () => {
    const avgPerSecond = responseType === "voice" ? 4 : 4 * 3;
    const wordsCount = getTextCount(); // 음절 수
    if (wordsCount === 0) return "silence"; // 음절 수가 0인 경우 처리
    if (duration === 0) return "silence"; // duration이 0인 경우 처리
    const speed = wordsCount / duration; // 초당 음절 수
    let speedType = "normal";
    if (speed < avgPerSecond + offset) {
      speedType = "fast";
    } else if (speed > avgPerSecond - offset) {
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
    <div className="flex flex-col items-center justify-center h-dvh">
      <div className="bg-image w-full h-1/3 bg-cover bg-center justify-self-start relative" >
        <div className="overlay absolute inset-0 bg-black opacity-50 h-full w-full">
        </div>
        <Image
          src={getImageUrl(situationData)}
          alt="상황 이미지"
          width={500}
          height={500}
          className="object-cover w-full h-full"
        />
        <div className="level-sticker-container flex items-center justify-center w-full py-8 absolute inset-0">
          {getResultType() === "silence" ? (
            <div className="silence-sticker flex items-center justify-center">
              <div className="sticker-box flex relative items-center justify-around gap-4">
                <div className="w-4 h-4 bg-white rounded-full"></div>
                <div className="w-4 h-4 bg-white rounded-full"></div>
                <div className="w-4 h-4 bg-white rounded-full"></div>
              </div>
            </div>
          ) : (
            <div className={`sticker-box flex relative items-center justify-center ${getLevel() >= level_data.length ? "w-100" : "-rotate-8 w-80"}`}>
              <div className="sticker-text text-lg absolute top-[24%] left-[54%] text-center w-8">{userData?.count}</div>
              <Image src={`/image/sticker/result/result_level_${getLevel()}.png`} alt={`레벨 ${getLevel()} 스티커`} width={300} height={200} className="w-full h-full object-cover" />
            </div>
          )}
        </div>
      </div>
      <div className="text-container w-full flex-grow bg-white p-6">
        {getResultType() === "silence" ?
          <div>
            <h1 className="text-3xl font-bold mb-4">
              <span className="text-primary">아무 말도</span>
              <span> 하지 않았어요</span>
            </h1>
            <div className="opacity-50 mb-8">
              <p>할 말이 떠오르지 않았나요?</p>
              <p>다음 번엔 자신있게 말해보세요!</p>
            </div>
            <div className="flex justify-center bg-gray-200 rounded-full rounded-br-none p-6 mx-4">
              <div className="flex gap-2">
                {Array.from({ length: 3 }).map((_, index) => (
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
              {responseType === "voice" ? "말했어요" : "답했어요"}
            </h1>
            <div className="opacity-50 mb-8">
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
      <div className="w-full flex gap-4 justify-center self-end mt-auto p-4 bg-white">
        <div className="flex-grow button rounded-xl bg-gray-200 p-4 text-center text-xl cursor-pointer" onClick={() => router.push("/")}>메인으로</div>
        <div className="flex-grow button rounded-xl bg-black text-white p-4 text-center text-xl cursor-pointer"
          onClick={nextSituationHandler}>
          다음상황!</div>
      </div>

    </div>
  );
}