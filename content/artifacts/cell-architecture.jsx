import { useState, useEffect, useRef } from "react";

// Pattern artifact - Cell Architecture (general mechanism).
// Trigger a failure. As "one big fleet" it spreads to every customer (no wall to stop it). Split into
// cells, the same failure stays inside the cell it started in - the other cells keep serving. More cells
// means a smaller blast radius, but more cells to run.
// Structural grays use the named artifact tokens; GREEN/AMBER/RED and ACCENT are content accents.

const BG = "#08090D", SURFACE = "#0F1118", SURFACE2 = "#161922", BORDER = "#1F2333";
const TEXT = "#C8CDD8", MUTED = "#6B7280";
const GREEN = "#22C55E", AMBER = "#F5B841", RED = "#EF4444", ACCENT = "#F97316";
const MONO = "'JetBrains Mono','Fira Code',ui-monospace,monospace";

const N = 24; // total customers

export default function PatternCellArchitecture() {
  const [mode, setMode] = useState("fleet");   // "fleet" | "cells"  (start on the un-isolated case)
  const [numCells, setNumCells] = useState(4); // 2 | 4 | 6 (cells mode)
  const [failing, setFailing] = useState(null); // index of the failing cell, or null
  const [revealed, setRevealed] = useState(0);  // dots knocked down in the failing cell (animated)
  const [stage, setStage] = useState("idle");   // idle | spreading | done
  const timer = useRef(null);

  const cellsCount = mode === "fleet" ? 1 : numCells;
  const cellSize = N / cellsCount;

  useEffect(() => () => clearInterval(timer.current), []);
  const clear = () => clearInterval(timer.current);
  const reset = () => { clear(); setFailing(null); setRevealed(0); setStage("idle"); };
  const settle = (patch) => { clear(); patch(); setFailing(null); setRevealed(0); setStage("idle"); };

  const trigger = (cellIdx) => {
    if (stage !== "idle") return;
    clear(); setFailing(cellIdx); setRevealed(0); setStage("spreading");
    let k = 0;
    timer.current = setInterval(() => {
      k += 1; setRevealed(k);
      if (k >= cellSize) { clear(); setStage("done"); }
    }, mode === "fleet" ? 90 : 150);
  };

  const down = failing === null ? 0 : revealed;
  const pct = Math.round((down / N) * 100);

  let v;
  if (stage === "idle") v = { c: MUTED, code: "READY", t: "Click a group to trigger a failure in it. Watch how far the failure reaches as one big fleet, then as cells." };
  else if (stage === "spreading") v = { c: AMBER, code: "FAILURE SPREADING", t: mode === "fleet" ? "Nothing contains it - it is reaching every customer..." : "It is knocking down this cell, but it stops at the cell wall..." };
  else if (mode === "fleet") v = { c: RED, code: "WHOLE FLEET DOWN", t: "One big fleet: the failure reached all " + N + " customers. Blast radius " + N + " of " + N + " (100%). There was no boundary to stop it." };
  else v = { c: GREEN, code: "CONTAINED TO ONE CELL", t: "Cells: the failure stayed inside cell " + (failing + 1) + ". Blast radius " + cellSize + " of " + N + " (" + pct + "%). The other " + (numCells - 1) + " cells kept serving normally." };

  const seg = (on, label, sub, onClick) => (
    <button onClick={onClick} style={{ flex: "1 1 150px", textAlign: "left", padding: "9px 12px", borderRadius: 8, cursor: "pointer", fontFamily: MONO, border: "1px solid " + (on ? ACCENT : "#333947"), background: on ? "rgba(249,115,22,0.12)" : "#0C0D13", color: TEXT }}>
      <div style={{ color: on ? ACCENT : "#AEB4C2", fontWeight: 700, fontSize: 11.5 }}>{label}</div>
      <div style={{ color: "#7C8290", fontSize: 10, marginTop: 2, lineHeight: 1.4 }}>{sub}</div>
    </button>
  );

  const cellBox = (b) => {
    const isFailing = failing === b;
    const cols = Math.min(cellSize, 6);
    const bd = isFailing ? RED : (stage === "done" && mode === "cells" ? GREEN : "#2C3242");
    return (
      <div key={b} onClick={() => trigger(b)} style={{ cursor: stage === "idle" ? "pointer" : "default", flex: mode === "fleet" ? "1 1 100%" : "1 1 150px", background: SURFACE, border: "1px solid " + bd, borderRadius: 9, padding: "9px 10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
          <span style={{ color: isFailing ? RED : "#AEB4C2", fontSize: 10.5, fontWeight: 700, letterSpacing: .5 }}>{mode === "fleet" ? "ONE BIG FLEET" : "CELL " + (b + 1)}</span>
          <span style={{ color: MUTED, fontSize: 9.5 }}>{cellSize} customers</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(" + cols + ", 1fr)", gap: 4 }}>
          {Array.from({ length: cellSize }).map((_, i) => {
            const dead = isFailing && i < revealed;
            const col = dead ? RED : GREEN;
            return <div key={i} style={{ height: 16, borderRadius: 3, background: col + "cc", border: "1px solid " + col, transition: "background .12s ease, border-color .12s ease" }} />;
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={{ background: BG, color: TEXT, fontFamily: MONO, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid " + BORDER, fontSize: 12, lineHeight: 1.5 }}>
      <div style={{ color: ACCENT, fontSize: 10, letterSpacing: 2 }}>CELL ARCHITECTURE - THE PATTERN, GENERAL</div>
      <div style={{ color: "#EDEFF3", fontSize: 16, margin: "4px 0 2px", fontWeight: 700 }}>The same {N} customers, one fleet or many cells</div>
      <p style={{ color: "#8B90A0", fontSize: 11, margin: 0 }}>Click a group to fail it. In one big fleet the failure reaches everyone; split into cells, it stops at the cell wall.</p>

      {/* mode */}
      <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {seg(mode === "fleet", "One big fleet", "all customers share one pool", () => settle(() => setMode("fleet")))}
        {seg(mode === "cells", "Cells", "customers split into isolated cells", () => settle(() => setMode("cells")))}
      </div>

      {/* cell count (cells mode) + reset */}
      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: SURFACE, border: "1px solid " + BORDER, borderRadius: 8, padding: "9px 12px" }}>
        <span style={{ color: MUTED, fontSize: 10, letterSpacing: 1.2, opacity: mode === "cells" ? 1 : .4 }}>NUMBER OF CELLS</span>
        {[2, 4, 6].map((k) => {
          const on = mode === "cells" && numCells === k;
          return <button key={k} disabled={mode !== "cells"} onClick={() => settle(() => setNumCells(k))} style={{ padding: "4px 12px", borderRadius: 6, cursor: mode === "cells" ? "pointer" : "default", opacity: mode === "cells" ? 1 : .4, fontFamily: MONO, fontSize: 10.5, fontWeight: on ? 700 : 400, border: "1px solid " + (on ? ACCENT : "#333947"), background: on ? "rgba(249,115,22,0.14)" : "#0C0D13", color: on ? ACCENT : "#9AA0B0" }}>{k}</button>;
        })}
        <span style={{ color: MUTED, fontSize: 10, marginLeft: 2 }}>{mode === "cells" ? "(" + (N / numCells) + " customers each)" : "one pool of " + N}</span>
        {stage !== "idle" && <button onClick={reset} style={{ marginLeft: "auto", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontFamily: MONO, fontSize: 11, border: "1px solid " + BORDER, background: "transparent", color: "#9AA0B0" }}>&#8635; reset</button>}
      </div>

      {/* the fleet / cells */}
      <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 10 }}>
        {Array.from({ length: cellsCount }).map((_, b) => cellBox(b))}
      </div>

      {/* stats + verdict */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
        <div style={{ flex: "1 1 160px", minWidth: 160, background: SURFACE, border: "1px solid " + (down > cellSize ? RED : (stage === "done" ? (mode === "fleet" ? RED : GREEN) : BORDER)), borderRadius: 8, padding: 12 }}>
          <div style={{ color: MUTED, fontSize: 10, letterSpacing: 1.2 }}>BLAST RADIUS</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: pct >= 100 ? RED : (pct === 0 ? TEXT : (mode === "fleet" ? RED : AMBER)) }}>{pct}<span style={{ fontSize: 13, color: MUTED }}>%</span></div>
          <div style={{ color: MUTED, fontSize: 10.5, marginTop: 2 }}>{down} of {N} customers</div>
          <div style={{ color: MUTED, fontSize: 10, letterSpacing: 1.2, marginTop: 10 }}>CELLS TO RUN</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>{cellsCount}<span style={{ fontSize: 11, color: MUTED }}> {cellsCount === 1 ? "fleet" : "cells"}</span></div>
        </div>
        <div style={{ flex: "2 1 320px", minWidth: 260, background: SURFACE, border: "1px solid " + v.c, borderRadius: 8, padding: "11px 13px" }}>
          <div style={{ color: v.c, fontWeight: 700, fontSize: 12.5 }}>{v.code}</div>
          <div style={{ fontSize: 11.5, lineHeight: 1.6, color: TEXT, marginTop: 4 }}>{v.t}</div>
        </div>
      </div>

      <div style={{ color: MUTED, fontSize: 10, marginTop: 12, borderTop: "1px solid " + BORDER, paddingTop: 8, lineHeight: 1.7 }}>
        More cells shrink the blast radius of any one failure, but every cell is another thing to run. The cell is the unit of capacity, the unit of isolation, and the unit you reason about.
      </div>
    </div>
  );
}
