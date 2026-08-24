import { useState, useEffect, useRef } from "react";

// Pattern artifact - Atomic Phases (general mechanism).
// Run a 4-phase payment workflow, crash it partway, then retry. With atomic phases the retry reads the
// saved checkpoints and RESUMES from the failed phase (every step runs once). As one big step with no
// checkpoints, the retry RESTARTS from zero and re-runs the committed phases - the card is charged twice.
// Structural grays use the named artifact tokens; GREEN/AMBER/RED and ACCENT are content accents.

const BG = "#08090D", SURFACE = "#0F1118", SURFACE2 = "#161922", BORDER = "#1F2333";
const TEXT = "#C8CDD8", MUTED = "#6B7280";
const GREEN = "#22C55E", AMBER = "#F5B841", RED = "#EF4444", ACCENT = "#F97316";
const MONO = "'JetBrains Mono','Fira Code',ui-monospace,monospace";

const PHASES = [
  { name: "Charge the card", did: "charged" },
  { name: "Reserve the seat", did: "reserved" },
  { name: "Issue the ticket", did: "issued" },
  { name: "Email the receipt", did: "emailed" },
];
const NP = PHASES.length;

// Pure view model, mirrored by the headless test. status per phase + how many times its effect ran.
function computeView(mode, crashAt, stage, step) {
  const status = Array(NP).fill("pending");
  const count = Array(NP).fill(0);
  const checkpoint = Array(NP).fill(false); // a saved marker after a committed phase (atomic only)

  // run1: commit phases 0..crashAt-1, then crash at crashAt. Identical for both modes.
  const r1 = stage === "run1" ? step : (stage === "idle" ? 0 : crashAt + 1);
  for (let i = 0; i < Math.min(r1, crashAt); i++) { status[i] = "committed"; count[i] = 1; if (mode === "atomic") checkpoint[i] = true; }
  if (r1 >= crashAt + 1) status[crashAt] = "crashed";

  // run2 (retry)
  if (stage === "run2" || stage === "done") {
    const total = mode === "atomic" ? NP - crashAt : NP;
    const r2 = stage === "run2" ? step : total;
    if (mode === "atomic") {
      for (let k = 0; k < r2; k++) { const i = crashAt + k; status[i] = "committed"; count[i] = 1; checkpoint[i] = true; }
    } else {
      for (let i = 0; i < r2; i++) {
        if (i < crashAt) { status[i] = "rerun"; count[i] = 2; }
        else { status[i] = "committed"; count[i] = 1; }
      }
    }
  }
  return { status, count, checkpoint };
}

export default function PatternAtomicPhases() {
  const [mode, setMode] = useState("monolith"); // start on the failing case; the reader discovers the fix
  const [crashAt, setCrashAt] = useState(2); // phase index that fails (1..3 => phase 2..4)
  const [stage, setStage] = useState("idle"); // idle | run1 | crashed | run2 | done
  const [step, setStep] = useState(0);
  const timer = useRef(null);

  useEffect(() => () => clearInterval(timer.current), []);
  const clear = () => clearInterval(timer.current);
  const reset = () => { clear(); setStage("idle"); setStep(0); };
  const settle = (patch) => { clear(); patch(); setStage("idle"); setStep(0); };

  const runFirst = () => {
    clear(); setStage("run1"); setStep(0);
    const end = crashAt + 1; let k = 0;
    timer.current = setInterval(() => { k += 1; setStep(k); if (k >= end) { clear(); setStage("crashed"); setStep(end); } }, 480);
  };
  const retry = () => {
    clear(); setStage("run2"); setStep(0);
    const end = mode === "atomic" ? NP - crashAt : NP; let k = 0;
    timer.current = setInterval(() => { k += 1; setStep(k); if (k >= end) { clear(); setStage("done"); setStep(end); } }, 480);
  };

  const { status, count, checkpoint } = computeView(mode, crashAt, stage, step);
  const running = stage === "run1" || stage === "run2";
  const charged = count[0]; // phase 0 is the charge; the headline damage

  // verdict
  let v;
  if (stage === "idle") v = { c: MUTED, code: "READY", t: "Run the workflow, then crash it partway. Watch what the retry does - resume from the last checkpoint, or start over from zero." };
  else if (stage === "run1") v = { c: AMBER, code: "RUNNING", t: "Each phase does its work and (with atomic phases) saves a checkpoint..." };
  else if (stage === "crashed") v = { c: RED, code: "CRASHED AT PHASE " + (crashAt + 1), t: "The workflow stopped partway through, after phase " + crashAt + " committed. Hit Retry and see how it comes back." };
  else if (stage === "run2") v = { c: AMBER, code: "RETRYING", t: mode === "atomic" ? "Reading the last checkpoint and resuming..." : "No checkpoints - restarting from the very first phase..." };
  else v = mode === "atomic"
    ? { c: GREEN, code: "RESUMED CLEANLY", t: "The retry read the last checkpoint, skipped phases 1 to " + crashAt + " (already committed), and finished from phase " + (crashAt + 1) + ". Every step ran exactly once." }
    : { c: RED, code: "CHARGED TWICE", t: "One big step with no checkpoints, so the retry restarted from the top and re-ran phases 1 to " + crashAt + ". The card was charged twice and the seat reserved twice - the retry was not safe." };

  const pill = (s) => {
    const map = { pending: [MUTED, "waiting", SURFACE2], committed: [GREEN, "done", "rgba(34,197,94,0.12)"], crashed: [RED, "crashed", "rgba(239,68,68,0.12)"], rerun: [AMBER, "ran again", "rgba(245,184,65,0.12)"] };
    const [c, label, bg] = map[s];
    return <span style={{ color: c, background: bg, border: "1px solid " + c, borderRadius: 5, padding: "1px 7px", fontSize: 9.5, fontWeight: 700 }}>{label}</span>;
  };
  const seg = (on, col, label, sub) => (
    <button onClick={() => settle(() => (label === "Atomic phases" || label === "One big step" ? setMode(label === "Atomic phases" ? "atomic" : "monolith") : null))} style={{ flex: "1 1 150px", textAlign: "left", padding: "9px 12px", borderRadius: 8, cursor: "pointer", fontFamily: MONO, border: "1px solid " + (on ? ACCENT : "#333947"), background: on ? "rgba(249,115,22,0.12)" : "#0C0D13", color: TEXT }}>
      <div style={{ color: on ? ACCENT : "#AEB4C2", fontWeight: 700, fontSize: 11.5 }}>{label}</div>
      <div style={{ color: "#7C8290", fontSize: 10, marginTop: 2, lineHeight: 1.4 }}>{sub}</div>
    </button>
  );

  return (
    <div style={{ background: BG, color: TEXT, fontFamily: MONO, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid " + BORDER, fontSize: 12, lineHeight: 1.5 }}>
      <div style={{ color: ACCENT, fontSize: 10, letterSpacing: 2 }}>ATOMIC PHASES - THE PATTERN, GENERAL</div>
      <div style={{ color: "#EDEFF3", fontSize: 16, margin: "4px 0 2px", fontWeight: 700 }}>A four-step workflow that gets interrupted partway</div>
      <p style={{ color: "#8B90A0", fontSize: 11, margin: 0 }}>Crash it, then retry. Checkpoints let the retry resume where it stopped. Without them, it starts over and repeats work already done.</p>

      {/* mode */}
      <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {seg(mode === "monolith", ACCENT, "One big step", "no checkpoints between steps")}
        {seg(mode === "atomic", ACCENT, "Atomic phases", "each phase saves a checkpoint")}
      </div>

      {/* crash-at + controls */}
      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: SURFACE, border: "1px solid " + BORDER, borderRadius: 8, padding: "9px 12px" }}>
        <span style={{ color: MUTED, fontSize: 10, letterSpacing: 1.2 }}>CRASH DURING</span>
        {[1, 2, 3].map((ci) => {
          const on = crashAt === ci;
          return <button key={ci} onClick={() => settle(() => setCrashAt(ci))} style={{ padding: "4px 11px", borderRadius: 6, cursor: "pointer", fontFamily: MONO, fontSize: 10.5, fontWeight: on ? 700 : 400, border: "1px solid " + (on ? RED : "#333947"), background: on ? "rgba(239,68,68,0.14)" : "#0C0D13", color: on ? RED : "#9AA0B0" }}>phase {ci + 1}</button>;
        })}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {(stage === "idle") && <button onClick={runFirst} style={{ padding: "7px 18px", borderRadius: 7, cursor: "pointer", fontFamily: MONO, fontSize: 12, fontWeight: 700, border: "1px solid " + ACCENT, background: ACCENT, color: "#0A0B0F" }}>Run</button>}
          {(stage === "crashed") && <button onClick={retry} style={{ padding: "7px 18px", borderRadius: 7, cursor: "pointer", fontFamily: MONO, fontSize: 12, fontWeight: 700, border: "1px solid " + ACCENT, background: ACCENT, color: "#0A0B0F" }}>Retry</button>}
          {(stage === "done" || running) && <button onClick={reset} style={{ padding: "7px 16px", borderRadius: 7, cursor: "pointer", fontFamily: MONO, fontSize: 11.5, border: "1px solid " + BORDER, background: "transparent", color: "#9AA0B0" }}>&#8635; reset</button>}
        </div>
      </div>

      {/* phase track */}
      <div style={{ marginTop: 12, background: SURFACE, border: "1px solid " + BORDER, borderRadius: 8, padding: "12px 14px" }}>
        {PHASES.map((p, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: i ? "1px solid " + BORDER : "none" }}>
            <span style={{ color: MUTED, fontFamily: MONO, fontSize: 11, width: 20 }}>{i + 1}</span>
            <span style={{ flex: 1, color: status[i] === "pending" ? MUTED : TEXT, fontWeight: status[i] === "crashed" ? 700 : 400 }}>{p.name}</span>
            {count[i] > 1 && <span style={{ color: RED, fontSize: 10, fontWeight: 700 }}>{p.did} &#215;{count[i]}</span>}
            {checkpoint[i] && <span style={{ color: GREEN, fontSize: 9.5 }}>&#10003; checkpoint</span>}
            {pill(status[i])}
          </div>
        ))}
      </div>

      {/* headline + verdict */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
        <div style={{ flex: "1 1 150px", minWidth: 150, background: SURFACE, border: "1px solid " + (charged > 1 ? RED : GREEN), borderRadius: 8, padding: 12 }}>
          <div style={{ color: MUTED, fontSize: 10, letterSpacing: 1.2 }}>CARD CHARGED</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: charged > 1 ? RED : (charged === 1 ? GREEN : TEXT) }}>{charged}<span style={{ fontSize: 12, color: MUTED }}> {charged === 1 ? "time" : "times"}</span></div>
          <div style={{ color: charged > 1 ? RED : MUTED, fontSize: 10, marginTop: 4 }}>{charged > 1 ? "double charge" : (charged === 1 ? "exactly once" : "not yet")}</div>
        </div>
        <div style={{ flex: "2 1 320px", minWidth: 260, background: SURFACE, border: "1px solid " + v.c, borderRadius: 8, padding: "11px 13px" }}>
          <div style={{ color: v.c, fontWeight: 700, fontSize: 12.5 }}>{v.code}</div>
          <div style={{ fontSize: 11.5, lineHeight: 1.6, color: TEXT, marginTop: 4 }}>{v.t}</div>
        </div>
      </div>

      <div style={{ color: MUTED, fontSize: 10, marginTop: 12, borderTop: "1px solid " + BORDER, paddingTop: 8, lineHeight: 1.7 }}>
        The checkpoint is what makes a retry safe: it records that a phase is fully done, so the retry neither repeats it nor skips the phase that failed.
      </div>
    </div>
  );
}
