"use client";

import Image from "next/image";
import { situation_data } from "../../data/situationData";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getUserId, getSituationRecords } from "../../firebase";


export default function SituationRecordPage() {
  const router = useRouter();
  const params = useParams();
  const situationId = params.situationId;
  const [recordData, setRecordData] = useState({});
  const [isLoading, setIsLoading] = useState(true);


  useEffect(() => {
    const fetchRecordData = async () => {
      setIsLoading(true);
      const userId = await getUserId();
      if (!situationId) {
        console.error("상황 ID가 없습니다.");
        return;
      }
      if (!userId) {
        console.error("사용자 ID를 가져오는 데 실패했습니다.");
        return;
      }
      const records = await getSituationRecords(userId, situationId);
      console.log("records", records);
      if (records.length === 0) {
        console.error("해당 상황에 대한 기록이 없습니다.");
        setRecordData({ records: [] });
        return;
      }
      setRecordData({
        id: situationId,
        records: records,
      });
      setIsLoading(false);
    }
    fetchRecordData();
  }
    , []);

  const formatDate = (timestamp) => {
    if (!timestamp) return "알 수 없음";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const MM = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    return `${MM}월${dd}일 ${hh}:${mm}`;
  }

  const makeTypeTag = (type) => {
    const commonClasses = "rounded-xs px-1.5 py-0.5 text-xs"
    switch (type) {
      case "normal":
        return <span className={`${commonClasses} bg-normal-background text-normal-foreground`}>보통</span>;
      case "fast":
        return <span className={`${commonClasses} bg-fast-background text-fast-foreground`}>빠르게</span>;
      case "slow":
        return <span className={`${commonClasses} bg-slow-background text-slow-foreground`}>느리게</span>;
    }
  }


  const recordList = (
    <div className="flex flex-col items-center justify-center w-full h-full ">
      <div className="flex flex-col flex-2/3 items-center w-full gap-2">
        {recordData?.records?.map((record, index) => (
          <div key={index} className="record-item flex flex-col bg-white rounded-xl p-5 w-full items-center justify-center">
            <div className="header flex items-center justify-between w-full">
              <div className="created-at text-lg font-bold text-left">{
                formatDate(record.createdAt)
              }</div>
              <Image
                src={`/icon/mode_${record.responseType}.svg`}
                alt={record.responseType === "voice" ? "음성 답변" : "텍스트 답변"}
                width={24}
                height={24}
              />
            </div>
            <div className="content mt-2 mb-1 text-left w-full text-sm">
              {record.transcription || "답변 내용이 없습니다."}
            </div>
            <div className="type mt-2 text-sm flex items-center justify-start gap-4 w-full">
              {makeTypeTag(record.resultType)}

              <div className="duration text-xs opacity-50">
                {`총 ${record.textCount || 0}음절/${record.durationText || "알 수 없음"}`}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background-gray">
      <div className={`title-box w-full h-auto relative flex flex-col justify-between items-center justify-self-start rounded-b-xl p-7`}>
        <div className={`title-box-container absolute top-0 left-0 w-full h-full rounded-b-xl overflow-hidden`}>
          <div className="overlay absolute inset-0 bg-gradient-to-b from-black to-neutral-300 backdrop-blur-[2px] mix-blend-multiply"></div>
          <Image
            src={`/image/situation/potato_situation_${situationId}.png`}
            alt={`상황 ${situationId} 이미지`}
            width={500}
            height={500}
            className="object-cover w-full h-full"
          />
        </div>
        <div className="w-full flex justify-between items-center justify-self-start mb-auto">
          <div className="cancel-button flex justify-start items-center absolute w-10 h-10 cursor-pointer" onClick={() => router.back()}>
            <Image src={"/icon/back_white_fit.svg"} alt="cancel" width={10} height={10} />
          </div>
          <h1 className="title self-center text-center mx-auto w-1/2 line-clamp-1 overflow-ellipsis text-sm text-white z-50">
            {recordData?.id ? situation_data[situationId - 1]?.title : "로딩중..."}
          </h1>
        </div>
        <div className={`title-box-inner relative w-full h-[24vh] flex flex-col items-center justify-between overflow-hidden ${isLoading ? "" : "open"}`}>
          <div className="situ-title-container flex flex-col grow items-start justify-between gap-2 w-full text-white mb-2 mt-10">
            <div className="title-text text-xl font-semibold w-full text-left text-white  whitespace-pre-wrap break-keep">
              {situation_data[situationId - 1]?.title || ""}
            </div>
            <div className="number-of-records text-xs font-light">
              <span className="font-semibold">{recordData?.records?.length || 0}번</span> 해봤어요.
            </div>
          </div>
        </div>
      </div>

      <div className="container w-full flex-grow p-5 overflow-y-auto">
        {recordList}
      </div>
    </div>
  );
}
