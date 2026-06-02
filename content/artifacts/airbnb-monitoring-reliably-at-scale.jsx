import { useState } from "react";

const sections = [
  { id: "problem", label: "The Problem" },
  { id: "compute", label: "Compute" },
  { id: "network", label: "Network" },
  { id: "deadman", label: "Dead Man's Switch" },
];

const computeOptions = [
  {
    id: "shared",
    label: "Shared production clusters",
    verdict: "Rejected",
    verdictColor: "#ef4444",
    icon: "✕",
    pros: ["No new infrastructure", "Already operated"],
    cons: [
      "Circular dependency — monitoring fails with the infra it's monitoring",
      "Shared blast radius with all other workloads",
    ],
  },
  {
    id: "own",
    label: "Their own clusters",
    verdict: "Rejected",
    verdictColor: "#ef4444",
    icon: "✕",
    pros: ["Full isolation", "Independent failure domains"],
    cons: [
      "Heavy K8s operational expertise required",
      "Unsustainable maintenance burden for a small team",
      "Reinvents what the Cloud team already does well",
    ],
  },
  {
    id: "dedicated",
    label: "Dedicated but managed",
    verdict: "Chosen",
    verdictColor: "#22c55e",
    icon: "✓",
    pros: [
      "Isolated from app workloads — no circular dependency",
      "Cloud team manages the clusters — low ongoing overhead",
      "Changes coordinated and validated on lower-priority clusters first",
    ],
    cons: [
      "Still depends on Cloud team's availability (acceptable)",
      "Coordination overhead with another team",
    ],
  },
];

const deadmanChain = [
  { label: "Metrics engine", icon: "📊", desc: "The observability stack being monitored.", color: "#3b82f6" },
  { label: "Prometheus (isolated)", icon: "🔍", desc: "Scrapes metrics from the engine. Runs on separate nodes across availability zones.", color: "#a78bfa" },
  { label: "Always-firing alert rule", icon: "⚡", desc: "A rule that ALWAYS evaluates true while Prometheus is healthy — a constant heartbeat.", color: "#eab308" },
  { label: "Alertmanager (HA)", icon: "📢", desc: "Receives the heartbeat, continuously pushes to SNS.", color: "#eab308" },
  { label: "AWS SNS topic", icon: "☁️", desc: "Receives heartbeats. Lives outside Airbnb's infra — no shared failure domain.", color: "#22c55e" },
  { label: "CloudWatch alarm", icon: "⏰", desc: "Watches SNS message rate. If heartbeats STOP, the alarm fires.", color: "#ef4444" },
  { label: "PagerDuty → on-call", icon: "🚨", desc: "CloudWatch triggers PagerDuty. Engineer gets paged. Silence itself is the signal.", color: "#ef4444" },
];

export default function AirbnbMonitoring() {
  const [section, setSection] = useState("problem");
  const [selectedCompute, setSelectedCompute] = useState(null);
  const [deadmanMode, setDeadmanMode] = useState("normal");

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
          <div style={{ fontSize: 10, letterSpacing: 4, color: "#06b6d4", marginBottom: 6, textTransform: "uppercase" }}>
            Airbnb · Observability
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#f0f0f5", margin: 0, lineHeight: 1.3 }}>
            Monitoring Reliably at Scale
          </h1>
          <p style={{ fontSize: 12, color: "#888", marginTop: 6, lineHeight: 1.6 }}>
            Designing monitoring infrastructure that works when everything else doesn't. Three layers: compute isolation, network isolation, and a Dead Man's Switch that detects the absence of expected health signals.
          </p>
        </div>

        <div style={{
          background: "#111118",
          border: "1px solid #2a2a3a",
          borderRadius: 8,
          padding: "14px 16px",
          marginBottom: 18,
          borderLeft: "3px solid #06b6d4",
        }}>
          <div style={{ fontSize: 10, color: "#06b6d4", letterSpacing: 2, marginBottom: 6, textTransform: "uppercase" }}>
            The Key Insight
          </div>
          <p style={{ fontSize: 12, color: "#c0c0cc", margin: 0, lineHeight: 1.7 }}>
            Never let your safety mechanism depend on the thing it's protecting. Monitoring that runs on the infrastructure it monitors goes dark at precisely the moment it's needed most.
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
                border: `1px solid ${section === s.id ? "#06b6d4" : "#2a2a3a"}`,
                borderRadius: 6,
                background: section === s.id ? "#06b6d418" : "transparent",
                color: section === s.id ? "#06b6d4" : "#666",
                cursor: "pointer",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {section === "problem" && (
          <div>
            <p style={{ fontSize: 12, color: "#c0c0cc", lineHeight: 1.7, marginBottom: 14 }}>
              Airbnb's monitoring stack was built on the same Kubernetes clusters and Istio service mesh it was meant to observe. When the shared infrastructure failed, monitoring went dark — at exactly the moment it was needed.
            </p>

            <div style={{
              background: "#3a1a1a",
              border: "1px solid #ef4444",
              borderRadius: 8,
              padding: "14px 16px",
              boxShadow: "0 0 20px #ef444415",
            }}>
              <div style={{ fontSize: 10, color: "#ef4444", letterSpacing: 2, marginBottom: 10, textTransform: "uppercase", fontWeight: 600 }}>
                🔄 The Circular Dependency
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  ["App services", "runs on", "Shared K8s cluster"],
                  ["Metrics pipeline", "also runs on", "Shared K8s cluster"],
                  ["Metrics about K8s", "flows through", "Istio service mesh"],
                  ["Istio service mesh", "runs on", "Shared K8s cluster"],
                ].map(([from, rel, to], i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "7px 10px",
                    background: "#ef444415",
                    borderRadius: 5,
                    fontSize: 11.5,
                  }}>
                    <span style={{ color: "#f0f0f5", fontWeight: 600, minWidth: 130 }}>{from}</span>
                    <span style={{ color: "#ef4444", fontSize: 10 }}>—{rel}→</span>
                    <span style={{ color: "#999" }}>{to}</span>
                  </div>
                ))}
              </div>
              <div style={{
                marginTop: 12,
                padding: "10px 12px",
                background: "#1a0606",
                borderRadius: 5,
                border: "1px solid #ef444430",
              }}>
                <span style={{ fontSize: 11, color: "#ef4444", fontWeight: 600 }}>Result: </span>
                <span style={{ fontSize: 11.5, color: "#c0c0cc" }}>
                  K8s cluster degrades → metrics pipeline degrades → alerts don't fire → no one knows K8s is degraded.
                </span>
              </div>
            </div>
          </div>
        )}

        {section === "compute" && (
          <div>
            <p style={{ fontSize: 12, color: "#c0c0cc", lineHeight: 1.7, marginBottom: 14 }}>
              Three options were evaluated. Click each to see the tradeoff analysis.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {computeOptions.map((opt) => (
                <div key={opt.id}>
                  <div
                    onClick={() => setSelectedCompute(selectedCompute === opt.id ? null : opt.id)}
                    style={{
                      padding: "12px 14px",
                      background: selectedCompute === opt.id ? "#111118" : "#0c0d13",
                      border: `1px solid ${selectedCompute === opt.id ? opt.verdictColor + "60" : "#2a2a3a"}`,
                      borderRadius: selectedCompute === opt.id ? "6px 6px 0 0" : 6,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 14, color: opt.verdictColor }}>{opt.icon}</span>
                        <span style={{ fontSize: 12.5, color: "#f0f0f5", fontWeight: 600 }}>{opt.label}</span>
                      </div>
                      <span style={{
                        fontSize: 9,
                        padding: "3px 8px",
                        background: `${opt.verdictColor}20`,
                        border: `1px solid ${opt.verdictColor}40`,
                        borderRadius: 3,
                        color: opt.verdictColor,
                        letterSpacing: 1.5,
                        textTransform: "uppercase",
                      }}>{opt.verdict}</span>
                    </div>
                  </div>
                  {selectedCompute === opt.id && (
                    <div style={{
                      padding: "12px 14px",
                      background: "#111118",
                      border: `1px solid ${opt.verdictColor}60`,
                      borderTop: "none",
                      borderRadius: "0 0 6px 6px",
                      display: "flex",
                      gap: 14,
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 9, color: "#22c55e", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6, fontWeight: 600 }}>Pros</div>
                        {opt.pros.map((p, i) => (
                          <div key={i} style={{ fontSize: 11, color: "#c0c0cc", padding: "2px 0", lineHeight: 1.5 }}>
                            <span style={{ color: "#22c55e", marginRight: 5 }}>+</span>{p}
                          </div>
                        ))}
                      </div>
                      <div style={{ width: 1, background: "#2a2a3a" }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 9, color: "#ef4444", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6, fontWeight: 600 }}>Cons</div>
                        {opt.cons.map((c, i) => (
                          <div key={i} style={{ fontSize: 11, color: "#c0c0cc", padding: "2px 0", lineHeight: 1.5 }}>
                            <span style={{ color: "#ef4444", marginRight: 5 }}>−</span>{c}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{
              marginTop: 14,
              padding: "12px 14px",
              background: "#06b6d418",
              borderRadius: 6,
              borderLeft: "3px solid #06b6d4",
            }}>
              <div style={{ fontSize: 10, color: "#06b6d4", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6, fontWeight: 600 }}>Key Principle</div>
              <p style={{ fontSize: 11.5, color: "#c0c0cc", margin: 0, lineHeight: 1.7 }}>
                <strong style={{ color: "#f0f0f5" }}>Goldilocks isolation:</strong> don't share failure domains with what you monitor, but don't take on operational burden you can't sustain. Leverage existing managed platforms with dedicated tenancy.
              </p>
            </div>
          </div>
        )}

        {section === "network" && (
          <div>
            <p style={{ fontSize: 12, color: "#c0c0cc", lineHeight: 1.7, marginBottom: 14 }}>
              Observability traffic is orders of magnitude larger than business traffic. Sharing the Istio data plane created both a circular dependency AND a congestion risk.
            </p>

            <div style={{
              background: "#3a1a1a",
              border: "1px solid #ef4444",
              borderRadius: 8,
              padding: "12px 14px",
              marginBottom: 12,
            }}>
              <div style={{ fontSize: 10, color: "#ef4444", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, fontWeight: 600 }}>
                Before: Shared service mesh
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11.5 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: "#eab308", minWidth: 90 }}>App traffic</span>
                  <span style={{ flex: 1, borderTop: "1px solid #eab30850", height: 1 }} />
                  <span style={{ fontSize: 10, color: "#666" }}>via Istio</span>
                  <span style={{ flex: 1, borderTop: "1px solid #eab30850", height: 1 }} />
                  <span style={{ color: "#eab308" }}>→ Backend</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: "#a78bfa", minWidth: 90 }}>Metrics</span>
                  <span style={{ flex: 1, borderTop: "1px solid #a78bfa50", height: 1 }} />
                  <span style={{ fontSize: 10, color: "#666" }}>via Istio</span>
                  <span style={{ flex: 1, borderTop: "1px solid #a78bfa50", height: 1 }} />
                  <span style={{ color: "#a78bfa" }}>→ Metrics store</span>
                </div>
              </div>
              <div style={{ marginTop: 8, fontSize: 10.5, color: "#ef4444", padding: "5px 10px", background: "#ef444418", borderRadius: 4 }}>
                ⚠ Same pipe. Telemetry spikes can starve app traffic. Mesh failure blinds monitoring.
              </div>
            </div>

            <div style={{
              background: "#0a2a1a",
              border: "1px solid #22c55e",
              borderRadius: 8,
              padding: "12px 14px",
              boxShadow: "0 0 20px #22c55e15",
            }}>
              <div style={{ fontSize: 10, color: "#22c55e", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, fontWeight: 600 }}>
                After: Separated paths
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11.5 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: "#eab308", minWidth: 90 }}>App traffic</span>
                  <span style={{ flex: 1, borderTop: "1px solid #eab30850", height: 1 }} />
                  <span style={{ fontSize: 10, color: "#666" }}>Istio mesh</span>
                  <span style={{ flex: 1, borderTop: "1px solid #eab30850", height: 1 }} />
                  <span style={{ color: "#eab308" }}>→ Backend</span>
                </div>
                <div style={{ textAlign: "center", fontSize: 9, color: "#666", letterSpacing: 2, padding: "2px 0", textTransform: "uppercase" }}>
                  ── completely separated ──
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: "#a78bfa", minWidth: 90 }}>Metrics</span>
                  <span style={{ flex: 1, borderTop: "1px solid #a78bfa50", height: 1 }} />
                  <span style={{ fontSize: 10, color: "#06b6d4" }}>Custom Envoy L7</span>
                  <span style={{ flex: 1, borderTop: "1px solid #a78bfa50", height: 1 }} />
                  <span style={{ color: "#a78bfa" }}>→ Metrics store</span>
                </div>
              </div>
              <div style={{ marginTop: 8, fontSize: 10.5, color: "#22c55e", padding: "5px 10px", background: "#22c55e18", borderRadius: 4 }}>
                ✓ Mesh can fail without affecting metrics. Traffic types can't interfere with each other.
              </div>
            </div>

            <div style={{
              marginTop: 14,
              padding: "12px 14px",
              background: "#111118",
              borderRadius: 6,
              borderLeft: "3px solid #a78bfa",
            }}>
              <div style={{ fontSize: 10, color: "#a78bfa", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6, fontWeight: 600 }}>
                Why own networking but not compute?
              </div>
              <div style={{ fontSize: 11.5, color: "#c0c0cc", lineHeight: 1.7 }}>
                Compute (K8s) was already a mature managed platform — adding dedicated clusters was a small increment. Networking needed telemetry-specific features the shared mesh couldn't provide: strict prioritization, tenant-based header routing for 1,000+ services, traffic mirroring, fine-grained access control.
              </div>
            </div>
          </div>
        )}

        {section === "deadman" && (
          <div>
            <p style={{ fontSize: 12, color: "#c0c0cc", lineHeight: 1.7, marginBottom: 14 }}>
              Who monitors the monitors? Instead of infinite layers of monitoring, use a <strong style={{ color: "#f0f0f5" }}>Dead Man's Switch</strong> — a signal that says "I'm alive." When the signal stops, something is wrong.
            </p>

            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <button onClick={() => setDeadmanMode("normal")} style={{
                padding: "6px 12px", fontSize: 11, fontFamily: "inherit",
                border: `1px solid ${deadmanMode === "normal" ? "#06b6d4" : "#2a2a3a"}`,
                borderRadius: 5,
                background: deadmanMode === "normal" ? "#06b6d418" : "transparent",
                color: deadmanMode === "normal" ? "#06b6d4" : "#666",
                cursor: "pointer",
              }}>
                Full chain
              </button>
              <button onClick={() => setDeadmanMode("broken")} style={{
                padding: "6px 12px", fontSize: 11, fontFamily: "inherit",
                border: `1px solid ${deadmanMode === "broken" ? "#ef4444" : "#2a2a3a"}`,
                borderRadius: 5,
                background: deadmanMode === "broken" ? "#ef444418" : "transparent",
                color: deadmanMode === "broken" ? "#ef4444" : "#666",
                cursor: "pointer",
              }}>
                💥 When it breaks
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              {deadmanChain.map((item, i) => {
                const broken = deadmanMode === "broken" && i >= 1 && i <= 3;
                const silence = deadmanMode === "broken" && i === 4;
                const fires = deadmanMode === "broken" && i >= 5;
                let borderColor = item.color;
                let bg = "#0c0d13";
                if (broken) { borderColor = "#ef4444"; bg = "#3a1a1a"; }
                if (fires) { borderColor = "#ef4444"; bg = "#1a0606"; }

                return (
                  <div key={i}>
                    <div style={{
                      padding: "10px 14px",
                      background: bg,
                      border: `1px solid ${borderColor}50`,
                      borderRadius: 6,
                      display: "flex", alignItems: "center", gap: 10,
                    }}>
                      <span style={{ fontSize: 18 }}>{item.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: "#f0f0f5", fontWeight: 600 }}>{item.label}</div>
                        <div style={{ fontSize: 11, color: broken ? "#ef4444" : "#999", marginTop: 2, lineHeight: 1.5 }}>
                          {broken ? "💥 DOWN — crashed, stalled, or unreachable" : fires ? "🚨 FIRES because heartbeats stopped" : silence ? "📭 No messages arriving — silence detected" : item.desc}
                        </div>
                      </div>
                    </div>
                    {i < deadmanChain.length - 1 && (
                      <div style={{
                        textAlign: "center",
                        padding: "2px 0",
                        color: deadmanMode === "broken" && i >= 1 && i <= 3 ? "#ef4444" : "#333",
                        fontSize: 12,
                      }}>
                        ▼
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{
              marginTop: 14,
              padding: "12px 14px",
              background: "#111118",
              borderRadius: 6,
              borderLeft: "3px solid #eab308",
            }}>
              <div style={{ fontSize: 10, color: "#eab308", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6, fontWeight: 600 }}>
                Why this stops infinite regress
              </div>
              <div style={{ fontSize: 11.5, color: "#c0c0cc", lineHeight: 1.7 }}>
                Normal monitoring detects <strong style={{ color: "#f0f0f5" }}>the presence of bad signals</strong> (errors, latency spikes). The Dead Man's Switch detects <strong style={{ color: "#f0f0f5" }}>the absence of good signals</strong> (heartbeats stop). CloudWatch just counts messages — almost nothing to fail. This breaks the recursion: the final watchdog is as simple as "am I still receiving pings?"
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
