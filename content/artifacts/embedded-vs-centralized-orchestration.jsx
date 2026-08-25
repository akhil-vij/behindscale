import { useState, useEffect, useRef } from "react";

// Pattern artifact - Embedded vs Centralized Orchestration (comparison, interactive).
// Click any service (or the cluster) to fail it, then Run a cross-service workflow (A -> B -> C). A token
// moves through each topology and stalls where it breaks. Embedded has no cluster to lose but wires the
// coordination by hand; centralized coordinates cleanly but the cluster is a single point of failure.
// Structural grays use the named artifact tokens; GREEN/AMBER/RED and ACCENT are content accents.

const BG = "#08090D", SURFACE = "#0F1118", SURFACE2 = "#161922", BORDER = "#1F2333";
const TEXT = "#C8CDD8", MUTED = "#6B7280";
const GREEN = "#22C55E", AMBER = "#F5B841", RED = "#EF4444", ACCENT = "#F97316", PURPLE = "#A78BFA";
const MONO = "'JetBrains Mono','Fira Code',ui-monospace,monospace";

const N = 3;
const letter = (i) => String.fromCharCode(65 + i);

// Pure run model, mirrored by the headless test.
function runModel(down, clusterDown) {
  const firstDown = down.indexOf(true);
  const embStall = firstDown === -1 ? N : firstDown;               // token stalls at first down service, else N (done)
  const cenStall = clusterDown ? -2 : embStall;                    // -2 = cluster down, can't start
  return { embStall, cenStall };
}

export default function PatternEmbeddedVsCentralized() {
  const [down, setDown] = useState([false, false, false]);
  const [clusterDown, setClusterDown] = useState(false);
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearInterval(timer.current), []);
  const clear = () => clearInterval(timer.current);
  const toggleSvc = (i) => { if (running) return; clear(); setDown((d) => d.map((v, j) => (j === i ? !v : v))); setStep(0); setHasRun(false); setRunning(false); };
  const toggleCluster = () => { if (running) return; clear(); setClusterDown((v) => !v); setStep(0); setHasRun(false); setRunning(false); };
  const reset = () => { clear(); setDown([false, false, false]); setClusterDown(false); setStep(0); setHasRun(false); setRunning(false); };
  const run = () => { clear(); setStep(0); setRunning(true); setHasRun(false); let k = 0;
    timer.current = setInterval(() => { k += 1; setStep(k); if (k >= N) { clear(); setRunning(false); setHasRun(true); } }, 560); };

  const { embStall, cenStall } = runModel(down, clusterDown);
  const active = running || hasRun;

  // service visual state within a panel
  const svcState = (panel, i) => {
    if (down[i]) return "down";
    if (!active) return "up";
    const stall = panel === "cen" ? cenStall : embStall;
    if (stall === -2) return "up";                 // centralized: cluster down, never ran
    const reached = Math.min(step, stall);
    if (i < reached) return "passed";
    if (i === step && step < stall && running) return "active";
    return "up";
  };

  const svcNode = (panel, i) => {
    const st = svcState(panel, i);
    const map = { down: [RED, RED + "22"], up: [GREEN, "transparent"], passed: [GREEN, GREEN + "22"], active: [ACCENT, ACCENT + "22"] };
    const [bd, bg] = map[st];
    const mark = st === "down" ? " \u2715" : (st === "passed" ? " \u2713" : "");
    return (
      <button key={i} onClick={() => toggleSvc(i)} disabled={running} style={{ flex: 1, padding: "10px 2px", borderRadius: 7, cursor: running ? "default" : "pointer", fontFamily: MONO, fontSize: 10.5, fontWeight: 700, border: "1px solid " + bd, boxShadow: st === "active" ? "0 0 0 2px rgba(249,115,22,0.4)" : "none", background: bg, color: st === "down" ? RED : TEXT }}>Svc {letter(i)}{mark}</button>
    );
  };

  // outcomes
  let embOut, cenOut;
  if (!active) { embOut = null; cenOut = null; }
  else {
    embOut = embStall === N
      ? { c: AMBER, t: "Completed - but you had to wire A to B to C together by hand for it to run." }
      : { c: RED, t: "Stalled at Service " + letter(embStall) + ". There is no coordinator to manage it; each service handles the failure itself." };
    cenOut = clusterDown
      ? { c: RED, t: "The cluster is down, so the whole workflow can't even start - every service is blocked at once." }
      : (cenStall === N
        ? { c: GREEN, t: "Completed. The shared cluster coordinated every step across the three services." }
        : { c: RED, t: "Stalled at Service " + letter(cenStall) + ". The cluster sees the failure in one place and can retry it." });
  }

  const anyDown = down.some(Boolean);
  let take;
  if (running) take = "Running the workflow through both shapes...";
  else if (clusterDown && !anyDown) take = "You failed the shared cluster. Run it: centralized can't start at all, but embedded has no cluster to lose - that is embedded's isolation win.";
  else if (anyDown) take = "A single service down stalls both shapes at that service. This is where the two behave the same.";
  else if (hasRun) take = "All healthy: both finished, but only embedded made you wire the coordination by hand - that is centralized's coordination win.";
  else take = "Click a service or the cluster to fail it, then Run the workflow. Try failing the cluster, then a single service.";

  const panel = (title, sub, isCen, out) => (
    <div style={{ flex: "1 1 300px", minWidth: 280, background: SURFACE, border: "1px solid " + (out ? out.c : BORDER), borderRadius: 10, padding: 12 }}>
      <div style={{ color: "#EDEFF3", fontWeight: 700, fontSize: 12.5 }}>{title}</div>
      <div style={{ color: MUTED, fontSize: 10, marginBottom: 9 }}>{sub}</div>
      <div style={{ display: "flex", gap: 5 }}>{[0, 1, 2].map((i) => svcNode(isCen ? "cen" : "emb", i))}</div>
      {!isCen && <div style={{ display: "flex", gap: 5, marginTop: 3 }}>{[0, 1, 2].map((i) => <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 8, color: MUTED }}>&#9881; own orch</div>)}</div>}
      {isCen && (
        <>
          <div style={{ textAlign: "center", color: MUTED, fontSize: 12, lineHeight: 1, margin: "2px 0" }}>&#9474;&nbsp;&nbsp;&#9474;&nbsp;&nbsp;&#9474;</div>
          <button onClick={toggleCluster} disabled={running} style={{ width: "100%", padding: "8px", borderRadius: 7, cursor: running ? "default" : "pointer", fontFamily: MONO, fontSize: 10, fontWeight: 700, border: "1px solid " + (clusterDown ? RED : PURPLE), background: (clusterDown ? RED : PURPLE) + "22", color: clusterDown ? RED : PURPLE }}>ORCHESTRATOR CLUSTER{clusterDown ? " \u2715 down" : ""}</button>
        </>
      )}
      <div style={{ minHeight: 34, marginTop: 9, paddingTop: 7, borderTop: "1px solid " + BORDER, fontSize: 11, lineHeight: 1.5, color: out ? TEXT : MUTED }}>{out ? out.t : (isCen ? "one shared cluster coordinates the services" : "each service coordinates on its own")}</div>
    </div>
  );

  return (
    <div style={{ background: BG, color: TEXT, fontFamily: MONO, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid " + BORDER, fontSize: 12, lineHeight: 1.5 }}>
      <div style={{ color: ACCENT, fontSize: 10, letterSpacing: 2 }}>EMBEDDED VS CENTRALIZED - THE PATTERN, GENERAL</div>
      <div style={{ color: "#EDEFF3", fontSize: 16, margin: "4px 0 2px", fontWeight: 700 }}>Break something, then run a cross-service workflow</div>
      <p style={{ color: "#8B90A0", fontSize: 11, margin: 0 }}>Click a service or the cluster to fail it, then run a workflow spanning A, B, and C. Watch the token stall in different places - the trade is opposite.</p>

      {/* controls */}
      <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: SURFACE, border: "1px solid " + BORDER, borderRadius: 8, padding: "9px 12px" }}>
        <span style={{ color: MUTED, fontSize: 10, letterSpacing: 1.2 }}>WORKFLOW A &#8594; B &#8594; C</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={run} disabled={running} style={{ padding: "7px 18px", borderRadius: 7, cursor: running ? "default" : "pointer", fontFamily: MONO, fontSize: 12, fontWeight: 700, border: "1px solid " + ACCENT, background: running ? "transparent" : ACCENT, color: running ? ACCENT : "#0A0B0F", opacity: running ? .6 : 1 }}>{running ? "Running..." : (hasRun ? "\u21BA Run again" : "Run workflow")}</button>
          <button onClick={reset} disabled={running} style={{ padding: "7px 14px", borderRadius: 7, cursor: running ? "default" : "pointer", fontFamily: MONO, fontSize: 11, border: "1px solid " + BORDER, background: "transparent", color: "#9AA0B0" }}>&#8635; reset</button>
        </div>
      </div>

      {/* panels */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 14 }}>
        {panel("EMBEDDED", "orchestration inside each service", false, embOut)}
        {panel("CENTRALIZED", "one shared orchestrator cluster", true, cenOut)}
      </div>

      {/* takeaway */}
      <div style={{ color: MUTED, fontSize: 10.5, marginTop: 14, borderTop: "1px solid " + BORDER, paddingTop: 8, lineHeight: 1.7 }}>{take}</div>
    </div>
  );
}
