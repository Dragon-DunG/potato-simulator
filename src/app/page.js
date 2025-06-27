'use client';

import Image from "next/image";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useGlobalContext } from "./context/globalContext";
import { situation_data } from "./data/situationData";

export default function HomeWrapper() {
  return (
    <Suspense>
      <Home />
    </Suspense>
  );
}

function Home() {
  const initialAnimationSpeed = 400; // 초기 애니메이션 속도 설정
  const { situationData, setSituationData, passedSituations, userData, fetchAndCacheUser } = useGlobalContext();
  const [startPageOpen, setStartPageOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState(0);
  const [isSliding, setIsSliding] = useState(true);
  const [finalIndex, setFinalIndex] = useState(-1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(initialAnimationSpeed);
  const [responseType, setResponseType] = useState("voice");
  const [userDoneIds, setUserDoneIds] = useState([]);
  const [slowDown, setSlowDown] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const slideTimeout = useRef(null);


  const imageUrlbase = (id, ext) => `/image/thumbnails/${ext}/situationScreenImage_${String(id).padStart(2, '0')}.${ext}`;

  const getRandomIndex = () => {
    let randomIndex = 0;
    do {
      randomIndex = Math.floor(Math.random() * situation_data.length);
    } while (passedSituations.includes(randomIndex) || userDoneIds.includes(randomIndex) || randomIndex === currentIndex);
    return randomIndex;
  }

  const startPageOpenHandler = () => {
    setStartPageOpen(true);
    setIsAnimating(true);
    setCurrentIndex(getRandomIndex());
    setFinalIndex(-1);
  }

  const startPageCloseHandler = () => {
    setStartPageOpen(false);
    setIsAnimating(false);
  }

  const handleResponseButtonClick = (responseType) => {
    setIsAnimating(true);
    setResponseType(responseType);

    let speed = animationSpeed;

    const slowDownAnimation = () => {
      setSlowDown(true);
      if (speed > 800) {
        const randomIndex = getRandomIndex();
        setFinalIndex(randomIndex); // 최종 선택된 인덱스 설정
        setCurrentIndex(randomIndex); // 현재 인덱스 업데이트
        setIsAnimating(false);
        return;
      }

      speed += 100;
      setAnimationSpeed(speed);

      setTimeout(() => {
        const randomIndex = getRandomIndex();
        setCurrentIndex(randomIndex);
        slowDownAnimation();
      }, speed);
    };

    slowDownAnimation();
  };

  useEffect(() => {
    if (!userData) {
      fetchAndCacheUser();
      console.log("User data fetched and cached:", userData);
    } else {
      setUserDoneIds(userData.doneIds || []);
    }
  }, [userData, fetchAndCacheUser]);

  useEffect(() => {
    if (searchParams.get("start") === "true") {
      startPageOpenHandler();
    }
  }, [searchParams]);

  // 이미지 변경 시 prevIndex 업데이트 및 슬라이드 트리거
  useEffect(() => {
    if (currentIndex !== prevIndex) {
      setIsSliding(true);
      if (slideTimeout.current) clearTimeout(slideTimeout.current);
      slideTimeout.current = setTimeout(() => {
        setIsSliding(false);
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
        const randomIndex = getRandomIndex();
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
        placeholder="blur"
        blurDataURL="data:image/webp;base64,UklGRiQAAABXRUJQVlA4WAoAAAAQAAAAPgAAQUxQSAABAAEAAAAAAAD/2wBDAAYEBQYFBAYGBQYHBwYIBwcJCQgKCAcICwo"
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
        className={`object-contain absolute w-auto h-full rounded-lg z-0 border border-background-gray ${isSliding ? "animate-slide-in" : ""}`}
        placeholder="blur"
        blurDataURL="data:image/webp;base64,UklGRiQAAABXRUJQVlA4WAoAAAAQAAAAPgAAQUxQSAABAAEAAAAAAAD/2wBDAAYEBQYFBAYGBQYHBwYIBwcJCQgKCAcICwo"
      />
    </div>
  );



  const introPage = (
    <>
      <div className="background-container w-full absolute inset-0 flex items-center justify-center -z-100">
        <video
          src={"/video/main_background.mp4"}
          autoPlay
          loop
          muted
          className="absolute inset-0 object-cover w-full h-full"
          tabIndex={-1}
          preload="auto"
          playsInline
          poster="/image/background/main_temp.png"
          aria-hidden="true"
          controls={false}
          disablePictureInPicture={true}
          disableRemotePlayback={true}
          onContextMenu={(e) => e.preventDefault()}
        >
          <source src="/video/background.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
      <div className="title-container w-full flex items-center justify-center px-8 pt-12">
        <Image src={"/image/title.svg"} alt="감자 시뮬레이터" width={200} height={100} className="w-full h-auto drop-shadow-xl drop-shadow-green-900/50" />
      </div>

      <div className="button-group flex flex-col items-center justify-end h-full w-full grow">
        <div onClick={startPageOpenHandler} className="start-button flex items-center justify-center w-full py-4 bg-primary text-white rounded-lg transition duration-300 capitalize font-bold text-xl cursor-pointer">
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
      <div className="cancel-button flex justify-center items-center self-start w-10 h-10" onClick={() => {
        if (searchParams.get("start") === "true") router.push("/");
        startPageCloseHandler();
      }}>
        <Image src={"/icon/cancel_dark.svg"} alt="cancel" width={48} height={48} />
      </div>
      {randomContainer}
      <div className="description text-center text-lg mb-2">
        <div className="description-text">이제부터 자기소개가 필요한</div>
        <div className="description-text"><span className="font-bold">랜덤의 상황이 제시</span>됩니다.</div>
        <div className="description-text mt-4">당신의 센스를 발휘해 보세요!</div>
      </div>

      <div className="button-group flex flex-col items-center justify-center w-full pb-6 text-lg">
        {slowDown ? (
          <div className="loading-button flex items-center justify-center w-full py-4 bg-black text-white rounded-lg transition duration-300 capitalize font-semibold">상황 선택 중...</div>
        ) : (
          <>
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
          </>
        )}
      </div>

    </>
  );

  return (
    <div className="main flex flex-col items-center justify-between min-h-screen p-8 h-full w-full relative">
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
