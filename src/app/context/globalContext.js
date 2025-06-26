'use client';

import { createContext, useCallback, useContext, useState } from "react";
import { fetchUserData } from "../firebase";

const GlobalContext = createContext();

export function GlobalContextProvider({ children }) {
  const [transcription, setTranscription] = useState("");
  const [duration, setDuration] = useState(0);
  const [situationData, setSituationData] = useState(null);
  const [passedSituations, setPassedSituations] = useState([]);
  const [userData, setUserData] = useState(null);

  const fetchAndCacheUser = useCallback(async () => {
    const firebaseUserData = await fetchUserData();
    if (firebaseUserData) {
      setUserData(firebaseUserData);
    } else {
      console.error("Failed to fetch user data");
    }
  }, []);

  return (
    <GlobalContext.Provider value={{ transcription, setTranscription, duration, setDuration, situationData, setSituationData, passedSituations, setPassedSituations, userData, setUserData, fetchAndCacheUser }}>
      {children}
    </GlobalContext.Provider>
  );
}

export function useGlobalContext() {
  return useContext(GlobalContext);
}