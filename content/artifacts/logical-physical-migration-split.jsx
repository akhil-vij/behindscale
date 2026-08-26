import { useState, useEffect, useRef } from "react";

// Pattern artifact - Logical-Physical Migration Split (general mechanism).
// The SAME bug is found at 40% ramp either way. The difference is the rollback: migrate the data physically
// up front and rolling back means moving it all back (hours, errors the whole time); do the logical phase
// first (system acts as if data moved, data stays put) and rolling back is a config flip (seconds). Watch the impact gap.
// Structural grays use the named artifact tokens; GREEN/AMBER/RED and ACCENT are content accents.

const BG = "#08090D", SURFACE = "#0F1118", SURFACE2 = "#161922", BORDER = "#1F2333";
const TEXT = "#C8CDD8", MUTED = "#6B7280";
const GREEN = "#22C55E", AMBER = "#F5B841", RED = "#EF4444", ACCENT = "#F97316", BLUE = "#60A5FA";
const MONO = "'JetBrains Mono','Fira Code',ui-monospace,monospace";

const RAMP_MAX = 40, RAMP_STEP = 5, BUG_AT = 30, ERR = 6, RB_PHYS = 10;
const impactFor = (a) => ERR * (3 + (a === "physical" ? RB_PHYS : 0)); // 3 error-ticks during ramp + rollback ticks

export default function PatternLogicalPhysical() {
  const [approach, setApproach] = useState("physical"); // "physical" | "logical"
  const [stage, setStage] = useState("idle");            // idle | ramping | found | rollback | done
  const [ramp, setRamp] = useState(0);
  const [rb, setRb] = useState(0);                        // rollback progress 0..100
  const [impact, setImpact] = useState(0);
  const timer = useRef(null);

  useEffect(() => () => clearInterval(timer.current), []);
  const clear = () => clearInterval(timer.current);
  const reset = (patch) => { clear(); if (patch) patch(); setStage("idle"); setRamp(0); setRb(0); setImpact(0); };

  const runRamp = () => { clear(); setStage("ramping"); setRamp(0); setRb(0); setImpact(0); let r = 0, imp = 0;
    timer.current = setInterval(() => { r += RAMP_STEP; if (r >= BUG_AT) { imp += ERR; setImpact(imp); } setRamp(r);
      if (r >= RAMP_MAX) { clear(); setStage("found"); } }, 300); };
  const rollback = () => { clear(); setStage("rollback");
    if (approach === "logical") { setRb(100); setStage("done"); return; }
    let p = 0; timer.current = setInterval(() => { p += 10; setRb(p); setImpact((x) => x + ERR);
      if (p >= 100) { clear(); setStage("done"); } }, 260); };

  const moved = approach === "physical";
  const active = stage !== "idle";
  const otherImpact = impactFor(approach === "physical" ? "logical" : "physical");

  let v;
  if (stage === "idle") v = { c: MUTED, code: approach === "physical" ? "MIGRATE PHYSICALLY, ALL AT ONCE" : "LOGICAL PHASE FIRST", t: approach === "physical" ? "Move the data to the new arrangement and ramp traffic onto it. If something breaks, you will have to move it all back." : "Make the system act as if the data has moved, without touching it, then ramp traffic on. If something breaks, rollback is just a config flip." };
  else if (stage === "ramping") v = { c: AMBER, code: "RAMPING TRAFFIC", t: "Traffic is moving onto the new arrangement..." };
  else if (stage === "found") v = { c: RED, code: "BUG FOUND AT " + RAMP_MAX + "% RAMP", t: "The new arrangement can't handle a query shape. " + (moved ? "The data was physically moved, so rolling back means migrating it all back. Hit Roll back." : "Nothing physical moved, so rollback is a config flip. Hit Roll back.") };
  else if (stage === "rollback") v = { c: AMBER, code: "ROLLING BACK", t: "Moving the data back to where it was..." };
  else v = moved
    ? { c: RED, code: "ROLLED BACK THE HARD WAY", t: "The physical data had to be migrated back - hours of work, with users seeing errors the whole time. Total impact: " + impact + " error-ticks, against " + otherImpact + " the logical way." }
    : { c: GREEN, code: "ROLLED BACK INSTANTLY", t: "A config flip, no data moved: errors stopped in seconds. Total impact: " + impact + " error-ticks, against " + otherImpact + " the physical way. Fix the bug, then run the physical move once the logical phase is clean." };

  const seg = (on, label, sub, onClick) => (
    <button onClick={onClick} style={{ flex: "1 1 190px", textAlign: "left", padding: "9px 12px", borderRadius: 8, cursor: "pointer", fontFamily: MONO, border: "1px solid " + (on ? ACCENT : "#333947"), background: on ? "rgba(249,115,22,0.12)" : "#0C0D13", color: TEXT }}>
      <div style={{ color: on ? ACCENT : "#AEB4C2", fontWeight: 700, fontSize: 11.5 }}>{label}</div>
      <div style={{ color: "#7C8290", fontSize: 10, marginTop: 2, lineHeight: 1.4 }}>{sub}</div>
    </button>
  );
  const bar = (label, pct, col) => (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", color: MUTED, fontSize: 10, marginBottom: 3 }}><span>{label}</span><span>{Math.round(pct)}%</span></div>
      <div style={{ height: 12, borderRadius: 6, background: "#141824", overflow: "hidden" }}><div style={{ width: pct + "%", height: "100%", background: col, transition: "width .2s ease" }} /></div>
    </div>
  );

  return (
    <div style={{ background: BG, color: TEXT, fontFamily: MONO, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid " + BORDER, fontSize: 12, lineHeight: 1.5 }}>
      <div style={{ color: ACCENT, fontSize: 10, letterSpacing: 2 }}>LOGICAL-PHYSICAL MIGRATION SPLIT - THE PATTERN, GENERAL</div>
      <div style={{ color: "#EDEFF3", fontSize: 16, margin: "4px 0 2px", fontWeight: 700 }}>Same bug, wildly different rollback</div>
      <p style={{ color: "#8B90A0", fontSize: 11, margin: 0 }}>Ramp traffic onto a new arrangement and a query bug shows up at 40% either way. What changes is how expensive it is to revert.</p>

      {/* approach */}
      <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {seg(approach === "physical", "Migrate physically, all at once", "move the data, then ramp onto it", () => reset(() => setApproach("physical")))}
        {seg(approach === "logical", "Logical phase first", "act as if moved; data stays put", () => reset(() => setApproach("logical")))}
      </div>

      {/* data-moved badge + controls */}
      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: SURFACE, border: "1px solid " + BORDER, borderRadius: 8, padding: "9px 12px" }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: moved ? RED : GREEN }}>{moved ? "\u25CF physical data: MOVED" : "\u25CF physical data: NOT MOVED"}</span>
        <span style={{ color: MUTED, fontSize: 10 }}>{moved ? "rollback must migrate it back" : "rollback is a config flip"}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {(stage === "idle") && <button onClick={runRamp} style={{ padding: "7px 18px", borderRadius: 7, cursor: "pointer", fontFamily: MONO, fontSize: 12, fontWeight: 700, border: "1px solid " + ACCENT, background: ACCENT, color: "#0A0B0F" }}>Run migration</button>}
          {stage === "found" && <button onClick={rollback} style={{ padding: "7px 18px", borderRadius: 7, cursor: "pointer", fontFamily: MONO, fontSize: 12, fontWeight: 700, border: "1px solid " + (moved ? RED : GREEN), background: moved ? RED : GREEN, color: "#0A0B0F" }}>Roll back</button>}
          {(stage === "done" || stage === "ramping" || stage === "rollback") && <button onClick={() => reset()} style={{ padding: "7px 14px", borderRadius: 7, cursor: "pointer", fontFamily: MONO, fontSize: 11, border: "1px solid " + BORDER, background: "transparent", color: "#9AA0B0" }}>&#8635; reset</button>}
        </div>
      </div>

      {/* bars */}
      <div style={{ marginTop: 12, background: SURFACE, border: "1px solid " + BORDER, borderRadius: 8, padding: "10px 14px 14px" }}>
        {bar("traffic on new arrangement", ramp, ramp >= BUG_AT ? RED : BLUE)}
        {(stage === "rollback" || stage === "done") && bar(moved ? "rolling data back (slow)" : "config rollback (instant)", moved ? rb : 100, moved ? RED : GREEN)}
      </div>

      {/* stat + verdict */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
        <div style={{ flex: "1 1 170px", minWidth: 170, background: SURFACE, border: "1px solid " + v.c, borderRadius: 8, padding: 12 }}>
          <div style={{ color: MUTED, fontSize: 10, letterSpacing: 1.2 }}>ROLLBACK COST</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: moved ? RED : GREEN, lineHeight: 1.3, marginTop: 2 }}>{moved ? "~ hours" : "~ 8 seconds"}</div>
          <div style={{ color: MUTED, fontSize: 9.5 }}>{moved ? "data migrated back" : "config flip, no data moved"}</div>
          <div style={{ color: MUTED, fontSize: 10, letterSpacing: 1.2, marginTop: 10 }}>USER IMPACT</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: moved ? RED : (stage === "done" ? GREEN : TEXT) }}>{impact}<span style={{ fontSize: 11, color: MUTED }}> error-ticks</span></div>
        </div>
        <div style={{ flex: "2 1 320px", minWidth: 260, background: SURFACE, border: "1px solid " + v.c, borderRadius: 8, padding: "11px 13px" }}>
          <div style={{ color: v.c, fontWeight: 700, fontSize: 12.5 }}>{v.code}</div>
          <div style={{ fontSize: 11.5, lineHeight: 1.6, color: TEXT, marginTop: 4 }}>{v.t}</div>
        </div>
      </div>

      <div style={{ color: MUTED, fontSize: 10, marginTop: 12, borderTop: "1px solid " + BORDER, paddingTop: 8, lineHeight: 1.7 }}>
        The bug is found in the same place either way. Doing the logical phase first means you meet it where rollback is a config change, not a data migration - so you fix it cheaply, then move the data once the arrangement is proven.
      </div>
    </div>
  );
}
