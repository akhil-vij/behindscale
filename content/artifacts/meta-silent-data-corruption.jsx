import { useState, useEffect } from "react";

const ACCENT = "#0866FF";
const RED = "#ef4444"; const AMBER = "#eab308"; const GREEN = "#22c55e"; const VIOLET = "#9b8cf0";

const N = 6; const MAINT_EVERY = 24; // ticks between a given machine's maintenance event (~"180 days")
const initial = () => ({ t: 0, fs: false, ripple: false, defect: null, rare: false, corrupted: 0, exposedTicks: 0, detectedBy: null, detectedAt: null, quarantined: false });

function step(w) {
  const n = { ...w };
  n.t++;
  const active = n.defect !== null && !n.quarantined;
  if (active) {
    n.corrupted += n.rare ? 1 : 3; // wrong answers shipped downstream this tick
    n.exposedTicks++;
    // ripple: constant shallow probes — catches common-pattern defects fast, never the rare-mode one
    if (n.ripple && !n.rare && n.exposedTicks >= 3) { n.detectedBy = "ripple"; n.detectedAt = n.t; n.quarantined = true; }
    // fleetscanner: deep probe only when this machine's maintenance window arrives
    else if (n.fs && (n.t % MAINT_EVERY === 0)) { n.detectedBy = "fleetscanner"; n.detectedAt = n.t; n.quarantined = true; }
  }
  return n;
}

export default function NoTraceInAnyLog() {
  const [w, setW] = useState(initial);
  useEffect(() => { const id = setInterval(() => setW(step), 600); return () => clearInterval(id); }, []);
  const active = w.defect !== null && !w.quarantined;
  const ticksToMaint = w.t % MAINT_EVERY === 0 ? 0 : MAINT_EVERY - (w.t % MAINT_EVERY);

  const verdict = (() => {
    if (w.quarantined && w.detectedBy === "ripple") return { c: GREEN, code: "FIFTEEN DAYS, NOT SIX MONTHS", t: `A ripple probe — a known bit pattern with a known answer, hundreds of milliseconds, injected beside the live workload — got a wrong answer back after ${w.exposedTicks} ticks of exposure. ${w.corrupted} corrupted results shipped before detection; without ripple, this machine's next deep test was ${ticksToMaint || MAINT_EVERY} ticks away. Now plant the RARE-MODE defect and watch ripple go blind.` };
    if (w.quarantined && w.detectedBy === "fleetscanner") return { c: w.rare ? VIOLET : AMBER, code: w.rare ? "ONLY THE DEEP TEST SAW IT" : "CAUGHT AT MAINTENANCE — MONTHS OF EXPOSURE", t: w.rare ? `The rare-mode defect never tripped a shallow probe — it needed the minutes-long, intrusive battery that only runs when the machine is already out of production. ${w.corrupted} corrupted results shipped across ${w.exposedTicks} ticks of exposure. This is fleetscanner's 23%: the faulty CPUs nothing else ever finds. The fleet needs both hands.` : `Fleetscanner's deep battery caught the defect at the machine's maintenance window — after ${w.exposedTicks} ticks and ${w.corrupted} corrupted results. Opportunism is cheap because it rides downtime you already bought, and slow because it doesn't control its own schedule: on average, one deep look per machine every ~180 days. Arm RIPPLE and replant the defect.` };
    if (active && !w.fs && !w.ripple) return { c: RED, code: "GREEN CHECKS, WRONG ANSWERS", t: `The defective CPU is computing wrong results under its trigger pattern — ${w.corrupted} corrupted answers shipped downstream so far — and every health signal is green, because liveness, thermals, and error counters all answer a different question than the one that matters. No record. No trace. No log line will ever come. Detection must be manufactured: arm a testing regime.` };
    if (active && w.rare && w.ripple && !w.fs) return { c: RED, code: "THE SHALLOW PROBES KEEP MISSING", t: `Ripple is firing constantly — and this defect only manifests in an operating mode the quick probes don't reach. ${w.corrupted} corrupted results and counting. Between-window arrivals, data-pattern dependencies, and mode-switch triggers were ripple's reasons to exist; deep-and-rare coverage is fleetscanner's. Arm it.` };
    if (active) return { c: AMBER, code: "A DEFECT IS LOOSE IN THE FLEET", t: `Machine 3 is corrupting results under its trigger. ${w.fs ? `Fleetscanner's next window for it: ${ticksToMaint} ticks.` : ""} ${w.ripple && !w.rare ? "Ripple probes are closing in." : ""}` };
    if (w.fs && w.ripple) return { c: GREEN, code: "BOTH HANDS ON THE FLEET", t: "Shallow-and-constant (ripple: ~2.5B known-answer seeds a month, milliseconds each, polite guest beside the workloads) plus deep-and-rare (fleetscanner: minutes-long intrusive batteries riding every maintenance event). Neither substitutes for the other — 70% coverage in 15 days versus 6 months, but 23% of faulty CPUs only ever fall to the deep tests. Plant a defect." };
    return { c: AMBER, code: "SIX MACHINES, ALL REPORTING HEALTHY", t: "A miniature fleet with every passive signal green. The question those signals can't answer: is each machine telling the truth? Plant a defect and try to find it — first with observation alone, then with manufactured evidence." };
  })();

  const mono = "'JetBrains Mono','Fira Code',ui-monospace,monospace";
  const S = {
    root: { background: "#08090D", color: "#c8cdd8", fontFamily: mono, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid #2a2a3a", fontSize: 12, lineHeight: 1.5 },
    panel: { background: "#111118", border: "1px solid #2a2a3a", borderRadius: 8, padding: 12 },
    label: { color: "#6b7080", fontSize: 10, letterSpacing: 1.2 },
    btn: (on, dis, col) => ({ display: "block", width: "100%", textAlign: "left", padding: "7px 9px", marginTop: 6, borderRadius: 6, cursor: dis ? "not-allowed" : "pointer", opacity: dis ? 0.4 : 1, border: `1px solid ${on ? (col || ACCENT) : "#2a2a3a"}`, color: on ? "#b9d4ff" : "#8b90a0", background: on ? "rgba(8,102,255,0.10)" : "#0c0d13", fontFamily: mono, fontSize: 11 }),
  };

  return (
    <div style={S.root}>
      <div style={{ color: ACCENT, fontSize: 10, letterSpacing: 2 }}>META · DETECTING SILENT ERRORS IN THE WILD — INTERACTIVE</div>
      <div style={{ color: "#edeff3", fontSize: 16, margin: "4px 0 2px", fontWeight: 700 }}>No trace in any log</div>
      <p style={{ color: "#8b90a0", fontSize: 11, margin: 0 }}>A machine that lies passes every health check. You find it by asking questions you already know the answers to — at two depths.</p>
      <ContextBlock />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
        <div style={{ ...S.panel, flex: "1 1 250px", minWidth: 250 }}>
          <div style={S.label}>PLANT A DEFECT (machine 3)</div>
          <button style={S.btn(w.defect === "common", w.defect !== null)} disabled={w.defect !== null} onClick={() => setW(x => ({ ...initial(), fs: x.fs, ripple: x.ripple, defect: "common", t: x.t }))}>COMMON-PATTERN DEFECT<div style={{ color: "#6b7080", fontSize: 10 }}>wrong answers under an everyday data pattern</div></button>
          <button style={S.btn(w.defect === "rare", w.defect !== null)} disabled={w.defect !== null} onClick={() => setW(x => ({ ...initial(), fs: x.fs, ripple: x.ripple, defect: "rare", rare: true, t: x.t }))}>RARE-MODE DEFECT<div style={{ color: "#6b7080", fontSize: 10 }}>manifests only in a mode shallow probes don't reach</div></button>
          <div style={{ ...S.label, marginTop: 12 }}>TESTING REGIMES</div>
          <button style={S.btn(w.fs, false)} onClick={() => setW(x => ({ ...x, fs: !x.fs }))}>FLEETSCANNER: {w.fs ? "ON" : "OFF"}<div style={{ color: "#6b7080", fontSize: 10 }}>deep · minutes · rides maintenance (every {MAINT_EVERY} ticks)</div></button>
          <button style={S.btn(w.ripple, false)} onClick={() => setW(x => ({ ...x, ripple: !x.ripple }))}>RIPPLE: {w.ripple ? "ON" : "OFF"}<div style={{ color: "#6b7080", fontSize: 10 }}>shallow · milliseconds · beside the workload, always</div></button>
          <button style={{ ...S.btn(false, false), marginTop: 12 }} onClick={() => setW(x => ({ ...initial(), fs: x.fs, ripple: x.ripple }))}>↺ RESET (keep regimes)</button>
        </div>

        <div style={{ flex: "2 1 440px", minWidth: 300 }}>
          <div style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${verdict.c}`, background: `${verdict.c}14`, marginBottom: 12 }}>
            <div style={{ color: verdict.c, fontWeight: 700 }}>{verdict.code}</div>
            <div style={{ marginTop: 5, fontSize: 11.5, lineHeight: 1.6 }}>{verdict.t}</div>
          </div>
          <div style={S.panel}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={S.label}>THE FLEET — EVERY PASSIVE SIGNAL, EVERY MACHINE</div>
              <div style={{ fontSize: 10, color: "#6b7080" }}>t={w.t} · next maint. window in {ticksToMaint}</div>
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              {Array.from({ length: N }, (_, i) => {
                const isBad = w.defect !== null && i === 2;
                const caught = isBad && w.quarantined;
                return (
                  <div key={i} style={{ flex: "1 1 130px", background: "#0c0d13", border: `1px solid ${caught ? VIOLET : "#2a2f45"}`, borderRadius: 6, padding: "8px 8px" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: caught ? VIOLET : "#c8cdd8" }}>machine {i + 1}{caught ? " · QUARANTINED" : ""}</div>
                    <div style={{ fontSize: 9, marginTop: 3, lineHeight: 1.7 }}>
                      <span style={{ color: GREEN }}>● liveness</span> <span style={{ color: GREEN }}>● thermals</span><br />
                      <span style={{ color: GREEN }}>● err counters</span> <span style={{ color: GREEN }}>● health check</span><br />
                      <span style={{ color: caught ? VIOLET : isBad ? RED : GREEN }}>{caught ? "◆ known-answer: WRONG" : isBad ? "◆ truthfulness: ???" : "◆ truthful (as far as anyone knows)"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              <div style={{ flex: 1 }}><div style={S.label}>CORRUPTED RESULTS SHIPPED</div><div style={{ fontSize: 16, fontWeight: 700, color: w.corrupted > 0 ? RED : GREEN }}>{w.corrupted}</div></div>
              <div style={{ flex: 1 }}><div style={S.label}>EXPOSURE (ticks)</div><div style={{ fontSize: 16, fontWeight: 700, color: active ? RED : "#c8cdd8" }}>{w.exposedTicks}</div></div>
              <div style={{ flex: 1 }}><div style={S.label}>DETECTED BY</div><div style={{ fontSize: 13, fontWeight: 700, color: w.detectedBy ? (w.detectedBy === "ripple" ? GREEN : VIOLET) : "#6b7080" }}>{w.detectedBy || "—"}</div></div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ color: "#6b7080", fontSize: 10, marginTop: 12, borderTop: "1px solid #2a2a3a", paddingTop: 8, lineHeight: 1.7 }}>
        The SDC definition (datapath dependencies, temperature variance, age; no record or trace in system logs; propagation to services far from the defect; months of exposure and months of debugging), the vendor-hours/integrator-days/sampling manufacturing reality, the out-of-production vs in-production trade space, Fleetscanner's maintenance-event piggybacking (reboots, kernel and firmware upgrades, reimages, provisioning, repairs; minutes-long intrusive tests; ~180-day average cadence with per-tier controls; 68M tests and ~4B fleet-seconds; maintenance lengthened by test time), ripple's design (shadow testing beside workloads; injected bit patterns with expected results; per-service cadence, interval, duration, and device controls; 1,000× shorter runtimes at hundreds of milliseconds; unique seeds and manufactured transition events for thousands-of-iterations defects; negligible footprint tax; results shared with CPU vendors; ~2.5B seeds/month, ~100M colocated seconds), and the coverage table (70% in ~15 days vs ~6 months; 23% unique to opportunistic; 7% unique to ripple) are all from Harish Dattatraya Dixit's Engineering at Meta post. The six-machine fleet, tick timescale (24 ticks standing in for the ~180-day window), quarantine rendering, and detection latencies here are an illustrative miniature; Meta's 2021 sibling post on MITIGATING silent data corruption exists and is not covered here.
        {" "}<a href="https://behindscale.com/articles/meta-silent-data-corruption" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: "none" }}>From the full dissection at behindscale.com →</a>
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
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 8 }}><span style={lbl}>THE PROBLEM · </span>Defective silicon — aged, heat-stressed, datapath-dependent — computes wrong answers that leave no record in any log, pass every health check, and propagate corruption to services far from the defect. Passive observation can never detect it, because the failure produces no signal at all.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>THE MOVE · </span>Manufacture the evidence: known-answer tests at two depths. Fleetscanner rides every maintenance event with minutes-long intrusive batteries (each machine ~every 180 days); ripple injects millisecond bit-pattern probes beside live workloads, always on — 2.5B seeds a month. Ripple reaches 70% coverage in 15 days vs 6 months; 23% of faulty CPUs fall only to the deep tests. Run both.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>TRY · </span>Plant the common defect with no testing armed and watch green checks beside a climbing corruption counter. Arm fleetscanner and pay months of exposure until the maintenance window; arm ripple and catch it in days — then plant the rare-mode defect and learn what only the deep test sees.</div>
    </div>
  );
}
