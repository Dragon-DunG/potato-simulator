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
  

  useEffect(() => {
    const fetchRecordData = async () => {
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
    const commonClasses = "rounded-sm px-2 py-1 text-xs"
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
          <div key={index} className="record-item flex flex-col bg-white rounded-lg p-5 w-full items-center justify-center">
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
            <div className="content mt-2 text-left w-full">
              {record.transcription || "답변 내용이 없습니다."}
            </div>
            <div className="type mt-2 text-sm flex items-center justify-start gap-4 w-full">
              {makeTypeTag(record.resultType)}
              
              <div className="duration text-sm text-gray-500">
                {`총 ${record.textCount || 0}음절/${record.durationText || "알 수 없음"}`}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <div className="w-full flex justify-between items-center p-4 mt-4 justify-self-start mb-auto">
        <div className="cancel-button flex justify-center items-center absolute w-10 h-10 cursor-pointer" onClick={() => router.back()}>
          <Image src={"/icon/left_dark.svg"} alt="cancel" width={48} height={48} />
        </div>
        <h1 className="title self-center mx-auto w-1/2 line-clamp-1 overflow-ellipsis">{recordData?.id ? situation_data[situationId - 1]?.title : "기록"}</h1>
      </div>


        <div className="title flex flex-col items-start justify-between gap-2 w-full p-8">
          <div className="title-text text-2xl font-bold w-2/3 text-left break-words">
            {situation_data[situationId - 1]?.title || "기록"}
          </div>
          <div className="number-of-records text-sm">
            <span className="font-bold">{recordData?.records?.length || 0}번</span> 해봤어요.
          </div>
            
        </div>

      <div className="container w-full flex-grow  p-4">
        {recordList}
      </div>
    </div>
  );
}
