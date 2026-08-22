import { useState } from "react";

// Pattern artifact - Universal Staged Rollout (general mechanism).
// You are the operator. Ship a change to 30 servers all at once and watch it break the fleet,
// or stage it: deploy a small wave, read the health signal, then halt or expand. The observation
// window between waves is the whole point of the pattern.
// Structural grays use the named artifact tokens; GREEN/AMBER/RED and ACCENT are content accents.

const BG = "#08090D", SURFACE = "#0F1118", SURFACE2 = "#161922", BORDER = "#1F2333";
const TEXT = "#C8CDD8", MUTED = "#6B7280";
const GREEN = "#22C55E", AMBER = "#F5B841", RED = "#EF4444", ACCENT = "#F97316";
const MONO = "'JetBrains Mono','Fira Code',ui-monospace,monospace";

const N = 30, COLS = 10, CANARY = 3;
const WAVES = [3, 9, 18, 30];              // cumulative servers covered after each wave
const cum = (w) => (w <= 0 ? 0 : WAVES[w - 1]);
const waveLabel = (w) => (w === 1 ? "canary - 3 servers" : WAVES[w - 1] + " of " + N + " servers");

export default function PatternStagedRollout() {
  const [buggy, setBuggy] = useState(true);   // is the change you're shipping defective?
  const [strategy, setStrategy] = useState(null); // null | "all" | "staged"
  const [wave, setWave] = useState(0);        // staged: 0 = nothing yet, 1..4 = waves done
  const [halted, setHalted] = useState(false);
  const [ignored, setIgnored] = useState(false); // did the operator push past a bad signal?

  const reset = () => { setStrategy(null); setWave(0); setHalted(false); setIgnored(false); };
  const chooseAll = () => { setStrategy("all"); setWave(0); setHalted(false); };
  const chooseStaged = () => { setStrategy("staged"); setWave(0); setHalted(false); setIgnored(false); };
  const nextWave = () => setWave((w) => Math.min(w + 1, WAVES.length));
  const pushPast = () => { setIgnored(true); nextWave(); };
  const rollback = () => setHalted(true);

  // ---- derive fleet state ----
  const live = strategy === "all" ? (halted ? 0 : N) : cum(wave); // servers carrying the change
  let node = Array(N).fill("old"); // old = untouched (grey); a rollback reverts every server to this
  if (!halted) {
    for (let i = 0; i < live; i++) node[i] = buggy ? "bad" : "new";
  }
  const downCount = node.filter((s) => s === "bad").length;
  const changed = halted ? 0 : (strategy === "all" ? N : cum(wave));
  const pct = Math.round((changed / N) * 100);

  const atEnd = strategy === "all" || halted || (strategy === "staged" && wave >= WAVES.length);
  const latestWaveBad = strategy === "staged" && buggy && wave > 0 && !halted;

  // ---- health signal + verdict ----
  let sig, v;
  if (!strategy) {
    sig = { c: MUTED, t: "No change shipped yet." };
    v = { c: MUTED, code: "READY", t: "You have a change to ship to " + N + " application servers. Roll it out all at once, or stage it - and watch what each choice does when the change turns out to be bad." };
  } else if (strategy === "all") {
    if (buggy) { sig = { c: RED, t: "Errors on every server at once." };
      v = { c: RED, code: "FLEET-WIDE OUTAGE", t: "You shipped to all " + N + " servers in one move. The bug hit every one at the same moment. There was no small wave to catch it first - the whole fleet is down." }; }
    else { sig = { c: GREEN, t: "All servers healthy." };
      v = { c: AMBER, code: "FINE - THIS TIME", t: "You shipped to all " + N + " at once and it happened to be fine. But if it had been bad, every server would have gone down together, with no warning." }; }
  } else { // staged
    if (halted) { sig = { c: GREEN, t: "Rolled back. Servers healthy." };
      v = { c: GREEN, code: "CAUGHT AND CONTAINED", t: "You caught the bad change at " + (wave === 1 ? "the canary" : "wave " + wave) + " and rolled back. Blast radius was " + cum(wave) + " of " + N + ", now recovered. Staging turned an outage into a contained blip." }; }
    else if (wave === 0) { sig = { c: MUTED, t: "Nothing deployed yet - start with the canary." };
      v = { c: MUTED, code: "STAGED - READY", t: "Ship to a small first wave, watch the health signal, then decide. Start with the canary: the first " + CANARY + " servers only." }; }
    else if (wave >= WAVES.length) {
      if (buggy) { sig = { c: RED, t: "Bad change on all " + N + " servers." };
        v = { c: RED, code: "YOU IGNORED THE CANARY", t: "You pushed past every warning to 100%. The bad change is now on all " + N + " servers - the exact outage staging exists to prevent. The signal was there at the canary." }; }
      else { sig = { c: GREEN, t: "All waves healthy." };
        v = { c: GREEN, code: "CLEAN ROLLOUT", t: "Every wave stayed healthy and the change reached all " + N + " servers. A clean staged rollout - and if any wave had gone bad, you would have stopped there." }; }
    } else if (latestWaveBad) {
      sig = { c: RED, t: "Errors in the latest wave (" + cum(wave) + " of " + N + ")." };
      v = { c: AMBER, code: "BAD WAVE - YOUR CALL", t: (wave === 1 ? "The canary wave" : "Wave " + wave) + " went bad. This is the moment staging buys you: " + cum(wave) + " servers are affected, the other " + (N - cum(wave)) + " are untouched. Roll back now, or push on to see what ignoring the signal costs." };
    } else {
      sig = { c: GREEN, t: "Wave healthy (" + cum(wave) + " of " + N + ")." };
      v = { c: GREEN, code: "WAVE HEALTHY", t: "The change is healthy on " + cum(wave) + " of " + N + " servers. Expand to the next wave, or stop here." };
    }
  }

  // ---- ui bits ----
  const bigBtn = (label, onClick, col, sub) => (
    <button onClick={onClick} style={{ flex: "1 1 200px", textAlign: "left", padding: "12px 14px", borderRadius: 9, cursor: "pointer", fontFamily: MONO, border: "1px solid " + col, background: col + "14", color: TEXT }}>
      <div style={{ color: col, fontWeight: 700, fontSize: 12.5 }}>{label}</div>
      {sub && <div style={{ color: "#8B90A0", fontSize: 10.5, marginTop: 3, lineHeight: 1.5 }}>{sub}</div>}
    </button>
  );
  const smBtn = (label, onClick, col, solid) => (
    <button onClick={onClick} style={{ padding: "7px 14px", borderRadius: 7, cursor: "pointer", fontFamily: MONO, fontSize: 11.5, fontWeight: 700, border: "1px solid " + col, background: solid ? col : col + "18", color: solid ? "#0A0B0F" : col }}>{label}</button>
  );
  const nodeStyle = (s) => {
    const map = { old: [SURFACE2, "#3A3F4E"], new: [GREEN + "22", GREEN], ok: [GREEN + "22", GREEN], bad: [RED + "22", RED] };
    const pair = map[s];
    return { height: 24, borderRadius: 4, background: pair[0], border: "1px solid " + pair[1], transition: "all .3s ease" };
  };

  return (
    <div style={{ background: BG, color: TEXT, fontFamily: MONO, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid " + BORDER, fontSize: 12, lineHeight: 1.5 }}>
      <div style={{ color: ACCENT, fontSize: 10, letterSpacing: 2 }}>UNIVERSAL STAGED ROLLOUT - THE PATTERN, GENERAL</div>
      <div style={{ color: "#EDEFF3", fontSize: 16, margin: "4px 0 2px", fontWeight: 700 }}>You are shipping a change to {N} servers</div>
      <p style={{ color: "#8B90A0", fontSize: 11, margin: 0 }}>The same change, sent to every server at once, is an outage. Sent to a small wave first, it is a caught mistake. You drive it.</p>

      {/* change quality - locked once a strategy is chosen so the run is honest */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
        <span style={{ color: MUTED, fontSize: 10, letterSpacing: 1.2 }}>THIS CHANGE IS</span>
        <button disabled={!!strategy} onClick={() => setBuggy(true)} style={{ padding: "4px 12px", borderRadius: 6, cursor: strategy ? "default" : "pointer", opacity: strategy && !buggy ? .4 : 1, fontFamily: MONO, fontSize: 10.5, fontWeight: buggy ? 700 : 400, border: "1px solid " + (buggy ? RED : "#3A3F4E"), background: buggy ? RED : "#0C0D13", color: buggy ? "#0A0B0F" : "#9AA0B0" }}>BUGGY</button>
        <button disabled={!!strategy} onClick={() => setBuggy(false)} style={{ padding: "4px 12px", borderRadius: 6, cursor: strategy ? "default" : "pointer", opacity: strategy && buggy ? .4 : 1, fontFamily: MONO, fontSize: 10.5, fontWeight: !buggy ? 700 : 400, border: "1px solid " + (!buggy ? GREEN : "#3A3F4E"), background: !buggy ? GREEN : "#0C0D13", color: !buggy ? "#0A0B0F" : "#9AA0B0" }}>SAFE</button>
        {strategy && <span style={{ color: MUTED, fontSize: 10 }}>&nbsp;(locked for this run)</span>}
        {strategy && <button onClick={reset} style={{ marginLeft: "auto", padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontFamily: MONO, fontSize: 10.5, border: "1px solid " + BORDER, background: "transparent", color: "#9AA0B0" }}>&#8635; start over</button>}
      </div>

      {/* controls */}
      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
        {!strategy && bigBtn("Deploy to all 30 at once", chooseAll, RED, "One move. No canary, no observation window.")}
        {!strategy && bigBtn("Stage the rollout", chooseStaged, GREEN, "Small wave first, watch the signal, then expand.")}

        {strategy === "staged" && !atEnd && wave === 0 && smBtn("Deploy to canary (first 3)", nextWave, ACCENT, true)}
        {strategy === "staged" && !atEnd && wave > 0 && !latestWaveBad &&
          smBtn("Expand to next wave (" + waveLabel(wave + 1) + ")", nextWave, GREEN, true)}
        {strategy === "staged" && !atEnd && latestWaveBad && (
          <>
            {smBtn("Halt & roll back", rollback, GREEN, true)}
            {smBtn("Ignore & push on", pushPast, RED, false)}
          </>
        )}
      </div>

      {/* verdict */}
      <div style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid " + v.c, background: v.c + "14", marginTop: 12 }}>
        <div style={{ color: v.c, fontWeight: 700 }}>{v.code}</div>
        <div style={{ marginTop: 5, fontSize: 11.5, lineHeight: 1.6, color: TEXT }}>{v.t}</div>
      </div>

      {/* fleet + meters */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
        <div style={{ flex: "2 1 460px", minWidth: 300, background: SURFACE, border: "1px solid " + BORDER, borderRadius: 8, padding: 12 }}>
          <div style={{ color: MUTED, fontSize: 10, letterSpacing: 1.2, marginBottom: 8 }}>THE FLEET - {N} APPLICATION SERVERS <span style={{ color: "#4B5563" }}>· grey = unchanged · green = healthy · red = broken</span></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(" + COLS + ", 1fr)", gap: 5 }}>
            {node.map((s, i) => <div key={i} style={nodeStyle(s)} />)}
          </div>
          <div style={{ marginTop: 10, padding: "7px 10px", borderRadius: 6, border: "1px solid " + sig.c, background: sig.c + "12", fontSize: 11 }}>
            <span style={{ color: sig.c, fontWeight: 700, letterSpacing: .5 }}>HEALTH SIGNAL</span>
            <span style={{ color: TEXT, marginLeft: 8 }}>{sig.t}</span>
          </div>
        </div>
        <div style={{ flex: "1 1 190px", minWidth: 190, background: SURFACE, border: "1px solid " + BORDER, borderRadius: 8, padding: 12 }}>
          <div style={{ color: MUTED, fontSize: 10, letterSpacing: 1.2 }}>BLAST RADIUS</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: downCount === 0 ? GREEN : downCount === N ? RED : AMBER, transition: "color .3s ease" }}>{downCount}<span style={{ fontSize: 13, color: MUTED }}>/{N}</span></div>
          <div style={{ color: MUTED, fontSize: 10, letterSpacing: 1.2, marginTop: 12 }}>ROLLED OUT</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: TEXT }}>{pct}<span style={{ fontSize: 13, color: MUTED }}>%</span></div>
          <div style={{ height: 6, background: SURFACE2, borderRadius: 3, marginTop: 6, overflow: "hidden" }}>
            <div style={{ width: pct + "%", height: "100%", background: downCount ? RED : GREEN, transition: "width .3s ease" }} />
          </div>
        </div>
      </div>

      <div style={{ color: MUTED, fontSize: 10, marginTop: 12, borderTop: "1px solid " + BORDER, paddingTop: 8, lineHeight: 1.7 }}>
        Same discipline, every channel: deploys, config, infrastructure automation, OS and security updates. Any change path that skips this loop can turn one hidden bug into a fleet-wide outage.
      </div>
    </div>
  );
}
