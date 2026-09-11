import { useState, useRef, useEffect } from "react";

// Pattern artifact - Dead Man's Switch (live heartbeat trace).
// A healthy system beats; an outside observer counts. Kill the system and the trace flatlines: the "wait for
// an error" detector never fires (a dead system sends nothing), but the dead man's switch watches the silence
// grow and, past its threshold, raises the alert. Silence itself is the signal.

const BG = "#08090D", SURFACE = "#0F1118", SURFACE2 = "#161922", BORDER = "#1F2333";
const TEXT = "#C8CDD8", MUTED = "#6B7280";
const GREEN = "#22C55E", AMBER = "#F5B841", RED = "#EF4444", ACCENT = "#F97316";
const MONO = "'JetBrains Mono','Fira Code',ui-monospace,monospace";

const N = 60, THRESH = 3.0; // seconds of silence before the switch fires
const sampleAlive = (ph) => (ph === 2 ? 1 : ph === 1 || ph === 3 ? 0.32 : 0.05);

function healthyBuf() { const b = []; for (let i = 0; i < N; i++) b.push(sampleAlive(i % 10)); return b; }

export default function PatternDeadMansSwitch() {
  const [alive, setAlive] = useState(true);
  const [, force] = useState(0);
  const aliveRef = useRef(true), tRef = useRef(0), deadRef = useRef(0), buf = useRef(healthyBuf());
  useEffect(() => { aliveRef.current = alive; }, [alive]);

  useEffect(() => {
    const h = setInterval(() => {
      tRef.current += 1;
      let s;
      if (aliveRef.current) { s = sampleAlive(tRef.current % 10); deadRef.current = 0; }
      else { s = 0.05; deadRef.current += 1; }
      buf.current = buf.current.slice(1).concat([s]);
      force((n) => n + 1);
    }, 100);
    return () => clearInterval(h);
  }, []);

  const silence = deadRef.current / 10;          // seconds since the last beat
  const fired = !alive && silence >= THRESH;      // dead man's switch alert
  const kill = () => setAlive(false);
  const reset = () => { setAlive(true); deadRef.current = 0; tRef.current = 0; buf.current = healthyBuf(); force((n) => n + 1); };

  // trace geometry
  const VW = 700, X0 = 12, X1 = 688, YB = 74, AMP = 52;
  const traceColor = alive ? GREEN : (fired ? RED : AMBER);
  const pts = buf.current.map((v, i) => (X0 + (X1 - X0) * i / (N - 1)).toFixed(1) + "," + (YB - v * AMP).toFixed(1)).join(" ");

  return (
    <div style={{ background: BG, color: TEXT, fontFamily: MONO, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid " + BORDER, fontSize: 12.5, lineHeight: 1.55 }}>
      <div style={{ color: ACCENT, fontSize: 10.5, letterSpacing: 2 }}>DEAD MAN'S SWITCH - SILENCE IS THE ALERT</div>
      <div style={{ color: "#EDEFF3", fontSize: 16.5, margin: "4px 0 3px", fontWeight: 700 }}>Catch the failure that can't call for help</div>
      <p style={{ color: "#9096A6", fontSize: 12, margin: 0 }}>A healthy system sends a heartbeat; an outside observer counts it. Kill the system and watch which detector notices - the one waiting for an error, or the one watching for silence.</p>

      {/* heartbeat trace */}
      <div style={{ marginTop: 14, background: "#0A0B0F", border: "1px solid " + BORDER, borderRadius: 8, padding: "10px 6px 6px" }}>
        <svg viewBox={"0 0 " + VW + " 90"} style={{ width: "100%", height: "auto" }}>
          <line x1={X0} y1={YB} x2={X1} y2={YB} stroke="#1C2130" strokeWidth="1" />
          <polyline points={pts} fill="none" stroke={traceColor} strokeWidth="2" />
        </svg>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "0 6px", fontSize: 10.5 }}>
          <span style={{ color: alive ? GREEN : RED }}>{alive ? "beating - system alive" : "heartbeat stopped"}</span>
          <span style={{ color: silence >= THRESH ? RED : MUTED }}>silence: {silence.toFixed(1)}s / {THRESH.toFixed(1)}s to alert</span>
        </div>
      </div>

      {/* two detectors */}
      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 0", background: SURFACE, border: "1px solid " + ((!alive && !fired) || alive ? BORDER : RED), borderRadius: 8, padding: "11px 13px" }}>
          <div style={{ color: "#AEB4C2", fontWeight: 700, fontSize: 12 }}>Waits for a failure signal</div>
          <div style={{ color: !alive ? RED : MUTED, fontSize: 12.5, fontWeight: 700, marginTop: 4 }}>{!alive ? "still quiet - MISSED" : "quiet - all healthy"}</div>
          <div style={{ color: "#7C8290", fontSize: 10.5, marginTop: 3 }}>{!alive ? "the dead system sent no error, so it never fired" : "waiting for an error to arrive"}</div>
        </div>
        <div style={{ flex: "1 1 0", background: SURFACE, border: "1px solid " + (fired ? GREEN : BORDER), borderRadius: 8, padding: "11px 13px" }}>
          <div style={{ color: "#AEB4C2", fontWeight: 700, fontSize: 12 }}>Dead man's switch</div>
          <div style={{ color: fired ? GREEN : (!alive ? AMBER : MUTED), fontSize: 12.5, fontWeight: 700, marginTop: 4 }}>{fired ? "ALERT - heartbeat stopped" : (!alive ? "counting the silence..." : "counting heartbeats")}</div>
          <div style={{ color: "#7C8290", fontSize: 10.5, marginTop: 3 }}>{fired ? "the silence crossed the threshold - it fired" : (!alive ? "waiting " + THRESH.toFixed(1) + "s before it alerts" : "resets every beat")}</div>
        </div>
      </div>

      {/* actions */}
      <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={kill} disabled={!alive} style={{ padding: "8px 15px", borderRadius: 7, cursor: !alive ? "not-allowed" : "pointer", fontFamily: MONO, fontSize: 12, fontWeight: 700, border: "1px solid " + (!alive ? "#333947" : RED), background: !alive ? "#0C0D13" : RED + "22", color: !alive ? "#565C6B" : "#F0A6A6" }}>Kill the system (silent death)</button>
        <button onClick={reset} style={{ padding: "8px 12px", borderRadius: 7, cursor: "pointer", fontFamily: MONO, fontSize: 11.5, border: "1px solid " + BORDER, background: "transparent", color: "#9AA0B0" }}>&#8635; revive</button>
      </div>

      <div style={{ color: "#8B90A0", fontSize: 12, marginTop: 13, borderTop: "1px solid " + BORDER, paddingTop: 10, lineHeight: 1.65 }}>
        Most monitoring waits for a failure signal - but a system that has crashed or been cut off sends nothing, so the loudest failures make no sound. A dead man's switch flips it: the healthy system proves it is alive with a heartbeat, and when that heartbeat goes silent, the silence itself is the alert - caught by an observer simple enough to just count, living where the outage cannot reach it.
      </div>
    </div>
  );
}
