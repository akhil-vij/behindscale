import { useState, useEffect, useRef } from "react";

// Pattern artifact - Distributed Metadata Model (animated request flow).
// Requests stream in. A SINGLE metadata master can only serve so many per second, so past its limit the extra
// requests pile up in red - the ceiling. Switch to a DISTRIBUTED cluster and add front-ends: the same stream
// spreads across them, more requests get served (green flow through to storage), and the served rate climbs.

const BG = "#08090D", SURFACE = "#0F1118", SURFACE2 = "#161922", BORDER = "#1F2333";
const TEXT = "#C8CDD8", MUTED = "#6B7280";
const GREEN = "#22C55E", AMBER = "#F5B841", RED = "#EF4444", ACCENT = "#F97316", BLUE = "#60A5FA", GRAY = "#8A93A5";
const MONO = "'JetBrains Mono','Fira Code',ui-monospace,monospace";

const MASTER_CAP = 4;   // requests/tick one master can serve
const PER_FE = 2;       // requests/tick per front-end
const VW = 720, LAYER_X = 380, EXIT_X = 660, START_X = 70;
const laneY = (i) => 26 + ((i * 31) % 96);

export default function PatternDistributedMetadataModel() {
  const [mode, setMode] = useState("master"); // master | dist (problem-first: single master)
  const [rate, setRate] = useState(8);          // incoming requests
  const [fe, setFe] = useState(2);
  const [phase, setPhase] = useState(0);
  const timer = useRef(null);
  useEffect(() => { timer.current = setInterval(() => setPhase((p) => (p + 1) % 100000), 90); return () => clearInterval(timer.current); }, []);

  const dist = mode === "dist";
  const capacity = dist ? fe * PER_FE : MASTER_CAP;
  const served = Math.min(rate, capacity);
  const rejected = Math.max(0, rate - served);
  const over = rejected > 0;

  // green (served) dots flow client -> layer -> storage; red (rejected) pile up before the layer
  const green = [];
  for (let i = 0; i < served; i++) {
    const t = ((phase * 0.018) + i / Math.max(served, 1)) % 1;
    green.push({ x: START_X + t * (EXIT_X - START_X), y: laneY(i * 2 + 1) });
  }
  const red = [];
  for (let i = 0; i < rejected; i++) {
    red.push({ x: LAYER_X - 26 - (i % 3) * 10 + Math.sin(phase * 0.25 + i) * 2, y: laneY(i * 2 + 2) });
  }

  const feBoxes = dist ? fe : 1;
  const boxH = Math.min(26, 108 / feBoxes);

  let v;
  if (dist) v = { c: GREEN, code: "SCALING", t: "The requests spread across " + fe + " front-ends, serving " + served + " of " + rate + ". Add front-ends and the served rate keeps climbing - the bookkeeping is no longer the ceiling." };
  else if (over) v = { c: RED, code: "AT THE CEILING", t: "The one master serves only " + MASTER_CAP + " per tick, so the other " + rejected + " pile up and wait. Adding storage would not help - the single bookkeeping machine is the limit." };
  else v = { c: AMBER, code: "KEEPING UP - FOR NOW", t: "The single master is serving all " + served + " requests, but it tops out at " + MASTER_CAP + ". Push the incoming rate higher and it starts turning requests away." };

  const modeBtn = (k, lab) => (
    <button onClick={() => setMode(k)} style={{ flex: "1 1 0", padding: "9px 12px", borderRadius: 7, cursor: "pointer", fontFamily: MONO, fontSize: 12.5, fontWeight: 700, border: "1px solid " + (mode === k ? ACCENT : "#333947"), background: mode === k ? ACCENT + "1E" : "#0C0D13", color: mode === k ? "#EDEFF3" : "#9AA0B0" }}>{lab}</button>
  );

  return (
    <div style={{ background: BG, color: TEXT, fontFamily: MONO, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid " + BORDER, fontSize: 12.5, lineHeight: 1.55 }}>
      <div style={{ color: ACCENT, fontSize: 10.5, letterSpacing: 2 }}>DISTRIBUTED METADATA MODEL - THE HIDDEN CEILING</div>
      <div style={{ color: "#EDEFF3", fontSize: 16.5, margin: "4px 0 3px", fontWeight: 700 }}>The disks aren't the ceiling - the bookkeeping is</div>
      <p style={{ color: "#9096A6", fontSize: 12, margin: 0 }}>Every request first asks the bookkeeping layer where the data lives. Send them through one master and they pile up; spread them across a distributed cluster and the served rate climbs.</p>

      {/* mode toggle */}
      <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
        {modeBtn("master", "Single metadata master")}
        {modeBtn("dist", "Distributed metadata cluster")}
      </div>

      {/* animated flow */}
      <div style={{ marginTop: 12, background: SURFACE, border: "1px solid " + BORDER, borderRadius: 8, padding: "8px 10px 4px" }}>
        <svg viewBox="0 0 720 132" style={{ width: "100%", height: "auto", overflow: "visible" }}>
          <text x="16" y="16" fill={MUTED} fontSize="9.5" fontFamily={MONO}>requests</text>
          <text x={EXIT_X + 6} y="16" fill={MUTED} fontSize="9.5" fontFamily={MONO}>served</text>
          {/* metadata layer: one master, or N front-ends */}
          {Array.from({ length: feBoxes }).map((_, i) => (
            <rect key={i} x={LAYER_X} y={16 + i * (boxH + 2)} width="120" height={boxH} rx="5" fill={SURFACE2} stroke={dist ? GREEN : (over ? RED : AMBER)} strokeWidth="1.5" />
          ))}
          <text x={LAYER_X + 60} y={feBoxes === 1 ? 33 : 12} fill={dist ? GREEN : (over ? RED : AMBER)} fontSize="9.5" fontWeight="700" textAnchor="middle" fontFamily={MONO}>{dist ? fe + " front-ends" : "one master"}</text>
          {/* storage */}
          <rect x={EXIT_X} y="46" width="52" height="34" rx="6" fill={SURFACE2} stroke="#2A3040" strokeWidth="1" />
          <text x={EXIT_X + 26} y="66" fill={TEXT} fontSize="9" fontWeight="700" textAnchor="middle" fontFamily={MONO}>storage</text>
          {/* served flow (green) */}
          {green.map((d, i) => <circle key={"g" + i} cx={d.x} cy={d.y} r="3.4" fill={GREEN} opacity="0.9" />)}
          {/* rejected pile-up (red) */}
          {red.map((d, i) => <circle key={"r" + i} cx={d.x} cy={d.y} r="3.4" fill={RED} opacity="0.9" />)}
        </svg>
        <div style={{ display: "flex", gap: 16, padding: "2px 6px 0", fontSize: 10.5, color: MUTED }}>
          <span><span style={{ color: GREEN }}>&#9679;</span> served (flows to storage)</span>
          <span><span style={{ color: RED }}>&#9679;</span> piled up, waiting</span>
        </div>
      </div>

      {/* controls */}
      <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 220px", padding: "10px 13px", borderRadius: 8, border: "1px solid #333947", background: "#0C0D13" }}>
          <div style={{ color: "#AEB4C2", fontWeight: 700, fontSize: 12.5 }}>Incoming requests: {rate}</div>
          <input type="range" min="1" max="12" value={rate} onChange={(e) => setRate(Number(e.target.value))} style={{ width: "100%", marginTop: 7, accentColor: ACCENT }} />
          <div style={{ color: "#7C8290", fontSize: 11 }}>how many arrive each tick</div>
        </div>
        <div style={{ flex: "1 1 220px", padding: "10px 13px", borderRadius: 8, border: "1px solid " + (dist ? "#333947" : "#242A38"), background: "#0C0D13", opacity: dist ? 1 : 0.5 }}>
          <div style={{ color: dist ? "#AEB4C2" : "#565C6B", fontWeight: 700, fontSize: 12.5 }}>Front-ends: {dist ? fe : 1}</div>
          <input type="range" min="1" max="6" value={fe} disabled={!dist} onChange={(e) => setFe(Number(e.target.value))} style={{ width: "100%", marginTop: 7, accentColor: ACCENT }} />
          <div style={{ color: "#7C8290", fontSize: 11 }}>{dist ? "each serves " + PER_FE + " more per tick" : "a single master - capacity " + MASTER_CAP}</div>
        </div>
      </div>

      {/* served-rate readouts */}
      <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 0", background: SURFACE, border: "1px solid " + BORDER, borderRadius: 8, padding: "10px 12px" }}>
          <div style={{ color: MUTED, fontSize: 10.5 }}>SERVED PER TICK</div>
          <div style={{ color: over ? RED : GREEN, fontSize: 20, fontWeight: 700, marginTop: 3 }}>{served} / {rate}</div>
          <div style={{ color: "#7C8290", fontSize: 10, marginTop: 2 }}>{dist ? "capacity " + capacity + " (grows with front-ends)" : "master capacity " + MASTER_CAP + ", fixed"}</div>
        </div>
        <div style={{ flex: "1 1 0", background: SURFACE, border: "1px solid " + BORDER, borderRadius: 8, padding: "10px 12px" }}>
          <div style={{ color: MUTED, fontSize: 10.5 }}>PILED UP</div>
          <div style={{ color: rejected ? RED : GREEN, fontSize: 20, fontWeight: 700, marginTop: 3 }}>{rejected}</div>
          <div style={{ color: "#7C8290", fontSize: 10, marginTop: 2 }}>{rejected ? "waiting on the bookkeeping" : "nothing waiting"}</div>
        </div>
      </div>

      {/* verdict */}
      <div style={{ marginTop: 12, background: SURFACE, border: "1px solid " + v.c, borderRadius: 8, padding: "12px 14px" }}>
        <div style={{ color: v.c, fontWeight: 700, fontSize: 13.5 }}>{v.code}</div>
        <div style={{ fontSize: 12.5, lineHeight: 1.6, color: TEXT, marginTop: 4 }}>{v.t}</div>
      </div>

      <div style={{ color: "#8B90A0", fontSize: 12, marginTop: 13, borderTop: "1px solid " + BORDER, paddingTop: 10, lineHeight: 1.65 }}>
        Every request has to ask the bookkeeping layer where its data lives. One master can only answer so many per second, so past that point requests pile up - and more disks would not help. Spread the bookkeeping across a cluster of front-ends and the served rate grows with every one you add, while the bytes flow straight to storage.
      </div>
    </div>
  );
}
