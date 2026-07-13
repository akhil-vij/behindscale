import { useState, useEffect, useRef } from "react";

function mulberry32(seed) { let a = seed >>> 0; return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const ACCENT = "#36C5F0";
const RED = "#ef4444"; const AMBER = "#eab308"; const GREEN = "#22c55e";
const DT = 0.15, ENQ = 30, CAP = 100; // redis memory capacity units

export default function TheQueueThatCouldntDrain() {
  const [kafka, setKafka] = useState(false);     // NEW system (Kafka in front) vs OLD
  const [slow, setSlow] = useState(false);        // downstream/database slowdown
  const [, force] = useState(0);
  const w = useRef(null);
  const fresh = () => ({ t: 0, rng: mulberry32(42), redis: 8, kbacklog: 0, lost: 0, locked: false, done: 0, deq: 0 });
  if (!w.current) w.current = fresh();
  const reset = () => { w.current = fresh(); setSlow(false); };

  useEffect(() => {
    const id = setInterval(() => {
      const W = w.current; W.t += DT;
      const enq = ENQ * DT * (0.9 + W.rng() * 0.2);
      // execution capacity: healthy 34/s, slowdown 6/s
      let exec = (slow ? 6 : 34) * DT;
      if (!kafka) {
        // OLD: enqueue straight into redis memory
        if (W.locked) {
          // seized: cannot dequeue (needs free memory), enqueues fail
          W.lost += enq; W.deq = 0;
        } else {
          W.redis = Math.min(CAP, W.redis + enq);
          // O(n) dequeue: drain slows as queue deepens
          const on = Math.max(0.25, 1 - (W.redis / CAP) * 0.75);
          const drained = Math.min(W.redis, exec * on);
          W.redis -= drained; W.done += drained; W.deq = drained / DT;
          if (W.redis >= CAP - 0.5) { W.locked = true; }
        }
      } else {
        // NEW: kafka absorbs at line rate (durable); JQRelay admits under rate limit
        W.kbacklog += enq;
        const admit = Math.min(W.kbacklog, exec, (CAP * 0.6 - W.redis) > 0 ? exec : 0);
        W.kbacklog -= Math.max(0, admit);
        W.redis = Math.max(0, Math.min(CAP, W.redis + admit - exec));
        const drained = Math.min(W.redis + admit, exec);
        W.done += drained; W.deq = drained / DT;
      }
      force((x) => (x + 1) & 0xffff);
    }, 150);
    return () => clearInterval(id);
  }, [kafka, slow]);

  const W = w.current;
  const memPct = Math.round((W.redis / CAP) * 100);
  const intervene = () => { if (W.locked) { W.redis = 8; W.locked = false; } };

  const verdict = (() => {
    if (!kafka && W.locked) return slow
      ? { c: RED, code: "SEIZED — FULL REDIS CANNOT DEQUEUE", t: "Memory is at the limit, and dequeuing needs a sliver of free memory to move a job into the processing list — so the queue cannot empty itself. Enqueues are failing across every dependent operation. Fix the slowdown and watch: the lock does not release itself." }
      : { c: RED, code: "THE SLOWDOWN IS FIXED — THE QUEUE IS STILL LOCKED", t: "This is the sourced anticlimax: the database contention resolved, and the job queue remained locked, because draining requires the very memory the backlog consumed. Recovery took extensive manual intervention. That button below is doing a lot of work." };
    if (!kafka && slow) return { c: memPct > 70 ? RED : AMBER, code: `REDIS FILLING — ${memPct}% OF MEMORY, DRAIN SLOWING`, t: "Execution has slowed, enqueues haven't. Watch DEQUEUE RATE fall as the queue deepens — dequeue cost is proportional to queue length, so the fuller it gets, the harder it is to empty. Two feedback loops are closing at once." };
    if (kafka && slow) return { c: GREEN, code: "SAME SLOWDOWN — NOW IT'S A BACKLOG, NOT AN OUTAGE", t: `Kafka accepts every enqueue at line rate onto disk (${Math.round(W.kbacklog)} jobs and climbing, ZERO lost), while JQRelay's rate limit admits work into Redis only as fast as workers drain — memory holds near ${memPct}%. The failure moved from 'Redis seizes' to 'a dial in Consul.'` };
    if (kafka) return { c: GREEN, code: "KAFKA IN FRONT — INGESTION DECOUPLED FROM EXECUTION", t: "Jobs land in durable storage first; the relay admits them under rate limits. Trigger the slowdown that caused the outage and compare what happens this time." };
    return { c: AMBER, code: "THE OLD SYSTEM — A CLASSIC REDIS TASK QUEUE", t: "Web app hashes each job to a Redis host; workers poll and drain. 1.4 billion jobs a day flow through memory with little headroom. Trigger the downstream slowdown and watch both feedback loops close." };
  })();

  const mono = "'JetBrains Mono','Fira Code',ui-monospace,monospace";
  const S = {
    root: { background: "#08090D", color: "#c8cdd8", fontFamily: mono, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid #2a2a3a", fontSize: 12, lineHeight: 1.5 },
    panel: { background: "#111118", border: "1px solid #2a2a3a", borderRadius: 8, padding: 12 },
    label: { color: "#6b7080", fontSize: 10, letterSpacing: 1.2 },
    btn: (on, dis) => ({ display: "block", width: "100%", textAlign: "left", padding: "7px 9px", marginTop: 6, borderRadius: 6, cursor: dis ? "not-allowed" : "pointer", opacity: dis ? 0.4 : 1, border: `1px solid ${on ? ACCENT : "#2a2a3a"}`, color: on ? "#aee6f8" : "#8b90a0", background: on ? "rgba(54,197,240,0.10)" : "#0c0d13", fontFamily: mono, fontSize: 11 }),
    meter: (v, c) => ({ flex: "1 1 130px", background: "#0c0d13", border: `1px solid ${c}44`, borderRadius: 6, padding: "8px 10px" }),
  };

  return (
    <div style={S.root}>
      <div style={{ color: ACCENT, fontSize: 10, letterSpacing: 2 }}>SLACK · JOB QUEUE — INTERACTIVE</div>
      <div style={{ color: "#edeff3", fontSize: 16, margin: "4px 0 2px", fontWeight: 700 }}>The queue that couldn't drain</div>
      <p style={{ color: "#8b90a0", fontSize: 11, margin: 0 }}>Recreate the outage: a downstream slowdown fills Redis until it seizes — then run the same failure through the Kafka-fronted redesign.</p>
      <ContextBlock />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
        <div style={{ ...S.panel, flex: "1 1 240px", minWidth: 240 }}>
          <div style={S.label}>SYSTEM</div>
          <button style={S.btn(!kafka, false)} onClick={() => { setKafka(false); reset(); }}>OLD — REDIS ONLY</button>
          <button style={S.btn(kafka, false)} onClick={() => { setKafka(true); reset(); }}>NEW — KAFKA IN FRONT OF REDIS</button>
          <div style={{ ...S.label, marginTop: 12 }}>BREAK SOMETHING</div>
          <button style={S.btn(slow, false)} onClick={() => setSlow(!slow)}>💥 DOWNSTREAM SLOWDOWN {slow ? "· ON" : "· OFF"}<div style={{ color: "#6b7080", fontSize: 10 }}>database contention slows job execution</div></button>
          <button style={S.btn(false, !(!kafka && W.locked))} disabled={!(!kafka && W.locked)} onClick={intervene}>🔧 EXTENSIVE MANUAL INTERVENTION<div style={{ color: "#6b7080", fontSize: 10 }}>the sourced recovery path — by hand</div></button>
          <button style={{ ...S.btn(false, false), marginTop: 12 }} onClick={reset}>↺ RESET · t = {W.t.toFixed(1)}s</button>
        </div>

        <div style={{ flex: "2 1 420px", minWidth: 300 }}>
          <div style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${verdict.c}`, background: `${verdict.c}14`, marginBottom: 12 }}>
            <div style={{ color: verdict.c, fontWeight: 700 }}>{verdict.code}</div>
            <div style={{ marginTop: 5, fontSize: 11.5, lineHeight: 1.6 }}>{verdict.t}</div>
          </div>
          <div style={S.panel}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <div style={S.meter(memPct, memPct > 85 ? RED : memPct > 60 ? AMBER : "#2a2a3a")}>
                <div style={{ ...S.label, color: memPct > 85 ? RED : "#6b7080" }}>REDIS MEMORY</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: W.locked ? RED : memPct > 60 ? AMBER : "#c8cdd8" }}>{memPct}%{W.locked ? " · LOCKED" : ""}</div>
              </div>
              <div style={S.meter(0, kafka ? ACCENT : "#2a2a3a")}>
                <div style={S.label}>KAFKA BACKLOG (durable)</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: kafka ? "#aee6f8" : "#4a4f5e" }}>{kafka ? Math.round(W.kbacklog) : "—"}</div>
              </div>
              <div style={S.meter(0, W.lost > 0 ? RED : GREEN)}>
                <div style={{ ...S.label, color: W.lost > 0 ? RED : "#6b7080" }}>ENQUEUES FAILED</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: W.lost > 0 ? RED : GREEN }}>{Math.round(W.lost)}</div>
              </div>
              <div style={S.meter(0, "#2a2a3a")}>
                <div style={S.label}>DEQUEUE RATE</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: W.deq < 8 && slow ? AMBER : "#c8cdd8" }}>{W.deq.toFixed(0)}/s</div>
              </div>
            </div>
            <div style={{ marginTop: 10, height: 12, background: "#1a1b24", borderRadius: 6, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${memPct}%`, background: W.locked ? RED : memPct > 60 ? AMBER : ACCENT, transition: "width 200ms" }} />
            </div>
            <div style={{ fontSize: 10, color: "#6b7080", marginTop: 4 }}>redis memory — in the old system, backlog lives here; at 100% the drain itself has nowhere to work</div>
          </div>
        </div>
      </div>

      <div style={{ color: "#6b7080", fontSize: 10, marginTop: 12, borderTop: "1px solid #2a2a3a", paddingTop: 8, lineHeight: 1.7 }}>
        Rates and the memory scale are illustrative; the mechanics are the post's: a database-contention slowdown filling Redis to its memory limit; enqueues failing across every dependent operation; dequeue requiring free memory, so the full queue stayed locked after the contention resolved — recovered only by extensive manual intervention; dequeue cost proportional to queue length (the deeper, the harder to empty); and the redesign's answer — Kafka in front of Redis as durable storage, Kafkagate writing at line rate with leader-only acks, JQRelay admitting into Redis under Consul-configured rate limits so a build-up becomes adjustable backlog on disk. Sourced scale: 1.4 billion jobs on the busiest days at 33,000/s peak.
        {" "}<a href="https://behindscale.com/articles/slack-scaling-job-queue" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: "none" }}>From the full dissection at behindscale.com →</a>
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
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 8 }}><span style={lbl}>THE PROBLEM · </span>Slack's Redis job queue — 1.4 billion jobs a day — failed under exactly the condition a queue exists for: when execution slowed, the backlog consumed Redis memory, and since dequeuing itself required free memory, the full queue could not drain. It stayed locked even after the original problem was fixed.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>THE MOVE · </span>Kafka in front of Redis: enqueues land in durable storage at line rate, and a rate-limited relay admits work into Redis only as fast as workers drain — backlog becomes a number on disk, not pressure inside the drain.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>TRY · </span>In the OLD system, turn on the slowdown and watch Redis fill, seize, and stay seized even after you turn the slowdown off — then intervene by hand. Flip to NEW and run the identical failure.</div>
    </div>
  );
}
