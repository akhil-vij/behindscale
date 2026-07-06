import { useState, useEffect, useRef } from "react";

function mulberry32(seed) { let a = seed >>> 0; return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const ACCENT = "#FF9900"; // AWS orange
const RED = "#ef4444"; const AMBER = "#eab308"; const GREEN = "#22c55e";
const DT = 0.15;
const CLIENTS = 60;            // client fleet (illustrative)
const CAPACITY = 90;           // dependency capacity, req/s
const BASE_RATE = 60;          // fleet offered load healthy, req/s

export default function SelfishRetry() {
  const [backoff, setBackoff] = useState(false);
  const [jitter, setJitter] = useState(false);
  const [budget, setBudget] = useState(false);
  const [brown, setBrown] = useState(false);   // dependency brownout: capacity halves
  const [, force] = useState(0);
  const w = useRef(null);
  const fresh = () => ({ t: 0, rng: mulberry32(42), pend: [], tokens: 10, load: 0, hist: [], recoveredAt: null, brownStart: null });
  if (!w.current) w.current = fresh();
  const reset = () => { w.current = fresh(); };

  useEffect(() => {
    const id = setInterval(() => {
      const W = w.current; W.t += DT;
      const cap = brown ? CAPACITY * 0.45 : CAPACITY;
      if (brown && W.brownStart === null) { W.brownStart = W.t; W.recoveredAt = null; }
      if (!brown) W.brownStart = null;
      // arrivals: fresh + due retries
      let offered = BASE_RATE * DT * (0.95 + W.rng() * 0.1);
      const due = W.pend.filter((r) => r.at <= W.t);
      W.pend = W.pend.filter((r) => r.at > W.t);
      const retryLoad = due.reduce((a, r) => a + r.n, 0);
      offered += retryLoad;
      W.load = offered / DT;
      // service: fail proportionally to overload
      const util = W.load / cap;
      const failFrac = util <= 1 ? 0.01 : Math.min(0.95, (util - 1) / util + 0.05);
      let failed = offered * failFrac;
      // retry policy: 80% of failures retry (up to 3 attempts folded into rate)
      let willRetry = failed * 0.8;
      if (budget) {
        W.tokens = Math.min(10, W.tokens + 0.5 * DT); // refill
        const allowed = Math.min(willRetry, W.tokens + 0.4 * DT); // bucket + trickle rate
        W.tokens = Math.max(0, W.tokens - allowed);
        willRetry = allowed;
      }
      if (willRetry > 0.001) {
        let delay;
        if (!backoff) delay = 0.3;
        else {
          const base = 1.6; // capped-exponential stand-in
          delay = jitter ? base * W.rng() : base; // full jitter vs correlated
        }
        if (jitter && backoff) {
          // spread across many small buckets
          for (let k = 0; k < 4; k++) W.pend.push({ at: W.t + delay * (0.25 + k * 0.25) + W.rng() * 0.3, n: willRetry / 4 });
        } else {
          W.pend.push({ at: W.t + delay, n: willRetry }); // one synchronized wave
        }
      }
      // recovery detection: after brownout toggled off, when load returns near base
      if (!brown && W.load < BASE_RATE * 1.15 && W.recoveredAt === null && W.hist.some((h) => h.load > BASE_RATE * 1.4)) W.recoveredAt = W.t;
      W.hist.push({ load: W.load, cap, fail: failFrac }); if (W.hist.length > 110) W.hist.shift();
      force((x) => x + 1);
    }, 150);
    return () => clearInterval(id);
  }, [backoff, jitter, budget, brown]);

  const W = w.current;
  const amp = W.load / BASE_RATE;
  const cap = brown ? CAPACITY * 0.45 : CAPACITY;
  const failNow = W.hist.length ? W.hist[W.hist.length - 1].fail : 0;
  const maxLoad = Math.max(CAPACITY * 1.4, ...W.hist.map((h) => h.load));

  const verdict = (() => {
    if (!brown && amp < 1.3) return { c: GREEN, code: "HEALTHY — RETRIES ARE FREE HERE", t: "Transient faults (1%) get masked by retries at negligible cost. Every tool below is idle. The doctrine's tension only appears under overload — which is exactly when retries stop being free." };
    if (brown) {
      if (!backoff) return { c: RED, code: `RETRY STORM — LOAD ×${amp.toFixed(1)}`, t: "The dependency browned out and every failed call comes straight back. Each retry is selfish — it spends the server's scarce capacity to improve one client's odds — so offered load multiplies exactly when capacity halved. The failure rate feeds the retry rate feeds the failure rate: this can outlive the original cause." };
      if (!jitter) return { c: AMBER, code: "BACKOFF WITHOUT JITTER — SYNCHRONIZED WAVES", t: "Backoff spaces retries out, but clients that failed together back off together and return together. Watch the load trace: spikes at the backoff interval, contention re-forming on every wave. Correlation is the failure mode backoff alone cannot fix." };
      if (!budget) return { c: AMBER, code: "JITTERED — SPREAD, BUT UNBOUNDED", t: "Jitter dissolves the waves into an even trickle and the dependency breathes between retries. But the amplification is still only bounded by luck: a longer or deeper outage grows the retry population without limit. The last tool is arithmetic, not randomness." };
      return { c: GREEN, code: "TOKEN BUCKET — AMPLIFICATION CAPPED", t: `Retries spend a local budget: free while tokens last, a fixed trickle once exhausted. Offered load is pinned near ×${amp.toFixed(1)} no matter how long the brownout lasts — the SDK default since 2016, making the safe behavior the ambient one. Now heal the dependency and watch recovery.` };
    }
    return { c: amp > 1.3 ? AMBER : GREEN, code: amp > 1.3 ? "DRAINING THE RETRY BACKLOG" : "RECOVERED", t: amp > 1.3 ? "The dependency is healthy again but queued retries are still arriving. How fast this drains is the policy's real test — storms outlive their causes." : "Load back to baseline. Compare how long that took across policies — the storm's tail is where the damage compounds." };
  })();

  const mono = "'JetBrains Mono','Fira Code','SF Mono',ui-monospace,monospace";
  const S = {
    root: { background: "#08090D", color: "#c8cdd8", fontFamily: mono, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid #2a2a3a", fontSize: 12, lineHeight: 1.5 },
    panel: { background: "#111118", border: "1px solid #2a2a3a", borderRadius: 8, padding: 12 },
    label: { color: "#6b7080", fontSize: 10, letterSpacing: 1.2 },
    btn: (on) => ({ display: "block", width: "100%", textAlign: "left", padding: "7px 9px", marginTop: 6, borderRadius: 6, cursor: "pointer", border: `1px solid ${on ? ACCENT : "#2a2a3a"}`, color: on ? "#ffd9a3" : "#8b90a0", background: on ? "rgba(255,153,0,0.08)" : "#0c0d13", fontFamily: mono, fontSize: 11 }),
  };

  return (
    <div style={S.root}>
      <div style={{ color: ACCENT, fontSize: 10, letterSpacing: 2 }}>AMAZON BUILDERS' LIBRARY · RETRIES — INTERACTIVE</div>
      <div style={{ color: "#edeff3", fontSize: 16, margin: "4px 0 2px", fontWeight: 700 }}>The selfish retry</div>
      <p style={{ color: "#8b90a0", fontSize: 11, margin: 0 }}>A fleet of {CLIENTS} clients, one dependency. Brown it out, then earn your way back: backoff, then jitter, then the budget.</p>
      <ContextBlock />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
        <div style={{ ...S.panel, flex: "1 1 230px", minWidth: 230 }}>
          <div style={S.label}>THE FAILURE</div>
          <button style={S.btn(brown)} onClick={() => { setBrown(!brown); }}>💥 BROWNOUT — CAPACITY HALVES {brown ? "· ON" : "· OFF"}<div style={{ color: "#6b7080", fontSize: 10 }}>failures caused by load — the case where retries hurt</div></button>
          <div style={{ ...S.label, marginTop: 12 }}>THE DOCTRINE — ADD ONE AT A TIME</div>
          <button style={S.btn(backoff)} onClick={() => setBackoff(!backoff)}>1 · CAPPED EXPONENTIAL BACKOFF {backoff ? "✓" : ""}</button>
          <button style={S.btn(jitter)} onClick={() => setJitter(!jitter)}>2 · JITTER {jitter ? "✓" : ""}<div style={{ color: "#6b7080", fontSize: 10 }}>randomness breaks the correlation</div></button>
          <button style={S.btn(budget)} onClick={() => setBudget(!budget)}>3 · RETRY TOKEN BUCKET {budget ? "✓" : ""}<div style={{ color: "#6b7080", fontSize: 10 }}>AWS SDK default since 2016</div></button>
          <button style={{ ...S.btn(false), marginTop: 12 }} onClick={reset}>↺ RESET · t = {W.t.toFixed(1)}s</button>
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
              {budget && (
                <div style={{ flex: "1 1 130px", background: "#0c0d13", border: "1px solid #2a2a3a", borderRadius: 6, padding: "8px 10px" }}>
                  <div style={S.label}>RETRY TOKENS</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: W.tokens < 1 ? AMBER : GREEN }}>{W.tokens.toFixed(1)}</div>
                </div>
              )}
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 10, color: "#8b90a0", marginBottom: 4 }}>OFFERED LOAD vs CAPACITY — waves mean correlation; a flat line means jitter is working</div>
              <div style={{ position: "relative", height: 56, background: "#0c0d13", border: "1px solid #2a2a3a", borderRadius: 6, padding: "4px 6px", display: "flex", alignItems: "flex-end", gap: 1 }}>
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
        Fleet size, capacity, and retry parameters are illustrative; the mechanisms and doctrine are the article's: retries amplify load on an overloaded dependency (retry only when it looks healthy, stop when retries are not improving availability); capped exponential backoff evens load but correlated backoff re-forms the spike; jitter spreads retries — and belongs on all timers, periodic jobs, and delayed work, chosen consistently per host so overload stays debuggable; the local token bucket (retry freely on tokens, fixed rate when exhausted) shipped as AWS SDK default behavior in 2016; and side-effecting APIs are unsafe to retry unless idempotent, as EC2 RunInstances is via client tokens — the same contract Stripe exposes as Idempotency-Key.
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
        <div style={{ fontSize: 10, color: "#6b7080", letterSpacing: 1.2 }}>CONTEXT — IF YOU ARRIVED HERE WITHOUT THE ARTICLE</div>
        <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontFamily: "inherit", fontSize: 10, padding: 0 }}>HIDE ✕</button>
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 8 }}><span style={lbl}>THE PROBLEM · </span>A retry spends the server's capacity to improve one client's odds — selfish by construction. When failures are caused by overload, a retrying fleet multiplies load at the worst possible moment, and plain backoff doesn't save you: clients that failed together retry together.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>THE MOVE · </span>Amazon's doctrine: timeouts on every remote call chosen from measured latency; retries only while the dependency looks healthy; capped exponential backoff plus jitter to break correlation; and a local token bucket bounding every client's amplification — AWS SDK default since 2016.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>TRY · </span>Brown out the dependency with no defenses and watch load multiply. Add backoff and see the synchronized waves; add jitter and watch them dissolve; add the token bucket and watch amplification get capped by arithmetic.</div>
    </div>
  );
}
