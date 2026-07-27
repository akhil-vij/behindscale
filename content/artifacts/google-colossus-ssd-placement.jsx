import { useState, useEffect } from "react";

const ACCENT = "#4285F4"; const ACCENT_TXT = "#8AB4F8";
const RED = "#ef4444"; const AMBER = "#eab308"; const GREEN = "#22c55e"; const VIOLET = "#9b8cf0"; const GRAY = "#5a6070";

export const HDD_CAP = 70;
export const SSD_BUDGET = 40;
export const LEARN_LAG = 12;
// per-tick ops per workload category: writes, young reads (data just created), old reads (data past the SSD window)
export const CATS = {
  eph: { w: 30, yr: 60, or: 0 },
  logs: { w: 40, yr: 5, or: 5 },
  hot: { w: 10, yr: 25, or: 25 },
  cold: { w: 15, yr: 0, or: 5 },
};
export const COLD_SHIFTED_OR = 60;

export const initial = () => ({
  t: 0, policy: "allhdd", shifted: false, shiftT: 0, relearned: false,
  lat: 8, hddOps: 0, ssdUse: 0,
  cat: { eph: { hdd: 0, ssd: 0 }, logs: { hdd: 0, ssd: 0 }, hot: { hdd: 0, ssd: 0 }, cold: { hdd: 0, ssd: 0 } },
});

export function step(w) {
  const n = { ...w, cat: {} };
  n.t++;
  if (n.shifted && !n.relearned && n.t - n.shiftT >= LEARN_LAG) n.relearned = true;
  const coldOr = n.shifted ? COLD_SHIFTED_OR : CATS.cold.or;

  // route each category's ops to HDD vs SSD under the active placement regime
  const route = {
    allhdd: {
      eph: [CATS.eph.w + CATS.eph.yr + CATS.eph.or, 0],
      logs: [CATS.logs.w + CATS.logs.yr + CATS.logs.or, 0],
      hot: [CATS.hot.w + CATS.hot.yr + CATS.hot.or, 0],
      cold: [CATS.cold.w + coldOr, 0],
      ssdUse: 0,
    },
    force: {
      eph: [0, CATS.eph.w + CATS.eph.yr], logs: [0, CATS.logs.w + CATS.logs.yr + CATS.logs.or],
      hot: [0, CATS.hot.w + CATS.hot.yr + CATS.hot.or], cold: [0, CATS.cold.w + coldOr],
      ssdUse: 100,
    },
    cache: {
      // read cache: every write lands on HDD; re-reads are served from SSD after first-read misses
      eph: [CATS.eph.w + 30, 30],
      logs: [CATS.logs.w + 3 + CATS.logs.or, 2],
      hot: [CATS.hot.w + 12 + 5, 13 + 20],
      cold: n.shifted ? [CATS.cold.w + 15, 45] : [CATS.cold.w + coldOr, 0],
      ssdUse: 22,
    },
    writeback: {
      // learned placement: hot-at-birth categories are born on SSD and migrate down later;
      // ephemeral data dies before migration and never touches HDD at all
      eph: [0, CATS.eph.w + CATS.eph.yr],
      logs: [5 + CATS.logs.or, CATS.logs.w + CATS.logs.yr],
      hot: [3 + 5, CATS.hot.w + CATS.hot.yr + 20],
      cold: (n.shifted && n.relearned)
        ? [5, CATS.cold.w + coldOr]
        : [CATS.cold.w + coldOr, 0],
      ssdUse: (n.shifted && n.relearned) ? 40 : 30,
    },
  }[n.policy];

  n.cat = {
    eph: { hdd: route.eph[0], ssd: route.eph[1] },
    logs: { hdd: route.logs[0], ssd: route.logs[1] },
    hot: { hdd: route.hot[0], ssd: route.hot[1] },
    cold: { hdd: route.cold[0], ssd: route.cold[1] },
  };
  n.ssdUse = route.ssdUse;
  n.hddOps = n.cat.eph.hdd + n.cat.logs.hdd + n.cat.hot.hdd + n.cat.cold.hdd;

  // read latency follows HDD queue pressure: gentle under capacity, steep past it
  const load = n.hddOps / HDD_CAP;
  const target = load <= 1 ? 8 + load * 14 : 22 + (load - 1) * 120;
  n.lat = Math.min(300, n.lat + (target - n.lat) * 0.5);
  return n;
}

export default function Colossus() {
  const [w, setW] = useState(initial);
  useEffect(() => { const id = setInterval(() => setW(step), 650); return () => clearInterval(id); }, []);

  const verdict = (() => {
    if (w.policy === "force")
      return { c: AMBER, code: "SSD PERFORMANCE AT SSD PRICES", t: `Latency is superb — nothing touches a spinning disk — and the flash budget is blown: ${w.ssdUse} units resident against a budget of ${SSD_BUDGET}. This is the placement problem solved by purchasing, which is exactly what a blended fleet exists to avoid: an SSD-only fleet still carries a substantial cost premium, so the right data has to be found, not bought.` };
    if (w.policy === "allhdd")
      return { c: RED, code: "ALL THE DATA, ON ALL THE SLOW DISKS", t: `Four workloads — ephemeral batch intermediates, chatty transaction logs, hot serving data, cold archive — are pushing ${w.hddOps} operations per tick at spindles that can take ${HDD_CAP}. Read latency is ${Math.round(w.lat)}ms and queueing. It's hard to read fast when everything lives on the slow tier: placement, not hardware, is the first bottleneck. Try the other regimes.` };
    if (w.policy === "cache")
      return { c: AMBER, code: "WRITTEN, READ, DELETED — NEVER CACHED", t: `The read cache is earning its keep on re-read data — the hot category's repeat reads come from flash now — but every WRITE still lands on HDD first (${w.cat.eph.hdd + w.cat.logs.hdd} ops/tick from just the ephemeral and log workloads). Batch intermediates die before the cache can help them, and tiny log appends hammer the spindles directly. Data that is hot at birth needs to be placed on flash, not promoted to it.` };
    if (w.shifted && !w.relearned)
      return { c: RED, code: "THE FUTURE CHANGED UNDER THE POLICY", t: `The cold archive category just turned hot — reads jumped to ${COLD_SHIFTED_OR}/tick — but its governing policy was learned from its history: don't place on SSD. Every one of those reads is going to spinning disks (${w.cat.cold.hdd} HDD ops/tick), and latency shows it (${Math.round(w.lat)}ms). The bet is category-scoped and self-correcting, but until the online simulation re-decides, the placement layer is serving the workload that used to exist.` };
    if (w.shifted && w.relearned)
      return { c: GREEN, code: "THE SIMULATION RE-DECIDED", t: `The simulations watched the cold category's new I/O pattern, and a different policy now wins: place on SSD. Reads moved to flash, HDD load fell to ${w.hddOps} ops/tick, latency recovered to ${Math.round(w.lat)}ms — and SSD residency (${w.ssdUse}/${SSD_BUDGET}) is exactly at budget, which is the other thing the same simulations report: how much flash the fleet now needs.` };
    return { c: GREEN, code: "SSD PERFORMANCE AT HDD PRICES", t: `Learned placement, per category: ephemeral intermediates are born on flash and deleted before migration — zero HDD operations, ever. Log appends land on SSD and only aged segments migrate down. Hot data serves its youth from flash and its old age through the read cache. Cold archive goes straight to cheap disks, wasting nothing. HDD load: ${w.hddOps}/${HDD_CAP} ops. Latency: ${Math.round(w.lat)}ms. Now hit PATTERN SHIFT and change a workload's future under the policy.` };
  })();

  const mono = "'JetBrains Mono','Fira Code',ui-monospace,monospace";
  const S = {
    root: { background: "#08090D", color: "#c8cdd8", fontFamily: mono, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid #2a2a3a", fontSize: 12, lineHeight: 1.5 },
    panel: { background: "#111118", border: "1px solid #2a2a3a", borderRadius: 8, padding: 12 },
    label: { color: "#6b7080", fontSize: 10, letterSpacing: 1.2 },
    btn: (on, col) => ({ display: "block", width: "100%", textAlign: "left", padding: "7px 9px", marginTop: 6, borderRadius: 6, cursor: "pointer", border: `1px solid ${on ? (col || ACCENT) : "#2a2a3a"}`, color: on ? "#d7e5fb" : "#8b90a0", background: on ? "rgba(66,133,244,0.13)" : "#0c0d13", fontFamily: mono, fontSize: 11 }),
  };
  const bar = (v, max, col) => <div style={{ height: 10, background: "#0c0d13", border: "1px solid #2a2a3a", borderRadius: 4, overflow: "hidden" }}><div style={{ width: Math.min(100, (v / max) * 100) + "%", height: "100%", background: col }} /></div>;
  const catRow = (name, c, col, extra) => {
    const tot = c.hdd + c.ssd;
    return (
      <div style={{ marginTop: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={S.label}>{name}{extra || ""}</span>
          <span style={{ fontSize: 11 }}><span style={{ color: c.hdd > 0 ? AMBER : "#6b7080" }}>{c.hdd} HDD</span><span style={{ color: "#6b7080" }}> · </span><span style={{ color: c.ssd > 0 ? col : "#6b7080" }}>{c.ssd} SSD</span></span>
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          <div style={{ flex: c.hdd || 0.001 }}>{bar(c.hdd, tot || 1, AMBER)}</div>
          <div style={{ flex: c.ssd || 0.001 }}>{bar(c.ssd, tot || 1, col)}</div>
        </div>
      </div>
    );
  };

  return (
    <div style={S.root}>
      <div style={{ color: ACCENT_TXT, fontSize: 10, letterSpacing: 2 }}>GOOGLE · COLOSSUS L4 — SSD PLACEMENT — INTERACTIVE</div>
      <div style={{ color: "#edeff3", fontSize: 16, margin: "4px 0 2px", fontWeight: 700 }}>Betting on a file's future</div>
      <p style={{ color: "#8b90a0", fontSize: 11, margin: 0 }}>You run one storage cluster. Every file's placement is decided at creation — before anyone knows how it will be used. Flash is fast and scarce; spinning disks are cheap and slow.</p>
      <ContextBlock />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
        <div style={{ ...S.panel, flex: "1 1 250px", minWidth: 250 }}>
          <div style={S.label}>PLACEMENT REGIME</div>
          <button style={S.btn(w.policy === "allhdd", RED)} onClick={() => setW(x => ({ ...x, policy: "allhdd" }))}>ALL ON HDD<div style={{ color: "#6b7080", fontSize: 10 }}>the cheap default — everything on spindles</div></button>
          <button style={S.btn(w.policy === "force", AMBER)} onClick={() => setW(x => ({ ...x, policy: "force" }))}>FORCE ALL TO SSD<div style={{ color: "#6b7080", fontSize: 10 }}>the expensive escape hatch — everything on flash</div></button>
          <button style={S.btn(w.policy === "cache")} onClick={() => setW(x => ({ ...x, policy: "cache" }))}>L4 READ CACHE<div style={{ color: "#6b7080", fontSize: 10 }}>writes land on HDD; re-read data promoted to flash</div></button>
          <button style={S.btn(w.policy === "writeback", GREEN)} onClick={() => setW(x => ({ ...x, policy: "writeback" }))}>L4 WRITEBACK (LEARNED)<div style={{ color: "#6b7080", fontSize: 10 }}>categories learned from features; hot-at-birth data born on SSD, migrated down later</div></button>
          <div style={{ ...S.label, marginTop: 12 }}>WORKLOAD</div>
          <button style={S.btn(!w.shifted, GREEN)} onClick={() => setW(x => ({ ...x, shifted: false, relearned: false }))}>STEADY PATTERNS</button>
          <button style={S.btn(w.shifted, RED)} onClick={() => setW(x => (x.shifted ? x : { ...x, shifted: true, shiftT: x.t, relearned: false }))}>PATTERN SHIFT: ARCHIVE TURNS HOT<div style={{ color: "#6b7080", fontSize: 10 }}>the cold category's reads jump — its learned policy is now wrong</div></button>
          <button style={{ ...S.btn(false), marginTop: 12 }} onClick={() => setW(initial())}>↺ RESET</button>
        </div>

        <div style={{ flex: "2 1 440px", minWidth: 300 }}>
          <div style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${verdict.c}`, background: `${verdict.c}14`, marginBottom: 12 }}>
            <div style={{ color: verdict.c, fontWeight: 700 }}>{verdict.code}</div>
            <div style={{ marginTop: 5, fontSize: 11.5, lineHeight: 1.6 }}>{verdict.t}</div>
          </div>
          <div style={S.panel}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={S.label}>WHERE EACH WORKLOAD'S I/O LANDS (ops/tick)</div>
              <div style={{ fontSize: 10, color: "#6b7080" }}>t={w.t}</div>
            </div>
            {catRow("EPHEMERAL — batch intermediates (die young)", w.cat.eph, VIOLET)}
            {catRow("LOGS — many tiny appends", w.cat.logs, AMBER === "#eab308" ? "#d4a017" : AMBER)}
            {catRow("HOT — serving data (re-read for a long time)", w.cat.hot, ACCENT)}
            {catRow("COLD — archive", w.cat.cold, GRAY, w.shifted ? " · SHIFTED HOT" : "")}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}><span style={S.label}>HDD LOAD (capacity {HDD_CAP} ops/tick)</span><span style={{ fontSize: 11, color: w.hddOps > HDD_CAP ? RED : w.hddOps > HDD_CAP * 0.8 ? AMBER : GREEN }}>{w.hddOps} ops</span></div>
            {bar(w.hddOps, 220, w.hddOps > HDD_CAP ? RED : GREEN)}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}><span style={S.label}>SSD RESIDENCY (budget {SSD_BUDGET})</span><span style={{ fontSize: 11, color: w.ssdUse > SSD_BUDGET ? RED : "#c8cdd8" }}>{w.ssdUse} units</span></div>
            {bar(w.ssdUse, 100, w.ssdUse > SSD_BUDGET ? RED : ACCENT)}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}><span style={S.label}>READ LATENCY</span><span style={{ fontSize: 11, color: w.lat > 100 ? RED : w.lat > 40 ? AMBER : GREEN }}>{Math.round(w.lat)}ms</span></div>
            {bar(w.lat, 300, w.lat > 100 ? RED : w.lat > 40 ? AMBER : GREEN)}
          </div>
        </div>
      </div>

      <div style={{ color: "#6b7080", fontSize: 10, marginTop: 12, borderTop: "1px solid #2a2a3a", paddingTop: 8, lineHeight: 1.7 }}>
        The blended SSD+HDD fleet and its cost rationale, the three manual placement options, L4's read-cache flow (index servers, insert-on-miss, ML-selected insertion policies), the read cache's structural weakness for write-read-delete data and tiny log appends, the writeback design (application-passed features, file categories, observed per-category I/O, online simulation of place-for-one-hour / two-hours / don't policies), the migrate-down-after-a-window lifecycle with deletion-before-migration as the best case, and the simulations doubling as SSD purchase and capacity-planning signals are all from Google Cloud's post "Colossus under the hood: How we deliver SSD performance at HDD prices" (Greenfield &amp; Pollen, 2025), with the architecture background from Google's 2021 Colossus post. The four workload categories' op counts, the disk capacity of 70 ops, the SSD budget, the routing splits, and the relearning lag are an illustrative miniature calibrated to reproduce the stated relationships — Google publishes the mechanisms, not these magnitudes.
        {" "}<a href="https://behindscale.com/articles/google-colossus-ssd-placement" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT_TXT, textDecoration: "none" }}>From the full dissection at behindscale.com →</a>
      </div>
    </div>
  );
}

function ContextBlock() {
  const [open, setOpen] = useState(true);
  const lbl = { fontSize: 10, color: ACCENT_TXT, letterSpacing: 1.2 };
  if (!open) return <button onClick={() => setOpen(true)} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontFamily: "inherit", fontSize: 10, padding: 0, margin: "10px 0 0", display: "block" }}>SHOW CONTEXT ▾</button>;
  return (
    <div style={{ background: "#111118", border: "1px solid #2a2a3a", borderRadius: 8, padding: "12px 14px", marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <div style={{ fontSize: 10, color: "#6b7080", letterSpacing: 1.2 }}>CONTEXT — IF YOU ARRIVED HERE WITHOUT THE ARTICLE</div>
        <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontFamily: "inherit", fontSize: 10, padding: 0 }}>HIDE ✕</button>
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 8 }}><span style={lbl}>THE PROBLEM · </span>Google's Colossus filesystems hold exabytes and serve tens of terabytes per second — speed that only happens if the right data sits on fast flash while the bulk stays on cheap spinning disks. But where a file lives is decided when it's created, and at that moment the system can see only the application creating it and the file's name. How the file will actually be used — read constantly, appended in tiny pieces, deleted in an hour, never touched again — is a future that doesn't exist yet.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>THE MOVE · </span>Bet, and industrialize the betting. Applications pass features about each new file; the L4 system sorts files into categories, watches each category's real traffic, and continuously simulates competing placement policies against it — flash for an hour, flash for two hours, straight to disk. The winning policy governs each category's new files: hot-at-birth data is born on flash and migrated to disk after a window, and short-lived data is deleted before migration ever comes due, never touching a spinning disk at all.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>TRY · </span>Run four workloads through four placement regimes. Watch all-HDD saturate the spindles and all-SSD blow the budget. Turn on the read cache and see it help everything except data that's hot at birth. Switch to learned writeback placement, then shift the archive workload's behavior and watch the bet go wrong — and the simulation re-decide.</div>
    </div>
  );
}
