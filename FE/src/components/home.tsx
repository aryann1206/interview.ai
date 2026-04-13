import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../index.css";

function Start() {
  const [name, setname] = useState("");
  const [role, setrole] = useState("");
  const [tech, settech] = useState("");
  const [diff, setdiff] = useState("EASY");
  let navigate = useNavigate();

  return (
    <div className="min-h-screen w-screen bg-black text-white flex items-center justify-center">
  
      {/* Container */}
      <div className="w-full max-w-md px-6 py-8 bg-white/5 backdrop-blur-md rounded-2xl flex flex-col gap-6 shadow-lg">
  
        {/* Title */}
        <h1 className="text-center text-2xl font-light tracking-widest text-gray-300">
          INTERVIEW.AI
        </h1>
  
        {/* Inputs */}
        <div className="flex flex-col gap-4">
  
          <input
            value={name}
            onChange={(e) => setname(e.target.value)}
            placeholder="Your name"
            className="bg-white/10 border border-gray-700 px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
          />
  
          <input
            value={role}
            onChange={(e) => setrole(e.target.value)}
            placeholder="Role (e.g. Frontend Developer)"
            className="bg-white/10 border border-gray-700 px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
          />
  
          <input
            value={tech}
            onChange={(e) => settech(e.target.value)}
            placeholder="Tech stack (React, Node...)"
            className="bg-white/10 border border-gray-700 px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>
  
        {/* Difficulty */}
        <div className="flex justify-between gap-3">
          {["EASY", "MEDIUM", "HARD"].map((level) => (
            <button
              key={level}
              onClick={() => setdiff(level)}
              className={`flex-1 py-2 rounded-lg text-sm transition
                ${
                  diff === level
                    ? "bg-blue-600 text-white"
                    : "bg-white/10 text-gray-300 hover:bg-white/20"
                }`}
            >
              {level}
            </button>
          ))}
        </div>
  
        {/* Start Button */}
        <button
          onClick={() =>
            navigate("/interview", {
              state: { name, role, tech, difficulty: diff },
            })
          }
          className="w-full py-3 rounded-lg bg-green-500 hover:bg-green-400 transition text-black font-medium"
        >
          Start Interview
        </button>
      </div>
    </div>
  );
}

export default Start;