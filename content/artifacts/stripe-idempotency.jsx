import { useState } from "react";

const phases = [
  {
    id: "phase1",
    label: "Phase 1",
    title: "Register the Request",
    recovery: "started",
    type: "local",
    desc: "Client sends request with idempotency key. Server creates/finds the key record in DB.",
    detail: "The idempotency key + recovery point are stored in the SAME database transaction. This is the foundation of the whole pattern.",
    icon: "🔑",
    actions: ["Client → POST /charges (key: abc-123)", "Server → INSERT idempotency_key row", "Set recovery_point = 'started'"],
  },
  {
    id: "phase2",
    label: "Phase 2",
    title: "Create Business Records",
    recovery: "ride_created",
    type: "local",
    desc: "Create the ride record + audit log in a single DB transaction. Update recovery point.",
    detail: "All local DB writes are grouped into ONE transaction. Either everything commits (ride + audit + recovery point) or nothing does.",
    icon: "📝",
    actions: ["INSERT ride record", "INSERT audit record", "UPDATE recovery_point = 'ride_created'", "All in ONE transaction ✓"],
  },
  {
    id: "stripe",
    label: "⚡ Foreign Call",
    title: "Call Stripe API",
    recovery: null,
    type: "foreign",
    desc: "Calling an external system. Once Stripe charges the card, you can't undo it with a DB rollback.",
    detail: "The call to Stripe uses its OWN idempotency key (derived from our key's ID). So even if we retry this call, Stripe won't double-charge.",
    icon: "💳",
    actions: ["Call Stripe with idempotency_key", "Stripe charges $20", "⚠️ Point of no return — can't rollback"],
  },
  {
    id: "phase3",
    label: "Phase 3",
    title: "Persist Charge Result",
    recovery: "charge_created",
    type: "local",
    desc: "Save the Stripe charge ID on the ride record and advance the recovery point.",
    detail: "Again, the charge ID update and the recovery point update happen in the SAME transaction. Atomic.",
    icon: "💾",
    actions: ["UPDATE ride SET stripe_charge_id = 'ch_xxx'", "UPDATE recovery_point = 'charge_created'", "All in ONE transaction ✓"],
  },
  {
    id: "phase4",
    label: "Phase 4",
    title: "Queue Receipt & Finish",
    recovery: "finished",
    type: "local",
    desc: "Stage an email job (inside the transaction) and mark the request as finished. Store the response.",
    detail: "The email isn't sent directly — it's staged in a jobs table inside the same transaction. A separate enqueuer picks it up.",
    icon: "✉️",
    actions: ["INSERT staged_job (send_receipt)", "UPDATE recovery_point = 'finished'", "Store response_code = 201", "All in ONE transaction ✓"],
  },
];

const crashScenarios = [
  {
    id: "crash1",
    title: "Crash after Phase 2, before Stripe call",
    crashAfter: 1,
    explanation: "Client retries with same key. Server finds key with recovery_point = 'ride_created'. Skips Phase 1 & 2 entirely. Jumps straight to the Stripe call. No duplicate ride created.",
  },
  {
    id: "crash2",
    title: "Crash during Stripe call (ambiguous)",
    crashAfter: 2,
    explanation: "Did Stripe charge or not? We don't know. Client retries → server sees recovery_point = 'ride_created' → calls Stripe again with the SAME idempotency key → Stripe returns cached result. No double charge.",
  },
  {
    id: "crash3",
    title: "Crash after Phase 3, before sending receipt",
    crashAfter: 3,
    explanation: "Client retries → server finds recovery_point = 'charge_created' → skips to Phase 4 → stages the email job and finishes. Charge already recorded, no duplicate.",
  },
];

export default function AtomicPhases() {
  const [activePhase, setActivePhase] = useState(null);
  const [activeCrash, setActiveCrash] = useState(null);
  const [view, setView] = useState("flow");

  const getPhaseColor = (phase, index) => {
    if (activeCrash !== null) {
      const scenario = crashScenarios[activeCrash];
      if (index < scenario.crashAfter) return { bg: "#1a3a2a", border: "#2d6a4f", text: "#95d5b2", label: "SKIPPED (cached)" };
      if (index === scenario.crashAfter) return { bg: "#3a1a1a", border: "#d00000", text: "#ff6b6b", label: "💥 CRASH HERE" };
      if (index > scenario.crashAfter) return { bg: "#1a1a2a", border: "#4361ee", text: "#a2b9ee", label: "RESUMES HERE" };
    }
    if (phase.type === "foreign") return { bg: "#3a2a1a", border: "#e09f3e", text: "#ffd97d" };
    return { bg: "#1a1a2a", border: "#4361ee", text: "#a2b9ee" };
  };

  return (
    <div style={{
      fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
      background: "#08090D",
      color: "#C8CDD8",
      minHeight: "100vh",
      padding: "20px 16px",
      boxSizing: "border-box",
    }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, letterSpacing: 4, color: "#6366f1", marginBottom: 6, textTransform: "uppercase" }}>
            System Design Pattern
          </div>
          <h1 style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#f0f0f5",
            margin: 0,
            lineHeight: 1.3,
          }}>
            Atomic Phases + Recovery Points
          </h1>
          <p style={{ fontSize: 12, color: "#888", marginTop: 6, lineHeight: 1.6 }}>
            How Stripe breaks a multi-step API request into resumable chunks. Each phase commits atomically. On crash, retry jumps to the last recovery point.
          </p>
        </div>

        <div style={{
          background: "#111118",
          border: "1px solid #2a2a3a",
          borderRadius: 8,
          padding: "14px 16px",
          marginBottom: 20,
          borderLeft: "3px solid #6366f1",
        }}>
          <div style={{ fontSize: 10, color: "#6366f1", letterSpacing: 2, marginBottom: 6, textTransform: "uppercase" }}>
            The Key Insight
          </div>
          <p style={{ fontSize: 12, color: "#c0c0cc", margin: 0, lineHeight: 1.7 }}>
            The <strong style={{ color: "#f0f0f5" }}>recovery point</strong> update and the <strong style={{ color: "#f0f0f5" }}>business logic</strong> always commit in the <strong style={{ color: "#6366f1" }}>same DB transaction</strong>. If one fails, both fail. If one succeeds, both succeed. This eliminates the gap where "data committed but progress wasn't recorded."
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          <button
            onClick={() => { setView("flow"); setActiveCrash(null); }}
            style={{
              padding: "7px 14px",
              fontSize: 11,
              fontFamily: "inherit",
              border: `1px solid ${view === "flow" ? "#6366f1" : "#2a2a3a"}`,
              borderRadius: 6,
              background: view === "flow" ? "#1a1a3a" : "transparent",
              color: view === "flow" ? "#a5b4fc" : "#666",
              cursor: "pointer",
            }}
          >
            Normal Flow
          </button>
          <button
            onClick={() => { setView("crash"); setActiveCrash(null); }}
            style={{
              padding: "7px 14px",
              fontSize: 11,
              fontFamily: "inherit",
              border: `1px solid ${view === "crash" ? "#e09f3e" : "#2a2a3a"}`,
              borderRadius: 6,
              background: view === "crash" ? "#2a2010" : "transparent",
              color: view === "crash" ? "#ffd97d" : "#666",
              cursor: "pointer",
            }}
          >
            💥 Simulate Crashes
          </button>
        </div>

        {view === "crash" && (
          <div style={{
            background: "#111118",
            border: "1px solid #2a2a3a",
            borderRadius: 8,
            padding: 14,
            marginBottom: 18,
          }}>
            <div style={{ fontSize: 10, color: "#e09f3e", letterSpacing: 2, marginBottom: 10, textTransform: "uppercase" }}>
              Pick a crash scenario
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {crashScenarios.map((sc, i) => (
                <button
                  key={sc.id}
                  onClick={() => setActiveCrash(activeCrash === i ? null : i)}
                  style={{
                    padding: "8px 12px",
                    fontSize: 11,
                    fontFamily: "inherit",
                    border: `1px solid ${activeCrash === i ? "#e09f3e" : "#2a2a3a"}`,
                    borderRadius: 5,
                    background: activeCrash === i ? "#e09f3e15" : "transparent",
                    color: activeCrash === i ? "#f0f0f5" : "#888",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  {sc.title}
                </button>
              ))}
            </div>
            {activeCrash !== null && (
              <div style={{
                marginTop: 12,
                padding: "12px 14px",
                background: "#08090D",
                borderRadius: 6,
                border: "1px solid #e09f3e40",
              }}>
                <div style={{ fontSize: 10, color: "#e09f3e", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>
                  What happens on retry
                </div>
                <p style={{ fontSize: 11.5, color: "#c0c0cc", margin: 0, lineHeight: 1.7 }}>
                  {crashScenarios[activeCrash].explanation}
                </p>
              </div>
            )}
          </div>
        )}

        <div>
          {phases.map((phase, i) => {
            const colors = getPhaseColor(phase, i);
            const isActive = activePhase === i;
            const isCrashPoint = activeCrash !== null && i === crashScenarios[activeCrash].crashAfter;

            return (
              <div key={phase.id}>
                <div
                  onClick={() => setActivePhase(isActive ? null : i)}
                  style={{
                    background: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 8,
                    padding: "14px 16px",
                    cursor: "pointer",
                    position: "relative",
                  }}
                >
                  {activeCrash !== null && (
                    <div style={{
                      position: "absolute",
                      top: 6,
                      right: 10,
                      fontSize: 9,
                      letterSpacing: 2,
                      color: colors.text,
                      textTransform: "uppercase",
                      opacity: 0.8,
                    }}>
                      {colors.label}
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: 20 }}>{phase.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: 10, color: colors.text, letterSpacing: 1, textTransform: "uppercase" }}>
                          {phase.label}
                        </span>
                        {phase.type === "foreign" && (
                          <span style={{
                            fontSize: 9,
                            padding: "2px 6px",
                            background: "#e09f3e20",
                            border: "1px solid #e09f3e40",
                            borderRadius: 3,
                            color: "#e09f3e",
                            letterSpacing: 1,
                          }}>
                            FOREIGN
                          </span>
                        )}
                        {phase.type === "local" && (
                          <span style={{
                            fontSize: 9,
                            padding: "2px 6px",
                            background: "#4361ee20",
                            border: "1px solid #4361ee40",
                            borderRadius: 3,
                            color: "#7b93f5",
                            letterSpacing: 1,
                          }}>
                            ATOMIC TX
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#f0f0f5" }}>
                        {phase.title}
                      </div>
                      <div style={{ fontSize: 11, color: "#888", marginTop: 3, lineHeight: 1.5 }}>
                        {phase.desc}
                      </div>
                    </div>
                    {phase.recovery && (
                      <div style={{ textAlign: "right", minWidth: 110 }}>
                        <div style={{ fontSize: 9, color: "#666", letterSpacing: 1, textTransform: "uppercase", marginBottom: 3 }}>
                          Recovery Point
                        </div>
                        <div style={{
                          fontSize: 10.5,
                          padding: "3px 8px",
                          background: "#6366f120",
                          border: "1px solid #6366f140",
                          borderRadius: 4,
                          color: "#a5b4fc",
                          display: "inline-block",
                        }}>
                          {phase.recovery}
                        </div>
                      </div>
                    )}
                  </div>

                  {isActive && (
                    <div style={{
                      marginTop: 14,
                      paddingTop: 14,
                      borderTop: "1px solid #2a2a3a",
                    }}>
                      <div style={{
                        fontSize: 11.5,
                        color: "#c0c0cc",
                        lineHeight: 1.7,
                        marginBottom: 10,
                      }}>
                        {phase.detail}
                      </div>
                      <div style={{
                        background: "#08090D",
                        borderRadius: 6,
                        padding: "10px 14px",
                      }}>
                        {phase.actions.map((action, j) => (
                          <div key={j} style={{
                            fontSize: 11,
                            color: action.includes("✓") ? "#2d6a4f" : action.includes("⚠️") ? "#e09f3e" : "#a0a0b0",
                            padding: "2px 0",
                            fontFamily: "inherit",
                          }}>
                            <span style={{ color: "#4361ee", marginRight: 6 }}>→</span>
                            {action}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {isCrashPoint && (
                  <div style={{
                    textAlign: "center",
                    padding: "6px 0",
                    fontSize: 11,
                    color: "#d00000",
                    fontWeight: 700,
                    letterSpacing: 2,
                  }}>
                    ╳ ── SERVER CRASHES HERE ── ╳
                  </div>
                )}

                {i < phases.length - 1 && !isCrashPoint && (
                  <div style={{
                    textAlign: "center",
                    padding: "2px 0",
                    color: "#333",
                    fontSize: 14,
                    lineHeight: 1,
                  }}>
                    │
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{
          marginTop: 20,
          background: "#111118",
          border: "1px solid #2a2a3a",
          borderRadius: 8,
          padding: "16px 18px",
        }}>
          <div style={{ fontSize: 10, color: "#6366f1", letterSpacing: 2, marginBottom: 10, textTransform: "uppercase" }}>
            The Retry Algorithm (Simplified)
          </div>
          <div style={{
            background: "#08090D",
            borderRadius: 6,
            padding: "12px 16px",
            fontFamily: "inherit",
            fontSize: 11.5,
            lineHeight: 1.9,
          }}>
            <div style={{ color: "#666" }}>// Client retries with same idempotency key</div>
            <div><span style={{ color: "#c792ea" }}>find</span> <span style={{ color: "#a5b4fc" }}>key_record</span> <span style={{ color: "#666" }}>by idempotency_key</span></div>
            <div style={{ marginTop: 4 }}><span style={{ color: "#c792ea" }}>loop</span> {"{"}</div>
            <div style={{ paddingLeft: 16 }}><span style={{ color: "#e09f3e" }}>case</span> key_record.recovery_point</div>
            <div style={{ paddingLeft: 32 }}><span style={{ color: "#89ddff" }}>"started"</span> <span style={{ color: "#666" }}>→ run Phase 2</span></div>
            <div style={{ paddingLeft: 32 }}><span style={{ color: "#89ddff" }}>"ride_created"</span> <span style={{ color: "#666" }}>→ run Phase 3 (Stripe call)</span></div>
            <div style={{ paddingLeft: 32 }}><span style={{ color: "#89ddff" }}>"charge_created"</span> <span style={{ color: "#666" }}>→ run Phase 4</span></div>
            <div style={{ paddingLeft: 32 }}><span style={{ color: "#2d6a4f" }}>"finished"</span> <span style={{ color: "#666" }}>→ return cached response</span></div>
            <div>{"}"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
