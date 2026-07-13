import { useState } from "react";

const ACCENT = "#00A2FF";
const RED = "#ef4444"; const AMBER = "#eab308"; const GREEN = "#22c55e";

export default function DarkDashboards() {
  const [indep, setIndep] = useState(false);     // independent telemetry (the remediation)
  const [hours, setHours] = useState(3);
  const [tried, setTried] = useState([]);        // diagnosis attempts
  const [streamOff, setStreamOff] = useState(false);
  const [leadersFixed, setLeadersFixed] = useState(false);
  const [admitted, setAdmitted] = useState(0);   // % players
  const [relapse, setRelapse] = useState(false);
  const consulHealthy = streamOff && leadersFixed;

  const reset = () => { setIndep(false); setHours(3); setTried([]); setStreamOff(false); setLeadersFixed(false); setAdmitted(0); setRelapse(false); };
  const attempt = (id, cost) => { if (!tried.includes(id)) { setTried([...tried, id]); setHours(h => h + cost); } };

  const verdicts = {
    hw: { c: RED, code: "NEW HARDWARE — NO CHANGE", t: "Hardware issues aren't unusual at this scale, and Consul survives node failure — but slow-not-failed hardware was a theory, not a diagnosis. Nodes replaced; KV p50 still ~2s. First attempt down." },
    big: { c: RED, code: "128-CORE MACHINES — WORSE", t: "The traffic theory said tipping point; the fix said bigger boxes. But the bottleneck was contention, not capacity — and the dual-socket NUMA architecture amplified contention on shared resources. Adding capacity added coordinators." },
    snap: { c: AMBER, code: "SNAPSHOT RESET — HEALTHY, BRIEFLY", t: "Full shutdown, state reset behind iptables, small config loss accepted. Metrics looked good — until service-discovery load returned and the cluster collapsed back to 2s writes. Also quietly seeded stale KV scheduling data that will resurface during recovery. 14+ hours in; still no root cause." },
    reduce: { c: AMBER, code: "USAGE REDUCED TO SINGLE DIGITS — STILL SICK", t: "Hundreds of instances scaled to single digits, health checks stretched 60s→10min. Hours of relief, then unhealthy again under a fraction of the load. The load theory is dead: something inside Consul is wrong." },
  };
  const last = tried.length ? verdicts[tried[tried.length - 1]] : null;

  const verdict = (() => {
    if (relapse) return { c: RED, code: "FLOOD READMISSION — RELAPSE", t: "Cold caches met full traffic and the barely-healed system slid back toward instability. This is why Roblox used DNS steering in ~10% increments, checking database load, cache performance, and stability at every ratchet. Reset the admission and go slower." };
    if (admitted >= 100) return { c: GREEN, code: `100% OF PLAYERS ADMITTED — HOUR ${hours}`, t: "DNS steering ratcheted randomly selected players in ~10% steps against cold caches — dedicated players reverse-engineered the scheme on Twitter for early access. Roblox reached 100% at hour 73. The remediations map the anatomy: independent telemetry, dedicated Consul clusters, multi-AZ, cold-start-capable cache tooling." };
    if (consulHealthy) return { c: GREEN, code: "CONSUL STABLE — NOW RETURN FIFTY MILLION PLAYERS", t: "Streaming disabled (KV p50: 2s → 300ms) and slow leaders barred from election. The caches — 1B requests/second in normal operation — were rebuilt from cold, fighting stale KV scheduling data and tooling built for incremental change, not bootstrap. Admit players carefully: the system that ran last week doesn't exist yet." };
    if (streamOff) return { c: AMBER, code: "BREAKTHROUGH — AND SOME LEADERS ARE STILL SLOW", t: "Disabling streaming dropped KV writes to 300ms. But certain elected leaders still show the old latency — cause unknown mid-incident (days later: BoltDB writing a 7.8MB freelist per 16kB append). The pragmatic move: prevent the problematic servers from staying elected, and move on." };
    if (indep) return { c: ACCENT, code: "INSTRUMENTS LIT — THE EVIDENCE IS POINTING", t: "With telemetry independent of Consul, the perf reports and flame graphs surface immediately: kernel spin locks concentrated in the streaming subscription code path, contention on a single Go channel under high read+write load. The rollout reached traffic routing yesterday — with node count up 50%. DISABLE STREAMING is lit for a reason.", glow: true };
    return { c: tried.length >= 3 ? RED : AMBER, code: tried.length ? "STILL BLIND — THE INSTRUMENTS DEPEND ON THE PATIENT" : "CONSUL UNHEALTHY — AND THE DASHBOARDS ARE DARK", t: tried.length ? `Theories ${tried.length}/4 spent, ~${hours} hours in. Critical monitoring relied on affected systems — such as Consul — and the post is explicit: this severely hampered triage, and diagnosis challenges were largely responsible for the extended downtime. You are reasoning from the outside of a system you cannot see into.` : "KV write p50 has gone from 300ms to 2 seconds, players are dropping — and the telemetry that would show you why runs on the cluster that's failing. Work the theories, or flip on INDEPENDENT TELEMETRY (the remediation Roblox shipped after) and see what 73 hours of difference looks like." };
  })();
  const shown = (last && !streamOff && !consulHealthy && !indep && admitted === 0 && !relapse) ? last : verdict;

  const mono = "'JetBrains Mono','Fira Code',ui-monospace,monospace";
  const S = {
    root: { background: "#08090D", color: "#c8cdd8", fontFamily: mono, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid #2a2a3a", fontSize: 12, lineHeight: 1.5 },
    panel: { background: "#111118", border: "1px solid #2a2a3a", borderRadius: 8, padding: 12 },
    label: { color: "#6b7080", fontSize: 10, letterSpacing: 1.2 },
    btn: (on, dis) => ({ display: "block", width: "100%", textAlign: "left", padding: "7px 9px", marginTop: 6, borderRadius: 6, cursor: dis ? "not-allowed" : "pointer", opacity: dis ? 0.4 : 1, border: `1px solid ${on ? ACCENT : "#2a2a3a"}`, color: on ? "#9fdcff" : "#8b90a0", background: on ? "rgba(0,162,255,0.10)" : "#0c0d13", fontFamily: mono, fontSize: 11 }),
  };
  const gauge = (label, val, dark) => (
    <div style={{ flex: "1 1 120px", background: "#0c0d13", border: "1px solid #2a2a3a", borderRadius: 6, padding: "8px 10px", position: "relative", overflow: "hidden" }}>
      <div style={S.label}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: dark ? "#3a3f4e" : val.c, filter: dark ? "blur(2px)" : "none" }}>{dark ? "— — —" : val.t}</div>
      {dark && <div style={{ position: "absolute", right: 8, bottom: 6, fontSize: 8.5, color: RED, letterSpacing: 1 }}>NO DATA</div>}
    </div>
  );
  const dashDark = !indep && !consulHealthy; // telemetry shares fate with consul

  return (
    <div style={S.root}>
      <div style={{ color: ACCENT, fontSize: 10, letterSpacing: 2 }}>ROBLOX · 73-HOUR OUTAGE — INTERACTIVE</div>
      <div style={{ color: "#edeff3", fontSize: 16, margin: "4px 0 2px", fontWeight: 700 }}>Dark dashboards</div>
      <p style={{ color: "#8b90a0", fontSize: 11, margin: 0 }}>Triage Consul's collapse the way Roblox had to — with monitoring that depends on the thing that's failing. Then flip the one switch they shipped afterward.</p>
      <ContextBlock />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
        <div style={{ ...S.panel, flex: "1 1 250px", minWidth: 250 }}>
          <div style={S.label}>TELEMETRY ARCHITECTURE</div>
          <button style={S.btn(indep, false)} onClick={() => setIndep(!indep)}>INDEPENDENT TELEMETRY: {indep ? "ON" : "OFF"}<div style={{ color: "#6b7080", fontSize: 10 }}>the post-outage remediation — observers off Consul</div></button>
          <div style={{ ...S.label, marginTop: 12 }}>WORK THE THEORIES {tried.length > 0 && `(${tried.length}/4 spent)`}</div>
          <button style={S.btn(tried.includes("hw"), streamOff)} disabled={streamOff} onClick={() => attempt("hw", 8)}>1 · REPLACE DEGRADED HARDWARE (+8h)</button>
          <button style={S.btn(tried.includes("big"), streamOff)} disabled={streamOff} onClick={() => attempt("big", 6)}>2 · MIGRATE TO 128-CORE MACHINES (+6h)</button>
          <button style={S.btn(tried.includes("snap"), streamOff)} disabled={streamOff} onClick={() => attempt("snap", 10)}>3 · SNAPSHOT RESET + IPTABLES (+10h)</button>
          <button style={S.btn(tried.includes("reduce"), streamOff)} disabled={streamOff} onClick={() => attempt("reduce", 12)}>4 · SCALE USAGE TO SINGLE DIGITS (+12h)</button>
          <div style={{ ...S.label, marginTop: 12 }}>THE INTERNALS {indep ? "· EVIDENCE LIT" : ""}</div>
          <button style={{ ...S.btn(streamOff, false), ...(indep && !streamOff ? { border: `1px solid ${ACCENT}`, boxShadow: `0 0 8px ${ACCENT}55` } : {}) }} onClick={() => { if (!streamOff) { setStreamOff(true); setHours(h => h + (indep ? 4 : 20)); } }}>DISABLE STREAMING {streamOff ? "· DONE (p50 2s→300ms)" : indep ? "(+4h — evidence in hand)" : "(+20h — found via log spelunking)"}</button>
          <button style={S.btn(leadersFixed, !streamOff)} disabled={!streamOff} onClick={() => { if (!leadersFixed) { setLeadersFixed(true); setHours(h => h + 8); } }}>BAR SLOW LEADERS FROM ELECTION (+8h)</button>
          <div style={{ ...S.label, marginTop: 12 }}>RETURN TO SERVICE</div>
          <button style={S.btn(false, !consulHealthy || admitted >= 100)} disabled={!consulHealthy || admitted >= 100} onClick={() => { setAdmitted(a => Math.min(100, a + 10)); setHours(h => h + 1); setRelapse(false); }}>DNS STEER: ADMIT +10% (now {admitted}%)</button>
          <button style={S.btn(false, !consulHealthy || admitted >= 100)} disabled={!consulHealthy || admitted >= 100} onClick={() => { setRelapse(true); }}>OPEN THE FLOODGATES — 100% AT ONCE</button>
          <button style={{ ...S.btn(false, false), marginTop: 12 }} onClick={reset}>↺ RESET</button>
        </div>

        <div style={{ flex: "2 1 420px", minWidth: 300 }}>
          <div style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${shown.c}`, background: `${shown.c}14`, marginBottom: 12 }}>
            <div style={{ color: shown.c, fontWeight: 700 }}>{shown.code}</div>
            <div style={{ marginTop: 5, fontSize: 11.5, lineHeight: 1.6 }}>{shown.t}</div>
          </div>
          <div style={S.panel}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={S.label}>YOUR DASHBOARDS {dashDark ? "· running on Consul" : "· independent"}</div>
              <div style={{ fontSize: 11, color: hours > 60 ? RED : AMBER, fontWeight: 700 }}>OUTAGE CLOCK: ~{hours}h</div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {gauge("KV WRITE p50", { t: streamOff ? "300ms" : "2.1s", c: streamOff ? GREEN : RED }, dashDark)}
              {gauge("PERF / FLAME", { t: streamOff ? "clean" : "spin locks: streaming", c: streamOff ? GREEN : AMBER }, dashDark)}
              {gauge("PLAYERS", { t: admitted >= 100 ? "50M · 100%" : consulHealthy ? `${admitted}% admitted` : "0 online", c: admitted > 0 ? GREEN : RED }, false)}
              {gauge("CACHE TIER (1B req/s)", { t: admitted > 0 ? "warming" : consulHealthy ? "cold" : "down", c: admitted > 0 ? AMBER : RED }, dashDark)}
            </div>
            {dashDark && <div style={{ fontSize: 10, color: RED, marginTop: 8 }}>▲ telemetry shares fate with the observed — the instruments went down with the patient</div>}
          </div>
        </div>
      </div>

      <div style={{ color: "#6b7080", fontSize: 10, marginTop: 12, borderTop: "1px solid #2a2a3a", paddingTop: 8, lineHeight: 1.7 }}>
        Hour costs are illustrative pacing; the sequence and mechanics are the post's: four diagnosis attempts (hardware, 128-core NUMA machines that made contention worse, a snapshot reset that later seeded stale KV scheduling data, usage scaled to single digits) with monitoring that relied on Consul — the post states diagnosis challenges were largely responsible for the extended downtime and the telemetry dependency severely hampered triage; the streaming feature's Go-channel contention found via perf reports and flame graphs (KV p50 2s→300ms on disabling); slow leaders barred from election, explained days later as BoltDB writing a 7.8MB freelist per 16kB Raft append (4.2GB file, 489MB of data); cold-cache recovery of a 1B-req/s tier; and DNS-steered readmission in ~10% increments to 100% at hour 73. The independent-telemetry toggle is Roblox's own first remediation, made playable.
        {" "}<a href="https://behindscale.com/articles/roblox-return-to-service" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: "none" }}>From the full dissection at behindscale.com →</a>
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
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 8 }}><span style={lbl}>THE PROBLEM · </span>Two deep bugs in Consul took all of Roblox down for 73 hours — and the reason it took three days is that the monitoring that would have exposed them ran on Consul itself. The responders triaged nearly blind, burning four wrong theories.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>THE MOVE · </span>Found via flame graphs: disable the streaming feature (contention on one Go channel), bar the BoltDB-crippled leaders from election, rebuild the cache tier cold, and readmit fifty million players 10% at a time. First remediation shipped: telemetry no longer depends on what it monitors.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>TRY · </span>Work the four theories with dark dashboards and watch the clock. Then flip INDEPENDENT TELEMETRY on, see the evidence light up, and compare the hours. Finish the recovery — gently, or open the floodgates and learn why not.</div>
    </div>
  );
}
