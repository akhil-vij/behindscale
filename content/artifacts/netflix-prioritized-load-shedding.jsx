import { useState, useEffect, useRef } from "react";

const ACCENT = "#E50914";       // Netflix red, used sparingly for wayfinding
const BG = "#08090D";
const PANEL = "#111118";
const BORDER = "#2a2a3a";
const TEXT = "#C8CDD8";
const MUTED = "#7a7a88";
const CRIT = "#22c55e";         // user-initiated / critical survives = green
const PREFETCH = "#E09F3E";     // pre-fetch / non-critical = amber

function Pill({ active, onClick, children, color = ACCENT }) {
  return (
    <button onClick={onClick} style={{
      fontFamily: "inherit", fontSize: 11, padding: "6px 11px", borderRadius: 6, cursor: "pointer",
      border: `1px solid ${active ? color : BORDER}`,
      background: active ? `${color}22` : "transparent",
      color: active ? color : MUTED, transition: "all 120ms",
    }}>{children}</button>
  );
}

// ----- View 1: failure injection (the post's own FIT experiment) -----
function InjectionView() {
  const [prioritized, setPrioritized] = useState(true);
  const [injected, setInjected] = useState(false);
  const [t, setT] = useState(0);
  const raf = useRef(null);

  useEffect(() => {
    raf.current = setInterval(() => setT((x) => x + 1), 120);
    return () => clearInterval(raf.current);
  }, []);

  // availability model: baseline sheds both equally; prioritized protects user-initiated.
  // values are illustrative of the post's described result (baseline both drop together;
  // canary user-initiated holds ~100%, pre-fetch drops).
  const load = injected ? 1 : 0;
  const wobble = Math.sin(t / 3) * 2;
  let userAvail, prefetchAvail;
  if (!injected) {
    userAvail = 100; prefetchAvail = 100;
  } else if (prioritized) {
    userAvail = 100;                       // protected
    prefetchAvail = 22 + wobble;           // sheds to ~20%
  } else {
    userAvail = 38 + wobble;               // both drop together
    prefetchAvail = 36 + wobble;
  }

  const Bar = ({ label, val, color }) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
        <span style={{ color: TEXT }}>{label}</span>
        <span style={{ color, fontWeight: 700 }}>{val.toFixed(0)}% available</span>
      </div>
      <div style={{ height: 14, background: "#1a1a22", borderRadius: 7, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${val}%`, background: color,
          borderRadius: 7, transition: "width 200ms",
        }} />
      </div>
    </div>
  );

  return (
    <div>
      <p style={{ fontSize: 12, color: TEXT, lineHeight: 1.7, marginBottom: 12 }}>
        Netflix's actual validation test: inject 2s of latency into pre-fetch calls (normally &lt;200ms p99)
        and compare a baseline instance against one with prioritized shedding. Flip the toggle, then inject.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        <Pill active={!prioritized} color={MUTED} onClick={() => setPrioritized(false)}>baseline limiter</Pill>
        <Pill active={prioritized} color={CRIT} onClick={() => setPrioritized(true)}>prioritized limiter</Pill>
        <span style={{ flex: 1 }} />
        <Pill active={injected} color={ACCENT} onClick={() => setInjected(!injected)}>
          {injected ? "⏹ stop injection" : "💉 inject 2s latency → pre-fetch"}
        </Pill>
      </div>

      <div style={{ background: PANEL, border: `1px solid ${injected ? (prioritized ? CRIT : ACCENT) + "55" : BORDER}`, borderRadius: 8, padding: "16px 16px 8px" }}>
        <Bar label="User-initiated (press play)" val={userAvail} color={CRIT} />
        <Bar label="Pre-fetch (browsing, optimistic)" val={prefetchAvail} color={PREFETCH} />
        <div style={{
          marginTop: 6, padding: "9px 11px", borderRadius: 6, fontSize: 11.5, lineHeight: 1.6,
          border: `1px solid ${!injected ? BORDER : prioritized ? CRIT : ACCENT}`,
          background: !injected ? "transparent" : prioritized ? "#0a2a1a" : "#2a1316",
          color: !injected ? MUTED : prioritized ? "#95d5b2" : "#ffa8a8",
        }}>
          {!injected
            ? "Steady state: no throttling at all. Prioritization has zero effect until the server hits its concurrency limit."
            : prioritized
              ? "User-initiated holds at 100% — pre-fetch absorbs the entire hit. The user presses play and it works; the optimistic browsing path is what degrades."
              : "Both drop together. The limiter shed playback starts and pre-fetch equally, even though the system had capacity to serve all the user-initiated work."}
        </div>
      </div>

      <div style={{ fontSize: 9.5, color: MUTED, lineHeight: 1.7, marginTop: 10 }}>
        Availability values are illustrative of the post's described result. In the production incident that
        validated this, a 12x pre-fetch spike was shed to ~20% while user-initiated stayed above 99.4%.
      </div>
    </div>
  );
}

// ----- View 2: the two shedding curves, side by side -----
function CurvesView() {
  const [hover, setHover] = useState(null);
  const W = 360, H = 200, pad = 30;

  // 2024 service-level: staggered per-bucket staircase over CPU%
  const buckets = [
    { name: "BULK", color: "#3b82f6", start: 60, end: 66 },
    { name: "BEST_EFFORT", color: "#a78bfa", start: 66, end: 72 },
    { name: "DEGRADED", color: "#22c55e", start: 72, end: 84 },
    { name: "CRITICAL", color: "#E50914", start: 84, end: 90 },
  ];
  const shedAt = (b, cpu) => cpu <= b.start ? 0 : cpu >= b.end ? 100 : ((cpu - b.start) / (b.end - b.start)) * 100;

  // 2020 gateway: cubic priority-threshold over overload%
  // anchors from the post: ~35%->~95, ~80%->50, ~95%->~10
  const cubicThreshold = (ov) => Math.max(0, 100 - 100 * Math.pow(ov / 100, 3) * 1.05);

  const sx = (v) => pad + (v / 100) * (W - 2 * pad);
  const syUp = (v) => H - pad - (v / 100) * (H - 2 * pad);

  return (
    <div>
      <p style={{ fontSize: 12, color: TEXT, lineHeight: 1.7, marginBottom: 14 }}>
        Two layers, two shedding curves — same shed-lowest-first principle, different shapes. The gateway runs
        one continuous cubic threshold over a 1–100 priority score; the service runs staggered per-bucket ramps
        over CPU. Each is faithful to the curve published in its respective post.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        {/* service-level staircase */}
        <div style={{ flex: "1 1 320px" }}>
          <div style={{ fontSize: 10, letterSpacing: 1.5, color: ACCENT, marginBottom: 6 }}>2024 · SERVICE-LEVEL (CPU)</div>
          <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ background: PANEL, borderRadius: 8, border: `1px solid ${BORDER}` }}>
            {[0, 50, 100].map((g) => (
              <line key={g} x1={pad} x2={W - pad} y1={syUp(g)} y2={syUp(g)} stroke={BORDER} strokeWidth="0.5" />
            ))}
            {buckets.map((b) => {
              const pts = [];
              for (let cpu = 50; cpu <= 100; cpu += 1) pts.push(`${sx(cpu)},${syUp(shedAt(b, cpu))}`);
              return <polyline key={b.name} points={pts.join(" ")} fill="none" stroke={b.color} strokeWidth="2"
                opacity={hover && hover !== b.name ? 0.25 : 1} />;
            })}
            <text x={pad} y={H - 8} fill={MUTED} fontSize="8">50% CPU</text>
            <text x={W - pad - 24} y={H - 8} fill={MUTED} fontSize="8">100%</text>
            <text x={6} y={syUp(50)} fill={MUTED} fontSize="8" transform={`rotate(-90 10 ${syUp(50)})`}>% shed</text>
          </svg>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
            {buckets.map((b) => (
              <span key={b.name} onMouseEnter={() => setHover(b.name)} onMouseLeave={() => setHover(null)}
                style={{ fontSize: 9, color: b.color, cursor: "default" }}>━ {b.name}</span>
            ))}
          </div>
          <div style={{ fontSize: 9.5, color: MUTED, marginTop: 6, lineHeight: 1.6 }}>
            A cascading staircase: each tier is fully shed before the next more-critical tier begins. CRITICAL
            only sheds past ~84% — "never if we are not in complete failure." Shedding starts only after the
            autoscale target, preserving the scale-up signal.
          </div>
        </div>

        {/* gateway cubic */}
        <div style={{ flex: "1 1 320px" }}>
          <div style={{ fontSize: 10, letterSpacing: 1.5, color: "#5865F2", marginBottom: 6 }}>2020 · GATEWAY (ZUUL)</div>
          <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ background: PANEL, borderRadius: 8, border: `1px solid ${BORDER}` }}>
            {[0, 50, 100].map((g) => (
              <line key={g} x1={pad} x2={W - pad} y1={syUp(g)} y2={syUp(g)} stroke={BORDER} strokeWidth="0.5" />
            ))}
            <polyline
              points={Array.from({ length: 101 }, (_, ov) => `${sx(ov)},${syUp(cubicThreshold(ov))}`).join(" ")}
              fill="none" stroke="#5865F2" strokeWidth="2" />
            {/* anchor dots from the post */}
            {[[35, 95], [80, 50], [95, 10]].map(([ov, thr]) => (
              <circle key={ov} cx={sx(ov)} cy={syUp(thr)} r="3" fill="#5865F2" />
            ))}
            <text x={pad} y={H - 8} fill={MUTED} fontSize="8">0% over</text>
            <text x={W - pad - 30} y={H - 8} fill={MUTED} fontSize="8">100% over</text>
            <text x={6} y={syUp(50)} fill={MUTED} fontSize="8" transform={`rotate(-90 10 ${syUp(50)})`}>priority kept</text>
          </svg>
          <div style={{ fontSize: 9, color: MUTED, marginTop: 6 }}>● anchors from the post: 35%→~95, 80%→50, 95%→~10</div>
          <div style={{ fontSize: 9.5, color: MUTED, marginTop: 6, lineHeight: 1.6 }}>
            One continuous cubic over a 1–100 priority score: the threshold trails overload slowly, then drops
            off the cliff. Everything scoring above the moving threshold survives; the rest is shed at the edge
            before it reaches any backend.
          </div>
        </div>
      </div>
    </div>
  );
}

// ----- View 3: the adaptive limit substrate (2018) -----
function LimitView() {
  const [running, setRunning] = useState(false);
  const [hist, setHist] = useState([]);
  const iv = useRef(null);

  useEffect(() => {
    if (!running) return;
    let limit = 20, t = 0, data = [];
    iv.current = setInterval(() => {
      t++;
      // true capacity shifts mid-run to show adaptation
      const capacity = t < 30 ? 60 : t < 55 ? 35 : 75;
      // gradient proxy: if limit under capacity, latency low (gradient ~1, grow); if over, queue (gradient <1, shrink)
      const over = limit > capacity;
      const gradient = over ? capacity / limit : 1;
      const queueSize = Math.sqrt(limit);
      limit = Math.max(5, Math.min(100, limit * gradient + (over ? 0 : queueSize)));
      data.push({ t, limit, capacity });
      if (data.length > 70) data = data.slice(-70);
      setHist([...data]);
      if (t > 80) { clearInterval(iv.current); setRunning(false); }
    }, 110);
    return () => clearInterval(iv.current);
  }, [running]);

  const W = 700, H = 180, pad = 28;
  const maxY = 100;
  const sx = (i, n) => pad + (i / Math.max(n - 1, 1)) * (W - 2 * pad);
  const sy = (v) => H - pad - (v / maxY) * (H - 2 * pad);

  return (
    <div>
      <p style={{ fontSize: 12, color: TEXT, lineHeight: 1.7, marginBottom: 12 }}>
        The 2018 substrate: adaptive concurrency limits discover capacity with no manual tuning, borrowing TCP
        congestion control. The limit probes upward while latency stays flat, then backs off when a queue forms —
        the saw-tooth. Watch it re-converge when true capacity shifts mid-run.
      </p>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <Pill active={running} color={CRIT} onClick={() => { setHist([]); setRunning(false); setTimeout(() => setRunning(true), 60); }}>▶ run</Pill>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ background: PANEL, borderRadius: 8, border: `1px solid ${BORDER}` }}>
        {hist.length > 1 && (
          <>
            <polyline points={hist.map((d, i) => `${sx(i, hist.length)},${sy(d.capacity)}`).join(" ")}
              fill="none" stroke={MUTED} strokeWidth="1.5" strokeDasharray="4,3" />
            <polyline points={hist.map((d, i) => `${sx(i, hist.length)},${sy(d.limit)}`).join(" ")}
              fill="none" stroke={ACCENT} strokeWidth="2" />
          </>
        )}
        {hist.length === 0 && <text x={W / 2 - 40} y={H / 2} fill={MUTED} fontSize="11">press run</text>}
      </svg>
      <div style={{ display: "flex", gap: 14, marginTop: 6, fontSize: 9.5 }}>
        <span style={{ color: ACCENT }}>━ discovered limit</span>
        <span style={{ color: MUTED }}>╌ true capacity (hidden from the algorithm)</span>
      </div>
      <div style={{ fontSize: 9.5, color: MUTED, marginTop: 8, lineHeight: 1.7, fontFamily: "inherit" }}>
        newLimit = currentLimit × gradient + queueSize, where gradient = RTT<sub>noload</sub> / RTT<sub>actual</sub>
        and queueSize defaults to √limit. Gradient 1 → grow; &lt;1 → a queue formed, shrink. This is the limit
        the prioritized shedding above is enforcing.
      </div>
    </div>
  );
}

export default function NetflixLoadShedding() {
  const [tab, setTab] = useState("inject");
  return (
    <div style={{
      fontFamily: "'JetBrains Mono','Fira Code','SF Mono',monospace",
      background: BG, color: TEXT, minHeight: "100vh", padding: "20px 16px", boxSizing: "border-box",
    }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, letterSpacing: 4, color: ACCENT, marginBottom: 6, textTransform: "uppercase" }}>
            Netflix · reliability
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#F0F0F5", margin: 0, lineHeight: 1.3 }}>
            Prioritized Load Shedding
          </h1>
          <p style={{ fontSize: 12, color: MUTED, marginTop: 6, lineHeight: 1.6, maxWidth: 660 }}>
            When a service must shed, it should shed the traffic the user won't miss. Protect playback; let the
            optimistic browsing path absorb the hit.
          </p>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          <Pill active={tab === "inject"} onClick={() => setTab("inject")}>① failure injection</Pill>
          <Pill active={tab === "curves"} onClick={() => setTab("curves")}>② two shedding curves</Pill>
          <Pill active={tab === "limit"} onClick={() => setTab("limit")}>③ the adaptive limit</Pill>
        </div>

        {tab === "inject" ? <InjectionView /> : tab === "curves" ? <CurvesView /> : <LimitView />}

        <div style={{ fontSize: 9, color: "#555", marginTop: 20, lineHeight: 1.6, borderTop: `1px solid ${BORDER}`, paddingTop: 10 }}>
          Mechanisms and the failure-injection result are from the 2024 service-level post; the gateway cubic
          curve from the 2020 post; the adaptive-limit formula from the 2018 post. Simulation magnitudes are
          illustrative where the posts don't publish exact internal values; the sourced content is the mechanism.
        </div>
      </div>
    </div>
  );
}
