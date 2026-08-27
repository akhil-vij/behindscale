import { useState } from "react";

const ACCENT = "#FF9900";
const RED = "#ef4444"; const AMBER = "#eab308"; const GREEN = "#22c55e";
const N = 8;
// deterministic 2-of-8 assignments; customer 0 (rainbow) = W1+W4, customer 7 (rose) = W1+W8 (sourced)
const SHUFFLE = [[0,3],[1,5],[2,6],[3,7],[4,1],[5,2],[6,4],[0,7]];
const FIXED = (c) => [Math.floor(c/2)*2, Math.floor(c/2)*2+1];

export default function OneTwentyEighth() {
  const [mode, setMode] = useState("shared"); // shared | fixed | shuffle
  const [poison, setPoison] = useState(null); // customer index or null
  const [retries, setRetries] = useState(true);

  const workersOf = (c) => mode === "shared" ? [...Array(N).keys()] : mode === "fixed" ? FIXED(c) : SHUFFLE[c];
  const deadWorkers = poison === null ? new Set() : new Set(workersOf(poison));
  const custState = (c) => {
    if (poison === null) return "ok";
    const w = workersOf(c); const hit = w.filter(x => deadWorkers.has(x)).length;
    if (hit === w.length) return "down";
    if (hit > 0) return retries ? "riding" : "degraded";
    return "ok";
  };
  const downCount = [...Array(N).keys()].filter(c => custState(c) === "down").length;
  const scope = mode === "shared" ? "100% - the whole service" : mode === "fixed" ? "25% - everyone in the group, fully down" : "about 1/28th of customers: 28 possible pairs from 8 machines";

  const verdict = poison === null
    ? { c: AMBER, code: mode === "shared" ? "ALL SHARED: ANY MACHINE SERVES ANYONE" : mode === "fixed" ? "FOUR FIXED GROUPS OF TWO" : "SHUFFLE SHARDING: EVERY CUSTOMER GETS ITS OWN PAIR", t: mode === "shared" ? "Efficient, but every customer shares all eight machines. If one machine dies, the other seven absorb the work. Now click a customer to send bad traffic, and watch where it goes." : mode === "fixed" ? "A bad customer can now take down only their own group, a quarter of the service. But for the other customers in that group, the outage is total." : "Rainbow holds machines 1 and 4; rose holds 1 and 8. Their pairs overlap on machine 1, and that overlap is the point, not a flaw. Send bad traffic from one and count who else falls." }
    : mode === "shared"
    ? { c: RED, code: "THE WHOLE SERVICE IS DOWN", t: "The load balancer spreads the bad traffic across every machine, so the problem reaches all of them. Every customer is down because of one customer. Adding machines just gives the failure more places to reach." }
    : mode === "fixed"
    ? { c: RED, code: "ONE GROUP DOWN: 25% OF THE SERVICE, 100% FOR EVERYONE IN IT", t: "Much better than everything down, and the customers sharing that group are fully out. The only way to shrink it is more or smaller groups, which costs dedicated machines, exactly what sharing machines was meant to avoid." }
    : downCount <= 1
    ? { c: retries ? GREEN : AMBER, code: retries ? "DAMAGE HELD TO THE BAD CUSTOMER'S OWN PAIR" : "RESENDS OFF: THE HIDDEN HALF OF THE PROTECTION", t: retries ? "The bad customer loses its own pair, so a quarter of raw capacity is degraded. But every other customer shares at most ONE machine with it, and their resends route around the loss. Full service from fully shared machines: 28 pairs, about 1/28th reach, same eight machines. At Route 53's scale (4 of 2,048) it is 730 billion combinations." : "The overlapping customers just lost half their pair, and without software that resends failed requests, they feel it. Part of the protection was really coming from the customer's own side: shuffle sharding removes half the capacity, the resend hides that half." }
    : { c: AMBER, code: "PARTIAL OVERLAPS", t: "Only the bad customer's own pair is fully down; the overlapping customers are degraded on one machine each." };

  const mono = "'JetBrains Mono','Fira Code',ui-monospace,monospace";
  const S = {
    root: { background: "#08090D", color: "#c8cdd8", fontFamily: mono, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid #2a2a3a", fontSize: 12, lineHeight: 1.5 },
    label: { color: "#6b7080", fontSize: 10, letterSpacing: 1.2 },
    btn: (on) => ({ padding: "7px 10px", borderRadius: 6, cursor: "pointer", border: `1px solid ${on ? ACCENT : "#4a4f60"}`, color: on ? "#ffd9a8" : "#8b90a0", background: on ? "rgba(255,153,0,0.10)" : "#0c0d13", fontFamily: mono, fontSize: 11, marginRight: 6, marginTop: 6 }),
  };
  const custColor = { ok: GREEN, riding: ACCENT, degraded: AMBER, down: RED };
  const custLabel = { ok: "OK", riding: "RESENDING·OK", degraded: "DEGRADED", down: "DOWN" };

  return (
    <div style={S.root}>
      <div style={{ color: ACCENT, fontSize: 10, letterSpacing: 2 }}>AWS · SHUFFLE SHARDING - INTERACTIVE</div>
      <div style={{ color: "#edeff3", fontSize: 16, margin: "4px 0 2px", fontWeight: 700 }}>One twenty-eighth</div>
      <p style={{ color: "#8b90a0", fontSize: 11, margin: 0 }}>The same eight machines and the same one bad customer, three ways of assigning customers to machines. Watch how much of the service goes down each way.</p>
      <ContextBlock />

      <div style={{ marginTop: 12 }}>
        <span style={S.label}>SCHEME · </span>
        <button style={S.btn(mode === "shared")} onClick={() => { setMode("shared"); setPoison(null); }}>SHARED FLEET</button>
        <button style={S.btn(mode === "fixed")} onClick={() => { setMode("fixed"); setPoison(null); }}>4 FIXED GROUPS</button>
        <button style={S.btn(mode === "shuffle")} onClick={() => { setMode("shuffle"); setPoison(null); }}>SHUFFLE SHARDING (2 of 8)</button>
        {mode === "shuffle" && <button style={S.btn(retries)} onClick={() => setRetries(!retries)}>AUTO-RESEND: {retries ? "ON" : "OFF"}</button>}
      </div>

      <div style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${verdict.c}`, background: `${verdict.c}14`, marginTop: 12 }}>
        <div style={{ color: verdict.c, fontWeight: 700 }}>{verdict.code}</div>
        <div style={{ marginTop: 5, fontSize: 11.5, lineHeight: 1.6 }}>{verdict.t}</div>
      </div>

      <div style={{ background: "#111118", border: "1px solid #2a2a3a", borderRadius: 8, padding: 12, marginTop: 12 }}>
        <div style={S.label}>MACHINES</div>
        <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
          {[...Array(N).keys()].map(w => (
            <div key={w} style={{ width: 42, height: 34, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, transition: "background 0.3s ease, border-color 0.3s ease, color 0.3s ease", transitionDelay: (mode === "shared" && deadWorkers.has(w)) ? `${w * 130}ms` : "0ms", background: deadWorkers.has(w) ? "rgba(239,68,68,0.18)" : "#0c0d13", border: `1px solid ${deadWorkers.has(w) ? RED : "#2a2f45"}`, color: deadWorkers.has(w) ? RED : "#8b90a0" }}>M{w + 1}</div>
          ))}
        </div>
        {mode === "shared" && poison !== null && <div style={{ fontSize: 10, color: RED, marginTop: 6 }}>the failure spreads from machine to machine until the whole service is down</div>}
        <div style={{ ...S.label, marginTop: 12 }}>CUSTOMERS - CLICK ONE TO SEND BAD TRAFFIC {poison !== null && <button style={{ ...S.btn(false), padding: "2px 8px", fontSize: 9 }} onClick={() => setPoison(null)}>CURE</button>}</div>
        <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
          {[...Array(N).keys()].map(c => {
            const st = custState(c); const names = ["🌈 rainbow","C2","C3","C4","C5","C6","C7","🌹 rose"];
            return (
              <button key={c} onClick={() => setPoison(c)} style={{ minWidth: 92, padding: "7px 8px", borderRadius: 6, cursor: "pointer", textAlign: "left", fontFamily: mono, fontSize: 10, background: poison === c ? "rgba(239,68,68,0.14)" : "#0c0d13", border: `1px solid ${poison === c ? RED : custColor[st] + "55"}`, color: "#c8cdd8" }}>
                <div style={{ fontWeight: 700 }}>{names[c]}{poison === c ? " ☠" : ""}</div>
                <div style={{ color: "#6b7080" }}>M{workersOf(c).map(x => x + 1).join("+M")}</div>
                <div style={{ color: custColor[st], fontWeight: 700 }}>{poison === null ? "OK" : custLabel[st]}</div>
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: 10, fontSize: 11, color: "#8b90a0" }}>SCOPE OF IMPACT THIS SCHEME: <span style={{ color: poison ? verdict.c : "#c8cdd8", fontWeight: 700 }}>{scope}</span> · customers fully down: <b style={{ color: downCount ? RED : GREEN }}>{poison === null ? 0 : downCount}/8</b></div>
      </div>

      <div style={{ color: "#6b7080", fontSize: 10, marginTop: 12, borderTop: "1px solid #2a2a3a", paddingTop: 8, lineHeight: 1.7 }}>
        Assignments and the worked example are the post's (rainbow = machines 1+4, rose = machines 1+8; eight machines; pairs of two; 28 combinations → about 1/28th reach, seven times better than fixed groups; at most one shared machine between pairs, so a customer whose software resends keeps working). Route 53 scale, sourced: 2,048 machines, sets of four per domain, 730 billion combinations, no two domains sharing more than two servers, targeted flood traffic (a DDoS attack) isolated onto dedicated attack capacity alongside AWS's Shield traffic scrubbers. The scheme usually comes at no additional cost - a rearrangement of existing resources.
        {" "}<a href="https://behindscale.com/articles/aws-shuffle-sharding" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: "none" }}>From the full dissection at behindscale.com →</a>
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
        <div style={{ fontSize: 10, color: "#6b7080", letterSpacing: 1.2 }}>CONTEXT - IF YOU ARRIVED HERE WITHOUT THE ARTICLE</div>
        <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontFamily: "inherit", fontSize: 10, padding: 0 }}>HIDE ✕</button>
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 8 }}><span style={lbl}>THE PROBLEM · </span>When all machines are shared and any machine serves any request, one customer's bad request or flood reaches every machine, so the whole service goes down. Four fixed groups cap that at 25%, but that's a total outage for everyone in the hit group, and shrinking it further costs dedicated machines.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>THE MOVE · </span>Shuffle sharding: give each customer a random pair of machines. 28 pairs from eight machines means one problem reaches about 1/28th of customers, and since any two pairs share at most one machine, a customer whose software resends keeps working. Route 53 runs it at 4 of 2,048: 730 billion combinations.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>TRY · </span>Send bad traffic from the rainbow customer under each scheme and count who else goes down. Then switch off the customers' auto-resend and see how much of the protection was really coming from their side.</div>
    </div>
  );
}
