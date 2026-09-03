import { useState } from "react";

// Pattern artifact - Shared-Pool Multiplexing (interactive).
// Three user-facing workloads each need a pool sized for their own peak. SILOED, you buy all three peaks and
// each pool sits idle most of the day. Drag the PEAK SPREAD: when their busy times line up, pooling saves
// nothing; spread them out and one shared pool only has to cover whatever is busy right now - far less than
// the sum of peaks. Background work fills the rest. Turn enforcement OFF and greedy background work starves a
// serving workload at its peak - the noisy-neighbour cost.

const BG = "#08090D", SURFACE = "#0F1118", SURFACE2 = "#161922", BORDER = "#1F2333";
const TEXT = "#C8CDD8", MUTED = "#6B7280";
const GREEN = "#22C55E", AMBER = "#F5B841", RED = "#EF4444", ACCENT = "#F97316", BLUE = "#60A5FA", GRAY = "#3A4152";
const MONO = "'JetBrains Mono','Fira Code',ui-monospace,monospace";

const HOURS = 24, BASE = 2, PEAKH = 38, W = 12, N = 3;
const INDIV_PEAK = BASE + PEAKH;          // 40
const SUM_PEAKS = N * INDIV_PEAK;          // 120  (what you buy with separate silos)
const bell = (h, c) => BASE + PEAKH * Math.exp(-Math.pow(h - c, 2) / W);

export default function PatternSharedPoolMultiplexing() {
  const [mode, setMode] = useState("siloed"); // siloed | pooled (problem-first: siloed waste)
  const [spread, setSpread] = useState(6);      // hours between the workloads' peaks
  const [enforced, setEnforced] = useState(true);

  const centers = [13 - spread, 13, 13 + spread];
  const combined = Array.from({ length: HOURS }, (_, h) => centers.reduce((a, c) => a + bell(h, c), 0));
  const combinedPeak = Math.round(Math.max.apply(null, combined));
  const pooled = mode === "pooled";
  const noEnf = pooled && !enforced;
  const pool = pooled ? combinedPeak : SUM_PEAKS;
  const saved = SUM_PEAKS - combinedPeak;

  const batchGreedy = Math.round(combinedPeak * 0.55);
  const avail = combinedPeak - batchGreedy;
  const starvedHours = noEnf ? combined.filter((v) => v > avail).length : 0;

  // chart geometry
  const YMAX = SUM_PEAKS + 8, X0 = 40, Y0 = 18, Y1 = 138, span = 660;
  const bw = span / HOURS - 3;
  const xFor = (h) => X0 + h * (span / HOURS);
  const yFor = (v) => Y1 - (Y1 - Y0) * v / YMAX;
  const seg = (x, lo, hi, fill, op) => <rect x={x} y={yFor(hi)} width={bw} height={Math.max(0, yFor(lo) - yFor(hi))} fill={fill} opacity={op || 0.85} />;

  const bars = combined.map((v, h) => {
    const x = xFor(h), s = Math.min(v, INDIV_PEAK * 3);
    if (!pooled) return <g key={h}>{seg(x, 0, s, BLUE)}{seg(x, s, SUM_PEAKS, GRAY, 0.5)}</g>;
    if (enforced) return <g key={h}>{seg(x, 0, s, BLUE)}{seg(x, s, combinedPeak, GREEN)}</g>;
    const served = Math.min(v, avail), starved = v > avail;
    return <g key={h}>{seg(x, 0, batchGreedy, GREEN)}{seg(x, batchGreedy, batchGreedy + served, BLUE)}{starved ? <rect x={x} y={yFor(combinedPeak) - 7} width={bw} height="7" fill={RED} /> : null}</g>;
  });

  let vd;
  if (!pooled) vd = { c: AMBER, code: "SILOED - " + SUM_PEAKS + " BOUGHT", t: "Each workload gets a pool sized for its own peak, so you buy all " + SUM_PEAKS + " and each sits idle most of the day (grey). Pooling would need only " + combinedPeak + "." };
  else if (noEnf) vd = { c: RED, code: "NOISY NEIGHBOUR", t: "With enforcement off, background work holds " + batchGreedy + " of the pool all day and will not yield. When a serving workload peaks, it is starved (red) for " + starvedHours + " hours - work that was never meant to collide now does." };
  else if (saved <= 6) vd = { c: AMBER, code: "PEAKS ALIGNED - NO SAVING", t: "The workloads all peak at almost the same time, so the shared pool still has to cover all " + SUM_PEAKS + ". Pooling here just couples them without saving anything - spread the peaks apart." };
  else vd = { c: GREEN, code: "POOLED - SAVED " + saved, t: "Because the peaks are spread out, the pool only needs " + combinedPeak + " to cover whatever is busy right now, versus " + SUM_PEAKS + " siloed. Background work fills the rest." };

  const modeBtn = (k, lab) => (
    <button onClick={() => setMode(k)} style={{ flex: "1 1 0", padding: "9px 12px", borderRadius: 7, cursor: "pointer", fontFamily: MONO, fontSize: 12.5, fontWeight: 700, border: "1px solid " + (mode === k ? ACCENT : "#333947"), background: mode === k ? ACCENT + "1E" : "#0C0D13", color: mode === k ? "#EDEFF3" : "#9AA0B0" }}>{lab}</button>
  );
  const stat = (label, value, c, sub) => (
    <div style={{ flex: "1 1 0", background: SURFACE, border: "1px solid " + BORDER, borderRadius: 8, padding: "10px 12px" }}>
      <div style={{ color: MUTED, fontSize: 10.5 }}>{label}</div>
      <div style={{ color: c, fontSize: 20, fontWeight: 700, marginTop: 3 }}>{value}</div>
      <div style={{ color: "#7C8290", fontSize: 10, marginTop: 2 }}>{sub}</div>
    </div>
  );

  return (
    <div style={{ background: BG, color: TEXT, fontFamily: MONO, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid " + BORDER, fontSize: 12.5, lineHeight: 1.55 }}>
      <div style={{ color: ACCENT, fontSize: 10.5, letterSpacing: 2 }}>SHARED-POOL MULTIPLEXING - FILL THE IDLE TIME</div>
      <div style={{ color: "#EDEFF3", fontSize: 16.5, margin: "4px 0 3px", fontWeight: 700 }}>Stop paying for every peak twice</div>
      <p style={{ color: "#9096A6", fontSize: 12, margin: 0 }}>Three workloads, each needing a pool sized for its peak. Spread their busy times apart and watch how much less one shared pool needs to buy.</p>

      {/* mode toggle */}
      <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
        {modeBtn("siloed", "Separate silos")}
        {modeBtn("pooled", "One shared pool")}
      </div>

      {/* peak-spread slider */}
      <div style={{ marginTop: 9, padding: "10px 13px", borderRadius: 8, border: "1px solid #333947", background: "#0C0D13" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ color: "#AEB4C2", fontWeight: 700, fontSize: 12.5 }}>How far apart the busy times are</span>
          <span style={{ color: saved <= 6 ? AMBER : GREEN, fontWeight: 700, fontSize: 12 }}>{spread === 0 ? "all at once" : spread + "h apart"}</span>
        </div>
        <input type="range" min="0" max="8" value={spread} onChange={(e) => setSpread(Number(e.target.value))} style={{ width: "100%", marginTop: 8, accentColor: ACCENT }} />
        <div style={{ display: "flex", justifyContent: "space-between", color: "#7C8290", fontSize: 10.5, marginTop: 2 }}>
          <span>&#9664; all peak together (no saving)</span>
          <span>peaks spread across the day &#9654;</span>
        </div>
      </div>

      {/* enforcement (pooled only) */}
      {pooled && (
        <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ color: MUTED, fontSize: 11 }}>Isolation enforced by the manager:</span>
          <button onClick={() => setEnforced(true)} style={{ padding: "5px 11px", borderRadius: 6, cursor: "pointer", fontFamily: MONO, fontSize: 11, border: "1px solid " + (enforced ? GREEN : "#333947"), background: enforced ? GREEN + "18" : "#0C0D13", color: enforced ? GREEN : "#9AA0B0" }}>on</button>
          <button onClick={() => setEnforced(false)} style={{ padding: "5px 11px", borderRadius: 6, cursor: "pointer", fontFamily: MONO, fontSize: 11, border: "1px solid " + (!enforced ? RED : "#333947"), background: !enforced ? RED + "18" : "#0C0D13", color: !enforced ? RED : "#9AA0B0" }}>off</button>
        </div>
      )}

      {/* 24-hour chart */}
      <div style={{ marginTop: 12, background: SURFACE, border: "1px solid " + BORDER, borderRadius: 8, padding: "12px 10px 6px" }}>
        <svg viewBox="0 0 720 158" style={{ width: "100%", height: "auto", overflow: "visible" }}>
          <line x1={X0} y1={yFor(pool)} x2={X0 + span} y2={yFor(pool)} stroke={pooled ? GREEN : AMBER} strokeWidth="1.2" strokeDasharray="4 4" />
          <text x={X0 + span} y={yFor(pool) - 4} fill={pooled ? "#9FE7B6" : AMBER} fontSize="9.5" textAnchor="end" fontFamily={MONO}>pool = {pool}</text>
          {bars}
          <line x1={X0} y1={Y1} x2={X0 + span} y2={Y1} stroke="#2A3040" strokeWidth="1" />
          <text x={X0} y="154" fill={MUTED} fontSize="9" fontFamily={MONO}>midnight</text>
          <text x={X0 + span} y="154" fill={MUTED} fontSize="9" textAnchor="end" fontFamily={MONO}>midnight</text>
        </svg>
        <div style={{ display: "flex", gap: 14, padding: "2px 6px 0", fontSize: 10.5, color: MUTED, flexWrap: "wrap" }}>
          <span><span style={{ color: BLUE }}>&#9644;</span> serving</span>
          {!pooled && <span><span style={{ color: GRAY }}>&#9644;</span> bought, idle</span>}
          {pooled && <span><span style={{ color: GREEN }}>&#9644;</span> background work</span>}
          {noEnf && <span><span style={{ color: RED }}>&#9644;</span> serving starved</span>}
        </div>
      </div>

      {/* readouts */}
      <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {stat("SUM OF PEAKS", String(SUM_PEAKS), AMBER, "what silos buy")}
        {stat("POOL NEEDED", String(combinedPeak), combinedPeak < SUM_PEAKS - 6 ? GREEN : AMBER, "what pooling buys")}
        {stat("SAVED BY POOLING", String(saved), saved > 6 ? GREEN : MUTED, saved > 6 ? "peaks are spread out" : "peaks line up")}
      </div>

      {/* verdict */}
      <div style={{ marginTop: 12, background: SURFACE, border: "1px solid " + vd.c, borderRadius: 8, padding: "12px 14px" }}>
        <div style={{ color: vd.c, fontWeight: 700, fontSize: 13.5 }}>{vd.code}</div>
        <div style={{ fontSize: 12.5, lineHeight: 1.6, color: TEXT, marginTop: 4 }}>{vd.t}</div>
      </div>

      <div style={{ color: "#8B90A0", fontSize: 12, marginTop: 13, borderTop: "1px solid " + BORDER, paddingTop: 10, lineHeight: 1.65 }}>
        Separate pools each buy their own peak and sit idle the rest of the day. One shared pool only has to cover whatever is busy at the moment, so the more the peaks are spread out, the less you buy - and background work uses the time left free. The catch: the workloads only stay apart while the manager enforces it.
      </div>
    </div>
  );
}
