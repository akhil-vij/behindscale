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

// ---------- constants (scaled down; labeled on screen) ----------
const ACCENT = "#5865F2";
const RED = "#ef4444";
const AMBER = "#eab308";
const GREEN = "#22c55e";
const DT = 0.1;
const NODES = 20;              // 2017: one cluster of 20. 2025: same 20 across cells.
const SPREAD = 10;             // distinct nodes a mixed 2017 batch touches
const ARRIVAL = 50;            // msgs/s
const DRAIN = 60;              // worker capacity, msgs/s
const REDIS_CAP = 90;          // queue depth where Redis CPU maxes and drops begin
const DEAD_NODE = 7;
const RESTART_PER_NODE = 0.6;  // s, 2025 rolling restart
const DARK_WINDOW = 6;         // s, 2017 full-offline patch window
// fan-out failure odds with one dead node: 1 - (19/20)^SPREAD ~= 40% — the post's math, scaled

const INJECTIONS = [
  { id: "none", label: "HEALTHY", hint: "steady indexing traffic" },
  { id: "kill", label: "KILL A NODE", hint: "one data node dies — the post's 40% arithmetic" },
  { id: "log4", label: "LOG4SHELL PATCH", hint: "every node must restart with patched configs" },
  { id: "bfg", label: "GUILD HITS 2 BILLION", hint: "one index reaches Lucene's MAX_DOC ceiling" },
];

function verdictOf(era, injection, live) {
  const V = (sev, code, text) => ({ sev, code, text });
  const { dropped, success, restartDone } = live;
  if (injection === "none") {
    if (era === "2017") return V("ok", "WORKED — AT BILLIONS", "Two big clusters, lazy indexing, a Redis queue feeding bulk-index workers: performant, cost-effective, easy to operate. Every crack this artifact injects appeared only when the volume grew a thousandfold.");
    return V("ok", "SAME DECISION, NEW EVERYTHING AROUND IT", "Messages still route to their shard in application code — the 2017 decision, untouched. Around it: PubSub instead of Redis, a router batching by destination, and cells of small clusters on Kubernetes with dedicated master, ingest, and data roles.");
  }
  if (injection === "kill") {
    if (era === "2017") return V("bad", "ONE NODE DOWN — 40% OF BATCHES FAILING", `A batch of 50 messages fans out across the cluster, and one dead node fails the whole batch. Failures re-enqueue and the queue backs up toward the Redis ceiling${dropped > 0 ? ` — CPU maxed, ${Math.round(dropped)} messages dropped and counting. Search is silently going incomplete.` : " — watch it climb: once CPU maxes, messages start dropping, silently gone from search."}`);
    return V("ok", "ONE NODE DOWN — THAT NODE'S PROBLEM", `The router batched by destination, so each bulk operation talks to a single node: only the dead node's sub-batches retry (success holding at ${success}%). PubSub holds the backlog with guaranteed delivery — indexing slows, nothing is lost. Dropped: ${Math.round(dropped)}.`);
  }
  if (injection === "log4") {
    if (era === "2017") return V("bad", "PATCHING MEANS GOING DARK", `No safe rolling-restart path existed — log4shell forced taking search fully offline to restart every node with patched configs. The queue slams into its ceiling while the fleet reboots: ${Math.round(dropped)} messages dropped and counting.`);
    return restartDone
      ? V("ok", "PATCHED — NOBODY NOTICED", `Every node restarted, one at a time, while indexing continued (success ${success}%, dropped ${Math.round(dropped)}). With ECK, restarts and OS upgrades are automated routine, not an outage.`)
      : V("ok", "ROLLING RESTART IN PROGRESS", `ECK restarts nodes one at a time — the amber sweep — while shard allocation keeps every index served. Success holding at ${success}%; dropped: ${Math.round(dropped)}.`);
  }
  // bfg
  if (era === "2017") return V("bad", "THE TWO-BILLION WALL", "Each Elasticsearch index is a single Lucene index underneath, and Lucene has a MAX_DOC ceiling of about two billion. The biggest guilds hit it — every indexing operation for that index fails — and the recovery was finding large spammy guilds to delete. Not a strategy.");
  return V("ok", "A CELL FOR GIANTS", "Big guilds get a dedicated BFG cell whose indices run multiple primary shards, sidestepping the single-Lucene-index ceiling. Growing guilds migrate in via a six-step dual-index flow — new index, double writes, historical backfill, query switch, cleanup — with search up throughout. The cell abstraction, paying rent.");
}

const PROBES = {
  guild: {
    "2017": { badge: "PRESERVED", text: "hash(guild_id) → index + cluster, computed in application code. All of a guild's messages live together, so one query touches one place." },
    "2025": { badge: "PRESERVED", text: "hash(guild_id) → index + cluster — the same application-code routing, now resolving into a cell. The one decision the rewrite kept." },
  },
  dm: {
    "2017": { badge: null, text: "DMs shard by channel, exactly like guilds. Searching across all your DMs would mean querying every one of them separately — so it didn't exist." },
    "2025": { badge: "EXTENDED", text: "DMs now index twice: by channel, and by user_id into the dedicated user-dm cell — so one query searches every DM you have. The preserved decision didn't just survive; it gained a dimension." },
  },
};

export default function BlastRadius() {
  const [era, setEra] = useState("2017");
  const [injection, setInjection] = useState("none");
  const [probe, setProbe] = useState(null); // "guild" | "dm" | null
  const [, force] = useState(0);
  const w = useRef(null);

  const freshWorld = () => ({
    t: 0, rng: mulberry32(42),
    queue: 0, dropped: 0, indexed: 0,
    outcomes: [],           // rolling batch outcomes (1 success / 0 fail)
    lit: new Set(),         // nodes flashing this tick
    restartIdx: -1,         // 2025 rolling restart position
    restartDone: false,
    darkUntil: 0,           // 2017 offline window end
  });
  if (!w.current) w.current = freshWorld();
  const resetWorld = () => { w.current = freshWorld(); };

  const pickEra = (e) => { setEra(e); setInjection("none"); setProbe(null); resetWorld(); };
  const pickInjection = (id) => {
    setInjection(id); setProbe(null); resetWorld();
    if (id === "log4") {
      if (era === "2017") w.current.darkUntil = DARK_WINDOW;
      else w.current.restartIdx = 0;
    }
  };

  useEffect(() => {
    const id = setInterval(() => {
      const W = w.current;
      W.t += DT;
      W.lit = new Set();

      // node availability this tick
      const deadNodes = new Set();
      if (injection === "kill") deadNodes.add(DEAD_NODE);
      let restarting = -1;
      if (injection === "log4") {
        if (era === "2017") {
          if (W.t < W.darkUntil) for (let i = 0; i < NODES; i++) deadNodes.add(i);
        } else if (W.restartIdx >= 0 && W.restartIdx < NODES) {
          restarting = Math.floor(W.t / RESTART_PER_NODE);
          if (restarting >= NODES) { W.restartIdx = NODES; W.restartDone = true; restarting = -1; }
          else { W.restartIdx = restarting; deadNodes.add(restarting); }
        }
      }

      // arrivals
      W.queue += ARRIVAL * DT * (0.9 + W.rng() * 0.2);

      // drain
      let toProcess = Math.min(W.queue, DRAIN * DT);
      if (toProcess > 0.5) {
        if (era === "2017") {
          // one mixed batch fanning out across SPREAD distinct nodes
          let fail = false;
          for (let i = 0; i < SPREAD; i++) {
            const n = Math.floor(W.rng() * NODES);
            if (deadNodes.has(n)) fail = true; else W.lit.add(n);
          }
          if (deadNodes.size >= NODES) fail = true; // fully dark
          W.outcomes.push(fail ? 0 : 1);
          if (fail) {
            // whole batch re-enqueues (retry) — queue does not shrink
          } else {
            W.queue -= toProcess; W.indexed += toProcess;
          }
        } else {
          // router: per-destination sub-batches, each touching exactly one node
          const subs = 8;
          let retried = 0;
          for (let i = 0; i < subs; i++) {
            const n = Math.floor(W.rng() * NODES);
            if (deadNodes.has(n)) { retried += toProcess / subs; W.outcomes.push(0); }
            else { W.lit.add(n); W.outcomes.push(1); }
          }
          W.queue -= (toProcess - retried); // retried share stays in the backlog
          W.indexed += toProcess - retried;
        }
      }
      if (W.outcomes.length > 60) W.outcomes.splice(0, W.outcomes.length - 60);

      // queue ceiling: Redis drops above cap; PubSub tolerates backlogs
      if (era === "2017" && W.queue > REDIS_CAP) {
        W.dropped += W.queue - REDIS_CAP;
        W.queue = REDIS_CAP;
      }

      force((x) => x + 1);
    }, 100);
    return () => clearInterval(id);
  }, [era, injection]);

  // ---------- derived ----------
  const W = w.current;
  const success = W.outcomes.length ? Math.round((W.outcomes.reduce((a, b) => a + b, 0) / W.outcomes.length) * 100) : 100;
  const isDark = era === "2017" && injection === "log4" && W.t < W.darkUntil;
  const v = verdictOf(era, injection, { dropped: W.dropped, success, restartDone: W.restartDone });
  const sevColor = v.sev === "ok" ? GREEN : RED;
  const probeInfo = probe ? PROBES[probe][era] : null;

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
      border: `1px solid ${on ? ACCENT : "#2a2a3a"}`, color: on ? "#c7ccff" : "#8b90a0",
      background: on ? "rgba(88,101,242,0.10)" : "#0c0d13", fontFamily: mono, fontSize: 11,
    }),
  };

  const NodeDot = ({ idx }) => {
    const dead = (injection === "kill" && idx === DEAD_NODE) || isDark;
    const restarting = era === "2025" && injection === "log4" && !W.restartDone && idx === W.restartIdx;
    const lit = W.lit.has(idx) && !dead && !restarting;
    const bfgFull = injection === "bfg" && era === "2017" && idx === 3;
    const color = dead || bfgFull ? RED : restarting ? AMBER : lit ? ACCENT : "#2a2f45";
    return (
      <div title={`node ${idx}`} style={{
        width: 14, height: 14, borderRadius: 3, background: color,
        border: `1px solid ${dead || bfgFull ? RED : restarting ? AMBER : "#343a55"}`,
        transition: "background 150ms",
      }} />
    );
  };

  const nodeRange = (a, b) => Array.from({ length: b - a }, (_, i) => a + i);

  return (
    <div style={S.root}>
      <div style={S.eyebrow}>DISCORD · TRILLIONS OF MESSAGES — INTERACTIVE</div>
      <div style={S.h1}>The blast radius</div>
      <p style={S.sub}>The same indexing pipeline, eight years apart. Break it in 2017, break it in 2025 — and measure how far each failure reaches.</p>

      <ContextBlock />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
        {/* controls */}
        <div style={{ ...S.panel, flex: "1 1 240px", minWidth: 240 }}>
          <div style={S.label}>ARCHITECTURE</div>
          <button style={S.btn(era === "2017", false)} onClick={() => pickEra("2017")}>2017 · TWO BIG CLUSTERS<div style={{ color: "#6b7080", fontSize: 10 }}>Redis queue → mixed batches → one large cluster</div></button>
          <button style={S.btn(era === "2025", false)} onClick={() => pickEra("2025")}>2025 · CELLS OF SMALL CLUSTERS<div style={{ color: "#6b7080", fontSize: 10 }}>PubSub → router batches by destination → cells on k8s</div></button>

          <div style={{ ...S.label, marginTop: 14 }}>BREAK SOMETHING</div>
          {INJECTIONS.map((inj) => (
            <button key={inj.id} style={S.btn(injection === inj.id, false)} onClick={() => pickInjection(inj.id)}>
              {inj.label}<div style={{ color: "#6b7080", fontSize: 10 }}>{inj.hint}</div>
            </button>
          ))}

          <div style={{ ...S.label, marginTop: 14 }}>TRACE A MESSAGE</div>
          <button style={S.btn(probe === "guild", false)} onClick={() => setProbe(probe === "guild" ? null : "guild")}>WHERE DOES A GUILD MESSAGE GO?</button>
          <button style={S.btn(probe === "dm", false)} onClick={() => setProbe(probe === "dm" ? null : "dm")}>WHERE DOES A DM GO?</button>

          <button style={{ ...S.btn(false, false), marginTop: 14 }} onClick={resetWorld}>↺ RESET RUN · t = {W.t.toFixed(1)}s</button>
        </div>

        {/* verdict + pipeline */}
        <div style={{ flex: "2 1 400px", minWidth: 300 }}>
          <div style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${sevColor}`, background: `${sevColor}14`, marginBottom: 12 }}>
            <div style={{ color: sevColor, fontWeight: 700 }}>{v.code}</div>
            <div style={{ marginTop: 6, fontSize: 11.5, lineHeight: 1.6 }}>{v.text}</div>
          </div>

          {probeInfo && (
            <div style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${ACCENT}`, background: "rgba(88,101,242,0.08)", marginBottom: 12 }}>
              <div style={{ color: ACCENT, fontWeight: 700, fontSize: 11 }}>
                {probe === "guild" ? "ROUTE: GUILD MESSAGE" : "ROUTE: DIRECT MESSAGE"}
                {probeInfo.badge && <span style={{ marginLeft: 8, padding: "1px 6px", borderRadius: 4, fontSize: 9, letterSpacing: 1, background: probeInfo.badge === "PRESERVED" ? "rgba(34,197,94,0.15)" : "rgba(88,101,242,0.2)", color: probeInfo.badge === "PRESERVED" ? GREEN : "#c7ccff", border: `1px solid ${probeInfo.badge === "PRESERVED" ? GREEN : ACCENT}` }}>{probeInfo.badge}</span>}
              </div>
              <div style={{ marginTop: 6, fontSize: 11.5, lineHeight: 1.6 }}>{probeInfo.text}</div>
            </div>
          )}

          <div style={S.panel}>
            {/* pipeline: queue -> workers/router -> nodes */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "stretch" }}>
              <div style={{ flex: "1 1 150px", background: "#0c0d13", border: `1px solid ${era === "2017" && W.queue >= REDIS_CAP - 1 ? RED : "#2a2a3a"}`, borderRadius: 6, padding: "8px 10px" }}>
                <div style={{ fontSize: 9, letterSpacing: 1.5, color: "#6b7080" }}>{era === "2017" ? "REDIS QUEUE" : "PUBSUB QUEUE"}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: era === "2017" && W.queue >= REDIS_CAP - 1 ? RED : W.queue > 40 ? AMBER : "#c8cdd8" }}>{Math.round(W.queue)} msgs</div>
                <div style={{ height: 8, background: "#1a1b24", borderRadius: 4, marginTop: 5, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min(100, (W.queue / REDIS_CAP) * 100)}%`, background: era === "2017" && W.queue >= REDIS_CAP - 1 ? RED : ACCENT, transition: "width 150ms" }} />
                </div>
                <div style={{ fontSize: 9, color: "#6b7080", marginTop: 4 }}>{era === "2017" ? `drops above ${REDIS_CAP} (CPU maxed)` : "guaranteed delivery — backlogs tolerated"}</div>
              </div>
              <div style={{ flex: "1 1 130px", background: "#0c0d13", border: "1px solid #2a2a3a", borderRadius: 6, padding: "8px 10px" }}>
                <div style={{ fontSize: 9, letterSpacing: 1.5, color: "#6b7080" }}>{era === "2017" ? "WORKERS — MIXED BATCHES" : "MESSAGE ROUTER (RUST)"}</div>
                <div style={{ fontSize: 10.5, color: "#8b90a0", marginTop: 4, lineHeight: 1.5 }}>
                  {era === "2017" ? `a 50-message batch touches ~${SPREAD} of ${NODES} nodes; one bad node fails it all` : "batches grouped by destination — each bulk op talks to exactly one index and node"}
                </div>
              </div>
            </div>

            {/* the node grid */}
            <div style={{ marginTop: 12 }}>
              {era === "2017" ? (
                <div style={{ background: "#0c0d13", border: "1px solid #2a2a3a", borderRadius: 6, padding: 10 }}>
                  <div style={{ fontSize: 9, letterSpacing: 1.5, color: "#6b7080", marginBottom: 8 }}>ONE LARGE CLUSTER — {NODES} NODES, SHARED EVERYTHING{isDark ? " · OFFLINE FOR PATCHING" : ""}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {nodeRange(0, NODES).map((i) => <NodeDot key={i} idx={i} />)}
                  </div>
                  {injection === "bfg" && <div style={{ fontSize: 9.5, color: RED, marginTop: 6 }}>■ index on node 3: FULL — Lucene MAX_DOC reached; all its indexing fails</div>}
                </div>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <div style={{ flex: "2 1 220px", background: "#0c0d13", border: "1px solid #2a2a3a", borderRadius: 6, padding: 10 }}>
                    <div style={{ fontSize: 9, letterSpacing: 1.5, color: "#6b7080", marginBottom: 8 }}>GUILD-MESSAGES CELL — 2 SMALL CLUSTERS · dedicated master / ingest / data roles</div>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, maxWidth: 130 }}>{nodeRange(0, 6).map((i) => <NodeDot key={i} idx={i} />)}</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, maxWidth: 130 }}>{nodeRange(6, 12).map((i) => <NodeDot key={i} idx={i} />)}</div>
                    </div>
                  </div>
                  <div style={{ flex: "1 1 130px", background: "#0c0d13", border: `1px solid ${injection === "bfg" ? ACCENT : "#2a2a3a"}`, borderRadius: 6, padding: 10 }}>
                    <div style={{ fontSize: 9, letterSpacing: 1.5, color: injection === "bfg" ? "#c7ccff" : "#6b7080", marginBottom: 8 }}>BFG CELL — multi-primary-shard indices</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>{nodeRange(12, 16).map((i) => <NodeDot key={i} idx={i} />)}</div>
                  </div>
                  <div style={{ flex: "1 1 130px", background: "#0c0d13", border: `1px solid ${probe === "dm" ? ACCENT : "#2a2a3a"}`, borderRadius: 6, padding: 10 }}>
                    <div style={{ fontSize: 9, letterSpacing: 1.5, color: probe === "dm" ? "#c7ccff" : "#6b7080", marginBottom: 8 }}>USER-DM CELL — sharded by user_id</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>{nodeRange(16, 20).map((i) => <NodeDot key={i} idx={i} />)}</div>
                  </div>
                </div>
              )}
            </div>

            {/* meters */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              <div style={{ flex: "1 1 120px", background: "#0c0d13", border: "1px solid #2a2a3a", borderRadius: 6, padding: "8px 10px" }}>
                <div style={{ fontSize: 9, letterSpacing: 1.5, color: "#6b7080" }}>BULK SUCCESS</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: success > 90 ? GREEN : success > 65 ? AMBER : RED }}>{success}%</div>
              </div>
              <div style={{ flex: "1 1 120px", background: "#0c0d13", border: "1px solid #2a2a3a", borderRadius: 6, padding: "8px 10px" }}>
                <div style={{ fontSize: 9, letterSpacing: 1.5, color: "#6b7080" }}>INDEXED</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#c8cdd8" }}>{Math.round(W.indexed)}</div>
              </div>
              <div style={{ flex: "1 1 120px", background: "#0c0d13", border: `1px solid ${W.dropped > 0 ? RED : "#2a2a3a"}`, borderRadius: 6, padding: "8px 10px" }}>
                <div style={{ fontSize: 9, letterSpacing: 1.5, color: W.dropped > 0 ? RED : "#6b7080" }}>DROPPED — GONE FROM SEARCH</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: W.dropped > 0 ? RED : GREEN }}>{Math.round(W.dropped)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ color: "#6b7080", fontSize: 10, marginTop: 12, borderTop: "1px solid #2a2a3a", paddingTop: 8, lineHeight: 1.7 }}>
        Node counts, rates, and the queue ceiling are scaled down; the failure arithmetic is the post's (one dead node in a cluster a mixed batch sprays across fails ~40% of bulk operations — here 1 of {NODES} nodes with batches touching {SPREAD}, same math shape). The sourced mechanisms: a Redis-backed queue that dropped messages once CPU maxed under backlog; bulk batches fanning out so one node failure failed the batch; large clusters whose coordination overhead grew until masters OOMed (the reason cells of small clusters exist — capped near 200M messages / 50GB per index, dedicated node roles, zone-aware shard allocation); no rolling-restart path until Elasticsearch moved onto Kubernetes with ECK; Lucene's ~2-billion MAX_DOC ceiling and the BFG cell's multi-primary-shard indices with a six-step dual-index migration; PubSub's guaranteed delivery turning node failures into slowdowns instead of losses; and a Rust message router batching by destination. Measured results: trillions of messages indexed, ~2x indexing throughput, median query latency 500ms to under 100ms, p99 1s to under 500ms, across 40 clusters. The routing decision — application code hashing a message to its shard — is 2017's, unchanged.
        {" "}
        <a href="https://behindscale.com/articles/discord-trillions-message-search" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: "none" }}>From the full dissection at behindscale.com →</a>
      </div>
    </div>
  );
}

function ContextBlock() {
  const [open, setOpen] = useState(true);
  const lbl = { fontSize: 10, color: "#5865F2", letterSpacing: 1.2 };
  if (!open) return (
    <button onClick={() => setOpen(true)} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontFamily: "inherit", fontSize: 10, padding: 0, margin: "10px 0 0", display: "block" }}>SHOW CONTEXT ▾</button>
  );
  return (
    <div style={{ background: "#111118", border: "1px solid #2a2a3a", borderRadius: 8, padding: "12px 14px", marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <div style={{ fontSize: 10, color: "#6b7080", letterSpacing: 1.2 }}>CONTEXT — IF YOU ARRIVED HERE WITHOUT THE ARTICLE</div>
        <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontFamily: "inherit", fontSize: 10, padding: 0 }}>HIDE ✕</button>
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 8 }}><span style={lbl}>THE PROBLEM · </span>By trillions of messages, the failure modes all pointed at cluster bigness: one failed node in a 100-node cluster failed roughly 40% of bulk indexing operations, past 200 nodes the master's coordination work triggered OOM cascades, and rolling restarts got so slow the team ran unpatched versions until log4shell forced a full outage.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>THE MOVE · </span>Keep the 2017 decision that aged well — route messages to shards in application code — and replace everything it routes to: many small Elasticsearch cells instead of a few giant clusters, a queue that guarantees delivery instead of Redis, and indexing batched by destination.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>TRY · </span>Kill the same node in 2017 and 2025 and compare the blast radius. Force the log4shell patch. Run a guild into the two-billion-document wall. Then trace a guild message and a DM through both eras — and find the one decision that never changed.</div>
    </div>
  );
}
