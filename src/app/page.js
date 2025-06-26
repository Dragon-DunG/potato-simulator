'use client';

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useGlobalContext } from "./context/globalContext";
import { situation_data } from "./data/situationData";

export default function Home() {
  const initialAnimationSpeed = 500; // 초기 애니메이션 속도 설정
  const { situationData, setSituationData } = useGlobalContext();
  const [startPageOpen, setStartPageOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState(0);
  const [isSliding, setIsSliding] = useState(true);
  const [finalIndex, setFinalIndex] = useState(-1);
  const [isAnimating, setIsAnimating] = useState(true);
  const [animationSpeed, setAnimationSpeed] = useState(initialAnimationSpeed);
  const [responseType, setResponseType] = useState("voice");
  const router = useRouter();
  const slideTimeout = useRef(null);


  const imageUrlbase = (id, ext) => `/image/thumbnails/${ext}/situationScreenImage_${String(id).padStart(2, '0')}.${ext}`;

  const handleResponseButtonClick = (responseType) => {
    setIsAnimating(true);
    setResponseType(responseType);

    let speed = animationSpeed;

    const slowDownAnimation = () => {
      if (speed > 1000) {
        const randomIndex = Math.floor(Math.random() * situation_data.length);
        setFinalIndex(randomIndex); // 최종 선택된 인덱스 설정
        setCurrentIndex(randomIndex); // 현재 인덱스 업데이트
        return;
      }

      speed += 100;
      setAnimationSpeed(speed);

      setTimeout(() => {
        const randomIndex = Math.floor(Math.random() * situation_data.length);
        setCurrentIndex(randomIndex);
        slowDownAnimation();
      }, speed);
    };

    slowDownAnimation();
  };

  // 이미지 변경 시 prevIndex 업데이트 및 슬라이드 트리거
  useEffect(() => {
    if (currentIndex !== prevIndex) {
      setIsSliding(true);
      if (slideTimeout.current) clearTimeout(slideTimeout.current);
      slideTimeout.current = setTimeout(() => 
        { setIsSliding(false);
          setPrevIndex(currentIndex); // 이전 인덱스 업데이트
        }, 300);
    }
  }, [currentIndex]);

  useEffect(() => {
    if (finalIndex !== -1) {
      setCurrentIndex(finalIndex);
      setSituationData(situation_data[finalIndex]); // 최종 선택된 데이터를 전역 상태에 저장
      setIsAnimating(false);
      setAnimationSpeed(initialAnimationSpeed);

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

  const randomContainer = (
    <div className="random-container relative w-full h-60 flex items-center justify-center overflow-hidden">
      {/* 이전 이미지 */}
        <Image
          key={`prevIndex-${prevIndex}`}
          src={imageUrlbase(situation_data[prevIndex].id, 'webp')}
          alt="prev"
          height={240}
          width={240}
          loading="eager"
          unoptimized={true}
          priority={true}
          className={`object-contain absolute h-full w-auto rounded-lg z-10 border border-background-gray ${isSliding ? "animate-slide-out" : ""}`}
        />
      {/* 현재 이미지 */}
      <Image
        key={`currentIndex-${currentIndex}`}
        src={imageUrlbase(situation_data[currentIndex].id, 'webp')}
        alt="current"
        height={240}
        width={240}
        loading="eager"
        unoptimized={true}
        priority={true}
        className={`object-contain absolute w-auto h-full rounded-lg z-20 border border-background-gray ${isSliding ? "animate-slide-in" : ""}`}
      />
    </div>
  );



  const introPage = (
    <>
    <div className="background-container absolute inset-0 flex items-center justify-center -z-100">
      <Image src={"/image/background/main_temp.png"} alt="intro background png" fill className="object-cover" />
    </div>
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
      {randomContainer}
      <div className="description text-center text-lg mb-2">
        <div className="description-text">이제부터 자기소개가 필요한</div>
        <div className="description-text"><span className="font-bold">랜덤의 상황이 제시</span>됩니다.</div>
        <div className="description-text mt-4">당신의 센스를 발휘해 보세요!</div>
      </div>
      <div className="button-group flex flex-col items-center justify-center w-full pb-6 text-lg">
        <div onClick={() => handleResponseButtonClick("voice")} className="speak-button flex items-center justify-center w-full py-4 bg-black text-white rounded-lg transition duration-300 capitalize font-semibold cursor-pointer">
          <div className="icon flex items-center justify-center w-4 h-4 mr-2">
            <Image src={"/icon/mic.svg"} alt="mic" width={32} height={32} />
          </div>
          <div className="text">말로 답변</div>
        </div>
        <div onClick={() => handleResponseButtonClick("text")} className="text-button flex items-center justify-center w-full py-3 mt-4 text-black rounded-lg transition duration-300 cursor-pointer">
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
