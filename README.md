<img width="1882" height="866" alt="Screenshot 2026-10-27 225831" src="https://github.com/user-attachments/assets/4f9b13e6-7039-4cdc-b9dc-1079bb09176f" />
<img width="1897" height="857" alt="new" src="https://github.com/user-attachments/assets/1160baad-0bdd-4bcf-9fec-58ed801edc33" />




## 🤖 AI Mock Interview Platform

### Run locally

Install [Bun](https://bun.com), then run these commands from the repository root:

```powershell
bun run setup
Copy-Item .env.example .env
```

Put your Gemini API key in the new `.env` file, then start both services:

```powershell
bun run dev
```

Open **http://localhost:3001**. The voice backend runs at **http://localhost:3000**. Press **Ctrl+C** in the terminal to stop both services.

A real-time AI-based interview simulator designed to replicate real-world technical interviews.

The system interacts with users through voice, asks context-aware questions based on selected roles and technologies, and processes responses using live audio input.

It aims to provide a natural, human-like interview experience by maintaining conversational flow, adaptive questioning, and controlled pacing.



## ✨ Features

- 🎤 Real-time voice interaction (mic input)
- 🤖 AI-generated interview questions
- 🎯 Role & tech-based customization
- ⚡ Difficulty selection (Easy / Medium / Hard)
- 🧠 Conversational (not rapid-fire)
- ⏹️ Stop / control AI speech
