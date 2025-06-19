"use client";

import Image from "next/image";
import { situation_data } from "../data/situationData";
import { level_data } from "../data/levelData";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getUserId, getUserRecords } from "../firebase";


// ProgressBar 컴포넌트
function ProgressBar({ exp, level }) {
  const fullExp = level_data[level_data.length - 1].exp;
  const progress = exp >= fullExp ? 100 : ((exp / level_data[level].exp) * 100).toFixed(2);
  let progressBarColor = "bg-gray-200";
  const fromColor = level_data[level - 1].fromColor;
  const toColor = level_data[level - 1].toColor;
  let expText = `${exp}/${level_data[level - 1].exp}`;

  // 레벨별 경험치바 색상
  if (exp >= fullExp) { // 만렙
    progressBarColor = `bg-linear-holo`;
    expText = level_data[level - 1].exp
  } else {
    progressBarColor = `bg-gradient-to-r ${fromColor} ${toColor}`;
    expText = `${exp}/${level_data[level].exp}`;
  }

  return (
    <div className="container flex-col w-full">
      <div className="text-sm text-white opacity-30 mb-1 text-right mx-1 capitalize">
        XP {expText}
      </div>
      <div className={`progress-container w-full bg-gray-200 rounded-full h-3 overflow-hidden  ${level >= level_data.length ? "box-shadow-maxlevel" : ""}`}>
        <div
          className={`progress-bar ${progressBarColor} h-full`}
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
}

export default function RecordPage() {
  const router = useRouter();
  const [userData, setUserData] = useState({});
  const [userLevel, setUserLevel] = useState(1);

  useEffect(() => {
    const getUserData = async () => {
      const userId = await getUserId();
      if (userId) {
        const data = await getUserRecords(userId);
        console.log("userData", data);
        setUserData({
          id: userId,
          records: data.records,
          exp: data.userExp || 0, // 기본값 설정
          count: data.userCount || 0, // 기본값 설정
        });
        // 레벨 계산
        const userExp = data.userExp || 0; // 기본값 설정
        const levelIdx = level_data.findIndex((level) => userExp < level.exp);
        setUserLevel(levelIdx > 0 ? levelIdx : 1); // 레벨이 없으면 1로 설정
        console.log("userLevel", userLevel);
      } else {
        console.error("사용자 ID를 가져오는 데 실패했습니다.");
        setUserData({ records: [], exp: 0, count: 0 });
      }
    }
    getUserData();
  }
    , []);

  // 레벨이 없을 경우 기본값 설정
  const noData = (
    <div className="flex flex-col items-center justify-center w-full h-full">
      <div className="flex flex-1/3 items-center justify-center w-full">
        <ProgressBar progress={0} />
      </div>
      <div className="flex flex-2/3 text-gray-500 items-center justify-center w-full">
        <p className="text-lg">답변 기록을 쌓아보세요!</p>
      </div>
    </div>
  );

  const recordList = (
    <div className="flex flex-col items-center justify-center w-full h-full">
      <div className="flex flex-col flex-2/3 items-center w-full gap-3">
        {userData?.records?.map((record, index) => (
          <div key={index} className="record-item flex bg-white rounded-xl p-5 w-full items-center justify-center cursor-pointer"
            onClick={() => router.push(`/record/${record}`)}>
            <div className="title line-clamp-1 overflow-ellipsis px-2">{
              situation_data[record - 1].title
            }</div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background-gray">
      <div className={`title-box w-full relative flex flex-col justify-between items-center justify-self-start rounded-b-xl overflow-hidden `}>
        <div className={`title-box-background absolute top-0 left-0 w-full h-full ${level_data[userLevel - 1].bgColor}`}>
          {userLevel >= level_data.length &&
            <div className="overlay absolute inset-0 bg-maxlevel-overlay"></div>
          }
        </div>
        <div className="title-box-inner relative w-full h-full flex flex-col items-center justify-between p-8">
          <div className="w-full flex justify-between items-center justify-self-start mb-auto">
            <div className="cancel-button flex justify-start items-center absolute w-10 h-10 cursor-pointer" onClick={() => router.back()}>
              <Image src={"/icon/back_white_fit.svg"} alt="cancel" width={10} height={10} />
            </div>
            <h1 className="self-center mx-auto text-white">나의 기록</h1>
          </div>
          <div className="level-sticker-container flex items-center justify-center w-full py-12">
            <div className="level-sticker flex items-center justify-center w-full">
              <div className={`sticker-box flex relative items-center justify-center ${userLevel >= level_data.length ? "w-80" : "-rotate-8 w-60"}`}>
                <div className="sticker-text absolute top-[24%] left-[57%]">{userData?.count}</div>
                <Image src={`/image/sticker/records_level_${userLevel}.png`} alt={`레벨 ${userLevel} 스티커`} width={300} height={200} className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
          <div className="flex flex-col flex-1/3 items-center justify-center w-full">
            <div className="level flex items-center justify-center gap-2 mb-3">
              <div className="level-value text-xs text-white border-white border-1 px-1">레벨{userLevel >= level_data.length ? "MAX" : userLevel}</div>
              <div className="level-name font-bold text-lg text-white">{level_data[userLevel - 1].name}</div>
            </div>
            <ProgressBar exp={userData.exp} level={userLevel} />
          </div>
        </div>
      </div>

      <div className="container w-full flex-grow p-8">
        {recordList}
      </div>
    </div>
  );
}
