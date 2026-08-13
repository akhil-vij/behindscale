import { useState, useEffect } from "react";

const ACCENT = "#4285F4";
const RED = "#ef4444"; const AMBER = "#eab308"; const GREEN = "#22c55e"; const VIOLET = "#9b8cf0";

const MASTER_CAP = 50; const IDEAL_FLASH = 12;
const initial = () => ({ t: 0, files: 30, growth: false, meta: "master", pooled: false, flash: 12 });

function step(w) {
  const n = { ...w };
  n.t++;
  if (n.growth) n.files = Math.min(900, Math.round(n.files * 1.06 + 2));
  return n;
}

function derive(w) {
  const metaLoad = Math.round(w.files * 0.9);
  const metaCap = w.meta === "master" ? MASTER_CAP : 10000;
  const walled = metaLoad > metaCap;
  const I = Math.round(40 + 35 * Math.sin(w.t / 6)); // interactive wave, peak 75
  const BATCH = 45;
  let served, cap, util, wasted;
  if (!w.pooled) { // silos: each provisioned for its own peak
    cap = 80 + 50; served = I + BATCH; util = Math.round((served / cap) * 100); wasted = cap - served;
  } else {
    cap = 95; const batchAdmitted = Math.max(0, Math.min(BATCH, cap - I));
    served = I + batchAdmitted; util = Math.round((served / cap) * 100); wasted = cap - served;
  }
  const diskOver = Math.max(0, (IDEAL_FLASH - w.flash) * 6); // disks doing flash's job
  const flashWaste = Math.max(0, w.flash - (IDEAL_FLASH + 8));
  return { metaLoad, metaCap, walled, I, util, wasted, diskOver, flashWaste };
}

export { initial, step, derive };

export default function Colossus() {
  const [w, setW] = useState(initial);
  useEffect(() => { const id = setInterval(() => setW(step), 700); return () => clearInterval(id); }, []);
  const d = derive(w);

  const verdict = (() => {
    if (d.walled) return { c: RED, code: "THE GFS WALL", t: `The metadata service is a single bounded master: ${d.metaLoad} units of load against a hard cap of ${d.metaCap}. New files are starting to fail, and racking more disks changes nothing, because the one layer that knows where everything lives cannot grow. This is the ceiling that motivated Colossus: 'scaling limits… trying to accommodate metadata related to Search.' Switch to distributed Curators.` };
    if (w.meta === "master") return { c: AMBER, code: "THE METADATA PLANE IS THE FLOOR EVERYTHING STANDS ON", t: `Every file operation (create, open, find which servers hold the pieces) has to ask the metadata service where things live. Right now that service is a single bounded master: ${d.metaLoad} of ${d.metaCap} units of load. Racking more disks or file servers changes nothing if this one layer cannot grow - this is exactly where GFS topped out. Turn on FILE GROWTH to push it toward the wall.` };
    if (w.meta === "curators" && w.files > 300) return { c: GREEN, code: "THE CEILING MOVED - 100x", t: `${w.files}M files and climbing; Curators scale horizontally and the metadata lives in Bigtable, a database built to scale out. The post's number for this move: over 100x the largest GFS clusters. The ceiling isn't gone (it's now Bigtable's ceiling) but it's far away. ${w.pooled ? "" : "Now the economics: pool each workload's separate storage into one shared pool."}` };
    if (d.diskOver > 20) return { c: RED, code: "THE DISKS ARE DOING FLASH'S JOB", t: `Flash at ${w.flash}% is below the workload's needs: hot-data I/O density is landing on spinning disks, which cannot serve it - latency climbs and IOPS are the bottleneck while capacity sits unused. The doctrine: buy just enough flash to pull I/O density per gigabyte into what disks natively provide. Add flash.` };
    if (d.flashWaste > 0) return { c: AMBER, code: "FLASH YOU'RE NOT USING", t: `Flash at ${w.flash}% absorbs the hot set with room to spare - the extra points are expensive devices doing a cheap device's work. Efficiency is a two-sided target: too little drowns the disks, too much burns money. Walk it back toward 'just enough' (~${IDEAL_FLASH}%).` };
    if (w.pooled) return { c: GREEN, code: "BATCH FILLS THE VALLEYS", t: `One shared pool: live serving is at ${d.I} units of its 75-unit peak, and batch analytics fills the slack - utilization ${d.util}% with ${d.wasted} units idle. Each workload still feels like it has its own private file system, but that separation is now an illusion Colossus actively maintains, not a physical fact: that is the price of the efficiency. Now tune the flash mix.` };
    if (w.flash >= IDEAL_FLASH - 2 && w.flash <= IDEAL_FLASH + 6) return { c: GREEN, code: "JUST ENOUGH FLASH", t: `Flash at ${w.flash}%: hot data served at flash latency, disks kept full and busy at disk-native I/O density, nothing overprovisioned. New (hottest) data spreads across all drives; as it cools it rebalances to larger-capacity drives - the same doctrine, inside the disk tier.` };
    return { c: AMBER, code: "TWO SILOS, TWO PEAKS, PAID TWICE", t: `Live serving and batch analytics each own separate storage (a silo) sized for its own busy peak: utilization ${d.util}%, with ${d.wasted} units bought and sitting idle right now. Every quiet stretch in every silo is wasted capacity. Turn on FILE GROWTH to find the metadata wall, or POOL THE SEPARATE STORAGE to share one pool instead.` };
  })();

  const mono = "'JetBrains Mono','Fira Code',ui-monospace,monospace";
  const S = {
    root: { background: "#08090D", color: "#c8cdd8", fontFamily: mono, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid #2a2a3a", fontSize: 12, lineHeight: 1.5 },
    panel: { background: "#111118", border: "1px solid #2a2a3a", borderRadius: 8, padding: 12 },
    label: { color: "#6b7080", fontSize: 10, letterSpacing: 1.2 },
    btn: (on, dis, col) => ({ display: "block", width: "100%", textAlign: "left", padding: "7px 9px", marginTop: 6, borderRadius: 6, cursor: dis ? "not-allowed" : "pointer", opacity: dis ? 0.35 : 1, border: `1px solid ${on ? (col || ACCENT) : "#4a4f60"}`, color: on ? "#cfe0ff" : "#8b90a0", background: on ? "rgba(66,133,244,0.10)" : "#0c0d13", fontFamily: mono, fontSize: 11 }),
  };
  const bar = (v, max, col) => <div style={{ height: 10, background: "#0c0d13", border: "1px solid #2a2a3a", borderRadius: 4, overflow: "hidden" }}><div style={{ width: Math.min(100, (v / max) * 100) + "%", height: "100%", background: col }} /></div>;

  return (
    <div style={S.root}>
      <div style={{ color: ACCENT, fontSize: 10, letterSpacing: 2 }}>GOOGLE · COLOSSUS UNDER THE HOOD - INTERACTIVE</div>
      <div style={{ color: "#edeff3", fontSize: 16, margin: "4px 0 2px", fontWeight: 700 }}>The ceiling was metadata</div>
      <p style={{ color: "#8b90a0", fontSize: 11, margin: 0 }}>You run a cluster-scale file system. Find the wall that stopped GFS, move it, then run the efficiency doctrine: pool the silos, size the flash.</p>
      <ContextBlock />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
        <div style={{ ...S.panel, flex: "1 1 250px", minWidth: 250 }}>
          <div style={S.label}>THE CLUSTER</div>
          <button style={S.btn(w.growth, false, AMBER)} onClick={() => setW(x => ({ ...x, growth: !x.growth }))}>FILE GROWTH: {w.growth ? "ON (Search-era)" : "OFF"}<div style={{ color: "#6b7080", fontSize: 10 }}>the metadata service's load grows with the number of files, not their size</div></button>
          <button style={S.btn(w.meta === "curators", w.meta === "curators", GREEN)} disabled={w.meta === "curators"} onClick={() => setW(x => ({ ...x, meta: "curators" }))}>SWITCH TO DISTRIBUTED CURATORS<div style={{ color: "#6b7080", fontSize: 10 }}>the metadata service scales out; metadata moves to Bigtable</div></button>
          <button style={S.btn(w.pooled, false, VIOLET)} onClick={() => setW(x => ({ ...x, pooled: !x.pooled }))}>{w.pooled ? "POOLED: ONE SHARED POOL" : "POOL THE SEPARATE STORAGE"}<div style={{ color: "#6b7080", fontSize: 10 }}>one pool for all workloads: size it for the busy peaks, let batch work fill the quiet times</div></button>
          <div style={{ ...S.label, marginTop: 12 }}>FLASH TIER (fast storage): {w.flash}%</div>
          <div style={{ display: "flex", gap: 6 }}>
            <button style={{ ...S.btn(false, w.flash <= 4), flex: 1 }} disabled={w.flash <= 4} onClick={() => setW(x => ({ ...x, flash: x.flash - 4 }))}>− LESS FLASH</button>
            <button style={{ ...S.btn(false, w.flash >= 28), flex: 1 }} disabled={w.flash >= 28} onClick={() => setW(x => ({ ...x, flash: x.flash + 4 }))}>+ MORE FLASH</button>
          </div>
          <button style={{ ...S.btn(false, false), marginTop: 12 }} onClick={() => setW(initial())}>↺ RESET</button>
        </div>

        <div style={{ flex: "2 1 440px", minWidth: 300 }}>
          <div style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${verdict.c}`, background: `${verdict.c}14`, marginBottom: 12 }}>
            <div style={{ color: verdict.c, fontWeight: 700 }}>{verdict.code}</div>
            <div style={{ marginTop: 5, fontSize: 11.5, lineHeight: 1.6 }}>{verdict.t}</div>
          </div>
          <div style={S.panel}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={S.label}>METERS</div>
              <div style={{ fontSize: 10, color: "#6b7080" }}>t={w.t} · files: {w.files}M · metadata: {w.meta === "master" ? "SINGLE MASTER" : "CURATORS + BIGTABLE"}</div>
            </div>
            <div style={{ marginTop: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={S.label}>METADATA LOAD {w.meta === "master" ? `(cap ${MASTER_CAP})` : "(scales out)"}</span><span style={{ fontSize: 11, color: d.walled ? RED : "#c8cdd8" }}>{d.metaLoad}{d.walled ? " · THROTTLING CREATES" : ""}</span></div>
              {bar(d.metaLoad, w.meta === "master" ? 100 : 900, d.walled ? RED : GREEN)}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}><span style={S.label}>POOL UTILIZATION ({w.pooled ? "shared pool" : "two silos"})</span><span style={{ fontSize: 11 }}>{d.util}% · idle {d.wasted}u</span></div>
              {bar(d.util, 100, d.util > 75 ? GREEN : AMBER)}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}><span style={S.label}>DISK I/O PRESSURE (hot data off-flash)</span><span style={{ fontSize: 11, color: d.diskOver > 20 ? RED : "#c8cdd8" }}>{d.diskOver}</span></div>
              {bar(d.diskOver, 60, d.diskOver > 20 ? RED : GREEN)}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              <div style={{ flex: 1 }}><div style={S.label}>INTERACTIVE WAVE</div><div style={{ fontSize: 13, fontWeight: 700 }}>{d.I}/75</div></div>
              <div style={{ flex: 1 }}><div style={S.label}>CREATES</div><div style={{ fontSize: 13, fontWeight: 700, color: d.walled ? RED : GREEN }}>{d.walled ? "THROTTLED" : "FLOWING"}</div></div>
              <div style={{ flex: 1 }}><div style={S.label}>FLASH MIX</div><div style={{ fontSize: 13, fontWeight: 700, color: d.diskOver > 20 ? RED : d.flashWaste > 0 ? AMBER : GREEN }}>{d.diskOver > 20 ? "TOO LEAN" : d.flashWaste > 0 ? "OVERBOUGHT" : "JUST ENOUGH"}</div></div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ color: "#6b7080", fontSize: 10, marginTop: 12, borderTop: "1px solid #2a2a3a", paddingTop: 8, lineHeight: 1.7 }}>
        The GFS metadata scaling limit as Colossus's stated origin, the distributed metadata model (horizontally scalable Curators, metadata in Bigtable, 100x over the largest GFS clusters), direct client-to-D-server data flow, Custodians' background maintenance, single clusters at exabyte scale across tens of thousands of machines, the shared pool serving VM traffic, YouTube serving, and Ads MapReduce under an isolation illusion, peak-provisioning with batch backfill, service tiers as abstract provisioned units, the just-enough-flash sizing rule, and the spread-new-data / rebalance-as-it-cools disk doctrine are all from Google's 2021 Cloud blog post by Hildebrand and Serenyi. The capacities, the master's cap, the demand wave, the flash percentages, and all tick dynamics are an illustrative miniature calibrated to the stated relationships, not Google's numbers. A 2025 companion post on data placement was not used as a source for this dissection.
        {" "}<a href="https://behindscale.com/articles/google-colossus" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: "none" }}>From the full dissection at behindscale.com →</a>
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
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 8 }}><span style={lbl}>THE PROBLEM · </span>Google's original file system, GFS, hit a ceiling that wasn't disks or bandwidth - it was the metadata service, the bookkeeping layer that tracks what files exist and where their pieces live. Every operation consults it, and when it can't grow, the whole cluster can't, no matter how much hardware you add.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>THE MOVE · </span>Colossus rebuilt the metadata as a distributed service: many Curators storing metadata in Bigtable, a database built to scale out, buying 100x the scale. Then it made one giant pool serve everything at once: size it for the latency-critical peaks, let batch work fill the quiet times, and buy just enough fast flash storage to keep the disks doing what disks are good at.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>TRY · </span>Grow the file count until the single metadata master can't keep up and new files start failing, even with disk space to spare. Switch to distributed Curators and grow far past it. Pool each workload's separate storage into one shared pool and see how much less sits idle. Then size the flash (fast storage) tier: both mistakes are one button away.</div>
    </div>
  );
}
