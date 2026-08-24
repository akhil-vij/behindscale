import { useState, useEffect, useRef } from "react";

// Pattern artifact - Retry with Backoff and Jitter (general mechanism).
// Press Run: the herd retries over 14 ticks and the load bars fill in one tick at a time, so you WATCH
// the synchronized waves re-crash the server (no backoff / backoff) or the jittered load stay smooth.
// Structural grays use the named artifact tokens; GREEN/AMBER/RED and ACCENT are content accents.

const BG = "#08090D", SURFACE = "#0F1118", SURFACE2 = "#161922", BORDER = "#1F2333";
const TEXT = "#C8CDD8", MUTED = "#6B7280";
const GREEN = "#22C55E", AMBER = "#F5B841", RED = "#EF4444", ACCENT = "#F97316";
const MONO = "'JetBrains Mono','Fira Code',ui-monospace,monospace";

const T = 14;                     // time ticks
const C = 10;                     // server capacity per tick
const SPIKES = [0, 1, 3, 7, 13];  // synchronized backoff waves (getting further apart)
const CH = 150;                   // chart height in px
const maxDisplay = 24;            // fixed scale: capacity line stays legible; over-capacity bars clip

function loadFor(mode, n) {
  const a = Array(T).fill(0);
  if (mode === "none") { for (let t = 0; t < T; t++) a[t] = n; }
  else if (mode === "backoff") { SPIKES.forEach((t) => { a[t] = n; }); }
  else { const base = Math.floor(n / T), r = n % T; for (let t = 0; t < T; t++) a[t] = base + (t < r ? 1 : 0); }
  return a;
}

export default function PatternRetryBackoff() {
  const [mode, setMode] = useState("none");
  const [n, setN] = useState(42);
  const [tick, setTick] = useState(T);   // how many ticks are revealed (T = fully shown)
  const [running, setRunning] = useState(false);
  const timer = useRef(null);

  const full = loadFor(mode, n);
  // only reveal load up to the current tick while running
  const shown = full.map((v, i) => (i < tick ? v : null));
  const revealed = full.slice(0, tick);
  const peakSoFar = revealed.length ? Math.max.apply(null, revealed) : 0;
  const peakFull = Math.max.apply(null, full);
  const everOver = revealed.some((v) => v > C);
  const done = tick >= T;

  useEffect(() => () => clearInterval(timer.current), []);
  const stop = () => { clearInterval(timer.current); setRunning(false); };
  const run = () => {
    clearInterval(timer.current);
    setTick(0); setRunning(true);
    let k = 0;
    timer.current = setInterval(() => {
      k += 1; setTick(k);
      if (k >= T) { clearInterval(timer.current); setRunning(false); }
    }, 240);
  };
  const pick = (id) => { stop(); setMode(id); setTick(T); };
  const setHerd = (val) => { stop(); setN(val); setTick(T); };

  // status reflects what has happened so far in the run
  const overNow = everOver;
  const status = overNow
    ? { c: RED, code: "SERVER DOWN", t: "a retry wave went over the line" }
    : (done
        ? { c: GREEN, code: "SERVER RECOVERED", t: "every tick stayed under the line" }
        : { c: MUTED, code: "RECEIVING RETRIES", t: "watching the load build" });

  let v;
  if (mode === "none") {
    v = { c: RED, t: "No backoff: every client retries on every tick, so the server is pinned at " + n + " a tick against a capacity of " + C + ". It never gets a break to recover." };
  } else if (mode === "backoff") {
    v = { c: RED, t: "Backoff, no jitter: fewer waves, but the clients still retry at the same moments - so each wave is the whole herd, " + n + " at once, about " + Math.round(n / C) + "x over the line. Every wave knocks the server back down." };
  } else if (peakFull <= C) {
    v = { c: GREEN, t: "Backoff + jitter: each client waits a slightly random time, so the " + n + " retries spread to about " + peakFull + " a tick - under the capacity of " + C + ". The server absorbs the load and recovers." };
  } else {
    v = { c: AMBER, t: "Backoff + jitter: even spread out, " + n + " retries come to about " + peakFull + " a tick - still over the line of " + C + ". Jitter smooths the rate, but this much volume needs a retry budget or server-side shedding." };
  }

  const modeBtn = (id, label, sub) => {
    const on = mode === id;
    return (
      <button onClick={() => pick(id)} style={{ flex: "1 1 150px", textAlign: "left", padding: "9px 12px", borderRadius: 8, cursor: "pointer", fontFamily: MONO, border: "1px solid " + (on ? ACCENT : "#333947"), background: on ? "rgba(249,115,22,0.12)" : "#0C0D13", color: TEXT }}>
        <div style={{ color: on ? ACCENT : "#AEB4C2", fontWeight: 700, fontSize: 11.5 }}>{label}</div>
        <div style={{ color: "#7C8290", fontSize: 10, marginTop: 2, lineHeight: 1.4 }}>{sub}</div>
      </button>
    );
  };

  return (
    <div style={{ background: BG, color: TEXT, fontFamily: MONO, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid " + BORDER, fontSize: 12, lineHeight: 1.5 }}>
      <div style={{ color: ACCENT, fontSize: 10, letterSpacing: 2 }}>RETRY WITH BACKOFF AND JITTER - THE PATTERN, GENERAL</div>
      <div style={{ color: "#EDEFF3", fontSize: 16, margin: "4px 0 2px", fontWeight: 700 }}>A crowd of clients retries a server that just failed</div>
      <p style={{ color: "#8B90A0", fontSize: 11, margin: 0 }}>Press Run and watch the retries arrive tick by tick. Sent in sync they are spikes that re-crash the server; spread apart they are a curve it can absorb.</p>

      {/* mode buttons */}
      <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {modeBtn("none", "No backoff", "retry on every tick")}
        {modeBtn("backoff", "Backoff, no jitter", "same schedule -> waves")}
        {modeBtn("jitter", "Backoff + jitter", "spread each wait")}
      </div>

      {/* herd slider + run */}
      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", background: SURFACE, border: "1px solid " + BORDER, borderRadius: 8, padding: "9px 12px" }}>
        <span style={{ color: MUTED, fontSize: 10, letterSpacing: 1.2 }}>HERD SIZE</span>
        <input type="range" min="14" max="168" step="14" value={n} onChange={(e) => setHerd(Number(e.target.value))} style={{ flex: "1 1 130px", accentColor: ACCENT }} />
        <span style={{ fontWeight: 700, color: TEXT, minWidth: 74 }}>{n} clients</span>
        <button onClick={running ? stop : run} style={{ marginLeft: "auto", padding: "7px 18px", borderRadius: 7, cursor: "pointer", fontFamily: MONO, fontSize: 12, fontWeight: 700, border: "1px solid " + ACCENT, background: running ? "transparent" : ACCENT, color: running ? ACCENT : "#0A0B0F" }}>{running ? "Stop" : (done ? "\u21BA Run" : "Run")}</button>
      </div>

      {/* chart */}
      <div style={{ marginTop: 12, background: SURFACE, border: "1px solid " + BORDER, borderRadius: 8, padding: "12px 14px 10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", color: MUTED, fontSize: 10, letterSpacing: 1.2, marginBottom: 8 }}>
          <span>RETRY LOAD PER TICK</span>
          <span>tick {Math.min(tick, T)} / {T} &nbsp;·&nbsp; capacity {C}/tick</span>
        </div>
        <div style={{ position: "relative", height: CH, display: "flex", alignItems: "flex-end", gap: 4 }}>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: (C / maxDisplay) * CH, borderTop: "1px dashed " + AMBER, pointerEvents: "none" }}>
            <span style={{ position: "absolute", right: 0, top: -14, color: AMBER, fontSize: 9 }}>capacity</span>
          </div>
          {shown.map((val, t) => {
            if (val === null) return <div key={t} style={{ flex: 1, height: 2, background: "#1a1e2a", borderRadius: "3px 3px 0 0" }} />;
            const over = val > C;
            const col = val === 0 ? "#242938" : over ? RED : GREEN;
            const isCurrent = running && t === tick - 1;
            return <div key={t} title={val + " retries"} style={{ flex: 1, height: Math.max(Math.min(val / maxDisplay, 1) * CH, val > 0 ? 3 : 2), background: col + (val === 0 ? "" : "cc"), border: "1px solid " + col, boxShadow: isCurrent ? "0 0 0 2px rgba(249,115,22,0.5)" : "none", borderRadius: "3px 3px 0 0", transition: "height .18s ease" }} />;
          })}
        </div>
      </div>

      {/* status + verdict */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
        <div style={{ flex: "1 1 160px", minWidth: 160, background: SURFACE, border: "1px solid " + status.c, borderRadius: 8, padding: 12 }}>
          <div style={{ color: status.c, fontWeight: 700, fontSize: 13 }}>{status.code}</div>
          <div style={{ color: MUTED, fontSize: 10.5, marginTop: 4, lineHeight: 1.5 }}>{status.t}</div>
          <div style={{ color: MUTED, fontSize: 10, letterSpacing: 1.2, marginTop: 10 }}>PEAK SO FAR</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: overNow ? RED : (done ? GREEN : TEXT) }}>{peakSoFar}<span style={{ fontSize: 12, color: MUTED }}> / {C}</span></div>
        </div>
        <div style={{ flex: "2 1 320px", minWidth: 260, background: SURFACE, border: "1px solid " + v.c, borderRadius: 8, padding: "11px 13px" }}>
          <div style={{ fontSize: 11.5, lineHeight: 1.6, color: TEXT }}>{v.t}</div>
        </div>
      </div>

      <div style={{ color: MUTED, fontSize: 10, marginTop: 12, borderTop: "1px solid " + BORDER, paddingTop: 8, lineHeight: 1.7 }}>
        Backoff and jitter are the client-side half of overload protection. The server-side half is dropping load it cannot serve. A system under real pressure usually needs both.
      </div>
    </div>
  );
}
