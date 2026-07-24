import { useState, useEffect } from "react";

const ACCENT = "#EB1700";
const RED = "#ef4444"; const AMBER = "#eab308"; const GREEN = "#22c55e"; const VIOLET = "#9b8cf0";

const BASE = 60; const PEAK = 70;
const initial = () => ({ t: 0, mode: 0, peak: false, countdowns: false, hol: false, nbWorker: false, backlog: 0, churn: 0, latency: 0, flow: false, outage: false, partDelay: 0, rebal: 0, kWorkers: 4, bounces: 0 });

// modes: 0 rabbitmq · 1 rabbitmq+HA · 2 kafka MVP
function step(w) {
  const n = { ...w };
  n.t++;
  const inflow = BASE + (n.peak ? PEAK : 0) + (n.countdowns && n.mode < 2 ? 25 : 0) + n.churn * 0.5;
  if (n.mode < 2) {
    const baseCap = n.mode === 1 ? 70 : 100; // HA replication tax
    n.flow = inflow > baseCap * 0.8;
    const cap = n.flow ? baseCap * 0.85 : baseCap; // degraded consumption under pressure
    if (n.flow) n.latency = Math.min(60, n.latency + 6); else n.latency = Math.max(0, n.latency - 8);
    if (n.latency > 25) n.churn = Math.min(80, n.churn + 15); // harakiri kills → reconnection churn
    else n.churn = Math.max(0, n.churn - 10);
    n.backlog = Math.max(0, n.backlog + inflow - cap);
    if (n.backlog > 700) n.outage = true;
    if (n.outage) n.backlog = Math.max(n.backlog, 700);
  } else {
    const cap = n.kWorkers * 50; // horizontally scalable
    n.flow = false; n.latency = 0; n.churn = 0; n.outage = false;
    const eff = n.rebal > 0 ? 0 : cap; // deploy-triggered rebalance stalls consumption briefly
    if (n.rebal > 0) n.rebal--;
    n.backlog = Math.max(0, n.backlog + inflow - eff);
    if (n.hol) {
      if (n.nbWorker) n.partDelay = Math.min(5, n.partDelay + 1); // one executor stalls; partition flows
      else n.partDelay = Math.min(60, n.partDelay + 5); // partition dammed behind the slow message
    } else n.partDelay = Math.max(0, n.partDelay - 10);
  }
  return n;
}

export default function WhenTheQueuePushesBack() {
  const [w, setW] = useState(initial);
  useEffect(() => { const id = setInterval(() => setW(step), 650); return () => clearInterval(id); }, []);
  const rb = w.mode < 2; const cap = rb ? (w.mode === 1 ? 70 : 100) : w.kWorkers * 50;

  const verdict = (() => {
    if (rb && w.outage) return { c: RED, code: "ORDERS HALTED — BOUNCE AND PRAY", t: `The broker is down under its backlog and task processing is DoorDash: checkout, merchant transmission, Dasher assignment — all stopped. Recovery is a restart, or standing up a fresh broker and manually failing over${w.mode === 1 ? " — and in HA mode, failovers took 20+ minutes, often stuck, losing messages on the way" : ""}. BOUNCE THE BROKER, then find an exit.` };
    if (rb && w.churn > 0) return { c: RED, code: "THE KILLS FEED THE LOAD", t: `Publisher latency crossed harakiri's timeout: uWSGI is killing workers, thousands of restarts are churning connections, and connection churn is itself broker load — inflow is now demand PLUS ${Math.round(w.churn * 0.5)} tps of self-inflicted reconnections. The slowdown is feeding itself; backlog ${Math.round(w.backlog)}.` };
    if (rb && w.flow) return { c: AMBER, code: "THE QUEUE PUSHED BACK", t: `Burst inflow crossed the broker's comfort line and consumption is degraded. Flow Control is throttling the fastest publishers — who experience it as network latency (${w.latency} units and climbing). Latency at peak cascades: requests pile upstream, and above the timeout line, harakiri starts killing.` };
    if (w.mode === 1) return { c: AMBER, code: "HA THAT TAXED THE HEADROOM", t: `Primary-secondary replication cut throughput to ${cap} (from 100) — headroom spent buying an availability that, in practice, delivered 20-plus-minute stuck failovers and lost messages. Push the PEAK at it and watch the outage arrive sooner than single-node.` };
    if (!rb && w.rebal > 0) return { c: AMBER, code: "THE NEW BUFFER HAS NEW PHYSICS", t: "A deploy just triggered partition rebalancing — consumption pauses while assignments settle, several times a day. Tolerable for planned releases; potentially cascading for an emergency hotfix. The wished-for cure: incremental cooperative rebalancing, once the client supports it." };
    if (!rb && w.hol && !w.nbWorker && w.partDelay > 15) return { c: RED, code: "ONE SLOW MESSAGE, ONE STALLED PARTITION", t: `Kafka delivers each partition in order to one consumer — so the slow message at the head has dammed everything behind it (delay ${w.partDelay} and climbing) while other partitions flow. On a high-priority topic this is disastrous. Arm the NON-BLOCKING WORKER.` };
    if (!rb && w.hol && w.nbWorker) return { c: GREEN, code: "ONE SLOW MESSAGE, ONE STALLED EXECUTOR", t: "The fetch process feeds a bounded local queue; multiple executor processes draw from it. The slow message occupies one executor while the partition keeps flowing — and the queue's threshold is an explicit loss budget: everything in flight can vanish in a crash. Uber's proxy answered the same head-of-line with out-of-order acks and a DLQ instead — two prices for the same unblocking." };
    if (!rb && w.peak && w.backlog < 80) return { c: GREEN, code: "EIGHTY PERCENT LEFT IN A WEEK", t: `The same peak that broke RabbitMQ drains flat here: a durable log, ${w.kWorkers} horizontally scaled workers (${cap} tps), no flow control exporting distress upstream, no churn loop. The real migration shipped an MVP in two weeks, moved lowest-risk tasks first, and cut broker load 80% within a week — outages stopped almost immediately. Now try the new buffer's own physics: SLOW MESSAGE and DEPLOY.` };
    if (!rb) return { c: GREEN, code: "A DURABLE LOG UNDERNEATH", t: "Task names and pickled arguments on Kafka; a @task wrapper routing by feature flag so adopting teams changed one line. Push the PEAK at it, then meet head-of-line blocking and rebalance stalls — the pathologies you chose over the ones you escaped." };
    if (w.countdowns) return { c: AMBER, code: "FUTURE WORK PARKED IN THE BROKER", t: "Countdown/ETA tasks hold scheduled-future work inside RabbitMQ — load that precedes some outages directly. The eventual ruling: restrict countdowns, move scheduling to a system built for holding, not passing through." };
    return { c: AMBER, code: "900 TASKS ON ONE BROKER", t: `Order checkout, merchant transmission, Dasher locations — 900+ async tasks ride this queue, inflow ${Math.round(BASE)} tps against ${cap} capacity. Turn on the PEAK BURST and watch what the buffer does with exactly the pressure it exists to absorb.` };
  })();

  const mono = "'JetBrains Mono','Fira Code',ui-monospace,monospace";
  const S = {
    root: { background: "#08090D", color: "#c8cdd8", fontFamily: mono, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid #2a2a3a", fontSize: 12, lineHeight: 1.5 },
    panel: { background: "#111118", border: "1px solid #2a2a3a", borderRadius: 8, padding: 12 },
    label: { color: "#6b7080", fontSize: 10, letterSpacing: 1.2 },
    btn: (on, dis, col) => ({ display: "block", width: "100%", textAlign: "left", padding: "7px 9px", marginTop: 6, borderRadius: 6, cursor: dis ? "not-allowed" : "pointer", opacity: dis ? 0.4 : 1, border: `1px solid ${on ? (col || ACCENT) : "#2a2a3a"}`, color: on ? "#ffb8ad" : "#8b90a0", background: on ? "rgba(235,23,0,0.10)" : "#0c0d13", fontFamily: mono, fontSize: 11 }),
  };
  const bar = (v, max, col) => <div style={{ height: 10, background: "#0c0d13", border: "1px solid #2a2a3a", borderRadius: 4, overflow: "hidden" }}><div style={{ width: Math.min(100, (v / max) * 100) + "%", height: "100%", background: col }} /></div>;
  const M = (m, label, sub, col) => (
    <button key={m} style={S.btn(w.mode === m, false, col)} onClick={() => setW(x => ({ ...initial(), mode: m, peak: x.peak, countdowns: x.countdowns }))}>{label}<div style={{ color: "#6b7080", fontSize: 10 }}>{sub}</div></button>
  );

  return (
    <div style={S.root}>
      <div style={{ color: ACCENT, fontSize: 10, letterSpacing: 2 }}>DOORDASH · ELIMINATING TASK PROCESSING OUTAGES — INTERACTIVE</div>
      <div style={{ color: "#edeff3", fontSize: 16, margin: "4px 0 2px", fontWeight: 700 }}>When the queue pushes back</div>
      <p style={{ color: "#8b90a0", fontSize: 11, margin: 0 }}>You operate the task broker under peak dinner rush. The buffer's job is absorbing pressure; watch what it does with it instead.</p>
      <ContextBlock />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
        <div style={{ ...S.panel, flex: "1 1 250px", minWidth: 250 }}>
          <div style={S.label}>THE BROKER</div>
          {M(0, "RABBITMQ (largest single node)", "vertical ceiling already reached")}
          {M(1, "RABBITMQ + HA MODE", "replication tax · 20-min stuck failovers")}
          {M(2, "KAFKA MVP (the escape)", "durable log · horizontal · feature-flagged", GREEN)}
          <div style={{ ...S.label, marginTop: 12 }}>PRESSURE</div>
          <button style={S.btn(w.peak, false, AMBER)} onClick={() => setW(x => ({ ...x, peak: !x.peak }))}>PEAK BURST: {w.peak ? "ON (+70 tps)" : "OFF"}</button>
          <button style={S.btn(w.countdowns, w.mode === 2, AMBER)} disabled={w.mode === 2} onClick={() => setW(x => ({ ...x, countdowns: !x.countdowns }))}>COUNTDOWN TASKS: {w.countdowns ? "ON (+25 held)" : "OFF"}</button>
          <button style={S.btn(false, w.mode === 2)} disabled={w.mode === 2} onClick={() => setW(x => ({ ...x, churn: 0, latency: 0, flow: false, outage: false, backlog: Math.round(x.backlog * 0.5), bounces: x.bounces + 1 }))}>BOUNCE THE BROKER ({w.bounces})</button>
          <div style={{ ...S.label, marginTop: 12 }}>KAFKA'S OWN PHYSICS</div>
          <button style={S.btn(w.hol, w.mode !== 2, AMBER)} disabled={w.mode !== 2} onClick={() => setW(x => ({ ...x, hol: !x.hol, partDelay: 0 }))}>SLOW MESSAGE IN A PARTITION: {w.hol ? "ON" : "OFF"}</button>
          <button style={S.btn(w.nbWorker, w.mode !== 2, GREEN)} disabled={w.mode !== 2} onClick={() => setW(x => ({ ...x, nbWorker: !x.nbWorker, partDelay: 0 }))}>NON-BLOCKING WORKER: {w.nbWorker ? "ARMED" : "OFF"}<div style={{ color: "#6b7080", fontSize: 10 }}>fetcher → bounded local queue → executors</div></button>
          <button style={S.btn(false, w.mode !== 2)} disabled={w.mode !== 2} onClick={() => setW(x => ({ ...x, rebal: 3 }))}>DEPLOY THE APP (rebalance)</button>
          <button style={S.btn(false, w.mode !== 2)} disabled={w.mode !== 2} onClick={() => setW(x => ({ ...x, kWorkers: Math.min(8, x.kWorkers + 1) }))}>ADD A WORKER ({w.kWorkers})</button>
          <button style={{ ...S.btn(false, false), marginTop: 12 }} onClick={() => setW(x => ({ ...initial(), mode: x.mode }))}>↺ RESET METERS</button>
        </div>

        <div style={{ flex: "2 1 440px", minWidth: 300 }}>
          <div style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${verdict.c}`, background: `${verdict.c}14`, marginBottom: 12 }}>
            <div style={{ color: verdict.c, fontWeight: 700 }}>{verdict.code}</div>
            <div style={{ marginTop: 5, fontSize: 11.5, lineHeight: 1.6 }}>{verdict.t}</div>
          </div>
          <div style={S.panel}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={S.label}>{rb ? `RABBITMQ · CAPACITY ${cap} TPS${w.flow ? " · FLOW CONTROL ACTIVE" : ""}` : `KAFKA · ${w.kWorkers} WORKERS · ${cap} TPS`}</div>
              <div style={{ fontSize: 10, color: "#6b7080" }}>t={w.t}</div>
            </div>
            <div style={{ marginTop: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={S.label}>BACKLOG</span><span style={{ fontSize: 11, color: w.backlog > 450 ? RED : w.backlog > 180 ? AMBER : GREEN }}>{Math.round(w.backlog)}{w.outage ? " · OUTAGE" : ""}</span></div>
              {bar(w.backlog, 700, w.backlog > 450 ? RED : w.backlog > 180 ? AMBER : GREEN)}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}><span style={S.label}>PUBLISHER LATENCY (flow control, felt upstream)</span><span style={{ fontSize: 11, color: w.latency > 25 ? RED : "#c8cdd8" }}>{w.latency}{w.latency > 25 ? " · past harakiri line" : ""}</span></div>
              {bar(w.latency, 60, w.latency > 25 ? RED : AMBER)}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}><span style={S.label}>RECONNECTION CHURN (harakiri kills)</span><span style={{ fontSize: 11, color: w.churn > 0 ? RED : "#c8cdd8" }}>{Math.round(w.churn)}</span></div>
              {bar(w.churn, 80, RED)}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}><span style={S.label}>PARTITION DELAY (head-of-line)</span><span style={{ fontSize: 11, color: w.partDelay > 15 ? RED : "#c8cdd8" }}>{w.partDelay}{w.nbWorker && w.hol ? " · one executor stalled" : ""}</span></div>
              {bar(w.partDelay, 60, w.partDelay > 15 ? RED : VIOLET)}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              <div style={{ flex: 1 }}><div style={S.label}>ORDERS</div><div style={{ fontSize: 14, fontWeight: 700, color: w.outage ? RED : GREEN }}>{w.outage ? "HALTED" : "FLOWING"}</div></div>
              <div style={{ flex: 1 }}><div style={S.label}>TASKS RIDING</div><div style={{ fontSize: 14, fontWeight: 700 }}>900+</div></div>
              <div style={{ flex: 1 }}><div style={S.label}>BROKER</div><div style={{ fontSize: 14, fontWeight: 700, color: rb ? AMBER : GREEN }}>{rb ? (w.mode === 1 ? "RMQ · HA" : "RMQ") : "KAFKA"}</div></div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ color: "#6b7080", fontSize: 10, marginTop: 12, borderTop: "1px solid #2a2a3a", paddingTop: 8, lineHeight: 1.7 }}>
        The 900+ task inventory (order checkout, merchant order transmission, Dasher location processing), peak-clustered outages recoverable by bounce or manual failover, the countdown/ETA load contribution and its restriction, Flow Control's publisher throttling experienced as network latency with upstream cascade, the harakiri kill→churn→load loop across thousands of uWSGI workers, the never-root-caused stuck Celery consumers, the vertical ceiling on the largest single node, the HA mode's replication throughput tax with 20-plus-minute stuck message-losing failovers, the five-option decision table, the two-week MVP (FQNs + pickled arguments; @task wrapper; dynamic feature flags at both ends; compatible-parameter whitelist), the 80%-in-a-week ramp with lowest-risk tasks first, the double-capacity worker fleet and dedicated Kubernetes cluster, rank-features-by-task-count triage, Kafka's head-of-line blocking and the fetcher/bounded-local-queue/executors worker with its crash-loss threshold, deploy-triggered rebalance stalls and the incremental-cooperative-rebalancing wish, and the wins ledger (outages stopped; horizontal scale; per-queue/worker/task metrics; Terraform-templatized alerts with owners; self-serve operations; '80% of the result with 20% of the effort') are all from Khalilnaji and Kachhara's DoorDash Engineering post. The tick dynamics, tps figures, and outage threshold here are an illustrative miniature of those stated mechanisms.
        {" "}<a href="https://behindscale.com/articles/doordash-rabbitmq-kafka" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: "none" }}>From the full dissection at behindscale.com →</a>
      </div>
    </div>
  );
}

function ContextBlock() {
  const [open, setOpen] = useState(true);
  const lbl = { fontSize: 10, color: ACCENT, letterSpacing: 1.2 };
  if (!open) return <button onClick={() => setOpen(true)} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontFamily: "inherit", fontSize: 10, padding: 0, margin: "10px 0 0", display: "block" }}>SHOW CONTEXT ▾</button>;
  return (
    <div style={{ background: "#111118", border: "1px solid #2a2a3a", borderRadius: 8, padding: "12px 14px", marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <div style={{ fontSize: 10, color: "#6b7080", letterSpacing: 1.2 }}>CONTEXT — IF YOU ARRIVED HERE WITHOUT THE ARTICLE</div>
        <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontFamily: "inherit", fontSize: 10, padding: 0 }}>HIDE ✕</button>
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 8 }}><span style={lbl}>THE PROBLEM · </span>DoorDash's 900+ async tasks — checkout included — rode Celery and RabbitMQ, and under peak bursts the broker degraded: Flow Control throttled publishers into upstream latency, harakiri kills churned connections that fed the broker more load, and the HA mode taxed throughput while its failovers jammed for 20+ minutes. When task processing went down, DoorDash went down.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>THE MOVE · </span>Replace the buffer's foundation: a minimal Kafka-based task system — task names and pickled arguments, one feature flag per adopting team — shipped in two weeks, moved 80% of load in a week, and stopped the outages; then meet the new buffer's own physics honestly, decoupling fetch from execution behind a bounded local queue so one slow message stalls one executor instead of a partition.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>TRY · </span>Push the peak at RabbitMQ and watch the queue push back — flow control, the harakiri loop, the outage, the bounce. Tax yourself with HA mode and reach the outage sooner. Then escape to Kafka, drain the same peak flat, and take on head-of-line blocking and rebalance stalls: the pathologies you chose.</div>
    </div>
  );
}
