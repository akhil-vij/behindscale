import { useState, useEffect, useRef } from "react";

// Pattern artifact - Generic Mitigation (general mechanism).
// An incident of unknown cause. Diagnose first: errors run high for the whole diagnosis before you act.
// Mitigate first: apply any safe, reversible generic mitigation (drain / roll back / fail over / flag off)
// on suspicion, and the errors stop long before anyone knows the cause. Watch the total user impact shrink.
// Structural grays use the named artifact tokens; GREEN/AMBER/RED and ACCENT are content accents.

const BG = "#08090D", SURFACE = "#0F1118", SURFACE2 = "#161922", BORDER = "#1F2333";
const TEXT = "#C8CDD8", MUTED = "#6B7280";
const GREEN = "#22C55E", AMBER = "#F5B841", RED = "#EF4444", ACCENT = "#F97316";
const MONO = "'JetBrains Mono','Fira Code',ui-monospace,monospace";

const T = 20, ERR = 8, D = 12, M = 3, CH = 120; // ticks, errors/tick, diagnose & mitigate recovery ticks
const MITS = ["Drain the zone", "Roll back the deploy", "Fail over the region", "Disable the flag"];

export default function PatternGenericMitigation() {
  const [approach, setApproach] = useState("diagnose"); // "diagnose" | "mitigate"
  const [applied, setApplied] = useState(null);          // which generic mitigation (mitigate mode)
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const timer = useRef(null);

  const recoveryTick = approach === "diagnose" ? D : M;
  const otherImpact = ERR * (approach === "diagnose" ? M : D);
  const impact = ERR * recoveryTick;

  useEffect(() => () => clearInterval(timer.current), []);
  const clear = () => clearInterval(timer.current);
  const pick = (patch) => { clear(); patch(); setStep(0); setRunning(false); setHasRun(false); };
  const go = () => { clear(); setStep(0); setRunning(true); setHasRun(false); let k = 0;
    timer.current = setInterval(() => { k += 1; setStep(k); if (k >= T) { clear(); setRunning(false); setHasRun(true); } }, 220); };
  const runDiagnose = () => go();
  const runMitigate = (name) => { setApplied(name); go(); };

  const errAt = (t) => (t >= 1 && t <= recoveryTick ? ERR : 0);
  const impactSoFar = Array.from({ length: Math.min(step, T) }, (_, i) => errAt(i + 1)).reduce((a, b) => a + b, 0);
  const active = running || hasRun;

  let v;
  if (!active) v = { c: MUTED, code: "INCIDENT: CAUSE UNKNOWN", t: approach === "diagnose" ? "Users are seeing errors. You choose to find the root cause before acting. Run it." : "Users are seeing errors. Apply any generic mitigation on suspicion - they are all safe and reversible." };
  else if (approach === "diagnose") v = { c: RED, code: "DIAGNOSED, THEN FIXED", t: "You waited " + D + " ticks to pin down the cause before acting, and users saw errors the whole time. Total impact: " + impact + " error-ticks - against " + otherImpact + " if you had mitigated first." };
  else v = { c: GREEN, code: "MITIGATED ON SUSPICION", t: "You " + (applied || "applied a mitigation").toLowerCase() + " at tick " + M + ". The errors stopped before anyone knew the cause - it was still unknown when the service recovered. Total impact: " + impact + " error-ticks - against " + otherImpact + " diagnosing first." };

  const seg = (on, label, sub, onClick) => (
    <button onClick={onClick} style={{ flex: "1 1 170px", textAlign: "left", padding: "9px 12px", borderRadius: 8, cursor: "pointer", fontFamily: MONO, border: "1px solid " + (on ? ACCENT : "#333947"), background: on ? "rgba(249,115,22,0.12)" : "#0C0D13", color: TEXT }}>
      <div style={{ color: on ? ACCENT : "#AEB4C2", fontWeight: 700, fontSize: 11.5 }}>{label}</div>
      <div style={{ color: "#7C8290", fontSize: 10, marginTop: 2, lineHeight: 1.4 }}>{sub}</div>
    </button>
  );

  return (
    <div style={{ background: BG, color: TEXT, fontFamily: MONO, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid " + BORDER, fontSize: 12, lineHeight: 1.5 }}>
      <div style={{ color: ACCENT, fontSize: 10, letterSpacing: 2 }}>GENERIC MITIGATION - THE PATTERN, GENERAL</div>
      <div style={{ color: "#EDEFF3", fontSize: 16, margin: "4px 0 2px", fontWeight: 700 }}>An incident of unknown cause</div>
      <p style={{ color: "#8B90A0", fontSize: 11, margin: 0 }}>You can debug to find the root cause before acting, or apply a safe, reversible mitigation on suspicion. The errors run until the service recovers.</p>

      {/* approach */}
      <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {seg(approach === "diagnose", "Diagnose first", "find the cause, then fix it", () => pick(() => setApproach("diagnose")))}
        {seg(approach === "mitigate", "Mitigate first", "act on suspicion, safely", () => pick(() => setApproach("mitigate")))}
      </div>

      {/* controls */}
      <div style={{ marginTop: 12, background: SURFACE, border: "1px solid " + BORDER, borderRadius: 8, padding: "9px 12px" }}>
        {approach === "diagnose" ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ color: MUTED, fontSize: 10, letterSpacing: 1.2 }}>DIAGNOSIS TAKES {D} TICKS</span>
            <button onClick={runDiagnose} disabled={running} style={{ marginLeft: "auto", padding: "7px 18px", borderRadius: 7, cursor: running ? "default" : "pointer", fontFamily: MONO, fontSize: 12, fontWeight: 700, border: "1px solid " + ACCENT, background: running ? "transparent" : ACCENT, color: running ? ACCENT : "#0A0B0F" }}>{running ? "Running..." : (hasRun ? "\u21BA Run again" : "Run")}</button>
          </div>
        ) : (
          <div>
            <div style={{ color: MUTED, fontSize: 10, letterSpacing: 1.2, marginBottom: 7 }}>APPLY ANY ONE - THEY ALL WORK ON A BROAD CLASS OF FAILURES</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {MITS.map((m) => <button key={m} onClick={() => runMitigate(m)} disabled={running} style={{ flex: "1 1 130px", padding: "7px 8px", borderRadius: 7, cursor: running ? "default" : "pointer", fontFamily: MONO, fontSize: 10.5, fontWeight: 700, border: "1px solid " + (applied === m ? ACCENT : "#333947"), background: applied === m ? "rgba(249,115,22,0.14)" : "#0C0D13", color: applied === m ? ACCENT : "#AEB4C2" }}>{m}</button>)}
            </div>
            <div style={{ color: "#7C8290", fontSize: 9.5, marginTop: 6, lineHeight: 1.5 }}>Draining a zone means stopping new traffic to it so it can be pulled out of rotation. Each of these moves shifts work away from the failing part, without needing to know why it broke.</div>
          </div>
        )}
      </div>

      {/* error timeline */}
      <div style={{ marginTop: 12, background: SURFACE, border: "1px solid " + BORDER, borderRadius: 8, padding: "12px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", color: MUTED, fontSize: 10, letterSpacing: 1.2, marginBottom: 8 }}>
          <span>USER-FACING ERRORS OVER TIME</span>
          <span>{active ? "recovered at tick " + recoveryTick : "waiting"}</span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: CH }}>
          {Array.from({ length: T }).map((_, i) => {
            const t = i + 1; const on = t <= step; const err = errAt(t);
            const isRecover = t === recoveryTick;
            const col = err > 0 ? RED : GREEN;
            return <div key={i} title={"tick " + t} style={{ flex: 1, height: Math.max(on ? (err / ERR) * CH : 0, on && err === 0 ? 3 : 0), minHeight: on ? 3 : 0, background: on ? col + "cc" : "#141824", border: on ? "1px solid " + col : "1px solid #1a1e2a", borderRadius: "2px 2px 0 0", boxShadow: isRecover && on ? "0 0 0 2px rgba(34,197,94,0.35)" : "none", transition: "height .12s ease" }} />;
          })}
        </div>
        <div style={{ color: MUTED, fontSize: 9.5, marginTop: 5 }}><span style={{ color: RED }}>&#9632;</span> errors while broken &nbsp; <span style={{ color: GREEN }}>&#9632;</span> recovered &nbsp;·&nbsp; cause found: {approach === "diagnose" ? "tick " + D : "still unknown"}</div>
      </div>

      {/* stat + verdict */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
        <div style={{ flex: "1 1 160px", minWidth: 160, background: SURFACE, border: "1px solid " + v.c, borderRadius: 8, padding: 12 }}>
          <div style={{ color: MUTED, fontSize: 10, letterSpacing: 1.2 }}>USER IMPACT SO FAR</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: approach === "diagnose" ? RED : (active ? GREEN : TEXT) }}>{impactSoFar}<span style={{ fontSize: 12, color: MUTED }}> error-ticks</span></div>
          <div style={{ color: MUTED, fontSize: 10, marginTop: 4 }}>{active ? "vs " + otherImpact + " the other way" : "run to compare"}</div>
        </div>
        <div style={{ flex: "2 1 320px", minWidth: 260, background: SURFACE, border: "1px solid " + v.c, borderRadius: 8, padding: "11px 13px" }}>
          <div style={{ color: v.c, fontWeight: 700, fontSize: 12.5 }}>{v.code}</div>
          <div style={{ fontSize: 11.5, lineHeight: 1.6, color: TEXT, marginTop: 4 }}>{v.t}</div>
        </div>
      </div>

      <div style={{ color: MUTED, fontSize: 10, marginTop: 12, borderTop: "1px solid " + BORDER, paddingTop: 8, lineHeight: 1.7 }}>
        Because each mitigation is safe and reversible, the loop is just: apply on suspicion, observe, then keep it or revert and try another. The cost is bluntness - a drain moves healthy work out along with the sick.
      </div>
    </div>
  );
}
