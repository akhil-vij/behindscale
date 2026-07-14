import { useState } from "react";

const ACCENT = "#F6821F";
const RED = "#ef4444"; const AMBER = "#eab308"; const GREEN = "#22c55e"; const VIOLET = "#9b8cf0";

export default function NeitherDeadNorAlive() {
  const [sw, setSw] = useState(null);          // null | "dead" | "degraded"
  const [promoAt, setPromoAt] = useState(2);   // minutes of etcd silence before auto-promotion
  const [played, setPlayed] = useState(false); // the six minutes have run
  const [shed, setShed] = useState(false);
  const [steer, setSteer] = useState(false);
  const [rebuilt, setRebuilt] = useState(false);

  const promoted = played && sw === "degraded" && promoAt <= 6;
  const nearMiss = played && sw === "degraded" && promoAt > 6;
  const overloaded = promoted && !rebuilt;
  const reset = () => { setSw(null); setPromoAt(2); setPlayed(false); setShed(false); setSteer(false); setRebuilt(false); };

  const api = rebuilt || nearMiss || sw === "dead" || sw === null ? 100 : overloaded ? Math.min(96, 75 + (shed ? 9 : 0) + (steer ? 12 : 0)) : 100;
  const dash = overloaded ? (steer ? "140× slower" : "80× slower") : "normal";
  const clock = rebuilt ? "21:20" : overloaded ? "15:30" : played ? "14:49" : sw ? "14:44" : "14:43";
  const etcdSplit = sw === "degraded" && !played;

  const verdict = (() => {
    if (rebuilt) return { c: shed || steer ? AMBER : RED, code: "SIX MINUTES BECAME SIX AND A HALF HOURS", t: `The switch was healthy again by 14:49; everything after was the automation's decision playing out — a promotion nothing needed, a rebuild the defect mandated, an auth primary carrying reads its topology assumed a replica would absorb. ${shed ? "Shedding discretionary load bought headroom." : "You never shed load — the primary took everything."} ${steer ? "Steering reads to the second DC rescued the API by hand — the one redundancy the automation couldn't reach was the one that survived — and dashboard sessions paid for it." : "The secondary-DC replicas sat untouched and unused: outside the automation, and outside your reach too."} Reset and set the trigger above 6.` };
    if (nearMiss) return { c: GREEN, code: "NEAR MISS — THE DAMPED TRIGGER HELD", t: `etcd was read-only for six minutes and your promotion trigger (${promoAt} min) outlasted the ambiguity. No promotion, no replica rebuild, no overload — the incident that did not happen. The price: a genuinely dead primary would now wait ${promoAt} minutes for its cure. Cloudflare retuned toward exactly this trade after 2020-11-02.` };
    if (overloaded) return { c: steer ? AMBER : RED, code: steer ? "HELPING THE API IS HURTING THE DASHBOARD" : "PROMOTED ON SILENCE — EVERY REPLICA REBUILDING", t: steer ? "API reads are riding the secondary-DC replicas — manual, unautomated steering. But dashboard sessions live in Redis in the primary DC and can't cross the ocean; users are watching it get worse. Fail auth back, or hold the line until the rebuild lands." : "Cluster management read six minutes of etcd silence as a dead primary and promoted the sync replica — flawlessly, and pointlessly. The known defect now forces a rebuild of every replica, hours long, while the read-heavy auth primary stands alone. Shed what you can, steer what you dare.", glow: !steer };
    if (etcdSplit) return { c: AMBER, code: "THREE NODES, THREE REALITIES — CLUSTER READ-ONLY", t: `Node 1 can't reach the leader and votes for itself; node 2 still sees node 3 and votes accordingly; ties resolve nothing node 1 can reach, and elections block all writes. The switch will self-heal at six minutes. Your promotion trigger is armed at ${promoAt} — ${promoAt <= 6 ? "it will fire first." : "the ambiguity will pass before it fires."} Let the six minutes play out.` };
    if (sw === "dead") return { c: GREEN, code: "FULL DEATH, HANDLED", t: "You killed the switch and the redundancy worked exactly as audited: links dropped, LACP failed over to the peer, etcd never wavered, nothing upstream noticed. Crash-stop failure is the case every layer was built for. Now reset and try the state the switch actually entered." };
    return { c: AMBER, code: "YOUR HAND IS ON THE SWITCH", t: "Every layer below this switch — LACP, RAFT, auto-promotion — assumes a component is either up or down. Set the promotion trigger, then choose how the switch fails. Dead is the easy case." };
  })();

  const mono = "'JetBrains Mono','Fira Code',ui-monospace,monospace";
  const S = {
    root: { background: "#08090D", color: "#c8cdd8", fontFamily: mono, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid #2a2a3a", fontSize: 12, lineHeight: 1.5 },
    panel: { background: "#111118", border: "1px solid #2a2a3a", borderRadius: 8, padding: 12 },
    label: { color: "#6b7080", fontSize: 10, letterSpacing: 1.2 },
    btn: (on, dis) => ({ display: "block", width: "100%", textAlign: "left", padding: "7px 9px", marginTop: 6, borderRadius: 6, cursor: dis ? "not-allowed" : "pointer", opacity: dis ? 0.4 : 1, border: `1px solid ${on ? ACCENT : "#2a2a3a"}`, color: on ? "#ffcf9e" : "#8b90a0", background: on ? "rgba(246,130,31,0.10)" : "#0c0d13", fontFamily: mono, fontSize: 11 }),
  };
  const gauge = (label, t, c) => (
    <div style={{ flex: "1 1 120px", background: "#0c0d13", border: "1px solid #2a2a3a", borderRadius: 6, padding: "8px 10px" }}>
      <div style={S.label}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: c }}>{t}</div>
    </div>
  );

  return (
    <div style={S.root}>
      <div style={{ color: ACCENT, fontSize: 10, letterSpacing: 2 }}>CLOUDFLARE · 2020-11-02 CONTROL-PLANE INCIDENT — INTERACTIVE</div>
      <div style={{ color: "#edeff3", fontSize: 16, margin: "4px 0 2px", fontWeight: 700 }}>Neither dead nor alive</div>
      <p style={{ color: "#8b90a0", fontSize: 11, margin: 0 }}>One switch, two ways to fail. Every layer beneath it was built for exactly one of them.</p>
      <ContextBlock />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
        <div style={{ ...S.panel, flex: "1 1 250px", minWidth: 250 }}>
          <div style={S.label}>THE SWITCH'S FATE</div>
          <button style={S.btn(sw === "dead", played)} disabled={played} onClick={() => { setSw("dead"); setPlayed(false); }}>KILL IT DEAD<div style={{ color: "#6b7080", fontSize: 10 }}>links drop — the case failover was built for</div></button>
          <button style={S.btn(sw === "degraded", played)} disabled={played} onClick={() => { setSw("degraded"); setPlayed(false); }}>DEGRADE IT — HALF-ALIVE<div style={{ color: "#6b7080", fontSize: 10 }}>LACP/BGP up, data plane dropping packets</div></button>
          <div style={{ ...S.label, marginTop: 12 }}>AUTO-PROMOTION TRIGGER · {promoAt} MIN OF ETCD SILENCE</div>
          <input type="range" min="1" max="10" step="1" value={promoAt} disabled={played} onChange={e => setPromoAt(+e.target.value)} style={{ width: "100%", accentColor: VIOLET, marginTop: 6 }} />
          <div style={{ color: "#6b7080", fontSize: 10 }}>the switch self-heals at 6 — where does your trigger sit?</div>
          <button style={{ ...S.btn(false, !etcdSplit), ...(etcdSplit ? { border: `1px solid ${VIOLET}`, boxShadow: `0 0 8px ${VIOLET}55` } : {}) }} disabled={!etcdSplit} onClick={() => setPlayed(true)}>LET THE SIX MINUTES PLAY OUT</button>
          <div style={{ ...S.label, marginTop: 12 }}>MITIGATE BY HAND {overloaded ? "· THE AUTOMATION ALREADY ACTED" : ""}</div>
          <button style={S.btn(shed, !overloaded || shed)} disabled={!overloaded || shed} onClick={() => setShed(true)}>SHED DISCRETIONARY LOAD<div style={{ color: "#6b7080", fontSize: 10 }}>SSL pushes, emails — headroom for the primary</div></button>
          <button style={S.btn(steer, !overloaded)} disabled={!overloaded} onClick={() => setSteer(s => !s)}>{steer ? "FAIL AUTH BACK TO PRIMARY DC" : "STEER READS TO 2ND DC"}<div style={{ color: "#6b7080", fontSize: 10 }}>{steer ? "give back API gains, spare the dashboard" : "unautomated — the replicas failover never touched"}</div></button>
          <button style={S.btn(false, !overloaded)} disabled={!overloaded} onClick={() => setRebuilt(true)}>WAIT — HOURS PASS, REBUILD COMPLETES</button>
          <button style={{ ...S.btn(false, false), marginTop: 12 }} onClick={reset}>↺ RESET</button>
        </div>

        <div style={{ flex: "2 1 420px", minWidth: 300 }}>
          <div style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${verdict.c}`, background: `${verdict.c}14`, marginBottom: 12 }}>
            <div style={{ color: verdict.c, fontWeight: 700 }}>{verdict.code}</div>
            <div style={{ marginTop: 5, fontSize: 11.5, lineHeight: 1.6 }}>{verdict.t}</div>
          </div>
          <div style={S.panel}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={S.label}>CONTROL PLANE</div>
              <div style={{ fontSize: 11, color: rebuilt ? GREEN : overloaded ? RED : AMBER, fontWeight: 700 }}>UTC {clock}</div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {gauge("ETCD", etcdSplit ? "READ-ONLY · elections tied" : promoted && !rebuilt ? "writable (healed at 14:49)" : "writable", etcdSplit ? RED : GREEN)}
              {gauge("CLUSTER MGMT", overloaded ? "promoted on silence" : nearMiss ? "held its fire" : "watching primaries", overloaded ? VIOLET : nearMiss ? GREEN : "#8b90a0")}
              {gauge("AUTH REPLICAS", overloaded ? "ALL REBUILDING (hours)" : "in service", overloaded ? RED : GREEN)}
              {gauge("API SUCCESS", `${api}%`, api > 95 ? GREEN : api > 85 ? AMBER : RED)}
              {gauge("DASHBOARD", dash, dash === "normal" ? GREEN : dash === "80× slower" ? RED : AMBER)}
            </div>
            {etcdSplit && <div style={{ fontSize: 10, color: AMBER, marginTop: 8 }}>▲ n1 votes for itself · n2 votes for n3 · the leader is reachable by some — RAFT has no word for this</div>}
          </div>
        </div>
      </div>

      <div style={{ color: "#6b7080", fontSize: 10, marginTop: 12, borderTop: "1px solid #2a2a3a", paddingTop: 8, lineHeight: 1.7 }}>
        Sequence and figures are the post's: 14:43 UTC partial switch failure (LACP/BGP up, vPC down, forwarding degraded), six-minute self-recovery, tied etcd elections blocking writes, automatic promotion on lost primary signal, a known defect forcing rebuild of all replicas, API success dipping to 75% and the dashboard up to 80× slower, manual load shedding and manual read steering to secondary-DC replicas (which worsened dashboard sessions and was failed back), recovery at 21:20, and the post-incident retuning of promotion aggressiveness — "the cure may be worse than the disease." Gauge dynamics between sourced anchors are illustrative. The post's own postscript concedes the community's correction: an omission fault, not a true Byzantine one.
        {" "}<a href="https://behindscale.com/articles/cloudflare-byzantine-failure" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: "none" }}>From the full dissection at behindscale.com →</a>
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
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 8 }}><span style={lbl}>THE PROBLEM · </span>In 2020 a Cloudflare switch went half-alive — control protocols up, data plane dropping packets — and every failover layer built for up-or-down misfired: etcd's elections tied, and automation promoted a database primary that wasn't broken, forcing an hours-long rebuild of every replica. Six minutes of switch trouble became 6h33m of degraded API and dashboard.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>THE MOVE · </span>Humans worked around the automation — shedding discretionary load and hand-steering reads to secondary-DC replicas the failover process couldn't touch — and afterward Cloudflare slowed the promotion trigger: for an expensive cure, time is evidence.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>TRY · </span>Kill the switch dead first and watch failover shrug. Then degrade it, let the six minutes play out with a hair-trigger promotion, and mitigate by hand — saving the API will cost the dashboard. Finish by setting the trigger past 6 and meeting the near miss.</div>
    </div>
  );
}
