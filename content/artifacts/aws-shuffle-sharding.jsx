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
  const scope = mode === "shared" ? "100% — the whole service" : mode === "fixed" ? "25% — everyone on the shard, fully down" : "1/28th of customers in expectation — 28 unique 2-of-8 combinations";

  const verdict = poison === null
    ? { c: AMBER, code: mode === "shared" ? "ONE FLEET, ANY WORKER SERVES ANYONE" : mode === "fixed" ? "FOUR FIXED SHARDS OF TWO" : "SHUFFLE SHARDS — EVERY CUSTOMER GETS A COMBINATION", t: mode === "shared" ? "Maximally efficient, maximally shared-fate: a worker dies and seven absorb the work. Now poison a customer and watch where their traffic goes." : mode === "fixed" ? "A poisonous customer can now take down only their own shard — a quarter of the service. But for their shard-mates, that outage is total." : "Rainbow holds workers 1+4; rose holds 1+8. Their shards overlap — that's the design, not the defect. Poison one and count who else falls." }
    : mode === "shared"
    ? { c: RED, code: "SCOPE OF IMPACT: EVERYTHING", t: "The load balancer sprays the poison across the fleet; the problem visits every worker in turn. Every customer is down from one customer's traffic. Adding workers adds reach, not containment." }
    : mode === "fixed"
    ? { c: RED, code: "SHARD DOWN — 25% OF THE SERVICE, 100% FOR ITS TENANTS", t: "Much better than everything — and the customers sharing that shard are fully out. The only lever is more/thinner shards: isolation priced in dedicated capacity, which multi-tenant economics exist to avoid." }
    : downCount <= 1
    ? { c: retries ? GREEN : AMBER, code: retries ? "BLAST RADIUS: THE POISONED SHARD, AND ONLY IT" : "RETRIES OFF — THE HIDDEN HALF OF THE GUARANTEE", t: retries ? "The poisoned customer loses their combination — a quarter of raw capacity is degraded — but every other customer shares at most ONE worker with it, and their retries route around the loss. Uninterrupted service from a fully shared fleet: 28 combinations, 1/28th scope, same eight machines. With Route 53's numbers — 4 of 2,048 — it's 730 billion combinations." : "Overlapping customers just lost half their shard, and without fault-tolerant clients they feel it. The uninterrupted-service claim lives partly in the caller: shuffle sharding halves the failure, the retry hides the half." }
    : { c: AMBER, code: "PARTIAL OVERLAPS VISIBLE", t: "Count the states: only the poisoned shard is fully down; overlapped customers are degraded on one worker each." };

  const mono = "'JetBrains Mono','Fira Code',ui-monospace,monospace";
  const S = {
    root: { background: "#08090D", color: "#c8cdd8", fontFamily: mono, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid #2a2a3a", fontSize: 12, lineHeight: 1.5 },
    label: { color: "#6b7080", fontSize: 10, letterSpacing: 1.2 },
    btn: (on) => ({ padding: "7px 10px", borderRadius: 6, cursor: "pointer", border: `1px solid ${on ? ACCENT : "#2a2a3a"}`, color: on ? "#ffd9a8" : "#8b90a0", background: on ? "rgba(255,153,0,0.10)" : "#0c0d13", fontFamily: mono, fontSize: 11, marginRight: 6, marginTop: 6 }),
  };
  const custColor = { ok: GREEN, riding: ACCENT, degraded: AMBER, down: RED };
  const custLabel = { ok: "OK", riding: "RETRYING·OK", degraded: "DEGRADED", down: "DOWN" };

  return (
    <div style={S.root}>
      <div style={{ color: ACCENT, fontSize: 10, letterSpacing: 2 }}>AWS · SHUFFLE SHARDING — INTERACTIVE</div>
      <div style={{ color: "#edeff3", fontSize: 16, margin: "4px 0 2px", fontWeight: 700 }}>One twenty-eighth</div>
      <p style={{ color: "#8b90a0", fontSize: 11, margin: 0 }}>Same eight workers, same poison — three assignment schemes. Blast radius is the only thing that changes.</p>
      <ContextBlock />

      <div style={{ marginTop: 12 }}>
        <span style={S.label}>SCHEME · </span>
        <button style={S.btn(mode === "shared")} onClick={() => { setMode("shared"); setPoison(null); }}>SHARED FLEET</button>
        <button style={S.btn(mode === "fixed")} onClick={() => { setMode("fixed"); setPoison(null); }}>4 FIXED SHARDS</button>
        <button style={S.btn(mode === "shuffle")} onClick={() => { setMode("shuffle"); setPoison(null); }}>SHUFFLE SHARDS (2-of-8)</button>
        {mode === "shuffle" && <button style={S.btn(retries)} onClick={() => setRetries(!retries)}>CLIENT RETRIES: {retries ? "ON" : "OFF"}</button>}
      </div>

      <div style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${verdict.c}`, background: `${verdict.c}14`, marginTop: 12 }}>
        <div style={{ color: verdict.c, fontWeight: 700 }}>{verdict.code}</div>
        <div style={{ marginTop: 5, fontSize: 11.5, lineHeight: 1.6 }}>{verdict.t}</div>
      </div>

      <div style={{ background: "#111118", border: "1px solid #2a2a3a", borderRadius: 8, padding: 12, marginTop: 12 }}>
        <div style={S.label}>WORKERS</div>
        <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
          {[...Array(N).keys()].map(w => (
            <div key={w} style={{ width: 42, height: 34, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, background: deadWorkers.has(w) ? "rgba(239,68,68,0.18)" : "#0c0d13", border: `1px solid ${deadWorkers.has(w) ? RED : "#2a2f45"}`, color: deadWorkers.has(w) ? RED : "#8b90a0" }}>W{w + 1}</div>
          ))}
        </div>
        <div style={{ ...S.label, marginTop: 12 }}>CUSTOMERS — CLICK ONE TO POISON IT {poison !== null && <button style={{ ...S.btn(false), padding: "2px 8px", fontSize: 9 }} onClick={() => setPoison(null)}>CURE</button>}</div>
        <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
          {[...Array(N).keys()].map(c => {
            const st = custState(c); const names = ["🌈 rainbow","C2","C3","C4","C5","C6","C7","🌹 rose"];
            return (
              <button key={c} onClick={() => setPoison(c)} style={{ minWidth: 92, padding: "7px 8px", borderRadius: 6, cursor: "pointer", textAlign: "left", fontFamily: mono, fontSize: 10, background: poison === c ? "rgba(239,68,68,0.14)" : "#0c0d13", border: `1px solid ${poison === c ? RED : custColor[st] + "55"}`, color: "#c8cdd8" }}>
                <div style={{ fontWeight: 700 }}>{names[c]}{poison === c ? " ☠" : ""}</div>
                <div style={{ color: "#6b7080" }}>W{workersOf(c).map(x => x + 1).join("+W")}</div>
                <div style={{ color: custColor[st], fontWeight: 700 }}>{poison === null ? "OK" : custLabel[st]}</div>
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: 10, fontSize: 11, color: "#8b90a0" }}>SCOPE OF IMPACT THIS SCHEME: <span style={{ color: poison ? verdict.c : "#c8cdd8", fontWeight: 700 }}>{scope}</span> · customers fully down: <b style={{ color: downCount ? RED : GREEN }}>{poison === null ? 0 : downCount}/8</b></div>
      </div>

      <div style={{ color: "#6b7080", fontSize: 10, marginTop: 12, borderTop: "1px solid #2a2a3a", paddingTop: 8, lineHeight: 1.7 }}>
        Assignments and the worked example are the post's (rainbow = W1+W4, rose = W1+W8; eight workers; shards of two; 28 combinations → 1/28th scope, seven times better than regular sharding; at most one shared worker between shards, so fault-tolerant requestors with retries continue uninterrupted). Route 53 scale, sourced: 2,048 virtual name servers, shuffle shards of four per domain, 730 billion combinations, no two domains sharing more than two servers, targeted DDoS traffic isolated to dedicated attack capacity alongside Shield scrubbers. The scheme usually comes at no additional cost — a rearrangement of existing resources.
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
        <div style={{ fontSize: 10, color: "#6b7080", letterSpacing: 1.2 }}>CONTEXT — IF YOU ARRIVED HERE WITHOUT THE ARTICLE</div>
        <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontFamily: "inherit", fontSize: 10, padding: 0 }}>HIDE ✕</button>
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 8 }}><span style={lbl}>THE PROBLEM · </span>In a shared fleet where any worker serves any request, one customer's poisonous request or flood reaches every worker — the blast radius is the whole service. Fixed shards cap it at 25%, but that's total loss for the shard's tenants, and shrinking it further costs dedicated capacity.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>THE MOVE · </span>Shuffle sharding: give each customer a random combination of two workers. 28 combinations from eight machines → 1/28th scope, and since any two shards overlap in at most one worker, retrying clients ride through. Route 53 runs it at 4-of-2,048: 730 billion combinations.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>TRY · </span>Poison the rainbow customer under each scheme and count who else goes down. Then switch off client retries and find the half of the guarantee that was living in the caller.</div>
    </div>
  );
}
