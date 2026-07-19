import { useState, useEffect } from "react";

const ACCENT = "#6366F1";
const RED = "#ef4444"; const AMBER = "#eab308"; const GREEN = "#22c55e";
// steady demand per tier (workers' worth of load); baseline capacity 100
const BASE = { crit: 20, posts: 25, gets: 30, test: 15 };
const TIERS = ["test", "gets", "posts", "crit"]; // shed order, bottom up
const NAME = { crit: "CRITICAL (create charges)", posts: "POSTs", gets: "GETs", test: "TEST MODE" };

const initial = () => ({ t: 0, flood: false, incident: false, rrl: false, fleet: false, worker: false, flap: false, shedLevel: 0, holdTicks: 0, served: { ...BASE }, util: 0.9, rejected: { rrl: 0, fleet: 0, worker: 0 }, chargeOk: 100, lost: 0 });

function step(w) {
  const n = { ...w, served: { ...w.served }, rejected: { ...w.rejected } };
  n.t++;
  const cap = n.incident ? 55 : 100;
  // demand per tier
  const d = { ...BASE };
  if (n.flood) {
    const extra = n.rrl ? 10 : 80; // per-user token buckets cap the runaway script
    if (n.rrl && n.flood) n.rejected.rrl += 70;
    d.test += extra;
  }
  // worker-utilization shedder: ramp shed level against utilization (slowly — or all-at-once in flap mode)
  if (n.worker) {
    n.holdTicks++;
    if (n.flap) { // no damping: overshoot fully, both directions
      if (n.util > 0.92) n.shedLevel = 3;
      else if (n.util < 0.7) n.shedLevel = 0;
    } else if (n.util > 0.92 && n.holdTicks >= 3) { n.shedLevel = Math.min(3, n.shedLevel + 1); n.holdTicks = 0; }
    else if (n.util < 0.7 && n.shedLevel > 0 && n.holdTicks >= 3) { n.shedLevel = Math.max(0, n.shedLevel - 1); n.holdTicks = 0; }
  } else n.shedLevel = 0;
  // apply worker shedding: zero out tiers from the bottom of the ladder
  const demand = { ...d };
  for (let i = 0; i < n.shedLevel; i++) { n.rejected.worker += demand[TIERS[i]]; demand[TIERS[i]] = 0; }
  // admission: critical first if fleet reservation armed, else first-come proportional (priority-blind)
  const total = demand.crit + demand.posts + demand.gets + demand.test;
  if (n.fleet) {
    const nonCritCap = Math.round(cap * 0.8);
    const servedCrit = Math.min(demand.crit, cap);
    let room = Math.min(cap - servedCrit, nonCritCap);
    const nc = demand.posts + demand.gets + demand.test;
    const f = nc > 0 ? Math.min(1, room / nc) : 1;
    n.served = { crit: servedCrit, posts: Math.round(demand.posts * f), gets: Math.round(demand.gets * f), test: Math.round(demand.test * f) };
    if (f < 1) n.rejected.fleet += Math.round(nc * (1 - f));
  } else {
    const f = total > 0 ? Math.min(1, cap / total) : 1; // priority-blind: everyone diluted equally
    n.served = { crit: Math.round(demand.crit * f), posts: Math.round(demand.posts * f), gets: Math.round(demand.gets * f), test: Math.round(demand.test * f) };
  }
  const servedTotal = n.served.crit + n.served.posts + n.served.gets + n.served.test;
  n.util = Math.min(1.35, total === 0 ? 0 : (n.worker ? servedTotal : total) / cap);
  n.chargeOk = Math.round((n.served.crit / BASE.crit) * 100);
  n.lost += Math.max(0, BASE.crit - n.served.crit);
  return n;
}

export default function WhileTheRestIsOnFire() {
  const [w, setW] = useState(initial);
  useEffect(() => { const id = setInterval(() => setW(step), 600); return () => clearInterval(id); }, []);
  const stressed = w.flood || w.incident;

  const verdict = (() => {
    if (w.flap && w.worker && stressed) return { c: RED, code: "FLAPPING — SHED FAST, RESTORE FAST, REGRET BOTH", t: "The shedder reacts instantly in both directions: drop test mode, utilization looks fine, bring it back, everything is awful again. This is the oscillation Stripe tuned away by trial and error — shed and restore must move slowly, and the damping is paid in reaction time. Turn FLAP MODE off and watch the ladder hold a level." };
    if (w.chargeOk < 90 && stressed && !w.fleet && !w.worker) return { c: RED, code: w.flood && !w.rrl ? "CHARGES DIED FOR A TEST SCRIPT" : "PRIORITY-BLIND — EVERYONE DILUTED EQUALLY", t: w.flood && !w.rrl ? "One user's runaway test-mode script is competing head-to-head with charge creation, and the queue doesn't know the difference — every tier is diluted by the same fraction, so the most important traffic fails at the same rate as the least. This is the crux. Arm the REQUEST RATE LIMITER (the everyday fix) or the shedding layers (the emergency one)." : "Capacity shrank and admission is first-come-first-served: charges, analytics reads, and test scripts all take the same haircut. Nothing in the system knows that creating a charge matters more than listing one. Arm the FLEET RESERVATION." };
    if (stressed && w.chargeOk >= 95 && (w.fleet || w.worker || w.rrl)) {
      if (w.flood && w.rrl && !w.fleet && !w.worker) return { c: GREEN, code: "THE EVERYDAY LAYER CAUGHT IT", t: "Token buckets capped the runaway script at its per-user rate — millions-a-month territory for Stripe, boring by design. Note what this layer can't do: try RUN INTERNAL SLOWDOWN, where the excess traffic is legitimate and spread across users, and pacing fairness stops being the right question." };
      return { c: GREEN, code: "THE LADDER HELD", t: `Charges are succeeding at ${w.chargeOk}% while lower tiers absorb the squeeze${w.fleet ? " — the 20% reservation means non-critical traffic can never spend the last of the fleet" : ""}${w.worker && w.shedLevel > 0 ? `. The worker shedder is holding level ${w.shedLevel} (${TIERS.slice(0, w.shedLevel).map(t => NAME[t].split(" ")[0]).join(", ")} shed), moving one rung at a time` : ""}. Importance was decided before the emergency, not during it. Compare CHARGE-CAPACITY LOST across configurations.` };
    }
    if (stressed) return { c: AMBER, code: "UNDER PRESSURE — WATCH THE CRITICAL ROW", t: "Demand exceeds capacity. Whatever admission logic is armed right now is deciding what survives — the charge success gauge is the scoreboard." };
    return { c: AMBER, code: "FOUR LAYERS, ALL QUIET", t: "Baseline traffic fits. Trigger a RUNAWAY TEST SCRIPT (one user, absurd volume) or an INTERNAL SLOWDOWN (capacity 100 → 55) — first with every layer off, to meet the priority-blind default the architecture exists to prevent." };
  })();

  const mono = "'JetBrains Mono','Fira Code',ui-monospace,monospace";
  const S = {
    root: { background: "#08090D", color: "#c8cdd8", fontFamily: mono, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid #2a2a3a", fontSize: 12, lineHeight: 1.5 },
    panel: { background: "#111118", border: "1px solid #2a2a3a", borderRadius: 8, padding: 12 },
    label: { color: "#6b7080", fontSize: 10, letterSpacing: 1.2 },
    btn: (on, dis) => ({ display: "block", width: "100%", textAlign: "left", padding: "7px 9px", marginTop: 6, borderRadius: 6, cursor: dis ? "not-allowed" : "pointer", opacity: dis ? 0.4 : 1, border: `1px solid ${on ? ACCENT : "#2a2a3a"}`, color: on ? "#c7c3ff" : "#8b90a0", background: on ? "rgba(99,102,241,0.10)" : "#0c0d13", fontFamily: mono, fontSize: 11 }),
  };
  const tierRow = (k, i) => {
    const shed = w.worker && w.shedLevel > i;
    const pct = Math.round((w.served[k] / (BASE[k] + (k === "test" && w.flood ? (w.rrl ? 10 : 80) : 0))) * 100);
    return (
      <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, marginTop: 4, background: "#0c0d13", border: `1px ${shed ? "dashed" : "solid"} ${shed ? RED : k === "crit" ? (w.chargeOk >= 95 ? GREEN : w.chargeOk >= 80 ? AMBER : RED) : "#2a2f45"}` }}>
        <div style={{ width: 175, fontSize: 10, fontWeight: k === "crit" ? 700 : 400, color: k === "crit" ? "#edeff3" : "#8b90a0" }}>{NAME[k]}{k === "test" && w.flood ? " ⚠ FLOOD" : ""}</div>
        <div style={{ flex: 1, height: 6, background: "#1a1a24", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ width: `${shed ? 0 : Math.min(100, pct)}%`, height: "100%", background: shed ? RED : k === "crit" ? GREEN : ACCENT, opacity: k === "crit" ? 1 : 0.6 }} />
        </div>
        <div style={{ width: 88, textAlign: "right", fontSize: 10, color: shed ? RED : "#8b90a0" }}>{shed ? "SHED (rung " + (i + 1) + ")" : `${w.served[k]} served`}</div>
      </div>
    );
  };

  return (
    <div style={S.root}>
      <div style={{ color: ACCENT, fontSize: 10, letterSpacing: 2 }}>STRIPE · RATE LIMITERS &amp; LOAD SHEDDERS — INTERACTIVE</div>
      <div style={{ color: "#edeff3", fontSize: 16, margin: "4px 0 2px", fontWeight: 700 }}>While the rest is on fire</div>
      <p style={{ color: "#8b90a0", fontSize: 11, margin: 0 }}>Four tiers of traffic, one pool of workers. When there isn't room for everything, something decides what gets in — or nothing does.</p>
      <ContextBlock />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
        <div style={{ ...S.panel, flex: "1 1 250px", minWidth: 250 }}>
          <div style={S.label}>MAKE TROUBLE</div>
          <button style={S.btn(w.flood, false)} onClick={() => setW(x => ({ ...x, flood: !x.flood }))}>RUNAWAY TEST SCRIPT: {w.flood ? "ON" : "OFF"}<div style={{ color: "#6b7080", fontSize: 10 }}>one user, +80 workers' worth of test-mode calls</div></button>
          <button style={S.btn(w.incident, false)} onClick={() => setW(x => ({ ...x, incident: !x.incident }))}>INTERNAL SLOWDOWN: {w.incident ? "ON" : "OFF"}<div style={{ color: "#6b7080", fontSize: 10 }}>effective capacity 100 → 55; the traffic is all legitimate</div></button>
          <div style={{ ...S.label, marginTop: 12 }}>ARM THE LAYERS (Stripe's build order)</div>
          <button style={S.btn(w.rrl, false)} onClick={() => setW(x => ({ ...x, rrl: !x.rrl }))}>1 · REQUEST RATE LIMITER: {w.rrl ? "ON" : "OFF"}<div style={{ color: "#6b7080", fontSize: 10 }}>token bucket per user — the millions-a-month layer</div></button>
          <button style={S.btn(w.fleet, false)} onClick={() => setW(x => ({ ...x, fleet: !x.fleet }))}>3 · FLEET RESERVATION (20%): {w.fleet ? "ON" : "OFF"}<div style={{ color: "#6b7080", fontSize: 10 }}>critical methods always have fleet; non-critical 503s past 80%</div></button>
          <button style={S.btn(w.worker, false)} onClick={() => setW(x => ({ ...x, worker: !x.worker, shedLevel: 0, holdTicks: 0 }))}>4 · WORKER SHEDDER (the ladder): {w.worker ? "ON" : "OFF"}<div style={{ color: "#6b7080", fontSize: 10 }}>sheds tiers bottom-up, one rung at a time, slowly</div></button>
          <button style={{ ...S.btn(w.flap, !w.worker), borderColor: w.flap ? RED : undefined, color: w.flap ? RED : undefined }} disabled={!w.worker} onClick={() => setW(x => ({ ...x, flap: !x.flap }))}>FLAP MODE: {w.flap ? "ON — no damping" : "OFF"}<div style={{ color: "#6b7080", fontSize: 10 }}>shed fast, restore fast — the tuning mistake, playable</div></button>
          <button style={{ ...S.btn(false, false), marginTop: 12 }} onClick={() => setW(initial())}>↺ RESET</button>
        </div>

        <div style={{ flex: "2 1 420px", minWidth: 300 }}>
          <div style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${verdict.c}`, background: `${verdict.c}14`, marginBottom: 12 }}>
            <div style={{ color: verdict.c, fontWeight: 700 }}>{verdict.code}</div>
            <div style={{ marginTop: 5, fontSize: 11.5, lineHeight: 1.6 }}>{verdict.t}</div>
          </div>
          <div style={S.panel}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={S.label}>THE CRITICALITY LADDER — shed from the bottom</div>
              <div style={{ fontSize: 11, color: w.util > 1 ? RED : w.util > 0.9 ? AMBER : GREEN, fontWeight: 700 }}>DEMAND/CAPACITY {(w.util * 100).toFixed(0)}%</div>
            </div>
            <div style={{ marginTop: 6 }}>
              {["crit", "posts", "gets", "test"].map(k => tierRow(k, TIERS.indexOf(k)))}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              <div style={{ flex: 1 }}><div style={S.label}>CHARGES SUCCEEDING</div><div style={{ fontSize: 16, fontWeight: 700, color: w.chargeOk >= 95 ? GREEN : w.chargeOk >= 80 ? AMBER : RED }}>{w.chargeOk}%</div></div>
              <div style={{ flex: 1 }}><div style={S.label}>CHARGE-CAPACITY LOST</div><div style={{ fontSize: 16, fontWeight: 700, color: RED }}>{Math.round(w.lost)}</div></div>
              <div style={{ flex: 1 }}><div style={S.label}>REJECTED BY LAYER</div><div style={{ fontSize: 11, marginTop: 3, color: "#8b90a0" }}>rate-limit {w.rejected.rrl} · fleet {w.rejected.fleet} · worker {w.rejected.worker}</div></div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ color: "#6b7080", fontSize: 10, marginTop: 12, borderTop: "1px solid #2a2a3a", paddingTop: 8, lineHeight: 1.7 }}>
        The four limiters, their roles and firing frequencies (millions / 12,000 / a very small fraction / 100 requests in the reported month), the critical-vs-non-critical split (creating charges vs listing charges), the fleet reservation mechanics (20% example, 503 past the 80% allocation, Redis counters), the four-tier shed order starting with test mode, the shed-and-restore-slowly rule with its flapping dialogue, token buckets on Redis, fail-open middleware, kill switches, and dark launches are all from the Stripe post. Worker counts, tier demand numbers, and tick dynamics here are illustrative.
        {" "}<a href="https://behindscale.com/articles/stripe-rate-limiters" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: "none" }}>From the full dissection at behindscale.com →</a>
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
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 8 }}><span style={lbl}>THE PROBLEM · </span>When demand outruns capacity — a runaway script, an analytics batch, an internal slowdown — a queue that doesn't know importance drops indiscriminately: charge creation takes the same haircut as test-mode traffic, and the shedding meant to protect the service sacrifices its most critical work.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>THE MOVE · </span>Stripe layers four admission controls: per-user token buckets and concurrency caps for everyday fairness, then a standing 20% fleet reservation for critical methods, then a last-resort worker shedder that walks a four-tier ladder — test mode first, critical last — shedding and restoring slowly to avoid flapping. Keep the core working while the rest is on fire.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>TRY · </span>Run the test-script flood with every layer off and watch charges die for a script. Arm the rate limiter — then trigger the internal slowdown it can't help with, and arm the reservation and the ladder instead. Finish in FLAP MODE and meet the oscillation Stripe tuned away.</div>
    </div>
  );
}
