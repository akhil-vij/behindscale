import { useState, useEffect, useRef } from "react";

// Pattern artifact - Layered Admission Control (animated).
// Requests stream in and flow through two gates: a per-client RATE LIMITER (front) and a whole-system
// LOAD SHEDDER (back). Pick the scenario - one noisy client (hot dots) or a surge from every client (blue
// dots) - and toggle each layer. Watch where requests get gated: the noisy client is caught at the front,
// the surge is caught at the back. Remove the layer a scenario needs and requests flood the service.

const BG = "#08090D", SURFACE = "#0F1118", SURFACE2 = "#161922", BORDER = "#1F2333";
const TEXT = "#C8CDD8", MUTED = "#6B7280";
const GREEN = "#22C55E", AMBER = "#F5B841", RED = "#EF4444", ACCENT = "#F97316", BLUE = "#60A5FA";
const MONO = "'JetBrains Mono','Fira Code',ui-monospace,monospace";

// aggregate model - drives the verdict + service state (kept exact)
const NORMAL = 100, C = 300, CAP = 50, NOISY = 900, SURGE = 500;
function compute(front, back, scen) {
  let afterFront, fRej;
  if (scen === "noisy") { const capped = front ? Math.min(NOISY, CAP) : NOISY; fRej = NOISY - capped; afterFront = NORMAL + capped; }
  else { fRej = 0; afterFront = NORMAL + SURGE; }
  let bRej = 0, load;
  if (back) { bRej = Math.max(0, afterFront - C); load = Math.min(afterFront, C); }
  else { load = afterFront; }
  return { fRej, bRej, load, overloaded: load > C, afterFront };
}

// flow geometry
const W = 900, H = 150, FRONT_X = 300, BACK_X = 545, SERVICE_X = 792, SPEED = 13;

// where a spawned request ends up, given the config - matches the aggregate model's shape
function assignFate(scen, front, back, kind) {
  const r = Math.random();
  if (scen === "noisy") {
    if (kind === "noisy") {
      if (front) return r < 0.9 ? "front" : "service";
      return back ? (r < 0.7 ? "back" : "service") : "service";
    }
    // normal client
    if (!front && back) return r < 0.7 ? "back" : "service"; // collateral shedding
    return "service";
  }
  // surge - every client within its own limit, so the front never rejects
  return back ? (r < 0.5 ? "back" : "service") : "service";
}

export default function PatternLayeredAdmission() {
  const [scen, setScen] = useState("noisy");
  const [front, setFront] = useState(true);
  const [back, setBack] = useState(true);
  const [running, setRunning] = useState(true);
  const [, setFrame] = useState(0);

  const dotsRef = useRef([]); const countsRef = useRef({ front: 0, back: 0, service: 0 });
  const idRef = useRef(0); const spawnRef = useRef(0); const cfgRef = useRef({ scen, front, back }); const timerRef = useRef(null);

  const reset = () => { dotsRef.current = []; countsRef.current = { front: 0, back: 0, service: 0 }; spawnRef.current = 0; };
  useEffect(() => { cfgRef.current = { scen, front, back }; reset(); setFrame((f) => f + 1); }, [scen, front, back]);
  useEffect(() => {
    if (!running) { clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => { tick(); setFrame((f) => f + 1); }, 55);
    return () => clearInterval(timerRef.current);
  }, [running]);

  function tick() {
    const cfg = cfgRef.current; const c = countsRef.current;
    let dots = dotsRef.current.map((d) => ({ ...d }));
    for (const d of dots) {
      if (d.dead) { d.alpha -= 0.13; continue; }
      d.x += SPEED;
      if (d.fate === "front" && d.x >= FRONT_X) { d.dead = true; d.x = FRONT_X; c.front++; }
      else if (d.fate === "back" && d.x >= BACK_X) { d.dead = true; d.x = BACK_X; c.back++; }
      else if (d.x >= SERVICE_X) { d.reached = true; c.service++; }
    }
    dots = dots.filter((d) => !d.reached && !(d.dead && d.alpha <= 0));
    spawnRef.current += 1;
    const gap = cfg.scen === "surge" ? 1 : 2;
    if (spawnRef.current >= gap && dots.length < 62) {
      spawnRef.current = 0;
      const n = cfg.scen === "surge" ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const kind = cfg.scen === "noisy" ? (Math.random() < 0.82 ? "noisy" : "normal") : "normal";
        dots.push({ id: idRef.current++, x: 6, y: 14 + Math.random() * (H - 28), kind, fate: assignFate(cfg.scen, cfg.front, cfg.back, kind), dead: false, alpha: 1 });
      }
    }
    dotsRef.current = dots;
  }

  const m = compute(front, back, scen);
  const heavyBack = back && m.bRej > 400;
  const counts = countsRef.current;

  let v;
  if (m.overloaded) v = { c: RED, code: "SERVICE OVERLOADED", t: scen === "noisy" ? "One client's flood is reaching the service. With no rate limiter in front, nothing caps the noisy client." : "The surge is reaching the service. Every client is within its own limit, so the front rate limiter can't help - this needs the load shedder behind it." };
  else if (heavyBack) v = { c: AMBER, code: "PROTECTED, BUT UNFAIRLY", t: "With no front layer, the load shedder is dropping work across every client to survive one noisy one - watch the blue requests getting shed too. It is doing the rate limiter's job." };
  else if (scen === "noisy") v = { c: GREEN, code: "NOISY CLIENT CAUGHT AT THE FRONT", t: "The per-client rate limiter is capping the noisy client (the hot requests die at the front gate), cheaply and without touching anyone else. The load shedder behind it barely fires." };
  else v = { c: GREEN, code: "SURGE CAUGHT AT THE BACK", t: "Every client is within its per-client limit, so the front layer passes them through. The whole-system load shedder sheds the excess at the back gate. The right layer for the job." };

  const seg = (on, label, sub, onClick) => (
    <button onClick={onClick} style={{ flex: "1 1 180px", textAlign: "left", padding: "9px 12px", borderRadius: 8, cursor: "pointer", fontFamily: MONO, border: "1px solid " + (on ? ACCENT : "#333947"), background: on ? "rgba(249,115,22,0.12)" : "#0C0D13", color: TEXT }}>
      <div style={{ color: on ? ACCENT : "#AEB4C2", fontWeight: 700, fontSize: 11.5 }}>{label}</div>
      <div style={{ color: "#7C8290", fontSize: 10, marginTop: 2, lineHeight: 1.4 }}>{sub}</div>
    </button>
  );
  const chip = (on, label, sub, onClick, col) => (
    <button onClick={onClick} style={{ flex: "1 1 200px", textAlign: "left", padding: "9px 12px", borderRadius: 8, cursor: "pointer", fontFamily: MONO, border: "1px solid " + (on ? col : "#333947"), background: on ? col + "18" : "#0C0D13", color: TEXT }}>
      <div style={{ color: on ? col : "#9AA0B0", fontWeight: 700, fontSize: 11.5 }}>{on ? "\u25CF " : "\u25CB "}{label}</div>
      <div style={{ color: "#7C8290", fontSize: 10, marginTop: 2, lineHeight: 1.4 }}>{sub}</div>
    </button>
  );
  const gate = (x, on, col, top, rej) => (
    <g>
      <line x1={x} y1="6" x2={x} y2={H - 6} stroke={on ? col : "#2A3040"} strokeWidth={on ? 2.5 : 1.5} strokeDasharray={on ? "0" : "5 5"} />
      <text x={x} y="-1" fill={on ? col : MUTED} fontSize="10" fontWeight="700" textAnchor="middle" fontFamily={MONO}>{top}</text>
      <text x={x} y={H + 12} fill={on ? col : MUTED} fontSize="9.5" textAnchor="middle" fontFamily={MONO}>{on ? "rejected " + rej : "off"}</text>
    </g>
  );

  return (
    <div style={{ background: BG, color: TEXT, fontFamily: MONO, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid " + BORDER, fontSize: 12, lineHeight: 1.5 }}>
      <div style={{ color: ACCENT, fontSize: 10, letterSpacing: 2 }}>LAYERED ADMISSION CONTROL - THE PATTERN, GENERAL</div>
      <div style={{ color: "#EDEFF3", fontSize: 16, margin: "4px 0 2px", fontWeight: 700 }}>Two layers, two different jobs</div>
      <p style={{ color: "#8B90A0", fontSize: 11, margin: 0 }}>Requests stream in and pass through two gates. Watch where each one gets stopped - and what happens when you switch a layer off.</p>

      <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {seg(scen === "noisy", "One noisy client", "one client floods the API (hot dots)", () => setScen("noisy"))}
        {seg(scen === "surge", "Everyone surges", "all clients spike within limits (blue dots)", () => setScen("surge"))}
      </div>
      <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {chip(front, "Rate limiter (front)", "per client, fires constantly", () => setFront(!front), BLUE)}
        {chip(back, "Load shedder (back)", "whole system, fires rarely", () => setBack(!back), AMBER)}
      </div>

      {/* animated flow */}
      <div style={{ marginTop: 22, background: SURFACE, border: "1px solid " + BORDER, borderRadius: 8, padding: "20px 12px 22px" }}>
        <svg viewBox={"0 -14 " + W + " " + (H + 30)} style={{ width: "100%", height: "auto", overflow: "visible" }}>
          {/* service zone */}
          <rect x={SERVICE_X} y="4" width={W - SERVICE_X - 4} height={H - 8} rx="8" fill={(m.overloaded ? RED : GREEN) + "14"} stroke={m.overloaded ? RED : GREEN} strokeWidth="1.5" />
          <text x={(SERVICE_X + W - 4) / 2} y={H / 2 - 4} fill={m.overloaded ? RED : GREEN} fontSize="10.5" fontWeight="700" textAnchor="middle" fontFamily={MONO}>SERVICE</text>
          <text x={(SERVICE_X + W - 4) / 2} y={H / 2 + 12} fill={m.overloaded ? RED : GREEN} fontSize="9" textAnchor="middle" fontFamily={MONO}>{m.overloaded ? "OVERLOADED" : "healthy"}</text>
          <text x={(SERVICE_X + W - 4) / 2} y={H + 12} fill={MUTED} fontSize="9.5" textAnchor="middle" fontFamily={MONO}>{"in " + counts.service}</text>
          {/* gates */}
          {gate(FRONT_X, front, BLUE, "RATE LIMITER", counts.front)}
          {gate(BACK_X, back, AMBER, "LOAD SHEDDER", counts.back)}
          {/* dots */}
          {dotsRef.current.map((d) => (
            <circle key={d.id} cx={d.x} cy={d.y} r={d.dead ? 6 : 4.6} fill={d.kind === "noisy" ? ACCENT : BLUE} opacity={d.dead ? Math.max(d.alpha, 0) * 0.7 : 0.92} />
          ))}
        </svg>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 14, color: MUTED, fontSize: 9.5, flexWrap: "wrap" }}>
          <span><span style={{ color: ACCENT }}>&#9679;</span> noisy client</span>
          <span><span style={{ color: BLUE }}>&#9679;</span> other clients</span>
          <span>dots die at the gate that stops them; survivors reach the service</span>
        </div>
      </div>

      {/* controls */}
      <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={() => setRunning(!running)} style={{ padding: "6px 16px", borderRadius: 7, cursor: "pointer", fontFamily: MONO, fontSize: 11.5, fontWeight: 700, border: "1px solid " + ACCENT, background: running ? "transparent" : ACCENT, color: running ? ACCENT : "#0A0B0F" }}>{running ? "Pause" : "Play"}</button>
        <button onClick={() => { reset(); setFrame((f) => f + 1); }} style={{ padding: "6px 12px", borderRadius: 7, cursor: "pointer", fontFamily: MONO, fontSize: 11, border: "1px solid " + BORDER, background: "transparent", color: "#9AA0B0" }}>&#8635; clear counts</button>
        <span style={{ marginLeft: "auto", color: MUTED, fontSize: 10 }}>front {counts.front} &middot; back {counts.back} &middot; served {counts.service}</span>
      </div>

      {/* verdict */}
      <div style={{ marginTop: 12, background: SURFACE, border: "1px solid " + v.c, borderRadius: 8, padding: "11px 13px" }}>
        <div style={{ color: v.c, fontWeight: 700, fontSize: 12.5 }}>{v.code}</div>
        <div style={{ fontSize: 11.5, lineHeight: 1.6, color: TEXT, marginTop: 4 }}>{v.t}</div>
      </div>

      <div style={{ color: MUTED, fontSize: 10, marginTop: 12, borderTop: "1px solid " + BORDER, paddingTop: 8, lineHeight: 1.7 }}>
        The front layer is scoped to one client and fires constantly; the back layer is scoped to the whole system and fires rarely. Each exists so the next barely has to - which is why a healthy stack rejects far more at the front than at the back.
      </div>
    </div>
  );
}
