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

// ---------- constants (illustrative — labeled on screen) ----------
const ACCENT = "#f97316";       // t1, the protected tier
const T3C = "#9aa3b2";          // t3 internal services
const T5C = "#5f6b7a";          // t5 batch pipelines
const RED = "#ef4444";
const AMBER = "#eab308";
const GREEN = "#22c55e";
const DT = 0.1;                  // sim seconds per tick
const CAPACITY = 100;            // node service rate, rps (illustrative)
const FOLLOWER_CAP = 55;         // follower apply rate, rps (illustrative)
const BASE = { t1: 35, t3: 15, t5: 20 };
const TIER_META = {
  t1: { label: "t1 · rides + payments", color: ACCENT },
  t3: { label: "t3 · internal services", color: T3C },
  t5: { label: "t5 · batch pipelines", color: T5C },
};

const PHASES = [
  { id: "quota", label: "PHASE 1 · QUOTA AT THE QUERY LAYER", caption: "Static per-tenant budgets in the stateless query engine, priced in capacity units, usage tracked in a central Redis. Every request pays the Redis hop before touching storage." },
  { id: "codel", label: "PHASE 2 · CODEL + SCORECARD", caption: "Control moves into the storage node: CoDel queues shed on wait time (not length), and Scorecard caps each tenant's concurrency. Stability arrives — judgment doesn't." },
  { id: "cinnamon", label: "PHASE 3 · CINNAMON", caption: "Requests carry priority tiers (t0–t5, three shown). A PID controller walks the admission threshold against measured latency; BYOS lets any overload signal join the same loop." },
];

const SCENARIOS = [
  { id: "baseline", label: "BASELINE", hint: "healthy traffic, ~70% utilization" },
  { id: "batch", label: "BATCH SPIKE", hint: "t5 pipelines quadruple — the post's most common cause" },
  { id: "noisy", label: "NOISY TENANT", hint: "one t3 tenant floods shared storage" },
  { id: "retry", label: "RETRY PRESSURE", hint: "rejected requests come back — together" },
  { id: "lag", label: "FOLLOWER LAG", hint: "leader healthy; followers falling behind" },
];

function offeredFor(scenario) {
  if (scenario === "batch") return { t1: 35, t3: 15, t5: 80 };
  if (scenario === "noisy") return { t1: 35, t3: 85, t5: 20 }; // t3 = 15 normal + 70 noisy
  if (scenario === "retry") return { t1: 45, t3: 25, t5: 40 };
  return { ...BASE };
}

// ---------- verdict copy (phase x scenario, + BYOS variant) ----------
function verdictOf(phase, scenario, byos, live) {
  const V = (sev, code, text) => ({ sev, code, text });
  const { t1Avail, latMs, lagS, lagTrend } = live;
  if (scenario === "baseline") {
    if (phase === "quota") return V("ok", "HEALTHY — WITH A STANDING TAX", "70 rps against ~100 capacity. But note the constant cost: every request detours through Redis for quota accounting — an extra network hop and a new failure point, bought before any overload has arrived.");
    if (phase === "codel") return V("ok", "HEALTHY — CONTROL AT REST", "Queues empty, shedding idle. The machinery lives inside the storage node, so its cost at rest is near zero — no extra hop, no external dependency.");
    return V("ok", "HEALTHY — PRIORITY COSTS NOTHING YET", "Tiers and the PID engage only under pressure. The same property Netflix found at the service layer: prioritization is free until the limiter has something to decide.");
  }
  if (scenario === "batch") {
    if (phase === "quota") return V("bad", "QUOTAS GREEN · NODE SATURATED", `The batch tenant never exceeds its budget — scans meter far below their true cost — so the query layer sheds nothing while the node drowns. P99 is at ${latMs >= 3000 ? "3.1s" : Math.round(latMs) + "ms"} for everyone, rides included. The layer with the decision cannot see the layer with the problem.`);
    if (phase === "codel") return V("mixed", "STABLE — BUT LOOK WHO PAID", `CoDel sheds on queue delay and the node survives; accepted requests succeed again. But the drop budget was spent blind: every tier cut proportionally — t1 availability ${t1Avail}%. Rides paid to protect pipelines.`);
    return V("ok", "BUDGET SPENT BOTTOM-UP", `t5 absorbs the entire cut; t1 holds at ${t1Avail}%. This is the regime the post measured: +80% throughput under overload, P99 from 3.1s to 1.0s.`);
  }
  if (scenario === "noisy") {
    if (phase === "quota") return V("bad", "CLIPPED LATE, HOT ANYWAY", "The static quota eventually clips the flood — but it was sized for a different month's capacity, the cost model undercounts, and by the time the budget bites, every other tenant is already feeling the node run hot.");
    if (phase === "codel") return V("ok", "SCORECARD'S CASE — CONTAINED", `The tenant hits its concurrency cap at the node and is boxed in deterministically, without punishing anyone else — t1 availability ${t1Avail}%. Fairness turns out to be a separate mechanism from overload.`);
    return V("ok", "STILL SCORECARD'S CASE", "The containment is Scorecard's, carried forward into the Cinnamon era; tiers add nothing here. Not every failure needs the newest tool — the post keeps both.");
  }
  if (scenario === "retry") {
    if (phase === "quota") return V("bad", "THE HERD MEETS THE WINDOW", "Rejected callers return in sync, the quota window admits a fresh batch, exhausts, rejects the rest together — and the cycle repeats. Watch the shed trace spike in rhythm.");
    if (phase === "codel") return V("bad", "THE POST'S OWN DIAGNOSIS", "Fixed wait times reject in bursts; the rejected retry together; the system oscillates between overload and idle. The hammer pattern in the shed trace below is Figure 16's left-hand side.");
    return V("ok", "THE DIMMER, NOT THE HAMMER", "The PID sheds early, smoothly, and only as much as needed — fewer premature rejections, so retries spread out instead of synchronizing. The shed trace flattens; the cycle never forms.");
  }
  // lag
  if (phase === "quota") return V("bad", "NO LOCAL SIGNAL WILL EVER FIRE", `The leader is healthy and every quota is green — but followers are falling behind. Commit index lag: ${lagS}s and climbing. The overload is real; it just isn't where the meter is.`);
  if (phase === "codel") return V("bad", "THE QUEUES ARE FINE. THAT'S THE PROBLEM.", `CoDel watches its own queues; they're empty. The overload is one hop away and invisible — lag ${lagS}s. (The traditional fix, external token-bucket limiters, brought split-brain and globally suboptimal shedding.)`);
  if (!byos) return V("bad", "CONCURRENCY-ONLY SHEDDING IS BLIND HERE", `Local signals green, lag at ${lagS}s and ${lagTrend > 0.05 ? "climbing" : "high"}. A shedder that only understands its own inflight count cannot see a distributed signal. Flip BYOS on.`);
  return V("ok", "ONE LOOP, ANY SIGNAL", `The follower's commit lag plugs into the same admission path as every local signal; the leader sheds t5 until the followers ${lagTrend < -0.01 ? "catch up — lag draining" : "stabilize"} (${lagS}s). This is the platform the post ends on: a general-purpose overload control engine.`);
}

// ---------- component ----------
export default function DropBudget() {
  const [phase, setPhase] = useState("quota");
  const [scenario, setScenario] = useState("baseline");
  const [byos, setByos] = useState(false);
  const [, force] = useState(0);
  const w = useRef(null); // sim world

  const freshWorld = () => ({
    t: 0,
    rng: mulberry32(42),
    queue: 0,                 // backlog, requests
    dropped: { t1: 0, t3: 0, t5: 0 },  // cumulative counts
    offeredCum: { t1: 0, t3: 0, t5: 0 },
    acceptedCum: { t1: 0, t3: 0, t5: 0 },
    lag: 0,
    lagPrev: 0,
    shedHist: [],             // rps shed per tick (for the trace)
    pidShed: 0,               // smoothed shed rate (phase 3)
    retries: [],              // [{at, tier, n}]
    quotaWindowStart: 0,
    quotaUsed: { t1: 0, t3: 0, t5: 0 },
  });
  if (!w.current) w.current = freshWorld();

  const resetWorld = () => { w.current = freshWorld(); };

  const pickPhase = (p) => { setPhase(p); if (p !== "cinnamon") setByos(false); resetWorld(); };
  const pickScenario = (s) => { setScenario(s); resetWorld(); };
  const toggleByos = () => { setByos((b) => !b); resetWorld(); };

  useEffect(() => {
    const id = setInterval(() => {
      const W = w.current;
      W.t += DT;

      // --- arrivals this tick (requests) ---
      const offered = offeredFor(scenario);
      const arr = {};
      for (const k of ["t1", "t3", "t5"]) {
        const jitter = 0.9 + W.rng() * 0.2;
        arr[k] = offered[k] * jitter * DT;
      }
      // due retries re-arrive
      if (scenario === "retry") {
        const due = W.retries.filter((r) => r.at <= W.t);
        W.retries = W.retries.filter((r) => r.at > W.t);
        for (const r of due) arr[r.tier] += r.n;
      }
      for (const k of ["t1", "t3", "t5"]) W.offeredCum[k] += arr[k];

      // --- phase admission logic ---
      const acc = { ...arr };
      const shed = { t1: 0, t3: 0, t5: 0 };
      const doShed = (tier, n) => { n = Math.min(n, acc[tier]); acc[tier] -= n; shed[tier] += n; };

      if (phase === "quota") {
        // static per-tier quotas per 1s window; t5's metered cost is HALF its real load
        if (W.t - W.quotaWindowStart >= 1) { W.quotaWindowStart = W.t; W.quotaUsed = { t1: 0, t3: 0, t5: 0 }; }
        const QUOTA = { t1: 50, t3: 40, t5: 60 };       // metered units
        const METER = { t1: 1, t3: 1, t5: 0.5 };         // cost-model imprecision
        for (const k of ["t1", "t3", "t5"]) {
          const metered = arr[k] * METER[k];
          const room = Math.max(0, QUOTA[k] * DT * 10 - W.quotaUsed[k]); // quota per window
          const admitMetered = Math.min(metered, room);
          W.quotaUsed[k] += admitMetered;
          const admit = admitMetered / METER[k];
          doShed(k, arr[k] - admit);
        }
      } else if (phase === "codel") {
        // scorecard: cap the noisy tenant's slice of t3 at 25 rps equivalent
        if (scenario === "noisy") {
          const noisyArr = 70 * DT * (arr.t3 / (85 * DT)); // noisy share of this tick's t3
          const capPerTick = 25 * DT;
          if (noisyArr > capPerTick) doShed("t3", noisyArr - capPerTick);
        }
        // codel: queue absorbs; when queue delay exceeds target, bulk-shed the excess (tier-blind)
        const inflow = acc.t1 + acc.t3 + acc.t5;
        W.queue += inflow - CAPACITY * DT;
        if (W.queue < 0) W.queue = 0;
        const delay = W.queue / CAPACITY;
        if (delay > 0.06) {
          // hammer: shed the whole backlog above target at once, proportional to arrival mix
          let excess = W.queue - 0.02 * CAPACITY;
          W.queue -= excess;
          const tot = acc.t1 + acc.t3 + acc.t5 || 1;
          for (const k of ["t1", "t3", "t5"]) {
            const cut = excess * (acc[k] / tot);
            shed[k] += cut; // shed from backlog attributed by mix
          }
        }
      } else {
        // cinnamon: PID-smoothed shed rate, taken strictly bottom-up (t5 -> t3 -> t1)
        // scorecard carried forward:
        if (scenario === "noisy") {
          const noisyArr = 70 * DT * (arr.t3 / (85 * DT));
          const capPerTick = 25 * DT;
          if (noisyArr > capPerTick) doShed("t3", noisyArr - capPerTick);
        }
        const inflow = (acc.t1 + acc.t3 + acc.t5) / DT; // rps after scorecard
        let target = Math.max(0, inflow - CAPACITY * 0.95);
        if (scenario === "lag" && byos) target = Math.max(target, inflow - FOLLOWER_CAP);
        W.pidShed += 0.18 * (target - W.pidShed);         // the dimmer
        let toShed = Math.max(0, W.pidShed) * DT;
        for (const k of ["t5", "t3", "t1"]) { const cut = Math.min(toShed, acc[k]); doShed(k, cut); toShed -= cut; }
        // small queue dynamics for latency realism
        W.queue += (acc.t1 + acc.t3 + acc.t5) - CAPACITY * DT;
        if (W.queue < 0) W.queue = 0;
      }

      // phase 1 has no node-side relief: backlog grows when admitted > capacity
      if (phase === "quota") {
        W.queue += (acc.t1 + acc.t3 + acc.t5) - CAPACITY * DT;
        if (W.queue < 0) W.queue = 0;
        W.queue = Math.min(W.queue, CAPACITY * 3.07); // saturate at the sourced 3.1s anchor
      }

      // retries: 80% of shed comes back 1.5s later (retry scenario only)
      if (scenario === "retry") {
        for (const k of ["t1", "t3", "t5"]) {
          if (shed[k] > 0.001) W.retries.push({ at: W.t + 1.5, tier: k, n: shed[k] * 0.8 });
        }
      }

      // follower lag (lag scenario): grows when accepted rate exceeds follower capacity
      if (scenario === "lag") {
        const accRate = (acc.t1 + acc.t3 + acc.t5) / DT;
        W.lagPrev = W.lag;
        W.lag += Math.max(0, accRate - FOLLOWER_CAP) * DT * 0.02;
        if (accRate < FOLLOWER_CAP) W.lag = Math.max(0, W.lag - (FOLLOWER_CAP - accRate) * DT * 0.01);
      }

      for (const k of ["t1", "t3", "t5"]) { W.dropped[k] += shed[k]; W.acceptedCum[k] += acc[k]; }
      const shedRate = (shed.t1 + shed.t3 + shed.t5) / DT;
      W.shedHist.push(shedRate);
      if (W.shedHist.length > 120) W.shedHist.shift();

      force((x) => x + 1);
    }, 100);
    return () => clearInterval(id);
  }, [phase, scenario, byos]);

  // ---------- derived display values ----------
  const W = w.current;
  const offered = offeredFor(scenario);
  const latMs = Math.min(3100, 30 + (W.queue / CAPACITY) * 1000);
  const t1Avail = W.offeredCum.t1 > 0.5 ? Math.round((W.acceptedCum.t1 / W.offeredCum.t1) * 100) : 100;
  const lagS = W.lag.toFixed(1);
  const lagTrend = W.lag - W.lagPrev;
  const droppedTotal = W.dropped.t1 + W.dropped.t3 + W.dropped.t5;
  const v = verdictOf(phase, scenario, byos, { t1Avail, latMs, lagS, lagTrend });
  const sevColor = v.sev === "ok" ? GREEN : v.sev === "mixed" ? AMBER : RED;
  const offeredTotal = offered.t1 + offered.t3 + offered.t5;
  const maxShed = Math.max(10, ...W.shedHist);

  // ---------- styles ----------
  const mono = "'JetBrains Mono','Fira Code','SF Mono',ui-monospace,monospace";
  const S = {
    root: { background: "#08090D", color: "#c8cdd8", fontFamily: mono, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid #2a2a3a", fontSize: 12, lineHeight: 1.5 },
    eyebrow: { color: ACCENT, fontSize: 10, letterSpacing: 2 },
    h1: { color: "#edeff3", fontSize: 16, margin: "4px 0 2px", fontWeight: 700 },
    sub: { color: "#8b90a0", fontSize: 11, margin: 0 },
    panel: { background: "#111118", border: "1px solid #2a2a3a", borderRadius: 8, padding: 12 },
    label: { color: "#6b7080", fontSize: 10, letterSpacing: 1.2 },
    btn: (on, disabled) => ({
      display: "block", width: "100%", textAlign: "left", padding: "7px 9px", marginTop: 6, borderRadius: 6,
      cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1,
      border: `1px solid ${on ? ACCENT : "#2a2a3a"}`, color: on ? "#ffd7b0" : "#8b90a0",
      background: on ? "rgba(249,115,22,0.08)" : "#0c0d13", fontFamily: mono, fontSize: 11,
    }),
    bar: { height: 10, borderRadius: 5, background: "#1a1b24", overflow: "hidden", display: "flex" },
  };

  const TierBar = ({ values, denom, height = 10 }) => (
    <div style={{ ...S.bar, height }}>
      {["t1", "t3", "t5"].map((k) => (
        <div key={k} style={{ width: `${(values[k] / denom) * 100}%`, background: TIER_META[k].color, transition: "width 200ms" }} />
      ))}
    </div>
  );

  return (
    <div style={S.root}>
      <div style={S.eyebrow}>UBER · INTELLIGENT LOAD MANAGEMENT — INTERACTIVE</div>
      <div style={S.h1}>The drop budget</div>
      <p style={S.sub}>One storage node, three generations of overload control, four ways to hurt it. The question each generation answers differently: when you must drop work — whose?</p>

      <ContextBlock />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
        {/* left: controls */}
        <div style={{ ...S.panel, flex: "1 1 250px", minWidth: 250 }}>
          <div style={S.label}>GENERATION</div>
          {PHASES.map((p) => (
            <button key={p.id} style={S.btn(phase === p.id, false)} onClick={() => pickPhase(p.id)}>{p.label}</button>
          ))}
          {phase === "cinnamon" && (
            <button style={S.btn(byos, false)} onClick={toggleByos}>
              BYOS — BRING YOUR OWN SIGNAL: {byos ? "ON" : "OFF"}
              <div style={{ color: "#6b7080", fontSize: 10 }}>plug distributed signals (follower commit lag) into the same loop</div>
            </button>
          )}

          <div style={{ ...S.label, marginTop: 14 }}>SCENARIO</div>
          {SCENARIOS.map((sc) => (
            <button key={sc.id} style={S.btn(scenario === sc.id, false)} onClick={() => pickScenario(sc.id)}>
              {sc.label}
              <div style={{ color: "#6b7080", fontSize: 10 }}>{sc.hint}</div>
            </button>
          ))}
          <button style={{ ...S.btn(false, false), marginTop: 14 }} onClick={resetWorld}>↺ RESET RUN · t = {W.t.toFixed(1)}s</button>
        </div>

        {/* right: verdict + node */}
        <div style={{ flex: "2 1 400px", minWidth: 300 }}>
          <div style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${sevColor}`, background: `${sevColor}14`, marginBottom: 12 }}>
            <div style={{ color: sevColor, fontWeight: 700 }}>{v.code}</div>
            <div style={{ color: "#c8cdd8", marginTop: 6, fontSize: 11.5, lineHeight: 1.6 }}>{v.text}</div>
          </div>

          <div style={S.panel}>
            <div style={S.label}>{PHASES.find((p) => p.id === phase).caption}</div>

            {/* offered vs capacity */}
            <div style={{ marginTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#8b90a0", marginBottom: 4 }}>
                <span>OFFERED {Math.round(offeredTotal)} rps {scenario === "retry" ? "+ retries" : ""}</span>
                <span>capacity {CAPACITY} rps</span>
              </div>
              <TierBar values={offered} denom={Math.max(offeredTotal, CAPACITY) * 1.15} />
            </div>

            {/* node state */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              <div style={{ flex: "1 1 130px", background: "#0c0d13", border: "1px solid #2a2a3a", borderRadius: 6, padding: "8px 10px" }}>
                <div style={{ fontSize: 9, letterSpacing: 1.5, color: "#6b7080" }}>NODE P99</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: latMs > 900 ? RED : latMs > 200 ? AMBER : GREEN }}>
                  {latMs >= 1000 ? (latMs / 1000).toFixed(1) + "s" : Math.round(latMs) + "ms"}
                </div>
              </div>
              <div style={{ flex: "1 1 130px", background: "#0c0d13", border: "1px solid #2a2a3a", borderRadius: 6, padding: "8px 10px" }}>
                <div style={{ fontSize: 9, letterSpacing: 1.5, color: "#6b7080" }}>T1 AVAILABILITY</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: t1Avail > 98 ? GREEN : t1Avail > 85 ? AMBER : RED }}>{t1Avail}%</div>
              </div>
              {scenario === "lag" && (
                <div style={{ flex: "1 1 130px", background: "#0c0d13", border: "1px solid #2a2a3a", borderRadius: 6, padding: "8px 10px" }}>
                  <div style={{ fontSize: 9, letterSpacing: 1.5, color: "#6b7080" }}>COMMIT INDEX LAG</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: lagTrend > 0.01 ? RED : W.lag > 0.5 ? AMBER : GREEN }}>
                    {lagS}s {lagTrend > 0.01 ? "▲" : lagTrend < -0.005 ? "▼" : ""}
                  </div>
                </div>
              )}
            </div>

            {/* the drop budget — cumulative shed composition */}
            <div style={{ marginTop: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#8b90a0", marginBottom: 4 }}>
                <span>THE DROP BUDGET — WHO GOT SHED THIS RUN</span>
                <span>{Math.round(droppedTotal)} requests</span>
              </div>
              {droppedTotal > 1 ? (
                <>
                  <TierBar values={W.dropped} denom={droppedTotal} height={14} />
                  <div style={{ display: "flex", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
                    {["t1", "t3", "t5"].map((k) => (
                      <span key={k} style={{ fontSize: 10, color: TIER_META[k].color }}>
                        ■ {TIER_META[k].label}: {Math.round(W.dropped[k])} dropped
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 10.5, color: "#6b7080" }}>nothing shed yet</div>
              )}
            </div>

            {/* shed trace: hammer vs dimmer */}
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 10, color: "#8b90a0", marginBottom: 4 }}>SHED TRACE (last 12s) — the hammer sheds in bursts; the dimmer sheds a steady trickle</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 1, height: 36, background: "#0c0d13", border: "1px solid #2a2a3a", borderRadius: 6, padding: "4px 6px" }}>
                {W.shedHist.map((h, i) => (
                  <div key={i} style={{ flex: 1, height: `${Math.min(100, (h / maxShed) * 100)}%`, background: h > 0.5 ? ACCENT : "#1a1b24", borderRadius: 1 }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ color: "#6b7080", fontSize: 10, marginTop: 12, borderTop: "1px solid #2a2a3a", paddingTop: 8, lineHeight: 1.7 }}>
        Rates, quotas, tier mix (three tiers shown of six), PID gains, and the follower apply rate are illustrative. The sourced mechanisms: capacity-unit quotas with usage in central Redis and an imprecise cost model (a scan returning one row meters like a point read); CoDel shedding on queue wait time with adaptive LIFO, plus Scorecard's per-tenant concurrency caps and node-local regulators (write bytes, hot partition keys, memory, goroutines — named here, not simulated); Cinnamon's t0–t5 tiers shedding lowest-first, P90-adaptive queue timeouts, an Auto Tuner on inflight limits, and PID control — the post's hammer-vs-dimmer contrast; BYOS folding distributed signals like follower commit index lag into one admission loop, replacing external token-bucket limiters that split-brained. Measured results: +80% throughput under overload, P99 3.1s→1.0s, ~93% fewer goroutines, ~60% lower heap.
        {" "}
        <a href="https://behindscale.com/articles/uber-intelligent-load-management" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: "none" }}>From the full dissection at behindscale.com →</a>
      </div>
    </div>
  );
}

function ContextBlock() {
  const [open, setOpen] = useState(true);
  const lbl = { fontSize: 10, color: "#f97316", letterSpacing: 1.2 };
  if (!open) return (
    <button onClick={() => setOpen(true)} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontFamily: "inherit", fontSize: 10, padding: 0, margin: "10px 0 0", display: "block" }}>SHOW CONTEXT ▾</button>
  );
  return (
    <div style={{ background: "#111118", border: "1px solid #2a2a3a", borderRadius: 8, padding: "12px 14px", marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <div style={{ fontSize: 10, color: "#6b7080", letterSpacing: 1.2 }}>CONTEXT — IF YOU ARRIVED HERE WITHOUT THE ARTICLE</div>
        <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontFamily: "inherit", fontSize: 10, padding: 0 }}>HIDE ✕</button>
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 8 }}><span style={lbl}>THE PROBLEM · </span>At tens of millions of requests per second, overload is routine and self-amplifying — timeouts feed retries, and one noisy tenant degrades every neighbor. Static quotas at the stateless layer could not see storage health, and shedding that treats all traffic equally spends the drop budget on rides and payments to protect batch jobs.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>THE MOVE · </span>Move the decision into the storage engine and give it judgment: Cinnamon sheds by priority tier (t0-t5) with a PID controller walking the rejection threshold against measured latency, and any overload signal can plug into the same loop.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>TRY · </span>Pick a failure, then walk it through all three generations. Watch the drop budget — who each generation sheds — the shed trace turn from hammer to dimmer, and the one failure only BYOS can see.</div>
    </div>
  );
}
