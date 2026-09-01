import { useState } from "react";

const ACCENT = "#e0616e";      // Skipper coral
const GREEN = "#22c55e"; const CYAN = "#22b8cf"; const AMBER = "#eab308"; const RED = "#ef4444"; const VIOLET = "#9b8cf0";
const OFF = "#4a4f60";

// The listing-publication workflow, laid out across (async) time.
const STEPS = [
  { id: "submit", kind: "action", label: "submit photos", sub: "external review request", t: "0h" },
  { id: "wait", kind: "wait", label: "waitUntil(photos approved)", sub: "hibernates: thread freed, state saved as a DB row", t: "0 - 24h" },
  { id: "activate", kind: "action", label: "activate listing", sub: "listing goes live", t: "~24h" },
  { id: "notify", kind: "action", label: "notify host", sub: "host notified", t: "~24h" },
];
const WAIT_IDX = 1;

export default function SkipperTimeline() {
  const [arch, setArch] = useState("embedded");  // "embedded" | "central"
  const [at, setAt] = useState(0);               // index of next step (STEPS.length = done)
  const [committed, setCommitted] = useState({}); // stepId -> true (survives a crash)
  const [signaled, setSignaled] = useState(false);
  const [crash, setCrash] = useState(null);      // null | "process" | "orchestrator"
  const [replaying, setReplaying] = useState(false);
  const [log, setLog] = useState([]);

  const done = at >= STEPS.length;
  const step = STEPS[at];
  const hibernating = !done && step.kind === "wait" && !signaled && at === WAIT_IDX;
  const frozen = arch === "central" && crash === "orchestrator";
  const addLog = (text, kind) => setLog((l) => [...l, { text, kind }].slice(-7));

  const reset = () => { setAt(0); setCommitted({}); setSignaled(false); setCrash(null); setReplaying(false); setLog([]); };

  const advance = () => {
    if (done || frozen) return;
    setCrash(null); setReplaying(false);
    if (step.kind === "action") {
      setCommitted((c) => ({ ...c, [step.id]: true }));
      addLog(`${step.label}: ran + checkpointed to DB`, "ok");
      setAt(at + 1);
    } else { // wait
      if (!signaled) { addLog("hibernating: 0 compute, waiting as a row in the DB", "wait"); }
      else { addLog("signal present: workflow wakes and continues", "ok"); setAt(at + 1); }
    }
  };

  const sendSignal = () => {
    if (frozen) return;
    setSignaled(true); setCrash(null);
    if (at === WAIT_IDX) { addLog("signal @SignalMethod arrived: photosApproved = true", "signal"); }
  };

  const crashProcess = () => {
    if (done) return;
    if (arch === "embedded") {
      setCrash("process"); setReplaying(true);
      const skipped = STEPS.slice(0, at).filter((s) => s.kind === "action" && committed[s.id]).map((s) => s.label);
      addLog("process crashed - in-memory progress lost", "crash");
      addLog(`replay from top: ${skipped.length ? skipped.join(", ") + " -> SKIP (saved results)" : "nothing to skip"}; resume at "${done ? "done" : step.label}"`, "replay");
    } else {
      setCrash("process");
      addLog("worker crashed - the central cluster re-dispatched the step to another worker; workflow continues", "replay");
    }
  };

  const crashOrchestrator = () => {
    setCrash("orchestrator");
    addLog("central cluster is DOWN - no workflow can start, advance, or resume", "crash");
  };

  const verdict = (() => {
    if (frozen) return { c: RED, code: "THE CENTRAL CLUSTER IS DOWN - EVERYTHING IS FROZEN",
      t: "With a central orchestrator, every workflow in every service runs through the one cluster. It has failed, so nothing can start, advance, or resume anywhere - the whole platform waits for it to come back. This single point of failure is exactly what the embedded model avoids: switch to Embedded and crash all you like." };
    if (crash === "process" && arch === "embedded") return { c: GREEN, code: "CRASHED, THEN REPLAYED - NOTHING LOST",
      t: "The service died and its in-memory progress vanished, but the checkpoints are safe in the database. On restart Skipper replays the workflow method from the top: already-checkpointed actions return their saved results instantly and are skipped, and the workflow resumes at the first step that had not yet committed. No work redone, no action run twice." };
    if (crash === "process" && arch === "central") return { c: AMBER, code: "WORKER CRASHED - THE CLUSTER RE-RAN IT",
      t: "A single worker died, but the central cluster is still up and holds the workflow's state, so it simply hands the step to another worker and the workflow continues. A worker crash is survivable here. The dangerous crash in this architecture is the cluster itself - try 'Crash the orchestrator'." };
    if (done) return { c: GREEN, code: "WORKFLOW COMPLETE",
      t: arch === "embedded" ? "All actions checkpointed, the wait hibernated at zero cost, and the workflow reached a terminal state - all inside the service, with no external engine in the path." : "Complete - but every step paid a network round-trip to the central cluster to persist its result before advancing." };
    if (hibernating) return { c: CYAN, code: "HIBERNATING - ZERO COMPUTE",
      t: "The workflow hit waitUntil. Its state was written to the database and the thread was handed back to the pool. Right now the workflow is not running at all - it exists only as a row in the DB, using no compute, whether the wait is seconds or weeks. Send the signal to wake it." };
    if (at === 0) return { c: AMBER, code: arch === "embedded" ? "EMBEDDED: THE ENGINE IS A LIBRARY IN THIS SERVICE" : "CENTRAL: EVERY STEP GOES THROUGH THE CLUSTER",
      t: arch === "embedded" ? "Skipper runs inside this service, storing state in the service's own database. Step the workflow forward. On the happy path it is almost free - just a few DB writes - and the engine only does real work when something goes wrong." : "A dedicated cluster drives the workflow. It gives exactly-once guarantees, but every activity needs a network round-trip to the cluster, and the cluster is a dependency every service shares. Step forward, then crash a worker - and then crash the orchestrator." };
    return { c: ACCENT, code: `RUNNING - STEP ${at + 1} OF ${STEPS.length}`,
      t: `Next: ${step.label}. ${step.kind === "action" ? "An Action wraps a side effect; @Execute(checkpoint = true) saves its result to the DB the moment it runs, so a later crash can skip it." : "A durable wait: the workflow will hibernate until the signal arrives."}` };
  })();

  const mono = "'JetBrains Mono','Fira Code',ui-monospace,monospace";
  const S = {
    root: { background: "#0b0b10", color: "#c8cdd8", fontFamily: mono, maxWidth: 980, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid #23232e", fontSize: 12, lineHeight: 1.5 },
    panel: { background: "#14141c", border: "1px solid #23232e", borderRadius: 8, padding: 12 },
    label: { color: "#7a8090", fontSize: 10, letterSpacing: 1.2 },
    btn: (on, dis, col) => ({ display: "inline-block", padding: "7px 11px", marginTop: 6, marginRight: 6, borderRadius: 6, cursor: dis ? "not-allowed" : "pointer", opacity: dis ? 0.4 : 1, border: `1px solid ${on ? (col || ACCENT) : OFF}`, color: on ? "#fff" : "#aab0c0", background: on ? `${col || ACCENT}22` : "#101018", fontFamily: mono, fontSize: 11, fontWeight: on ? 700 : 400 }),
  };

  // colours per timeline segment
  const segState = (i) => {
    const s = STEPS[i];
    if (committed[s.id]) return "done";
    if (s.kind === "wait" && at > WAIT_IDX) return "done";
    if (i === at && !frozen) return "current";
    if (i === at && frozen) return "frozen";
    return "future";
  };
  const segColor = { done: GREEN, current: ACCENT, frozen: RED, future: "#2a2a38" };

  return (
    <div style={S.root}>
      <div style={{ color: ACCENT, fontSize: 10, letterSpacing: 2 }}>SKIPPER - A DURABLE WORKFLOW ON A TIMELINE - INTERACTIVE</div>
      <div style={{ color: "#edeff3", fontSize: 16, margin: "4px 0 2px", fontWeight: 700 }}>Step it, hibernate it, crash it</div>
      <p style={{ color: "#8b90a0", fontSize: 11, margin: 0 }}>A multi-step listing workflow across async time. Watch a crash in the embedded engine versus a central orchestrator.</p>
      <ContextBlock />

      <div style={{ ...S.panel, marginTop: 12 }}>
        <div style={S.label}>ARCHITECTURE</div>
        <button style={S.btn(arch === "embedded", false, ACCENT)} onClick={() => { setArch("embedded"); reset(); }}>EMBEDDED (Skipper: a library in the service)</button>
        <button style={S.btn(arch === "central", false, VIOLET)} onClick={() => { setArch("central"); reset(); }}>CENTRAL ORCHESTRATOR (a shared cluster)</button>
      </div>

      {/* TIMELINE */}
      <div style={{ ...S.panel, marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={S.label}>THE WORKFLOW ACROSS TIME</div>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: hibernating ? CYAN : done ? GREEN : frozen ? RED : ACCENT }}>
            COMPUTE: {hibernating ? "0 - asleep" : frozen ? "frozen" : done ? "idle - complete" : "running"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, marginTop: 10, alignItems: "stretch" }}>
          {STEPS.map((s, i) => {
            const st = segState(i);
            const c = segColor[st];
            const wide = s.kind === "wait";
            return (
              <div key={s.id} style={{ flex: wide ? "2.4 1 0" : "1 1 0", minWidth: 0, background: `${c}1c`, border: `1px solid ${c}`, borderRadius: 6, padding: "8px 9px", position: "relative", opacity: st === "future" ? 0.55 : 1, borderStyle: (i === at && crash === "process") ? "dashed" : "solid" }}>
                <div style={{ fontSize: 9, color: "#7a8090" }}>{s.t}</div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: c, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis" }}>{s.label}</div>
                <div style={{ fontSize: 9, color: "#8b90a0", marginTop: 3, lineHeight: 1.4 }}>{hibernating && i === WAIT_IDX ? "asleep - 0 compute, just a DB row" : s.sub}</div>
                <div style={{ fontSize: 9, marginTop: 5, fontWeight: 700, color: committed[s.id] ? GREEN : (s.kind === "wait" && at > WAIT_IDX) ? GREEN : st === "current" ? c : "#5c6474" }}>
                  {committed[s.id] ? "checkpoint saved" : s.kind === "wait" ? (at > WAIT_IDX ? "woke + resumed" : hibernating ? "waiting for signal" : "wait") : st === "current" ? "next to run" : st === "frozen" ? "frozen" : "pending"}
                </div>
                {i === at && crash === "process" && <div style={{ position: "absolute", top: 4, right: 6, fontSize: 12 }}>💥</div>}
              </div>
            );
          })}
          <div style={{ flex: "0.7 1 0", background: done ? `${GREEN}1c` : "#14141c", border: `1px dashed ${done ? GREEN : "#2a2a38"}`, borderRadius: 6, padding: "8px 9px", display: "flex", alignItems: "center", justifyContent: "center", color: done ? GREEN : "#5c6474", fontSize: 10.5, fontWeight: 700 }}>{done ? "DONE ✓" : "done"}</div>
        </div>
        {replaying && arch === "embedded" && (
          <div style={{ marginTop: 9, fontSize: 10.5, color: CYAN }}>↻ replay: checkpointed actions return saved results instantly (skipped); the workflow resumes at the first uncommitted step - no work redone.</div>
        )}
      </div>

      {/* CENTRAL SPOF STRIP */}
      {arch === "central" && (
        <div style={{ ...S.panel, marginTop: 12, borderColor: frozen ? RED : "#23232e" }}>
          <div style={S.label}>THE SHARED CLUSTER {frozen ? "- DOWN" : ""}</div>
          <div style={{ display: "flex", gap: 10, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ padding: "8px 12px", borderRadius: 6, border: `1px solid ${frozen ? RED : VIOLET}`, background: frozen ? `${RED}18` : `${VIOLET}18`, color: frozen ? RED : VIOLET, fontWeight: 700, fontSize: 11 }}>
              central cluster {frozen ? "✕ DOWN" : "● up"}
            </div>
            <div style={{ color: "#5c6474" }}>drives →</div>
            {["this workflow", "payments svc", "media svc"].map((w, i) => (
              <div key={i} style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${frozen ? RED : "#2a2a38"}`, color: frozen ? RED : "#9aa0b0", fontSize: 10.5, background: frozen ? `${RED}12` : "#101018" }}>
                {w} {frozen ? "- FROZEN" : ""}
              </div>
            ))}
          </div>
          {frozen && <div style={{ fontSize: 10, color: RED, marginTop: 8 }}>▲ one cluster outage stops every dependent service at once - the single point of failure the embedded model removes.</div>}
        </div>
      )}

      {/* VERDICT */}
      <div style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${verdict.c}`, background: `${verdict.c}14`, marginTop: 12 }}>
        <div style={{ color: verdict.c, fontWeight: 700, fontSize: 12 }}>{verdict.code}</div>
        <div style={{ marginTop: 5, fontSize: 11.5, lineHeight: 1.6 }}>{verdict.t}</div>
      </div>

      {/* CONTROLS */}
      <div style={{ ...S.panel, marginTop: 12 }}>
        <div style={S.label}>CONTROLS</div>
        <div>
          <button style={S.btn(false, done || frozen, GREEN)} disabled={done || frozen} onClick={advance}>▶ {hibernating ? "STAY ASLEEP (advance)" : "ADVANCE ONE STEP"}</button>
          <button style={S.btn(signaled, signaled || frozen, CYAN)} disabled={signaled || frozen} onClick={sendSignal}>✉ SEND SIGNAL (photos approved)</button>
          <button style={S.btn(false, done || frozen, RED)} disabled={done || frozen} onClick={crashProcess}>💥 CRASH THE {arch === "embedded" ? "SERVICE" : "WORKER"}</button>
          {arch === "central" && <button style={S.btn(frozen, done || frozen, RED)} disabled={done || frozen} onClick={crashOrchestrator}>💥 CRASH THE ORCHESTRATOR</button>}
          <button style={S.btn(false, false, "#8b90a0")} onClick={reset}>↺ RESET</button>
        </div>
        <div style={{ fontSize: 9.5, color: "#6b7080", marginTop: 8, lineHeight: 1.7 }}>
          Try: advance to the wait, crash the service (embedded) and watch replay skip the saved steps. Then switch to Central, crash a worker (survives), then crash the orchestrator (everything freezes).
        </div>
      </div>

      {/* LOG */}
      {log.length > 0 && (
        <div style={{ ...S.panel, marginTop: 12 }}>
          <div style={S.label}>EVENT LOG</div>
          <div style={{ marginTop: 6 }}>
            {log.map((e, i) => {
              const col = { ok: GREEN, wait: CYAN, signal: VIOLET, crash: RED, replay: CYAN }[e.kind] || "#8b90a0";
              return <div key={i} style={{ fontSize: 10.5, color: col, padding: "2px 0", fontFamily: mono }}>· {e.text}</div>;
            })}
          </div>
        </div>
      )}

      <div style={{ color: "#6b7080", fontSize: 10, marginTop: 12, borderTop: "1px solid #23232e", paddingTop: 8, lineHeight: 1.7 }}>
        The workflow (submit photos, wait for review, activate, notify) and its mechanics are from Airbnb's Skipper post: durability by replay with checkpointed actions, hibernation on waitUntil (zero compute, state as a DB row), and the embedded-vs-central tradeoff where a shared orchestrator is a single point of failure for user-facing services. Timing and the three-service cluster are illustrative.
        {" "}<a href="https://behindscale.com/articles/skipper-workflow-engine" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: "none" }}>From the full dissection at behindscale.com →</a>
      </div>
    </div>
  );
}

function ContextBlock() {
  const [open, setOpen] = useState(true);
  const lbl = { fontSize: 10, color: ACCENT, letterSpacing: 1.2 };
  if (!open) return <button onClick={() => setOpen(true)} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontFamily: "inherit", fontSize: 10, padding: 0, margin: "10px 0 0", display: "block" }}>SHOW CONTEXT ▾</button>;
  return (
    <div style={{ background: "#14141c", border: "1px solid #23232e", borderRadius: 8, padding: "12px 14px", marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <div style={{ fontSize: 10, color: "#7a8090", letterSpacing: 1.2 }}>CONTEXT - IF YOU ARRIVED HERE WITHOUT THE ARTICLE</div>
        <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontFamily: "inherit", fontSize: 10, padding: 0 }}>HIDE ✕</button>
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 8 }}><span style={lbl}>THE PROBLEM · </span>A multi-step process (an insurance claim, a listing publication) can span hours to days, so a crash partway through is expected, not rare. It can leave duplicate side effects or half-finished state.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>THE MOVE · </span>Skipper is a library embedded in each service, storing state in the service's own database. Durability comes from replay: on restart the method runs again, skipping actions already checkpointed. Long waits hibernate to a DB row at zero compute, and no shared cluster means no single point of failure.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>TRY · </span>Advance the workflow to the wait and watch it hibernate. Crash the service and watch replay skip the saved steps. Then switch to a central orchestrator and crash it - and watch every workflow freeze at once.</div>
    </div>
  );
}
