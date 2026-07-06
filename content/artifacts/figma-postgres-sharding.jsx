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
const SHARDS = 4;                       // illustrative shard count
const RAMP_STEPS = [1, 10, 50, 100];    // illustrative flag ramp; the post says "gradually behind feature flags"
const COPY_MS = 4000;                   // animation time for the full copy
const ACCENT = "#A259FF";
const RED = "#EF4444";
const AMBER = "#F59E0B";

const STAGES = [
  { key: "unsharded", label: "UNSHARDED" },
  { key: "logical", label: "LOGICALLY SHARDED" },
  { key: "physical", label: "PHYSICAL SPLIT" },
  { key: "sharded", label: "SHARDED" },
];

const STAGE_CAPTIONS = [
  "One table, one Postgres host. Vertical partitioning cannot cut any finer than this — its smallest unit is a whole table.",
  "Views over the unsharded table make every read and write behave as if sharded. The data has not moved. Ramp the flag.",
  "Now the data moves: the entire dataset is copied to each new shard, then a failover cuts traffic across.",
  "Four physical shards. Routing is now authoritative topology, and a wrong route is the failure that cannot be tolerated.",
];

// Failure injections available per stage.
const INJECTIONS = {
  unsharded: [
    {
      id: "ceiling", label: "INJECT: HOT-TABLE WRITE SPIKE",
      hint: "traffic grows ~3x annually; this table is the biggest",
    },
  ],
  logical: [
    { id: "badroute-l", label: "INJECT: BAD ROUTING", hint: "a view predicate routes rows to the wrong logical shard" },
    { id: "unsupported", label: "INJECT: UNSUPPORTED QUERY", hint: "no shard key, join outside the colo" },
  ],
  physical: [
    { id: "partial", label: "INJECT: PARTIAL FAILOVER FAILURE", hint: "the operation succeeds on only a subset of databases" },
  ],
  sharded: [
    { id: "badroute-p", label: "INJECT: BAD ROUTING", hint: "stale topology sends a query to the wrong shard" },
    { id: "xshard", label: "INJECT: CROSS-SHARD TRANSACTION", hint: "a write spans two shard keys" },
  ],
};

function verdictOf(stageKey, injection, flagPct, copyPhase) {
  // Default (no injection): describe the state of the door.
  if (!injection) {
    if (stageKey === "unsharded") return {
      color: "#8b90a0", code: "DOOR: NOT YET BUILT",
      blast: null, rollback: null,
      note: "A single host holds the table. Vacuum reliability and max IOPS are per-instance ceilings, and this instance is already the largest RDS offers.",
    };
    if (stageKey === "logical") return {
      color: ACCENT, code: "DOOR: TWO-WAY",
      blast: `${flagPct}% of this table's traffic runs sharded semantics`,
      rollback: "config flip — traffic reroutes to the main table within seconds",
      note: "Reliability, latency, and consistency all behave as if sharded, while every row still sits on one host. Risk is being taken where it is cheap to un-take.",
    };
    if (stageKey === "physical") return {
      color: AMBER, code: "DOOR: SWINGING",
      blast: copyPhase === "failover" ? "about 10 seconds of partial availability on primaries; none on replicas" : "none yet — the copy runs alongside live traffic",
      rollback: "still possible — an explicit design goal — but now a coordinated data operation, not a flag",
      note: "The semantics were proven at the logical stage; only the physics is changing. That ordering is the post's signature move.",
    };
    return {
      color: ACCENT, code: "DOOR: PASSED",
      blast: null,
      rollback: "retained by design even after the split completes — at data-operation cost",
      note: "Each shard holds a full copy but restricts reads and writes to its owned subset. Topology updates propagate in under a second.",
    };
  }
  // Injections.
  switch (injection) {
    case "ceiling": return {
      color: RED, code: "BLAST RADIUS: THE WHOLE PRODUCT",
      blast: "every feature backed by this table degrades together — unpredictable latencies as utilization climbs",
      rollback: "none — there is no flag to flip and no bigger instance to buy; the only exit is the migration itself",
      note: "This is the crux: the smallest unit vertical partitioning can move is a whole table, and the hottest single tables are each approaching per-instance ceilings.",
    };
    case "badroute-l": return {
      color: AMBER, code: `BLAST RADIUS: ${flagPct}% OF TRAFFIC`,
      blast: `only the flagged ${flagPct}% reads through the bad predicate — the other ${100 - flagPct}% never left the main table`,
      rollback: "flip the flag to 0% — seconds. No data moved, so no data is wrong at rest",
      note: "This is why the ramp exists: bugs surface against live traffic while rollback is still a configuration change.",
    };
    case "unsupported": return {
      color: AMBER, code: "CAUGHT AT PLANNING",
      blast: "this query errors at the query engine — it never reaches Postgres",
      rollback: "not needed — rewrite the query or move the table's colo plan",
      note: "DBProxy deliberately supports the most common 90% of queries. Joins pass only between two tables in the same colo, on the sharding key. Shadow planning surfaced exactly these call-sites before any data moved.",
    };
    case "partial": return {
      color: AMBER, code: "FAILOVER SUCCEEDS ON A SUBSET",
      blast: "bounded to this table's cutover window — the failover was engineered to be resilient to exactly this new failure mode",
      rollback: "abort and re-point at the intact source — a data operation, rehearsed, but no longer a flag",
      note: "Going 1-to-N created failure modes 1-to-1 never had. Watch shard 2: it stalls, retries, and rejoins without restarting the copy.",
    };
    case "badroute-p": return {
      color: RED, code: "THE FAILURE THAT CANNOT BE TOLERATED",
      blast: "a query lands on a shard that does not own the rows — and returns an answer that is silently wrong (missing data)",
      rollback: "not a rollback problem — a prevention problem: real-time topology updates in under a second, backwards-compatible changes, and an enforced invariant that every shard ID maps to exactly one physical database",
      note: "Before the split, a routing bug was a performance bug. After it, a routing bug is a correctness bug. That asymmetry is what the whole logical rehearsal existed to de-risk.",
    };
    case "xshard": return {
      color: AMBER, code: "ATOMICITY IS NO LONGER FREE",
      blast: "a transaction spanning two shard keys can partially fail — one shard commits, the other does not",
      rollback: "n/a — the mitigation is structural: colos keep related tables on identical layouts so single-key transactions and joins never leave one shard",
      note: "Atomic cross-shard transactions sit on the post's named backlog. Until then, the data model — not the database — carries the guarantee.",
    };
    default: return null;
  }
}

// ---------- component ----------
export default function OneWayDoors() {
  const [stage, setStage] = useState(0);          // index into STAGES
  const [flagPct, setFlagPct] = useState(0);      // logical ramp
  const [copyProg, setCopyProg] = useState(0);    // 0..100
  const [copyPhase, setCopyPhase] = useState("idle"); // idle|copying|failover
  const [injection, setInjection] = useState(null);
  const [failShardUntil, setFailShardUntil] = useState(0); // ms timestamp for shard-3 stall visual
  const [route, setRoute] = useState(null);       // { kind, shards:[bool], until }
  const [ctxOpen, setCtxOpen] = useState(true);   // context block, expanded by default for the cold visitor
  const [, force] = useState(0);
  const rngRef = useRef(mulberry32(42));
  const timerRef = useRef(null);

  const stageKey = STAGES[stage].key;

  // copy/failover animation loop
  const progRef = useRef(0);
  const stallRef = useRef(0);
  useEffect(() => { stallRef.current = failShardUntil; }, [failShardUntil]);
  useEffect(() => {
    if (copyPhase === "copying") {
      let last = Date.now();
      timerRef.current = setInterval(() => {
        const now = Date.now();
        const dt = now - last; last = now;
        const stalled = now < stallRef.current;
        progRef.current = Math.min(100, progRef.current + (dt / COPY_MS) * 100 * (stalled ? 0.25 : 1));
        setCopyProg(progRef.current);
        if (progRef.current >= 100) setCopyPhase("failover");
        force((x) => x + 1);
      }, 80);
      return () => clearInterval(timerRef.current);
    }
    if (copyPhase === "failover") {
      const id = setTimeout(() => {
        setCopyPhase("idle");
        setStage(3);
        setInjection(null);
      }, 900);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [copyPhase]); // eslint-disable-line

  // route highlight expiry
  useEffect(() => {
    if (!route) return undefined;
    const id = setTimeout(() => setRoute(null), 1400);
    return () => clearTimeout(id);
  }, [route]);

  const v = verdictOf(stageKey, injection, flagPct, copyPhase);

  const doInject = (id) => {
    setInjection(id);
    if (id === "partial" && copyPhase === "copying") setFailShardUntil(Date.now() + 1400);
  };
  // if the failure was armed before the copy started, stall shard 2 early in the copy
  const armStallOnStart = () => {
    if (injection === "partial") setFailShardUntil(Date.now() + 2200);
  };

  const advance = () => {
    setInjection(null);
    setRoute(null);
    if (stage === 0) { setStage(1); setFlagPct(0); }
    else if (stage === 1 && flagPct >= 100) { setStage(2); setCopyProg(0); progRef.current = 0; setCopyPhase("idle"); }
  };
  const ramp = () => {
    const next = RAMP_STEPS.find((s) => s > flagPct);
    if (next) setFlagPct(next);
  };
  const runCopy = () => { if (copyPhase === "idle" && copyProg < 100) { armStallOnStart(); setCopyPhase("copying"); } };
  const reset = () => {
    setStage(0); setFlagPct(0); setCopyProg(0); progRef.current = 0; setFailShardUntil(0); setCopyPhase("idle");
    setInjection(null); setRoute(null); rngRef.current = mulberry32(42);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const routerEnabled = stage === 1 || stage === 3;
  const sendQuery = (kind) => {
    if (!routerEnabled) return;
    const hits = Array(SHARDS).fill(false);
    if (kind === "keyless") hits.fill(true);
    else hits[Math.floor(rngRef.current() * SHARDS)] = true;
    setRoute({ kind, shards: hits });
  };

  // ---------- styles ----------
  const mono = "'JetBrains Mono','Fira Code','SF Mono',ui-monospace,monospace";
  const S = {
    root: { background: "#08090D", color: "#C8CDD8", fontFamily: mono, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid #2a2a3a", fontSize: 12, lineHeight: 1.5 },
    eyebrow: { color: ACCENT, fontSize: 10, letterSpacing: 2 },
    h1: { color: "#EDEFF3", fontSize: 16, margin: "4px 0 2px", fontWeight: 700 },
    sub: { color: "#8b90a0", fontSize: 11, margin: 0 },
    rail: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, margin: "14px 0 6px" },
    stageChip: (i) => ({
      padding: "6px 10px", borderRadius: 6, fontSize: 11,
      border: `1px solid ${i === stage ? ACCENT : i < stage ? "#3d2b5e" : "#2a2a3a"}`,
      color: i === stage ? ACCENT : i < stage ? "#8b90a0" : "#4a4f5e",
      background: i === stage ? "rgba(162,89,255,0.08)" : "#111118",
    }),
    arrow: { color: "#4a4f5e", fontSize: 11 },
    caption: { color: "#8b90a0", fontSize: 11, minHeight: 30, margin: "2px 0 10px" },
    row: { display: "flex", flexWrap: "wrap", gap: 12 },
    panel: { background: "#111118", border: "1px solid #2a2a3a", borderRadius: 8, padding: 12 },
    label: { color: "#6b7080", fontSize: 10, letterSpacing: 1.2 },
    btn: (on, disabled) => ({
      display: "block", width: "100%", textAlign: "left", padding: "7px 9px", marginTop: 6, borderRadius: 6,
      cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1,
      border: `1px solid ${on ? ACCENT : "#2a2a3a"}`, color: on ? "#DCC6FF" : "#8b90a0",
      background: on ? "rgba(162,89,255,0.08)" : "#0c0d13", fontFamily: mono, fontSize: 11,
    }),
    verdict: { padding: "10px 12px", borderRadius: 8, border: `1px solid ${v.color}`, background: `${v.color}14`, marginBottom: 12 },
    dbBox: (lit, dead) => ({
      flex: "1 1 90px", minWidth: 90, borderRadius: 8, padding: 10,
      border: `1px solid ${dead ? RED : lit ? ACCENT : "#2a2a3a"}`,
      background: lit ? "rgba(162,89,255,0.10)" : "#0c0d13",
      transition: "border-color 200ms, background 200ms",
    }),
    bar: { height: 8, borderRadius: 4, background: "#1a1b24", marginTop: 6, overflow: "hidden", position: "relative" },
    foot: { color: "#6b7080", fontSize: 10, marginTop: 12, borderTop: "1px solid #2a2a3a", paddingTop: 8 },
  };

  // ---------- DB visualization pieces ----------
  const shardBoxes = () => {
    const stalled = Date.now() < failShardUntil;
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
        {Array.from({ length: SHARDS }, (_, i) => {
          const lit = route ? route.shards[i] : false;
          const isStall = stalled && i === 2 && stage === 2;
          const fill = stage === 2 ? copyProg * (isStall ? 0.92 : 1) : 100;
          return (
            <div key={i} style={S.dbBox(lit, isStall)}>
              <div style={{ color: lit ? ACCENT : "#8b90a0", fontSize: 10 }}>shard {i} {isStall ? "· RETRYING" : ""}</div>
              <div style={S.bar}>
                {/* full copy (dim) */}
                <div style={{ position: "absolute", inset: 0, width: `${Math.min(fill, 100)}%`, background: "#3d2b5e" }} />
                {/* owned subset (bright) — reads/writes restricted here after cutover */}
                {stage === 3 && (
                  <div style={{ position: "absolute", top: 0, bottom: 0, left: `${(i * 100) / SHARDS}%`, width: `${100 / SHARDS}%`, background: ACCENT }} />
                )}
              </div>
              <div style={{ color: "#4a4f5e", fontSize: 9, marginTop: 4 }}>
                {stage === 2 ? `full copy ${Math.floor(fill)}%` : `owns hash range ${i}/${SHARDS} — full copy retained`}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const mainBox = () => (
    <div style={{ ...S.dbBox(route && stage === 1 ? route.shards.some(Boolean) : false, false), maxWidth: stage >= 2 ? 220 : undefined }}>
      <div style={{ color: "#8b90a0", fontSize: 10 }}>db01 — the unsharded host {stage === 2 ? "· SOURCE (intact until cutover)" : ""}</div>
      <div style={S.bar}><div style={{ position: "absolute", inset: 0, width: "100%", background: stage >= 2 ? "#2a2a3a" : "#3d2b5e" }} /></div>
      {stage === 1 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {Array.from({ length: SHARDS }, (_, i) => {
            const lit = route ? route.shards[i] : false;
            return (
              <div key={i} style={{ flex: "1 1 80px", border: `1px dashed ${lit ? ACCENT : "#3d2b5e"}`, borderRadius: 6, padding: "5px 7px", color: lit ? ACCENT : "#6b7080", fontSize: 9 }}>
                VIEW shard{i} · hash range {i}/{SHARDS}
              </div>
            );
          })}
          <div style={{ flexBasis: "100%", color: "#4a4f5e", fontSize: 9 }}>
            views over the same table, each behind its own sharded connection pooler — semantics sharded, physics unchanged
          </div>
        </div>
      )}
    </div>
  );

  const flagBar = stage === 1 && (
    <div style={{ ...S.panel, marginTop: 8 }}>
      <div style={S.label}>FEATURE FLAG — {flagPct}% OF TRAFFIC THROUGH SHARDED VIEWS</div>
      <div style={S.bar}>
        <div style={{ position: "absolute", inset: 0, width: `${flagPct}%`, background: ACCENT }} />
      </div>
    </div>
  );

  const loadMeter = route && (
    <div style={{ marginTop: 8, color: route.kind === "keyless" ? AMBER : "#8b90a0", fontSize: 10 }}>
      {route.kind === "keyless"
        ? stage === 3
          ? `LOAD: ${SHARDS}x — a scatter-gather touches every database, contributing the same load as if the fleet were unsharded`
          : "LOAD: 1x — the scatter-gather plan is exercised against the views, but every view still lives on db01; the pattern is rehearsed, the cost is not yet real"
        : route.kind === "colo"
          ? "LOAD: 1x — join permitted: both tables share the colo and the join is on the sharding key"
          : "LOAD: 1x — the logical planner extracts the shard ID; the physical planner routes to one database"}
      {stage === 1 && " · (at this stage every route lands on db01 — the semantics are being rehearsed, not the physics)"}
    </div>
  );

  return (
    <div style={S.root}>
      <div style={S.eyebrow}>FIGMA · POSTGRES SHARDING — INTERACTIVE</div>
      <div style={S.h1}>One-way doors</div>
      <p style={S.sub}>Walk one hot table through Figma's migration. At every stage, break something — and watch what rollback costs.</p>

      {ctxOpen ? (
        <div style={{ ...S.panel, marginTop: 12, borderColor: "#3d2b5e" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
            <div style={S.label}>CONTEXT — IF YOU ARRIVED HERE WITHOUT THE ARTICLE</div>
            <button style={{ background: "none", border: "none", color: "#6b7080", cursor: "pointer", fontFamily: mono, fontSize: 10, padding: 0 }} onClick={() => setCtxOpen(false)}>HIDE ✕</button>
          </div>
          <div style={{ marginTop: 8 }}>
            <span style={{ color: ACCENT, fontSize: 10, letterSpacing: 1.2 }}>THE PROBLEM · </span>
            Figma's database stack grew almost 100x since 2020. Vertical partitioning ran out of road: its smallest unit is a whole table, and the hottest single tables were each approaching per-instance ceilings.
          </div>
          <div style={{ marginTop: 6 }}>
            <span style={{ color: ACCENT, fontSize: 10, letterSpacing: 1.2 }}>THE MOVE · </span>
            Shard in the application layer, staying on Postgres RDS — and rehearse the entire sharded topology with views and a feature flag before moving a single row.
          </div>
          <div style={{ marginTop: 6 }}>
            <span style={{ color: ACCENT, fontSize: 10, letterSpacing: 1.2 }}>TRY · </span>
            Walk the stages left to right. At each one, break something and read what rollback costs.
          </div>
        </div>
      ) : (
        <button style={{ background: "none", border: "none", color: "#6b7080", cursor: "pointer", fontFamily: mono, fontSize: 10, padding: 0, marginTop: 10, display: "block" }} onClick={() => setCtxOpen(true)}>SHOW CONTEXT ▾</button>
      )}

      <div style={S.rail}>
        {STAGES.map((st, i) => (
          <span key={st.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={S.stageChip(i)}>{st.label}</span>
            {i < STAGES.length - 1 && <span style={S.arrow}>→</span>}
          </span>
        ))}
        <button style={{ ...S.btn(false, false), display: "inline", width: "auto", marginTop: 0, marginLeft: "auto" }} onClick={reset}>↺ RESET</button>
      </div>
      <p style={S.caption}>{STAGE_CAPTIONS[stage]}</p>

      <div style={S.row}>
        {/* left: controls */}
        <div style={{ ...S.panel, flex: "1 1 230px", minWidth: 230 }}>
          <div style={S.label}>ADVANCE</div>
          {stage === 0 && <button style={S.btn(true, false)} onClick={advance}>CREATE VIEWS → GO LOGICAL<div style={{ color: "#6b7080", fontSize: 10 }}>load-tested first: under 10% overhead in the worst cases</div></button>}
          {stage === 1 && (
            <>
              <button style={S.btn(flagPct < 100, flagPct >= 100)} onClick={ramp}>
                RAMP FLAG {flagPct}% → {RAMP_STEPS.find((s) => s > flagPct) ?? 100}%
                <div style={{ color: "#6b7080", fontSize: 10 }}>shadow reads compare view vs non-view on live traffic as you ramp</div>
              </button>
              <button style={S.btn(flagPct >= 100, flagPct < 100)} onClick={advance} disabled={flagPct < 100}>
                BEGIN PHYSICAL SPLIT
                <div style={{ color: "#6b7080", fontSize: 10 }}>{flagPct < 100 ? "ramp to 100% first — prove the semantics before moving bytes" : "the sharded topology has already been running in production"}</div>
              </button>
            </>
          )}
          {stage === 2 && (
            <button style={S.btn(copyPhase === "idle" && copyProg < 100, copyPhase !== "idle")} onClick={runCopy}>
              {copyPhase === "failover" ? "FAILING OVER…" : copyPhase === "copying" ? `COPYING… ${Math.floor(copyProg)}%` : "RUN COPY + FAILOVER"}
              <div style={{ color: "#6b7080", fontSize: 10 }}>full logical replication: the entire dataset goes to each shard — no filtered subsets</div>
            </button>
          )}
          {stage === 3 && <div style={{ color: "#6b7080", fontSize: 10, marginTop: 6 }}>Arrived. First table: ~9 months end to end, live September 2023, 10 seconds of partial availability on primaries.</div>}

          <div style={{ ...S.label, marginTop: 14 }}>BREAK SOMETHING</div>
          {INJECTIONS[stageKey].map((inj) => (
            <button key={inj.id} style={S.btn(injection === inj.id, false)} onClick={() => doInject(inj.id)}>
              {inj.label}
              <div style={{ color: "#6b7080", fontSize: 10 }}>{inj.hint}</div>
            </button>
          ))}

          <div style={{ ...S.label, marginTop: 14 }}>DBPROXY ROUTER {routerEnabled ? "" : "— OFFLINE DURING THIS STAGE"}</div>
          <button style={S.btn(false, !routerEnabled)} onClick={() => sendQuery("keyed")} disabled={!routerEnabled}>
            SEND KEYED QUERY<div style={{ color: "#6b7080", fontSize: 10 }}>WHERE file_id = … — hash routes to one shard</div>
          </button>
          <button style={S.btn(false, !routerEnabled)} onClick={() => sendQuery("colo")} disabled={!routerEnabled}>
            SEND COLO JOIN<div style={{ color: "#6b7080", fontSize: 10 }}>two tables, same colo, joined on the shard key</div>
          </button>
          <button style={S.btn(false, !routerEnabled)} onClick={() => sendQuery("keyless")} disabled={!routerEnabled}>
            SEND KEYLESS QUERY<div style={{ color: "#6b7080", fontSize: 10 }}>no shard key — scatter-gather to every shard</div>
          </button>
        </div>

        {/* right: verdict + database picture */}
        <div style={{ flex: "2 1 380px", minWidth: 300 }}>
          <div style={S.verdict}>
            <div style={{ color: v.color, fontWeight: 700 }}>{v.code}</div>
            {v.blast && <div style={{ marginTop: 4 }}><span style={S.label}>BLAST RADIUS · </span>{v.blast}</div>}
            {v.rollback && <div style={{ marginTop: 4 }}><span style={S.label}>ROLLBACK COST · </span>{v.rollback}</div>}
            <div style={{ color: "#8b90a0", marginTop: 6, fontSize: 11 }}>{v.note}</div>
          </div>

          <div style={S.panel}>
            <div style={S.label}>THE TABLE</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {stage <= 2 && mainBox()}
              {stage >= 2 && <div style={{ flexBasis: "100%" }}>{shardBoxes()}</div>}
            </div>
            {flagBar}
            {loadMeter}
          </div>
        </div>
      </div>

      <div style={S.foot}>
        Shard count, ramp percentages, and animation timing are illustrative. The sourced mechanisms: views over the unsharded table (under 10% worst-case overhead, validated by shadow reads on live traffic), feature-flag rollout with seconds-scale rollback, full — not filtered — logical replication with reads and writes restricted to each shard's owned subset, a query engine covering the most common 90% of queries with joins only inside a colo on the shard key, scatter-gathers costing as much as an unsharded fleet, sub-second topology propagation, and a first failover with 10 seconds of partial availability on primaries. Rollback after physical sharding was a stated design goal — the door is engineered to stay two-way, at rising cost.
        {" "}
        <a href="https://behindscale.com/articles/figma-postgres-sharding" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: "none" }}>From the full dissection at behindscale.com →</a>
      </div>
    </div>
  );
}
