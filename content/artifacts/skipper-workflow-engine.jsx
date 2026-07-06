import { useState } from "react";

const sections = [
  { id: "replay", label: "Crash & Replay" },
  { id: "problem", label: "The Problem" },
  { id: "embedded", label: "Embedded vs Central" },
  { id: "hibernation", label: "Hibernation" },
];

const problemPoints = [
  {
    icon: "💥",
    title: "Mid-workflow crashes",
    desc: "Multi-step processes (insurance claims, payments, media) span minutes to days. A server crash mid-flight leaves partial state, duplicate side effects, or orphaned operations.",
  },
  {
    icon: "🔁",
    title: "Each team re-discovered the same edge cases",
    desc: "Teams built bespoke queue consumers, scheduled jobs, and reconciliation scripts — re-learning idempotency, retries, and crash recovery on every new workflow.",
  },
  {
    icon: "🚫",
    title: "External orchestrators added a SPOF",
    desc: "Temporal/Cadence-style centralized engines would mean every Tier-0 service depends on the orchestrator cluster. One cluster outage = company-wide failure.",
  },
];

const comparison = [
  {
    aspect: "Failure domain",
    central: "Shared cluster; one outage hits all services",
    embedded: "Each service is self-contained; isolated blast radius",
    winner: "embedded",
  },
  {
    aspect: "Infra dependencies",
    central: "Dedicated cluster + queues + storage",
    embedded: "Reuses the service's existing database",
    winner: "embedded",
  },
  {
    aspect: "Cross-service workflows",
    central: "Natural — orchestrator coordinates from one place",
    embedded: "Awkward — needs API calls + saga-like patterns",
    winner: "central",
  },
  {
    aspect: "Workflow UI / observability",
    central: "Built-in dashboard, replay, manual intervention",
    embedded: "DB rows; build your own visibility",
    winner: "central",
  },
  {
    aspect: "Language support",
    central: "Polyglot SDKs (Go, Python, TS, Java...)",
    embedded: "JVM only at Airbnb",
    winner: "central",
  },
  {
    aspect: "Latency on happy path",
    central: "Network round-trip per step",
    embedded: "In-process; only activates on crash/wait",
    winner: "embedded",
  },
];

const replaySteps = [
  {
    label: "Step 1",
    title: "submitPhotosForReview",
    type: "action",
    state: "completed",
    note: "Checkpoint written: result saved to DB. Side effect: API call made.",
  },
  {
    label: "Step 2",
    title: "waitUntil(photosApproved, 24h)",
    type: "wait",
    state: "active",
    note: "Workflow hibernates. State serialized to DB. Thread returned to pool. Zero compute consumed.",
  },
  {
    label: "Step 3",
    title: "activateListing",
    type: "action",
    state: "pending",
    note: "Will execute when waitUntil resolves.",
  },
  {
    label: "Step 4",
    title: "notifyHost",
    type: "action",
    state: "pending",
    note: "Final step.",
  },
];

// Crash-and-replay simulator for Skipper's durability model.
// Sourced from the ListingPublicationWorkflow example in the post.
// Demonstrates: checkpointed actions skip on replay, state fields persist,
// waitUntil hibernates, the determinism requirement, and the happy-path
// "you only pay when something goes wrong" property.

const REPLAY_ACCENT = "#22c55e";
const REPLAY_STEPS = [
  { id: "submit", kind: "action", code: "actions.submitPhotosForReview(listingId)", short: "submitPhotosForReview", effect: "External review request created", checkpointable: true },
  { id: "wait", kind: "wait", code: "waitUntil({ photosApproved != null }, 24.hours)", short: "waitUntil(photosApproved)", effect: "Workflow hibernates — thread released, state in DB", checkpointable: false },
  { id: "branch", kind: "control", code: "if (timedOut || !photosApproved) return rejected()", short: "if (timedOut || !approved)", effect: "Deterministic branch — reads @StateField, no side effect", checkpointable: false },
  { id: "activate", kind: "action", code: "actions.activateListing(listingId)", short: "activateListing", effect: "Listing goes live (external write)", checkpointable: true },
  { id: "notify", kind: "action", code: "actions.notifyHost(hostId, \"live!\")", short: "notifyHost", effect: "Host notified (external call)", checkpointable: true },
];

function ReplaySim() {
  // execution log: array of { stepIdx, mode: "ran" | "replayed-skip" | "hibernate" | "crash" }
  const [cursor, setCursor] = useState(0);        // next step to execute
  const [checkpoints, setCheckpoints] = useState({}); // stepId -> true once committed
  const [signaled, setSignaled] = useState(false); // photosApproved set via @SignalMethod
  const [hibernating, setHibernating] = useState(false);
  const [log, setLog] = useState([]);
  const [crashedOnce, setCrashedOnce] = useState(false);
  const [done, setDone] = useState(false);
  const [execCounts, setExecCounts] = useState({}); // stepId -> times the external effect actually happened

  const reset = (hard) => {
    setCursor(0); setLog([]); setHibernating(false); setDone(false);
    if (hard) { setCheckpoints({}); setSignaled(false); setCrashedOnce(false); setExecCounts({}); }
  };

  const step = REPLAY_STEPS[cursor];

  const advance = () => {
    if (done || !step) return;
    if (step.kind === "wait" && !signaled) { setHibernating(true); return; } // park until signal
    const committed = !!checkpoints[step.id];
    let mode;
    if (step.kind === "action") {
      mode = committed ? "replayed-skip" : "ran";
      if (!committed) {
        setCheckpoints((c) => ({ ...c, [step.id]: true }));
        setExecCounts((c) => ({ ...c, [step.id]: (c[step.id] || 0) + 1 }));
      }
    } else if (step.kind === "wait") {
      mode = "wait-pass";
      setHibernating(false);
    } else {
      mode = "control";
    }
    setLog((l) => [...l, { stepId: step.id, mode }]);
    if (cursor + 1 >= REPLAY_STEPS.length) setDone(true);
    else setCursor(cursor + 1);
  };

  const crash = () => {
    // crash mid-flight: in-memory cursor/log lost, but checkpoints + state fields survive in DB
    setLog((l) => [...l, { stepId: step ? step.id : "end", mode: "crash" }]);
    setCrashedOnce(true);
    setTimeout(() => {
      setCursor(0);            // replay from the top
      setHibernating(false);
      setDone(false);
      setLog((l) => [...l, { stepId: "replay-start", mode: "replay-banner" }]);
    }, 50);
  };

  const crashInWindow = () => {
    // the at-least-once window: the action's external effect happens,
    // but the process dies before the checkpoint write reaches the DB
    if (!step || step.kind !== "action" || checkpoints[step.id]) return;
    setExecCounts((c) => ({ ...c, [step.id]: (c[step.id] || 0) + 1 }));
    setLog((l) => [...l, { stepId: step.id, mode: "crash-window" }]);
    setCrashedOnce(true);
    setTimeout(() => {
      setCursor(0);
      setHibernating(false);
      setDone(false);
      setLog((l) => [...l, { stepId: "replay-start", mode: "replay-banner" }]);
    }, 50);
  };

  const sendSignal = () => { setSignaled(true); setHibernating(false); };

  const modeStyle = {
    "ran": { c: "#22c55e", t: "RAN", note: "executed + checkpoint committed to DB" },
    "replayed-skip": { c: "#06b6d4", t: "SKIPPED", note: "checkpoint found — returned saved result instantly, no re-execution" },
    "wait-pass": { c: "#a78bfa", t: "RESUMED", note: "signal present — wait satisfied" },
    "control": { c: "#888", t: "EVAL", note: "deterministic branch re-evaluated against persisted state" },
    "crash": { c: "#ef4444", t: "💥 CRASH", note: "process dies — in-memory progress lost, DB checkpoints + state survive" },
    "crash-window": { c: "#ef4444", t: "💥 CRASH", note: "action EXECUTED, but the process died before the checkpoint write — the DB never learned it ran" },
  };

  return (
    <div>
      <p style={{ fontSize: 12, color: "#c0c0cc", lineHeight: 1.7, marginBottom: 12 }}>
        Step the <code style={{ color: REPLAY_ACCENT }}>publishListing</code> workflow. Crash it anywhere — then
        keep stepping and watch replay <em>skip</em> the actions that already committed. The workflow
        method re-runs top-to-bottom; only the un-checkpointed work executes again.
      </p>

      {/* state panel */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <div style={{ flex: "1 1 160px", background: "#111118", border: "1px solid #2a2a3a", borderRadius: 6, padding: "8px 10px" }}>
          <div style={{ fontSize: 8.5, letterSpacing: 1.5, color: "#666", marginBottom: 4 }}>DURABLE STATE (survives crash)</div>
          <div style={{ fontSize: 10.5, color: "#c0c0cc", lineHeight: 1.7 }}>
            checkpoints: <span style={{ color: REPLAY_ACCENT }}>{Object.keys(checkpoints).filter((k) => checkpoints[k]).length}</span> committed<br />
            @StateField photosApproved: <span style={{ color: signaled ? REPLAY_ACCENT : "#666" }}>{signaled ? "true" : "null"}</span>
          </div>
        </div>
        <div style={{ flex: "1 1 160px", background: "#111118", border: "1px solid #2a2a3a", borderRadius: 6, padding: "8px 10px" }}>
          <div style={{ fontSize: 8.5, letterSpacing: 1.5, color: "#666", marginBottom: 4 }}>EXTERNAL WORLD (what actually happened)</div>
          <div style={{ fontSize: 10.5, lineHeight: 1.7 }}>
            {Object.keys(execCounts).length === 0 ? (
              <span style={{ color: "#666" }}>no external effects yet</span>
            ) : (
              REPLAY_STEPS.filter((x) => execCounts[x.id]).map((x) => (
                <div key={x.id} style={{ color: execCounts[x.id] > 1 ? "#eab308" : "#c0c0cc" }}>
                  {x.short}: <span style={{ color: execCounts[x.id] > 1 ? "#eab308" : REPLAY_ACCENT }}>{execCounts[x.id]}×</span>
                  {execCounts[x.id] > 1 ? " ⚠ duplicate" : ""}
                </div>
              ))
            )}
          </div>
        </div>
        <div style={{ flex: "1 1 160px", background: "#111118", border: "1px solid #2a2a3a", borderRadius: 6, padding: "8px 10px" }}>
          <div style={{ fontSize: 8.5, letterSpacing: 1.5, color: "#666", marginBottom: 4 }}>IN-MEMORY (lost on crash)</div>
          <div style={{ fontSize: 10.5, color: "#c0c0cc", lineHeight: 1.7 }}>
            cursor: step <span style={{ color: "#eab308" }}>{Math.min(cursor + 1, REPLAY_STEPS.length)}</span> / {REPLAY_STEPS.length}<br />
            status: <span style={{ color: hibernating ? "#a78bfa" : done ? REPLAY_ACCENT : "#eab308" }}>
              {done ? "complete" : hibernating ? "hibernating" : "running"}
            </span>
          </div>
        </div>
      </div>

      {/* the workflow steps */}
      <div style={{ background: "#0c0d13", border: "1px solid #2a2a3a", borderRadius: 8, padding: 10, marginBottom: 12 }}>
        {REPLAY_STEPS.map((s, i) => {
          const committed = !!checkpoints[s.id];
          const isNext = i === cursor && !done;
          const kindColor = s.kind === "action" ? REPLAY_ACCENT : s.kind === "wait" ? "#a78bfa" : "#888";
          return (
            <div key={s.id} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "7px 9px", borderRadius: 5,
              marginBottom: 3,
              background: isNext ? `${REPLAY_ACCENT}14` : "transparent",
              border: `1px solid ${isNext ? `${REPLAY_ACCENT}55` : "transparent"}`,
              opacity: i > cursor && !done ? 0.5 : 1,
            }}>
              <span style={{
                fontSize: 8, padding: "2px 5px", borderRadius: 3, minWidth: 48, textAlign: "center",
                background: `${kindColor}20`, color: kindColor, border: `1px solid ${kindColor}40`, letterSpacing: 0.5,
              }}>{s.kind.toUpperCase()}</span>
              <code style={{ fontSize: 10.5, color: "#c0c0cc", flex: 1 }}>{s.short}</code>
              {s.checkpointable && (
                <span style={{ fontSize: 8.5, color: committed ? "#06b6d4" : "#444" }}>
                  {committed ? "✓ checkpoint" : "○ uncommitted"}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* controls */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <button onClick={advance} disabled={done} style={replayBtn(done ? "#333" : REPLAY_ACCENT, done)}>
          {step && step.kind === "wait" && !signaled ? "hibernate ▸" : "step ▸"}
        </button>
        <button onClick={crash} disabled={done && Object.keys(checkpoints).length === 0} style={replayBtn("#ef4444")}>💥 crash now</button>
        {step && step.kind === "action" && !checkpoints[step.id] && !done && (
          <button onClick={crashInWindow} style={replayBtn("#eab308")}>💥 crash in the checkpoint window</button>
        )}
        {hibernating && <button onClick={sendSignal} style={replayBtn("#a78bfa")}>📩 signal: completePhotoReview(true)</button>}
        <span style={{ flex: 1 }} />
        <button onClick={() => reset(false)} style={replayBtn("#666")}>↺ replay</button>
        <button onClick={() => reset(true)} style={replayBtn("#666")}>⟲ full reset</button>
      </div>

      {hibernating && (
        <div style={{ fontSize: 10.5, color: "#a78bfa", background: "#1a1525", border: "1px solid #a78bfa40", borderRadius: 6, padding: "8px 10px", marginBottom: 12, lineHeight: 1.6 }}>
          Hibernating: the thread is back in the pool and the workflow exists only as a DB row. It will
          consume zero compute until the signal arrives or the 24h timeout fires. Send the signal to wake it.
        </div>
      )}

      {/* execution log */}
      {log.length > 0 && (
        <div style={{ background: "#111118", border: "1px solid #2a2a3a", borderRadius: 8, padding: "10px 12px" }}>
          <div style={{ fontSize: 8.5, letterSpacing: 1.5, color: "#666", marginBottom: 8 }}>EXECUTION LOG</div>
          {log.map((entry, i) => {
            if (entry.mode === "replay-banner") {
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", margin: "4px 0", borderTop: "1px dashed #ef444450", borderBottom: "1px dashed #ef444450" }}>
                  <span style={{ fontSize: 10, color: "#ef4444", letterSpacing: 1 }}>↻ REPLAY FROM TOP — same method, re-executed</span>
                </div>
              );
            }
            const ms = modeStyle[entry.mode] || modeStyle.control;
            const s = REPLAY_STEPS.find((x) => x.id === entry.stepId);
            return (
              <div key={i} style={{ display: "flex", gap: 10, padding: "4px 0", alignItems: "baseline" }}>
                <span style={{ fontSize: 8.5, color: ms.c, minWidth: 64, fontWeight: 700 }}>{ms.t}</span>
                <span style={{ fontSize: 10.5, color: "#c0c0cc" }}>
                  <code style={{ color: "#f0f0f5" }}>{s ? s.short : ""}</code>
                  <span style={{ color: "#777" }}> — {ms.note}</span>
                </span>
              </div>
            );
          })}
          {done && (() => {
            const dups = REPLAY_STEPS.filter((x) => (execCounts[x.id] || 0) > 1);
            const clean = dups.length === 0;
            return (
              <div style={{ marginTop: 8, padding: "8px 10px", borderRadius: 5, background: clean ? "#0a2a1a" : "#2a220a", border: `1px solid ${clean ? REPLAY_ACCENT : "#eab308"}`, fontSize: 11, color: clean ? "#95d5b2" : "#f0dc8c", lineHeight: 1.6 }}>
                {clean ? (
                  <>✓ Workflow reached a terminal state.{crashedOnce && " Despite the crash, every external effect happened exactly once — check the EXTERNAL WORLD panel. The replayed actions returned their checkpoints instead of re-running. That is durable execution: linear code, crash-proof outcome."}</>
                ) : (
                  <>⚠ Terminal state reached — but {dups.map((d) => d.short).join(", ")} executed {dups.map((d) => execCounts[d.id] + "×").join(", ")}. A crash in the window between an action executing and its checkpoint committing replays that action: checkpointed actions are at-least-once, not exactly-once — which is precisely why the post requires action implementations to be idempotent. (The Stripe dissection is the deep dive on making that safe.)</>
                )}
              </div>
            );
          })()}
        </div>
      )}

      <div style={{ fontSize: 9.5, color: "#666", lineHeight: 1.7, marginTop: 12, borderTop: "1px solid #2a2a3a", paddingTop: 10 }}>
        Note the asymmetry the post emphasizes: on the happy path the engine adds only a few database
        writes (checkpoints + a delayed timeout task as a safety net). The replay machinery is invoked
        <em> only</em> when something goes wrong — a crash, a wait, or an error. You pay for durability
        only when you use it. (Actions are at-least-once: a crash after executing but before the
        checkpoint write replays the action — which is why action implementations must be idempotent.)
      </div>
    </div>
  );
}

function replayBtn(color, disabled) {
  return {
    padding: "7px 12px", fontSize: 11, fontFamily: "inherit",
    border: `1px solid ${color}${disabled ? "40" : ""}`, borderRadius: 6,
    background: `${color}18`, color, cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.5 : 1,
  };
}


function ContextBlock() {
  const [open, setOpen] = useState(true);
  const lbl = { fontSize: 10, color: "#22c55e", letterSpacing: 1.2 };
  if (!open) return (
    <button onClick={() => setOpen(true)} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontFamily: "inherit", fontSize: 10, padding: 0, margin: "0 0 14px", display: "block" }}>SHOW CONTEXT ▾</button>
  );
  return (
    <div style={{ background: "#111118", border: "1px solid #2a2a3a", borderRadius: 8, padding: "12px 14px", marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <div style={{ fontSize: 10, color: "#6b7080", letterSpacing: 1.2 }}>CONTEXT — IF YOU ARRIVED HERE WITHOUT THE ARTICLE</div>
        <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontFamily: "inherit", fontSize: 10, padding: 0 }}>HIDE ✕</button>
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 8 }}><span style={lbl}>THE PROBLEM · </span>A multi-step process that crashes between steps leaves the outcome to chance — a timed-out caller retries into a duplicate payout, or partial state corrupts what follows — and for workflows spanning hours to days, interruption is the expected case, not the edge. A central orchestration cluster fixes this at a blast-radius cost Airbnb's Tier-0 services could not accept: one outage stops every dependent service's workflows.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>THE MOVE · </span>Ship the engine as a library inside each service instead: durability comes from replaying the workflow method against checkpointed actions — committed steps are skipped, not re-executed — and long waits hibernate to zero compute until a signal arrives.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>TRY · </span>Step the workflow and crash it anywhere — replay skips the checkpointed actions. Then crash inside the checkpoint window and watch an action run twice: the reason action implementations must be idempotent. Wake the hibernating wait with the signal.</div>
    </div>
  );
}

export default function Skipper() {
  const [section, setSection] = useState("replay");

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
          <div style={{ fontSize: 10, letterSpacing: 4, color: "#22c55e", marginBottom: 6, textTransform: "uppercase" }}>
            Airbnb · Workflow Orchestration
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#f0f0f5", margin: 0, lineHeight: 1.3 }}>
            Skipper: Embedded Workflow Engine
          </h1>
          <p style={{ fontSize: 12, color: "#888", marginTop: 6, lineHeight: 1.6 }}>
            Durable, multi-step workflows as a library inside each service — not a central cluster. Replay-based recovery, hibernation between waits, full reuse of the service's existing DB.
          </p>
        </div>

        <ContextBlock />

        <div style={{ display: "flex", gap: 4, marginBottom: 18, flexWrap: "wrap" }}>
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              style={{
                padding: "7px 12px",
                fontSize: 11,
                fontFamily: "inherit",
                border: `1px solid ${section === s.id ? "#22c55e" : "#2a2a3a"}`,
                borderRadius: 6,
                background: section === s.id ? "#22c55e18" : "transparent",
                color: section === s.id ? "#22c55e" : "#666",
                cursor: "pointer",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {section === "problem" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {problemPoints.map((p, i) => (
              <div key={i} style={{
                background: "#111118",
                border: "1px solid #2a2a3a",
                borderRadius: 8,
                padding: "14px 16px",
                display: "flex", gap: 12, alignItems: "flex-start",
              }}>
                <div style={{ fontSize: 22 }}>{p.icon}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#f0f0f5", marginBottom: 4 }}>{p.title}</div>
                  <div style={{ fontSize: 11.5, color: "#c0c0cc", lineHeight: 1.6 }}>{p.desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {section === "embedded" && (
          <div>
            <p style={{ fontSize: 12, color: "#c0c0cc", lineHeight: 1.7, marginBottom: 14 }}>
              The fundamental tradeoff: <strong style={{ color: "#f0f0f5" }}>autonomy vs coordination</strong>. Embedding gives autonomy at the cost of cross-service coordination. Centralizing inverts both.
            </p>
            <div style={{
              background: "#111118",
              border: "1px solid #2a2a3a",
              borderRadius: 8,
              overflow: "hidden",
            }}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 1fr 1fr 60px",
                padding: "8px 12px",
                background: "#1a1a2a",
                fontSize: 10,
                color: "#888",
                letterSpacing: 1,
                textTransform: "uppercase",
              }}>
                <div>Aspect</div>
                <div>Central</div>
                <div>Embedded</div>
                <div></div>
              </div>
              {comparison.map((c, i) => (
                <div key={i} style={{
                  display: "grid",
                  gridTemplateColumns: "1.2fr 1fr 1fr 60px",
                  padding: "10px 12px",
                  borderTop: "1px solid #2a2a3a",
                  fontSize: 11,
                  alignItems: "center",
                }}>
                  <div style={{ color: "#f0f0f5", fontWeight: 600 }}>{c.aspect}</div>
                  <div style={{ color: c.winner === "central" ? "#22c55e" : "#888", lineHeight: 1.5 }}>{c.central}</div>
                  <div style={{ color: c.winner === "embedded" ? "#22c55e" : "#888", lineHeight: 1.5 }}>{c.embedded}</div>
                  <div style={{ fontSize: 10, color: "#22c55e", textAlign: "right", letterSpacing: 1 }}>
                    {c.winner === "central" ? "← C" : "E →"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {section === "replay" && <ReplaySim />}

        {section === "hibernation" && (
          <div>
            <p style={{ fontSize: 12, color: "#c0c0cc", lineHeight: 1.7, marginBottom: 14 }}>
              <strong style={{ color: "#f0f0f5" }}>waitUntil</strong> isn't a blocking thread — it's hibernation. The workflow's state serializes to DB, the thread returns to the pool, and the workflow is just a row until a signal arrives.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {replaySteps.map((step, i) => {
                const colors = step.state === "completed"
                  ? { bg: "#1a3a2a", border: "#2d6a4f", text: "#95d5b2", label: "CHECKPOINTED" }
                  : step.state === "active"
                  ? { bg: "#2a2010", border: "#e09f3e", text: "#ffd97d", label: "HIBERNATING" }
                  : { bg: "#1a1a2a", border: "#333", text: "#666", label: "PENDING" };

                return (
                  <div key={i} style={{
                    background: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 8,
                    padding: "12px 14px",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 10, color: colors.text, letterSpacing: 1, textTransform: "uppercase" }}>{step.label}</span>
                        <span style={{
                          fontSize: 9,
                          padding: "2px 6px",
                          background: `${colors.border}30`,
                          border: `1px solid ${colors.border}50`,
                          borderRadius: 3,
                          color: colors.text,
                          letterSpacing: 1,
                        }}>{step.type.toUpperCase()}</span>
                      </div>
                      <span style={{ fontSize: 9, color: colors.text, letterSpacing: 1.5 }}>{colors.label}</span>
                    </div>
                    <div style={{ fontSize: 13, color: "#f0f0f5", fontWeight: 600, marginBottom: 4 }}>{step.title}</div>
                    <div style={{ fontSize: 11, color: "#999", lineHeight: 1.5 }}>{step.note}</div>
                  </div>
                );
              })}
            </div>
            <div style={{
              marginTop: 14,
              padding: "12px 14px",
              background: "#111118",
              borderRadius: 6,
              borderLeft: "3px solid #e09f3e",
            }}>
              <div style={{ fontSize: 10, color: "#e09f3e", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>
                What hibernation eliminates
              </div>
              <div style={{ fontSize: 11.5, color: "#c0c0cc", lineHeight: 1.7 }}>
                A typical "wait 24h for review" without Skipper means: a queue consumer for the initial submission, a callback endpoint for the review result, a scheduled job for the timeout case, a state table to coordinate the three, and race-condition handling between callback and timeout. With Skipper: one method, reading top-to-bottom, no scattered state machine.
              </div>
            </div>
          </div>
        )}

        <div style={{ fontSize: 9, color: "#555", marginTop: 20, lineHeight: 1.6, borderTop: "1px solid #2a2a3a", paddingTop: 10 }}>
          <a href="https://behindscale.com/articles/skipper-workflow-engine" target="_blank" rel="noopener noreferrer" style={{ color: "#22c55e", textDecoration: "none" }}>From the full dissection at behindscale.com →</a>
        </div>
      </div>
    </div>
  );
}
