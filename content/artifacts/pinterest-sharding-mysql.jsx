import { useState } from "react";

const ACCENT = "#E60023";
const RED = "#ef4444"; const AMBER = "#eab308"; const GREEN = "#22c55e"; const VIOLET = "#9b8cf0";

const SAMPLE_ID = "241294492511762325"; // the post's own Pin
const initial = () => ({
  era: "onebox", months: 0, pinsB: 2, load: 35, crashed: false, clusterMonths: 0,
  hosts: [
    { name: "MySQL001A", range: [0, 511], load: 30 },
    { name: "MySQL002A", range: [512, 1023], load: 30 },
    { name: "MySQL003A", range: [1024, 2047], load: 30 },
    { name: "MySQL004A", range: [2048, 4095], load: 30 },
  ],
  nextHost: 9, opened8k: false, lastId: null, joinLog: [], alterAsked: false, decomposed: false, splitDone: false,
});

const dec = (idStr) => { const id = BigInt(idStr); return { shard: Number((id >> 46n) & 0xffffn), type: Number((id >> 36n) & 0x3ffn), local: Number(id & 0xfffffffffn) }; };

export default function ShardOrDoNotShard() {
  const [w, setW] = useState(initial);

  const grow = () => setW(x => {
    const y = { ...x, months: x.months + 1, pinsB: +(x.pinsB * 1.35).toFixed(1) };
    if (y.era === "onebox") y.load = Math.min(140, Math.round(y.load * 1.35));
    if (y.era === "cluster") { y.clusterMonths++; if (y.clusterMonths >= 2) y.crashed = true; }
    if (y.era === "sharded") y.hosts = y.hosts.map(h => ({ ...h, load: Math.min(140, Math.round(h.load * (h.name === "MySQL001A" && !y.splitDone ? 1.3 : 1.12))) }));
    return y;
  });
  const createPin = () => setW(x => {
    const shard = 3429, type = 1, local = 7075733 + x.months; // illustrative locality: the board's shard
    const id = ((BigInt(shard) << 46n) | (BigInt(type) << 36n) | BigInt(local)).toString();
    return { ...x, lastId: { id, shard, type, local } };
  });
  const runJoin = () => setW(x => ({
    ...x, joinLog: [
      "① mapping query — on the BOARD's shard (db01337):",
      "   SELECT pin_id FROM board_has_pins WHERE board_id=… ORDER BY sequence LIMIT 50",
      "   → 50 pin IDs   [cacheable in Redis: board→pin_ids]",
      "② object fetches — each ID decomposes to its own shard:",
      "   SELECT data FROM dbNNNNN.pins WHERE local_id=…  ×50",
      "   → Pin JSON blobs   [cacheable in memcache: pin_id→object]",
      "The join lives in the application. The database never crossed a shard.",
    ],
  }));
  const split = () => setW(x => {
    const src = x.hosts.find(h => h.name === "MySQL001A");
    const hosts = x.hosts.map(h => h.name === "MySQL001A" ? { ...h, range: [0, 255], load: Math.round(h.load / 2) } : h);
    hosts.splice(1, 0, { name: `MySQL00${x.nextHost}A`, range: [256, 511], load: Math.round(src.load / 2) });
    return { ...x, hosts, nextHost: x.nextHost + 1, splitDone: true };
  });

  const hot = w.era === "sharded" && !w.splitDone && w.hosts[0].load > 85;
  const verdict = (() => {
    if (w.era === "onebox" && w.load >= 100) return { c: RED, code: "THE CEILING IS ONE BOX TALL", t: `${w.pinsB}B Pins against a single-box engine — MySQL has no next gear here, and September 2011 has arrived: every piece of infrastructure over capacity at once. Two doors out: bet on a store that promises to scale itself, or keep the boring engine and do the distribution yourself.` };
    if (w.era === "onebox") return { c: w.load > 70 ? AMBER : GREEN, code: "ONE BOX, FOR NOW", t: `A single MySQL holds everything — joins, foreign keys, indexes, all the luxuries of one machine. Load ${w.load}%. Keep advancing the growth curve; 2011 doesn't slow down because you'd like it to.` };
    if (w.era === "cluster" && w.crashed) return { c: RED, code: "IT SCALED ITSELF UNTIL IT DIDN'T", t: "The cluster rebalanced, gossiped, and then broke catastrophically — the post's word — the way MongoDB, Cassandra, and Membase each broke on Pinterest in production. The automation you rented came with failure modes you can't see into. The scars aside writes itself: try really hard to just use MySQL. One door left." };
    if (w.era === "cluster") return { c: AMBER, code: "THE CLUSTER IS HANDLING IT — SO FAR", t: "Auto-sharding, auto-rebalancing, no placement decisions to make. Month one is wonderful. Keep growing." };
    // sharded era
    if (w.splitDone) return { c: GREEN, code: "HALF THE SHARDS, TWICE THE HEADROOM", t: "Replicate MySQL001A to a fresh master-master pair, flip one line of ZooKeeper config, and each machine now owns half the range. No object moved between shards — shards moved between machines, which is the only kind of move this system ever makes. That asymmetry is the whole placement contract." };
    if (hot) return { c: AMBER, code: "MySQL001A IS RUNNING HOT", t: `Shards 0–511 are heavy (${w.hosts[0].load}%), and no object can leave its shard — its address is burned into every ID that references it. Relief comes at shard granularity: SPLIT THE RANGE onto a new machine.`, };
    if (w.lastId && !w.decomposed) return { c: GREEN, code: "PLACEMENT IS ARITHMETIC, NOT A LOOKUP", t: `Your Pin's ID composed live: shard ${w.lastId.shard} ≪ 46 | type ${w.lastId.type} ≪ 36 | row ${w.lastId.local}. Any client anywhere can now find this Pin with two shifts and a mask — no directory service, no hash ring. And it can never live anywhere else. Try decomposing the post's real Pin, or run the board join.` };
    return { c: AMBER, code: "4,096 SHARDS ON ORDINARY MYSQL", t: "Every shard is just a database (db00000…db04095) on a master-master pair; ZooKeeper maps ranges to machines. Create a Pin and watch its ID become its address — then keep growing and see what a hot range costs." };
  })();

  const mono = "'JetBrains Mono','Fira Code',ui-monospace,monospace";
  const S = {
    root: { background: "#08090D", color: "#c8cdd8", fontFamily: mono, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid #2a2a3a", fontSize: 12, lineHeight: 1.5 },
    panel: { background: "#111118", border: "1px solid #2a2a3a", borderRadius: 8, padding: 12 },
    label: { color: "#6b7080", fontSize: 10, letterSpacing: 1.2 },
    btn: (on, dis) => ({ display: "block", width: "100%", textAlign: "left", padding: "7px 9px", marginTop: 6, borderRadius: 6, cursor: dis ? "not-allowed" : "pointer", opacity: dis ? 0.4 : 1, border: `1px solid ${on ? ACCENT : "#2a2a3a"}`, color: on ? "#ffb3bd" : "#8b90a0", background: on ? "rgba(230,0,35,0.10)" : "#0c0d13", fontFamily: mono, fontSize: 11 }),
  };
  const d = w.decomposed ? dec(SAMPLE_ID) : null;
  const bar = (v) => <div style={{ flex: 1, height: 6, background: "#1a1a24", borderRadius: 3, overflow: "hidden" }}><div style={{ width: `${Math.min(100, v)}%`, height: "100%", background: v > 85 ? RED : v > 65 ? AMBER : GREEN }} /></div>;

  return (
    <div style={S.root}>
      <div style={{ color: ACCENT, fontSize: 10, letterSpacing: 2 }}>PINTEREST · MYSQL SHARDING (2012) — INTERACTIVE</div>
      <div style={{ color: "#edeff3", fontSize: 16, margin: "4px 0 2px", fontWeight: 700 }}>Shard or do not shard</div>
      <p style={{ color: "#8b90a0", fontSize: 11, margin: 0 }}>Ride the 2011 curve to the single-box ceiling, meet both doors out — and then make placement arithmetic.</p>
      <ContextBlock />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
        <div style={{ ...S.panel, flex: "1 1 250px", minWidth: 250 }}>
          <div style={S.label}>THE CURVE · MONTH {w.months} · {w.pinsB}B PINS</div>
          <button style={S.btn(false, w.era === "cluster" && w.crashed)} disabled={w.era === "cluster" && w.crashed} onClick={grow}>A MONTH OF HYPERGROWTH PASSES<div style={{ color: "#6b7080", fontSize: 10 }}>+35% data — 2011 doesn't wait</div></button>
          <div style={{ ...S.label, marginTop: 12 }}>THE FORK {w.era === "onebox" && w.load >= 100 ? "· THE CEILING IS HERE" : ""}</div>
          <button style={S.btn(w.era === "cluster", !(w.era === "onebox" && w.load >= 100))} disabled={!(w.era === "onebox" && w.load >= 100)} onClick={() => setW(x => ({ ...x, era: "cluster", clusterMonths: 0 }))}>BET ON AUTO-SCALING CLUSTERING<div style={{ color: "#6b7080", fontSize: 10 }}>MongoDB / Cassandra / Membase, 2011 vintage</div></button>
          <button style={S.btn(w.era === "sharded", !((w.era === "onebox" && w.load >= 100) || w.crashed))} disabled={!((w.era === "onebox" && w.load >= 100) || w.crashed)} onClick={() => setW(x => ({ ...x, era: "sharded" }))}>SHARD BY HAND ON BORING MYSQL<div style={{ color: "#6b7080", fontSize: 10 }}>4,096 virtual shards, master-master pairs</div></button>
          <div style={{ ...S.label, marginTop: 12 }}>OPERATE THE SHARDS</div>
          <button style={S.btn(false, w.era !== "sharded")} disabled={w.era !== "sharded"} onClick={createPin}>CREATE A PIN (compose its ID)</button>
          <button style={S.btn(w.decomposed, w.era !== "sharded")} disabled={w.era !== "sharded"} onClick={() => setW(x => ({ ...x, decomposed: true, lastId: null }))}>WHERE DOES PIN …325 LIVE?<div style={{ color: "#6b7080", fontSize: 10 }}>decompose the post's real Pin ID</div></button>
          <button style={S.btn(false, w.era !== "sharded")} disabled={w.era !== "sharded"} onClick={runJoin}>LOAD A BOARD (application-layer join)</button>
          <button style={{ ...S.btn(false, !hot), ...(hot ? { border: `1px solid ${VIOLET}`, boxShadow: `0 0 8px ${VIOLET}55` } : {}) }} disabled={!hot} onClick={split}>SPLIT MySQL001A's RANGE → NEW PAIR</button>
          <button style={S.btn(false, w.era !== "sharded" || w.alterAsked)} disabled={w.era !== "sharded" || w.alterAsked} onClick={() => setW(x => ({ ...x, alterAsked: true }))}>ALTER TABLE pins ADD COLUMN…?</button>
          <button style={{ ...S.btn(false, false), marginTop: 12 }} onClick={() => setW(initial())}>↺ RESET TO 2011</button>
        </div>

        <div style={{ flex: "2 1 420px", minWidth: 300 }}>
          <div style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${verdict.c}`, background: `${verdict.c}14`, marginBottom: 12 }}>
            <div style={{ color: verdict.c, fontWeight: 700 }}>{verdict.code}</div>
            <div style={{ marginTop: 5, fontSize: 11.5, lineHeight: 1.6 }}>{verdict.t}</div>
          </div>
          <div style={S.panel}>
            {w.era !== "sharded" ? (
              <div>
                <div style={S.label}>{w.era === "onebox" ? "ONE MYSQL BOX — EVERYTHING, EVERYWHERE" : "THE CLUSTER (a black box, by design)"}</div>
                {w.era === "onebox" ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
                    <div style={{ fontSize: 11, width: 90 }}>load {w.load}%</div>{bar(w.load)}
                  </div>
                ) : (
                  <div style={{ marginTop: 10, fontSize: 11, color: w.crashed ? RED : "#8b90a0" }}>{w.crashed ? "▓▓ CATASTROPHIC FAILURE ▓▓ — rebalancer wedged, nodes flapping, data unreachable. You cannot see inside." : "auto-sharding · auto-rebalancing · nothing to operate (yet)"}</div>
                )}
              </div>
            ) : (
              <div>
                <div style={S.label}>SHARD MAP (ZooKeeper) — ranges → master-master pairs · production reads MASTERS ONLY</div>
                {w.hosts.map(h => (
                  <div key={h.name} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                    <div style={{ width: 100, fontSize: 10.5, fontWeight: 700 }}>{h.name}<span style={{ color: "#6b7080" }}>/B</span></div>
                    <div style={{ width: 110, fontSize: 10, color: "#6b7080" }}>shards {h.range[0]}–{h.range[1]}</div>
                    {bar(h.load)}
                    <div style={{ width: 40, textAlign: "right", fontSize: 10, color: h.load > 85 ? RED : "#8b90a0" }}>{h.load}%</div>
                  </div>
                ))}
                {(w.lastId || w.decomposed) && (
                  <div style={{ marginTop: 12, background: "#0b0e12", border: "1px solid #2a2a3a", borderRadius: 6, padding: 10 }}>
                    <div style={S.label}>{w.lastId ? "ID COMPOSED — your new Pin" : `ID DECOMPOSED — ${SAMPLE_ID}`}</div>
                    <div style={{ display: "flex", gap: 4, marginTop: 8, fontSize: 10.5, textAlign: "center" }}>
                      <div style={{ flex: 16, background: "rgba(230,0,35,0.12)", border: `1px solid ${ACCENT}`, borderRadius: 4, padding: "6px 2px" }}>shard<br /><b>{w.lastId ? w.lastId.shard : d.shard}</b><br /><span style={{ color: "#6b7080" }}>16 bits</span></div>
                      <div style={{ flex: 10, background: "#14141d", border: "1px solid #2a2f45", borderRadius: 4, padding: "6px 2px" }}>type<br /><b>{w.lastId ? w.lastId.type : d.type} (Pin)</b><br /><span style={{ color: "#6b7080" }}>10 bits</span></div>
                      <div style={{ flex: 36, background: "#14141d", border: "1px solid #2a2f45", borderRadius: 4, padding: "6px 2px" }}>local row<br /><b>{w.lastId ? w.lastId.local : d.local}</b><br /><span style={{ color: "#6b7080" }}>36 bits</span></div>
                      <div style={{ flex: 4, background: "#0c0d13", border: "1px dashed #2a2f45", borderRadius: 4, padding: "6px 2px", color: "#6b7080" }}>rsv<br />2</div>
                    </div>
                    <div style={{ fontSize: 10, color: "#8b90a0", marginTop: 6 }}>{w.decomposed ? `→ db0${d.shard}.pins, row ${d.local} — found with two shifts and a mask.` : "address = (shard ≪ 46) | (type ≪ 36) | local — and it can never change."}</div>
                  </div>
                )}
                {w.joinLog.length > 0 && (
                  <div style={{ marginTop: 10, background: "#0b0e12", border: "1px solid #2a2a3a", borderRadius: 6, padding: 10, fontSize: 10.5, whiteSpace: "pre-wrap", color: "#9aa0b0" }}>{w.joinLog.join("\n")}</div>
                )}
                {w.alterAsked && (
                  <div style={{ marginTop: 10, fontSize: 11, color: GREEN }}>No ALTER needed — teach the services the JSON has a new field, with a default for old blobs. (Pinterest: ~1 ALTER in 3 years.)</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ color: "#6b7080", fontSize: 10, marginTop: 12, borderTop: "1px solid #2a2a3a", paddingTop: 8, lineHeight: 1.7 }}>
        The 2011 hypergrowth and September over-capacity moment, the catastrophic NoSQL failures and slave-lag bugs, the 4,096 virtual shards (of 65,536 possible) on master-master EC2 pairs, the ZooKeeper range config, the 16/10/36-bit ID scheme and worked example (Pin 241294492511762325 → shard 3429, type 1, row 7075733), object JSON blobs with ~1 ALTER in three years, mapping tables with timestamp sequences, memcache/Redis split caching, range splits for capacity, master-only reads, and the no-auto-failover stance are all from the Pinterest post. Load percentages and growth pacing here are illustrative.
        {" "}<a href="https://behindscale.com/articles/pinterest-sharding-mysql" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: "none" }}>From the full dissection at behindscale.com →</a>
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
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 8 }}><span style={lbl}>THE PROBLEM · </span>In 2011 Pinterest grew faster than any startup before it, and 50 billion Pins outgrew what one MySQL box can serve. The two easy exits failed: read slaves bred lag bugs, and every auto-scaling NoSQL store they tried broke catastrophically in production.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>THE MOVE · </span>Shard by hand on boring MySQL: 4,096 virtual shards mapped to master-master pairs via ZooKeeper, and a 64-bit ID that carries its own address — 16 bits of shard, 10 of type, 36 of row. Placement becomes arithmetic; joins move into the application; data never leaves its shard, only shards move between machines.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>TRY · </span>Grow until the one box hits the ceiling, take the clustering door first and watch it break — then shard: compose a Pin ID, decompose the post's real one, run a board load as a two-step application join, and split a hot machine's range when growth comes back for you.</div>
    </div>
  );
}
