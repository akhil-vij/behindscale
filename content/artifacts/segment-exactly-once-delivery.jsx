import { useState, useEffect } from "react";

const ACCENT = "#52BD94";
const RED = "#ef4444"; const AMBER = "#eab308"; const GREEN = "#22c55e"; const VIOLET = "#9b8cf0";

const CAPS = [10, 4, 1]; // spike cycles capacity down; window follows — default holds the whole lane, so aging appears only under load
const winDays = (cap) => (cap === 10 ? 28 : cap === 4 ? 7 : 0.8);
const initial = () => ({ t: 0, queue: ["m1", "m2", "m3", "m4", "m5", "m6", "m7", "m8"], resent: [], ledger: [], aged: [], output: [], dedupeOn: false, tunnel: false, capIdx: 0, discarded: 0, dupDelivered: 0, crashed: false, diverged: null, lastEvent: null, recoveredAt: 0 });

function step(w) {
  const n = { ...w, queue: [...w.queue], resent: [...w.resent], ledger: [...w.ledger], aged: [...w.aged], output: [...w.output] };
  n.t++;
  if (n.crashed) return n; // worker down: nothing consumes until repaired
  if (n.queue.length === 0) return n;
  const id = n.queue.shift();
  const isAgedDup = id.endsWith("!"); const key = id.replace("!", "");
  if (!n.dedupeOn) {
    if (n.output.includes(key)) n.dupDelivered++;
    n.output.push(key);
    n.lastEvent = n.output.filter(k => k === key).length > 1 ? "dup" : "pub";
  } else if (n.ledger.includes(key)) {
    n.discarded++; n.lastEvent = "discard";
  } else {
    // not in ledger: publish (bloom says definitely-not-in-set for its slice)
    if (n.output.includes(key)) { n.dupDelivered++; n.lastEvent = isAgedDup ? "agedDup" : "dup"; }
    else n.lastEvent = "pub";
    n.ledger.push(key); n.output.push(key);
  }
  // tunnel: response lost → client re-sends the same id once
  if (n.tunnel && !isAgedDup && !n.resent.includes(key)) { n.resent.push(key); n.queue.push(key); }
  // size-bound aging
  const cap = CAPS[n.capIdx];
  while (n.ledger.length > cap) { n.aged.push(n.ledger.shift()); }
  return n;
}

export default function AlmostExactlyOnce() {
  const [w, setW] = useState(initial);
  useEffect(() => { const id = setInterval(() => setW(step), 700); return () => clearInterval(id); }, []);
  const cap = CAPS[w.capIdx]; const days = winDays(cap); const pager = days < 1;
  const agedResendable = w.aged.find(k => w.output.includes(k) && !w.queue.includes(k + "!"));

  const verdict = (() => {
    if (w.crashed) return { c: RED, code: "CRASHED BETWEEN THE THREE ACTS", t: `The worker died after publishing ${w.diverged} to the output topic but before the RocksDB write landed — ledger and truth now disagree, and no transaction spanned them by design. The pipeline stays paused until the worker does what the design demands on every restart: consult the output topic and repair the checkpoint. RECOVER.` };
    if (w.lastEvent === "recovered" || (w.recoveredAt && w.t - w.recoveredAt < 3)) return { c: GREEN, code: "REPAIRED AGAINST THE OUTPUT TOPIC", t: "On restart the worker read the source of truth, found a message in the output that its ledger never recorded, and repaired the ledger to match. Recovery-by-reconciliation instead of distributed transactions: the output topic is both write-ahead log and final authority, RocksDB just a checkpoint that must always be rebuildable from it." };
    if (w.lastEvent === "agedDup") return { c: VIOLET, code: "PAST THE WINDOW, THROUGH THE DOOR", t: "That id was seen weeks ago — but its key aged out of the size-bound ledger, so the dedupe worker greeted it as new and published a duplicate downstream. This is the guarantee's honest edge: 'exactly once' means exactly once within a bounded, load-dependent memory. Cross-window duplicates are possible by design, which is why the window's size is monitored, not assumed." };
    if (pager) return { c: AMBER, code: "THE WINDOW BENT, THE SYSTEM DIDN'T", t: `Load spiked, and because deletion is size-bound rather than time-bound, the ledger shed oldest keys first: the dedup window just shrank to ~${days} days. Under 24 hours, the on-call engineer is paged — Segment chose to degrade the promise measurably instead of the availability suddenly, and instrumented exactly the place the promise thins.` };
    if (!w.dedupeOn && w.dupDelivered > 0) return { c: RED, code: "THE TUNNEL SENT IT TWICE", t: `The phone lost the response — not the request — so it correctly re-sent events the server already processed, and with no ledger they flowed straight through: ${w.dupDelivered} duplicate${w.dupDelivered > 1 ? "s" : ""} delivered downstream. This is the 0.6%: the measured cost of ambiguous failure when nobody dedupes. Turn the LEDGER on.` };
    if (w.dedupeOn && w.discarded > 0) return { c: GREEN, code: "SEEN, DISCARDED — ALMOST EXACTLY ONCE", t: `The re-sent ids hit the ledger's memory: ${w.discarded} duplicate${w.discarded > 1 ? "s" : ""} recognized and dropped, zero delivered twice. Most messages are new, so the bloom filter's 'definitely not in the set' answers the common case without touching an SSTable; the rare 'possibly seen' pays for the full lookup. Now SPIKE the load, or CRASH the worker mid-publish.` };
    if (w.tunnel) return { c: AMBER, code: "THE BUS IS IN THE TUNNEL", t: "Requests are landing; responses are dying. Watch the client's queue — every unacknowledged send comes back as a re-send of the same messageId. Nothing is misbehaving: retry is the only correct client move." };
    return { c: AMBER, code: "A PHONE, A PIPELINE, A LEDGER", t: "Events flow from the client through the dedupe worker to the output topic. Put the bus in the TUNNEL to manufacture the ambiguity, and choose whether the pipeline remembers what it has seen." };
  })();

  const mono = "'JetBrains Mono','Fira Code',ui-monospace,monospace";
  const S = {
    root: { background: "#08090D", color: "#c8cdd8", fontFamily: mono, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid #2a2a3a", fontSize: 12, lineHeight: 1.5 },
    panel: { background: "#111118", border: "1px solid #2a2a3a", borderRadius: 8, padding: 12 },
    label: { color: "#6b7080", fontSize: 10, letterSpacing: 1.2 },
    btn: (on, dis, col) => ({ padding: "7px 10px", borderRadius: 6, cursor: dis ? "not-allowed" : "pointer", opacity: dis ? 0.4 : 1, border: `1px solid ${on ? (col || ACCENT) : "#2a2a3a"}`, color: on ? (col || "#bfe8d6") : "#8b90a0", background: on ? "rgba(82,189,148,0.10)" : "#0c0d13", fontFamily: mono, fontSize: 11, marginRight: 6, marginTop: 6 }),
    chip: (c) => ({ display: "inline-block", padding: "2px 6px", margin: 2, borderRadius: 4, border: `1px solid ${c}`, color: c, fontSize: 10 }),
  };

  return (
    <div style={S.root}>
      <div style={{ color: ACCENT, fontSize: 10, letterSpacing: 2 }}>SEGMENT · EXACTLY-ONCE DELIVERY — INTERACTIVE</div>
      <div style={{ color: "#edeff3", fontSize: 16, margin: "4px 0 2px", fontWeight: 700 }}>Almost exactly once</div>
      <p style={{ color: "#8b90a0", fontSize: 11, margin: 0 }}>The ambiguity happens on the bus; the settlement happens in the ledger. You operate both ends.</p>
      <ContextBlock />

      <div style={{ marginTop: 12 }}>
        <button style={S.btn(w.tunnel, false, AMBER)} onClick={() => setW(x => ({ ...x, tunnel: !x.tunnel }))}>🚌 TUNNEL: {w.tunnel ? "IN (responses dying)" : "clear"}</button>
        <button style={S.btn(w.dedupeOn, false)} onClick={() => setW(x => ({ ...x, dedupeOn: !x.dedupeOn }))}>LEDGER: {w.dedupeOn ? "ON (has_seen?)" : "OFF"}</button>
        <button style={S.btn(w.capIdx > 0, false, AMBER)} onClick={() => setW(x => ({ ...x, capIdx: (x.capIdx + 1) % CAPS.length }))}>LOAD SPIKE (cap {cap} keys → window ~{days}d)</button>
        <button style={S.btn(false, w.crashed || !w.dedupeOn || w.output.length === 0)} onClick={() => setW(x => { const victim = x.ledger[x.ledger.length - 1]; if (!victim) return x; return { ...x, crashed: true, diverged: victim, ledger: x.ledger.slice(0, -1) }; })}>💥 CRASH WORKER (after publish, before ledger write)</button>
        <button style={S.btn(false, !w.crashed, VIOLET)} onClick={() => setW(x => ({ ...x, crashed: false, ledger: x.diverged ? [...x.ledger, x.diverged] : x.ledger, diverged: null, lastEvent: "recovered", recoveredAt: x.t }))}>RECOVER: CONSULT OUTPUT TOPIC</button>
        <button style={S.btn(false, !w.dedupeOn || !agedResendable, VIOLET)} onClick={() => setW(x => { const k = x.aged.find(a => x.output.includes(a) && !x.queue.includes(a + "!")); return k ? { ...x, queue: [...x.queue, k + "!"] } : x; })}>RE-SEND AN AGED-OUT ID</button>
        <button style={S.btn(false, false)} onClick={() => setW(initial())}>↺ RESET</button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
        <div style={{ flex: "2 1 460px", minWidth: 320 }}>
          <div style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${verdict.c}`, background: `${verdict.c}14`, marginBottom: 12 }}>
            <div style={{ color: verdict.c, fontWeight: 700 }}>{verdict.code}</div>
            <div style={{ marginTop: 5, fontSize: 11.5, lineHeight: 1.6 }}>{verdict.t}</div>
          </div>
          <div style={S.panel}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <div style={{ flex: "1 1 140px" }}>
                <div style={S.label}>CLIENT SEND QUEUE {w.tunnel ? "· re-queuing unacked ids" : ""}</div>
                <div style={{ marginTop: 4, minHeight: 40 }}>{w.queue.length ? w.queue.map((k, i) => <span key={i} style={S.chip(w.resent.includes(k.replace("!", "")) || k.endsWith("!") ? AMBER : "#8b90a0")}>{k}</span>) : <span style={{ color: "#4a4f60", fontSize: 10 }}>drained</span>}</div>
              </div>
              <div style={{ flex: "1 1 170px" }}>
                <div style={S.label}>ROCKSDB LEDGER · cap {cap} · window ~{days}d {pager ? "· 📟 PAGED" : ""}</div>
                <div style={{ marginTop: 4, minHeight: 40 }}>{w.ledger.map((k, i) => <span key={i} style={S.chip(ACCENT)}>{k}</span>)}{w.aged.map((k, i) => <span key={"a" + i} style={{ ...S.chip("#4a4f60"), textDecoration: "line-through" }}>{k}</span>)}</div>
                <div style={{ fontSize: 9.5, color: "#6b7080" }}>struck-through = aged out (size-bound, oldest first)</div>
              </div>
              <div style={{ flex: "1 1 150px" }}>
                <div style={S.label}>OUTPUT TOPIC (source of truth)</div>
                <div style={{ marginTop: 4, minHeight: 40 }}>{w.output.map((k, i) => <span key={i} style={S.chip(w.output.indexOf(k) !== i ? RED : GREEN)}>{k}</span>)}</div>
                <div style={{ fontSize: 9.5, color: "#6b7080" }}>red = a duplicate reached downstream</div>
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              <div style={{ flex: 1 }}><div style={S.label}>DUPES DELIVERED</div><div style={{ fontSize: 16, fontWeight: 700, color: w.dupDelivered ? RED : GREEN }}>{w.dupDelivered}</div></div>
              <div style={{ flex: 1 }}><div style={S.label}>DUPES DISCARDED</div><div style={{ fontSize: 16, fontWeight: 700, color: w.discarded ? GREEN : "#c8cdd8" }}>{w.discarded}</div></div>
              <div style={{ flex: 1 }}><div style={S.label}>KEYS HELD</div><div style={{ fontSize: 16, fontWeight: 700 }}>{w.ledger.length}/{cap}</div></div>
              <div style={{ flex: 1 }}><div style={S.label}>LEDGER ⇄ TRUTH</div><div style={{ fontSize: 13, fontWeight: 700, color: w.crashed ? RED : GREEN }}>{w.crashed ? "DIVERGED" : "in sync"}</div></div>
            </div>
          </div>
        </div>

        <div style={{ ...S.panel, flex: "1 1 230px", minWidth: 230 }}>
          <div style={S.label}>WHY THE PIECES ARE SHAPED THIS WAY</div>
          <div style={{ fontSize: 10.5, color: "#8b90a0", lineHeight: 1.7, marginTop: 4 }}>
            <span style={{ color: "#c8cdd8", fontWeight: 700 }}>The id:</span> a client-minted UUIDv4 — no vector clocks, no sequence numbers — so the client's whole obligation is "generate one and reuse it on retry."<br /><br />
            <span style={{ color: "#c8cdd8", fontWeight: 700 }}>The routing:</span> Kafka partitions by messageId, so each worker's embedded ledger answers has-seen for its slice only — a global search over hundreds of billions becomes a local one.<br /><br />
            <span style={{ color: "#c8cdd8", fontWeight: 700 }}>The window:</span> size-bound, not time-bound — under load the guarantee shrinks measurably instead of the store failing suddenly.<br /><br />
            <span style={{ color: "#c8cdd8", fontWeight: 700 }}>The truth:</span> no transaction spans ledger, output, and ack — so the output topic is crowned, and everything else repairs toward it.
          </div>
        </div>
      </div>

      <div style={{ color: "#6b7080", fontSize: 10, marginTop: 12, borderTop: "1px solid #2a2a3a", paddingTop: 8, lineHeight: 1.7 }}>
        The tunnel scenario, the 0.6%-in-four-weeks duplicate rate, the client-generated UUIDv4 messageId (vector clocks rejected for client simplicity), partitioning by messageId to narrow the search space, the per-worker embedded RocksDB ledger with bloom-filter fast paths and MultiGet batching, size-bound (not time-bound) aging with oldest-first deletion via a sequence-number index and the under-24-hours on-call page, the absence of any atomic step across RocksDB write / output publish / input acknowledgment, the output topic as write-ahead log and source of truth with repair on restart, EBS snapshots and detach/re-attach worker cycling, and the production numbers (200B messages, ~60B keys, 1.5 TB, 100× the old Memcached system) are all from the Segment Engineering post (Amir Abu Shareb, 2017). The eight-message lane, ten-key cap, and window durations here are illustrative miniatures of those mechanics.
        {" "}<a href="https://behindscale.com/articles/segment-exactly-once-delivery" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: "none" }}>From the full dissection at behindscale.com →</a>
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
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 8 }}><span style={lbl}>THE PROBLEM · </span>A phone that loses connectivity mid-upload can't know whether its events landed, so it correctly re-sends them — and 0.6% of everything Segment ingests in a four-week window is a duplicate the server already has. At billions of events, that's profit-versus-loss money.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>THE MOVE · </span>A client-minted messageId, Kafka partitioned by that id, and a per-worker RocksDB ledger answering has-seen within a four-week window that shrinks under load instead of failing — with the output topic crowned as source of truth, repaired against on every restart, because no transaction spans the ledger, the publish, and the ack.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>TRY · </span>Tunnel the bus with the ledger off and count duplicates downstream. Turn the ledger on and watch them get discarded. Spike the load and watch the window shrink to pager territory; crash the worker between publish and ledger-write and repair it from the truth; then re-send an aged-out id and meet the edge of "exactly once."</div>
    </div>
  );
}
