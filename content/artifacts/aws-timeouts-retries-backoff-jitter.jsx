import { useState, useEffect, useRef } from "react";

function mulberry32(seed) { let a = seed >>> 0; return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const ACCENT = "#FF9900";
const RED = "#ef4444"; const AMBER = "#eab308"; const GREEN = "#22c55e";
const DT = 0.15;
const CLIENTS = 60;
const CAPACITY = 90;
const BASE_RATE = 60;

export default function SelfishRetry() {
  const [brown, setBrown] = useState(false);       // the trigger: capacity halves
  const [backoffCap, setBackoffCap] = useState(0); // seconds, 0 = no backoff
  const [jitter, setJitter] = useState(0);         // 0..1
  const [budget, setBudget] = useState(0);         // token-bucket size, 0 = off
  const [, force] = useState(0);
  const w = useRef(null);
  const fresh = () => ({ t: 0, rng: mulberry32(42), pend: [], tokens: 8, load: BASE_RATE, hist: [] });
  if (!w.current) w.current = fresh();
  const reset = () => { w.current = fresh(); setBrown(false); setBackoffCap(0); setJitter(0); setBudget(0); force((x) => x + 1); };

  useEffect(() => {
    const id = setInterval(() => {
      const W = w.current; W.t += DT;
      const cap = brown ? CAPACITY * 0.45 : CAPACITY;
      let offered = BASE_RATE * DT * (0.95 + W.rng() * 0.1);
      const due = W.pend.filter((r) => r.at <= W.t);
      W.pend = W.pend.filter((r) => r.at > W.t);
      offered += due.reduce((a, r) => a + r.n, 0);
      W.load = offered / DT;
      const util = W.load / cap;
      const failFrac = util <= 1 ? 0.01 : Math.min(0.95, (util - 1) / util + 0.05);
      let willRetry = offered * failFrac * 0.8;
      if (budget >= 0.5) {
        W.tokens = Math.min(budget, W.tokens + 0.5 * DT);
        const allowed = Math.min(willRetry, W.tokens + 0.4 * DT);
        W.tokens = Math.max(0, W.tokens - allowed);
        willRetry = allowed;
      } else { W.tokens = budget; }
      if (willRetry > 0.001) {
        const delay = backoffCap > 0.05 ? backoffCap : 0.3;
        if (jitter < 0.05) {
          W.pend.push({ at: W.t + delay, n: willRetry });
        } else {
          const buckets = 2 + Math.round(jitter * 4);
          for (let k = 0; k < buckets; k++) W.pend.push({ at: W.t + delay * 0.4 + W.rng() * delay * (0.5 + 1.8 * jitter), n: willRetry / buckets });
        }
      }
      W.hist.push({ load: W.load, cap, fail: failFrac }); if (W.hist.length > 110) W.hist.shift();
      force((x) => x + 1);
    }, 150);
    return () => clearInterval(id);
  }, [brown, jitter, backoffCap, budget]);

  const W = w.current;
  const amp = W.load / BASE_RATE;
  const cap = brown ? CAPACITY * 0.45 : CAPACITY;
  const failNow = W.hist.length ? W.hist[W.hist.length - 1].fail : 0;
  const maxLoad = Math.max(CAPACITY * 1.4, ...W.hist.map((h) => h.load));

  const verdict = (() => {
    if (!brown && amp < 1.3) return { c: GREEN, code: "HEALTHY, RETRIES COST ALMOST NOTHING", t: "Brief failures (about 1%) are hidden by retries at almost no cost. The tension only shows up under overload, which is exactly when retries stop being free. Switch on the overload." };
    if (brown) {
      if (budget >= 0.5) return { c: GREEN, code: `RETRY BUDGET, EXTRA LOAD CAPPED near \u00d7${amp.toFixed(1)}`, t: `Each client retries freely while it has tokens, then only at a slow fixed rate. Offered load stays near \u00d7${amp.toFixed(1)} no matter how long the overload lasts. This is the AWS SDK default since 2016. Now switch the overload off and watch it drain.` };
      if (jitter >= 0.3) return { c: AMBER, code: `JITTERED, BUT STILL UNBOUNDED near \u00d7${amp.toFixed(1)}`, t: "Jitter spreads the retries into a roughly even stream, and the dependency can breathe between them. But nothing yet limits the total, so a longer or deeper overload keeps growing the retry load. Add a retry budget." };
      if (backoffCap >= 0.05) return { c: AMBER, code: "BACKOFF, BUT THE WAVES STILL LINE UP", t: "Backoff spaces retries out, but clients that failed together back off together and return together. Watch the load trace spike at the backoff interval. Turn up the jitter to break the lining-up." };
      return { c: RED, code: `RETRY STORM, LOAD near \u00d7${amp.toFixed(1)}`, t: "The dependency is overloaded and every failed call comes straight back. Offered load multiplies at the exact moment capacity has dropped, and the failures feed the retries feed the failures. Add backoff, then jitter, then a budget." };
    }
    return { c: amp > 1.3 ? AMBER : GREEN, code: amp > 1.3 ? "DRAINING THE RETRY BACKLOG" : "RECOVERED", t: amp > 1.3 ? "The dependency is healthy again, but queued retries are still arriving. How fast this drains is the real test, since storms outlive their causes." : "Load is back to baseline. Compare how long that took with different settings. The tail of the storm is where the damage adds up." };
  })();

  const mono = "'JetBrains Mono','Fira Code','SF Mono',ui-monospace,monospace";
  const S = {
    root: { background: "#08090D", color: "#c8cdd8", fontFamily: mono, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid #2a2a3a", fontSize: 12, lineHeight: 1.5 },
    panel: { background: "#111118", border: "1px solid #2a2a3a", borderRadius: 8, padding: 12 },
    label: { color: "#6b7080", fontSize: 10, letterSpacing: 1.2 },
    btn: (on) => ({ display: "block", width: "100%", textAlign: "left", padding: "7px 9px", marginTop: 6, borderRadius: 6, cursor: "pointer", border: `1px solid ${on ? ACCENT : "#4a4f60"}`, color: on ? "#ffd9a3" : "#8b90a0", background: on ? "rgba(255,153,0,0.08)" : "#0c0d13", fontFamily: mono, fontSize: 11 }),
    row: { display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 11, color: "#c8cdd8" },
    range: { width: "100%", accentColor: ACCENT, marginTop: 3, cursor: "pointer" },
    sub: { color: "#6b7080", fontSize: 9.5, marginTop: 1 },
  };

  return (
    <div style={S.root}>
      <div style={{ color: ACCENT, fontSize: 10, letterSpacing: 2 }}>AMAZON BUILDERS' LIBRARY · RETRIES, INTERACTIVE</div>
      <div style={{ color: "#edeff3", fontSize: 16, margin: "4px 0 2px", fontWeight: 700 }}>The selfish retry</div>
      <p style={{ color: "#8b90a0", fontSize: 11, margin: 0 }}>A fleet of {CLIENTS} clients calling one dependency. Overload it, then dial in backoff, jitter, and the retry budget, and watch the load respond.</p>
      <ContextBlock />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
        <div style={{ ...S.panel, flex: "1 1 250px", minWidth: 250 }}>
          <div style={S.label}>THE FAILURE</div>
          <button style={S.btn(brown)} onClick={() => setBrown(!brown)}>💥 OVERLOAD THE DEPENDENCY {brown ? "· ON" : "· OFF"}<div style={{ color: "#6b7080", fontSize: 10 }}>capacity halves, the case where retries hurt</div></button>

          <div style={{ ...S.label, marginTop: 14 }}>THE DEFENSES, DIAL EACH</div>
          <div style={{ marginTop: 8 }}>
            <div style={S.row}><span>Backoff cap</span><span style={{ color: backoffCap > 0.05 ? ACCENT : "#6b7080", fontWeight: 700 }}>{backoffCap < 0.05 ? "off" : backoffCap.toFixed(1) + "s"}</span></div>
            <input type="range" min={0} max={4} step={0.2} value={backoffCap} onChange={(e) => setBackoffCap(parseFloat(e.target.value))} style={S.range} />
            <div style={S.sub}>longest wait between retries</div>
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={S.row}><span>Jitter</span><span style={{ color: jitter > 0.05 ? ACCENT : "#6b7080", fontWeight: 700 }}>{jitter < 0.05 ? "off" : Math.round(jitter * 100) + "%"}</span></div>
            <input type="range" min={0} max={1} step={0.05} value={jitter} onChange={(e) => setJitter(parseFloat(e.target.value))} style={S.range} />
            <div style={S.sub}>randomness that breaks the lining-up</div>
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={S.row}><span>Retry budget</span><span style={{ color: budget >= 0.5 ? ACCENT : "#6b7080", fontWeight: 700 }}>{budget < 0.5 ? "off" : budget + " tokens"}</span></div>
            <input type="range" min={0} max={15} step={1} value={budget} onChange={(e) => setBudget(parseFloat(e.target.value))} style={S.range} />
            <div style={S.sub}>token bucket, AWS SDK default since 2016</div>
          </div>

          <button style={{ ...S.btn(false), marginTop: 14 }} onClick={reset}>↺ RESET · t = {W.t.toFixed(1)}s</button>
        </div>

        <div style={{ flex: "2 1 420px", minWidth: 300 }}>
          <div style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${verdict.c}`, background: `${verdict.c}14`, marginBottom: 12 }}>
            <div style={{ color: verdict.c, fontWeight: 700 }}>{verdict.code}</div>
            <div style={{ marginTop: 5, fontSize: 11.5, lineHeight: 1.6 }}>{verdict.t}</div>
          </div>
          <div style={S.panel}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <div style={{ flex: "1 1 130px", background: "#0c0d13", border: "1px solid #2a2a3a", borderRadius: 6, padding: "8px 10px" }}>
                <div style={S.label}>OFFERED LOAD</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: amp > 1.8 ? RED : amp > 1.2 ? AMBER : GREEN }}>×{amp.toFixed(2)}</div>
                <div style={{ fontSize: 9, color: "#6b7080" }}>of the fleet's real demand</div>
              </div>
              <div style={{ flex: "1 1 130px", background: "#0c0d13", border: "1px solid #2a2a3a", borderRadius: 6, padding: "8px 10px" }}>
                <div style={S.label}>FAILURE RATE</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: failNow > 0.3 ? RED : failNow > 0.05 ? AMBER : GREEN }}>{(failNow * 100).toFixed(0)}%</div>
              </div>
              {budget >= 0.5 && (
                <div style={{ flex: "1 1 130px", background: "#0c0d13", border: "1px solid #2a2a3a", borderRadius: 6, padding: "8px 10px" }}>
                  <div style={S.label}>RETRY TOKENS</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: W.tokens < 1 ? AMBER : GREEN }}>{W.tokens.toFixed(1)}</div>
                </div>
              )}
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 10, color: "#8b90a0", marginBottom: 4 }}>OFFERED LOAD vs CAPACITY, over time. Waves mean retries are lining up, a flat line means jitter is working.</div>
              <div style={{ position: "relative", height: 60, background: "#0c0d13", border: "1px solid #2a2a3a", borderRadius: 6, padding: "4px 6px", display: "flex", alignItems: "flex-end", gap: 1 }}>
                <div style={{ position: "absolute", left: 0, right: 0, bottom: `${(cap / maxLoad) * 100}%`, borderTop: `1px dashed ${RED}88`, fontSize: 8, color: RED, paddingLeft: 6 }}>capacity</div>
                {W.hist.map((h, i) => (
                  <div key={i} style={{ flex: 1, height: `${Math.min(100, (h.load / maxLoad) * 100)}%`, background: h.load > h.cap ? RED : ACCENT, borderRadius: 1, opacity: 0.9 }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ color: "#6b7080", fontSize: 10, marginTop: 12, borderTop: "1px solid #2a2a3a", paddingTop: 8, lineHeight: 1.7 }}>
        Fleet size, capacity, and retry parameters are illustrative. The mechanisms and doctrine are Amazon's. Retries add load to an overloaded dependency, so retry only when it looks healthy and stop when retries are not improving availability. Capped exponential backoff evens the load, but correlated backoff re-forms the spike. Jitter spreads retries out, and belongs on all timers, periodic jobs, and delayed work, chosen consistently per host so overload stays debuggable. The local token bucket (retry freely on tokens, a fixed rate when they run out) shipped as the AWS SDK default in 2016. And calls with side effects are unsafe to retry unless idempotent, as EC2 RunInstances is via client tokens, the same contract Stripe exposes as Idempotency-Key.
        {" "}<a href="https://behindscale.com/articles/aws-timeouts-retries-backoff-jitter" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: "none" }}>From the full dissection at behindscale.com →</a>
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
        <div style={{ fontSize: 10, color: "#6b7080", letterSpacing: 1.2 }}>CONTEXT, IF YOU ARRIVED HERE WITHOUT THE ARTICLE</div>
        <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontFamily: "inherit", fontSize: 10, padding: 0 }}>HIDE ✕</button>
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 8 }}><span style={lbl}>THE PROBLEM · </span>A retry improves one client's chances by spending the shared server's capacity. When failures are caused by overload, a whole fleet retrying multiplies the load at the worst possible moment, and plain backoff does not save you, because clients that failed together retry together.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>THE MOVE · </span>Amazon's approach: a timeout on every remote call chosen from real measured latency, retries only while the dependency looks healthy, capped exponential backoff plus jitter to break the lining-up, and a local token bucket that limits every client's extra load (the AWS SDK default since 2016).</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>TRY · </span>Overload the dependency with no defenses and watch the load multiply. Turn up backoff and see the synchronized waves. Turn up jitter and watch them spread out. Add a retry budget and watch the extra load get capped.</div>
    </div>
  );
}
