import { useState, useEffect, useRef } from "react";

// Pattern artifact - Durable Workflows (general mechanism).
// Run a linear workflow, crash it partway, then run it again. Two modes:
//  - Plain code (no checkpoints): the re-run re-executes EVERY step from the top, so finished steps fire
//    their effect a SECOND time (the card is charged twice).
//  - Durable workflow (checkpointed): the runtime replays from the top but each finished step returns its
//    saved result instead of re-running, so every effect fires exactly once.
// Structural grays use the named artifact tokens; GREEN/AMBER/RED and ACCENT are content accents.

const BG = "#08090D", SURFACE = "#0F1118", SURFACE2 = "#161922", BORDER = "#1F2333";
const TEXT = "#C8CDD8", MUTED = "#6B7280";
const GREEN = "#22C55E", AMBER = "#F5B841", RED = "#EF4444", ACCENT = "#F97316", BLUE = "#60A5FA";
const MONO = "'JetBrains Mono','Fira Code',ui-monospace,monospace";

const STEPS = ["Charge the card", "Book the slot", "Send confirmation", "Record in ledger"];
const NP = STEPS.length;

// Pure view model, mirrored by the headless test.
function computeView(mode, stage, step, crashAt) {
  const status = Array(NP).fill("pending");
  const effect = Array(NP).fill(0);
  const p1 = stage === "run1" ? step : (stage === "idle" ? 0 : crashAt + 1);
  for (let i = 0; i < Math.min(p1, crashAt); i++) { status[i] = "done"; effect[i] = 1; }
  if (p1 >= crashAt + 1) status[crashAt] = "crashed";
  if (stage === "replay" || stage === "done") {
    const p2 = stage === "replay" ? step : NP;
    for (let i = 0; i < p2; i++) {
      if (mode === "durable") {
        if (i < crashAt) { status[i] = "replayed"; effect[i] = 1; }
        else { status[i] = "live"; effect[i] = 1; }
      } else { // plain: re-run everything from the top, no checkpoints
        if (i < crashAt) { status[i] = "rerun"; effect[i] = 2; }
        else { status[i] = "live"; effect[i] = 1; }
      }
    }
  }
  const cursor = stage === "run1" ? step - 1 : (stage === "replay" ? step - 1 : -1);
  return { status, effect, cursor };
}

export default function PatternDurableWorkflows() {
  const [mode, setMode] = useState("plain");   // "plain" (no checkpoints) | "durable"
  const [crashAt, setCrashAt] = useState(2);   // step index that crashes (1..3 => step 2..4)
  const [stage, setStage] = useState("idle");  // idle | run1 | crashed | replay | done
  const [step, setStep] = useState(0);
  const timer = useRef(null);

  useEffect(() => () => clearInterval(timer.current), []);
  const clear = () => clearInterval(timer.current);
  const reset = () => { clear(); setStage("idle"); setStep(0); };
  const settle = (patch) => { clear(); patch(); setStage("idle"); setStep(0); };

  const runFirst = () => { clear(); setStage("run1"); setStep(0); const end = crashAt + 1; let k = 0;
    timer.current = setInterval(() => { k += 1; setStep(k); if (k >= end) { clear(); setStage("crashed"); setStep(end); } }, 440); };
  const secondPass = () => { clear(); setStage("replay"); setStep(0); let k = 0;
    timer.current = setInterval(() => { k += 1; setStep(k); if (k >= NP) { clear(); setStage("done"); setStep(NP); } }, 440); };

  const { status, effect, cursor } = computeView(mode, stage, step, crashAt);
  const running = stage === "run1" || stage === "replay";
  const codePasses = stage === "idle" ? 0 : (stage === "run1" || stage === "crashed" ? 1 : 2);
  const effectsFired = effect.reduce((a, b) => a + b, 0);
  const doubled = mode === "plain" && (stage === "done") && crashAt > 0;

  let v;
  if (stage === "idle") v = { c: MUTED, code: "READY", t: "Run the linear workflow, crash it partway, then run it again. Watch what the re-run does with checkpoints and without." };
  else if (stage === "run1") v = { c: AMBER, code: "RUNNING", t: mode === "durable" ? "Each step runs and saves a checkpoint as it finishes..." : "Each step runs. With no checkpoints, nothing is being saved..." };
  else if (stage === "crashed") v = { c: RED, code: "CRASHED AT STEP " + (crashAt + 1), t: "The workflow stopped partway. Steps 1 to " + crashAt + " already ran. " + (mode === "durable" ? "They were checkpointed - hit Replay." : "Nothing was saved - hit Restart.") };
  else if (stage === "replay") v = { c: mode === "durable" ? BLUE : AMBER, code: mode === "durable" ? "REPLAYING FROM THE TOP" : "RESTARTING FROM THE TOP", t: mode === "durable" ? "The runtime re-runs from step 1, returning saved results for finished steps..." : "With no checkpoints, the whole thing runs again from step 1..." };
  else if (mode === "durable") v = { c: GREEN, code: "RESUMED, EFFECTS ONCE", t: "The runtime replayed from the top: steps 1 to " + crashAt + " returned their saved results without re-running, then it carried on live. The code ran from the top twice, but every effect fired exactly once." };
  else v = { c: RED, code: "STEPS 1 TO " + crashAt + " RAN TWICE", t: "No checkpoints, so restarting re-ran every step from the top - including the " + crashAt + " that already finished. Their effects fired a second time: the card was charged twice. This is the mess durable workflows exist to prevent." };

  const pill = (s) => {
    const map = { pending: [MUTED, "waiting", SURFACE2], done: [GREEN, "done - saved", "rgba(34,197,94,0.12)"], crashed: [RED, "crashed", "rgba(239,68,68,0.12)"], replayed: [BLUE, "\u21A9 from checkpoint", "rgba(96,165,250,0.12)"], live: [GREEN, "ran live", "rgba(34,197,94,0.12)"], rerun: [RED, "ran again", "rgba(239,68,68,0.12)"] };
    const [c, label, bg] = map[s];
    return <span style={{ color: c, background: bg, border: "1px solid " + c, borderRadius: 5, padding: "1px 7px", fontSize: 9.5, fontWeight: 700, whiteSpace: "nowrap" }}>{label}</span>;
  };
  const seg = (on, label, sub, onClick) => (
    <button onClick={onClick} style={{ flex: "1 1 160px", textAlign: "left", padding: "9px 12px", borderRadius: 8, cursor: "pointer", fontFamily: MONO, border: "1px solid " + (on ? ACCENT : "#333947"), background: on ? "rgba(249,115,22,0.12)" : "#0C0D13", color: TEXT }}>
      <div style={{ color: on ? ACCENT : "#AEB4C2", fontWeight: 700, fontSize: 11.5 }}>{label}</div>
      <div style={{ color: "#7C8290", fontSize: 10, marginTop: 2, lineHeight: 1.4 }}>{sub}</div>
    </button>
  );

  return (
    <div style={{ background: BG, color: TEXT, fontFamily: MONO, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid " + BORDER, fontSize: 12, lineHeight: 1.5 }}>
      <div style={{ color: ACCENT, fontSize: 10, letterSpacing: 2 }}>DURABLE WORKFLOWS - THE PATTERN, GENERAL</div>
      <div style={{ color: "#EDEFF3", fontSize: 16, margin: "4px 0 2px", fontWeight: 700 }}>The same crash, with and without checkpoints</div>
      <p style={{ color: "#8B90A0", fontSize: 11, margin: 0 }}>Plain code re-runs every step on a crash, so finished work happens twice. A durable workflow replays from the top but reuses saved results, so each effect fires once.</p>

      {/* mode */}
      <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {seg(mode === "plain", "Plain code", "no checkpoints between steps", () => settle(() => setMode("plain")))}
        {seg(mode === "durable", "Durable workflow", "each step saves a checkpoint", () => settle(() => setMode("durable")))}
      </div>

      {/* crash-at + controls */}
      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: SURFACE, border: "1px solid " + BORDER, borderRadius: 8, padding: "9px 12px" }}>
        <span style={{ color: MUTED, fontSize: 10, letterSpacing: 1.2 }}>CRASH DURING</span>
        {[1, 2, 3].map((ci) => {
          const on = crashAt === ci;
          return <button key={ci} onClick={() => settle(() => setCrashAt(ci))} style={{ padding: "4px 11px", borderRadius: 6, cursor: "pointer", fontFamily: MONO, fontSize: 10.5, fontWeight: on ? 700 : 400, border: "1px solid " + (on ? RED : "#333947"), background: on ? "rgba(239,68,68,0.14)" : "#0C0D13", color: on ? RED : "#9AA0B0" }}>step {ci + 1}</button>;
        })}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {stage === "idle" && <button onClick={runFirst} style={{ padding: "7px 18px", borderRadius: 7, cursor: "pointer", fontFamily: MONO, fontSize: 12, fontWeight: 700, border: "1px solid " + ACCENT, background: ACCENT, color: "#0A0B0F" }}>Run</button>}
          {stage === "crashed" && <button onClick={secondPass} style={{ padding: "7px 18px", borderRadius: 7, cursor: "pointer", fontFamily: MONO, fontSize: 12, fontWeight: 700, border: "1px solid " + (mode === "durable" ? BLUE : AMBER), background: mode === "durable" ? BLUE : AMBER, color: "#0A0B0F" }}>{mode === "durable" ? "Replay" : "Restart"}</button>}
          {(stage === "done" || running) && <button onClick={reset} style={{ padding: "7px 16px", borderRadius: 7, cursor: "pointer", fontFamily: MONO, fontSize: 11.5, border: "1px solid " + BORDER, background: "transparent", color: "#9AA0B0" }}>&#8635; reset</button>}
        </div>
      </div>

      {/* the workflow code */}
      <div style={{ marginTop: 12, background: SURFACE, border: "1px solid " + BORDER, borderRadius: 8, padding: "6px 0" }}>
        {STEPS.map((name, i) => {
          const isCursor = i === cursor && running;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", borderLeft: "3px solid " + (isCursor ? ACCENT : "transparent"), background: isCursor ? "rgba(249,115,22,0.06)" : "transparent" }}>
              <span style={{ color: MUTED, fontSize: 11, width: 22 }}>{i + 1}</span>
              <span style={{ flex: 1, color: status[i] === "pending" ? MUTED : TEXT, fontWeight: status[i] === "crashed" ? 700 : 400 }}>{name}</span>
              <span style={{ color: effect[i] > 1 ? RED : (effect[i] === 1 ? GREEN : "#3A3F4E"), fontSize: 10, fontWeight: effect[i] > 1 ? 700 : 400 }}>effect: {effect[i]}&#215;</span>
              {pill(status[i])}
            </div>
          );
        })}
      </div>

      {/* stats + verdict */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
        <div style={{ flex: "1 1 170px", minWidth: 170, background: SURFACE, border: "1px solid " + v.c, borderRadius: 8, padding: 12 }}>
          <div style={{ color: MUTED, fontSize: 10, letterSpacing: 1.2 }}>CODE RAN FROM TOP</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: codePasses > 1 ? BLUE : TEXT }}>{codePasses}<span style={{ fontSize: 12, color: MUTED }}> {codePasses === 1 ? "time" : "times"}</span></div>
          <div style={{ color: MUTED, fontSize: 10, letterSpacing: 1.2, marginTop: 10 }}>EFFECTS FIRED</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: doubled ? RED : (stage === "done" ? GREEN : TEXT) }}>{effectsFired}<span style={{ fontSize: 12, color: MUTED }}> {stage === "done" ? (doubled ? "(some twice)" : "(once each)") : ""}</span></div>
        </div>
        <div style={{ flex: "2 1 320px", minWidth: 260, background: SURFACE, border: "1px solid " + v.c, borderRadius: 8, padding: "11px 13px" }}>
          <div style={{ color: v.c, fontWeight: 700, fontSize: 12.5 }}>{v.code}</div>
          <div style={{ fontSize: 11.5, lineHeight: 1.6, color: TEXT, marginTop: 4 }}>{v.t}</div>
        </div>
      </div>

      <div style={{ color: MUTED, fontSize: 10, marginTop: 12, borderTop: "1px solid " + BORDER, paddingTop: 8, lineHeight: 1.7 }}>
        In both modes the code re-runs from the top. The difference is the checkpoint: a durable workflow reuses the saved result of a finished step instead of running it again, so the author writes linear code and effects still happen once.
      </div>
    </div>
  );
}
