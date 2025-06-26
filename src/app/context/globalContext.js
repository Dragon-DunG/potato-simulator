'use client';

import { createContext, useContext, useState } from "react";

const GlobalContext = createContext();

export function GlobalContextProvider({ children }) {
  const [transcription, setTranscription] = useState("");
  const [duration, setDuration] = useState(0);
  const [situationData, setSituationData] = useState(null);
  const [passedSituations, setPassedSituations] = useState([]);

  return (
    <GlobalContext.Provider value={{ transcription, setTranscription, duration, setDuration, situationData, setSituationData, passedSituations, setPassedSituations }}>
      {children}
    </GlobalContext.Provider>
  );
}

export function useGlobalContext() {
  return useContext(GlobalContext);
}