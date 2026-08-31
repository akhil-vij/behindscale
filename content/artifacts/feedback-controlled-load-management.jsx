import { useState, useEffect, useRef } from "react";

// Pattern artifact - Feedback-Controlled Load Management (live rolling chart).
// Capacity waves up and down over time. A STATIC limit sits flat: sometimes far below capacity (wasting work
// it could serve), sometimes above it (admitting more than the system can take -> overload). No single flat
// value is right. Switch to the FEEDBACK loop and the limit starts to follow the capacity line, keeping the
// admitted load near capacity - with a small lag, which is the loop's control latency.

const BG = "#08090D", SURFACE = "#0F1118", SURFACE2 = "#161922", BORDER = "#1F2333";
const TEXT = "#C8CDD8", MUTED = "#6B7280";
const GREEN = "#22C55E", AMBER = "#F5B841", RED = "#EF4444", ACCENT = "#F97316", GRAY = "#8A93A5";
const MONO = "'JetBrains Mono','Fira Code',ui-monospace,monospace";

const OFFERED = 170, W = 64, YMAX = 200, STEP_UP = 4, STEP_DN = 6;
const cap = (t) => 110 + 48 * Math.sin(t * 0.09);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// geometry
const VW = 860, PX0 = 46, PX1 = 820, PY0 = 20, PY1 = 176;
const xFor = (i) => PX0 + (PX1 - PX0) * i / (W - 1);
const yFor = (v) => PY1 - (PY1 - PY0) * v / YMAX;

function makeInitial(limit) {
  const b = [];
  for (let t = 0; t < W; t++) {
    const c = cap(t), L = limit, admitted = Math.min(OFFERED, L);
    b.push({ t, c, L, admitted, over: admitted > c + 2 });
  }
  return b;
}

export default function PatternFeedbackControlledLoadManagement() {
  const [mode, setMode] = useState("static");   // static | feedback  (problem-first: static)
  const [staticLimit, setStaticLimit] = useState(100);
  const [, setTick] = useState(0);
  const buf = useRef(makeInitial(100));
  const Lref = useRef(100);
  const modeRef = useRef(mode), limRef = useRef(staticLimit);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { limRef.current = staticLimit; }, [staticLimit]);

  useEffect(() => {
    const id = setInterval(() => {
      const last = buf.current[buf.current.length - 1];
      const t = last.t + 1, c = cap(t);
      let L;
      if (modeRef.current === "static") { L = limRef.current; Lref.current = limRef.current; }
      else {
        const adm = Math.min(OFFERED, Lref.current);
        if (adm > c) Lref.current -= STEP_DN; else if (adm < c) Lref.current += STEP_UP;
        Lref.current = clamp(Lref.current, 10, 200);
        L = Lref.current;
      }
      const admitted = Math.min(OFFERED, L);
      buf.current = buf.current.concat([{ t, c, L, admitted, over: admitted > c + 2 }]).slice(-W);
      setTick(t);
    }, 130);
    return () => clearInterval(id);
  }, []);

  const b = buf.current;
  const capPts = b.map((s, i) => xFor(i) + "," + yFor(s.c)).join(" ");
  const limPts = b.map((s, i) => xFor(i) + "," + yFor(s.L)).join(" ");
  const cur = b[b.length - 1];
  const gap = cur.L - cur.c;

  let v;
  if (mode === "feedback") v = { c: GREEN, code: "TRACKING", t: "The limit follows capacity up and down, so the admitted load stays near what the system can take. The small lag behind the line is the loop's reaction time." };
  else if (gap > 14) v = { c: RED, code: "OVERLOADED", t: "The fixed limit is above capacity right now, so it admits more than the system can serve. Latency climbs and the system heads for a cliff." };
  else if (gap < -14) v = { c: AMBER, code: "WASTING CAPACITY", t: "Capacity is well above the fixed limit right now, so the system is turning away work it could easily have served." };
  else v = { c: GREEN, code: "OK - FOR THIS MOMENT", t: "The fixed limit happens to match capacity right now. Watch a few seconds: as capacity moves, the same number becomes too high or too low." };

  return (
    <div style={{ background: BG, color: TEXT, fontFamily: MONO, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid " + BORDER, fontSize: 12.5, lineHeight: 1.55 }}>
      <div style={{ color: ACCENT, fontSize: 10.5, letterSpacing: 2 }}>FEEDBACK-CONTROLLED LOAD MANAGEMENT - A LIMIT THAT TRACKS CAPACITY</div>
      <div style={{ color: "#EDEFF3", fontSize: 16.5, margin: "4px 0 3px", fontWeight: 700 }}>One number can't match a moving target</div>
      <p style={{ color: "#9096A6", fontSize: 12, margin: 0 }}>Capacity keeps moving. A fixed limit sits flat - too low when capacity is high, too high when it drops. Switch to the feedback loop and the limit starts to follow the dynamic capacity.</p>

      {/* mode toggle */}
      <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
        {[["static", "Static limit"], ["feedback", "Feedback loop"]].map(([k, lab]) => (
          <button key={k} onClick={() => setMode(k)} style={{ flex: "1 1 0", padding: "9px 12px", borderRadius: 7, cursor: "pointer", fontFamily: MONO, fontSize: 12.5, fontWeight: 700, border: "1px solid " + (mode === k ? ACCENT : "#333947"), background: mode === k ? ACCENT + "1E" : "#0C0D13", color: mode === k ? "#EDEFF3" : "#9AA0B0" }}>{lab}</button>
        ))}
      </div>

      {/* static-limit slider (only in static mode) */}
      {mode === "static" ? (
        <div style={{ marginTop: 9, padding: "10px 13px", borderRadius: 8, border: "1px solid #333947", background: "#0C0D13" }}>
          <div style={{ color: "#AEB4C2", fontWeight: 700, fontSize: 12.5 }}>Fixed limit: {staticLimit}</div>
          <input type="range" min="40" max="180" step="5" value={staticLimit} onChange={(e) => setStaticLimit(Number(e.target.value))} style={{ width: "100%", marginTop: 7, accentColor: ACCENT }} />
          <div style={{ color: "#7C8290", fontSize: 11 }}>pick any value - none of them is right for long</div>
        </div>
      ) : (
        <div style={{ marginTop: 9, padding: "10px 13px", borderRadius: 8, border: "1px solid " + GREEN + "55", background: GREEN + "10", color: "#9FE7B6", fontSize: 11.5 }}>
          The loop sets the limit itself, from the gap between capacity and the load it is admitting. No number to pick.
        </div>
      )}

      {/* chart */}
      <div style={{ marginTop: 10, background: SURFACE, border: "1px solid " + BORDER, borderRadius: 8, padding: "12px 10px 8px" }}>
        <svg viewBox={"0 0 " + VW + " 196"} style={{ width: "100%", height: "auto", overflow: "visible" }}>
          <line x1={PX0} y1={PY1} x2={PX1} y2={PY1} stroke="#2A3040" strokeWidth="1" />
          {/* overload ticks: where the limit sits above capacity */}
          {b.map((s, i) => s.over ? <line key={"o" + i} x1={xFor(i)} y1={yFor(s.c)} x2={xFor(i)} y2={yFor(s.L)} stroke={RED} strokeWidth="2" opacity="0.5" /> : null)}
          {/* capacity line */}
          <polyline points={capPts} fill="none" stroke={GRAY} strokeWidth="1.8" strokeDasharray="5 4" />
          {/* limit line */}
          <polyline points={limPts} fill="none" stroke={ACCENT} strokeWidth="2.4" />
          {/* current markers */}
          <circle cx={xFor(W - 1)} cy={yFor(cur.c)} r="4" fill={GRAY} />
          <circle cx={xFor(W - 1)} cy={yFor(cur.L)} r="4.5" fill={cur.over ? RED : ACCENT} stroke="#0A0B0F" strokeWidth="1.2" />
          <text x={PX1 - 2} y={yFor(cur.c) - 7} fill={GRAY} fontSize="10.5" textAnchor="end" fontFamily={MONO}>capacity</text>
        </svg>
        <div style={{ display: "flex", gap: 16, padding: "2px 6px 0", fontSize: 10.5, color: MUTED }}>
          <span><span style={{ color: ACCENT }}>&#9644;</span> admission limit</span>
          <span><span style={{ color: GRAY }}>&#9644;</span> capacity (what it can take)</span>
          <span><span style={{ color: RED }}>&#9644;</span> limit above capacity = overload</span>
        </div>
      </div>

      {/* verdict */}
      <div style={{ marginTop: 12, background: SURFACE, border: "1px solid " + v.c, borderRadius: 8, padding: "12px 14px" }}>
        <div style={{ color: v.c, fontWeight: 700, fontSize: 13.5 }}>{v.code}</div>
        <div style={{ fontSize: 12.5, lineHeight: 1.6, color: TEXT, marginTop: 4 }}>{v.t}</div>
      </div>

      <div style={{ color: "#8B90A0", fontSize: 12, marginTop: 13, borderTop: "1px solid " + BORDER, paddingTop: 10, lineHeight: 1.65 }}>
        The gray line is what the service can handle; it drifts as load, hardware, and downstreams change. The orange line is how much you let in. A fixed limit can only cross the gray line - too high (red overload) or too low (wasted). The feedback loop keeps the orange line riding just under the gray one.
      </div>
    </div>
  );
}
