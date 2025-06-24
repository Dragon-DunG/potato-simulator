'use client';

import Image from "next/image";
import localFont from "next/font/local";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useGlobalContext } from "./context/globalContext";
import { situation_data } from "./data/situationData";

const ptab = localFont({
  src: "./fonts/ptab.ttf",
  variable: "--font-ptab",
  weight: "400",
});

export default function Home() {
  const { situationData, setSituationData } = useGlobalContext();
  const [startPageOpen, setStartPageOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [finalIndex, setFinalIndex] = useState(-1);
  const [isAnimating, setIsAnimating] = useState(true);
  const [animationSpeed, setAnimationSpeed] = useState(100);
  const [responseType, setResponseType] = useState("voice");
  const router = useRouter();

  const handleResponseButtonClick = (responseType) => {
    setIsAnimating(true);
    setResponseType(responseType);

    let speed = animationSpeed;

    const slowDownAnimation = () => {
      if (speed > 500) {
        const randomIndex = Math.floor(Math.random() * situation_data.length);
        setFinalIndex(randomIndex); // 최종 선택된 인덱스 설정
        setCurrentIndex(randomIndex); // 현재 인덱스 업데이트
        return;
      }

      speed += 50;
      setAnimationSpeed(speed);

      setTimeout(() => {
        const randomIndex = Math.floor(Math.random() * situation_data.length);
        setCurrentIndex(randomIndex); // 현재 인덱스 업데이트
        slowDownAnimation();
      }, speed);
    };

    slowDownAnimation();
  };

  useEffect(() => {
    if (finalIndex !== -1) {
      setCurrentIndex(finalIndex);
      setSituationData(situation_data[finalIndex]); // 최종 선택된 데이터를 전역 상태에 저장
      setIsAnimating(false);
      setAnimationSpeed(100);

      // 1초 후 페이지 이동
      setTimeout(() => {
        router.push(`/situation?responseType=${responseType}`);
      }, 1000);
    }
  }, [finalIndex, responseType]);

  useEffect(() => {
    let interval;

    if (isAnimating) {
      interval = setInterval(() => {
        const randomIndex = Math.floor(Math.random() * situation_data.length);
        setCurrentIndex(randomIndex);
      }, animationSpeed);
    }

    return () => {
      clearInterval(interval);
    }
  }, [isAnimating, animationSpeed]);



  const introPage = (
    <>
    <div className="background-container absolute inset-0 flex items-center justify-center -z-100">
      <Image src={"/image/background/main_temp.png"} alt="intro background png" layout="fill" objectFit="cover" className="object-cover" />
    </div>
      {/* <h1 className={`title text-center text-5xl flex flex-col items-center justify-center my-auto gap-2 ${ptab.className}`}>
        <div className="title-text">감자</div>
        <div className="title-text">시뮬레이터</div>
      </h1> */}
      <div className="button-group flex flex-col items-center justify-end h-full w-full grow pb-4">
        <div onClick={() => setStartPageOpen(true)} className="start-button flex items-center justify-center w-full py-4 bg-primary text-white rounded-lg transition duration-300 capitalize font-bold text-xl cursor-pointer">
          START
        </div>
        <div onClick={() => router.push("/record")}
          className="list-button flex items-center justify-center w-64 py-3 mt-4 bg-transparent text-white rounded-lg transition duration-300 text-xl cursor-pointer">
          나의 기록
        </div>
      </div>
    </>
  );

  const startPage = (
    <>
    <div className="background-container absolute inset-0 flex items-center justify-center -z-100">
      <div className="gradient-background absolute inset-0 bg-gradient-to-tr from-bg-from to-bg-to"></div>
    </div>
      <div className="cancel-button flex justify-center items-center self-start w-10 h-10" onClick={() => setStartPageOpen(false)}>
        <Image src={"/icon/cancel_dark.svg"} alt="cancel" width={48} height={48} />
      </div>
      <div className="h-24">
        <div>{finalIndex !== -1 ? situation_data[finalIndex].title : situation_data[currentIndex].title}</div>
      </div>
      <div className="description text-center text-xl mt-4">
        <div className="description-text">이제부터 자기소개가 필요한</div>
        <div className="description-text"><span className="font-bold">랜덤의 상황이 제시</span>됩니다.</div>
        <div className="description-text mt-4">당신의 센스를 발휘해 보세요!</div>
      </div>
      <div className="button-group flex flex-col items-center justify-center w-full pb-6">
        <div onClick={() => handleResponseButtonClick("voice")} className="speak-button flex items-center justify-center w-full py-4 bg-black text-white rounded-lg transition duration-300 capitalize font-bold text-xl cursor-pointer">
          <div className="icon flex items-center justify-center w-4 h-4 mr-2">
            <Image src={"/icon/mic.svg"} alt="mic" width={32} height={32} />
          </div>
          <div className="text">말로 답변</div>
        </div>
        <div onClick={() => handleResponseButtonClick("text")} className="text-button flex items-center justify-center w-full py-3 mt-4 text-black rounded-lg transition duration-300 text-xl cursor-pointer">
          <div className="icon flex items-center justify-center w-6 h-6 mr-2">
            <Image src={"/icon/bubble.svg"} alt="keyboard" width={32} height={32} />
          </div>
          <div className="text">텍스트로 답변</div>
        </div>
      </div>
    </>
  );

  return (
    <div className="main flex flex-col items-center justify-between min-h-screen p-4 h-full">
      {startPageOpen ? (
        <>
          {startPage}
        </>
      ) : (
        <>
          {introPage}
        </>
      )}
    </div>
  );
}
