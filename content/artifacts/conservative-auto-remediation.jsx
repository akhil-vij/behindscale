import { useState, useEffect, useRef } from "react";

// Pattern artifact - Conservative Auto-Remediation (general mechanism).
// An ambiguous "is it down?" signal. A EAGER trigger fires the expensive fix the instant the signal looks
// bad; a CONSERVATIVE trigger waits out an evidence window first. Test each against a brief blip (self-resolves)
// and a real outage (stays down). The eager one fires the costly fix on the blip - a false alarm; the
// conservative one lets the blip clear and still fixes the real outage, just a little later.
// Structural grays use the named artifact tokens; GREEN/AMBER/RED and ACCENT are content accents.

const BG = "#08090D", SURFACE = "#0F1118", SURFACE2 = "#161922", BORDER = "#1F2333";
const TEXT = "#C8CDD8", MUTED = "#6B7280";
const GREEN = "#22C55E", AMBER = "#F5B841", RED = "#EF4444", ACCENT = "#F97316", BLUE = "#60A5FA";
const MONO = "'JetBrains Mono','Fira Code',ui-monospace,monospace";

const N = 15, WINDOW = 4; // conservative evidence window (ticks); eager window = 0
const badAt = (t, scen) => (scen === "blip" ? (t >= 1 && t <= 3) : t >= 1);

// Pure model, mirrored by the headless test.
function fireModel(mode, scen) {
  const window = mode === "conservative" ? WINDOW : 0;
  let cb = 0, fireTick = null;
  for (let t = 1; t <= N; t++) {
    cb = badAt(t, scen) ? cb + 1 : 0;
    if (fireTick === null && cb >= window + 1) fireTick = t;
  }
  const warranted = scen === "outage";           // a real failure genuinely needs the fix
  const fired = fireTick !== null;
  const falseAlarm = fired && !warranted;         // fired the expensive fix when nothing was really wrong
  return { window, fireTick, fired, warranted, falseAlarm };
}

export default function PatternConservativeRemediation() {
  const [mode, setMode] = useState("eager");   // "eager" | "conservative"
  const [scen, setScen] = useState("blip");      // "blip" | "outage"
  const [shown, setShown] = useState(0);
  const [running, setRunning] = useState(false);
  const timer = useRef(null);

  const m = fireModel(mode, scen);
  const done = shown >= N;

  useEffect(() => () => clearInterval(timer.current), []);
  const stop = () => { clearInterval(timer.current); setRunning(false); };
  const pick = (patch) => { stop(); patch(); setShown(0); };
  const run = () => { clearInterval(timer.current); setShown(0); setRunning(true); let k = 0;
    timer.current = setInterval(() => { k += 1; setShown(k); if (k >= N) { clearInterval(timer.current); setRunning(false); } }, 480); };

  const fireVisible = m.fired && shown >= m.fireTick;

  let v;
  if (!done && !running) v = { c: MUTED, code: "READY", t: "Pick a trigger and a scenario, then Run. The signal turns red while the component looks down." };
  else if (running) v = { c: AMBER, code: "WATCHING THE SIGNAL", t: mode === "conservative" ? "Waiting out the evidence window before doing anything drastic..." : "Any bad signal fires the fix at once..." };
  else if (scen === "blip" && mode === "eager") v = { c: RED, code: "FALSE ALARM: FIX FIRED ON A BLIP", t: "The signal was bad for only 3 ticks and would have cleared on its own, but the eager trigger fired the expensive fix at tick " + m.fireTick + " anyway. Wasted, and possibly harmful." };
  else if (scen === "blip" && mode === "conservative") v = { c: GREEN, code: "CORRECT: NO FIX NEEDED", t: "The blip cleared within the " + WINDOW + "-tick evidence window, so the conservative trigger never fired the expensive fix. Elapsed time was the evidence that this was not a real failure." };
  else if (scen === "outage" && mode === "eager") v = { c: AMBER, code: "FIRED FAST (WARRANTED)", t: "A real outage, and the eager trigger fired at tick " + m.fireTick + " - fast, and the fix was needed. The catch: this same trigger also fires on blips it can't tell apart." };
  else v = { c: GREEN, code: "FIRED AFTER EVIDENCE (WARRANTED)", t: "A real outage: the conservative trigger waited out the window and fired at tick " + m.fireTick + ". The fix was needed, and you paid a little extra recovery time for not firing on every blip." };

  const seg = (on, label, sub, onClick) => (
    <button onClick={onClick} style={{ flex: "1 1 150px", textAlign: "left", padding: "9px 12px", borderRadius: 8, cursor: "pointer", fontFamily: MONO, border: "1px solid " + (on ? ACCENT : "#333947"), background: on ? "rgba(249,115,22,0.12)" : "#0C0D13", color: TEXT }}>
      <div style={{ color: on ? ACCENT : "#AEB4C2", fontWeight: 700, fontSize: 11.5 }}>{label}</div>
      <div style={{ color: "#7C8290", fontSize: 10, marginTop: 2, lineHeight: 1.4 }}>{sub}</div>
    </button>
  );

  return (
    <div style={{ background: BG, color: TEXT, fontFamily: MONO, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid " + BORDER, fontSize: 12, lineHeight: 1.5 }}>
      <div style={{ color: ACCENT, fontSize: 10, letterSpacing: 2 }}>CONSERVATIVE AUTO-REMEDIATION - THE PATTERN, GENERAL</div>
      <div style={{ color: "#EDEFF3", fontSize: 16, margin: "4px 0 2px", fontWeight: 700 }}>How fast should an expensive fix fire?</div>
      <p style={{ color: "#8B90A0", fontSize: 11, margin: 0 }}>The signal says a component might be down. Fire the costly fix immediately, or wait for enough evidence first?</p>

      {/* trigger + scenario */}
      <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {seg(mode === "eager", "Eager trigger", "fires on any bad signal", () => pick(() => setMode("eager")))}
        {seg(mode === "conservative", "Conservative trigger", "waits out an evidence window", () => pick(() => setMode("conservative")))}
      </div>
      <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {seg(scen === "blip", "Brief blip", "looks bad, clears on its own", () => pick(() => setScen("blip")))}
        {seg(scen === "outage", "Real outage", "looks bad, stays down", () => pick(() => setScen("outage")))}
      </div>

      {/* run */}
      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: SURFACE, border: "1px solid " + BORDER, borderRadius: 8, padding: "9px 12px" }}>
        <span style={{ color: MUTED, fontSize: 10, letterSpacing: 1.2 }}>EVIDENCE WINDOW: {mode === "conservative" ? WINDOW + " ticks" : "0 (fire at once)"}</span>
        <button onClick={running ? stop : run} style={{ marginLeft: "auto", padding: "7px 18px", borderRadius: 7, cursor: "pointer", fontFamily: MONO, fontSize: 12, fontWeight: 700, border: "1px solid " + ACCENT, background: running ? "transparent" : ACCENT, color: running ? ACCENT : "#0A0B0F" }}>{running ? "Stop" : (done ? "\u21BA Run" : "Run")}</button>
      </div>

      {/* signal timeline */}
      <div style={{ marginTop: 12, background: SURFACE, border: "1px solid " + BORDER, borderRadius: 8, padding: "12px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", color: MUTED, fontSize: 10, letterSpacing: 1.2, marginBottom: 8 }}>
          <span>HEALTH SIGNAL OVER TIME</span><span>{fireVisible ? "fix fired at tick " + m.fireTick : (done && !m.fired ? "fix never fired" : "watching")}</span>
        </div>
        <div style={{ display: "flex", gap: 3, alignItems: "flex-end" }}>
          {Array.from({ length: N }).map((_, i) => {
            const t = i + 1; const on = t <= shown; const bad = badAt(t, scen);
            const inWindow = mode === "conservative" && bad && !m.fired ? false : false; // window shading handled below
            const col = !on ? "#141824" : (bad ? RED : GREEN);
            const isFire = m.fired && t === m.fireTick && fireVisible;
            return (
              <div key={i} style={{ flex: 1, textAlign: "center" }}>
                <div style={{ height: 26, borderRadius: 3, background: on ? col + "cc" : col, border: "1px solid " + (on ? col : "#20263480"), boxShadow: isFire ? "0 0 0 2px " + ACCENT : "none" }} title={"tick " + t} />
                <div style={{ fontSize: 8, color: isFire ? ACCENT : MUTED, marginTop: 2, height: 10 }}>{isFire ? "\u2193fix" : ""}</div>
              </div>
            );
          })}
        </div>
        {/* evidence window marker for conservative */}
        {mode === "conservative" && <div style={{ color: MUTED, fontSize: 9.5, marginTop: 4 }}>the trigger holds off for the first {WINDOW} bad ticks - if the signal clears in that window, no fix fires</div>}
        <div style={{ color: MUTED, fontSize: 9.5, marginTop: 5 }}><span style={{ color: GREEN }}>&#9632;</span> healthy &nbsp; <span style={{ color: RED }}>&#9632;</span> looks down &nbsp; <span style={{ color: ACCENT }}>&#9632;</span> expensive fix fires</div>
      </div>

      {/* stat + verdict */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
        <div style={{ flex: "1 1 160px", minWidth: 160, background: SURFACE, border: "1px solid " + v.c, borderRadius: 8, padding: 12 }}>
          <div style={{ color: MUTED, fontSize: 10, letterSpacing: 1.2 }}>EXPENSIVE FIX</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: fireVisible ? (m.falseAlarm ? RED : GREEN) : TEXT, marginTop: 2 }}>{fireVisible ? "fired @ tick " + m.fireTick : (done ? "not fired" : "-")}</div>
          <div style={{ color: MUTED, fontSize: 10, letterSpacing: 1.2, marginTop: 10 }}>WAS IT WARRANTED?</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: !done ? TEXT : (m.falseAlarm ? RED : (m.fired ? GREEN : GREEN)) }}>{!done ? "-" : (m.falseAlarm ? "no - false alarm" : (m.fired ? "yes" : "no fix needed"))}</div>
        </div>
        <div style={{ flex: "2 1 320px", minWidth: 260, background: SURFACE, border: "1px solid " + v.c, borderRadius: 8, padding: "11px 13px" }}>
          <div style={{ color: v.c, fontWeight: 700, fontSize: 12.5 }}>{v.code}</div>
          <div style={{ fontSize: 11.5, lineHeight: 1.6, color: TEXT, marginTop: 4 }}>{v.t}</div>
        </div>
      </div>

      <div style={{ color: MUTED, fontSize: 10, marginTop: 12, borderTop: "1px solid " + BORDER, paddingTop: 8, lineHeight: 1.7 }}>
        An eager trigger can't tell a blip from an outage, so it fires the costly fix on both. Waiting out an evidence window makes elapsed time part of the evidence - the costlier and less reversible the fix, the longer that wait should be.
      </div>
    </div>
  );
}
