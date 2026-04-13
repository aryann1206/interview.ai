import { APITester } from "./APITester";
import { Mic, X,Home } from "lucide-react"
import "./index.css";
import { useState, useRef, useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { GoogleGenAI, Modality, Session } from "@google/genai";
import { Interview } from "./components/interview";
import Start from "./components/home";
let audioCtx: AudioContext | null = null;
interface Message {
  role: "user" | "model";
  text: string;
}

const MODEL = "gemini-3.1-flash-live-preview";
interface form {
  name: string,
  role: string,
  difficulty: string,

}
export function App() {
  return(
    <BrowserRouter>
    <Routes>
    <Route path="/" element={<Start  />} />
    <Route path="/interview" element={<Interview />} />
    </Routes>
    </BrowserRouter>
  )
}
export default App;
