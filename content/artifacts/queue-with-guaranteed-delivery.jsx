import { useState, useEffect, useRef } from "react";

// Pattern artifact - Queue with Guaranteed Delivery (general mechanism).
// A producer surge overwhelms the consumer. A BUFFER (fixed capacity) drops everything past its cap - those
// messages are gone. A QUEUE (durable) holds the whole backlog and drains it once the surge passes - nothing
// is lost, the failure just turns into delay. Watch the lost counter climb for the buffer and stay at 0 for the queue.
// Structural grays use the named artifact tokens; GREEN/AMBER/RED and ACCENT are content accents.

const BG = "#08090D", SURFACE = "#0F1118", SURFACE2 = "#161922", BORDER = "#1F2333";
const TEXT = "#C8CDD8", MUTED = "#6B7280";
const GREEN = "#22C55E", AMBER = "#F5B841", RED = "#EF4444", ACCENT = "#F97316", BLUE = "#60A5FA";
const MONO = "'JetBrains Mono','Fira Code',ui-monospace,monospace";

const TICKS = 25, C = 4, CAP = 12;
const incoming = (t) => (t >= 6 && t <= 13 ? 10 : (t <= 5 ? 4 : 0)); // normal, surge, then drain
const isSurge = (t) => t >= 6 && t <= 13;

// Pure sim, mirrored by the headless test.
function simulate(mode) {
  let stored = 0, delivered = 0, lost = 0; const out = [];
  for (let t = 1; t <= TICKS; t++) {
    const inc = incoming(t);
    const avail = stored + inc;
    const proc = Math.min(C, avail); delivered += proc;
    const rem = avail - proc;
    let dropped = 0;
    if (mode === "buffer") { dropped = Math.max(0, rem - CAP); lost += dropped; stored = Math.min(rem, CAP); }
    else { stored = rem; }
    out.push({ t, inc, backlog: stored, delivered, lost, dropped });
  }
  return out;
}

export default function PatternGuaranteedQueue() {
  const [mode, setMode] = useState("buffer"); // "buffer" | "queue"
  const [shown, setShown] = useState(0);
  const [running, setRunning] = useState(false);
  const timer = useRef(null);

  const sim = simulate(mode);
  const cur = (shown <= 0) ? { backlog: 0, delivered: 0, lost: 0, dropped: 0, t: 0 } : (sim[Math.min(shown, TICKS) - 1] || { backlog: 0, delivered: 0, lost: 0, dropped: 0, t: 0 });
  const done = shown >= TICKS;

  useEffect(() => () => clearInterval(timer.current), []);
  const stop = () => { clearInterval(timer.current); setRunning(false); };
  const run = () => { clearInterval(timer.current); setShown(0); setRunning(true); let k = 0;
    timer.current = setInterval(() => { k += 1; setShown(k); if (k >= TICKS) { clearInterval(timer.current); setRunning(false); } }, 200); };
  const pick = (m) => { stop(); setMode(m); setShown(0); };

  const MAXBL = 50;
  const other = simulate(mode === "buffer" ? "queue" : "buffer")[TICKS - 1];
  const lostTotal = sim[TICKS - 1].lost, deliveredTotal = sim[TICKS - 1].delivered;

  let v;
  if (!done && !running) v = { c: MUTED, code: "READY", t: mode === "buffer" ? "A buffer holds a fixed amount in memory. Run it: when the surge overflows the cap, the extra messages are dropped." : "A durable queue saves every message. Run it: the surge builds a backlog, but nothing is lost - it drains later." };
  else if (running) v = { c: AMBER, code: "PRODUCER SURGE IN PROGRESS", t: mode === "buffer" ? "Messages past the cap are being dropped..." : "The backlog is growing, but every message is safe..." };
  else if (mode === "buffer") v = { c: RED, code: "BUFFER: " + lostTotal + " MESSAGES LOST", t: "The surge overflowed the " + CAP + "-message cap, and everything past it was dropped for good. Delivered " + deliveredTotal + ", lost " + lostTotal + ". This is a buffer, not a queue." };
  else v = { c: GREEN, code: "QUEUE: NOTHING LOST", t: "The surge built a backlog instead of dropping anything, and the consumer drained it once the surge passed. Delivered all " + deliveredTotal + ", lost 0 - against " + other.lost + " lost as a buffer. The failure became delay, not data loss." };

  const seg = (on, label, sub, onClick) => (
    <button onClick={onClick} style={{ flex: "1 1 190px", textAlign: "left", padding: "9px 12px", borderRadius: 8, cursor: "pointer", fontFamily: MONO, border: "1px solid " + (on ? ACCENT : "#333947"), background: on ? "rgba(249,115,22,0.12)" : "#0C0D13", color: TEXT }}>
      <div style={{ color: on ? ACCENT : "#AEB4C2", fontWeight: 700, fontSize: 11.5 }}>{label}</div>
      <div style={{ color: "#7C8290", fontSize: 10, marginTop: 2, lineHeight: 1.4 }}>{sub}</div>
    </button>
  );

  return (
    <div style={{ background: BG, color: TEXT, fontFamily: MONO, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid " + BORDER, fontSize: 12, lineHeight: 1.5 }}>
      <div style={{ color: ACCENT, fontSize: 10, letterSpacing: 2 }}>QUEUE WITH GUARANTEED DELIVERY - THE PATTERN, GENERAL</div>
      <div style={{ color: "#EDEFF3", fontSize: 16, margin: "4px 0 2px", fontWeight: 700 }}>A producer surge the consumer can't keep up with</div>
      <p style={{ color: "#8B90A0", fontSize: 11, margin: 0 }}>Messages arrive faster than they're processed. A buffer drops the overflow; a durable queue holds it all and drains later.</p>

      {/* mode */}
      <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {seg(mode === "buffer", "In-memory buffer", "fixed capacity, drops overflow", () => pick("buffer"))}
        {seg(mode === "queue", "Durable queue", "saves every message, holds backlog", () => pick("queue"))}
      </div>

      {/* run */}
      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: SURFACE, border: "1px solid " + BORDER, borderRadius: 8, padding: "9px 12px" }}>
        <span style={{ color: MUTED, fontSize: 10, letterSpacing: 1.2 }}>PRODUCER {isSurge(cur.t) ? "SURGING (10/tick)" : "4/tick"} &middot; CONSUMER {C}/tick</span>
        <button onClick={running ? stop : run} style={{ marginLeft: "auto", padding: "7px 18px", borderRadius: 7, cursor: "pointer", fontFamily: MONO, fontSize: 12, fontWeight: 700, border: "1px solid " + ACCENT, background: running ? "transparent" : ACCENT, color: running ? ACCENT : "#0A0B0F" }}>{running ? "Stop" : (done ? "\u21BA Run" : "Run")}</button>
      </div>

      {/* backlog chart */}
      <div style={{ marginTop: 12, background: SURFACE, border: "1px solid " + BORDER, borderRadius: 8, padding: "12px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", color: MUTED, fontSize: 10, letterSpacing: 1.2, marginBottom: 8 }}>
          <span>BACKLOG OVER TIME (each bar = one tick)</span><span>tick {cur.t}/{TICKS}</span>
        </div>
        <div style={{ position: "relative", display: "flex", alignItems: "flex-end", gap: 2, height: 110 }}>
          {/* cap line for buffer */}
          {mode === "buffer" && <div style={{ position: "absolute", left: 0, right: 0, bottom: (CAP / MAXBL) * 110, borderTop: "1px dashed " + RED, zIndex: 2 }}><span style={{ position: "absolute", right: 0, top: -13, color: RED, fontSize: 9 }}>cap {CAP}</span></div>}
          {sim.map((d, i) => {
            const on = i < shown;
            const h = Math.min(d.backlog / MAXBL, 1) * 110;
            const col = d.dropped > 0 ? RED : (isSurge(d.t) ? AMBER : BLUE);
            return <div key={i} style={{ flex: 1, height: on ? Math.max(h, 2) : 0, background: on ? col + "cc" : "transparent", borderRadius: "2px 2px 0 0", transition: "height .12s ease" }} title={"tick " + d.t + ": backlog " + d.backlog} />;
          })}
        </div>
        <div style={{ color: MUTED, fontSize: 9.5, marginTop: 5 }}><span style={{ color: BLUE }}>&#9632;</span> normal &nbsp; <span style={{ color: AMBER }}>&#9632;</span> backlog building &nbsp; <span style={{ color: RED }}>&#9632;</span> dropping messages</div>
      </div>

      {/* stats + verdict */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
        <div style={{ flex: "1 1 170px", minWidth: 170, background: SURFACE, border: "1px solid " + v.c, borderRadius: 8, padding: 12 }}>
          <div style={{ color: MUTED, fontSize: 10, letterSpacing: 1.2 }}>DELIVERED</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: GREEN }}>{cur.delivered}</div>
          <div style={{ color: MUTED, fontSize: 10, letterSpacing: 1.2, marginTop: 8 }}>LOST</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: cur.lost > 0 ? RED : TEXT }}>{cur.lost}</div>
          <div style={{ color: MUTED, fontSize: 10, letterSpacing: 1.2, marginTop: 8 }}>BACKLOG NOW</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: cur.backlog > 0 ? AMBER : GREEN }}>{cur.backlog}</div>
        </div>
        <div style={{ flex: "2 1 320px", minWidth: 260, background: SURFACE, border: "1px solid " + v.c, borderRadius: 8, padding: "11px 13px" }}>
          <div style={{ color: v.c, fontWeight: 700, fontSize: 12.5 }}>{v.code}</div>
          <div style={{ fontSize: 11.5, lineHeight: 1.6, color: TEXT, marginTop: 4 }}>{v.t}</div>
        </div>
      </div>

      <div style={{ color: MUTED, fontSize: 10, marginTop: 12, borderTop: "1px solid " + BORDER, paddingTop: 8, lineHeight: 1.7 }}>
        If the way your queue fails under pressure is to lose data, it is a buffer, not a queue. A real queue turns a consumer that can't keep up into a backlog to drain, never messages to mourn.
      </div>
    </div>
  );
}
