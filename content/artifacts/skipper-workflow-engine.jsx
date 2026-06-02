import { useState } from "react";

const sections = [
  { id: "problem", label: "The Problem" },
  { id: "embedded", label: "Embedded vs Central" },
  { id: "replay", label: "Replay & Checkpoints" },
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

export default function Skipper() {
  const [section, setSection] = useState("problem");
  const [showReplay, setShowReplay] = useState(false);

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

        {section === "replay" && (
          <div>
            <p style={{ fontSize: 12, color: "#c0c0cc", lineHeight: 1.7, marginBottom: 14 }}>
              <strong style={{ color: "#f0f0f5" }}>Replay-based durability:</strong> on crash, the workflow method re-executes from the top. Previously completed actions return their saved checkpoint instantly instead of re-running. The control flow (workflow method) must be deterministic.
            </p>
            <button
              onClick={() => setShowReplay(!showReplay)}
              style={{
                padding: "8px 14px",
                fontSize: 11,
                fontFamily: "inherit",
                border: "1px solid #22c55e60",
                borderRadius: 6,
                background: showReplay ? "#22c55e20" : "transparent",
                color: "#22c55e",
                cursor: "pointer",
                marginBottom: 14,
              }}
            >
              {showReplay ? "Hide" : "Show"} the publishListing workflow →
            </button>
            {showReplay && (
              <div style={{
                background: "#111118",
                border: "1px solid #22c55e30",
                borderRadius: 8,
                padding: "14px 16px",
                fontFamily: "inherit",
                fontSize: 11,
                lineHeight: 1.7,
              }}>
                <div style={{ color: "#888" }}>// Kotlin workflow method — deterministic, replay-safe</div>
                <div style={{ marginTop: 4 }}><span style={{ color: "#c792ea" }}>suspend fun</span> <span style={{ color: "#82aaff" }}>publishListing</span>(submission: ListingSubmission) {"{"}</div>
                <div style={{ paddingLeft: 16, color: "#a0a0b0" }}>val reviewId = actions.<span style={{ color: "#82aaff" }}>submitPhotosForReview</span>(...)</div>
                <div style={{ paddingLeft: 16, color: "#a0a0b0" }}>val timedOut = <span style={{ color: "#82aaff" }}>waitUntil</span>({"{"} photosApproved != null {"}"}, <span style={{ color: "#f78c6c" }}>24.hours</span>)</div>
                <div style={{ paddingLeft: 16, color: "#a0a0b0" }}><span style={{ color: "#c792ea" }}>if</span> (timedOut || !photosApproved) {"{"} ... <span style={{ color: "#c792ea" }}>return</span> rejected() {"}"}</div>
                <div style={{ paddingLeft: 16, color: "#a0a0b0" }}>actions.<span style={{ color: "#82aaff" }}>activateListing</span>(...)</div>
                <div style={{ paddingLeft: 16, color: "#a0a0b0" }}>actions.<span style={{ color: "#82aaff" }}>notifyHost</span>(...)</div>
                <div>{"}"}</div>
                <div style={{ marginTop: 10, color: "#888", borderTop: "1px solid #2a2a3a", paddingTop: 8 }}>
                  On crash: re-runs from the top. submitPhotosForReview returns its checkpoint instantly. waitUntil's condition is checked against current state. activateListing only runs if it didn't before. Linear code, durable execution.
                </div>
              </div>
            )}
          </div>
        )}

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
      </div>
    </div>
  );
}
