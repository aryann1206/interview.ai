import { Mic, X, Home } from "lucide-react"
import "../index.css";
import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { GoogleGenAI, Modality, Session } from "@google/genai";

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
  tech: string
}
export function Interview() {
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state as form | null;

  useEffect(() => {
    if (!state) navigate("/");
  }, [state, navigate]);

  if (!state) return null;

  const { name, role, difficulty, tech } = state;

  const [messages, setMessages] = useState<Message[]>([]);
  const sessionRef = useRef<Session | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<AudioWorkletNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const workletLoadedRef = useRef(false);
  const [allow, setallow] = useState(false);
  const [end, setend] = useState(false);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    connect();
  }, []);

  function stopMic() {
    try {
      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = null;

      processorRef.current?.disconnect();
      processorRef.current = null;

      sourceRef.current?.disconnect();
      sourceRef.current = null;
    } catch {}
  }

  function playAudio(base64: string, onEnd?: () => void) {
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    const pcm16 = new Int16Array(bytes.buffer);

    const sampleRate = 24000;

    stopMic();

    setallow(true);

    const buffer = audioCtx!.createBuffer(1, pcm16.length, sampleRate);
    const channel = buffer.getChannelData(0);

    for (let i = 0; i < pcm16.length; i++) {
      channel[i] = pcm16[i]! / 32768;
    }

    const source = audioCtx!.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx!.destination);
    audioSourceRef.current = source;
    source.onended = onEnd!;
    source.start();
  }
  let queue: string[] = [];
  let isPlaying = false;

  function enqueueAudio(base64: string) {
    queue.push(base64);
    if (!isPlaying) playNext();
  }

  function playNext() {
    if (queue.length === 0) {
      isPlaying = false;
      startMic();
      setallow(false);
      setMessages([]);
      return;
    }
    isPlaying = true;
    const base64 = queue.shift()!;
    playAudio(base64, playNext);
  }

  async function connect() {
    try {
      const res = await fetch("http://localhost:3000/temp/token", { method: "POST" });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      const ai = new GoogleGenAI({
        apiKey: data.token,
        httpOptions: { apiVersion: "v1alpha" },
      });

      const session = await ai.live.connect({
        model: MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          outputAudioTranscription: {},
          systemInstruction: `
          -you start the conversation say hi 
          You are interviewing ${name} for a ${role} ${tech} role.
          Difficulty level: ${difficulty}       
          Rules:
          - Ask one question at a time
          - Start easy → increase difficulty
          - Be conversational
          - After 5 questions, give a score out of 10 with feedback
          -dont be with strict 5 questions..if he wants any clarification about the question help him with that  
          -You are a professional interviewer.
          `,
        },
        callbacks: {
          onmessage: (msg: any) => {
            const transcription: string = msg.serverContent?.outputTranscription?.text;
            const content = msg.serverContent;
            if (content?.modelTurn?.parts) {
              for (const part of content.modelTurn.parts) {
                if (part.inlineData?.data) {
                  enqueueAudio(part.inlineData.data);
                }
              }
            }

            setMessages((prev) => [...prev, { role: "model", text: transcription }]);
          },
          onclose: () => {
            sessionRef.current = null;
            stopMic();
          },
        },
      });

      sessionRef.current = session;
    } catch {}
  }

  async function startMic() {
    if (end) return;
  
    try {
      if (!audioCtx) {
        audioCtx = new AudioContext({ sampleRate: 16000 });
      }
      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }
      if (streamRef.current) return;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
  
      const source = audioCtx.createMediaStreamSource(stream);
      sourceRef.current = source;

      if (!workletLoadedRef.current) {
        const workletCode = `
          class PCMProcessor extends AudioWorkletProcessor {
            process(inputs) {
              const input = inputs[0];
              if (!input || input.length === 0) return true;
              const channel = input[0];
              if (channel) this.port.postMessage(channel);
              return true;
            }
          }
          registerProcessor("pcm-processor", PCMProcessor);
        `;
        const workletUrl = URL.createObjectURL(
          new Blob([workletCode], { type: "application/javascript" })
        );
        await audioCtx.audioWorklet.addModule(workletUrl);
        URL.revokeObjectURL(workletUrl);
        workletLoadedRef.current = true;
      }

      const processor = new AudioWorkletNode(audioCtx, "pcm-processor", {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        channelCount: 1,
      });
      processorRef.current = processor;

      processor.port.onmessage = (e) => {
        if (!sessionRef.current || end) return;
        const input = e.data as Float32Array;
        const base64 = encodePCM(input, audioCtx!.sampleRate);

        sessionRef.current.sendRealtimeInput({
          audio: {
            data: base64,
            mimeType: "audio/pcm;rate=16000",
          },
        });
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);
  
    } catch {}
  }

  return (
    <div className="min-h-screen w-screen bg-black text-white flex flex-col items-center justify-center py-10">
      <h1 className="absolute top-6 text-gray-500 text-sm tracking-widest">
        INTERVIEW.AI
      </h1>

      <div className="flex flex-col items-center gap-12 w-full">

        <div className={`w-40 h-40 rounded-full flex items-center justify-center text-lg font-medium transition-all duration-300
        ${allow
            ? "bg-blue-600 scale-110 shadow-[0_0_60px_#2563eb]"
            : "bg-green-500 shadow-[0_0_40px_#22c55e]"}`}>
          {allow ? "AI" : "YOU"}
        </div>

        <p className="text-gray-400 text-sm">
          {end ? "Session Ended" : allow ? "AI is speaking..." : "Listening..."}
        </p>

        <div className="w-full max-w-3xl px-6">
          {end ? (
            <p className="text-center text-gray-400 text-lg">Session ended !</p>
          ) : (
            <div className="text-center text-xl font-light text-gray-200 leading-relaxed tracking-wide bg-white/5 backdrop-blur-md px-6 py-4 rounded-xl break-words">
              {messages.length === 0
                ? "Start speaking..."
                : messages.map((msg, i) => (
                  <span key={i} className="mr-2">{msg.text}</span>
                ))}
            </div>
          )}
        </div>

        <div className="flex gap-6 mt-6">

          <button
            onClick={startMic}
            disabled={allow}
            className={`p-4 rounded-full transition ${
              allow
                ? "bg-gray-700 cursor-not-allowed"
                : "bg-green-500 hover:scale-110"
            }`}
          >
            <Mic size={28} />
          </button>

          <button
            onClick={() => {
              queue = [];
              try {
                audioSourceRef.current?.stop(0);
              } catch {}
              audioSourceRef.current = null;
              stopMic();
              sessionRef.current?.close();
              sessionRef.current = null;
              setend(true);
            }}
            className="p-4 rounded-full bg-red-600 hover:scale-110 transition"
          >
            <X size={28} />
          </button>
        </div>

        {end && (
          <button
            onClick={() => navigate("/")}
            className="mt-4 text-sm text-gray-400 hover:text-white"
          >
            ← Back to Home
          </button>
        )}
      </div>
    </div>
  );
}

function encodePCM(float32Array: Float32Array, inputSampleRate: number) {
  const targetRate = 16000;
  const ratio = inputSampleRate / targetRate;
  const newLength = Math.round(float32Array.length / ratio);
  const result = new Int16Array(newLength);

  for (let i = 0; i < newLength; i++) {
    const sample = float32Array[Math.floor(i * ratio)]!;
    const s = Math.max(-1, Math.min(1, sample));
    result[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  const bytes = new Uint8Array(result.buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }

  return btoa(binary);
}

export default Interview;