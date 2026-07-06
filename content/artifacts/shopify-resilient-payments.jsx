import { useState, useEffect, useRef } from "react";

// ---------- deterministic PRNG (mulberry32) ----------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// log-normal latency sample, mean-normalized to p50 (seconds)
function sampleLatency(rng, p50, sigma) {
  const u1 = Math.max(rng(), 1e-9), u2 = rng();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return p50 * Math.exp(sigma * z - (sigma * sigma) / 2);
}

// ---------- constants (illustrative — labeled on screen) ----------
const N_WORKERS = 12;
const HEALTHY_P50 = 0.3;        // s
const NOMINAL_CAP = N_WORKERS / HEALTHY_P50; // 40 rps
const CLIENT_TIMEOUT = 10;      // s — buyer gives up
const TIMEOUT_DEFAULT = 60;     // s — Ruby Net::HTTP defaults
const TIMEOUT_TUNED = 5;        // s — the post's starting point (read/write)
const THROTTLE_CAP = 16;        // admitted in-system when throttle is on
const BREAK_FAILS = 5, BREAK_WINDOW = 10, BREAK_COOLDOWN = 8; // s
const SIGMA = 0.6;
const WINDOW = 8;               // s metrics window

const SCENARIOS = {
  manual: {
    label: "MANUAL",
    caption: "You drive the arrival rate. Find the knee: queue growth starts around the 70–80% saturation mark.",
    rate: null,
    partner: () => ({ p50: HEALTHY_P50, hang: false }),
  },
  slowdown: {
    label: "PARTNER SLOWDOWN",
    caption: "t=10s: the partner's p50 degrades 0.3s → 8s, recovers at t=40s. Arrival fixed at 70% of nominal.",
    rate: () => 0.7 * NOMINAL_CAP,
    partner: (t) => (t >= 10 && t < 40 ? { p50: 8, hang: false } : { p50: HEALTHY_P50, hang: false }),
  },
  outage: {
    label: "PARTNER OUTAGE",
    caption: "t=10s: every partner call hangs until your timeout fires; recovers at t=45s. Arrival fixed at 70%.",
    rate: () => 0.7 * NOMINAL_CAP,
    partner: (t) => (t >= 10 && t < 45 ? { p50: HEALTHY_P50, hang: true } : { p50: HEALTHY_P50, hang: false }),
  },
  flash: {
    label: "FLASH SALE",
    caption: "t=10s: arrivals jump to 3× nominal capacity until t=50s. The partner stays healthy throughout.",
    rate: (t) => (t >= 10 && t < 50 ? 3 * NOMINAL_CAP : 0.7 * NOMINAL_CAP),
    partner: () => ({ p50: HEALTHY_P50, hang: false }),
  },
};

function freshSim(seed) {
  return {
    t: 0,
    rng: mulberry32(seed),
    workers: Array.from({ length: N_WORKERS }, () => ({ until: 0, kind: "idle", job: null, probe: false })),
    admitQ: [],       // { at }
    room: [],         // { at } waiting-room (throttle)
    breaker: { state: "closed", fails: [], openedAt: -1e9, probing: false },
    events: [],       // { t, type, wait } type: success|timeout|fastfail|abandon
    history: [],      // { t, q, p95, util, room }
    knee: [],         // { util, p95 }
    utilAccum: [],    // recent busy fractions
    lastKnee: 0,
  };
}

function verdictOf(m, breakerOpen, roomLen) {
  if (m.total >= 5 && m.abandons / Math.max(m.total, 1) > 0.5)
    return { code: "DOWN", color: "#EF4444", note: "buyers wait past their timeout, then leave — from the client's perspective, the service is down" };
  if (breakerOpen)
    return { code: "FAILING FAST", color: "#F59E0B", note: "circuit open: instant errors instead of hung workers — the pool stays free and recovery is immediate" };
  if (m.total >= 5 && (m.errRate > 0.25 || m.p95 > 5))
    return { code: "DEGRADED", color: "#F59E0B", note: "errors or slow checkouts above tolerance, but the system is still answering" };
  if (roomLen > 0)
    return { code: "QUEUEING BUYERS", color: "#84CC16", note: "throttle active: excess buyers hold in the waiting room; admitted checkouts stay fast" };
  return { code: "OK", color: "#22C55E", note: "checkouts completing within tolerance" };
}

export default function SaturationKnee() {
  const [scenario, setScenario] = useState("slowdown");
  const [running, setRunning] = useState(true);
  const [tuned, setTuned] = useState(false);
  const [breakerOn, setBreakerOn] = useState(false);
  const [throttleOn, setThrottleOn] = useState(false);
  const [manualPct, setManualPct] = useState(70);
  const [ctxOpen, setCtxOpen] = useState(true);   // context block, expanded by default for the cold visitor
  const simRef = useRef(freshSim(42));
  const [, force] = useState(0);
  const cfgRef = useRef({});
  cfgRef.current = { scenario, tuned, breakerOn, throttleOn, manualPct };

  const reset = (sc) => { simRef.current = freshSim(42); if (sc) setScenario(sc); force((x) => x + 1); };

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const s = simRef.current;
      const { scenario, tuned, breakerOn, throttleOn, manualPct } = cfgRef.current;
      const sc = SCENARIOS[scenario];
      const DT = 0.1, SUB = 4; // 4 substeps of 0.1s per 80ms tick (5× real time)
      const pTimeout = tuned ? TIMEOUT_TUNED : TIMEOUT_DEFAULT;

      for (let step = 0; step < SUB; step++) {
        const t = s.t;
        const partner = sc.partner(t);
        const rate = scenario === "manual" ? (manualPct / 100) * NOMINAL_CAP : sc.rate(t);

        // arrivals
        s.acc = (s.acc || 0) + rate * DT;
        while (s.acc >= 1) {
          s.acc -= 1;
          const inSystem = s.admitQ.length + s.workers.filter((w) => w.kind !== "idle").length;
          if (throttleOn && inSystem >= THROTTLE_CAP) s.room.push({ at: t });
          else s.admitQ.push({ at: t });
        }

        // resolve finished workers
        for (const w of s.workers) {
          if (w.kind !== "idle" && w.until <= t) {
            if (w.kind === "ok") s.events.push({ t, type: "success", wait: t - w.job.at });
            else {
              s.events.push({ t, type: "timeout", wait: t - w.job.at });
              s.breaker.fails.push(t);
              if (w.probe) { s.breaker.state = "open"; s.breaker.openedAt = t; }
            }
            if (w.probe && w.kind === "ok") { s.breaker.state = "closed"; s.breaker.fails = []; }
            w.kind = "idle"; w.job = null; w.probe = false;
          }
        }

        // breaker state machine
        s.breaker.fails = s.breaker.fails.filter((ft) => t - ft <= BREAK_WINDOW);
        if (breakerOn && s.breaker.state === "closed" && s.breaker.fails.length >= BREAK_FAILS) {
          s.breaker.state = "open"; s.breaker.openedAt = t;
        }
        if (!breakerOn) { s.breaker.state = "closed"; }
        const canProbe = s.breaker.state === "open" && t - s.breaker.openedAt >= BREAK_COOLDOWN;

        // abandon queue heads past client timeout
        while (s.admitQ.length && t - s.admitQ[0].at > CLIENT_TIMEOUT) {
          const j = s.admitQ.shift();
          s.events.push({ t, type: "abandon", wait: t - j.at });
        }

        // throttle: admit from waiting room as capacity frees
        if (throttleOn) {
          let inSystem = s.admitQ.length + s.workers.filter((w) => w.kind !== "idle").length;
          while (s.room.length && inSystem < THROTTLE_CAP) { s.room.shift(); s.admitQ.push({ at: t }); inSystem++; }
        } else if (s.room.length) { for (const j of s.room) s.admitQ.push(j); s.room = []; }

        // assign work
        if (breakerOn && s.breaker.state === "open") {
          // one probe when cooldown has elapsed and none is in flight
          if (canProbe && !s.workers.some((x) => x.probe) && s.admitQ.length) {
            const w = s.workers.find((x) => x.kind === "idle");
            if (w) {
              const job = s.admitQ.shift();
              const dur = partner.hang ? Infinity : sampleLatency(s.rng, partner.p50, SIGMA);
              if (dur > pTimeout) { w.kind = "timeout"; w.until = t + pTimeout; }
              else { w.kind = "ok"; w.until = t + dur; }
              w.job = job; w.probe = true;
            }
          }
          // open circuit: everything else fails fast, instantly
          while (s.admitQ.length) { s.admitQ.shift(); s.events.push({ t, type: "fastfail", wait: 0 }); }
        } else {
          for (const w of s.workers) {
            if (w.kind !== "idle" || !s.admitQ.length) continue;
            const job = s.admitQ.shift();
            const dur = partner.hang ? Infinity : sampleLatency(s.rng, partner.p50, SIGMA);
            if (dur > pTimeout) { w.kind = "timeout"; w.until = t + pTimeout; }
            else { w.kind = "ok"; w.until = t + dur; }
            w.job = job; w.probe = false;
          }
        }

        // metrics
        const busy = s.workers.filter((w) => w.kind !== "idle").length;
        s.utilAccum.push(busy / N_WORKERS);
        if (s.utilAccum.length > Math.round(WINDOW / DT)) s.utilAccum.shift();
        s.events = s.events.filter((e) => t - e.t <= WINDOW);
        s.t = t + DT;
      }

      // snapshot + history
      const s2 = simRef.current;
      const ev = s2.events;
      const succ = ev.filter((e) => e.type === "success");
      const waits = succ.map((e) => e.wait).sort((a, b) => a - b);
      const p95 = waits.length ? waits[Math.min(waits.length - 1, Math.floor(waits.length * 0.95))] : 0;
      const m = {
        total: ev.length,
        thr: succ.length / WINDOW,
        errRate: ev.length ? ev.filter((e) => e.type !== "success").length / ev.length : 0,
        abandons: ev.filter((e) => e.type === "abandon").length,
        fastfails: ev.filter((e) => e.type === "fastfail").length,
        p95,
        util: s2.utilAccum.reduce((a, b) => a + b, 0) / Math.max(s2.utilAccum.length, 1),
      };
      s2.metrics = m;
      s2.history.push({ t: s2.t, q: s2.admitQ.length, p95, room: s2.room.length });
      if (s2.history.length > 180) s2.history.shift();
      if (cfgRef.current.scenario === "manual" && s2.t - s2.lastKnee > 1.6) {
        s2.lastKnee = s2.t;
        s2.knee.push({ util: m.util, p95: Math.min(p95, CLIENT_TIMEOUT) });
        if (s2.knee.length > 90) s2.knee.shift();
      }
      force((x) => x + 1);
    }, 80);
    return () => clearInterval(id);
  }, [running]);

  const s = simRef.current;
  const m = s.metrics || { total: 0, thr: 0, errRate: 0, abandons: 0, fastfails: 0, p95: 0, util: 0 };
  const open = s.breaker.state === "open";
  const v = verdictOf(m, open, s.room.length);
  const sc = SCENARIOS[scenario];
  const rateNow = scenario === "manual" ? (manualPct / 100) * NOMINAL_CAP : sc.rate(s.t);

  // ---------- styles ----------
  const mono = "'JetBrains Mono','Fira Code','SF Mono',ui-monospace,monospace";
  const S = {
    root: { background: "#08090D", color: "#C8CDD8", fontFamily: mono, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid #2a2a3a", fontSize: 12, lineHeight: 1.5 },
    eyebrow: { color: "#84CC16", fontSize: 10, letterSpacing: 2 },
    h1: { color: "#EDEFF3", fontSize: 16, margin: "4px 0 2px", fontWeight: 700 },
    sub: { color: "#8b90a0", fontSize: 11, margin: 0 },
    tabs: { display: "flex", flexWrap: "wrap", gap: 6, margin: "14px 0 6px" },
    tab: (on) => ({ padding: "6px 10px", borderRadius: 6, cursor: "pointer", border: `1px solid ${on ? "#84CC16" : "#2a2a3a"}`, color: on ? "#84CC16" : "#8b90a0", background: on ? "rgba(132,204,22,0.08)" : "#111118", fontFamily: mono, fontSize: 11 }),
    caption: { color: "#8b90a0", fontSize: 11, minHeight: 30, margin: "2px 0 10px" },
    row: { display: "flex", flexWrap: "wrap", gap: 12 },
    panel: { background: "#111118", border: "1px solid #2a2a3a", borderRadius: 8, padding: 12 },
    label: { color: "#6b7080", fontSize: 10, letterSpacing: 1.2 },
    toggle: (on) => ({ display: "block", width: "100%", textAlign: "left", padding: "7px 9px", marginTop: 6, borderRadius: 6, cursor: "pointer", border: `1px solid ${on ? "#84CC16" : "#2a2a3a"}`, color: on ? "#D3F58C" : "#8b90a0", background: on ? "rgba(132,204,22,0.08)" : "#0c0d13", fontFamily: mono, fontSize: 11 }),
    big: { color: "#EDEFF3", fontSize: 18, fontWeight: 700 },
    verdict: { padding: "10px 12px", borderRadius: 8, border: `1px solid ${v.color}`, background: `${v.color}14`, marginBottom: 12 },
    stat: { minWidth: 106, flex: 1 },
    foot: { color: "#6b7080", fontSize: 10, marginTop: 12, borderTop: "1px solid #2a2a3a", paddingTop: 8 },
  };

  // sparkline
  const H = s.history, W = 640, HT = 96;
  const maxQ = Math.max(20, ...H.map((h) => h.q + h.room));
  const px = (i) => (i / Math.max(H.length - 1, 1)) * W;
  const qLine = H.map((h, i) => `${px(i)},${HT - (h.q / maxQ) * HT}`).join(" ");
  const rLine = H.map((h, i) => `${px(i)},${HT - ((h.q + h.room) / maxQ) * HT}`).join(" ");
  const pLine = H.map((h, i) => `${px(i)},${HT - (Math.min(h.p95, CLIENT_TIMEOUT) / CLIENT_TIMEOUT) * HT}`).join(" ");

  return (
    <div style={S.root}>
      <div style={S.eyebrow}>SHOPIFY · RESILIENT PAYMENTS — INTERACTIVE</div>
      <div style={S.h1}>The saturation knee</div>
      <p style={S.sub}>capacity = throughput × latency — {N_WORKERS} workers ÷ {HEALTHY_P50}s p50 ≈ {NOMINAL_CAP.toFixed(0)} rps nominal. Buyers give up after {CLIENT_TIMEOUT}s.</p>

      {ctxOpen ? (
        <div style={{ ...S.panel, marginTop: 12, borderColor: "#374b16" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
            <div style={S.label}>CONTEXT — IF YOU ARRIVED HERE WITHOUT THE ARTICLE</div>
            <button style={{ background: "none", border: "none", color: "#6b7080", cursor: "pointer", fontFamily: mono, fontSize: 10, padding: 0 }} onClick={() => setCtxOpen(false)}>HIDE ✕</button>
          </div>
          <div style={{ marginTop: 8 }}>
            <span style={{ color: "#84CC16", fontSize: 10, letterSpacing: 1.2 }}>THE PROBLEM · </span>
            At Shopify's volume, a once-in-a-million network failure during payment processing happens many times a day — and in payments the unit of damage is money. An unbounded wait takes checkout down for everyone.
          </div>
          <div style={{ marginTop: 6 }}>
            <span style={{ color: "#84CC16", fontSize: 10, letterSpacing: 1.2 }}>THE MOVE · </span>
            Bound every wait: tuned timeouts instead of 60-second defaults, circuit breakers that fail fast while a partner is down, and a checkout throttle that queues buyers instead of collapsing. The defenses chain — retries these failures trigger are safe only because idempotency keys make them safe.
          </div>
          <div style={{ marginTop: 6 }}>
            <span style={{ color: "#84CC16", fontSize: 10, letterSpacing: 1.2 }}>TRY · </span>
            Pick a scenario, toggle defenses on and off, and watch the verdict — judged from the buyer's side of the checkout.
          </div>
        </div>
      ) : (
        <button style={{ background: "none", border: "none", color: "#6b7080", cursor: "pointer", fontFamily: mono, fontSize: 10, padding: 0, marginTop: 10, display: "block" }} onClick={() => setCtxOpen(true)}>SHOW CONTEXT ▾</button>
      )}

      <div style={S.tabs}>
        {Object.entries(SCENARIOS).map(([k, v2]) => (
          <button key={k} style={S.tab(scenario === k)} onClick={() => reset(k)}>{v2.label}</button>
        ))}
        <button style={{ ...S.tab(false), marginLeft: "auto" }} onClick={() => setRunning(!running)}>{running ? "❚❚ PAUSE" : "► RUN"}</button>
        <button style={S.tab(false)} onClick={() => reset()}>↺ RESET</button>
      </div>
      <p style={S.caption}>{sc.caption} <span style={{ color: "#4a4f5e" }}>· t = {s.t.toFixed(0)}s</span></p>

      <div style={S.row}>
        {/* controls */}
        <div style={{ ...S.panel, flex: "1 1 220px", minWidth: 220 }}>
          <div style={S.label}>DEFENSES</div>
          <button style={S.toggle(tuned)} onClick={() => setTuned(!tuned)}>
            TIMEOUTS — {tuned ? "5s TUNED" : "60s DEFAULT"}
            <div style={{ color: "#6b7080", fontSize: 10 }}>{tuned ? "the post's read/write starting point" : "Ruby Net::HTTP ships 60s per phase"}</div>
          </button>
          <button style={S.toggle(breakerOn)} onClick={() => setBreakerOn(!breakerOn)}>
            CIRCUIT BREAKER — {breakerOn ? "ON" : "OFF"}
            <div style={{ color: "#6b7080", fontSize: 10 }}>opens after {BREAK_FAILS} timeouts / {BREAK_WINDOW}s · probes after {BREAK_COOLDOWN}s cooldown</div>
          </button>
          <button style={S.toggle(throttleOn)} onClick={() => setThrottleOn(!throttleOn)}>
            CHECKOUT THROTTLE — {throttleOn ? "ON" : "OFF"}
            <div style={{ color: "#6b7080", fontSize: 10 }}>admits {THROTTLE_CAP} in-system; the rest hold in a waiting queue</div>
          </button>
          {scenario === "manual" && (
            <div style={{ marginTop: 10 }}>
              <div style={S.label}>ARRIVAL RATE — {manualPct}% OF NOMINAL ({rateNow.toFixed(0)} rps)</div>
              <input type="range" min={10} max={120} value={manualPct} onChange={(e) => setManualPct(+e.target.value)} style={{ width: "100%", accentColor: "#84CC16" }} />
            </div>
          )}
          <div style={{ marginTop: 10 }}>
            <div style={S.label}>WORKER POOL {open ? "· CIRCUIT OPEN" : ""}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
              {s.workers.map((w, i) => (
                <div key={i} title={w.kind} style={{ width: 20, height: 20, borderRadius: 4, background: w.kind === "idle" ? "#1a1a24" : w.kind === "ok" ? "#84CC16" : "#F59E0B", opacity: w.kind === "idle" ? 1 : 0.9 }} />
              ))}
            </div>
            <div style={{ color: "#6b7080", fontSize: 10, marginTop: 4 }}>■ lime: processing · ■ amber: stuck until timeout · ■ dark: idle</div>
          </div>
        </div>

        {/* readouts */}
        <div style={{ flex: "2 1 380px", minWidth: 300 }}>
          <div style={S.verdict}>
            <span style={{ color: v.color, fontSize: 16, fontWeight: 700 }}>{v.code}</span>
            <div style={{ color: "#8b90a0", fontSize: 11 }}>{v.note}</div>
          </div>
          <div style={{ ...S.row, marginBottom: 12 }}>
            <div style={{ ...S.panel, ...S.stat }}><div style={S.label}>THROUGHPUT</div><div style={S.big}>{m.thr.toFixed(1)} <span style={{ fontSize: 11, color: "#6b7080" }}>rps</span></div></div>
            <div style={{ ...S.panel, ...S.stat }}><div style={S.label}>UTILIZATION</div><div style={{ ...S.big, color: m.util > 0.78 ? "#F59E0B" : "#EDEFF3" }}>{(m.util * 100).toFixed(0)}%</div></div>
            <div style={{ ...S.panel, ...S.stat }}><div style={S.label}>QUEUE / ROOM</div><div style={S.big}>{s.admitQ.length}<span style={{ fontSize: 11, color: "#6b7080" }}> / {s.room.length}</span></div></div>
            <div style={{ ...S.panel, ...S.stat }}><div style={S.label}>P95 WAIT</div><div style={{ ...S.big, color: m.p95 > 5 ? "#F59E0B" : "#EDEFF3" }}>{m.p95.toFixed(1)}s</div></div>
            <div style={{ ...S.panel, ...S.stat }}><div style={S.label}>ABANDONED (8s)</div><div style={{ ...S.big, color: m.abandons ? "#EF4444" : "#EDEFF3" }}>{m.abandons}</div></div>
          </div>

          <div style={S.panel}>
            <div style={S.label}>LAST 70s — QUEUE DEPTH (lime), +WAITING ROOM (dashed lime), P95 WAIT (gray, 0–{CLIENT_TIMEOUT}s)</div>
            <svg viewBox={`0 0 ${W} ${HT}`} style={{ width: "100%", height: HT, display: "block", marginTop: 6 }}>
              <line x1={0} y1={HT - (5 / CLIENT_TIMEOUT) * HT} x2={W} y2={HT - (5 / CLIENT_TIMEOUT) * HT} stroke="#2a2a3a" strokeDasharray="3 5" />
              <polyline points={pLine} fill="none" stroke="#6b7080" strokeWidth="1.5" />
              <polyline points={rLine} fill="none" stroke="#84CC16" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
              <polyline points={qLine} fill="none" stroke="#84CC16" strokeWidth="1.5" />
            </svg>
          </div>

          {scenario === "manual" && (
            <div style={{ ...S.panel, marginTop: 12 }}>
              <div style={S.label}>YOUR RUNS — P95 WAIT vs UTILIZATION · the post: queues start growing around the 70–80% mark</div>
              <svg viewBox="0 0 320 120" style={{ width: "100%", maxWidth: 480, height: 120, display: "block", marginTop: 6 }}>
                <rect x={0.7 * 320} y={0} width={0.1 * 320} height={104} fill="#84CC16" opacity="0.08" />
                <line x1={0} y1={104} x2={320} y2={104} stroke="#2a2a3a" />
                {s.knee.map((k, i) => (
                  <circle key={i} cx={Math.min(k.util, 1.05) * 320} cy={104 - (k.p95 / CLIENT_TIMEOUT) * 100} r={2.5} fill="#84CC16" opacity={0.35 + 0.65 * (i / Math.max(s.knee.length - 1, 1))} />
                ))}
                <text x={0.72 * 320} y={116} fill="#6b7080" fontSize="9" fontFamily={mono}>70–80%</text>
                <text x={2} y={116} fill="#6b7080" fontSize="9" fontFamily={mono}>0% utilization</text>
              </svg>
            </div>
          )}
        </div>
      </div>

      <div style={S.foot}>
        Worker count, latencies, and thresholds are illustrative. The sourced content is the mechanism: Little's law capacity math, queue growth starting around 70–80% saturation, 60-second client defaults vs a 5-second starting point, breakers converting hung waits into instant failures, and a checkout waiting queue bounding admission. Retries triggered by these failures are safe only because idempotency keys make them safe — see the article's Stripe cross-link.
        {" "}
        <a href="https://behindscale.com/articles/shopify-resilient-payments" target="_blank" rel="noopener noreferrer" style={{ color: "#84CC16", textDecoration: "none" }}>From the full dissection at behindscale.com →</a>
      </div>
    </div>
  );
}
