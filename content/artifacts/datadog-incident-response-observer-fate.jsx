import { useState, useEffect } from "react";

const ACCENT = "#632CA6";
const RED = "#ef4444"; const AMBER = "#eab308"; const GREEN = "#22c55e";

// t = minutes since 06:00 UTC. Fleet drops over 06:00-07:00 as staggered nodes apply the patch.
const initial = (oob) => ({ t: 0, oob, wave: false, fleet: 100, detectedAt: null, pagedAt: null, statusAt: null, blind: 0, reportsAt: null, hold: 0, down: false });

function step(w) {
  const n = { ...w };
  if (!n.wave) return n;
  if (n.hold > 0) { n.hold--; return n; } // linger on the current beat so it can be read
  n.t++;
  if (n.t <= 60 && n.fleet > 42) n.fleet = Math.max(42, 100 - Math.round(n.t * 1.05)); // staggered drop to ~40%
  if (n.t > 120) n.fleet = Math.min(100, n.fleet + 1); // ASG replacement claws capacity back
  const platformDown = n.wave && (n.t >= 2 || n.fleet < 75); // control-plane loss downs the platform within minutes
  if (platformDown && !n.down) { n.down = true; n.hold = 3; } // linger the moment it goes dark
  if (platformDown && n.detectedAt === null) {
    if (n.oob) { if (n.t >= 3) { n.detectedAt = 3; n.hold = 3; } } // linger on the catch
    else { n.blind++; if (n.t >= 31) { n.detectedAt = n.t; n.reportsAt = n.t; n.hold = 3; } } // counterfactual: customer reports
  }
  if (n.detectedAt !== null && n.pagedAt === null && n.t >= (n.oob ? 8 : n.detectedAt + 5)) n.pagedAt = n.t;
  if (n.pagedAt !== null && n.statusAt === null && n.t >= n.pagedAt + 23) n.statusAt = n.t;
  return n;
}
const clock = (t) => { const h = 6 + Math.floor(t / 60), m = t % 60; return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`; };

export default function MonitorTheMonitors() {
  const [w, setW] = useState(() => initial(false));
  useEffect(() => { const id = setInterval(() => setW(step), 750); return () => clearInterval(id); }, []);
  const platformDown = w.wave && (w.t >= 2 || w.fleet < 75);
  const alertsFiring = platformDown ? 0 : 100; // the tell: a dying monitoring platform goes QUIET
  const milestones = [
    { t: 31, label: "06:31 first status page update" }, { t: 150, label: "08:30 EU1 mitigation identified" },
    { t: 193, label: "09:13 web access restored" }, { t: 336, label: "11:36 unattended-upgrades identified as trigger" },
    { t: 644, label: "16:44 first major service operational" },
  ];

  const verdict = (() => {
    if (w.wave && !platformDown) return { c: AMBER, code: "THE 06:00 UPDATE WAVE IS ROLLING", t: "The security patch is installing across the fleet, and machines are starting to restart and drop off the network. Nothing has been detected yet. Watch the fleet turn red." };
    if (!w.wave) return { c: AMBER, code: w.oob ? "THE WATCHER OUTSIDE THE WALLS IS ARMED" : "YOUR ALERTING RUNS ON THE PLATFORM IT WATCHES", t: w.oob ? "Alongside the rich in-platform monitoring, a deliberately simple watcher runs completely outside the infrastructure, assumes nothing, and checks the platform like a user. Run the 06:00 update wave." : "Data collectors on the servers, monitors running on the platform, pages routing through the same systems: the ordinary, sensible, self-hosted arrangement. Run the 06:00 update wave and watch what a total outage looks like from inside it. (This branch is a what-if: Datadog actually had the outside watcher.)" };
    if (platformDown && w.detectedAt === null) return { c: RED, code: "THE SILENCE LOOKED LIKE HEALTH", t: `${w.fleet}% of the fleet remains and the platform is effectively down - and the alert stream reads ZERO. Not red: quiet. The monitors that would fire are unavailable; the pages that would route are on dead infrastructure. A monitoring system doesn't scream when it dies. You have been blind for ${w.blind} minutes; the first signal will come from outside: customers.` };
    if (w.detectedAt !== null && w.oob && w.t < 40) return { c: GREEN, code: "PAGED AT 06:08 - BY THE MONITOR OF THE MONITORS", t: `The outside watcher, sharing no infrastructure and no assumptions with the platform, flagged the problem at 06:03, three minutes in, and by 06:08 two teams were paged: one whose automation saw its own services failing to restart, and the team that owns pages about the alerting system itself. It cannot say WHY the platform is down. It just said THAT, immediately, which is the one thing the in-platform monitoring could no longer do.` };
    if (w.detectedAt !== null && !w.oob && w.reportsAt !== null && w.t < w.reportsAt + 15) return { c: RED, code: "DETECTED - BY YOUR CUSTOMERS", t: `Roughly half an hour of blindness (this branch is illustrative: Datadog's real detection took 3 minutes) before outside reports made the outage undeniable. The gap between 06:03 and this moment is what the outside watcher buys: not diagnosis, not recovery, just the difference between watching your outage begin and hearing about it.` };
    if (w.t >= 644) return { c: GREEN, code: "16:44 - FIRST MAJOR SERVICE OPERATIONAL", t: "Computing capacity took about 13 hours across five regions and three clouds: tens of thousands of machines recreated, the server-management systems auto-recovered by 08:00, the giant clusters wrestled past their scaling caps by hand. Application recovery continued from there, ordered by the lesson customers taught loudly: live data and alerts before access to historical data. The fixes: the automatic-update channel closed (the same updates already arrive through staged server replacement), the networking component told to leave routes alone, the fleet audited for other unstaged channels." };
    return { c: AMBER, code: "THE LONG HAUL - RECOVERY IN DEPENDENCY ORDER", t: `Fleet at ${w.fleet}% and climbing as automated replacement swaps in machines for the dead ones. Several hundred engineers in shifts, judgment over rigid checklists, because fixed procedures can't stay current with a system this alive. Computing capacity first, because everything else rides on it; platform features next; the application after. Watch the milestone ladder fill.` };
  })();

  const mono = "'JetBrains Mono','Fira Code',ui-monospace,monospace";
  const S = {
    root: { background: "#08090D", color: "#c8cdd8", fontFamily: mono, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid #2a2a3a", fontSize: 12, lineHeight: 1.5 },
    panel: { background: "#111118", border: "1px solid #2a2a3a", borderRadius: 8, padding: 12 },
    label: { color: "#6b7080", fontSize: 10, letterSpacing: 1.2 },
    btn: (on, dis) => ({ display: "block", width: "100%", textAlign: "left", padding: "7px 9px", marginTop: 6, borderRadius: 6, cursor: dis ? "not-allowed" : "pointer", opacity: dis ? 0.4 : 1, border: `1px solid ${on ? ACCENT : "#4a4f60"}`, color: on ? "#d3b8f5" : "#8b90a0", background: on ? "rgba(99,44,166,0.12)" : "#0c0d13", fontFamily: mono, fontSize: 11 }),
  };
  const meter = (label, val, c) => (
    <div style={{ flex: "1 1 110px" }}><div style={S.label}>{label}</div><div style={{ fontSize: 15, fontWeight: 700, color: c }}>{val}</div></div>
  );

  return (
    <div style={S.root}>
      <div style={{ color: ACCENT, fontSize: 10, letterSpacing: 2 }}>DATADOG · 2023-03-08 GLOBAL OUTAGE - INTERACTIVE</div>
      <div style={{ color: "#edeff3", fontSize: 16, margin: "4px 0 2px", fontWeight: 700 }}>Monitor the monitors</div>
      <p style={{ color: "#8b90a0", fontSize: 11, margin: 0 }}>A monitoring company's platform dies at 06:00 UTC. The question is not whether it fails - it's who gets to notice.</p>
      <ContextBlock />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
        <div style={{ ...S.panel, flex: "1 1 250px", minWidth: 250 }}>
          <div style={S.label}>WHERE DOES YOUR ALERTING LIVE?</div>
          <button style={S.btn(!w.oob, w.wave)} disabled={w.wave} onClick={() => setW(initial(false))}>ON THE PLATFORM (same fate)<div style={{ color: "#6b7080", fontSize: 10 }}>a what-if: rich monitoring, but it dies with the platform</div></button>
          <button style={S.btn(w.oob, w.wave)} disabled={w.wave} onClick={() => setW(initial(true))}>+ OUT-OF-BAND WATCHER<div style={{ color: "#6b7080", fontSize: 10 }}>outside the walls · assumes nothing · probes like a user</div></button>
          <div style={{ ...S.label, marginTop: 12 }}>THE TRIGGER</div>
          <button style={{ ...S.btn(w.wave, w.wave), ...(w.wave ? {} : { border: `1px solid ${RED}`, color: RED }) }} disabled={w.wave} onClick={() => setW(x => ({ ...x, wave: true }))}>RUN THE 06:00 UPDATE WAVE<div style={{ color: "#6b7080", fontSize: 10 }}>security patch → networking restart → routes wiped, fleet-wide</div></button>
          <button style={{ ...S.btn(false, false), marginTop: 12 }} onClick={() => setW(x => initial(x.oob))}>↺ RESET</button>
          <div style={{ ...S.label, marginTop: 14 }}>WHY IT WAS EVERYWHERE AT ONCE</div>
          <div style={{ fontSize: 10.5, color: "#8b90a0", lineHeight: 1.7, marginTop: 4 }}>
            90+% of the fleet on the same Ubuntu version, whose networking component wipes unfamiliar routes on restart (a behavior armed since Dec 2020, invisible on fresh boots). Ubuntu's automatic-update feature installed the Mar 7 security patch in the same 06:00 UTC hour on every server that had downloaded it: five regions, three clouds, no shared control plane, all "indirectly related" through one unstaged change channel.
          </div>
        </div>

        <div style={{ flex: "2 1 420px", minWidth: 300 }}>
          <div style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${verdict.c}`, background: `${verdict.c}14`, marginBottom: 12 }}>
            <div style={{ color: verdict.c, fontWeight: 700 }}>{verdict.code}</div>
            <div style={{ marginTop: 5, fontSize: 11.5, lineHeight: 1.6 }}>{verdict.t}</div>
          </div>
          <div style={{ ...S.panel, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={S.label}>THE FLEET {w.wave ? `· ${100 - w.fleet}% DROPPED OFF` : "· healthy"}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: platformDown ? RED : w.wave ? AMBER : GREEN }}>{platformDown ? "PLATFORM DOWN" : w.wave ? "degrading" : "all up"}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(24, 1fr)", gap: 3, marginTop: 8 }}>
              {Array.from({ length: 48 }).map((_, i) => {
                const down = i < Math.round(((100 - w.fleet) / 100) * 48);
                return <div key={i} style={{ height: 12, borderRadius: 2, background: down ? RED : GREEN, opacity: 0.85, transition: "background 0.4s" }} />;
              })}
            </div>
            <div style={{ fontSize: 9, color: "#6b7080", marginTop: 5 }}>each square is a slice of the fleet · green = on the network · red = dropped off</div>
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              {!w.oob ? (
                <div style={{ flex: 1, padding: "9px 11px", borderRadius: 6, border: `1px solid ${platformDown ? RED : GREEN}`, background: platformDown ? "rgba(239,68,68,0.08)" : "#0c0d13" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: platformDown ? RED : GREEN }}>IN-PLATFORM MONITORING {platformDown ? "· DOWN" : "· up"}</div>
                  <div style={{ fontSize: 10.5, color: "#8b90a0", marginTop: 3 }}>{platformDown ? "the monitors run on the fleet, so they went down with it" : "the monitors run on the fleet"}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginTop: 6, color: platformDown ? RED : GREEN }}>ALERTS: {platformDown ? "0 · silent" : "normal"}</div>
                  {platformDown && <div style={{ fontSize: 9.5, color: RED, marginTop: 3 }}>silence looks like health → no one is paged</div>}
                </div>
              ) : (
                <>
                  <div style={{ flex: 1, padding: "9px 11px", borderRadius: 6, border: `1px solid ${platformDown ? RED : "#4a4f60"}`, background: "#0c0d13", opacity: 0.65 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: platformDown ? RED : "#8b90a0" }}>IN-PLATFORM MONITORING {platformDown ? "· DOWN" : "· up"}</div>
                    <div style={{ fontSize: 10.5, color: "#8b90a0", marginTop: 3 }}>still dies with the fleet, but no longer your only warning</div>
                    <div style={{ fontSize: 14, fontWeight: 700, marginTop: 6, color: platformDown ? RED : "#8b90a0" }}>ALERTS: {platformDown ? "0 · silent" : "normal"}</div>
                  </div>
                  <div style={{ flex: 1, padding: "9px 11px", borderRadius: 6, border: `2px solid ${w.detectedAt !== null ? GREEN : "#4a4f60"}`, background: w.detectedAt !== null && w.t % 2 === 0 ? "rgba(34,197,94,0.18)" : "#0c0d13", transition: "background 0.25s" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: GREEN }}>OUTSIDE WATCHER · {platformDown ? (w.detectedAt !== null ? "FIRING" : "detecting") : "armed"}</div>
                    <div style={{ fontSize: 10.5, color: "#8b90a0", marginTop: 3 }}>outside the fleet · checks it like a customer · stays up</div>
                    <div style={{ fontSize: 14, fontWeight: 700, marginTop: 6, color: w.detectedAt !== null ? GREEN : "#8b90a0" }}>{w.detectedAt !== null ? "ALERT 06:03 → PAGED 06:08" : platformDown ? "checking..." : "quiet"}</div>
                    {w.detectedAt !== null && <div style={{ fontSize: 9.5, color: GREEN, marginTop: 3 }}>caught what the in-platform monitors could not</div>}
                  </div>
                </>
              )}
            </div>
          </div>
          <div style={S.panel}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={S.label}>US1 · EU1 · US3 · US4 · US5 - ALL SERVICES</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: platformDown ? RED : GREEN }}>UTC {clock(w.t)}</div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              {meter("FLEET ONLINE", `${w.fleet}%`, w.fleet > 75 ? GREEN : w.fleet > 55 ? AMBER : RED)}
              {meter("ALERTS FIRING (IN-PLATFORM)", alertsFiring === 0 && w.wave ? "0 - silent" : "normal", alertsFiring === 0 && w.wave ? RED : GREEN)}
              {meter("MINUTES BLIND", w.oob ? (w.wave ? "3" : "-") : String(w.blind), w.oob ? GREEN : w.blind > 0 ? RED : "#c8cdd8")}
              {meter("DETECTED", w.detectedAt !== null ? clock(w.detectedAt) : "-", w.detectedAt !== null ? (w.oob ? GREEN : AMBER) : "#6b7080")}
              {meter("PAGED", w.pagedAt !== null ? clock(w.pagedAt) : "-", w.pagedAt !== null ? GREEN : "#6b7080")}
            </div>
            {w.wave && platformDown && (
              <div style={{ marginTop: 10, fontSize: 10.5, color: RED }}>▲ customers' monitors: unavailable and NOT alerting - the observer is down for everyone it observes</div>
            )}
            <div style={{ ...S.label, marginTop: 12 }}>THE RECOVERY LADDER</div>
            <div style={{ marginTop: 4 }}>
              {milestones.map(m => (
                <div key={m.t} style={{ fontSize: 10.5, padding: "3px 0", color: w.t >= m.t && w.wave ? GREEN : "#5c6874" }}>{w.t >= m.t && w.wave ? "✓" : "·"} {m.label}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ color: "#6b7080", fontSize: 10, marginTop: 12, borderTop: "1px solid #2a2a3a", paddingTop: 8, lineHeight: 1.7 }}>
        The trigger chain (systemd v248/v249 route-flushing armed Dec 2020, the Mar 7 CVE patch, Ubuntu-default unattended-upgrades in the 06:00 UTC hour, 90+% fleet on 22.04, Cilium routes flushed, hosts offline on all providers), the detection story (06:03 out-of-band flag, 06:08 two teams paged including the monitor-the-monitors team, 06:31 first status update), the response shape (several hundred engineers in shifts, judgment over rigid runbooks, first-ever global incident), the recovery ladder (control planes auto-recovered ~08:00, EU1 mitigation 08:30, web 09:13, trigger identified 11:36, ~13 hours for majority of compute, 16:44 first major service), and the fixes (channel disabled as redundant with staged node-replacement patching, networkd config, fleet audit) are from Datadog's incident-response deep dive and official postmortem. The fate-shared-only branch is a labeled counterfactual - Datadog had the out-of-band layer; its ~30-minute blindness figure is illustrative. Fleet percentages and pacing are illustrative.
        {" "}<a href="https://behindscale.com/articles/datadog-incident-response-observer-fate" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: "none" }}>From the full dissection at behindscale.com →</a>
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
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 8 }}><span style={lbl}>THE PROBLEM · </span>On 2023-03-08 a security patch, auto-applied by Ubuntu's automatic-update feature in one hour, wiped the network routes across 90+% of Datadog's servers: five regions, three clouds, at once. For a monitoring company the trap bites twice: customers' monitors went silent, and Datadog's own alerting ran on the dying platform. A dying monitoring system doesn't turn red; it goes quiet.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>THE MOVE · </span>A deliberately simple outside watcher (outside the infrastructure, assuming nothing, checking the platform like a user) flagged the outage at 06:03 and paged at 06:08. Then: several hundred engineers, judgment over rigid checklists, about 13 hours to restore computing capacity, and the channel that caused it all closed at no security cost.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>TRY · </span>Run the 06:00 wave with alerting on the platform: watch the alert stream drop to zero and see how long you stay blind until customers report it. Then switch on the outside watcher, get paged at 06:08, and follow the recovery ladder to 16:44.</div>
    </div>
  );
}
