import { useState, useEffect, useRef } from "react";

// Pattern artifact - Circuit Breaker (general mechanism).
// A burst of calls hits a dependency that is down for a stretch. With timeouts only, every call during the
// outage waits the full timeout before failing. With a breaker, a few failures trip it open and the rest
// fail instantly; a probe catches the recovery. Watch the "time spent waiting" collapse.
// Structural grays use the named artifact tokens; GREEN/AMBER/RED and ACCENT are content accents.

const BG = "#08090D", SURFACE = "#0F1118", SURFACE2 = "#161922", BORDER = "#1F2333";
const TEXT = "#C8CDD8", MUTED = "#6B7280";
const GREEN = "#22C55E", AMBER = "#F5B841", RED = "#EF4444", ACCENT = "#F97316";
const MONO = "'JetBrains Mono','Fira Code',ui-monospace,monospace";

const N = 40, OUT_START = 8, OUT_END = 27, TIMEOUT = 3, COOLDOWN = 3;
const isDown = (t) => t >= OUT_START && t <= OUT_END;

// Pure sim, mirrored by the headless test.
function simulate(mode, threshold) {
  const calls = [];
  let state = "closed", fails = 0, openUntil = 0, wasted = 0, instant = 0;
  for (let t = 1; t <= N; t++) {
    const down = isDown(t);
    if (mode === "none") {
      if (down) { calls.push({ t, out: "timeout", cost: TIMEOUT, state: "none" }); wasted += TIMEOUT; }
      else calls.push({ t, out: "ok", cost: 0, state: "none" });
      continue;
    }
    if (state === "open" && t >= openUntil) state = "half";
    if (state === "half") {
      if (down) { calls.push({ t, out: "probe-fail", cost: TIMEOUT, state: "half" }); wasted += TIMEOUT; state = "open"; openUntil = t + COOLDOWN; fails = 0; }
      else { calls.push({ t, out: "probe-ok", cost: 0, state: "half" }); state = "closed"; fails = 0; }
      continue;
    }
    if (state === "open") { calls.push({ t, out: "instant", cost: 0, state: "open" }); instant += 1; continue; }
    // closed
    if (down) {
      calls.push({ t, out: "timeout", cost: TIMEOUT, state: "closed" }); wasted += TIMEOUT; fails += 1;
      if (fails >= threshold) { state = "open"; openUntil = t + COOLDOWN; }
    } else { calls.push({ t, out: "ok", cost: 0, state: "closed" }); fails = 0; }
  }
  return { calls, wasted, instant };
}

const OUT_COL = { ok: GREEN, timeout: RED, instant: "#4B5162", "probe-fail": AMBER, "probe-ok": GREEN };

export default function PatternCircuitBreaker() {
  const [mode, setMode] = useState("none");     // "none" (timeouts only) | "breaker"
  const [threshold, setThreshold] = useState(3);
  const [shown, setShown] = useState(N);
  const [running, setRunning] = useState(false);
  const timer = useRef(null);

  const sim = simulate(mode === "breaker" ? "breaker" : "none", threshold);
  const revealed = sim.calls.slice(0, shown);
  const wastedSoFar = revealed.reduce((a, c) => a + c.cost, 0);
  const instantSoFar = revealed.filter((c) => c.out === "instant").length;
  const done = shown >= N;
  const curState = mode === "breaker" && revealed.length ? revealed[revealed.length - 1].state : null;

  useEffect(() => () => clearInterval(timer.current), []);
  const stop = () => { clearInterval(timer.current); setRunning(false); };
  const run = () => { clearInterval(timer.current); setShown(0); setRunning(true); let k = 0;
    timer.current = setInterval(() => { k += 1; setShown(k); if (k >= N) { clearInterval(timer.current); setRunning(false); } }, 260); };
  const pick = (patch) => { stop(); patch(); setShown(N); };

  const totalWasted = sim.wasted;
  const baseline = simulate("none", threshold).wasted;
  let v;
  if (mode === "none") v = { c: RED, code: "TIMEOUTS ONLY", t: "No breaker: every call during the outage waited the full timeout before failing. Time spent waiting: " + totalWasted + "s across " + (totalWasted / TIMEOUT) + " calls, all of it on a dependency that was down." };
  else v = { c: GREEN, code: "CIRCUIT BREAKER", t: "The breaker tripped after " + threshold + " failures and failed the next calls instantly. Time spent waiting: " + totalWasted + "s, down from " + baseline + "s - a long outage turned into a few cheap failures, and a probe caught the recovery." };

  const stateBadge = (st) => {
    const map = { closed: [GREEN, "CLOSED", "calls pass through"], open: [RED, "OPEN", "calls fail instantly"], half: [AMBER, "HALF-OPEN", "one test call"] };
    const [c, label, sub] = map[st] || [MUTED, "-", ""];
    return <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ color: c, fontWeight: 700 }}>{label}</span><span style={{ color: MUTED, fontSize: 10 }}>{sub}</span></span>;
  };

  const seg = (on, label, sub, onClick) => (
    <button onClick={onClick} style={{ flex: "1 1 150px", textAlign: "left", padding: "9px 12px", borderRadius: 8, cursor: "pointer", fontFamily: MONO, border: "1px solid " + (on ? ACCENT : "#333947"), background: on ? "rgba(249,115,22,0.12)" : "#0C0D13", color: TEXT }}>
      <div style={{ color: on ? ACCENT : "#AEB4C2", fontWeight: 700, fontSize: 11.5 }}>{label}</div>
      <div style={{ color: "#7C8290", fontSize: 10, marginTop: 2, lineHeight: 1.4 }}>{sub}</div>
    </button>
  );

  return (
    <div style={{ background: BG, color: TEXT, fontFamily: MONO, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid " + BORDER, fontSize: 12, lineHeight: 1.5 }}>
      <div style={{ color: ACCENT, fontSize: 10, letterSpacing: 2 }}>CIRCUIT BREAKER - THE PATTERN, GENERAL</div>
      <div style={{ color: "#EDEFF3", fontSize: 16, margin: "4px 0 2px", fontWeight: 700 }}>A burst of calls hits a dependency that goes down</div>
      <p style={{ color: "#8B90A0", fontSize: 11, margin: 0 }}>With only a timeout, every call during the outage waits the full timeout before failing. A breaker trips and fails them instantly instead.</p>

      {/* mode */}
      <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {seg(mode === "none", "Timeouts only", "each call waits out the timeout", () => pick(() => setMode("none")))}
        {seg(mode === "breaker", "Circuit breaker", "trip open, then fail instantly", () => pick(() => setMode("breaker")))}
      </div>

      {/* threshold + run */}
      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: SURFACE, border: "1px solid " + BORDER, borderRadius: 8, padding: "9px 12px" }}>
        <span style={{ color: MUTED, fontSize: 10, letterSpacing: 1.2, opacity: mode === "breaker" ? 1 : .4 }}>TRIP AFTER</span>
        {[2, 3, 5].map((k) => {
          const on = mode === "breaker" && threshold === k;
          return <button key={k} disabled={mode !== "breaker"} onClick={() => pick(() => setThreshold(k))} style={{ padding: "4px 11px", borderRadius: 6, cursor: mode === "breaker" ? "pointer" : "default", opacity: mode === "breaker" ? 1 : .4, fontFamily: MONO, fontSize: 10.5, fontWeight: on ? 700 : 400, border: "1px solid " + (on ? ACCENT : "#333947"), background: on ? "rgba(249,115,22,0.14)" : "#0C0D13", color: on ? ACCENT : "#9AA0B0" }}>{k}</button>;
        })}
        <span style={{ color: MUTED, fontSize: 10 }}>{mode === "breaker" ? "failures" : "n/a with timeouts only"}</span>
        <button onClick={running ? stop : run} style={{ marginLeft: "auto", padding: "7px 18px", borderRadius: 7, cursor: "pointer", fontFamily: MONO, fontSize: 12, fontWeight: 700, border: "1px solid " + ACCENT, background: running ? "transparent" : ACCENT, color: running ? ACCENT : "#0A0B0F" }}>{running ? "Stop" : (done ? "\u21BA Run" : "Run")}</button>
      </div>

      {/* call stream */}
      <div style={{ marginTop: 12, background: SURFACE, border: "1px solid " + BORDER, borderRadius: 8, padding: "12px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", color: MUTED, fontSize: 10, letterSpacing: 1.2, marginBottom: 8 }}>
          <span>CALLS (each waits {TIMEOUT}s on a failed try, unless failed instantly)</span>
          {curState && <span>breaker: {stateBadge(curState)}</span>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(20, 1fr)", gap: 3, rowGap: 7 }}>
          {sim.calls.map((c, i) => {
            const on = i < shown;
            const col = on ? OUT_COL[c.out] : "#171b26";
            return (
              <div key={i} title={"call " + c.t} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <div style={{ height: 24, borderRadius: 3, background: on ? col + "cc" : col, border: "1px solid " + (on ? col : "#20263480"), transition: "background .1s ease" }} />
                <div style={{ height: 3, borderRadius: 2, background: isDown(c.t) ? RED + "88" : "transparent" }} />
              </div>
            );
          })}
        </div>
        <div style={{ color: MUTED, fontSize: 9.5, marginTop: 4 }}>
          <span style={{ color: GREEN }}>&#9632;</span> ok &nbsp; <span style={{ color: RED }}>&#9632;</span> waited then failed &nbsp; <span style={{ color: "#4B5162" }}>&#9632;</span> failed instantly &nbsp; <span style={{ color: AMBER }}>&#9632;</span> probe &nbsp;·&nbsp; <span style={{ color: RED }}>&#9644;</span> dependency down
        </div>
      </div>

      {/* stats + verdict */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
        <div style={{ flex: "1 1 160px", minWidth: 160, background: SURFACE, border: "1px solid " + v.c, borderRadius: 8, padding: 12 }}>
          <div style={{ color: MUTED, fontSize: 10, letterSpacing: 1.2 }}>TIME SPENT WAITING</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: mode === "breaker" ? GREEN : RED }}>{wastedSoFar}<span style={{ fontSize: 13, color: MUTED }}>s</span></div>
          <div style={{ color: MUTED, fontSize: 10, letterSpacing: 1.2, marginTop: 10 }}>FAILED INSTANTLY</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>{instantSoFar}<span style={{ fontSize: 11, color: MUTED }}> calls</span></div>
        </div>
        <div style={{ flex: "2 1 320px", minWidth: 260, background: SURFACE, border: "1px solid " + v.c, borderRadius: 8, padding: "11px 13px" }}>
          <div style={{ color: v.c, fontWeight: 700, fontSize: 12.5 }}>{v.code}</div>
          <div style={{ fontSize: 11.5, lineHeight: 1.6, color: TEXT, marginTop: 4 }}>{v.t}</div>
        </div>
      </div>

      <div style={{ color: MUTED, fontSize: 10, marginTop: 12, borderTop: "1px solid " + BORDER, paddingTop: 8, lineHeight: 1.7 }}>
        Failing instantly frees the threads and connections a waiting call would hold, and pulling traffic off the dependency gives it room to recover. The breaker makes the space for a fallback; the fallback itself is the application's job.
      </div>
    </div>
  );
}
