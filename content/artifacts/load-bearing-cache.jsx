import { useState, useEffect, useRef } from "react";

// Pattern artifact - Load-Bearing Cache (animated).
// The database can serve only part of peak traffic on its own, so the cache's hit rate is real capacity.
// Empty part of the cache with a maintenance event: if the hit rate drops below the breaking point, the
// database is overloaded and fails the very reads that would refill the cache - so it stays empty (the
// outage keeps itself going). Turn on protection (limit how much any one event can empty) and it recovers.

const BG = "#08090D", SURFACE = "#0F1118", SURFACE2 = "#161922", BORDER = "#1F2333";
const TEXT = "#C8CDD8", MUTED = "#6B7280";
const GREEN = "#22C55E", AMBER = "#F5B841", RED = "#EF4444", ACCENT = "#F97316";
const MONO = "'JetBrains Mono','Fira Code',ui-monospace,monospace";

// model constants (kept exact - mirrored by the headless test)
const H_MAX = 95;     // full hit rate, %
const TIP = 70;       // breaking point: at this hit rate db load equals capacity
const FLOOR = 80;     // protection stops an event from emptying below this
const L = 100;        // peak reads
const C = 30;         // reads the database can serve on its own
const WARM = 3;       // per-tick refill when healthy
const COOL = 4;       // per-tick decline when overloaded
const EMPTY_STEP = 5; // per-tick drain during the maintenance event
const TICK = 220;     // ms per animation frame

const dbLoad = (h) => Math.round(L * (1 - h / 100));
const applyEvent = (drop, disc) => { const raw = H_MAX - drop; return disc ? Math.max(raw, FLOOR) : raw; };
const evolve = (h) => (h >= TIP ? Math.min(H_MAX, h + WARM) : Math.max(0, h - COOL));

// geometry
const VW = 860, X0 = 158, SPAN = 672;
const px = (v) => X0 + SPAN * v / 100;

export default function PatternLoadBearingCache() {
  const [disc, setDisc] = useState(false);   // cache protection - default OFF (naive case first)
  const [drop, setDrop] = useState(40);        // how much of the cache this event empties, %
  const [h, setH] = useState(H_MAX);           // current hit rate
  const [phase, setPhase] = useState("idle");  // idle | emptying | settling | done
  const timerRef = useRef(null);

  const stop = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  // reset whenever the configuration changes, so each run starts from a full cache
  useEffect(() => { stop(); setH(H_MAX); setPhase("idle"); }, [disc, drop]);
  useEffect(() => stop, []);

  const run = () => {
    stop();
    const target = applyEvent(drop, disc);
    let cur = H_MAX, mode = "emptying";
    setH(cur); setPhase("emptying");
    timerRef.current = setInterval(() => {
      if (mode === "emptying") {
        cur = Math.max(target, cur - EMPTY_STEP);
        if (cur <= target) { mode = "settling"; setPhase("settling"); }
      } else {
        cur = evolve(cur);
        if (cur <= 0.5 || cur >= H_MAX - 0.5) { stop(); setPhase("done"); }
      }
      setH(cur);
    }, TICK);
  };

  const dl = dbLoad(h);
  const over = h < TIP;
  const col = over ? RED : (h >= H_MAX - 0.5 ? GREEN : AMBER);

  let v;
  if (over) v = { c: RED, code: "STUCK", t: "The database is overloaded and failing the reads that would refill the cache, so the hit rate cannot climb back. The outage keeps itself going." };
  else if (phase === "emptying" || phase === "settling") v = { c: AMBER, code: "RECOVERING", t: "The hit rate stayed above the breaking point, so the cache is filling again and the load on the database is falling back under its limit." };
  else if (phase === "done") v = { c: GREEN, code: "RECOVERED", t: "The event stayed above the breaking point. The cache filled back up on its own and the database is well under its limit." };
  else v = { c: GREEN, code: "HEALTHY", t: "The cache is full and the database is well under its limit. Run a maintenance event to empty part of the cache." };

  const stat = (label, value, note, c) => (
    <div style={{ flex: "1 1 200px", background: SURFACE, border: "1px solid " + BORDER, borderRadius: 8, padding: "10px 13px" }}>
      <div style={{ color: MUTED, fontSize: 11, letterSpacing: 0.5 }}>{label}</div>
      <div style={{ color: c, fontSize: 21, fontWeight: 700, lineHeight: 1.1, marginTop: 2 }}>{value}</div>
      <div style={{ color: "#7C8290", fontSize: 11, marginTop: 3 }}>{note}</div>
    </div>
  );

  return (
    <div style={{ background: BG, color: TEXT, fontFamily: MONO, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid " + BORDER, fontSize: 12.5, lineHeight: 1.55 }}>
      <div style={{ color: ACCENT, fontSize: 10.5, letterSpacing: 2 }}>LOAD-BEARING CACHE - HIT RATE IS CAPACITY</div>
      <div style={{ color: "#EDEFF3", fontSize: 16.5, margin: "4px 0 3px", fontWeight: 700 }}>The database cannot take the traffic alone</div>
      <p style={{ color: "#9096A6", fontSize: 12, margin: 0 }}>The cache answers most reads. Empty part of it with a maintenance event and watch where the load on the database lands - under its limit, or over it and stuck.</p>

      {/* controls */}
      <div style={{ marginTop: 15, display: "flex", gap: 9, flexWrap: "wrap" }}>
        <button onClick={() => setDisc(!disc)} style={{ flex: "1 1 220px", textAlign: "left", padding: "10px 13px", borderRadius: 8, cursor: "pointer", fontFamily: MONO, border: "1px solid " + (disc ? GREEN : "#333947"), background: disc ? GREEN + "18" : "#0C0D13", color: TEXT }}>
          <div style={{ color: disc ? GREEN : "#9AA0B0", fontWeight: 700, fontSize: 12.5 }}>{disc ? "\u25CF " : "\u25CB "}Cache protection {disc ? "ON" : "OFF"}</div>
          <div style={{ color: "#7C8290", fontSize: 11, marginTop: 2, lineHeight: 1.4 }}>{disc ? "an event can only empty the cache so far" : "maintenance can empty the cache freely"}</div>
        </button>
        <div style={{ flex: "1 1 220px", padding: "10px 13px", borderRadius: 8, border: "1px solid #333947", background: "#0C0D13" }}>
          <div style={{ color: "#AEB4C2", fontWeight: 700, fontSize: 12.5 }}>This maintenance empties {drop}% of the cache</div>
          <input type="range" min="0" max="90" value={drop} onChange={(e) => setDrop(Number(e.target.value))} style={{ width: "100%", marginTop: 7, accentColor: ACCENT }} />
          <div style={{ color: "#7C8290", fontSize: 11 }}>replacing nodes, clearing the cache, a fresh deploy</div>
        </div>
      </div>

      {/* live readouts */}
      <div style={{ marginTop: 12, display: "flex", gap: 9, flexWrap: "wrap" }}>
        {stat("HIT RATE", Math.round(h) + "%", "breaking point " + TIP + "%", col)}
        {stat("DATABASE LOAD", dl + " / " + C, "capacity " + C + " of peak " + L + " reads", over ? RED : GREEN)}
      </div>

      {/* gauges */}
      <div style={{ marginTop: 10, background: SURFACE, border: "1px solid " + BORDER, borderRadius: 8, padding: "14px 12px 10px" }}>
        <svg viewBox={"0 0 " + VW + " 150"} style={{ width: "100%", height: "auto", overflow: "visible" }}>
          {/* HIT RATE bar */}
          <text x="16" y="34" fill={MUTED} fontSize="12" fontWeight="700" fontFamily={MONO}>HIT RATE</text>
          <rect x={X0} y="24" width={SPAN} height="16" rx="8" fill={SURFACE2} stroke="#2A3040" strokeWidth="1" />
          <rect x={X0} y="24" width={Math.max(3, SPAN * h / 100)} height="16" rx="8" fill={col} opacity="0.28" />
          <line x1={px(TIP)} y1="14" x2={px(TIP)} y2="54" stroke={RED} strokeWidth="1.5" strokeDasharray="4 4" />
          <text x={px(TIP)} y="68" fill={RED} fontSize="11" textAnchor="middle" fontFamily={MONO}>breaking point {TIP}%</text>
          {disc && <line x1={px(FLOOR)} y1="18" x2={px(FLOOR)} y2="46" stroke={GREEN} strokeWidth="1.5" strokeDasharray="2 3" />}
          {disc && <text x={px(FLOOR)} y="12" fill={GREEN} fontSize="10.5" textAnchor="middle" fontFamily={MONO}>protected to {FLOOR}%</text>}
          <circle cx={px(h)} cy="32" r="8" fill={col} stroke="#0A0B0F" strokeWidth="1.5" />

          {/* DATABASE LOAD bar */}
          <text x="16" y="112" fill={MUTED} fontSize="12" fontWeight="700" fontFamily={MONO}>DB LOAD</text>
          <rect x={X0} y="100" width={SPAN} height="20" rx="6" fill={SURFACE2} stroke="#2A3040" strokeWidth="1" />
          <rect x={X0} y="100" width={Math.max(3, SPAN * dl / L)} height="20" rx="6" fill={over ? RED : GREEN} opacity="0.85" />
          <line x1={px(C)} y1="92" x2={px(C)} y2="128" stroke={RED} strokeWidth="2" />
          <text x={px(C)} y="142" fill={RED} fontSize="11" textAnchor="middle" fontFamily={MONO}>capacity {C}</text>
          <text x={X0 + SPAN + 8} y="115" fill={over ? RED : GREEN} fontSize="13" fontWeight="700" fontFamily={MONO}>{dl}</text>
        </svg>
      </div>

      {/* run controls */}
      <div style={{ marginTop: 11, display: "flex", gap: 9, alignItems: "center" }}>
        <button onClick={run} style={{ padding: "7px 17px", borderRadius: 7, cursor: "pointer", fontFamily: MONO, fontSize: 12.5, fontWeight: 700, border: "1px solid " + ACCENT, background: ACCENT, color: "#0A0B0F" }}>Run maintenance</button>
        <button onClick={() => { stop(); setH(H_MAX); setPhase("idle"); }} style={{ padding: "7px 13px", borderRadius: 7, cursor: "pointer", fontFamily: MONO, fontSize: 12, border: "1px solid " + BORDER, background: "transparent", color: "#9AA0B0" }}>&#8635; reset to full</button>
      </div>

      {/* verdict */}
      <div style={{ marginTop: 12, background: SURFACE, border: "1px solid " + v.c, borderRadius: 8, padding: "12px 14px" }}>
        <div style={{ color: v.c, fontWeight: 700, fontSize: 13.5 }}>{v.code}</div>
        <div style={{ fontSize: 12.5, lineHeight: 1.6, color: TEXT, marginTop: 4 }}>{v.t}</div>
      </div>

      <div style={{ color: "#8B90A0", fontSize: 12, marginTop: 13, borderTop: "1px solid " + BORDER, paddingTop: 10, lineHeight: 1.65 }}>
        The database can serve only {C} of every {L} peak reads on its own, so the cache has to answer the rest. Below the breaking point the database is overloaded and fails its own refills - which is why protection limits how much of the cache any one event can empty.
      </div>
    </div>
  );
}
