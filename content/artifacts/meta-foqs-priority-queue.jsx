import { useState, useEffect, useRef } from "react";

function mulberry32(seed) { let a = seed >>> 0; return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const ACCENT = "#0866FF";
const RED = "#ef4444"; const AMBER = "#eab308"; const GREEN = "#22c55e";
const DT = 0.15;
const ENQ = 40;         // items/s produced
const DRAIN = 60;       // healthy consumer capacity items/s
const PRIO = { p1: { share: 0.15, color: ACCENT, label: "p1 · urgent" }, p16: { share: 0.5, color: "#9aa3b2", label: "p16 · normal" }, p32: { share: 0.35, color: "#5f6b7a", label: "p32 · deferred" } };

export default function ShockAbsorber() {
  const [outage, setOutage] = useState(false);
  const [checkpoint, setCheckpoint] = useState(true);
  const [shardDown, setShardDown] = useState(false);
  const [atMostOnce, setAtMostOnce] = useState(false);
  const [drainEvent, setDrainEvent] = useState(0); // datacenter drain flash
  const [, force] = useState(0);
  const w = useRef(null);
  const fresh = () => ({ t: 0, rng: mulberry32(42), bl: { p1: 0, p16: 0, p32: 0 }, lost: 0, redelivered: 0, leases: [], enqOk: 0 });
  if (!w.current) w.current = fresh();
  const reset = () => { w.current = fresh(); setOutage(false); setShardDown(false); setDrainEvent(0); };

  useEffect(() => {
    const id = setInterval(() => {
      const W = w.current; W.t += DT;
      // enqueue: circuit breaker means a down shard is simply not fed; forwarding keeps success
      const enq = ENQ * DT * (0.9 + W.rng() * 0.2);
      W.enqOk += enq;
      for (const k of Object.keys(PRIO)) W.bl[k] += enq * PRIO[k].share;
      // scan latency: the crux — unbounded scans walk history proportional to backlog
      const total = W.bl.p1 + W.bl.p16 + W.bl.p32;
      const lat = checkpoint ? 6 : Math.min(320, 6 + total * 0.55);
      W.lat = lat;
      // drain: zero during outage; degraded by slow scans otherwise
      let cap = outage ? 0 : DRAIN * DT * Math.min(1, 40 / Math.max(40, lat));
      if (shardDown) cap *= 0.95; // one of 8 shards marked down; prefetch merges the rest
      // priority contract: drain lowest priority number first
      for (const k of ["p1", "p16", "p32"]) { const take = Math.min(cap, W.bl[k]); W.bl[k] -= take; cap -= take; if (cap <= 0.0001) break; }
      // leases
      W.leases = W.leases.filter((l) => { if (W.t >= l.at) { if (atMostOnce) W.lost += 1; else { W.redelivered += 1; W.bl.p16 += 1; } return false; } return true; });
      force((x) => x + 1);
    }, 150);
    return () => clearInterval(id);
  }, [outage, checkpoint, shardDown, atMostOnce]);

  const W = w.current;
  const total = Math.round(W.bl.p1 + W.bl.p16 + W.bl.p32);
  const lat = Math.round(W.lat || 6);
  const crashConsumer = () => { w.current.leases.push({ at: w.current.t + 2.5 }); };
  const drainDC = () => { setDrainEvent(Date.now()); };
  const draining = Date.now() - drainEvent < 4000;

  const verdict = (() => {
    if (draining) return { c: GREEN, code: "DATACENTER DRAINED — MILLISECONDS OF READ-ONLY", t: "The shard's MySQL primary goes read-only for a few milliseconds while a replica in another region catches up, gets promoted, and Shard Manager reassigns the shard to a FOQS host near the new primary — minimizing expensive cross-region traffic. The seam: promotions strand capacity in the wrong regions, which is why routing had to learn to send enqueues to capacity and dequeues to the highest-priority items." };
    if (outage) return { c: total > 60 ? AMBER : AMBER, code: "CONSUMERS DOWN — DELAY, NOT LOSS", t: `Every downstream consumer is gone, and the queue is doing its one job: enqueues keep succeeding (${Math.round(W.enqOk)} accepted, ${Math.round(W.lost)} lost), the backlog holds ${total} items — at Meta scale this is the hundreds-of-billions regime the post cites as the system working as intended. ${checkpoint ? "Scan latency is flat at " + lat + "ms: checkpointing keeps the queue fast no matter how deep it gets." : "But watch SCAN LATENCY: " + lat + "ms and climbing — without checkpointing, MySQL's history list makes the queue slower exactly as it fills."}` };
    if (!checkpoint && lat > 40) return { c: RED, code: "THE BUFFER DEGRADES UNDER ITS OWN BACKLOG", t: `Unbounded timestamp scans force MySQL to walk a history list proportional to everything pending — ${lat}ms per scan and the drain is crawling, so the backlog that should be shrinking sustains the slowness causing it. This is the crux. Turn checkpointing on: bounding the where clause from both sides keeps scan cost proportional to progress, not depth.` };
    if (shardDown) return { c: GREEN, code: "CIRCUIT BREAKER OPEN — SHARD 3 MARKED DOWN", t: "Slow queries over a rolling window tripped the breaker the post cites by name: the enqueue worker stops feeding shard 3 until it recovers, refusing to deepen an overload in progress, while enqueue forwarding and the prefetch buffer's merge across healthy shards keep the host serving. Same reflex as Shopify's payment-gateway breakers, pointed one layer down — at your own storage." };
    if (W.redelivered > 0 || W.lost > 0) return atMostOnce
      ? { c: AMBER, code: "AT-MOST-ONCE — THE LEASE EXPIRED, THE ITEM DIED", t: `A consumer crashed mid-processing and the lease expired: under at-most-once semantics the item is deleted, not redelivered (${Math.round(W.lost)} lost, by contract). The topic chose certainty-of-no-duplicates over certainty-of-delivery — the other edge of the same lease.` }
      : { c: GREEN, code: "LEASE EXPIRED — REDELIVERED, NOT LOST", t: `A consumer crashed after dequeue and never acked; the lease ran out and FOQS made the item deliverable again (${W.redelivered} redelivered, ${Math.round(W.lost)} lost). This is queue-with-guaranteed-delivery — the property Discord reached for in PubSub — and its tax: a merely slow consumer gets duplicates, so idempotent processing is every consumer's obligation.` };
    return { c: GREEN, code: "HEALTHY — A TRILLION ITEMS A DAY, QUIETLY", t: "Producers enqueue with priorities and delays; the prefetch buffer k-way-merges per-shard indexes so dequeue hands back the most urgent, oldest-ready work; leases guard every delivery. Now break something — the queue's entire reason to exist is what happens next." };
  })();

  const mono = "'JetBrains Mono','Fira Code','SF Mono',ui-monospace,monospace";
  const S = {
    root: { background: "#08090D", color: "#c8cdd8", fontFamily: mono, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid #2a2a3a", fontSize: 12, lineHeight: 1.5 },
    panel: { background: "#111118", border: "1px solid #2a2a3a", borderRadius: 8, padding: 12 },
    label: { color: "#6b7080", fontSize: 10, letterSpacing: 1.2 },
    btn: (on) => ({ display: "block", width: "100%", textAlign: "left", padding: "7px 9px", marginTop: 6, borderRadius: 6, cursor: "pointer", border: `1px solid ${on ? ACCENT : "#2a2a3a"}`, color: on ? "#a8c7ff" : "#8b90a0", background: on ? "rgba(8,102,255,0.10)" : "#0c0d13", fontFamily: mono, fontSize: 11 }),
  };

  return (
    <div style={S.root}>
      <div style={{ color: ACCENT, fontSize: 10, letterSpacing: 2 }}>META · FOQS — INTERACTIVE</div>
      <div style={{ color: "#edeff3", fontSize: 16, margin: "4px 0 2px", fontWeight: 700 }}>The shock absorber</div>
      <p style={{ color: "#8b90a0", fontSize: 11, margin: 0 }}>One FOQS host, eight MySQL shards, and the promise underneath Meta's async world: downstream failure becomes delay — and the queue must not slow down as it absorbs.</p>
      <ContextBlock />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
        <div style={{ ...S.panel, flex: "1 1 240px", minWidth: 240 }}>
          <div style={S.label}>BREAK SOMETHING</div>
          <button style={S.btn(outage)} onClick={() => setOutage(!outage)}>💥 DOWNSTREAM OUTAGE {outage ? "· ON" : "· OFF"}<div style={{ color: "#6b7080", fontSize: 10 }}>every consumer stops — the backlog is the point</div></button>
          <button style={S.btn(false)} onClick={crashConsumer}>💥 CRASH A CONSUMER MID-LEASE<div style={{ color: "#6b7080", fontSize: 10 }}>dequeued, never acked — the lease decides</div></button>
          <button style={S.btn(shardDown)} onClick={() => setShardDown(!shardDown)}>💥 SHARD 3 GOES SLOW {shardDown ? "· ON" : "· OFF"}<div style={{ color: "#6b7080", fontSize: 10 }}>rolling-window health trips the circuit breaker</div></button>
          <button style={S.btn(false)} onClick={drainDC}>💥 DRAIN THE DATACENTER</button>
          <div style={{ ...S.label, marginTop: 12 }}>THE QUEUE'S OWN DEFENSES</div>
          <button style={S.btn(checkpoint)} onClick={() => setCheckpoint(!checkpoint)}>CHECKPOINTING: {checkpoint ? "ON" : "OFF"}<div style={{ color: "#6b7080", fontSize: 10 }}>bound timestamp scans from both sides</div></button>
          <button style={S.btn(atMostOnce)} onClick={() => setAtMostOnce(!atMostOnce)}>SEMANTICS: {atMostOnce ? "AT MOST ONCE" : "AT LEAST ONCE"}</button>
          <button style={{ ...S.btn(false), marginTop: 12 }} onClick={reset}>↺ RESET · t = {W.t.toFixed(1)}s</button>
        </div>

        <div style={{ flex: "2 1 420px", minWidth: 300 }}>
          <div style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${verdict.c}`, background: `${verdict.c}14`, marginBottom: 12 }}>
            <div style={{ color: verdict.c, fontWeight: 700 }}>{verdict.code}</div>
            <div style={{ marginTop: 5, fontSize: 11.5, lineHeight: 1.6 }}>{verdict.t}</div>
          </div>
          <div style={S.panel}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <div style={{ flex: "1 1 130px", background: "#0c0d13", border: "1px solid #2a2a3a", borderRadius: 6, padding: "8px 10px" }}>
                <div style={S.label}>BACKLOG</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: total > 80 ? AMBER : "#c8cdd8" }}>{total} items</div>
              </div>
              <div style={{ flex: "1 1 130px", background: "#0c0d13", border: `1px solid ${W.lost > 0 ? RED : "#2a2a3a"}`, borderRadius: 6, padding: "8px 10px" }}>
                <div style={{ fontSize: 9, letterSpacing: 1.5, color: W.lost > 0 ? RED : "#6b7080" }}>ITEMS LOST</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: W.lost > 0 ? RED : GREEN }}>{Math.round(W.lost)}</div>
              </div>
              <div style={{ flex: "1 1 130px", background: "#0c0d13", border: "1px solid #2a2a3a", borderRadius: 6, padding: "8px 10px" }}>
                <div style={S.label}>SCAN LATENCY</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: lat > 40 ? RED : lat > 15 ? AMBER : GREEN }}>{lat}ms</div>
              </div>
              <div style={{ flex: "1 1 130px", background: "#0c0d13", border: "1px solid #2a2a3a", borderRadius: 6, padding: "8px 10px" }}>
                <div style={S.label}>REDELIVERED</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#c8cdd8" }}>{W.redelivered}</div>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 10, color: "#8b90a0", marginBottom: 4 }}>BACKLOG BY PRIORITY — recovery drains the urgent first (priority, then oldest deliver_after)</div>
              <div style={{ display: "flex", height: 16, borderRadius: 6, overflow: "hidden", background: "#1a1b24" }}>
                {Object.keys(PRIO).map((k) => (
                  <div key={k} style={{ width: `${total > 0 ? (W.bl[k] / total) * 100 : 0}%`, background: PRIO[k].color, transition: "width 200ms" }} />
                ))}
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 5, flexWrap: "wrap" }}>
                {Object.keys(PRIO).map((k) => <span key={k} style={{ fontSize: 10, color: PRIO[k].color }}>■ {PRIO[k].label}: {Math.round(W.bl[k])}</span>)}
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 10, color: "#8b90a0", marginBottom: 4 }}>MYSQL SHARDS (one host's slice) — breaker-guarded workers feed each</div>
              <div style={{ display: "flex", gap: 5 }}>
                {Array.from({ length: 8 }, (_, i) => (
                  <div key={i} title={`shard ${i}`} style={{ width: 16, height: 16, borderRadius: 3, background: shardDown && i === 3 ? RED : draining ? AMBER : "#2a2f45", border: `1px solid ${shardDown && i === 3 ? RED : "#343a55"}` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ color: "#6b7080", fontSize: 10, marginTop: 12, borderTop: "1px solid #2a2a3a", paddingTop: 8, lineHeight: 1.7 }}>
        Rates, the eight-shard slice, and the latency curve are illustrative; the mechanisms are the post's: items as MySQL rows with priority, deliver_after, lease, and TTL; buffered enqueues with per-shard workers behind a circuit breaker (cited by name) that stops feeding unhealthy shards; enqueue forwarding; the prefetch buffer k-way-merging per-shard in-memory indexes to keep the priority contract, replenishing in proportion to per-topic demand; leases converting consumer crashes into redelivery (at-least-once) or deletion (at-most-once); nacks with client-controlled delay for exponential backoff; checkpointing to bound timestamp scans against MySQL's history-list growth; and per-shard replication to two extra regions with a synchronous binlog copy in-building, giving datacenter drains a few milliseconds of read-only. Sourced scale: close to a trillion items a day; backlogs of hundreds of billions absorbing widespread downstream failures.
        {" "}<a href="https://behindscale.com/articles/meta-foqs-priority-queue" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: "none" }}>From the full dissection at behindscale.com →</a>
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
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 8 }}><span style={lbl}>THE PROBLEM · </span>FOQS is the queue under Meta's async world — close to a trillion items a day — and its job is to be the component that doesn't fail when everything downstream does: backlogs of hundreds of billions of items are the system working. The hard part: MySQL's own mechanics make the queue slower exactly as it fills, and priority is a global promise sharded storage can't natively keep.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>THE MOVE · </span>Engineer the buffer so absorbing the shock doesn't slow it down: checkpoint-bounded timestamp scans, per-shard indexes k-way-merged by a prefetch buffer, leases with ack/nack for at-least-once delivery, and circuit breakers guarding every shard.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>TRY · </span>Kill the consumers and watch loss stay at zero while the backlog climbs — then turn checkpointing off and watch the queue degrade under its own depth. Crash a consumer mid-lease under both delivery semantics, and trip shard 3's circuit breaker.</div>
    </div>
  );
}
