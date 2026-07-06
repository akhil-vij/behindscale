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

const ACCENT = "#2DD4BF";
const RED = "#ef4444";
const AMBER = "#eab308";
const GREEN = "#22c55e";
const SERVICES = ["rides T0", "payments T0", "eats T1", "cron T3", "pipeline T4", "training T5"];

const INJECTIONS = [
  { id: "none", label: "HEALTHY", hint: "workflows advancing on both sides" },
  { id: "worker", label: "CRASH A WORKER MID-WORKFLOW", hint: "the crux both engines exist for" },
  { id: "engine", label: "ORCHESTRATOR / ENGINE HOST FAILS", hint: "the failure that decided Airbnb's bet" },
  { id: "bug", label: "SHIP AN ENGINE FIX", hint: "who deploys, and how many times" },
  { id: "noisy", label: "NOISY TENANT — 1M TIMERS FIRE AT ONCE", hint: "the failure that shapes Cadence's feature list" },
];

function verdicts(inj) {
  switch (inj) {
    case "worker": return {
      emb: { sev: "ok", code: "RECOVERS — REPLAY, LOCALLY", text: "The workflow resumes from its checkpoints inside the service. Committed steps are skipped, not re-executed — Skipper's guarantee, delivered by the library each service carries." },
      cen: { sev: "ok", code: "RECOVERS — REPLAY, CENTRALLY", text: "Cadence resumes the workflow from persisted state on another worker: durable, transactional, fault tolerant without the author thinking about it. Same guarantee, same crux answered — the topology is the only difference. This is durable-workflows recurring across opposite architectures." },
    };
    case "engine": return {
      emb: { sev: "ok", code: "NO SHARED FATE TO LOSE", text: "There is no central engine host to fail. One service's engine dying is that service's incident; rides, payments, and the pipelines never notice. This is the exact blast-radius argument that disqualified a central orchestrator for Airbnb's Tier-0 services." },
      cen: { sev: "bad", code: "EVERY TENANT STALLS TOGETHER", text: "One platform outage and every lane freezes — T0 rides and T5 training alike. All workflows stall until failover completes. Uber's answer is to industrialize exactly this risk: region failovers, a 2022 reliability year, and a 99.9% availability guarantee that is now the ceiling every tenant inherits." },
    };
    case "bug": return {
      emb: { sev: "bad", code: "FIX SHIPPED 1,000 TIMES", text: "The engine is a library inside every service — so the patch rides each team's deploy train. A thousand services means a thousand rollouts, each on its own schedule; the long tail runs the old engine for months. Operating knowledge is distributed too: there is no one place to observe or fix." },
      cen: { sev: "ok", code: "ONE ROLLOUT — WITH A CATCH", text: "The platform team ships once and every tenant is patched. The catch is in-flight workflows: replay demands determinism, so the fix must be versioned against workflows already running — and six-plus years of backward compatibility means API mistakes are worked around, never removed. One rollout, carried carefully." },
    };
    case "noisy": return {
      emb: { sev: "ok", code: "ISOLATED BY CONSTRUCTION", text: "Your engine runs only your workflows. A tenant cannot be noisy in an architecture with no shared tenancy — the isolation Cadence must build and operate, the embedded design gets for free. (Its price was paid elsewhere: in the thousand deployments.)" },
      cen: { sev: "warn", code: "CONTAINED — BY PERMANENT DISCIPLINE", text: "One tenant's million timers land on shared shards and queues. The platform absorbs it with the machinery its feature list exists for: built-in rate limits, hot-shard detection, per-domain scale tracking. The burst is contained; the discipline never ends — capacity itself is managed by rate limits, with the database the bottleneck under everything." },
    };
    default: return {
      emb: { sev: "ok", code: "HEALTHY — ENGINE IN EVERY SERVICE", text: "Each service carries the workflow engine as a library. Durability is local; so is every operational burden." },
      cen: { sev: "ok", code: "HEALTHY — ONE PLATFORM, 1,000+ TENANTS", text: "One engine, operated by ~20 engineers, runs 12 billion executions and 270 billion actions a month at Uber — teams write 40% less code for the same functionality." },
    };
  }
}

export default function TwoAnswers() {
  const [inj, setInj] = useState("none");
  const [t, setT] = useState(0);
  const rng = useRef(mulberry32(42));
  useEffect(() => {
    const id = setInterval(() => setT((x) => x + 1), 300);
    return () => clearInterval(id);
  }, []);

  const v = verdicts(inj);
  const sevColor = (s) => (s === "ok" ? GREEN : s === "warn" ? AMBER : RED);

  // per-lane motion: a dot advancing; frozen/red per injection rules
  const laneState = (side, i) => {
    if (inj === "engine") {
      if (side === "cen") return "frozen";
      return i === 1 ? "localdown" : "moving"; // embedded: one service's own engine died — its problem alone
    }
    if (inj === "bug" && side === "emb") return "needsdeploy";
    if (inj === "noisy" && side === "cen") return i >= 4 ? "throttled" : "moving";
    if (inj === "worker") return i === 0 ? "recovering" : "moving";
    return "moving";
  };

  const mono = "'JetBrains Mono','Fira Code','SF Mono',ui-monospace,monospace";
  const S = {
    root: { background: "#08090D", color: "#c8cdd8", fontFamily: mono, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid #2a2a3a", fontSize: 12, lineHeight: 1.5 },
    panel: { background: "#111118", border: "1px solid #2a2a3a", borderRadius: 8, padding: 12 },
    label: { color: "#6b7080", fontSize: 10, letterSpacing: 1.2 },
    btn: (on) => ({
      display: "block", width: "100%", textAlign: "left", padding: "7px 9px", marginTop: 6, borderRadius: 6, cursor: "pointer",
      border: `1px solid ${on ? ACCENT : "#2a2a3a"}`, color: on ? "#a7f3e9" : "#8b90a0",
      background: on ? "rgba(45,212,191,0.08)" : "#0c0d13", fontFamily: mono, fontSize: 11,
    }),
  };

  const Lane = ({ side, i }) => {
    const st = laneState(side, i);
    const dead = st === "frozen" || st === "localdown";
    const pos = dead ? 38 : ((t * (7 + (i * 13) % 11)) % 100);
    const color = dead ? RED : st === "needsdeploy" ? AMBER : st === "throttled" ? AMBER : st === "recovering" && (t % 6 < 2) ? AMBER : ACCENT;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
        <span style={{ fontSize: 9, color: SERVICES[i].includes("T0") ? "#c8cdd8" : "#6b7080", minWidth: 84 }}>{SERVICES[i]}</span>
        <div style={{ flex: 1, height: 8, background: "#1a1b24", borderRadius: 4, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", left: `${pos}%`, top: 1, width: 10, height: 6, borderRadius: 3, background: color, transition: "left 280ms linear" }} />
        </div>
        <span style={{ fontSize: 8.5, color, minWidth: 78 }}>
          {st === "frozen" ? "STALLED" : st === "localdown" ? "OWN ENGINE ✝" : st === "needsdeploy" ? "DEPLOY #" + (i + 1) : st === "throttled" ? "RATE-LIMITED" : st === "recovering" ? "REPLAYING" : "advancing"}
        </span>
      </div>
    );
  };

  const Column = ({ side, title, sub }) => {
    const vv = side === "emb" ? v.emb : v.cen;
    return (
      <div style={{ flex: "1 1 300px", minWidth: 280 }}>
        <div style={{ ...S.panel, borderColor: sevColor(vv.sev) + "66" }}>
          <div style={S.label}>{title}</div>
          <div style={{ fontSize: 9.5, color: "#6b7080", marginTop: 2 }}>{sub}</div>
          {side === "cen" && (
            <div style={{ margin: "8px 0 2px", padding: "5px 8px", borderRadius: 5, border: `1px solid ${inj === "engine" ? RED : inj === "bug" ? AMBER : "#2a2a3a"}`, background: "#0c0d13", fontSize: 9.5, color: inj === "engine" ? RED : "#8b90a0", textAlign: "center" }}>
              CADENCE PLATFORM — one engine, ~20 engineers{inj === "engine" ? " · DOWN, FAILING OVER" : inj === "bug" ? " · ROLLOUT 1 OF 1 (versioned against in-flight workflows)" : ""}
            </div>
          )}
          {SERVICES.map((_, i) => <Lane key={i} side={side} i={i} />)}
          {side === "emb" && inj === "bug" && (
            <div style={{ marginTop: 8, fontSize: 9.5, color: AMBER }}>deployments required to fully patch the fleet: 1,000+ (6 shown)</div>
          )}
          <div style={{ marginTop: 10, padding: "9px 11px", borderRadius: 6, border: `1px solid ${sevColor(vv.sev)}`, background: sevColor(vv.sev) + "14", fontSize: 11, lineHeight: 1.55 }}>
            <div style={{ color: sevColor(vv.sev), fontWeight: 700 }}>{vv.code}</div>
            <div style={{ marginTop: 4 }}>{vv.text}</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={S.root}>
      <div style={{ color: ACCENT, fontSize: 10, letterSpacing: 2 }}>UBER · CADENCE — INTERACTIVE</div>
      <div style={{ color: "#edeff3", fontSize: 16, margin: "4px 0 2px", fontWeight: 700 }}>Two answers to the same crash</div>
      <p style={{ color: "#8b90a0", fontSize: 11, margin: 0 }}>Airbnb embedded the workflow engine in every service. Uber built one platform for a thousand. Break both — the same way, at the same time.</p>

      <ContextBlock />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
        <div style={{ ...S.panel, flex: "1 1 220px", minWidth: 220 }}>
          <div style={S.label}>BREAK BOTH SIDES</div>
          {INJECTIONS.map((x) => (
            <button key={x.id} style={S.btn(inj === x.id)} onClick={() => setInj(x.id)}>
              {x.label}
              <div style={{ color: "#6b7080", fontSize: 10 }}>{x.hint}</div>
            </button>
          ))}
          <div style={{ ...S.label, marginTop: 14 }}>THE LEDGER — WHO CARRIES WHAT</div>
          <div style={{ fontSize: 10, color: "#8b90a0", lineHeight: 1.8, marginTop: 6 }}>
            engine copies: <span style={{ color: "#c8cdd8" }}>1,000+ vs 1</span><br />
            teams operating it: <span style={{ color: "#c8cdd8" }}>every team vs ~20 engineers</span><br />
            code per team: <span style={{ color: "#c8cdd8" }}>baseline vs 40% less</span><br />
            shared blast radius: <span style={{ color: "#c8cdd8" }}>none vs 99.9% ceiling, all tenants</span><br />
            noisy-neighbor risk: <span style={{ color: "#c8cdd8" }}>by construction, none vs permanent discipline</span>
          </div>
        </div>
        <div style={{ flex: "2 1 560px", minWidth: 300, display: "flex", flexWrap: "wrap", gap: 12 }}>
          <Column side="emb" title="EMBEDDED — SKIPPER'S ANSWER (AIRBNB)" sub="engine ships as a library inside each service" />
          <Column side="cen" title="CENTRAL — CADENCE'S ANSWER (UBER)" sub="one multi-tenant platform; workflows are ordinary code" />
        </div>
      </div>

      <div style={{ color: "#6b7080", fontSize: 10, marginTop: 12, borderTop: "1px solid #2a2a3a", paddingTop: 8, lineHeight: 1.7 }}>
        Six lanes stand in for 1,000+ services (T0 most critical to T5); timings are illustrative. The central column's claims are the Cadence 1.0 post's: workflows as native-language programs; 12 billion executions and 270 billion actions a month at Uber; 99.9% availability; 40% less code (2021 internal survey); built-in rate limits, hot-shard detection, and per-domain tracking for noisy neighbors; versioning, replay, and shadowing against in-flight workflows; six-plus years of backward compatibility; DB load as the recurring bottleneck. The embedded column's claims are Airbnb's, from the Skipper dissection this artifact diverges against. Neither column wins every row — that is the point.
        {" "}
        <a href="https://behindscale.com/articles/uber-cadence-workflow-platform" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: "none" }}>From the full dissection at behindscale.com →</a>
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
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 8 }}><span style={lbl}>THE PROBLEM · </span>A multi-step process that crashes between steps leaves its outcome to chance — and at a thousand-service company, the machinery that fixes it (state, queues, timers, retries) gets rebuilt slightly differently by every team. The duplicated scaffolding, not any single workflow, becomes what doesn't scale.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>THE MOVE · </span>Solve it once, centrally: Cadence, one multi-tenant workflow platform where workflows are ordinary code in native languages — durable, versioned, replayable — serving 1,000+ services from T0 down. Airbnb's Skipper answered the identical problem the opposite way: engine as a library in every service.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>TRY · </span>Fire each failure at both architectures at once and read the two verdicts: the worker crash both survive, the platform outage only one feels, the engine fix one ships once and the other a thousand times, and the noisy tenant only one has to police.</div>
    </div>
  );
}
