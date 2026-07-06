import { useState, useEffect, useRef } from "react";

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ACCENT = "#58A6FF";
const RED = "#ef4444";
const AMBER = "#eab308";
const GREEN = "#22c55e";

// ---- Stage A: the linter playground (queries adapted from the post's own examples) ----
const QUERIES = [
  {
    id: "q1", sql: "SELECT * FROM gists WHERE user_id = ?", domains: "gists",
    clean: true, note: "one domain — the linter has nothing to say",
  },
  {
    id: "q2", sql: "SELECT * FROM repositories INNER JOIN users ON users.id = repositories.owner_id", domains: "repositories + users",
    clean: false,
    fixes: [
      { id: "exempt", label: "ANNOTATE /* cross-schema-domain-query-exempted */", kind: "exempt", note: "CI passes again — and the query joins the burndown backlog" },
      { id: "split", label: "SPLIT: two queries, union in Ruby", kind: "fix", note: "app-side join; shipped behind a Scientist experiment — occasionally faster than the planner" },
    ],
  },
  {
    id: "q3", sql: "has_many :repositories, through: :teams   # JOINs across domains", domains: "users + repositories",
    clean: false,
    fixes: [
      { id: "exempt", label: "ANNOTATE /* cross-schema-domain-query-exempted */", kind: "exempt", note: "backlogged, not fixed" },
      { id: "dj", label: "disable_joins: true  (upstreamed to Rails 7)", kind: "fix", note: "Active Record runs sequential queries on primary keys instead of one JOIN" },
    ],
  },
  {
    id: "q4", sql: "TRANSACTION { update issues; insert reactions }  # polymorphic table", domains: "repositories + reactions(mixed)",
    clean: false,
    fixes: [
      { id: "exempt", label: "ANNOTATE (transaction linter, prod-sampled)", kind: "exempt", note: "sampled in production; the consistency loss stays live" },
      { id: "extract", label: "EXTRACT per-domain table (reactions -> issue_reactions)", kind: "fix", note: "rows that must commit together stay on one cluster — the schema bends to topology" },
    ],
  },
];

const CUT_STEPS = [
  { id: 1, label: "Enable read-only on cluster_a primary", ms: [3, 6], writesFail: true },
  { id: 2, label: "Read last executed GTID from cluster_a", ms: [2, 4], writesFail: true },
  { id: 3, label: "Poll cluster_b until that GTID arrives", ms: [4, 9], lagMs: [1150, 1400], writesFail: true },
  { id: 4, label: "Stop replication on cluster_b", ms: [3, 5], writesFail: true },
  { id: 5, label: "Flip ProxySQL routing to cluster_b primary", ms: [4, 7], writesFail: true },
  { id: 6, label: "Disable read-only on both primaries", ms: [3, 5], writesFail: false },
];

export default function TensOfMilliseconds() {
  const [tab, setTab] = useState("lint");
  const [resolved, setResolved] = useState({}); // qid -> "exempt" | "fix"
  const [running, setRunning] = useState(false);
  const [stepIdx, setStepIdx] = useState(-1);
  const [clockMs, setClockMs] = useState(0);
  const [failedWrites, setFailedWrites] = useState(0);
  const [doneRun, setDoneRun] = useState(null); // { windowMs, failed, lag, peak }
  const [lag, setLag] = useState(false);
  const [peak, setPeak] = useState(false);
  const rng = useRef(mulberry32(42));

  const violations = QUERIES.filter((q) => !q.clean && !resolved[q.id]).length;
  const exemptions = QUERIES.filter((q) => resolved[q.id] === "exempt").length;
  const unlocked = violations === 0 && exemptions === 0;

  const resolve = (qid, kind) => setResolved((r) => ({ ...r, [qid]: kind }));
  const unresolve = (qid) => setResolved((r) => { const c = { ...r }; delete c[qid]; return c; });

  const runCutover = () => {
    if (running || !unlocked) return;
    setRunning(true); setStepIdx(0); setClockMs(0); setFailedWrites(0); setDoneRun(null);
    const writesPerSec = peak ? 3000 : 300; // illustrative
    let ms = 0, failed = 0, i = 0;
    const advance = () => {
      const st = CUT_STEPS[i];
      const [lo, hi] = st.id === 3 && lag ? st.lagMs : st.ms;
      const dur = lo + rng.current() * (hi - lo);
      ms += dur;
      if (st.writesFail) failed += (writesPerSec * dur) / 1000;
      setClockMs(ms); setFailedWrites(failed);
      i += 1;
      if (i < CUT_STEPS.length) {
        setStepIdx(i);
        setTimeout(advance, Math.min(900, 60 + dur * (st.id === 3 && lag ? 0.7 : 28)));
      } else {
        setStepIdx(6); setRunning(false);
        setDoneRun({ windowMs: ms, failed: Math.round(failed), lag, peak });
      }
    };
    setTimeout(advance, 250);
  };
  const resetCutover = () => { setRunning(false); setStepIdx(-1); setClockMs(0); setFailedWrites(0); setDoneRun(null); rng.current = mulberry32(42); };

  const mono = "'JetBrains Mono','Fira Code','SF Mono',ui-monospace,monospace";
  const S = {
    root: { background: "#08090D", color: "#c8cdd8", fontFamily: mono, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid #2a2a3a", fontSize: 12, lineHeight: 1.5 },
    panel: { background: "#111118", border: "1px solid #2a2a3a", borderRadius: 8, padding: 12 },
    label: { color: "#6b7080", fontSize: 10, letterSpacing: 1.2 },
    btn: (on, disabled) => ({
      padding: "6px 10px", marginTop: 6, marginRight: 6, borderRadius: 6, display: "inline-block", textAlign: "left",
      cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1,
      border: `1px solid ${on ? ACCENT : "#2a2a3a"}`, color: on ? "#bcd8ff" : "#8b90a0",
      background: on ? "rgba(88,166,255,0.10)" : "#0c0d13", fontFamily: mono, fontSize: 11,
    }),
  };

  const gateColor = unlocked ? GREEN : exemptions > 0 && violations === 0 ? AMBER : RED;
  const gateText = unlocked
    ? "gists + repositories domains: VIRTUALLY PARTITIONED — zero violations, zero exemptions. The physical move is unlocked."
    : violations > 0
      ? `${violations} violation${violations > 1 ? "s" : ""} remaining — the linter fails CI on each. Fix or annotate them.`
      : `0 violations, ${exemptions} exemption${exemptions > 1 ? "s" : ""} — CI passes, but an annotated query is backlog, not progress. The move stays LOCKED until the backlog burns to zero.`;

  return (
    <div style={S.root}>
      <div style={{ color: ACCENT, fontSize: 10, letterSpacing: 2 }}>GITHUB · PARTITIONING MYSQL1 — INTERACTIVE</div>
      <div style={{ color: "#edeff3", fontSize: 16, margin: "4px 0 2px", fontWeight: 700 }}>Tens of milliseconds</div>
      <p style={{ color: "#8b90a0", fontSize: 11, margin: 0 }}>The move happens twice: first in the application, enforced by a linter — then in the database, in a read-only window you can measure.</p>

      <ContextBlock />

      {/* the gate */}
      <div style={{ ...S.panel, marginTop: 12, borderColor: gateColor }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "baseline" }}>
          <span style={{ color: gateColor, fontWeight: 700, fontSize: 11 }}>{unlocked ? "✓ MOVE UNLOCKED" : "🔒 MOVE LOCKED"}</span>
          <span style={{ fontSize: 11, color: "#c8cdd8" }}>{gateText}</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <button style={S.btn(tab === "lint", false)} onClick={() => setTab("lint")}>STAGE 1 · VIRTUAL — THE LINTER</button>
        <button style={S.btn(tab === "cut", !unlocked)} disabled={!unlocked} onClick={() => unlocked && setTab("cut")}>STAGE 2 · PHYSICAL — THE WRITE-CUTOVER {unlocked ? "" : "(locked)"}</button>
      </div>

      {tab === "lint" && (
        <div style={{ ...S.panel, marginTop: 10 }}>
          <div style={S.label}>db/schema-domains.yml — gists: [gists, gist_comments, starred_gists] · repositories: [issues, pull_requests, repositories] · users: [avatars, users, …]</div>
          {QUERIES.map((q) => {
            const state = q.clean ? "clean" : resolved[q.id] || "violation";
            const color = state === "clean" || state === "fix" ? GREEN : state === "exempt" ? AMBER : RED;
            return (
              <div key={q.id} style={{ marginTop: 10, background: "#0c0d13", border: `1px solid ${color}55`, borderRadius: 6, padding: "8px 10px" }}>
                <code style={{ fontSize: 10.5, color: "#c8cdd8" }}>{q.sql}</code>
                <div style={{ fontSize: 10, marginTop: 4, color }}>
                  {state === "clean" && `LINTER: PASS — ${q.note}`}
                  {state === "violation" && `LINTER: EXCEPTION — query spans schema domains (${q.domains})`}
                  {state === "exempt" && "LINTER: SUPPRESSED — exempted; added to the burndown backlog"}
                  {state === "fix" && "LINTER: PASS — coupling removed"}
                </div>
                {!q.clean && state !== "fix" && (
                  <div>
                    {q.fixes.map((f) => (
                      (state === "violation" || (state === "exempt" && f.kind === "fix")) && (
                        <button key={f.id} style={S.btn(false, false)} onClick={() => resolve(q.id, f.kind)}>
                          {f.label}
                          <div style={{ color: "#6b7080", fontSize: 9.5 }}>{f.note}</div>
                        </button>
                      )
                    ))}
                  </div>
                )}
                {state === "fix" && <button style={S.btn(false, false)} onClick={() => unresolve(q.id)}>↺ revert</button>}
              </div>
            );
          })}
        </div>
      )}

      {tab === "cut" && unlocked && (
        <div style={{ ...S.panel, marginTop: 10 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
            <button style={S.btn(!peak, running)} onClick={() => !running && setPeak(false)}>LOWEST-TRAFFIC WINDOW (~300 writes/s)</button>
            <button style={S.btn(peak, running)} onClick={() => !running && setPeak(true)}>PEAK TRAFFIC (~3,000 writes/s)</button>
            <button style={S.btn(lag, running)} onClick={() => !running && setLag(!lag)}>INJECT: REPLICA LAG ON cluster_b {lag ? "· ON" : "· OFF"}</button>
            <span style={{ flex: 1 }} />
            <button style={S.btn(true, running)} onClick={runCutover}>▶ RUN CUTOVER SCRIPT</button>
            <button style={S.btn(false, false)} onClick={resetCutover}>↺ RESET</button>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
            <div style={{ flex: "1 1 140px", background: "#0c0d13", border: "1px solid #2a2a3a", borderRadius: 6, padding: "8px 10px" }}>
              <div style={S.label}>READ-ONLY WINDOW</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: clockMs > 200 ? RED : clockMs > 0 ? AMBER : "#c8cdd8" }}>{clockMs.toFixed(1)} ms</div>
            </div>
            <div style={{ flex: "1 1 140px", background: "#0c0d13", border: "1px solid #2a2a3a", borderRadius: 6, padding: "8px 10px" }}>
              <div style={S.label}>WRITES FAILED (500s)</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: failedWrites > 100 ? RED : failedWrites > 0 ? AMBER : GREEN }}>{Math.round(failedWrites)}</div>
            </div>
          </div>

          {CUT_STEPS.map((st, i) => (
            <div key={st.id} style={{ display: "flex", gap: 10, padding: "5px 8px", borderRadius: 5, alignItems: "baseline", background: i === stepIdx ? "rgba(88,166,255,0.08)" : "transparent", border: `1px solid ${i === stepIdx ? ACCENT + "55" : "transparent"}`, opacity: stepIdx >= 0 && i > stepIdx ? 0.45 : 1 }}>
              <span style={{ color: stepIdx > i || stepIdx === 6 ? GREEN : i === stepIdx ? ACCENT : "#6b7080", fontSize: 10, minWidth: 18 }}>{stepIdx > i || stepIdx === 6 ? "✓" : st.id}</span>
              <span style={{ fontSize: 11 }}>{st.label}{st.id === 3 && lag ? "  ← lagging: the window stretches while everyone waits" : ""}</span>
            </div>
          ))}

          {doneRun && (
            <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 6, border: `1px solid ${doneRun.windowMs < 100 ? GREEN : RED}`, background: doneRun.windowMs < 100 ? "#0f2418" : "#241012", fontSize: 11.5, lineHeight: 1.6 }}>
              {doneRun.windowMs < 100
                ? `✓ Cutover complete: read-only for ${doneRun.windowMs.toFixed(1)} ms, ${doneRun.failed} writes failed${doneRun.peak ? " — even brief windows hurt at peak; this is why GitHub runs cutovers in the lowest-traffic window" : " — the sourced result: tens of milliseconds, a handful of user-facing errors. This is how 130 of the busiest tables moved in one shot."}`
                : `✗ Read-only for ${(doneRun.windowMs / 1000).toFixed(2)} s — ${doneRun.failed} writes failed. Step 3 is the load-bearing detail: the window stays short only if cluster_b is already caught up when the script starts. Lagging replication turns tens of milliseconds into a visible outage — which is why the process demands thorough preparation and rehearsal.`}
            </div>
          )}
        </div>
      )}

      <div style={{ color: "#6b7080", fontSize: 10, marginTop: 12, borderTop: "1px solid #2a2a3a", paddingTop: 8, lineHeight: 1.7 }}>
        Write rates, step timings, and the four sample queries are illustrative; the mechanisms are the post's: schema domains in db/schema-domains.yml; a query linter raising in dev/test/CI with the cross-schema-domain-query-exempted escape hatch; disable_joins and annotate upstreamed to Rails; a production-sampled transaction linter; polymorphic-table extraction; and the six-step ProxySQL + GTID write-cutover that moved 130 of GitHub's busiest tables with tens of milliseconds of read-only, run at the lowest-traffic time of day. Measured results: 1,200,000 queries/s across the partitioned clusters with average per-host load halved.
        {" "}
        <a href="https://behindscale.com/articles/github-partitioning-relational-databases" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: "none" }}>From the full dissection at behindscale.com →</a>
      </div>
    </div>
  );
}

function ContextBlock() {
  const [open, setOpen] = useState(true);
  const lbl = { fontSize: 10, color: ACCENT, letterSpacing: 1.2 };
  if (!open) return (
    <button onClick={() => setOpen(true)} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontFamily: "inherit", fontSize: 10, padding: 0, margin: "10px 0 0", display: "block" }}>SHOW CONTEXT ▾</button>
  );
  return (
    <div style={{ background: "#111118", border: "1px solid #2a2a3a", borderRadius: 8, padding: "12px 14px", marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <div style={{ fontSize: 10, color: "#6b7080", letterSpacing: 1.2 }}>CONTEXT — IF YOU ARRIVED HERE WITHOUT THE ARTICLE</div>
        <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontFamily: "inherit", fontSize: 10, padding: 0 }}>HIDE ✕</button>
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 8 }}><span style={lbl}>THE PROBLEM · </span>GitHub.com spent a decade built around one MySQL cluster — mysql1 — and hit the ceiling on two axes at once: staying adequately sized meant perpetually buying bigger machines, and any incident on the cluster took every core feature down together. Worse, ten years of code silently assumed all tables lived in one database.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>THE MOVE · </span>Partition virtually before physically: schema domains declared in YAML, SQL linters that fail CI on any query or transaction crossing a domain, and only then the physical move — a six-step ProxySQL + GTID write-cutover whose read-only window lasts tens of milliseconds.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>TRY · </span>Fix or exempt the four queries and watch the gate: exemptions pass CI but keep the move locked. Then run the cutover — at low traffic, at peak, and with a lagging replica — and read the window in milliseconds.</div>
    </div>
  );
}
