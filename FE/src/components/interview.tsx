import { AudioLines, Mic, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { GoogleGenAI, Modality, type Session } from "@google/genai";
import "../index.css";

const MODEL = "gemini-3.1-flash-live-preview";
type Status = "idle" | "connecting" | "listening" | "speaking" | "error" | "ended";
type InterviewDetails = { name: string; role: string; difficulty: string; tech: string };

export function Interview() {
  const { state } = useLocation() as { state: InterviewDetails | null };
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [transcript, setTranscript] = useState("");
  const transcriptRef = useRef<HTMLParagraphElement | null>(null);
  const statusRef = useRef<Status>("idle");
  const endedRef = useRef(false);
  const sessionRef = useRef<Session | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<AudioWorkletNode | null>(null);
  const workletLoadedRef = useRef(false);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const playingRef = useRef(false);
  const turnCompleteRef = useRef(false);

  function changeStatus(next: Status) {
    statusRef.current = next;
    setStatus(next);
  }

  function isSpeaking() {
    return statusRef.current === "speaking";
  }

  function stopMic() {
    processorRef.current?.disconnect();
    processorRef.current = null;
    sourceRef.current?.disconnect();
    sourceRef.current = null;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  }

  function stopPlayback() {
    audioQueueRef.current = [];
    turnCompleteRef.current = false;
    playingRef.current = false;
    const source = audioSourceRef.current;
    audioSourceRef.current = null;
    if (source) {
      source.onended = null;
      try { source.stop(); } catch { /* Already stopped. */ }
      source.disconnect();
    }
  }

  function closeSession() {
    endedRef.current = true;
    stopMic();
    stopPlayback();
    sessionRef.current?.close();
    sessionRef.current = null;
    void audioContextRef.current?.close();
    audioContextRef.current = null;
  }

  useEffect(() => {
    if (!state) navigate("/", { replace: true });
    return () => closeSession();
  }, []);

  useEffect(() => {
    const panel = transcriptRef.current;
    if (panel) panel.scrollTop = panel.scrollHeight;
  }, [transcript]);

  async function startMic() {
    if (endedRef.current || !sessionRef.current || streamRef.current) return;
    try {
      const context = audioContextRef.current;
      if (!context) throw new Error("Audio is unavailable. Please restart the interview.");
      if (context.state === "suspended") await context.resume();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      if (endedRef.current || isSpeaking()) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      streamRef.current = stream;
      if (!workletLoadedRef.current) {
        const code = `class PCMProcessor extends AudioWorkletProcessor {
          process(inputs) {
            const channel = inputs[0]?.[0];
            if (channel) this.port.postMessage(channel);
            return true;
          }
        }
        registerProcessor("pcm-processor", PCMProcessor);`;
        const url = URL.createObjectURL(new Blob([code], { type: "application/javascript" }));
        try { await context.audioWorklet.addModule(url); } finally { URL.revokeObjectURL(url); }
        workletLoadedRef.current = true;
      }
      if (endedRef.current || isSpeaking()) { stopMic(); return; }
      const source = context.createMediaStreamSource(stream);
      const processor = new AudioWorkletNode(context, "pcm-processor", {
        numberOfInputs: 1, numberOfOutputs: 0, channelCount: 1,
      });
      sourceRef.current = source;
      processorRef.current = processor;
      processor.port.onmessage = event => {
        if (endedRef.current || statusRef.current !== "listening" || !sessionRef.current) return;
        try {
          sessionRef.current.sendRealtimeInput({
            audio: { data: encodePCM(event.data as Float32Array, context.sampleRate), mimeType: "audio/pcm;rate=16000" },
          });
        } catch (cause) { showError(cause); }
      };
      source.connect(processor);
      changeStatus("listening");
    } catch (cause) {
      stopMic();
      showError(cause);
    }
  }

  function playNext() {
    if (endedRef.current) return;
    const next = audioQueueRef.current.shift();
    if (!next) {
      playingRef.current = false;
      audioSourceRef.current = null;
      if (turnCompleteRef.current) {
        turnCompleteRef.current = false;
        resumeListening();
      }
      return;
    }
    const context = audioContextRef.current;
    if (!context) { showError(new Error("Audio output is unavailable.")); return; }
    try {
      const bytes = Uint8Array.from(atob(next), character => character.charCodeAt(0));
      const samples = new Int16Array(bytes.buffer);
      const buffer = context.createBuffer(1, samples.length, 24000);
      const channel = buffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++) channel[i] = samples[i]! / 32768;
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      source.onended = () => { source.disconnect(); audioSourceRef.current = null; playNext(); };
      audioSourceRef.current = source;
      source.start();
    } catch (cause) { showError(cause); }
  }

  function resumeListening() {
    if (endedRef.current) return;
    changeStatus("listening");
    void startMic();
  }

  function showError(cause: unknown) {
    if (endedRef.current) return;
    const message = cause instanceof Error ? cause.message : "Something went wrong. Please try again.";
    setError(message);
    changeStatus("error");
    stopMic();
    stopPlayback();
    sessionRef.current?.close();
    sessionRef.current = null;
  }

  async function connect() {
    if (endedRef.current || statusRef.current === "connecting") return;
    setError("");
    changeStatus("connecting");
    try {
      if (!audioContextRef.current || audioContextRef.current.state === "closed") {
        audioContextRef.current = new AudioContext({ sampleRate: 16000 });
        workletLoadedRef.current = false;
      }
      await audioContextRef.current.resume();
      const response = await fetch("http://localhost:3000/temp/token", { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.token) throw new Error(data.error || "Could not start the interview. Check the backend and API key.");
      if (endedRef.current) return;
      const ai = new GoogleGenAI({ apiKey: data.token, httpOptions: { apiVersion: "v1beta" } });
      const session = await ai.live.connect({
        model: MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          outputAudioTranscription: {},
          systemInstruction: `You are a professional interviewer. Interview ${state?.name} for a ${state?.role} role using ${state?.tech}. Difficulty: ${state?.difficulty}. Ask one question at a time, be conversational, offer clarification when asked, and give a score out of 10 with feedback after about five questions.`,
        },
        callbacks: {
          onmessage: message => {
            if (endedRef.current) return;
            const content = message.serverContent;
            const text = content?.outputTranscription?.text;
            if (text) setTranscript(previous => previous + text);
            if (content?.interrupted) {
              stopPlayback();
              resumeListening();
              return;
            }
            for (const part of content?.modelTurn?.parts ?? []) {
              if (part.inlineData?.data) {
                if (statusRef.current !== "speaking") {
                  stopMic();
                  changeStatus("speaking");
                }
                audioQueueRef.current.push(part.inlineData.data);
                if (!playingRef.current) {
                  playingRef.current = true;
                  playNext();
                }
              }
            }
            if (content?.turnComplete) {
              turnCompleteRef.current = true;
              if (!playingRef.current) resumeListening();
            }
          },
          onerror: () => showError(new Error("The interview connection was interrupted. Start a new session.")),
          onclose: () => {
            sessionRef.current = null;
            if (!endedRef.current && statusRef.current !== "error") showError(new Error("The interview connection closed. Start a new session."));
          },
        },
      });
      if (endedRef.current) { session.close(); return; }
      sessionRef.current = session;
      changeStatus("speaking");
      session.sendClientContent({
        turns: [{ role: "user", parts: [{ text: "Begin the interview. Greet me briefly and ask your first question." }] }],
        turnComplete: true,
      });
    } catch (cause) { showError(cause); }
  }

  function endInterview() {
    closeSession();
    changeStatus("ended");
  }

  if (!state) return null;
  const { name, role, difficulty, tech } = state;
  const speaking = status === "speaking";
  const ended = status === "ended";
  const heading = ended ? <>Well <em>done.</em></> : speaking ? <>Listen <em>closely.</em></> : status === "connecting" ? <>Getting <em>ready.</em></> : status === "error" ? <>Let's <em>retry.</em></> : status === "idle" ? <>Ready to <em>begin?</em></> : <>You're <em>on air.</em></>;
  const note = ended ? "Every conversation makes the next one easier." : status === "connecting" ? "Connecting to your interviewer..." : status === "error" ? error : status === "idle" ? "Start when you're ready. Allow microphone access when prompted." : speaking ? "Take your time. Your turn is next." : "Speak naturally when you're ready.";

  return <main className="site-shell">
    <header className="site-header wrap"><a className="brand" href="/" aria-label="Interview AI home"><span className="brand-mark"><Mic size={19} /></span><span>interview<span className="brand-dot">.</span>ai</span></a><span className="availability"><span className="status-dot" /> {ended ? "SESSION COMPLETE" : status === "error" ? "CONNECTION ERROR" : status === "idle" ? "READY" : "LIVE SESSION"}</span></header>
    <div className="wrap session-layout">
      <section className="session-main" aria-label="Live interview">
        <div className="session-overline"><span>VOICE INTERVIEW / 001</span><span>{status.toUpperCase()} ●</span></div>
        <div className="session-stage">
          <div className={`voice-orbit ${ended ? "ended" : speaking ? "speaking" : ""}`}><div className="voice-core">{ended ? <X size={44} strokeWidth={1.5} /> : speaking ? <AudioLines size={48} strokeWidth={1.5} /> : <Mic size={48} strokeWidth={1.5} />}</div></div>
          <div className="session-state">{ended ? "Session ended" : status === "error" ? "Connection issue" : status === "idle" ? "Ready when you are" : status === "connecting" ? "Connecting" : speaking ? "Interviewer speaking" : "Your turn to speak"}</div>
          <h1 className="interview-title">{heading}</h1>
          <p className="stage-help" role={status === "error" ? "alert" : undefined}>{note}</p>
          {ended && <a className="back-link" href="/">← Start another session</a>}
        </div>
        <div className="session-controls"><span className="control-note">{ended ? "Your practice session has finished." : status === "idle" || status === "error" ? "Start the session to connect with your interviewer." : "Use the microphone to speak. End the session whenever you need."}</span><div className="control-buttons">
          {(status === "idle" || status === "error") ? <button className="primary-button session-start" onClick={connect}>Start interview</button> : <button className="round-control" onClick={startMic} disabled={speaking || status === "connecting" || ended || status === "listening"} aria-label="Start microphone" title="Start microphone"><Mic size={21} /></button>}
          <button className="round-control end-control" onClick={endInterview} disabled={ended} aria-label="End interview" title="End interview"><X size={21} /></button>
        </div></div>
      </section>
      <aside className="session-aside">
        <div className="aside-card"><div className="aside-overline"><span>SESSION BRIEF</span><span>FIG. 02A</span></div><div className="session-details"><div className="detail-row"><span>CANDIDATE</span><strong>{name}</strong></div><div className="detail-row"><span>TARGET ROLE</span><strong>{role}</strong></div><div className="detail-row"><span>TECH STACK</span><strong>{tech}</strong></div><div className="detail-row"><span>DIFFICULTY</span><strong className="level">{difficulty}</strong></div></div></div>
        <div className="aside-card transcript-card"><div className="aside-overline"><span>LIVE TRANSCRIPT</span><span>↗</span></div><p ref={transcriptRef} className={transcript ? "transcript-text" : "transcript-text transcript-empty"} aria-live="polite">{transcript || (ended ? "Session complete." : "The conversation will appear here as it happens...")}</p><div className="transcript-foot">✳ WORDS IN MOTION</div></div>
      </aside>
    </div>
    <footer className="site-footer wrap"><span>© 2026 INTERVIEW.AI</span><span>PREPARE WITH PURPOSE ✳</span></footer>
  </main>;
}

function encodePCM(input: Float32Array, sampleRate: number) {
  const ratio = sampleRate / 16000;
  const output = new Int16Array(Math.floor(input.length / ratio));
  for (let i = 0; i < output.length; i++) {
    const sample = Math.max(-1, Math.min(1, input[Math.floor(i * ratio)] ?? 0));
    output[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  const bytes = new Uint8Array(output.buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export default Interview;
