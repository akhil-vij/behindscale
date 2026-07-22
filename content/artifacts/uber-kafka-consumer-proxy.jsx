import { useState, useEffect } from "react";

const ACCENT = "#F97316";
const RED = "#ef4444"; const AMBER = "#eab308"; const GREEN = "#22c55e"; const VIOLET = "#9b8cf0";

// Partition of alternating charges: even idx → Visa, odd → Mastercard. Ticks advance work.
const N = 14; const WINDOW = 6; // tracker window for proxy modes
const visaOf = (i) => i % 2 === 0;
const mkMsgs = () => Array.from({ length: N }, (_, i) => ({ i, state: "queued", left: 0 })); // state: queued|inflight|acked|nacked
const initial = (mode) => ({ mode, t: 0, slow: false, poison: false, msgs: mkMsgs(), committed: -1, fetched: -1, dlq: [], mcDone: 0, vDone: 0, stalledTicks: 0 });
const dur = (w, m) => (w.poison && m.i === 2 ? Infinity : w.slow && visaOf(m.i) ? 5 : 1);

function step(w) {
  const n = { ...w, msgs: w.msgs.map(m => ({ ...m })), dlq: [...w.dlq] };
  n.t++;
  const inflight = () => n.msgs.filter(m => m.state === "inflight");
  const done = (m) => { m.state = "acked"; if (visaOf(m.i)) n.vDone++; else n.mcDone++; };

  if (n.mode === "native") {
    // strictly serial: one at a time, next only after previous acked
    let cur = inflight()[0];
    if (!cur) { const q = n.msgs.find(m => m.state === "queued"); if (q) { q.state = "inflight"; q.left = dur(n, q); cur = q; } }
    if (cur) { if (cur.left !== Infinity) { cur.left--; if (cur.left <= 0) done(cur); } }
    n.committed = Math.min(...n.msgs.filter(m => m.state !== "acked").map(m => m.i), N) - 1;
  } else {
    // proxy modes: fetch up to WINDOW beyond committed, dispatch in parallel
    const cap = n.committed + WINDOW;
    const barrier = n.mode === "naive" && n.msgs.some(m => m.state === "inflight"); // no per-message ledger: next batch waits on the whole current one
    if (!barrier) n.msgs.forEach(m => { if (m.state === "queued" && m.i <= cap) { m.state = "inflight"; m.left = dur(n, m); } });
    inflight().forEach(m => {
      if (m.left === Infinity) { if (n.mode === "dlq") { m.state = "nacked"; n.dlq.push(m.i); } return; }
      m.left--; if (m.left <= 0) done(m);
    });
    if (n.mode === "naive") {
      // no per-message ledger: commit only when the ENTIRE fetched batch is acked, in order
      let c = n.committed; while (c + 1 < N && n.msgs[c + 1].state === "acked") c++;
      // naive twist: cannot dispatch next batch until first message of window completes → emulate by capping via committed (already done)
      n.committed = c;
    } else {
      // ooo-ack (+dlq): watermark passes acked or nacked
      let c = n.committed; while (c + 1 < N && (n.msgs[c + 1].state === "acked" || n.msgs[c + 1].state === "nacked")) c++;
      n.committed = c;
    }
  }
  const moving = n.msgs.some(m => m.state === "inflight" && m.left !== Infinity) || n.msgs.some(m => m.state === "queued" && m.i <= n.committed + (n.mode === "native" ? 1 : WINDOW));
  n.stalledTicks = moving ? 0 : n.stalledTicks + 1;
  return n;
}

export default function LedgerAboveTheLog() {
  const [w, setW] = useState(() => initial("native"));
  useEffect(() => { const id = setInterval(() => setW(step), 550); return () => clearInterval(id); }, []);
  const allDone = w.msgs.every(m => m.state === "acked" || m.state === "nacked");
  const mcWaiting = w.msgs.filter(m => !visaOf(m.i) && m.state === "queued").length;
  const jammed = !allDone && w.stalledTicks > 2;

  const verdict = (() => {
    if (allDone && w.dlq.length > 0) return { c: GREEN, code: "NACKED, PARKED, MOVING", t: `The poison pill sits in the DLQ topic (message #${w.dlq[0]}), negatively acknowledged, and the watermark passed straight over it — every other charge completed. The pill stopped costing the partition and started costing an operator later: merge it back or purge it, with tooling. That deferral, not resolution, is the honest shape of the fix.` };
    if (allDone) return { c: GREEN, code: "PARTITION DRAINED", t: `All ${N} charges done — Visa ${w.vDone}, Mastercard ${w.mcDone}. Now make trouble: turn on the VISA SLOWDOWN or drop the POISON PILL, and compare the four modes.` };
    if (w.mode === "native" && (w.slow || w.poison)) return { c: RED, code: "ONE SLOW CHARGE, EVERY CHARGE WAITS", t: `The native pattern processes one message at a time and won't touch the next until the previous commits — so ${mcWaiting} healthy Mastercard charges are queued behind ${w.poison ? "a poison pill that will never finish" : "Visa's slow calls"}. This is the partition as ordering, parallelism, and progress in one unit. Try +PARALLEL.` };
    const naiveBarrier = w.mode === "naive" && w.msgs.some(m => m.state === "inflight" && m.left > 0) && w.msgs.some(m => m.state === "acked" && m.i > w.committed);
    if (w.mode === "naive" && (jammed || naiveBarrier)) return { c: AMBER, code: "PARALLEL, BUT THE WINDOW STILL JAMS", t: "Messages dispatch concurrently now — and the batch can't commit until its slowest member finishes, so the proxy can't fetch more. Parallelism without a per-message ledger just moves the head-of-line block from the message to the batch. The fix is the ledger: +OUT-OF-ORDER ACK." };
    if (w.mode === "oooack" && w.poison && jammed) return { c: RED, code: "THE PILL OWNS THE WINDOW", t: `Even the ledger dies to one message: the poison pill can never be acknowledged, the watermark can't pass an un-acked offset, and the tracker window filled and froze. ${w.mcDone + w.vDone} charges made it through before the jam — everything after the window is stuck forever. The vocabulary is missing one word: the negative acknowledgment. Try +DLQ.` };
    if ((w.mode === "oooack" || w.mode === "dlq") && w.slow) return { c: GREEN, code: "THE LEDGER ABOVE THE LOG", t: `Watch the tracker: Visa's slow charges sit un-acked while Mastercard's acknowledgments land around them — and Kafka's committed offset climbs exactly as far as the contiguous acked range. Two ledgers, two jobs: per-message truth up here, watermark truth below. Mastercard done: ${w.mcDone} and counting, starving no more.` };
    if (w.slow || w.poison) return { c: AMBER, code: "TROUBLE IS IN THE LANE", t: "Watch the lane and the meters — the failure is propagating according to this mode's rules." };
    return { c: AMBER, code: "A BILLING PARTITION, FOUR WAYS TO DRAIN IT", t: "Fourteen trip charges alternating Visa/Mastercard in one Kafka partition. Pick a consumption mode, then make trouble — the two disasters expose different layers of the coupling." };
  })();

  const mono = "'JetBrains Mono','Fira Code',ui-monospace,monospace";
  const S = {
    root: { background: "#08090D", color: "#c8cdd8", fontFamily: mono, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid #2a2a3a", fontSize: 12, lineHeight: 1.5 },
    panel: { background: "#111118", border: "1px solid #2a2a3a", borderRadius: 8, padding: 12 },
    label: { color: "#6b7080", fontSize: 10, letterSpacing: 1.2 },
    btn: (on, dis) => ({ padding: "7px 10px", borderRadius: 6, cursor: dis ? "not-allowed" : "pointer", opacity: dis ? 0.4 : 1, border: `1px solid ${on ? ACCENT : "#2a2a3a"}`, color: on ? "#ffd0ab" : "#8b90a0", background: on ? "rgba(249,115,22,0.10)" : "#0c0d13", fontFamily: mono, fontSize: 11, marginRight: 6, marginTop: 6 }),
  };
  const modeBtn = (m, label) => <button key={m} style={S.btn(w.mode === m, false)} onClick={() => setW(x => ({ ...initial(m), slow: x.slow, poison: x.poison }))}>{label}</button>;
  const cell = (m) => {
    const isV = visaOf(m.i); const poison = w.poison && m.i === 2;
    const c = m.state === "acked" ? GREEN : m.state === "nacked" ? VIOLET : m.state === "inflight" ? (poison ? RED : AMBER) : "#2a2f45";
    return (
      <div key={m.i} style={{ flex: "1 1 54px", minWidth: 54, textAlign: "center", background: "#0c0d13", border: `1px solid ${c}`, borderRadius: 6, padding: "6px 2px" }}>
        <div style={{ fontSize: 9, color: "#6b7080" }}>#{m.i} {poison ? "☠" : isV ? "VISA" : "MC"}</div>
        <div style={{ fontSize: 9.5, fontWeight: 700, color: c }}>{m.state === "queued" ? "·" : m.state === "inflight" ? (m.left === Infinity ? "stuck" : `${m.left}t`) : m.state === "nacked" ? "→DLQ" : "ack"}</div>
        <div style={{ fontSize: 8.5, color: m.i <= w.committed ? GREEN : "#4a4f60" }}>{m.i <= w.committed ? "committed" : "—"}</div>
      </div>
    );
  };

  return (
    <div style={S.root}>
      <div style={{ color: ACCENT, fontSize: 10, letterSpacing: 2 }}>UBER · KAFKA CONSUMER PROXY — INTERACTIVE</div>
      <div style={{ color: "#edeff3", fontSize: 16, margin: "4px 0 2px", fontWeight: 700 }}>The ledger above the log</div>
      <p style={{ color: "#8b90a0", fontSize: 11, margin: 0 }}>One partition, fourteen charges, and the coupling Kafka's ordering imposes — then the ledger that uncouples it, one vocabulary word at a time.</p>
      <ContextBlock />

      <div style={{ marginTop: 12 }}>
        <span style={S.label}>MODE · </span>
        {modeBtn("native", "1 · NATIVE CONSUMER")}{modeBtn("naive", "2 · +PARALLEL (no ledger)")}{modeBtn("oooack", "3 · +OUT-OF-ORDER ACK")}{modeBtn("dlq", "4 · +DLQ")}
        <span style={{ ...S.label, marginLeft: 10 }}>TROUBLE · </span>
        <button style={{ ...S.btn(w.slow, false), borderColor: w.slow ? AMBER : undefined, color: w.slow ? AMBER : undefined }} onClick={() => setW(x => ({ ...initial(x.mode), slow: !x.slow, poison: x.poison }))}>VISA SLOWDOWN: {w.slow ? "ON" : "OFF"}</button>
        <button style={{ ...S.btn(w.poison, false), borderColor: w.poison ? RED : undefined, color: w.poison ? RED : undefined }} onClick={() => setW(x => ({ ...initial(x.mode), poison: !x.poison, slow: x.slow }))}>POISON PILL AT #2: {w.poison ? "ON" : "OFF"}</button>
        <button style={S.btn(false, false)} onClick={() => setW(x => initial(x.mode))}>↺ RESET LANE</button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
        <div style={{ flex: "2 1 480px", minWidth: 320 }}>
          <div style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${verdict.c}`, background: `${verdict.c}14`, marginBottom: 12 }}>
            <div style={{ color: verdict.c, fontWeight: 700 }}>{verdict.code}</div>
            <div style={{ marginTop: 5, fontSize: 11.5, lineHeight: 1.6 }}>{verdict.t}</div>
          </div>
          <div style={S.panel}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={S.label}>THE PARTITION — offsets 0…{N - 1}{w.mode !== "native" ? ` · tracker window ${WINDOW}` : " · strictly one at a time"}</div>
              <div style={{ fontSize: 11, color: "#8b90a0" }}>Kafka committed offset: <span style={{ color: GREEN, fontWeight: 700 }}>{w.committed}</span></div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>{w.msgs.map(cell)}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              <div style={{ flex: 1 }}><div style={S.label}>MASTERCARD DONE</div><div style={{ fontSize: 16, fontWeight: 700, color: w.mcDone > 0 ? GREEN : RED }}>{w.mcDone}/7</div></div>
              <div style={{ flex: 1 }}><div style={S.label}>VISA DONE</div><div style={{ fontSize: 16, fontWeight: 700 }}>{w.vDone}/7</div></div>
              <div style={{ flex: 1 }}><div style={S.label}>DLQ DEPTH</div><div style={{ fontSize: 16, fontWeight: 700, color: w.dlq.length ? VIOLET : "#c8cdd8" }}>{w.dlq.length}</div></div>
              <div style={{ flex: 1 }}><div style={S.label}>PROGRESS</div><div style={{ fontSize: 13, fontWeight: 700, color: jammed ? RED : GREEN }}>{jammed ? "JAMMED" : allDone ? "drained" : "moving"}</div></div>
            </div>
          </div>
        </div>

        <div style={{ ...S.panel, flex: "1 1 230px", minWidth: 230 }}>
          <div style={S.label}>THE TWO LEDGERS</div>
          <div style={{ fontSize: 10.5, color: "#8b90a0", lineHeight: 1.7, marginTop: 4 }}>
            <span style={{ color: "#c8cdd8", fontWeight: 700 }}>Kafka (below):</span> knows one number — the committed offset. A commit asserts everything beneath it is done; it cannot say "just this one."<br /><br />
            <span style={{ color: "#c8cdd8", fontWeight: 700 }}>Proxy tracker (above):</span> per-message truth — <span style={{ color: GREEN }}>ack</span> (done), <span style={{ color: VIOLET }}>nack</span> (to the DLQ topic), in-flight. The watermark below advances exactly as far as the contiguous acked-or-nacked range up here.<br /><br />
            The residue: acked-but-uncommitted messages replay after a rebalance — accepted, because consumer services dedupe regardless. At-least-once, leaning on idempotency.
          </div>
        </div>
      </div>

      <div style={{ color: "#6b7080", fontSize: 10, marginTop: 12, borderTop: "1px solid #2a2a3a", paddingTop: 8, lineHeight: 1.7 }}>
        The native consumer pattern (one message, then commit, then the next), the hypothetical Visa/Mastercard billing partition (labeled hypothetical in the post, kept hypothetical here), the partition-scalability arithmetic (1s RPC → 1,000 partitions at 1 msg/s each vs ~10K sustainable; ~200K partitions per cluster), autocommit's data-loss rejection, acknowledge-vs-commit and the contiguous-watermark rule, rebalance duplication accepted via consumer-side dedup, the DLQ topic with gRPC-error nacks and merge/purge tooling, and the flow-control suite (tracker size, timeouts, gRPC-code pacing, circuit breaker) are all from the Uber Engineering post. The 14-message lane, tick durations, and window size are illustrative.
        {" "}<a href="https://behindscale.com/articles/uber-kafka-consumer-proxy" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: "none" }}>From the full dissection at behindscale.com →</a>
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
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 8 }}><span style={lbl}>THE PROBLEM · </span>300+ Uber microservices use Kafka as a message queue, but Kafka's per-partition ordering makes the partition the unit of order, parallelism, and progress at once — one slow or poisoned message stalls everything behind it, and reaching queue throughput means renting a thousand partitions at 1 msg/s each.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>THE MOVE · </span>Consumer Proxy: a push proxy that dispatches each message to consumer gRPC endpoints individually, tracks per-message acknowledgments and negative acknowledgments (poison pills → a DLQ topic) in its own ledger, and commits to Kafka only the contiguous watermark — the log below never learns order was violated.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>TRY · </span>Slow Visa down in native mode and count Mastercard's starved charges. Add parallelism and jam at the batch instead. Add the acknowledgment ledger and watch the watermark climb past stragglers — then drop the poison pill, freeze the window, and learn why the ledger needs the word "nack."</div>
    </div>
  );
}
