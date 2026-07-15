import { useState } from "react";

const ACCENT = "#E50914";
const RED = "#ef4444"; const AMBER = "#eab308"; const GREEN = "#22c55e"; const VIOLET = "#9b8cf0";
const TASKS = ["INSPECT", "ENCODE", "SUBTITLES", "THUMBNAILS", "PUBLISH"];

const initial = (mode) => ({ mode, started: false, done: [false, false, false, false, false], stalled: false, killArmed: false, retries: 0, hours: 0, eng: 0, traced: false, queried: false, tta: null, titles: 0, killedThisRun: false, finished: false });

export default function WhatRemains() {
  const [w, setW] = useState(() => initial("cho"));
  const nextIdx = w.done.findIndex(d => !d);
  const remaining = TASKS.filter((_, i) => !w.done[i]);

  const advance = () => setW(x => {
    let y = { ...x, done: [...x.done], hours: x.hours + 2 };
    if (!y.started || y.finished) return x;
    const i = y.done.findIndex(d => !d);
    if (i === -1) return x;
    if (y.stalled) {
      if (y.mode === "orc") { // task definition: timeout fires, Decider retries
        y.stalled = false; y.retries += 1; y.done[i] = true;
      } else { y.eng += 1; return y; } // choreography: silence — nothing owns the stall
    } else if (i === 1 && y.killArmed) {
      y.killArmed = false; y.stalled = true; y.killedThisRun = true; return y;
    } else { y.done[i] = true; }
    if (y.done.every(Boolean)) { y.finished = true; y.titles += 1; }
    return y;
  });

  const query = () => setW(x => ({ ...x, queried: true, tta: x.mode === "orc" ? "instant" : x.traced ? "5 eng-min" : "unknown" }));

  const verdict = (() => {
    if (w.finished) {
      if (w.killedThisRun && w.mode === "orc") return { c: GREEN, code: "THE ENGINE NOTICED SO NOBODY HAD TO", t: `The dead worker's task went silent; the task definition's timeout fired; the Decider — holding blueprint plus current state — rescheduled ENCODE (retry ${w.retries}/3) and the flow finished on its own. Retries, timeouts, and resumption are configuration here, not per-service code. Compare your engineer-minute meter across the two modes.` };
      if (w.killedThisRun) return { c: AMBER, code: "RECOVERED — BY HAND, AS ALWAYS", t: `The title finished, but only because you traced the stall across services and re-emitted the lost event yourself. Nothing in the system owned the process, so recovery belonged to whoever went looking. Multiply your ${w.eng} engineer-minutes by every stalled flow in a catalog's worth of titles.` };
      return { c: GREEN, code: "TITLE COMPLETE — THE HAPPY PATH TEACHES NOTHING", t: "Both modes run tasks fine when nothing breaks. Start another title and KILL THE ENCODE WORKER this time — the difference between these modes only shows itself when something goes silent." };
    }
    if (w.stalled && w.mode === "cho") return { c: RED, code: "SOMETHING IS WRONG — AND NOTHING SAYS SO", t: `ENCODE's worker died mid-task; its completion event will never be emitted, and no component is waiting for it in any way that alarms. Progress has simply… stopped. Press WHAT REMAINS and see what the system can tell you. (Engineer-minutes are accruing: ${w.eng}.)` };
    if (w.stalled && w.mode === "orc") return { c: VIOLET, code: "TASK SILENT — TIMEOUT ARMED", t: "The worker died, but the Decider holds the blueprint and the instance state, and the task definition carries responseTimeout and retryCount 3. Advance once more and watch the engine do what choreography made you do by hand." };
    if (w.queried && w.mode === "cho" && !w.traced) return { c: RED, code: "UNKNOWN — THE PROCESS HAS NO OWNER", t: "The question 'what remains for this title?' has no component that can answer it. The state is smeared across five services' logs and databases and four topic backlogs. TRACE BY HAND to reconstruct it — and pay for the reconstruction." };
    if (w.started) return { c: AMBER, code: w.mode === "cho" ? "EVENTS FLOWING — THE PROCESS EXISTS NOWHERE" : "DECIDER DRIVING — BLUEPRINT PLUS STATE", t: w.mode === "cho" ? "Each worker consumes an event and emits the next. Advance the work — and try WHAT REMAINS at any point, or kill the encode worker and see who notices." : "On every completion the Decider re-evaluates the instance against the blueprint and schedules what's next. WHAT REMAINS is a lookup now. Kill the encode worker and advance." };
    return { c: AMBER, code: "A TITLE-SETUP WORKFLOW, TWO WAYS TO RUN IT", t: "inspect → encode → subtitles ∥ thumbnails → publish, several days long in real life. Pick a coordination mode and start the title. The button that matters is WHAT REMAINS FOR THIS TITLE? — the question Netflix couldn't answer." };
  })();

  const mono = "'JetBrains Mono','Fira Code',ui-monospace,monospace";
  const S = {
    root: { background: "#08090D", color: "#c8cdd8", fontFamily: mono, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid #2a2a3a", fontSize: 12, lineHeight: 1.5 },
    panel: { background: "#111118", border: "1px solid #2a2a3a", borderRadius: 8, padding: 12 },
    label: { color: "#6b7080", fontSize: 10, letterSpacing: 1.2 },
    btn: (on, dis) => ({ display: "block", width: "100%", textAlign: "left", padding: "7px 9px", marginTop: 6, borderRadius: 6, cursor: dis ? "not-allowed" : "pointer", opacity: dis ? 0.4 : 1, border: `1px solid ${on ? ACCENT : "#2a2a3a"}`, color: on ? "#ffb3b7" : "#8b90a0", background: on ? "rgba(229,9,20,0.10)" : "#0c0d13", fontFamily: mono, fontSize: 11 }),
  };
  const console_ = w.queried
    ? w.mode === "orc"
      ? TASKS.map((t, i) => `${t}: ${w.done[i] ? "DONE" : w.stalled && i === 1 ? `TIMED OUT (retry ${w.retries}/3 pending)` : i === nextIdx ? "SCHEDULED" : "PENDING"}`).join("\n")
      : w.traced
        ? `(reconstructed by hand)\n${remaining.map(t => `${t}: not done`).join("\n")}`
        : "UNKNOWN.\nThe process is embedded in 5 services.\nCheck: inspect-svc logs, encode-svc logs,\nsubtitle-svc DB, thumb-svc DB, 4 topic backlogs."
    : "— no query yet —";

  return (
    <div style={S.root}>
      <div style={{ color: ACCENT, fontSize: 10, letterSpacing: 2 }}>NETFLIX · CONDUCTOR — INTERACTIVE</div>
      <div style={{ color: "#edeff3", fontSize: 16, margin: "4px 0 2px", fontWeight: 700 }}>What remains</div>
      <p style={{ color: "#8b90a0", fontSize: 11, margin: 0 }}>The same five-task title setup, coordinated two ways. The difference isn't whether tasks run — it's whether the process exists anywhere you can ask.</p>
      <ContextBlock />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
        <div style={{ ...S.panel, flex: "1 1 250px", minWidth: 250 }}>
          <div style={S.label}>COORDINATION MODE</div>
          <button style={S.btn(w.mode === "cho", w.started && !w.finished)} disabled={w.started && !w.finished} onClick={() => setW(x => ({ ...initial("cho"), titles: x.titles }))}>CHOREOGRAPHY<div style={{ color: "#6b7080", fontSize: 10 }}>pub/sub — the process exists nowhere</div></button>
          <button style={S.btn(w.mode === "orc", w.started && !w.finished)} disabled={w.started && !w.finished} onClick={() => setW(x => ({ ...initial("orc"), titles: x.titles }))}>ORCHESTRATOR (DECIDER)<div style={{ color: "#6b7080", fontSize: 10 }}>blueprint + instance state, one owner</div></button>
          <div style={{ ...S.label, marginTop: 12 }}>RUN THE TITLE</div>
          <button style={S.btn(false, w.started && !w.finished)} disabled={w.started && !w.finished} onClick={() => setW(x => ({ ...initial(x.mode), titles: x.titles, started: true }))}>START TITLE SETUP</button>
          <button style={S.btn(false, !w.started || w.finished)} disabled={!w.started || w.finished} onClick={advance}>LET WORK HAPPEN (+2h)</button>
          <button style={{ ...S.btn(w.killArmed, !w.started || w.finished || w.done[1] || w.stalled), borderColor: w.killArmed ? RED : undefined, color: w.killArmed ? RED : undefined }} disabled={!w.started || w.finished || w.done[1] || w.stalled} onClick={() => setW(x => ({ ...x, killArmed: true }))}>KILL ENCODE WORKER MID-TASK</button>
          <div style={{ ...S.label, marginTop: 12 }}>ASK THE SYSTEM</div>
          <button style={{ ...S.btn(false, !w.started), border: `1px solid ${VIOLET}`, color: "#cfc5ff" }} disabled={!w.started} onClick={query}>WHAT REMAINS FOR THIS TITLE?</button>
          <button style={S.btn(false, !(w.mode === "cho" && w.stalled && w.queried && !w.traced))} disabled={!(w.mode === "cho" && w.stalled && w.queried && !w.traced)} onClick={() => setW(x => ({ ...x, traced: true, eng: x.eng + 5, tta: "5 eng-min" }))}>TRACE BY HAND (+5 ENG-MIN)</button>
          <button style={S.btn(false, !(w.mode === "cho" && w.stalled && w.traced))} disabled={!(w.mode === "cho" && w.stalled && w.traced)} onClick={() => setW(x => ({ ...x, stalled: false }))}>MANUALLY RE-EMIT THE LOST EVENT</button>
          <button style={{ ...S.btn(false, false), marginTop: 12 }} onClick={() => setW(x => ({ ...initial(x.mode), titles: x.titles }))}>↺ RESET RUN</button>
        </div>

        <div style={{ flex: "2 1 420px", minWidth: 300 }}>
          <div style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${verdict.c}`, background: `${verdict.c}14`, marginBottom: 12 }}>
            <div style={{ color: verdict.c, fontWeight: 700 }}>{verdict.code}</div>
            <div style={{ marginTop: 5, fontSize: 11.5, lineHeight: 1.6 }}>{verdict.t}</div>
          </div>
          <div style={S.panel}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={S.label}>MOVIE-{String(w.titles + 1).padStart(3, "0")} · {w.mode === "orc" ? "DECIDER: blueprint v1" : "pub/sub topics"}</div>
              <div style={{ fontSize: 11, color: AMBER, fontWeight: 700 }}>~{w.hours}h · ENG-MIN {w.eng}</div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {TASKS.map((t, i) => (
                <div key={t} style={{ flex: "1 1 100px", background: "#0c0d13", borderRadius: 6, padding: "8px 6px", textAlign: "center", border: `1px ${w.done[i] ? "solid " + GREEN : w.stalled && i === 1 ? "dashed " + RED : i === nextIdx && w.started && !w.finished ? "solid " + AMBER : "dashed #2a2f45"}` }}>
                  <div style={{ fontWeight: 700, fontSize: 10 }}>{t}</div>
                  <div style={{ fontSize: 9, color: w.done[i] ? GREEN : w.stalled && i === 1 ? RED : "#6b7080", marginTop: 2 }}>{w.done[i] ? "done" : w.stalled && i === 1 ? (w.mode === "cho" ? "…nothing? (silent)" : "silent — timeout armed") : i === nextIdx && w.started ? "up next" : "pending"}</div>
                  {w.mode === "orc" && i === 1 && <div style={{ fontSize: 8.5, color: VIOLET, marginTop: 2 }}>retryCount {w.retries}/3 · timeout 1200s</div>}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10, background: "#0b0e12", border: "1px solid #2a2a3a", borderRadius: 6, padding: 10, fontSize: 11, whiteSpace: "pre-line" }}>
              <span style={{ color: VIOLET }}>&gt; what remains for MOVIE-{String(w.titles + 1).padStart(3, "0")}?</span>{"\n"}
              <span style={{ color: w.queried ? (w.mode === "orc" || w.traced ? "#c8cdd8" : RED) : "#5c6874" }}>{console_}</span>
            </div>
            <div style={{ fontSize: 10, color: "#6b7080", marginTop: 6 }}>TITLES COMPLETED: {w.titles} · TIME TO ANSWER (last query): <b style={{ color: w.tta === "instant" ? GREEN : w.tta ? AMBER : "#6b7080" }}>{w.tta || "—"}</b></div>
          </div>
        </div>
      </div>

      <div style={{ color: "#6b7080", fontSize: 10, marginTop: 12, borderTop: "1px solid #2a2a3a", paddingTop: 8, lineHeight: 1.7 }}>
        The task set (inspect/encode/publish plus fork-join), the 'what is remaining for a movie's setup to be complete' question, per-task retryCount 3 / timeoutSeconds 1200 / TIME_OUT_WF, worker polling with queue-depth autoscaling signals, the Decider's blueprint-plus-state evaluation, and the SWF genealogy are from the Netflix post; 2.6M flows, 100 definitions, 190 workers, average 6 tasks, largest 48 are their year-one production stats. Hour costs and the engineer-minute economics here are illustrative pacing.
        {" "}<a href="https://behindscale.com/articles/netflix-conductor-microservices-orchestrator" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: "none" }}>From the full dissection at behindscale.com →</a>
      </div>
    </div>
  );
}

function ContextBlock() {
  const [open, setOpen] = useState(true);
  const lbl = { fontSize: 10, color: ACCENT, letterSpacing: 1.2 };
  if (!open) return <button onClick={() => setOpen(true)} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontFamily: "inherit", fontSize: 10, padding: 0, margin: "10px 0 0", display: "block" }}>SHOW CONTEXT ▾</button>;
  return (
    <div style={{ background: "#111118", border: "1px solid #2a2a3a", borderRadius: 8, padding: "12px 14px", marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <div style={{ fontSize: 10, color: "#6b7080", letterSpacing: 1.2 }}>CONTEXT — IF YOU ARRIVED HERE WITHOUT THE ARTICLE</div>
        <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontFamily: "inherit", fontSize: 10, padding: 0 }}>HIDE ✕</button>
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 8 }}><span style={lbl}>THE PROBLEM · </span>Netflix's days-long title-setup flows were choreographed through pub/sub — the process existed nowhere, only its echoes in five services — so when a flow stalled, nobody could answer 'what is remaining for this movie's setup to be complete?' Partial completion with no owner.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>THE MOVE · </span>Conductor: a JSON blueprint defines the flow, a Decider state machine computes what's next from blueprint plus instance state, per-task retries and timeouts are configuration, and 'what remains' becomes a lookup. 2.6M flows in year one.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>TRY · </span>Run a title under choreography and press WHAT REMAINS — watch the system fail to answer its own question. Kill the encode worker: the flow stalls with no alarm; trace by hand and re-emit the event. Then do it all under the orchestrator and watch the same kill cost you nothing.</div>
    </div>
  );
}
