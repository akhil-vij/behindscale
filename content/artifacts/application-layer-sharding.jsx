import { useState } from "react";

// Pattern artifact - Application-Layer Sharding (interactive: you are the router).
// When the STORAGE owns the sharding, you cannot move data by hand - it decides. Switch to APPLICATION control
// and you place each customer yourself: click a customer, then click a cluster, and the mapping updates. From
// there, take a cluster offline (its customers reroute) or isolate a heavy customer, each with one edit. The
// catch: the mapping has a source of truth, and if it is down, no new routing can happen.

const BG = "#08090D", SURFACE = "#0F1118", SURFACE2 = "#161922", BORDER = "#1F2333";
const TEXT = "#C8CDD8", MUTED = "#6B7280";
const GREEN = "#22C55E", AMBER = "#F5B841", RED = "#EF4444", ACCENT = "#F97316", BLUE = "#60A5FA";
const MONO = "'JetBrains Mono','Fira Code',ui-monospace,monospace";

const CUSTOMERS = [
  { id: "cust-1", size: 1 }, { id: "cust-2", size: 1 }, { id: "cust-3", size: 3, heavy: true },
  { id: "cust-4", size: 1 }, { id: "cust-5", size: 1 }, { id: "cust-6", size: 1 },
];
const CLUSTERS = ["A", "B", "C"];
const INITIAL = { "cust-1": "A", "cust-2": "A", "cust-3": "B", "cust-4": "B", "cust-5": "C", "cust-6": "C" };
const load = (asg, c) => CUSTOMERS.filter((t) => asg[t.id] === c).reduce((s, t) => s + t.size, 0);
const leastOther = (asg, exclude) => CLUSTERS.filter((c) => c !== exclude).sort((a, b) => load(asg, a) - load(asg, b))[0];

export default function PatternApplicationLayerSharding() {
  const [mode, setMode] = useState("storage"); // storage | app (problem-first: storage owns it)
  const [sot, setSot] = useState(true);
  const [asg, setAsg] = useState(INITIAL);
  const [sel, setSel] = useState(null);
  const [msg, setMsg] = useState({ c: MUTED, t: "The storage system owns the sharding. You cannot move data by hand - it decides where everything goes. Switch control to your application to place customers yourself." });

  const canAct = mode === "app" && sot;

  const clickCustomer = (id) => {
    if (mode !== "app") { setMsg({ c: MUTED, t: "The storage owns the sharding here, so you cannot move data by hand. Switch control to your application first." }); return; }
    if (!sot) { setMsg({ c: RED, t: "The mapping's source of truth is down, so no new routing can happen. Existing routes still work from cache, but you cannot place a customer right now." }); return; }
    setSel(sel === id ? null : id);
    if (sel !== id) setMsg({ c: BLUE, t: "Selected " + id + ". Now click a cluster to place its data there - that is one edit to the mapping." });
  };
  const clickCluster = (c) => {
    if (!sel) return;
    setAsg({ ...asg, [sel]: c });
    setMsg({ c: GREEN, t: "Moved " + sel + " to cluster " + c + " with one edit to the mapping. The storage did nothing - your code decided." });
    setSel(null);
  };
  const takeOffline = (c) => {
    if (!canAct) return;
    const moving = CUSTOMERS.filter((t) => asg[t.id] === c);
    if (moving.length === 0) { setMsg({ c: MUTED, t: "Cluster " + c + " is already empty." }); return; }
    const next = { ...asg }; const loads = {}; CLUSTERS.forEach((k) => (loads[k] = load(asg, k)));
    moving.forEach((t) => { const g = CLUSTERS.filter((k) => k !== c).sort((a, b) => loads[a] - loads[b])[0]; next[t.id] = g; loads[g] += t.size; });
    setAsg(next); setSel(null);
    setMsg({ c: GREEN, t: "Took cluster " + c + " offline by rerouting its " + moving.length + " customers - free for maintenance, no storage rebalance needed." });
  };
  const isolate = () => {
    if (!canAct) return;
    const h = CUSTOMERS.find((t) => t.heavy); const c = asg[h.id];
    const moving = CUSTOMERS.filter((t) => asg[t.id] === c && !t.heavy);
    if (moving.length === 0) { setMsg({ c: GREEN, t: h.id + " already sits alone on cluster " + c + "." }); return; }
    const next = { ...asg }; const loads = {}; CLUSTERS.forEach((k) => (loads[k] = load(asg, k)));
    moving.forEach((t) => { const g = CLUSTERS.filter((k) => k !== c).sort((a, b) => loads[a] - loads[b])[0]; next[t.id] = g; loads[g] += t.size; });
    setAsg(next); setSel(null);
    setMsg({ c: GREEN, t: "Isolated " + h.id + " on cluster " + c + " - the heavy customer can no longer slow its neighbours down." });
  };
  const reset = () => { setAsg(INITIAL); setSel(null); setMsg({ c: MUTED, t: "Reset to the starting layout." }); };

  const modeBtn = (k, lab) => (
    <button onClick={() => { setMode(k); setSel(null); setMsg({ c: MUTED, t: k === "app" ? "Your application owns the sharding. Click a customer, then a cluster, to place its data - or use the one-click actions below." : "The storage system owns the sharding. Moving data by hand is not your call." }); }} style={{ flex: "1 1 0", padding: "9px 12px", borderRadius: 7, cursor: "pointer", fontFamily: MONO, fontSize: 12.5, fontWeight: 700, border: "1px solid " + (mode === k ? ACCENT : "#333947"), background: mode === k ? ACCENT + "1E" : "#0C0D13", color: mode === k ? "#EDEFF3" : "#9AA0B0" }}>{lab}</button>
  );

  return (
    <div style={{ background: BG, color: TEXT, fontFamily: MONO, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid " + BORDER, fontSize: 12.5, lineHeight: 1.55 }}>
      <div style={{ color: ACCENT, fontSize: 10.5, letterSpacing: 2 }}>APPLICATION-LAYER SHARDING - YOU CONTROL THE SHARDING</div>
      <div style={{ color: "#EDEFF3", fontSize: 16.5, margin: "4px 0 3px", fontWeight: 700 }}>Move data by controlling the sharding logic, not relying on the database</div>
      <p style={{ color: "#9096A6", fontSize: 12, margin: 0 }}>You are the router. Click a customer, then a cluster, to place its data - each move is one edit to the mapping. Hand the sharding to the storage and you lose that control.</p>

      {/* mode + source of truth */}
      <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
        {modeBtn("storage", "Storage owns the sharding")}
        {modeBtn("app", "Your app owns the sharding")}
      </div>
      <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ color: MUTED, fontSize: 11 }}>Mapping source of truth:</span>
        <button onClick={() => setSot(true)} style={{ padding: "5px 11px", borderRadius: 6, cursor: "pointer", fontFamily: MONO, fontSize: 11, border: "1px solid " + (sot ? GREEN : "#333947"), background: sot ? GREEN + "18" : "#0C0D13", color: sot ? GREEN : "#9AA0B0" }}>up</button>
        <button onClick={() => setSot(false)} style={{ padding: "5px 11px", borderRadius: 6, cursor: "pointer", fontFamily: MONO, fontSize: 11, border: "1px solid " + (!sot ? RED : "#333947"), background: !sot ? RED + "18" : "#0C0D13", color: !sot ? RED : "#9AA0B0" }}>down</button>
        {sel && <span style={{ marginLeft: "auto", color: BLUE, fontSize: 11 }}>holding {sel} - click a cluster</span>}
      </div>

      {/* clusters - click customers to select, click a cluster to place */}
      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {CLUSTERS.map((c) => {
          const here = CUSTOMERS.filter((t) => asg[t.id] === c);
          return (
            <div key={c} onClick={() => clickCluster(c)} style={{ background: SURFACE, border: "1px solid " + (sel ? BLUE : BORDER), borderRadius: 8, padding: "10px 10px 12px", minHeight: 120, cursor: sel ? "pointer" : "default" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ color: "#AEB4C2", fontWeight: 700, fontSize: 12.5 }}>cluster {c}</span>
                <span style={{ color: MUTED, fontSize: 10 }}>load {load(asg, c)}</span>
              </div>
              <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 5, minHeight: 46 }}>
                {here.length === 0 && <span style={{ color: "#565C6B", fontSize: 10.5, fontStyle: "italic" }}>empty - offline</span>}
                {here.map((t) => (
                  <span key={t.id} onClick={(e) => { e.stopPropagation(); clickCustomer(t.id); }} style={{ cursor: "pointer", fontSize: 10.5, padding: "3px 7px", borderRadius: 5, border: "1px solid " + (sel === t.id ? BLUE : (t.heavy ? AMBER : "#2E3547")), background: sel === t.id ? BLUE + "26" : (t.heavy ? AMBER + "1A" : SURFACE2), color: sel === t.id ? "#BcD6FF" : (t.heavy ? AMBER : "#B7BCC9") }}>{t.id}{t.heavy ? " (heavy)" : ""}</span>
                ))}
              </div>
              <button disabled={!canAct} onClick={(e) => { e.stopPropagation(); takeOffline(c); }} style={{ marginTop: 8, width: "100%", padding: "5px 0", borderRadius: 6, cursor: canAct ? "pointer" : "not-allowed", fontFamily: MONO, fontSize: 11, border: "1px solid " + (canAct ? "#3A4152" : "#242A38"), background: "#0C0D13", color: canAct ? "#C8CDD8" : "#565C6B" }}>take {c} offline</button>
            </div>
          );
        })}
      </div>

      {/* one-click actions */}
      <div style={{ marginTop: 9, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button disabled={!canAct} onClick={isolate} style={{ padding: "7px 13px", borderRadius: 7, cursor: canAct ? "pointer" : "not-allowed", fontFamily: MONO, fontSize: 11.5, fontWeight: 700, border: "1px solid " + (canAct ? ACCENT : "#242A38"), background: canAct ? ACCENT : "#0C0D13", color: canAct ? "#0A0B0F" : "#565C6B" }}>isolate the heavy customer</button>
        <button onClick={reset} style={{ padding: "7px 12px", borderRadius: 7, cursor: "pointer", fontFamily: MONO, fontSize: 11, border: "1px solid " + BORDER, background: "transparent", color: "#9AA0B0" }}>&#8635; reset</button>
      </div>

      {/* mapping table */}
      <div style={{ marginTop: 12, background: SURFACE, border: "1px solid " + BORDER, borderRadius: 8, padding: "10px 13px" }}>
        <div style={{ color: MUTED, fontSize: 11, marginBottom: 6 }}>THE MAPPING (customer &#8594; cluster)</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px" }}>
          {CUSTOMERS.map((t) => (
            <span key={t.id} style={{ fontSize: 11, color: sel === t.id ? BLUE : "#B7BCC9" }}>{t.id} <span style={{ color: MUTED }}>&#8594;</span> <span style={{ color: BLUE }}>{asg[t.id]}</span></span>
          ))}
        </div>
      </div>

      {/* message / verdict */}
      <div style={{ marginTop: 12, background: SURFACE, border: "1px solid " + msg.c, borderRadius: 8, padding: "11px 13px", fontSize: 12.5, lineHeight: 1.6, color: TEXT }}>{msg.t}</div>

      <div style={{ color: "#8B90A0", fontSize: 12, marginTop: 13, borderTop: "1px solid " + BORDER, paddingTop: 10, lineHeight: 1.65 }}>
        With the storage in charge, where data lives is the storage's call and moving it waits on its rebalancing. With the mapping in your code, the storage is just a pool of clusters you control - so placing a customer, taking a cluster offline, or isolating a heavy customer is one edit. The cost: that mapping is now yours to keep correct, and nothing new routes while its source of truth is down.
      </div>
    </div>
  );
}
