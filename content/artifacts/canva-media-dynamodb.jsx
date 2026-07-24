import { useState } from "react";

const ACCENT = "#00C4CC";
const RED = "#ef4444"; const AMBER = "#eab308"; const GREEN = "#22c55e"; const VIOLET = "#9b8cf0";

const initial = () => ({ stage: "mysql", media: 400, runway: { json: false, denorm: false, shard: false }, repl: 0, dualRead: "none", ecReads: false, rehearsed: false, cut: false, flagBack: false, last: null });

// Walls light as media (millions) crosses thresholds; stopgaps raise specific thresholds.
function walls(w) {
  const t = (base, raised, on) => (w.media >= (on ? raised : base));
  return {
    ddl: { lit: t(800, 3200, w.runway.json), name: "SCHEMA CHANGES → 6 WEEKS", fix: "JSON column" },
    repl: { lit: t(800, 3200, w.runway.shard), name: "REPLICATION RATE CEILING", fix: "shard by ID" },
    ebs: { lit: t(1600, 6400, w.runway.shard), name: "EBS 16TB + I/O TAIL LATENCY", fix: "shard by ID" },
    ext3: { lit: t(1600, 6400, w.runway.shard), name: "EXT3 2TB TABLE FILE LIMIT", fix: "shard by ID" },
  };
}
const litCount = (w) => Object.values(walls(w)).filter(x => x.lit).length;

function act(w, a) {
  const n = { ...w, runway: { ...w.runway }, last: a };
  if (a === "grow" && n.stage === "mysql") n.media = n.media * 2;
  else if (a === "json" && n.stage === "mysql") n.runway.json = true;
  else if (a === "denorm" && n.stage === "mysql") n.runway.denorm = true;
  else if (a === "shard" && n.stage === "mysql") n.runway.shard = true;
  else if (a === "migrate" && n.stage === "mysql") n.stage = "migrating";
  else if (a === "replicate" && n.stage === "migrating" && n.repl < 100) n.repl = n.repl === 0 ? 40 : Math.min(100, n.repl + 20);
  else if (a === "list") { /* recorded via last; gating in verdict */ }
  else if (a === "compare" && n.stage === "migrating") n.dualRead = n.dualRead === "none" ? "found" : "fixed";
  else if (a === "ecreads" && n.stage === "migrating" && n.dualRead === "fixed") n.ecReads = true;
  else if (a === "tocutover" && n.stage === "migrating" && n.repl === 100 && n.ecReads) n.stage = "cutover";
  else if (a === "rehearse" && n.stage === "cutover") n.rehearsed = true;
  else if (a === "cut" && n.stage === "cutover" && n.rehearsed) n.cut = true;
  else if (a === "flag" && n.cut) n.flagBack = !n.flagBack;
  else if (a === "years" && n.cut) n.stage = "retro";
  return n;
}

export default function EveryCeilingAtOnce() {
  const [w, setW] = useState(initial);
  const W = walls(w); const lit = litCount(w);
  const mediaLabel = w.media >= 1000 ? (w.media / 1000).toFixed(1) + "B" : w.media + "M";

  const verdict = (() => {
    if (w.stage === "retro") return { c: VIOLET, code: "THE EXIT'S BILL, ITEMIZED", t: "Five years on: MAU more than tripled, DynamoDB autoscaled through all of it at lower cost than the RDS it replaced, 25B+ media stored. The bill: schema changes now mean writing and rigorously testing parallel-scan migration code; ad-hoc SQL is gone (rebuilt as CDC to the warehouse); composite GSIs are hand-concatenated attributes. And the timestamped candor: facing this today, they'd strongly consider hosted NewSQL — Spanner or CockroachDB. The fourth pole of the class's answer taxonomy has a date on it." };
    if (w.stage === "cutover" && w.cut && w.flagBack) return { c: AMBER, code: "SECONDS TO MYSQL AND BACK", t: "The flag flipped and reads are back on MySQL — the rollback the run book priced at seconds, which is exactly why switching writes was survivable risk instead of a bet. Flip it back and press on." };
    if (w.stage === "cutover" && w.cut) return { c: GREEN, code: "CUT OVER IN SILENCE", t: "Writes now land on DynamoDB through new code holding the old contracts with transactional and conditional writes. No downtime, no errors — and median and p95 latency IMPROVED through the migration window. It reads as luck only if you skip the apparatus: both-implementation test matrices, a rehearsed run book, a seconds-priced rollback flag. Let the YEARS PASS." };
    if (w.stage === "cutover") return { c: AMBER, code: "THE RISKIEST STEP WANTS A REHEARSAL", t: "Switching writes is named the riskiest part of the whole process — new service code must guarantee the previous implementation's contracts. The run book exists; it gets rehearsed through development and staging before production gets to see it. REHEARSE, then SWITCH WRITES." };
    if (w.stage === "migrating" && w.last === "list" && w.repl < 100) return { c: AMBER, code: "LIST-BY-USER MUST WAIT FOR THE SCAN", t: `Replication is at ${w.repl}% — but this query doesn't name an ID, so it can't serve from DynamoDB until every media has replicated. Capability arrives per access pattern, not per percentage: hot point-reads are already servable; population queries wait for 100%.` };
    if (w.stage === "migrating" && w.dualRead === "found") return { c: AMBER, code: "COMPARED IN PRODUCTION, BUG CAUGHT EARLY", t: "The dual-read comparison — every read served by MySQL and checked against the DynamoDB implementation — just surfaced a replication bug that test environments never would have. That's the lesson printed as an imperative: the data in production is always more interesting. COMPARE again after the fix." };
    if (w.stage === "migrating" && w.repl >= 100 && w.ecReads) return { c: GREEN, code: "THE SCAN IS DONE — EVERY QUERY SHAPE SERVES", t: "100% replicated: list-by-user and every other ID-less query can now read from DynamoDB, dual-read checked like the rest. Eventually consistent reads are already off MySQL. PROCEED TO CUTOVER — the writes are all that remain." };
    if (w.stage === "migrating" && w.repl > 0) return { c: GREEN, code: "REPLICATED HOT-FIRST", t: `${w.repl}% replicated — the hot set first: content-free SQS events (created / updated / read, never the content) captured live, workers re-reading truth from the MySQL primary and writing DynamoDB idempotently, so reorder and retry cost nothing. The scan walks the archive most-recent-first, under backpressure, only while the live queue runs empty. Try LIST-BY-USER mid-flight; run the DUAL-READ COMPARE.` };
    if (w.stage === "migrating") return { c: AMBER, code: "MIGRATE WITHOUT TOUCHING A USER", t: "The target is chosen — DynamoDB, on a short runway, a managed-service preference, and a working prototype — and the constraint is absolute: no user impact, zero-downtime cutover. Start REPLICATING: writes on the high-priority queue, reads on low, hot data first." };
    if (lit >= 3) return { c: RED, code: "EVERY CEILING AT ONCE", t: `${mediaLabel} media and ${lit} walls lit simultaneously: ${Object.values(W).filter(x => x.lit).map(x => x.name.toLowerCase()).join("; ")}. Several belong to the rented substrate, not MySQL — EBS volume caps, ext3 file limits from snapshot provenance. Stopgaps buy runway; only the MIGRATION removes the walls.` };
    if (w.last && ["json", "denorm", "shard"].includes(w.last) && lit === 0 && w.media >= 800) return { c: AMBER, code: "RUNWAY BOUGHT, WALLS DARK — FOR NOW", t: `The stopgap worked: ${w.last === "json" ? "the hottest schema churn moved into a JSON column the service manages itself" : w.last === "shard" ? "ID-range sharding dodges the file limit and replication ceiling — and prices every non-ID query as scatter-gather" : "denormalization relieved lock contention at the cost of relational hygiene"}. Keep GROWING and watch the thresholds come back.` };
    if (lit > 0) return { c: AMBER, code: "THE WALLS ARE LIGHTING IN FORMATION", t: `${mediaLabel} media. ${lit} ceiling${lit > 1 ? "s" : ""} lit. Stopgaps can raise these thresholds — JSON COLUMN for the schema wall, SHARD BY ID for the file/replication walls — but each grow doubles the media, and doubled media finds raised thresholds fast.` };
    return { c: AMBER, code: "A THIN LAYER OVER RDS, GROWING", t: `${mediaLabel} media on MySQL/RDS: vertical scaling, then eventually consistent replica reads. Read-heavy, recency-skewed, rarely modified after create. Press GROW and watch which walls arrive first — and notice how many belong to the substrate, not the database.` };
  })();

  const mono = "'JetBrains Mono','Fira Code',ui-monospace,monospace";
  const S = {
    root: { background: "#08090D", color: "#c8cdd8", fontFamily: mono, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid #2a2a3a", fontSize: 12, lineHeight: 1.5 },
    panel: { background: "#111118", border: "1px solid #2a2a3a", borderRadius: 8, padding: 12 },
    label: { color: "#6b7080", fontSize: 10, letterSpacing: 1.2 },
    btn: (on, dis, col) => ({ display: "block", width: "100%", textAlign: "left", padding: "7px 9px", marginTop: 6, borderRadius: 6, cursor: dis ? "not-allowed" : "pointer", opacity: dis ? 0.4 : 1, border: `1px solid ${on ? (col || ACCENT) : "#2a2a3a"}`, color: on ? "#aef2f5" : "#8b90a0", background: on ? "rgba(0,196,204,0.10)" : "#0c0d13", fontFamily: mono, fontSize: 11 }),
  };
  const D = (a) => () => setW(x => act(x, a));
  const mysql = w.stage === "mysql"; const mig = w.stage === "migrating"; const cutov = w.stage === "cutover";

  return (
    <div style={S.root}>
      <div style={{ color: ACCENT, fontSize: 10, letterSpacing: 2 }}>CANVA · SCALING MEDIA TO 50M UPLOADS/DAY — INTERACTIVE</div>
      <div style={{ color: "#edeff3", fontSize: 16, margin: "4px 0 2px", fontWeight: 700 }}>Every ceiling at once</div>
      <p style={{ color: "#8b90a0", fontSize: 11, margin: 0 }}>You run the media service through hypergrowth: light the walls, spend the stopgaps, then leave relational without touching a user.</p>
      <ContextBlock />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
        <div style={{ ...S.panel, flex: "1 1 250px", minWidth: 250 }}>
          <div style={S.label}>MYSQL ERA</div>
          <button style={S.btn(false, !mysql)} disabled={!mysql} onClick={D("grow")}>GROW ×2 (media: {mediaLabel})</button>
          <button style={S.btn(w.runway.json, !mysql || w.runway.json)} disabled={!mysql || w.runway.json} onClick={D("json")}>STOPGAP: METADATA → JSON COLUMN</button>
          <button style={S.btn(w.runway.denorm, !mysql || w.runway.denorm)} disabled={!mysql || w.runway.denorm} onClick={D("denorm")}>STOPGAP: DENORMALIZE, DROP FKs</button>
          <button style={S.btn(w.runway.shard, !mysql || w.runway.shard)} disabled={!mysql || w.runway.shard} onClick={D("shard")}>STOPGAP: SHARD BY ID RANGE{w.runway.shard ? " (scatter-gather tax active)" : ""}</button>
          <button style={S.btn(false, !mysql, VIOLET)} disabled={!mysql} onClick={D("migrate")}>BEGIN THE LIVE MIGRATION →</button>
          <div style={{ ...S.label, marginTop: 12 }}>MIGRATION (LIVE)</div>
          <button style={S.btn(false, !mig || w.repl >= 100)} disabled={!mig || w.repl >= 100} onClick={D("replicate")}>REPLICATE ({w.repl}% — hot-first, backpressured)</button>
          <button style={S.btn(false, !mig)} disabled={!mig} onClick={D("list")}>QUERY: LIST ALL MEDIA BY USER</button>
          <button style={S.btn(w.dualRead === "fixed", !mig || w.dualRead === "fixed")} disabled={!mig || w.dualRead === "fixed"} onClick={D("compare")}>DUAL-READ COMPARE {w.dualRead === "none" ? "" : w.dualRead === "found" ? "(bug found — fix & re-run)" : "(clean)"}</button>
          <button style={S.btn(w.ecReads, !mig || w.dualRead !== "fixed" || w.ecReads)} disabled={!mig || w.dualRead !== "fixed" || w.ecReads} onClick={D("ecreads")}>SERVE EC READS FROM DYNAMODB</button>
          <button style={S.btn(false, !(mig && w.repl === 100 && w.ecReads), VIOLET)} disabled={!(mig && w.repl === 100 && w.ecReads)} onClick={D("tocutover")}>PROCEED TO CUTOVER →</button>
          <div style={{ ...S.label, marginTop: 12 }}>CUTOVER</div>
          <button style={S.btn(w.rehearsed, !cutov || w.rehearsed)} disabled={!cutov || w.rehearsed} onClick={D("rehearse")}>REHEARSE THE RUN BOOK (dev → staging)</button>
          <button style={S.btn(w.cut, !cutov || !w.rehearsed || w.cut, GREEN)} disabled={!cutov || !w.rehearsed || w.cut} onClick={D("cut")}>SWITCH ALL WRITES TO DYNAMODB</button>
          <button style={S.btn(w.flagBack, !w.cut || w.stage === "retro", AMBER)} disabled={!w.cut || w.stage === "retro"} onClick={D("flag")}>FLIP THE ROLLBACK FLAG (seconds)</button>
          <button style={S.btn(false, !w.cut || w.stage === "retro", VIOLET)} disabled={!w.cut || w.stage === "retro"} onClick={D("years")}>LET THE YEARS PASS →</button>
          <button style={{ ...S.btn(false, false), marginTop: 12 }} onClick={() => setW(initial())}>↺ RESET</button>
        </div>

        <div style={{ flex: "2 1 440px", minWidth: 300 }}>
          <div style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${verdict.c}`, background: `${verdict.c}14`, marginBottom: 12 }}>
            <div style={{ color: verdict.c, fontWeight: 700 }}>{verdict.code}</div>
            <div style={{ marginTop: 5, fontSize: 11.5, lineHeight: 1.6 }}>{verdict.t}</div>
          </div>
          <div style={S.panel}>
            <div style={S.label}>{mysql ? "THE WALL PANEL — CEILINGS LIGHT AS MEDIA GROWS" : "THE WALL PANEL — WHAT THE MIGRATION EXISTS TO REMOVE"}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {Object.entries(W).map(([k, x]) => (
                <div key={k} style={{ flex: "1 1 180px", background: "#0c0d13", border: `1px solid ${!mysql ? "#2a2f45" : x.lit ? RED : "#2a2f45"}`, borderRadius: 6, padding: "8px 10px", opacity: mysql ? 1 : 0.55 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: !mysql ? "#6b7080" : x.lit ? RED : GREEN }}>{!mysql ? "◌ " : x.lit ? "▲ " : "○ "}{x.name}</div>
                  <div style={{ fontSize: 9, color: "#6b7080", marginTop: 2 }}>{mysql ? (x.lit ? "LIT — the wall is here" : `dark · raised by: ${x.fix}`) : "left behind at cutover"}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              <div style={{ flex: 1 }}><div style={S.label}>MEDIA</div><div style={{ fontSize: 16, fontWeight: 700, color: ACCENT }}>{mediaLabel}</div></div>
              <div style={{ flex: 1 }}><div style={S.label}>WALLS LIT</div><div style={{ fontSize: 16, fontWeight: 700, color: mysql && lit >= 3 ? RED : mysql && lit > 0 ? AMBER : GREEN }}>{mysql ? lit : "—"}/4</div></div>
              <div style={{ flex: 1 }}><div style={S.label}>REPLICATED</div><div style={{ fontSize: 16, fontWeight: 700, color: w.repl === 100 ? GREEN : "#c8cdd8" }}>{w.repl}%</div></div>
              <div style={{ flex: 1 }}><div style={S.label}>SERVING</div><div style={{ fontSize: 13, fontWeight: 700, color: w.cut ? GREEN : "#c8cdd8" }}>{w.stage === "retro" ? "DynamoDB · 25B+" : w.cut ? (w.flagBack ? "MySQL (flag)" : "DynamoDB") : w.ecReads ? "mixed (EC→DDB)" : "MySQL"}</div></div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ color: "#6b7080", fontSize: 10, marginTop: 12, borderTop: "1px solid #2a2a3a", paddingTop: 8, lineHeight: 1.7 }}>
        The wall list (days-then-six-weeks schema migrations even with gh-ost, MySQL 5.6 replication rate limits, RDS EBS 16TB with I/O tail-latency per size increase, hot-buffer-pool restart downtime, ext3-snapshot 2TB table files), the ~1B-media mid-2017 inflection, the stopgaps (JSON-column metadata, denormalization and dropped foreign keys, shortened repeated content, ID-range sharding with scatter-gather costs), the DynamoDB selection reasoning, the content-free SQS change events with truth re-read from the MySQL primary, high/low priority queues (writes over reads), the most-recent-first backpressured scan, the dual-read production comparison that surfaced replication bugs, EC reads with MySQL fallback, the ID-less-queries-wait-for-100% constraint, the transactional/conditional-write cutover with rehearsed run book and seconds-priced rollback flag, the seamless zero-downtime result with improved latency, and the retrospective (tripled MAU, lower cost than RDS, parallel-scan migration code, CDC-to-warehouse for ad-hoc queries, hand-concatenated GSIs, would-consider-NewSQL-today) are all from the Canva Engineering post (Jacky Chen and Robert Sharp, 2022). The media-count thresholds and four-wall panel are an illustrative compression of that list.
        {" "}<a href="https://behindscale.com/articles/canva-media-dynamodb" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: "none" }}>From the full dissection at behindscale.com →</a>
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
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 8 }}><span style={lbl}>THE PROBLEM · </span>Canva's media tables hit every MySQL ceiling at once — six-week schema migrations blocking releases, replication rate caps, EBS volume limits, ext3's 2TB table files — several of them belonging to the rented RDS substrate rather than to MySQL itself, with media approaching a billion and doubling.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>THE MOVE · </span>Buy runway with honest stopgaps, then exit relational entirely: a live migration to DynamoDB via content-free SQS change events (workers re-read truth from MySQL and write idempotently — reorder and retry free), hot data first under backpressure, dual-read compared in production, cut over behind a rehearsed run book with a seconds-priced rollback flag. Zero downtime; latency improved.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>TRY · </span>Grow until the wall panel lights in formation; spend each stopgap and watch doubled media find the raised thresholds. Then run the migration in order — try list-by-user mid-flight and learn why capability arrives per access pattern, catch the bug the production comparison finds, rehearse before you switch writes, and read the exit's itemized bill at the end.</div>
    </div>
  );
}
