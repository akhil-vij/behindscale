import { useState, useEffect, useRef } from "react";

const sections = [
  { id: "evolution", label: "Evolution" },
  { id: "codel", label: "CoDel" },
  { id: "cinnamon", label: "Cinnamon" },
  { id: "pid", label: "PID Sim" },
  { id: "byos", label: "BYOS" },
];

const phases = [
  {
    id: "phase1",
    label: "Phase 1",
    title: "Quota-based rate limiting",
    where: "Stateless query engine",
    verdict: "Failed",
    verdictColor: "#ef4444",
    color: "#ef4444",
    icon: "✕",
    desc: "Assign capacity-unit cost per request, track usage in Redis, reject at quota.",
    problems: [
      "Every request needed a Redis call — new point of failure plus latency",
      "Cost model was broken: full table scan = same cost as single row read",
      "Stateless layer couldn't track health of 1000s of storage partitions",
      "Static quotas required constant manual tuning",
    ],
    insight: "Overload management must live close to the storage nodes, not the routing layer.",
  },
  {
    id: "phase2",
    label: "Phase 2",
    title: "CoDel + Scorecard + Regulators",
    where: "Storage engine",
    verdict: "Foundation",
    verdictColor: "#eab308",
    color: "#eab308",
    icon: "○",
    desc: "CoDel queues (wait-time based shedding, LIFO under pressure), Scorecard (per-tenant concurrency), Regulators (write bytes, hot keys, memory).",
    problems: [
      "Priority-blind — shed critical traffic and batch jobs equally",
      "Static thresholds caused thundering herd on mass rejection",
      "Fixed wait times produced overload → reject all → retry storm cycles",
    ],
    insight: "Stability improved but lacks nuance. Need priority awareness and dynamic adaptation.",
  },
  {
    id: "phase3",
    label: "Phase 3",
    title: "Cinnamon — unified load manager",
    where: "Storage engine",
    verdict: "Production",
    verdictColor: "#22c55e",
    color: "#22c55e",
    icon: "✓",
    desc: "Priority-aware shedding (t0-t5), PID controller for dynamic thresholds, pluggable signals (BYOS), unified decision loop.",
    problems: [],
    insight: "Shed smarter: lowest priority first, adapt dynamically, single control loop for all signals.",
  },
];

const tiers = [
  { tier: "t0", desc: "Critical infrastructure services", color: "#ef4444", shed: "Last (almost never)" },
  { tier: "t1", desc: "User-facing: rides, pricing, payments", color: "#f97316", shed: "Only under extreme overload" },
  { tier: "t2", desc: "Important but deferrable", color: "#eab308", shed: "When system is stressed" },
  { tier: "t3-t5", desc: "Async jobs, pipelines, aggregators", color: "#666", shed: "First to go" },
];

const signals = [
  {
    name: "Inflight concurrency",
    type: "Local",
    icon: "🔢",
    color: "#3b82f6",
    what: "Number of requests currently being processed on this node.",
    example: "A batch job sends 500 concurrent requests to a single partition. Concurrency spikes from 60 to 500. PID tightens limit, batch (t4) requests shed, ride queries (t1) sail through.",
  },
  {
    name: "Follower commit lag",
    type: "Remote",
    icon: "📡",
    color: "#a78bfa",
    what: "How far behind follower replicas are from the leader in Raft replication.",
    example: "Lag rises to 30 seconds. Before BYOS: external limiter fights internal load manager (split-brain). After BYOS: single PID loop reduces write limit gradually, lag stabilizes, no oscillation.",
  },
  {
    name: "Write bytes volume",
    type: "I/O",
    icon: "💾",
    color: "#f97316",
    what: "Total bytes being written concurrently to disk.",
    example: "Migration job sends 50 bulk inserts of 5MB each. QPS only 50, concurrency limit unhit. But disk I/O pegged. Write bytes regulator throttles the migration specifically.",
  },
  {
    name: "Hot partition key",
    type: "Skew",
    icon: "🔥",
    color: "#ef4444",
    what: "Traffic concentrated on a single partition key within a shard.",
    example: "Viral moment: 10,000 reads/sec on one user's row. Partition key regulator caps traffic to that specific key at 2,000/sec, protecting the shard for all other users.",
  },
  {
    name: "Memory pressure",
    type: "Resource",
    icon: "🧠",
    color: "#eab308",
    what: "Available process memory on the storage node.",
    example: "Scan query buffers a 2GB result set. Free heap drops from 4GB to 500MB. Memory regulator triggers and rejects new requests until memory stabilizes.",
  },
  {
    name: "Goroutine count",
    type: "Resource",
    icon: "⚙️",
    color: "#06b6d4",
    what: "Total goroutines in the process.",
    example: "Overload spikes goroutines from 5K to 150K. Scheduler overhead alone adds 50ms latency. Regulator caps admission, stabilizes at 10K.",
  },
];

function CoDelDeepDive() {
  const [mode, setMode] = useState("normal");
  const items = mode === "normal"
    ? [
        { id: 1, age: "1ms", status: "process", label: "Oldest → process first (FIFO)" },
        { id: 2, age: "0.8ms", status: "process" },
        { id: 3, age: "0.5ms", status: "process" },
        { id: 4, age: "0.2ms", status: "process" },
      ]
    : [
        { id: 1, age: "120ms", status: "drop", label: "Oldest → stale, client likely timed out" },
        { id: 2, age: "95ms", status: "drop" },
        { id: 3, age: "60ms", status: "drop" },
        { id: 4, age: "8ms", status: "process", label: "Newest → still fresh, process first (LIFO)" },
        { id: 5, age: "3ms", status: "process" },
        { id: 6, age: "1ms", status: "process" },
      ];

  return (
    <div>
      <p style={{ fontSize: 12, color: "#c0c0cc", lineHeight: 1.7, marginBottom: 12 }}>
        CoDel uses <strong style={{ color: "#f0f0f5" }}>queue wait time</strong>, not queue length. Under pressure, it flips from FIFO to LIFO.
      </p>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {["normal", "overload"].map((m) => (
          <button key={m} onClick={() => setMode(m)} style={{
            padding: "6px 12px", fontSize: 11, fontFamily: "inherit",
            border: `1px solid ${mode === m ? (m === "normal" ? "#22c55e" : "#ef4444") : "#2a2a3a"}`,
            borderRadius: 5,
            background: mode === m ? (m === "normal" ? "#22c55e18" : "#ef444418") : "transparent",
            color: mode === m ? (m === "normal" ? "#22c55e" : "#ef4444") : "#666",
            cursor: "pointer",
          }}>
            {m === "normal" ? "🟢 Normal" : "🔴 Overload"}
          </button>
        ))}
      </div>
      <div style={{
        background: mode === "normal" ? "#0a2a1a" : "#3a1a1a",
        border: `1px solid ${mode === "normal" ? "#22c55e" : "#ef4444"}`,
        borderRadius: 8, padding: "12px 14px",
      }}>
        <div style={{ fontSize: 10, color: mode === "normal" ? "#22c55e" : "#ef4444", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10, fontWeight: 600 }}>
          {mode === "normal" ? "FIFO mode — process oldest first" : "LIFO mode — process newest, drop stale"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {items.map((item) => (
            <div key={item.id} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: 5,
              background: item.status === "drop" ? "#ef444418" : "#22c55e18",
              border: `1px solid ${item.status === "drop" ? "#ef4444" : "#22c55e"}25`,
            }}>
              <span style={{
                fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 3,
                background: item.status === "drop" ? "#ef4444" : "#22c55e", color: "#fff",
              }}>
                {item.status === "drop" ? "DROP" : "PROC"}
              </span>
              <span style={{ fontSize: 11, color: "#888", minWidth: 50 }}>age: {item.age}</span>
              {item.label && <span style={{ fontSize: 11, color: "#c0c0cc", fontStyle: "italic" }}>{item.label}</span>}
            </div>
          ))}
        </div>
      </div>
      <div style={{
        marginTop: 12, padding: "12px 14px",
        background: "#111118", borderRadius: 6, borderLeft: "3px solid #eab308",
      }}>
        <div style={{ fontSize: 10, color: "#eab308", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6, fontWeight: 600 }}>
          Why LIFO under overload?
        </div>
        <p style={{ fontSize: 11.5, color: "#c0c0cc", margin: 0, lineHeight: 1.7 }}>
          Old requests have likely timed out on the client side. Processing them wastes resources on work the caller already retried. Fresh requests still have a chance to succeed.
        </p>
      </div>
    </div>
  );
}

function CinnamonView() {
  const [step, setStep] = useState(0);
  const scenarios = [
    { title: "Step 1: Traffic arrives", desc: "120 requests hit a node with capacity for 100. Cinnamon classifies them by priority tier." },
    { title: "Step 2: PID calculates new limit", desc: "P90 latency at 25ms vs 10ms target. PID outputs: reduce concurrency limit to 80. Gradual, not 'reject all'." },
    { title: "Step 3: Priority-aware shedding", desc: "Need 120 → 80. Cinnamon sheds from the bottom: 40 of 50 t4 analytics requests dropped. All t1 ride queries and t2 search updates pass through." },
    { title: "Step 4: If pressure rises", desc: "If 80 isn't enough, PID tightens further. Remaining t4s go first, then t2 search updates start shedding. t1 ride pricing is the absolute last to be touched." },
    { title: "Step 5: Gradual recovery", desc: "As load decreases, PID smoothly opens limit back: 80 → 82 → 85 → 90 → 95 → 100. NOT a sudden jump (which would cause a new spike)." },
  ];
  const current = scenarios[step];
  const breakdown = [
    { tier: "t1", label: "Ride pricing queries", count: 30, color: "#ef4444" },
    { tier: "t2", label: "Search ranking updates", count: 40, color: "#f97316" },
    { tier: "t4", label: "Async analytics", count: 50, color: "#666" },
  ];

  return (
    <div>
      <p style={{ fontSize: 12, color: "#c0c0cc", lineHeight: 1.7, marginBottom: 12 }}>
        Concrete overload scenario, step by step. This is what makes Cinnamon "intelligent".
      </p>
      <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
        {scenarios.map((_, i) => (
          <button key={i} onClick={() => setStep(i)} style={{
            padding: "5px 10px", fontSize: 10, fontFamily: "inherit",
            border: `1px solid ${step === i ? "#f97316" : "#2a2a3a"}`,
            borderRadius: 4,
            background: step === i ? "#f9731618" : "transparent",
            color: step === i ? "#f97316" : "#666",
            cursor: "pointer",
          }}>
            {i + 1}
          </button>
        ))}
      </div>
      <div style={{
        background: "#111118",
        border: "1px solid #f9731640",
        borderRadius: 8,
        padding: "14px 16px",
      }}>
        <div style={{ fontSize: 10, color: "#f97316", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6, fontWeight: 600 }}>
          {current.title}
        </div>
        <p style={{ fontSize: 11.5, color: "#c0c0cc", margin: "0 0 12px 0", lineHeight: 1.7 }}>{current.desc}</p>
        <div style={{ background: "#08090D", borderRadius: 6, padding: "12px 14px" }}>
          <div style={{ fontSize: 9, color: "#666", letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>
            Traffic — 120 incoming, limit {step >= 2 ? 80 : 100}
          </div>
          {breakdown.map((t) => {
            let shed = 0, passed = t.count;
            if (step >= 2 && t.tier === "t4") { shed = 40; passed = 10; }
            if (step >= 3 && t.tier === "t4") { shed = 50; passed = 0; }
            if (step >= 3 && t.tier === "t2") { shed = 15; passed = 25; }
            if (step === 4) { shed = 0; passed = t.count; }
            const passedPct = (passed / t.count) * 100;
            return (
              <div key={t.tier} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: t.color, minWidth: 22 }}>{t.tier}</span>
                    <span style={{ fontSize: 10.5, color: "#c0c0cc" }}>{t.label}</span>
                  </div>
                  <div style={{ fontSize: 9.5, color: shed > 0 ? "#ef4444" : "#22c55e" }}>
                    {shed > 0 ? `${shed} shed / ${passed} pass` : `${passed} pass`}
                  </div>
                </div>
                <div style={{ height: 6, background: "#1a1a2a", borderRadius: 3, overflow: "hidden", display: "flex" }}>
                  <div style={{ width: `${passedPct}%`, background: t.color, transition: "width 0.4s ease" }} />
                  {shed > 0 && <div style={{ width: `${100 - passedPct}%`, background: "#ef444460", transition: "width 0.4s ease" }} />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{
        marginTop: 12, padding: "10px 12px",
        background: "#22c55e18",
        borderRadius: 6,
        border: "1px solid #22c55e30",
      }}>
        <div style={{ fontSize: 10, color: "#22c55e", fontWeight: 700, marginBottom: 4 }}>Cinnamon vs CoDel here:</div>
        <div style={{ fontSize: 11, color: "#c0c0cc", lineHeight: 1.5 }}>
          CoDel would drop 20 random requests regardless of type. Cinnamon drops 40 analytics jobs while all 30 ride queries + 40 search updates pass through.
        </div>
      </div>
    </div>
  );
}

function PidSim() {
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState([]);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (running) {
      let t = 0, integral = 0, prevError = 0, limit = 100;
      let hist = [];
      const TARGET = 10;
      intervalRef.current = setInterval(() => {
        t++;
        const externalLoad = t < 5 ? 10 : t < 15 ? 10 + (t - 5) * 4 : Math.max(10, 50 - (t - 15) * 3);
        const actualLatency = Math.max(3, externalLoad * (100 / Math.max(limit, 20)) * 0.4 + (Math.random() * 3 - 1.5));
        const error = actualLatency - TARGET;
        integral += error;
        integral = Math.max(-200, Math.min(200, integral));
        const derivative = error - prevError;
        prevError = error;
        const adjustment = 0.5 * error + 0.05 * integral + 0.3 * derivative;
        limit = Math.max(20, Math.min(100, limit - adjustment * 0.5));
        const staticLimit = actualLatency > 15 ? 40 : 100;
        hist.push({ t, latency: Math.round(actualLatency * 10) / 10, pidLimit: Math.round(limit), staticLimit });
        if (hist.length > 40) hist = hist.slice(-40);
        setHistory([...hist]);
        if (t > 50) { clearInterval(intervalRef.current); setRunning(false); }
      }, 300);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const reset = () => { clearInterval(intervalRef.current); setRunning(false); setHistory([]); };
  const maxLatency = Math.max(30, ...history.map((h) => h.latency));
  const chartH = 130;

  return (
    <div>
      <p style={{ fontSize: 12, color: "#c0c0cc", lineHeight: 1.7, marginBottom: 12 }}>
        Live simulation. Traffic spike at t=5, gradual recovery after t=15. Watch how PID adjusts gradually while static thresholds oscillate.
      </p>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={() => { reset(); setTimeout(() => setRunning(true), 100); }} style={{
          padding: "7px 14px", fontSize: 11, fontFamily: "inherit",
          border: "1px solid #06b6d4", borderRadius: 5,
          background: "#06b6d418", color: "#06b6d4", cursor: "pointer",
        }}>▶ Run simulation</button>
        <button onClick={reset} style={{
          padding: "7px 14px", fontSize: 11, fontFamily: "inherit",
          border: "1px solid #2a2a3a", borderRadius: 5,
          background: "transparent", color: "#666", cursor: "pointer",
        }}>Reset</button>
      </div>
      <div style={{
        background: "#111118",
        border: "1px solid #06b6d440",
        borderRadius: 8,
        padding: "14px 16px",
      }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          {[
            { letter: "P", name: "Proportional", q: "How bad now?", color: "#3b82f6" },
            { letter: "I", name: "Integral", q: "How bad overall?", color: "#a78bfa" },
            { letter: "D", name: "Derivative", q: "Getting worse?", color: "#f97316" },
          ].map((p) => (
            <div key={p.letter} style={{
              flex: 1, padding: "8px 6px", background: "#08090D", borderRadius: 5,
              border: `1px solid ${p.color}30`, textAlign: "center",
            }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: p.color }}>{p.letter}</div>
              <div style={{ fontSize: 9, color: "#c0c0cc", fontWeight: 600 }}>{p.name}</div>
              <div style={{ fontSize: 9, color: p.color, marginTop: 2, fontStyle: "italic" }}>{p.q}</div>
            </div>
          ))}
        </div>
        <div style={{ position: "relative", height: chartH, background: "#08090D", borderRadius: 5, overflow: "hidden", padding: 4 }}>
          <div style={{
            position: "absolute", left: 0, right: 0,
            top: `${(1 - 10 / maxLatency) * 100}%`,
            borderTop: "1px dashed #22c55e50",
          }}>
            <span style={{ fontSize: 8, color: "#22c55e", position: "absolute", left: 4, top: -10 }}>target 10ms</span>
          </div>
          {history.length > 1 && (
            <svg width="100%" height="100%" viewBox={`0 0 ${history.length * 10} ${chartH}`} preserveAspectRatio="none" style={{ position: "absolute", top: 0, left: 0 }}>
              <polyline fill="none" stroke="#06b6d4" strokeWidth="2"
                points={history.map((h, i) => `${i * 10},${chartH - (h.latency / maxLatency) * chartH}`).join(" ")} />
              <polyline fill="none" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="4,3"
                points={history.map((h, i) => `${i * 10},${chartH - (h.pidLimit / 100) * chartH}`).join(" ")} />
              <polyline fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="2,4"
                points={history.map((h, i) => `${i * 10},${chartH - (h.staticLimit / 100) * chartH}`).join(" ")} />
            </svg>
          )}
          {history.length === 0 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#666", fontSize: 11 }}>
              Press "Run simulation" to start
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 6, justifyContent: "center" }}>
          <span style={{ fontSize: 9.5, color: "#06b6d4" }}>━ Actual latency</span>
          <span style={{ fontSize: 9.5, color: "#22c55e" }}>╌ PID limit</span>
          <span style={{ fontSize: 9.5, color: "#ef4444" }}>╌ Static limit</span>
        </div>
      </div>
      <div style={{
        marginTop: 12, padding: "10px 12px",
        background: "#111118", borderRadius: 5, borderLeft: "3px solid #06b6d4",
      }}>
        <div style={{ fontSize: 10, color: "#06b6d4", letterSpacing: 2, textTransform: "uppercase", marginBottom: 4, fontWeight: 600 }}>
          Why PID prevents thundering herd
        </div>
        <p style={{ fontSize: 11, color: "#c0c0cc", margin: 0, lineHeight: 1.7 }}>
          Static: latency crosses threshold → reject everything → retry storm → oscillation. PID: latency rises → limit decreases gradually → fewer requests shed each cycle → smooth curve, no mass retry storm.
        </p>
      </div>
    </div>
  );
}

function ByosView() {
  const [selected, setSelected] = useState(0);
  const sig = signals[selected];
  return (
    <div>
      <p style={{ fontSize: 12, color: "#c0c0cc", lineHeight: 1.7, marginBottom: 12 }}>
        <strong style={{ color: "#f0f0f5" }}>Bring Your Own Signal</strong> — Cinnamon is a platform, not a point solution. Any overload signal plugs into the same PID decision loop.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
        {signals.map((s, i) => (
          <button key={s.name} onClick={() => setSelected(i)} style={{
            padding: "5px 9px", fontSize: 10, fontFamily: "inherit",
            border: `1px solid ${selected === i ? s.color : "#2a2a3a"}`,
            borderRadius: 4,
            background: selected === i ? `${s.color}18` : "transparent",
            color: selected === i ? s.color : "#666",
            cursor: "pointer",
          }}>
            {s.icon} {s.name}
          </button>
        ))}
      </div>
      <div style={{
        background: "#111118",
        border: `1px solid ${sig.color}40`,
        borderRadius: 8,
        padding: "14px 16px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 18 }}>{sig.icon}</span>
          <div>
            <div style={{ fontSize: 13, color: "#f0f0f5", fontWeight: 600 }}>{sig.name}</div>
            <div style={{ fontSize: 9, color: sig.color, letterSpacing: 1.5, textTransform: "uppercase" }}>{sig.type}</div>
          </div>
        </div>
        <div style={{ fontSize: 11.5, color: "#c0c0cc", lineHeight: 1.7, marginBottom: 10 }}>{sig.what}</div>
        <div style={{ padding: "10px 12px", background: "#08090D", borderRadius: 5, border: `1px solid ${sig.color}25` }}>
          <div style={{ fontSize: 9, color: "#eab308", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4, fontWeight: 600 }}>Concrete example</div>
          <div style={{ fontSize: 11, color: "#c0c0cc", lineHeight: 1.7 }}>{sig.example}</div>
        </div>
      </div>
      <div style={{
        marginTop: 12, padding: "10px 12px",
        background: "#22c55e18",
        borderRadius: 6,
        border: "1px solid #22c55e30",
      }}>
        <div style={{ fontSize: 10, color: "#22c55e", letterSpacing: 2, textTransform: "uppercase", marginBottom: 4, fontWeight: 600 }}>
          One brain, not N rate limiters
        </div>
        <div style={{ fontSize: 11, color: "#c0c0cc", lineHeight: 1.7 }}>
          Before BYOS, each signal had its own rate limiter making independent decisions — a commit-lag limiter might throttle while the concurrency controller tries to let through (split-brain). With BYOS, all signals feed one PID loop. The controller sees the full picture and makes one coherent decision.
        </div>
      </div>
    </div>
  );
}

export default function UberLoadManagement() {
  const [section, setSection] = useState("evolution");
  const [expanded, setExpanded] = useState(null);

  return (
    <div style={{
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      background: "#08090D",
      color: "#C8CDD8",
      minHeight: "100vh",
      padding: "20px 16px",
      boxSizing: "border-box",
    }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, letterSpacing: 4, color: "#f97316", marginBottom: 6, textTransform: "uppercase" }}>
            Uber · Distributed Databases
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#f0f0f5", margin: 0, lineHeight: 1.3 }}>
            From Static Rate Limiting to Intelligent Load Management
          </h1>
          <p style={{ fontSize: 12, color: "#888", marginTop: 6, lineHeight: 1.6 }}>
            Three-phase evolution: quota-based rate limiting failed at the routing layer, CoDel stabilized but lacked nuance, and Cinnamon brings priority-aware shedding with PID-controlled dynamic thresholds.
          </p>
        </div>

        <div style={{ display: "flex", gap: 4, marginBottom: 18, flexWrap: "wrap" }}>
          {sections.map((s) => (
            <button key={s.id} onClick={() => setSection(s.id)} style={{
              padding: "7px 12px", fontSize: 11, fontFamily: "inherit",
              border: `1px solid ${section === s.id ? "#f97316" : "#2a2a3a"}`,
              borderRadius: 6,
              background: section === s.id ? "#f9731618" : "transparent",
              color: section === s.id ? "#f97316" : "#666",
              cursor: "pointer",
            }}>
              {s.label}
            </button>
          ))}
        </div>

        {section === "evolution" && (
          <div>
            <p style={{ fontSize: 12, color: "#c0c0cc", lineHeight: 1.7, marginBottom: 14 }}>
              Three phases from naive rate limiting to intelligent priority-aware load management. Click each phase to expand.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {phases.map((p) => (
                <div key={p.id}>
                  <div
                    onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                    style={{
                      padding: "12px 14px",
                      background: expanded === p.id ? "#111118" : "#0c0d13",
                      border: `1px solid ${expanded === p.id ? p.color + "60" : "#2a2a3a"}`,
                      borderRadius: expanded === p.id ? "6px 6px 0 0" : 6,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 14, color: p.color }}>{p.icon}</span>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                            <span style={{ fontSize: 9, color: p.color, letterSpacing: 1, textTransform: "uppercase" }}>{p.label}</span>
                            <span style={{
                              fontSize: 8, padding: "1px 5px", background: "#1a1a2a",
                              border: "1px solid #2a2a3a", borderRadius: 2, color: "#999",
                            }}>{p.where}</span>
                          </div>
                          <span style={{ fontSize: 12.5, color: "#f0f0f5", fontWeight: 600 }}>{p.title}</span>
                        </div>
                      </div>
                      <span style={{
                        fontSize: 9, padding: "3px 8px",
                        background: `${p.verdictColor}20`, border: `1px solid ${p.verdictColor}40`,
                        borderRadius: 3, color: p.verdictColor,
                        letterSpacing: 1.5, textTransform: "uppercase",
                      }}>{p.verdict}</span>
                    </div>
                  </div>
                  {expanded === p.id && (
                    <div style={{
                      padding: "12px 14px", background: "#111118",
                      border: `1px solid ${p.color}60`, borderTop: "none",
                      borderRadius: "0 0 6px 6px",
                    }}>
                      <p style={{ fontSize: 11.5, color: "#c0c0cc", margin: "0 0 10px 0", lineHeight: 1.6 }}>{p.desc}</p>
                      {p.problems.length > 0 && (
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 9, color: "#ef4444", letterSpacing: 1, textTransform: "uppercase", marginBottom: 5, fontWeight: 600 }}>Why it wasn't enough</div>
                          {p.problems.map((prob, i) => (
                            <div key={i} style={{ fontSize: 11, color: "#c0c0cc", padding: "2px 0", lineHeight: 1.5 }}>
                              <span style={{ color: "#ef4444", marginRight: 5 }}>✕</span>{prob}
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={{ padding: "8px 12px", background: `${p.color}10`, borderRadius: 5, borderLeft: `3px solid ${p.color}` }}>
                        <span style={{ fontSize: 9, color: p.color, letterSpacing: 1, textTransform: "uppercase", fontWeight: 600 }}>Key insight: </span>
                        <span style={{ fontSize: 11.5, color: "#c0c0cc", lineHeight: 1.6 }}>{p.insight}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: 10, color: "#22c55e", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, fontWeight: 600 }}>Results (Cinnamon vs CoDel)</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[
                  { value: "+80%", unit: "throughput", label: "under overload", color: "#22c55e" },
                  { value: "-70%", unit: "P99 latency", label: "1.0s vs 3.1s", color: "#3b82f6" },
                  { value: "-93%", unit: "goroutines", label: "10K vs 150K", color: "#a78bfa" },
                  { value: "-60%", unit: "heap", label: "1GB vs 5-6GB", color: "#f97316" },
                ].map((m) => (
                  <div key={m.unit} style={{
                    flex: 1, minWidth: 110, textAlign: "center", padding: "8px 6px",
                    background: `${m.color}10`, borderRadius: 5, border: `1px solid ${m.color}20`,
                  }}>
                    <div style={{ fontSize: 17, fontWeight: 800, color: m.color }}>{m.value}</div>
                    <div style={{ fontSize: 9, color: m.color, opacity: 0.8 }}>{m.unit}</div>
                    <div style={{ fontSize: 9, color: "#888", marginTop: 3 }}>{m.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {section === "codel" && <CoDelDeepDive />}

        {section === "cinnamon" && (
          <div>
            <p style={{ fontSize: 12, color: "#c0c0cc", lineHeight: 1.7, marginBottom: 12 }}>
              Cinnamon adds priority tiers (shed lowest first) and PID-controlled dynamic thresholds.
            </p>
            <div style={{
              background: "#111118",
              border: "1px solid #f9731640",
              borderRadius: 8,
              padding: "12px 14px",
              marginBottom: 14,
            }}>
              <div style={{ fontSize: 10, color: "#f97316", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, fontWeight: 600 }}>
                Priority tiers — shed lowest first
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {tiers.map((t) => (
                  <div key={t.tier} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "6px 10px", borderRadius: 4,
                    background: `${t.color}10`, border: `1px solid ${t.color}20`,
                  }}>
                    <span style={{ fontSize: 10.5, fontWeight: 800, color: t.color, minWidth: 36, textTransform: "uppercase" }}>{t.tier}</span>
                    <span style={{ fontSize: 11, color: "#c0c0cc", flex: 1 }}>{t.desc}</span>
                    <span style={{ fontSize: 9.5, color: t.color, fontStyle: "italic", textAlign: "right", minWidth: 110 }}>{t.shed}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 6, textAlign: "center", fontSize: 9.5, color: "#666", letterSpacing: 1 }}>
                ↑ PROTECTED&nbsp;&nbsp;│&nbsp;&nbsp;SHED FIRST ↓
              </div>
            </div>
            <CinnamonView />
          </div>
        )}

        {section === "pid" && <PidSim />}
        {section === "byos" && <ByosView />}
      </div>
    </div>
  );
}
