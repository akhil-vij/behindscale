import { useState, useEffect } from "react";

const ACCENT = "#E01E5A";
const RED = "#ef4444"; const AMBER = "#eab308"; const GREEN = "#22c55e"; const VIOLET = "#9b8cf0";

const NSHARDS = 8;
const BASE = [18, 20, 16, 22, 17, 19, 21, 15]; // idle long tail (fixed, deterministic)
const CAPS = { 1: 100, 2: 150, 3: 200 }; // hardware tiers; 3 = largest available
const WHALE_SHARD = 1;

const initial = () => ({ t: 0, arch: "workspace", whale: 60, hwTier: 1, stage: 0, surge: false, extraShards: 0, refused: false, lastAction: null });

function utils(w) {
  const mult = w.surge ? 1.5 : 1;
  const n = NSHARDS + (w.stage === 3 ? w.extraShards : 0);
  const arr = [];
  for (let i = 0; i < n; i++) {
    const base = (BASE[i % NSHARDS] || 18) * mult;
    let load = base;
    if (w.stage === 3) {
      load += (w.whale * mult) / n; // resharded by channel id: whale spread across fleet
      arr.push((load / CAPS[1]) * 100);
    } else if (w.arch === "appshard") {
      if (i >= WHALE_SHARD && i < WHALE_SHARD + 3) load += (w.whale * mult) / 3;
      const cap = i >= WHALE_SHARD && i < WHALE_SHARD + 3 ? CAPS[w.hwTier] : CAPS[1];
      arr.push((load / cap) * 100);
    } else {
      if (i === WHALE_SHARD) load += w.whale * mult;
      arr.push((load / (i === WHALE_SHARD ? CAPS[w.hwTier] : CAPS[1])) * 100);
    }
  }
  return arr;
}

function step(w) {
  const n = { ...w };
  n.t++;
  n.whale = w.whale + 3; // the customer keeps growing regardless of your architecture
  return n;
}

export default function LargestShard() {
  const [w, setW] = useState(initial);
  useEffect(() => { const id = setInterval(() => setW(step), 700); return () => clearInterval(id); }, []);
  const us = utils(w);
  const whaleUtil = w.stage === 3 ? Math.max(...us) : us[WHALE_SHARD];
  const tail = us.filter((_, i) => w.stage === 3 ? false : i !== WHALE_SHARD && !(w.arch === "appshard" && i > WHALE_SHARD && i < WHALE_SHARD + 3));
  const tailAvg = tail.length ? tail.reduce((a, b) => a + b, 0) / tail.length : us.reduce((a, b) => a + b, 0) / us.length;
  const overloaded = whaleUtil > 100;
  const ceiling = w.hwTier === 3;

  const verdict = (() => {
    if (w.refused) return { c: AMBER, code: "THE SCHEME SAYS TEAMS DON'T SPLIT", t: "All of a workspace's data must live on one shard — that locality is load-bearing in thousands of query sites, which is exactly why splitting shards and moving teams was hard enough that Slack overprovisioned the whole fleet instead. The scheme that made scaling easy (more teams → more shards) forbids the one split you now need: below the tenant." };
    if (w.stage === 3 && w.surge && w.extraShards > 0) return { c: GREEN, code: "PLUS FIFTY PERCENT, MINUS ZERO DOWNTIME", t: "March 2020: query rates up 50% in one week. With data sharded by channel id, the busiest keyspace splits horizontally under live traffic — Vitess's splitting workflows — and the surge is absorbed. The post's own accounting of the alternative: without resharding, 'we would've been unable to scale at all for our largest customers, leading to downtime.'" };
    if (w.stage === 3 && w.surge) return { c: AMBER, code: "THE SURGE IS HERE — SPLIT THE KEYSPACE", t: "Query rates just rose 50% in a week. The old scheme had no move left; this one does: split the busiest keyspace horizontally while serving traffic." };
    if (w.surge && overloaded) return { c: RED, code: "THE SURGE FOUND THE CEILING FIRST", t: `The whale's shard is at ${Math.round(whaleUtil)}% of the largest available hardware, and query rates just rose 50% in a week. Under workspace sharding there is no move left: hardware is maxed, the scheme won't split a team, and every customer on this shard is one incident from a full outage. This is the wall the migration existed to remove — labeled with the post's own words: unable to scale at all.` };
    if (w.stage === 3) return { c: GREEN, code: "THE KEY CHANGED, THE WHALE DISSOLVED", t: `Message data is sharded by channel id now — the whale's channels spread across the whole fleet, max shard utilization ${Math.round(whaleUtil)}%, and the burning-hot-spot-beside-idle-tail shape is gone. 'Say goodbye to only sharding by team, and to team hot-spots.' The application never learned that anything moved. Now hit the COVID SURGE.` };
    if (w.stage === 2) return { c: VIOLET, code: "DOUBLE-WRITTEN, DOUBLE-READ, DIFFED", t: "The backfill clones legacy tables while the application double-writes; a parallel double-read diffing system proves the Vitess-backed tables behave identically before any traffic commits. Nothing cuts over on faith. The last rung: RESHARD BY CHANNEL ID." };
    if (w.stage === 1) return { c: VIOLET, code: "AN RSS FEED CARRIES THE FIRST QUERY", t: "The prototype is deliberately small — RSS feeds into channels — and deliberately end-to-end: it forces provisioning, service discovery, backup/restore, topology management, and credentials to exist for real before anything important depends on them. Next rung: DOUBLE-WRITE + DIFF." };
    if (w.arch === "appshard") return { c: AMBER, code: "SAME WALL, ONE LAYER UP", t: "Teaching the webapp new shard keys spreads the whale — and the post's prototypes showed why this loses long-term: the coupling untangling is slow (message counts assume team locality; multi-workspace features check shards explicitly), operations don't improve, replicas stay unusable, and a surprisingly hot shard is still not straightforward to scale. Solving the immediate problem in the layer that IS the problem. The other fork: MIGRATE TO VITESS." };
    if (ceiling && overloaded) return { c: RED, code: "THE HARDWARE STORE IS EMPTY", t: `The whale's designated shard has reached the largest available hardware — tier 3 is the last tier there is — and it's at ${Math.round(whaleUtil)}% while the long tail idles at ${Math.round(tailAvg)}%. This is the post's bolded question come due: what if a single team doesn't fit the largest shard? Two forks remain: build sharding into the app, or change which layer owns placement.` };
    if (overloaded) return { c: RED, code: "ONE CUSTOMER, ONE HOST, ONE CEILING", t: `The whale's shard is at ${Math.round(whaleUtil)}% of a tier-${w.hwTier} host while the fleet's long tail idles at ${Math.round(tailAvg)}%. Under workspace sharding, all of this customer's everything must fit here. You can BUY BIGGER HARDWARE — for now.` };
    return { c: AMBER, code: "A WHALE GROWS ON SHARD 2", t: `Workspace sharding: each shard holds thousands of teams, and everything a team has lives on its one shard. Your largest customer keeps hiring. Shard 2: ${Math.round(whaleUtil)}%; everyone else: ~${Math.round(tailAvg)}%. Watch the two dimensions diverge — tenant count scales easily, tenant size aims at a wall.` };
  })();

  const mono = "'JetBrains Mono','Fira Code',ui-monospace,monospace";
  const S = {
    root: { background: "#08090D", color: "#c8cdd8", fontFamily: mono, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid #2a2a3a", fontSize: 12, lineHeight: 1.5 },
    panel: { background: "#111118", border: "1px solid #2a2a3a", borderRadius: 8, padding: 12 },
    label: { color: "#6b7080", fontSize: 10, letterSpacing: 1.2 },
    btn: (on, dis, col) => ({ display: "block", width: "100%", textAlign: "left", padding: "7px 9px", marginTop: 6, borderRadius: 6, cursor: dis ? "not-allowed" : "pointer", opacity: dis ? 0.4 : 1, border: `1px solid ${on ? (col || ACCENT) : "#2a2a3a"}`, color: on ? "#ffc6d8" : "#8b90a0", background: on ? "rgba(224,30,90,0.10)" : "#0c0d13", fontFamily: mono, fontSize: 11 }),
  };
  const inWorkspace = w.arch === "workspace" && w.stage === 0;

  return (
    <div style={S.root}>
      <div style={{ color: ACCENT, fontSize: 10, letterSpacing: 2 }}>SLACK · SCALING DATASTORES WITH VITESS — INTERACTIVE</div>
      <div style={{ color: "#edeff3", fontSize: 16, margin: "4px 0 2px", fontWeight: 700 }}>The largest shard money could buy</div>
      <p style={{ color: "#8b90a0", fontSize: 11, margin: 0 }}>Tenant count scales by adding shards. Tenant size aims at a wall. You operate the fleet while your biggest customer keeps hiring.</p>
      <ContextBlock />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
        <div style={{ ...S.panel, flex: "1 1 250px", minWidth: 250 }}>
          <div style={S.label}>THE OLD MOVES</div>
          <button style={S.btn(false, !inWorkspace || ceiling)} disabled={!inWorkspace || ceiling} onClick={() => setW(x => ({ ...x, hwTier: Math.min(3, x.hwTier + 1), refused: false }))}>BUY BIGGER HARDWARE (tier {w.hwTier}{ceiling ? " — none larger exists" : ` → ${Math.min(3, w.hwTier + 1)}`})</button>
          <button style={S.btn(false, !inWorkspace)} disabled={!inWorkspace} onClick={() => setW(x => ({ ...x, refused: true }))}>SPLIT THE WHALE'S SHARD</button>
          <button style={S.btn(w.arch === "appshard", w.stage > 0)} disabled={w.stage > 0} onClick={() => setW(x => ({ ...x, arch: x.arch === "appshard" ? "workspace" : "appshard", refused: false }))}>APP-LAYER SHARDING {w.arch === "appshard" ? "(on — toggle back)" : "(the prototyped fork)"}<div style={{ color: "#6b7080", fontSize: 10 }}>teach webapp new keys; spread whale over 3 shards</div></button>
          <div style={{ ...S.label, marginTop: 12 }}>THE MIGRATION LADDER (in order)</div>
          <button style={S.btn(w.stage >= 1, w.stage !== 0, VIOLET)} disabled={w.stage !== 0} onClick={() => setW(x => ({ ...x, arch: "workspace", stage: 1, refused: false }))}>1 · PROTOTYPE: RSS FEEDS ON VITESS</button>
          <button style={S.btn(w.stage >= 2, w.stage !== 1, VIOLET)} disabled={w.stage !== 1} onClick={() => setW(x => ({ ...x, stage: 2 }))}>2 · BACKFILL + DOUBLE-WRITE + DIFF</button>
          <button style={S.btn(w.stage >= 3, w.stage !== 2, VIOLET)} disabled={w.stage !== 2} onClick={() => setW(x => ({ ...x, stage: 3 }))}>3 · RESHARD BY CHANNEL ID</button>
          <div style={{ ...S.label, marginTop: 12 }}>MARCH 2020</div>
          <button style={S.btn(w.surge, false, AMBER)} onClick={() => setW(x => ({ ...x, surge: !x.surge }))}>COVID SURGE: {w.surge ? "ON (+50% in a week)" : "OFF"}</button>
          <button style={S.btn(false, !(w.stage === 3 && w.surge && w.extraShards === 0), GREEN)} disabled={!(w.stage === 3 && w.surge && w.extraShards === 0)} onClick={() => setW(x => ({ ...x, extraShards: 4 }))}>SPLIT THE BUSIEST KEYSPACE (live)</button>
          <button style={{ ...S.btn(false, false), marginTop: 12 }} onClick={() => setW(initial())}>↺ RESET</button>
        </div>

        <div style={{ flex: "2 1 440px", minWidth: 300 }}>
          <div style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${verdict.c}`, background: `${verdict.c}14`, marginBottom: 12 }}>
            <div style={{ color: verdict.c, fontWeight: 700 }}>{verdict.code}</div>
            <div style={{ marginTop: 5, fontSize: 11.5, lineHeight: 1.6 }}>{verdict.t}</div>
          </div>
          <div style={S.panel}>
            <div style={S.label}>{w.stage === 3 ? `KEYSPACES · SHARDED BY CHANNEL ID · ${us.length} SHARDS` : `THE FLEET · SHARDED BY WORKSPACE ID · whale on shard ${WHALE_SHARD + 1}`}</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 110, marginTop: 10 }}>
              {us.map((u, i) => {
                const hot = u > 100; const isWhale = w.stage < 3 && i === WHALE_SHARD;
                return (
                  <div key={i} style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: 8.5, color: hot ? RED : "#6b7080" }}>{Math.round(u)}%</div>
                    <div style={{ height: Math.min(100, u), background: hot ? RED : u > 60 ? AMBER : isWhale ? ACCENT : "#2a4a3a", borderRadius: "3px 3px 0 0", border: hot ? `1px solid ${RED}` : "1px solid #2a2a3a" }} />
                    <div style={{ fontSize: 8, color: isWhale ? ACCENT : "#4a4f60" }}>{isWhale ? "🐋" : `s${i + 1}`}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              <div style={{ flex: 1 }}><div style={S.label}>HOTTEST SHARD</div><div style={{ fontSize: 16, fontWeight: 700, color: whaleUtil > 100 ? RED : whaleUtil > 60 ? AMBER : GREEN }}>{Math.round(whaleUtil)}%</div></div>
              <div style={{ flex: 1 }}><div style={S.label}>LONG-TAIL AVG</div><div style={{ fontSize: 16, fontWeight: 700 }}>{Math.round(tailAvg)}%</div></div>
              <div style={{ flex: 1 }}><div style={S.label}>HW TIER</div><div style={{ fontSize: 16, fontWeight: 700, color: ceiling ? AMBER : "#c8cdd8" }}>{w.hwTier}/3</div></div>
              <div style={{ flex: 1 }}><div style={S.label}>WHALE SIZE</div><div style={{ fontSize: 16, fontWeight: 700, color: ACCENT }}>{w.whale}</div></div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ color: "#6b7080", fontSize: 10, marginTop: 12, borderTop: "1px solid #2a2a3a", paddingTop: 8, lineHeight: 1.7 }}>
        The three-cluster origin (workspace shards, metadata lookup, kitchen sink), the active-active pairs, the bolded what-if-a-team-doesn't-fit question, the fall-2016 state (hundreds of thousands of QPS, thousands of hosts), the disadvantage list (largest-available-hardware limits, one data model strained by Enterprise Grid and Slack Connect, hot spots beside an overprovisioned idle tail, shard-outage availability coupling, nonstandard operations without safe replica reads), the prototyped-and-rejected app-layer fork with its coupling examples and same-challenges-long-term verdict, the RSS-feed first use case, the backfill/double-write/double-read-diffing harness, the three-year 99% migration (2.3M QPS peak, 2ms median, 11ms p99), resharding by channel id, and the March 2020 +50%-in-one-week surge absorbed by live keyspace splitting are all from the Slack Engineering post (Ganguli, Iaquinti, Zhou, Chacón, 2020). The eight-shard fleet, tier capacities, and whale growth rate are illustrative; the would-have-been-downtime framing under the surge is the post's own accounting, quoted as such.
        {" "}<a href="https://behindscale.com/articles/slack-vitess-datastores" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: "none" }}>From the full dissection at behindscale.com →</a>
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
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 8 }}><span style={lbl}>THE PROBLEM · </span>Slack sharded everything by workspace — all of a team's data on one shard — which scaled beautifully by tenant count while the biggest single customers marched their designated shards to the largest available hardware, beside a massively underutilized long tail the scheme couldn't share load with.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>THE MOVE · </span>Change which layer owns placement: three years migrating 99% of query load to Vitess, where sharding is the datastore's job behind a topology-ignorant query layer — so message data could reshard by channel id, dissolving the whale across the fleet, without the application knowing anything moved.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>TRY · </span>Let the whale grow. Buy bigger hardware until the store is empty, ask the scheme to split a team and get refused, take the prototyped app-layer fork and read why it loses long-term — then climb the migration ladder in order and hit the COVID surge with a fleet that can finally split under live traffic.</div>
    </div>
  );
}
