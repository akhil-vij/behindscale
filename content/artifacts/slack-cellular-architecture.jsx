import { useState, useEffect, useRef } from "react";

function mulberry32(seed) { let a = seed >>> 0; return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const ACCENT = "#ECB22E"; // Slack gold
const RED = "#ef4444"; const AMBER = "#eab308"; const GREEN = "#22c55e";
const AZS = ["az-1", "az-2", "az-3"];
const FANOUT = 12; // RPCs per request (stands in for "hundreds")

export default function DrainButton() {
  const [siloed, setSiloed] = useState(false);
  const [gray, setGray] = useState(false);       // gray failure in az-2
  const [weights, setWeights] = useState([33, 34, 33]); // traffic weight per AZ
  const [, force] = useState(0);
  const w = useRef({ t: 0, rng: mulberry32(42), errH: [[], [], []], okH: [[], [], []], hist: [] });

  useEffect(() => {
    const id = setInterval(() => {
      const W = w.current; W.t += 0.2;
      const tot = weights[0] + weights[1] + weights[2] || 1;
      const errNow = [0, 0, 0]; const okNow = [0, 0, 0];
      for (let az = 0; az < 3; az++) {
        const reqs = 30 * (weights[az] / tot) * 0.2;
        if (reqs <= 0) continue;
        // per request: fan out to FANOUT backends
        let failP;
        if (!gray) failP = 0.002;
        else if (siloed) failP = az === 1 ? 0.7 : 0.002; // failure contained to az-2's own users
        else {
          // cross-AZ fanout: every request from every AZ touches az-2 backends
          const touchesBad = 1 - Math.pow(1 - FANOUT / (3 * FANOUT), FANOUT); // ~any of its RPCs lands in az-2
          failP = 0.55 * touchesBad + 0.002;
        }
        const failed = reqs * Math.min(1, failP * (0.9 + W.rng() * 0.2));
        errNow[az] += failed; okNow[az] += reqs - failed;
      }
      for (let i = 0; i < 3; i++) {
        W.errH[i].push(errNow[i]); W.okH[i].push(okNow[i]);
        if (W.errH[i].length > 12) { W.errH[i].shift(); W.okH[i].shift(); }
      }
      W.hist.push(weights.slice()); if (W.hist.length > 90) W.hist.shift();
      force((x) => x + 1);
    }, 200);
    return () => clearInterval(id);
  }, [siloed, gray, weights]);

  const W = w.current;
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const errRate = (az) => { const e = sum(W.errH[az]), t = e + sum(W.okH[az]); return t > 0.01 ? (e / t) * 100 : 0; };
  const globalErr = (() => { const e = sum(W.errH[0]) + sum(W.errH[1]) + sum(W.errH[2]); const t = e + sum(W.okH[0]) + sum(W.okH[1]) + sum(W.okH[2]); return t > 0.01 ? (e / t) * 100 : 0; })();
  const setAz2 = (v) => setWeights([w2fill(v)[0], v, w2fill(v)[1]]);
  const w2fill = (v) => { const rest = 100 - v; return [Math.round(rest / 2), rest - Math.round(rest / 2)]; };
  const drained = weights[1] === 0;

  const verdict = (() => {
    if (!gray) return { c: GREEN, code: "HEALTHY", t: siloed ? "Cells quiet: every service present in every AZ, no service talking across an AZ boundary. Prioritization of failure domains costs nothing until something fails." : "Cross-AZ topology healthy. Each request's dozen RPCs (standing in for hundreds) spray across all three AZs — invisible now, load-bearing later." };
    if (!siloed) return { c: RED, code: "GRAY FAILURE — VISIBLE EVERYWHERE", t: `az-2's network link is flapping, and because backends are spread across AZs, nearly every request from every AZ fans out into it. Global error rate ${globalErr.toFixed(0)}% — and there is no drain that helps: traffic entering az-1 still calls into az-2. This is June 30, 2021.` };
    if (drained) return { c: GREEN, code: "DRAINED — MITIGATED WITHOUT DIAGNOSIS", t: "az-2 still has a flapping link — nobody has fixed anything — and users can't tell. New requests route to az-1/az-3, in-flight requests completed gracefully, and the sick cell quiesces on its own. Undrain at 1% when you want to test recovery." };
    if (weights[1] <= 5) return { c: AMBER, code: `TESTING RECOVERY AT ${weights[1]}%`, t: `A ${weights[1]}% weight sends a trickle into az-2 to ask whether it has truly recovered — the incremental undrain the design goals demanded. It hasn't: that trickle is failing. Back to zero.` };
    return { c: AMBER, code: "CONTAINED — NOW HIT THE BUTTON", t: `Siloing contains the failure: only az-2's own ${weights[1]}% of traffic sees errors (error rate ${errRate(1).toFixed(0)}% there, ~0% elsewhere). The blast radius is a cell — which means draining works. Step az-2's weight down and watch the knee.` };
  })();

  const mono = "'JetBrains Mono','Fira Code','SF Mono',ui-monospace,monospace";
  const S = {
    root: { background: "#08090D", color: "#c8cdd8", fontFamily: mono, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid #2a2a3a", fontSize: 12, lineHeight: 1.5 },
    panel: { background: "#111118", border: "1px solid #2a2a3a", borderRadius: 8, padding: 12 },
    label: { color: "#6b7080", fontSize: 10, letterSpacing: 1.2 },
    btn: (on, dis) => ({ display: "inline-block", padding: "6px 10px", marginTop: 6, marginRight: 6, borderRadius: 6, cursor: dis ? "not-allowed" : "pointer", opacity: dis ? 0.4 : 1, border: `1px solid ${on ? ACCENT : "#2a2a3a"}`, color: on ? "#ffe3a3" : "#8b90a0", background: on ? "rgba(236,178,46,0.10)" : "#0c0d13", fontFamily: mono, fontSize: 11 }),
  };

  return (
    <div style={S.root}>
      <div style={{ color: ACCENT, fontSize: 10, letterSpacing: 2 }}>SLACK · CELLULAR ARCHITECTURE — INTERACTIVE</div>
      <div style={{ color: "#edeff3", fontSize: 16, margin: "4px 0 2px", fontWeight: 700 }}>The drain button</div>
      <p style={{ color: "#8b90a0", fontSize: 11, margin: 0 }}>Reproduce June 30, 2021 in both topologies — then use the button Slack spent 1.5 years earning the right to build.</p>
      <ContextBlock />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
        <div style={{ ...S.panel, flex: "1 1 230px", minWidth: 230 }}>
          <div style={S.label}>TOPOLOGY</div>
          <button style={S.btn(!siloed, false)} onClick={() => setSiloed(false)}>CROSS-AZ (original)</button>
          <button style={S.btn(siloed, false)} onClick={() => setSiloed(true)}>SILOED (cells)</button>
          <div style={{ ...S.label, marginTop: 12 }}>FAILURE</div>
          <button style={S.btn(gray, false)} onClick={() => setGray(!gray)}>💥 GRAY FAILURE IN az-2 {gray ? "· ON" : "· OFF"}<div style={{ color: "#6b7080", fontSize: 10 }}>intermittent link faults — different components see different truths</div></button>
          <div style={{ ...S.label, marginTop: 12 }}>THE DRAIN BUTTON — az-2 WEIGHT {siloed ? "" : "(useless without cells)"}</div>
          {[34, 10, 5, 1, 0].map((v) => (
            <button key={v} style={S.btn(weights[1] === v, false)} onClick={() => setAz2(v)}>{v}%</button>
          ))}
          <div style={{ fontSize: 9.5, color: "#6b7080", marginTop: 8, lineHeight: 1.7 }}>
            DESIGN GOALS (sourced): drain in &lt;5 min · no errors caused by draining · 1% increments · nothing needed inside the drained AZ
          </div>
        </div>

        <div style={{ flex: "2 1 420px", minWidth: 300 }}>
          <div style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${verdict.c}`, background: `${verdict.c}14`, marginBottom: 12 }}>
            <div style={{ color: verdict.c, fontWeight: 700 }}>{verdict.code}</div>
            <div style={{ marginTop: 5, fontSize: 11.5, lineHeight: 1.6 }}>{verdict.t}</div>
          </div>
          <div style={S.panel}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {AZS.map((az, i) => (
                <div key={az} style={{ flex: "1 1 120px", background: "#0c0d13", border: `1px solid ${gray && i === 1 ? RED : "#2a2a3a"}`, borderRadius: 6, padding: "8px 10px" }}>
                  <div style={{ fontSize: 9, letterSpacing: 1.5, color: gray && i === 1 ? RED : "#6b7080" }}>{az.toUpperCase()} {gray && i === 1 ? "· LINK FLAPPING" : ""}</div>
                  <div style={{ fontSize: 10, color: "#8b90a0", marginTop: 4 }}>weight {weights[i]}%</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: errRate(i) > 20 ? RED : errRate(i) > 2 ? AMBER : GREEN }}>ERR {errRate(i).toFixed(0)}%</div>
                  <div style={{ fontSize: 9, color: "#6b7080", marginTop: 2 }}>{siloed ? "talks only to " + az : "fans out to all AZs"}</div>
                </div>
              ))}
              <div style={{ flex: "1 1 120px", background: "#0c0d13", border: `1px solid ${globalErr > 10 ? RED : "#2a2a3a"}`, borderRadius: 6, padding: "8px 10px" }}>
                <div style={{ fontSize: 9, letterSpacing: 1.5, color: "#6b7080" }}>GLOBAL</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: globalErr > 10 ? RED : globalErr > 1 ? AMBER : GREEN, marginTop: 16 }}>ERR {globalErr.toFixed(1)}%</div>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 10, color: "#8b90a0", marginBottom: 4 }}>QUERIES PER SECOND, BY AZ — the sourced graph's knees, live</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 1, height: 44, background: "#0c0d13", border: "1px solid #2a2a3a", borderRadius: 6, padding: "4px 6px" }}>
                {W.hist.map((h, i) => {
                  const t = h[0] + h[1] + h[2] || 1;
                  return (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column-reverse", height: "100%" }}>
                      <div style={{ height: `${(h[0] / t) * 100}%`, background: "#3d3d55" }} />
                      <div style={{ height: `${(h[1] / t) * 100}%`, background: ACCENT }} />
                      <div style={{ height: `${(h[2] / t) * 100}%`, background: "#23233a" }} />
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: 9, color: "#6b7080", marginTop: 3 }}>■ az-2 in gold — step the weight and watch how sharp the knee is (seconds of propagation, per the post)</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ color: "#6b7080", fontSize: 10, marginTop: 12, borderTop: "1px solid #2a2a3a", paddingTop: 8, lineHeight: 1.7 }}>
        Three AZs and a 12-RPC fan-out stand in for the real topology (a single request fans into hundreds of RPCs); error probabilities are illustrative. The mechanisms are the post's: the 2021-06-30 gray failure where components held different views of availability; siloing so each service talks only within its AZ, making the AZ a drainable cell; drains via Envoy weighted clusters reweighted through Rotor (the in-house xDS control plane) with seconds-scale propagation, 1% granularity, graceful in-flight handling, and no dependence on the drained AZ; and the four design goals against a 99.99% SLA. Strongly consistent stores (Vitess single-primary writes) are why not everything silos — the series' next post's subject.
        {" "}<a href="https://behindscale.com/articles/slack-cellular-architecture" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: "none" }}>From the full dissection at behindscale.com →</a>
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
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 8 }}><span style={lbl}>THE PROBLEM · </span>On June 30, 2021, a flapping network link in one AWS availability zone degraded Slack for everyone. Gray failure defeated automatic detection: components held different views of what was up, requests fanned into hundreds of RPCs that all had to succeed, and single-primary writes pinned shards to unreachable boxes.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>THE MOVE · </span>Make the AZ a cell: every service in every AZ, no service talking across AZ boundaries — so a failure is contained to one cell, and a human can drain it with a button: Envoy weighted clusters, seconds of propagation, 1% increments, nothing required inside the sick AZ.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>TRY · </span>Inject the gray failure into the cross-AZ topology and watch errors surface everywhere with no drain that helps. Switch to cells, inject it again — then drain az-2 to zero, and undrain at 1% to test recovery.</div>
    </div>
  );
}
