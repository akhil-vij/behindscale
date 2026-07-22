import { useState } from "react";

const ACCENT = "#84CC16";
const RED = "#ef4444"; const AMBER = "#eab308"; const GREEN = "#22c55e"; const VIOLET = "#9b8cf0";
const U = 0.999; // per-shard availability for the fan-out math

const initial = () => ({ era: "sharded", n: 4, dead: null, ranAction: false, refused: false, dcDead: false, moved: false });

export default function OnePodOnline() {
  const [w, setW] = useState(initial);
  const pAll = Math.pow(U, w.n);
  const shopsPerCell = Math.round(100 / w.n);
  const podded = w.era === "pods";
  const shopsDown = w.dead === null ? 0 : podded ? (w.dcDead && !w.moved ? shopsPerCell : w.dcDead ? 0 : shopsPerCell) : 0;

  const verdict = (() => {
    if (!podded) {
      if (w.dead !== null && w.ranAction) return { c: RED, code: "EVERY SHARD WAS EVERYONE'S PROBLEM", t: `Shard ${w.dead + 1} is down and the platform action — with_each_shard — is unavailable across the entire platform. Not the shops on shard ${w.dead + 1}: everyone, because the action's availability is the product of all ${w.n} shards'. Each shard you added was a new way to reach this verdict. Reorganize into PODS.` };
      if (w.dead !== null) return { c: AMBER, code: "ONE SHARD DOWN — NOW RUN THE FAN-OUT", t: `Shard ${w.dead + 1}'s shops are down; everyone else is fine — so far. Run the PLATFORM ACTION and watch the idiom couple every shop's fate to the shard that's missing.` };
      return { c: AMBER, code: "SHARDED IN 2015 — CAPACITY BOUGHT, GEOMETRY SOLD", t: `Vertical scaling ended; ${w.n} shards carry the shops. Watch the math on the right as you add shards: any action that touches all of them is up only when all of them are — availability ${(pAll * 100).toFixed(2)}% and falling with every shard. Kill one and run the platform action.` };
    }
    if (w.dcDead && w.moved) return { c: GREEN, code: "EVACUATED IN A MINUTE, DROPPED NOTHING", t: `Pod ${(w.dead ?? 0) + 1} now runs from its recovery data center — Pod Mover relocated it without dropping requests or jobs. Shopify does this daily, because a rehearsed unit operation is the difference between disaster recovery and disaster improvisation. Evacuating a whole DC is just this, pod by pod.` };
    if (w.dcDead) return { c: RED, code: `POD ${(w.dead ?? 0) + 1}'S DATA CENTER IS GONE`, t: `Its ${shopsPerCell} shops are down — and only they are. Each pod is paired with a recovery data center for exactly this moment. EVACUATE WITH POD MOVER.` };
    if (w.refused) return { c: VIOLET, code: "REFUSED: NO ACTION REACHES ACROSS PODS", t: "The fan-out idiom doesn't exist here — that's the renunciation the architecture is made of. Platform-scoped work (cross-shop search, aggregate analytics) is rebuilt as asynchronous, denormalized paths outside the request lifecycle. The platform stopped having platform-wide failures by refusing to have platform-wide operations." };
    if (w.dead !== null) return { c: GREEN, code: "ONE POD ONLINE IS ENOUGH", t: `Pod ${w.dead + 1} is down and its ~${shopsPerCell} shops are fully down — nobody else noticed, because every unit of work is assigned to exactly one pod and no shared resource speaks to more than one at a time. You chose WHO fails instead of HOW MUCH everyone fails. Now try the platform action, or kill the pod's whole data center.` };
    return { c: AMBER, code: "PODS — THE FLEET WITHOUT THE FATE", t: `${w.n} pods, each a set of shops on fully isolated datastores, Sorting Hat assigning every request to exactly one. Adding a pod now adds capacity without adding a new way for the others to fail. Kill one and compare against the sharded era.` };
  })();

  const mono = "'JetBrains Mono','Fira Code',ui-monospace,monospace";
  const S = {
    root: { background: "#08090D", color: "#c8cdd8", fontFamily: mono, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid #2a2a3a", fontSize: 12, lineHeight: 1.5 },
    panel: { background: "#111118", border: "1px solid #2a2a3a", borderRadius: 8, padding: 12 },
    label: { color: "#6b7080", fontSize: 10, letterSpacing: 1.2 },
    btn: (on, dis) => ({ display: "block", width: "100%", textAlign: "left", padding: "7px 9px", marginTop: 6, borderRadius: 6, cursor: dis ? "not-allowed" : "pointer", opacity: dis ? 0.4 : 1, border: `1px solid ${on ? ACCENT : "#2a2a3a"}`, color: on ? "#d6ecab" : "#8b90a0", background: on ? "rgba(132,204,22,0.10)" : "#0c0d13", fontFamily: mono, fontSize: 11 }),
  };

  const cells = Array.from({ length: w.n }, (_, i) => {
    const dead = w.dead === i;
    const evacuated = podded && dead && w.dcDead && w.moved;
    return (
      <button key={i} onClick={() => setW(x => ({ ...x, dead: x.dead === i ? null : i, ranAction: false, refused: false, dcDead: false, moved: false }))}
        style={{ flex: "1 1 90px", minWidth: 90, cursor: "pointer", background: "#0c0d13", borderRadius: 6, padding: "8px 6px", textAlign: "center", fontFamily: mono, border: `1px ${podded ? "solid" : "dashed"} ${dead && !evacuated ? RED : evacuated ? GREEN : "#2a2f45"}` }}>
        <div style={{ fontWeight: 700, fontSize: 10, color: dead && !evacuated ? RED : "#c8cdd8" }}>{podded ? "POD" : "SHARD"} {i + 1}{evacuated ? " ↪ DR" : ""}</div>
        <div style={{ fontSize: 9, color: "#6b7080", marginTop: 2 }}>{podded ? `${shopsPerCell} shops · isolated stores` : `${shopsPerCell} shops · shared fate`}</div>
        <div style={{ fontSize: 9, marginTop: 2, color: dead && !evacuated ? RED : GREEN }}>{dead && !evacuated ? "DOWN" : "up"}</div>
      </button>
    );
  });

  return (
    <div style={S.root}>
      <div style={{ color: ACCENT, fontSize: 10, letterSpacing: 2 }}>SHOPIFY · PODS ARCHITECTURE — INTERACTIVE</div>
      <div style={{ color: "#edeff3", fontSize: 16, margin: "4px 0 2px", fontWeight: 700 }}>One pod online</div>
      <p style={{ color: "#8b90a0", fontSize: 11, margin: 0 }}>The same fleet, two failure geometries. The slider is the class's name made draggable: watch the blast radius scale with the cluster size — then unmake it.</p>
      <ContextBlock />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
        <div style={{ ...S.panel, flex: "1 1 250px", minWidth: 250 }}>
          <div style={S.label}>ERA</div>
          <button style={S.btn(!podded, false)} onClick={() => setW(x => ({ ...initial(), n: x.n }))}>2015 · SHARDED<div style={{ color: "#6b7080", fontSize: 10 }}>capacity solved, fan-out idiom everywhere</div></button>
          <button style={S.btn(podded, false)} onClick={() => setW(x => ({ ...initial(), era: "pods", n: x.n }))}>2016 · PODS<div style={{ color: "#6b7080", fontSize: 10 }}>isolated datastores · one pod per unit of work</div></button>
          <div style={{ ...S.label, marginTop: 12 }}>FLEET SIZE · {w.n} {podded ? "PODS" : "SHARDS"}</div>
          <input type="range" min="2" max="16" step="1" value={w.n} onChange={e => setW(x => ({ ...x, n: +e.target.value, dead: null, ranAction: false, refused: false, dcDead: false, moved: false }))} style={{ width: "100%", accentColor: ACCENT, marginTop: 6 }} />
          <div style={{ color: "#6b7080", fontSize: 10 }}>{podded ? "each addition is pure capacity" : "each addition worsens every fan-out's math"}</div>
          <div style={{ ...S.label, marginTop: 12 }}>MAKE TROUBLE (click a {podded ? "pod" : "shard"} above too)</div>
          <button style={S.btn(false, w.dead === null)} disabled={w.dead === null} onClick={() => setW(x => (podded ? { ...x, refused: true } : { ...x, ranAction: true }))}>RUN PLATFORM ACTION (with_each_shard)<div style={{ color: "#6b7080", fontSize: 10 }}>{podded ? "…if the architecture will let you" : "iterates every shard"}</div></button>
          <button style={S.btn(false, !(podded && w.dead !== null && !w.dcDead))} disabled={!(podded && w.dead !== null && !w.dcDead)} onClick={() => setW(x => ({ ...x, dcDead: true, moved: false }))}>KILL POD {w.dead !== null ? w.dead + 1 : "?"}'S DATA CENTER</button>
          <button style={{ ...S.btn(false, !(podded && w.dcDead && !w.moved)), ...(podded && w.dcDead && !w.moved ? { border: `1px solid ${VIOLET}`, boxShadow: `0 0 8px ${VIOLET}55` } : {}) }} disabled={!(podded && w.dcDead && !w.moved)} onClick={() => setW(x => ({ ...x, moved: true }))}>POD MOVER: EVACUATE TO RECOVERY DC (~1 MIN)</button>
          <button style={{ ...S.btn(false, false), marginTop: 12 }} onClick={() => setW(x => ({ ...initial(), era: x.era, n: x.n }))}>↺ RESET</button>
        </div>

        <div style={{ flex: "2 1 420px", minWidth: 300 }}>
          <div style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${verdict.c}`, background: `${verdict.c}14`, marginBottom: 12 }}>
            <div style={{ color: verdict.c, fontWeight: 700 }}>{verdict.code}</div>
            <div style={{ marginTop: 5, fontSize: 11.5, lineHeight: 1.6 }}>{verdict.t}</div>
          </div>
          <div style={S.panel}>
            <div style={S.label}>{podded ? "SORTING HAT → one pod per request · no cross-pod actions" : "SHARED APP TIER → with_each_shard reaches everything"}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>{cells}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              <div style={{ flex: "1 1 150px", background: "#0c0d13", border: "1px solid #2a2a3a", borderRadius: 6, padding: "8px 10px" }}>
                <div style={S.label}>FAN-OUT ACTION AVAILABILITY</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: podded ? "#6b7080" : pAll > 0.995 ? AMBER : RED }}>{podded ? "n/a — forbidden" : `${(pAll * 100).toFixed(2)}%`}</div>
                <div style={{ fontSize: 9.5, color: "#6b7080" }}>{podded ? "no operation spans pods" : `= ${(U * 100).toFixed(1)}%^${w.n} — the product that decays with the fleet`}</div>
              </div>
              <div style={{ flex: "1 1 130px", background: "#0c0d13", border: "1px solid #2a2a3a", borderRadius: 6, padding: "8px 10px" }}>
                <div style={S.label}>BLAST RADIUS OF ONE {podded ? "POD" : "SHARD"} FAILURE</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: podded ? GREEN : RED }}>{podded ? `${shopsPerCell}% of shops` : "100% of platform actions"}</div>
                <div style={{ fontSize: 9.5, color: "#6b7080" }}>{podded ? "total for them, invisible to everyone else" : `plus ${shopsPerCell}% of shops entirely`}</div>
              </div>
              <div style={{ flex: "1 1 120px", background: "#0c0d13", border: "1px solid #2a2a3a", borderRadius: 6, padding: "8px 10px" }}>
                <div style={S.label}>SHOPS DOWN NOW</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: w.dead === null || (podded && w.moved && w.dcDead) ? GREEN : RED }}>{w.dead === null ? "0%" : podded ? (w.dcDead && w.moved ? "0%" : `${shopsPerCell}%`) : `${shopsPerCell}%${w.ranAction ? " + all fan-outs" : ""}`}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ color: "#6b7080", fontSize: 10, marginTop: 12, borderTop: "1px solid #2a2a3a", paddingTop: 8, lineHeight: 1.7 }}>
        The 2015 vertical ceiling, the with_each_shard idiom and its platform-wide unavailability, the 2016 pod reorganization (shops on fully isolated datastores; shared workers/app servers/load balancers restricted to one pod per action; every web request and delayed job assigned to a single pod; "serving a request only requires a single pod to be online"), Sorting Hat's rule-based routing header across multiple data centers, pod-paired active/recovery data centers, Pod Mover's one-minute evacuations without dropped requests or jobs, and daily pod moves are from the Shopify Engineering post (Xavier Denis, 2018). The Redismageddon shared-Redis lesson and the 100+ pods / no-global-outages-since outcomes are from Shopify's first-party "E-Commerce at Scale" engineering piece. The 99.9% per-shard uptime in the availability math and the shop percentages are illustrative.
        {" "}<a href="https://behindscale.com/articles/shopify-pods-architecture" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: "none" }}>From the full dissection at behindscale.com →</a>
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
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 8 }}><span style={lbl}>THE PROBLEM · </span>Shopify sharded MySQL in 2015 when vertical scaling ended — and the codebase's with_each_shard idiom meant any shard's failure took platform actions down everywhere. Availability decayed as a product over shards: every shard added was a new way to take the whole platform down.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>THE MOVE · </span>Pods (2016): shops on fully isolated datastores, shared compute allowed to speak to only one pod per action, and every unit of work assigned to exactly one pod — so serving a request needs one pod online. Sorting Hat routes at the edge; Pod Mover evacuates a pod to its recovery DC in a minute, daily.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>TRY · </span>In the sharded era, drag the fleet slider and watch the fan-out availability decay; kill a shard, run the platform action, and take everyone down. Flip to pods: the same kill stops at its walls, the platform action gets refused, and a dead data center is a one-minute evacuation.</div>
    </div>
  );
}
