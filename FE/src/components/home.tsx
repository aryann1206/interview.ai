import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, AudioLines } from "lucide-react";

export default function Start() {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [tech, setTech] = useState("");
  const [difficulty, setDifficulty] = useState("EASY");
  const navigate = useNavigate();
  function start(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate("/interview", { state: { name: name.trim(), role: role.trim(), tech: tech.trim(), difficulty } });
  }
  return <main className="site-shell">
    <header className="site-header wrap"><a className="brand" href="/" aria-label="Interview AI home"><span className="brand-mark"><AudioLines size={20} /></span><span>interview<span className="brand-dot">.</span>ai</span></a><span className="availability"><span className="status-dot" /> SYSTEM ONLINE</span></header>
    <div className="wrap home-layout">
      <section className="hero"><div className="eyebrow"><span className="eyebrow-line" /> THE PRACTICE STUDIO / 001</div><h1>Get ready for<br /><em>the real</em> conversation<span className="lime-period">.</span></h1><p className="hero-copy">A space to think out loud, sharpen your answers, and walk into your next interview with confidence.</p><div className="hero-bottom"><span className="asterisk">✳</span><p>Real-time voice practice.<br />Made for your next big move.</p></div></section>
      <section className="setup-card" aria-labelledby="setup-title"><div className="card-topline"><span>SESSION CONFIGURATION</span><span>FIG. 01A ↗</span></div><div className="card-heading"><span className="card-symbol">✳</span><h2 id="setup-title">Make it <em>yours.</em></h2><p>Tell us what you’re preparing for.</p></div>
        <form onSubmit={start}>
          <div className="field"><label htmlFor="name">01 <span>YOUR NAME</span></label><input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="What should we call you?" required /></div>
          <div className="field"><label htmlFor="role">02 <span>TARGET ROLE</span></label><input id="role" value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Frontend Developer" required /></div>
          <div className="field"><label htmlFor="tech">03 <span>TECH STACK</span></label><input id="tech" value={tech} onChange={e => setTech(e.target.value)} placeholder="e.g. React, Node.js, TypeScript" required /></div>
          <div className="field difficulty-field"><label>04 <span>DIFFICULTY LEVEL</span></label><div className="difficulty-options" role="group" aria-label="Difficulty level">{["EASY", "MEDIUM", "HARD"].map(level => <button type="button" key={level} className={difficulty === level ? "difficulty active" : "difficulty"} aria-pressed={difficulty === level} onClick={() => setDifficulty(level)}>{level}</button>)}</div></div>
          <button className="primary-button" type="submit"><span>Start interview</span><ArrowUpRight size={21} /></button>
        </form><div className="card-footer"><span>✳</span> A BETTER INTERVIEW STARTS WITH PRACTICE.</div></section>
    </div><footer className="site-footer wrap"><span>© 2026 INTERVIEW.AI</span><span>PREPARE WITH PURPOSE ✳</span></footer>
  </main>;
}
