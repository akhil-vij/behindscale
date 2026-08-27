import { useState, useEffect, useRef } from "react";

// Pattern artifact - Retry Budget (live, interactive).
// A shared service is failing, so its clients retry. The storm "wants" to send DEMAND retries per second.
// The retry budget is the knob: it caps how many of those retries get through. Open it wide and the retries
// bury the service (load far over capacity, service DOWN). Tighten it and the extra load shrinks until the
// service is under capacity again (UP). Requests flow in live so you can see the storm thin out as you drag.

const BG = "#08090D", SURFACE = "#0F1118", SURFACE2 = "#161922", BORDER = "#1F2333";
const TEXT = "#C8CDD8", MUTED = "#6B7280";
const GREEN = "#22C55E", AMBER = "#F5B841", RED = "#EF4444", ACCENT = "#F97316", BLUE = "#60A5FA";
const MONO = "'JetBrains Mono','Fira Code',ui-monospace,monospace";

// model constants
const BASE = 100, CAP = 200, DEMAND = 400;

// geometry
const VW = 860, FLOW_X0 = 150, FLOW_X1 = 590;
const SVC_X = 610, SVC_W = 210, SVC_Y = 44, SVC_H = 132;
const N_BLUE = 6, N_RED = 22;
// deterministic lane for a dot index
const laneY = (i) => 58 + ((i * 41) % 108);

export default function PatternRetryBudget() {
  const [budget, setBudget] = useState(360); // retries the budget lets through, per second
  const [phase, setPhase] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setPhase((p) => (p + 1) % 100000), 60);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const retries = Math.min(budget, DEMAND);
  const total = BASE + retries;
  const over = total > CAP;
  const activeRed = Math.round((retries / DEMAND) * N_RED);

  let st;
  if (total <= CAP) st = { c: GREEN, code: "SERVICE UP", t: "The service is under capacity and serving normally. The budget is holding the extra retry load down." };
  else if (total <= CAP + 100) st = { c: AMBER, code: "OVERLOADED", t: "The service is over capacity and starting to drop requests. The retries are adding more load than it can take." };
  else st = { c: RED, code: "SERVICE DOWN", t: "The retries have buried the service. Almost nothing is getting served, and the retries keep it that way." };

  const budgetLabel = budget >= DEMAND ? "no limit" : budget + " / sec";
  const dotX = (offset) => FLOW_X0 + (((offset + phase * 0.02) % 1) * (FLOW_X1 - FLOW_X0));

  const blue = [];
  for (let i = 0; i < N_BLUE; i++) blue.push({ x: dotX(i / N_BLUE), y: laneY(i * 3 + 1) });
  const red = [];
  for (let i = 0; i < activeRed; i++) red.push({ x: dotX(i / N_RED + 0.05), y: laneY(i * 2 + 2) });

  // load meter scale: 0..DEMAND+BASE mapped across the service inner width
  const meterX = SVC_X + 16, meterW = SVC_W - 32, meterY = SVC_Y + SVC_H - 30;
  const scale = (v) => (v / (BASE + DEMAND)) * meterW;

  const stat = (label, value, note, c) => (
    <div style={{ flex: "1 1 200px", background: SURFACE, border: "1px solid " + BORDER, borderRadius: 8, padding: "10px 13px" }}>
      <div style={{ color: MUTED, fontSize: 11, letterSpacing: 0.5 }}>{label}</div>
      <div style={{ color: c, fontSize: 21, fontWeight: 700, lineHeight: 1.1, marginTop: 2 }}>{value}</div>
      <div style={{ color: "#7C8290", fontSize: 11, marginTop: 3 }}>{note}</div>
    </div>
  );

  return (
    <div style={{ background: BG, color: TEXT, fontFamily: MONO, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid " + BORDER, fontSize: 12.5, lineHeight: 1.55 }}>
      <div style={{ color: ACCENT, fontSize: 10.5, letterSpacing: 2 }}>RETRY BUDGET - A CAP ON THE STORM</div>
      <div style={{ color: "#EDEFF3", fontSize: 16.5, margin: "4px 0 3px", fontWeight: 700 }}>Set the budget; keep the service alive</div>
      <p style={{ color: "#9096A6", fontSize: 12, margin: 0 }}>The service is failing, so its clients retry. Open the budget wide and the retries bury it. Tighten the budget and the extra load shrinks until the service recovers.</p>

      {/* scene */}
      <div style={{ marginTop: 14, background: SURFACE, border: "1px solid " + BORDER, borderRadius: 8, padding: "10px 10px 6px" }}>
        <svg viewBox={"0 0 " + VW + " 200"} style={{ width: "100%", height: "auto", overflow: "visible" }}>
          {/* clients */}
          <rect x="24" y="70" width="96" height="60" rx="8" fill={SURFACE2} stroke="#2A3040" strokeWidth="1" />
          <text x="72" y="96" fill={TEXT} fontSize="12" fontWeight="700" textAnchor="middle" fontFamily={MONO}>clients</text>
          <text x="72" y="112" fill={MUTED} fontSize="10" textAnchor="middle" fontFamily={MONO}>sending</text>
          <text x="72" y="124" fill={MUTED} fontSize="10" textAnchor="middle" fontFamily={MONO}>requests</text>

          {/* flowing requests: blue = first tries, red = retries */}
          {blue.map((d, i) => <circle key={"b" + i} cx={d.x} cy={d.y} r="3.4" fill={BLUE} opacity="0.9" />)}
          {red.map((d, i) => <circle key={"r" + i} cx={d.x} cy={d.y} r="3.4" fill={RED} opacity="0.85" />)}

          {/* service box */}
          <rect x={SVC_X} y={SVC_Y} width={SVC_W} height={SVC_H} rx="10" fill={SURFACE2} stroke={st.c} strokeWidth="1.8" />
          <text x={SVC_X + SVC_W / 2} y={SVC_Y + 26} fill={st.c} fontSize="12.5" fontWeight="700" textAnchor="middle" fontFamily={MONO}>the service</text>
          <text x={SVC_X + SVC_W / 2} y={SVC_Y + 44} fill={st.c} fontSize="13" fontWeight="700" textAnchor="middle" fontFamily={MONO}>{st.code}</text>
          {/* load meter inside the box */}
          <rect x={meterX} y={meterY} width={meterW} height="14" rx="4" fill="#0C0D13" stroke="#2A3040" strokeWidth="1" />
          <rect x={meterX} y={meterY} width={Math.min(meterW, scale(BASE))} height="14" rx="4" fill={BLUE} opacity="0.85" />
          <rect x={meterX + scale(BASE)} y={meterY} width={Math.max(0, Math.min(meterW - scale(BASE), scale(retries)))} height="14" fill={over ? RED : GREEN} opacity="0.85" />
          {/* capacity marker */}
          <line x1={meterX + scale(CAP)} y1={meterY - 6} x2={meterX + scale(CAP)} y2={meterY + 20} stroke={RED} strokeWidth="2" />
          <text x={meterX + scale(CAP)} y={meterY - 9} fill={RED} fontSize="9.5" textAnchor="middle" fontFamily={MONO}>capacity</text>
          <text x={SVC_X + SVC_W / 2} y={meterY - 9} fill={MUTED} fontSize="9.5" textAnchor="middle" fontFamily={MONO}></text>

          {/* legend */}
          <circle cx="150" cy="188" r="3.4" fill={BLUE} /><text x="160" y="191" fill={MUTED} fontSize="10" fontFamily={MONO}>first tries</text>
          <circle cx="248" cy="188" r="3.4" fill={RED} /><text x="258" y="191" fill={MUTED} fontSize="10" fontFamily={MONO}>retries</text>
        </svg>
      </div>

      {/* readouts */}
      <div style={{ marginTop: 12, display: "flex", gap: 9, flexWrap: "wrap" }}>
        {stat("LOAD ON THE SERVICE", total, "capacity is " + CAP, over ? RED : GREEN)}
        {stat("RETRIES GETTING THROUGH", retries, "the storm wants to send " + DEMAND, retries > CAP - BASE ? RED : GREEN)}
      </div>

      {/* the knob */}
      <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: 8, border: "1px solid #333947", background: "#0C0D13" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ color: "#AEB4C2", fontWeight: 700, fontSize: 13 }}>Retry budget</span>
          <span style={{ color: budget >= DEMAND ? RED : (budget <= CAP - BASE ? GREEN : AMBER), fontWeight: 700, fontSize: 13 }}>{budgetLabel}</span>
        </div>
        <input type="range" min="0" max="400" step="20" value={budget} onChange={(e) => setBudget(Number(e.target.value))} style={{ width: "100%", marginTop: 8, accentColor: ACCENT }} />
        <div style={{ display: "flex", justifyContent: "space-between", color: "#7C8290", fontSize: 10.5, marginTop: 2 }}>
          <span>&#9664; tight bound (fewer retries)</span>
          <span>no limit (full storm) &#9654;</span>
        </div>
      </div>

      {/* verdict */}
      <div style={{ marginTop: 12, background: SURFACE, border: "1px solid " + st.c, borderRadius: 8, padding: "12px 14px" }}>
        <div style={{ color: st.c, fontWeight: 700, fontSize: 13.5 }}>{st.code}</div>
        <div style={{ fontSize: 12.5, lineHeight: 1.6, color: TEXT, marginTop: 4 }}>{st.t}</div>
      </div>

      <div style={{ color: "#8B90A0", fontSize: 12, marginTop: 13, borderTop: "1px solid " + BORDER, paddingTop: 10, lineHeight: 1.65 }}>
        A normal load of {BASE} sits under the capacity of {CAP}. While the service is failing, the retries want to add another {DEMAND} on top. With no limit that buries the service; the budget caps how many retries get through, so you can hold the total under capacity.
      </div>
    </div>
  );
}
