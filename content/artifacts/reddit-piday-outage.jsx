import { useState } from "react";

const ACCENT = "#FF4500";
const RED = "#ef4444"; const AMBER = "#eab308"; const GREEN = "#22c55e"; const VIOLET = "#9b8cf0";

const RAMP = [1, 5, 10, 20, 35, 55, 80, 100];
export const initial = () => ({ stage: "pre", clock: 0, tried: {}, target: null, certsFixed: false, pct: 0, herds: 0, logsStep: 0 });

export function act(w, a) {
  const n = { ...w, tried: { ...w.tried } };
  if (a === "upgrade" && n.stage === "pre") { n.stage = "chaos"; n.clock = 2; return n; }
  if (n.stage === "chaos" && ["pod", "typha", "cp", "opa"].includes(a) && !n.tried[a]) { n.tried[a] = true; n.clock += 30; return n; }
  if (a === "restore" && n.stage === "chaos") { n.stage = "choice"; n.clock += 20; return n; } // terminate workers first
  if (n.stage === "choice" && (a === "node1" || a === "backupnode")) {
    n.target = a; n.clock += 45;
    n.stage = a === "node1" ? "joinfail" : "joined"; // the runbook's hidden assumption
    return n;
  }
  if (a === "investigate" && n.stage === "joinfail") { n.stage = "joined"; n.certsFixed = true; n.clock += 15; return n; }
  if (a === "beginreadmit" && n.stage === "joined") { n.stage = "readmit"; n.pct = 0; return n; }
  if (n.stage === "readmit" && a === "jump") { n.herds += 1; n.pct = 0; n.clock += 15; return n; } // cold caches punish the firehose
  if (n.stage === "readmit" && a === "step") {
    const i = RAMP.indexOf(n.pct); n.pct = RAMP[Math.min(RAMP.length - 1, i + 1)] ?? RAMP[0];
    if (n.pct === 0 || i === -1) n.pct = RAMP[0];
    n.clock += 5;
    if (n.pct === 100) n.stage = "restored";
    return n;
  }
  if (a === "logs" && n.stage === "restored") { n.stage = "logs"; n.logsStep = 0; return n; }
  if (a === "nextclue" && n.stage === "logs") { n.logsStep += 1; if (n.logsStep >= 3) n.stage = "reveal"; return n; }
  if (a === "reset") return initial();
  return n;
}

const clockStr = (m) => `T+${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;

export default function PiDay() {
  const [w, setW] = useState(initial);
  const go = (a) => () => setW(x => act(x, a));
  const triedAll = ["pod", "typha", "cp", "opa"].every(k => w.tried[k]);

  const verdict = (() => {
    switch (w.stage) {
      case "pre": return { c: AMBER, code: "A ROUTINE TUESDAY", t: "The cluster running Old Reddit — the most critical legacy node in the dependency graph, a hand-reared kubeadm pet — is queued for its 1.23 → 1.24 upgrade. The process is careful: tested on dedicated clusters, rolled lowest criticality to highest. The team just closed the postmortem for the last upgrade of this same cluster. Kick it off." };
      case "chaos": {
        if (w.tried.opa) return { c: RED, code: "THE TIMEOUTS VANISH. THE CLUSTER STAYS DEAD.", t: `Deleting OPA's webhook configurations killed the API-server write timeouts instantly — a real finding — and recovered nothing. ${clockStr(w.clock)}. ${triedAll ? "Fix-forward is out of ideas. The only path left is the one everyone fears." : "Other attempts remain, or pull the ripcord."}` };
        if (w.tried.cp) return { c: RED, code: "OFF AND ON AGAIN — NOTHING", t: `The full control-plane restart, the classic, changed nothing. Pods still crawl, images still take minutes, DNS still splits (Consul and in-cluster dead, public fine). ${clockStr(w.clock)}.` };
        if (w.tried.typha) return { c: RED, code: "THE PODS NEVER CAME BACK", t: `You deleted calico-typha's pods — the caching proxy between Calico and the control plane — and waited. No new pods. Minutes pass. Nothing schedules cleanly on this cluster anymore. ${clockStr(w.clock)}.` };
        if (w.tried.pod) return { c: RED, code: "NOT THE BUG YOU KNOW", t: `calico-kube-controllers is stuck in ContainerCreating — which looks exactly like the known low-severity CRI-O restart bug. Delete the pod, it recreates, move on. Except this time it doesn't. ${clockStr(w.clock)}.` };
        return { c: RED, code: "FLYING BLIND AT T+2", t: "Two minutes after the upgrade started, the site halted — and every metric from this cluster is NO DATA, because the metrics are Kubernetes-native and died with it. The CDN edge (intentionally separate) shows requests cratering. The one clue: Consul and in-cluster DNS won't resolve; public DNS is fine. Rollback is Plan A — but Kubernetes has no downgrade path. Fix forward, or restore from a backup nobody has ever run against production." };
      }
      case "choice": return { c: AMBER, code: "THE RIPCORD", t: `Workers terminated — twenty minutes of API calls on the largest cluster, ${clockStr(w.clock)}. Now the restore, from a runbook written for an end-of-life Kubernetes and the Docker era, rewritten live as you go. It says: restore to node 1, the procedure's baseline. The backup, though, was written to run from ANY control-plane node. Where do you restore?` };
      case "joinfail": return { c: RED, code: "STUCK JOINING, NO ERROR", t: `The restore to node 1 worked — the autoscaler even sprang to life (networking is back; you shut it off to regain control), and AWS briefly ran out of your control-plane instance type. But the two new control-plane nodes will not join: stuck, silent, unable to reach etcd — the cluster's consensus store — on the restored node. A breakout group forks off. INVESTIGATE.` };
      case "joined": return { c: w.certsFixed ? VIOLET : GREEN, code: w.certsFixed ? "THE BACKUP'S HIDDEN ASSUMPTION" : "THE HINDSIGHT PATH", t: w.certsFixed ? `Found in minutes: the backup runs on any node, the restore only works on the SAME node — and it wasn't. The restored node's TLS certificates carry the wrong hostname, so nothing will speak to it. Certificates regenerated with some fumbling and no documentation. High-availability control plane restored, ${clockStr(w.clock)}. Now bring Reddit back.` : `Restoring on the node the backup was taken from — the requirement the runbook never wrote down — the joins work first try. In the real incident, the procedure said node 1, and the mismatch surfaced as silent TLS failures. Control plane whole, ${clockStr(w.clock)}. Now bring Reddit back.` };
      case "readmit": return { c: w.herds > 0 && w.pct === 0 ? RED : AMBER, code: w.herds > 0 && w.pct === 0 ? "A THUNDERING HERD OF YOUR OWN MAKING" : `READMITTING — ${w.pct}%`, t: w.herds > 0 && w.pct === 0 ? "You opened the firehose at a cold system: caches empty, downstream services idled and scaled down during the outage. The herd washed them out; back to zero. Reddit's caches are load-bearing — full traffic is only servable when they're warm. Walk it: 1, 5, 10, 20, 35, 55, 80, 100." : `Traffic at ${w.pct}%. Idle services waking, caches warming, touchy legacy services hand-gated back in. Keep stepping — or try the firehose and see why they didn't.` };
      case "restored": return { c: GREEN, code: "SITE RESTORED — CAUSE UNKNOWN", t: `${clockStr(w.clock)}. The walk home: 1 → 5 → 10 → 20 → 35 → 55 → 80 → 100. The outage is over — 314 minutes in the real timeline — and nobody yet knows why it happened. The metrics died with the cluster. The logs survived, because they're low-level and deliberately not Kubernetes-native. 3.9 billion lines of them. Start digging.` };
      case "logs": {
        const clues = [
          { code: "CLUE 1 — 19:04:49", t: "The API server's log volume explodes 5x at that instant. The only hint inside: the OPA webhook timeouts you already found mid-incident. Next clue." },
          { code: "CLUE 2 — FIVE SECONDS BEFORE", t: "OPA's own logs stop entirely, five seconds before the API server starts screaming. A dead end — OPA was a casualty, not a cause. Next clue." },
          { code: "CLUE 3 — TWO SECONDS BEFORE", t: "Calico's logs: calico-node across the cluster drops routes to the first upgraded control-plane node — expected, it went offline for the upgrade. Then ALL routes for ALL nodes drop. That's when it clicks. See what the route reflectors were selecting." },
        ];
        const c = clues[Math.min(w.logsStep, 2)];
        return { c: VIOLET, code: c.code, t: c.t };
      }
      case "reveal": return { c: RED, code: "COMMITTED NOWHERE", t: "The route reflectors — the few nodes that relay routes so hundreds needn't all peer with each other — selected nodes by the label node-role.kubernetes.io/master. Kubernetes renamed 'master' to 'control-plane' in 1.20 and removed the old label from running clusters in 1.24. The selectors matched nothing; the mesh lost its relays; networking ceased — two seconds into the upgrade. And nothing could have flagged it, because the configuration was hand-edited through Calico's CLI years ago by a team that no longer exists, and committed NOWHERE: no repository, no record, no breadcrumbs. One engineer happened to remember the feature existed — during the postmortem. The post's verdict: that label is the proximate cause; the actual cause is Inconsistency — and the cure is to standardize, and codify everything." };
      default: return { c: AMBER, code: "", t: "" };
    }
  })();

  const mono = "'JetBrains Mono','Fira Code',ui-monospace,monospace";
  const S = {
    root: { background: "#08090D", color: "#c8cdd8", fontFamily: mono, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid #2a2a3a", fontSize: 12, lineHeight: 1.5 },
    panel: { background: "#111118", border: "1px solid #2a2a3a", borderRadius: 8, padding: 12 },
    label: { color: "#6b7080", fontSize: 10, letterSpacing: 1.2 },
    btn: (dis, col) => ({ display: "block", width: "100%", textAlign: "left", padding: "7px 9px", marginTop: 6, borderRadius: 6, cursor: dis ? "not-allowed" : "pointer", opacity: dis ? 0.35 : 1, border: `1px solid ${col || "#2a2a3a"}`, color: "#c8cdd8", background: "#0c0d13", fontFamily: mono, fontSize: 11 }),
    metric: (dead) => ({ flex: "1 1 100px", background: "#0c0d13", border: `1px solid ${dead ? RED : "#2a2f45"}`, borderRadius: 6, padding: 8, textAlign: "center", color: dead ? RED : GREEN, fontSize: 10, fontWeight: 700 }),
  };
  const inChaos = w.stage === "chaos";
  const metricsDead = w.stage !== "pre";

  return (
    <div style={S.root}>
      <div style={{ color: ACCENT, fontSize: 10, letterSpacing: 2 }}>REDDIT · YOU BROKE REDDIT: THE PI-DAY OUTAGE — INTERACTIVE</div>
      <div style={{ color: "#edeff3", fontSize: 16, margin: "4px 0 2px", fontWeight: 700 }}>Committed nowhere</div>
      <p style={{ color: "#8b90a0", fontSize: 11, margin: 0 }}>You're in the incident commander's seat, {clockStr(w.clock)} on the clock. The cause is invisible — it was never written down anywhere you can look.</p>
      <ContextBlock />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
        <div style={{ ...S.panel, flex: "1 1 260px", minWidth: 260 }}>
          <div style={S.label}>ACTIONS · {clockStr(w.clock)}</div>
          {w.stage === "pre" && <button style={S.btn(false, ACCENT)} onClick={go("upgrade")}>START THE 1.23 → 1.24 UPGRADE</button>}
          {inChaos && <>
            <button style={S.btn(w.tried.pod)} disabled={w.tried.pod} onClick={go("pod")}>DELETE THE STUCK CALICO POD<div style={{ color: "#6b7080", fontSize: 10 }}>looks like the known CRI-O bug (+30 min)</div></button>
            <button style={S.btn(w.tried.typha)} disabled={w.tried.typha} onClick={go("typha")}>RESTART CALICO-TYPHA (+30 min)</button>
            <button style={S.btn(w.tried.cp)} disabled={w.tried.cp} onClick={go("cp")}>FULL CONTROL-PLANE RESTART (+30 min)</button>
            <button style={S.btn(w.tried.opa)} disabled={w.tried.opa} onClick={go("opa")}>DELETE OPA'S ADMISSION WEBHOOKS (+30 min)</button>
            <button style={S.btn(false, RED)} onClick={go("restore")}>PULL THE RIPCORD: RESTORE FROM BACKUP<div style={{ color: "#6b7080", fontSize: 10 }}>terminate all workers first (+20 min)</div></button>
          </>}
          {w.stage === "choice" && <>
            <button style={S.btn(false, AMBER)} onClick={go("node1")}>FOLLOW THE RUNBOOK: RESTORE TO NODE 1</button>
            <button style={S.btn(false, VIOLET)} onClick={go("backupnode")}>RESTORE TO THE NODE THE BACKUP CAME FROM</button>
          </>}
          {w.stage === "joinfail" && <button style={S.btn(false, VIOLET)} onClick={go("investigate")}>FORK A BREAKOUT GROUP: INVESTIGATE THE JOINS</button>}
          {w.stage === "joined" && <button style={S.btn(false, GREEN)} onClick={go("beginreadmit")}>BEGIN BRINGING TRAFFIC BACK</button>}
          {w.stage === "readmit" && <>
            <button style={S.btn(false, GREEN)} onClick={go("step")}>NEXT STEP ({w.pct === 0 ? "→ 1%" : `${w.pct}% → ${RAMP[Math.min(RAMP.length - 1, RAMP.indexOf(w.pct) + 1)]}%`})</button>
            <button style={S.btn(false, RED)} onClick={go("jump")}>OPEN THE FIREHOSE: JUMP TO 100%</button>
          </>}
          {w.stage === "restored" && <button style={S.btn(false, VIOLET)} onClick={go("logs")}>DIG INTO 3.9 BILLION LOG LINES</button>}
          {w.stage === "logs" && <button style={S.btn(false, VIOLET)} onClick={go("nextclue")}>NEXT CLUE</button>}
          <button style={{ ...S.btn(false), marginTop: 12 }} onClick={go("reset")}>↺ RESET THE INCIDENT</button>
        </div>

        <div style={{ flex: "2 1 440px", minWidth: 300 }}>
          <div style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${verdict.c}`, background: `${verdict.c}14`, marginBottom: 12 }}>
            <div style={{ color: verdict.c, fontWeight: 700 }}>{verdict.code}</div>
            <div style={{ marginTop: 5, fontSize: 11.5, lineHeight: 1.6 }}>{verdict.t}</div>
          </div>
          <div style={S.panel}>
            <div style={S.label}>WHAT YOU CAN SEE</div>
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              <div style={S.metric(metricsDead)}>{metricsDead ? "NO DATA" : "OK"}<div style={{ color: "#6b7080", fontWeight: 400 }}>cluster metrics</div></div>
              <div style={S.metric(metricsDead)}>{metricsDead ? "NO DATA" : "OK"}<div style={{ color: "#6b7080", fontWeight: 400 }}>pod health</div></div>
              <div style={S.metric(metricsDead && w.stage !== "restored" && w.stage !== "logs" && w.stage !== "reveal")}>{metricsDead && !["restored", "logs", "reveal"].includes(w.stage) ? "SPLIT" : "OK"}<div style={{ color: "#6b7080", fontWeight: 400 }}>DNS (Consul / public)</div></div>
              <div style={{ ...S.metric(false), borderColor: GREEN }}>ALIVE<div style={{ color: "#6b7080", fontWeight: 400 }}>logs (non-native)</div></div>
              <div style={{ ...S.metric(false), borderColor: GREEN }}>ALIVE<div style={{ color: "#6b7080", fontWeight: 400 }}>CDN edge stats</div></div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              <div style={{ flex: 1 }}><div style={S.label}>SITE</div><div style={{ fontSize: 13, fontWeight: 700, color: w.stage === "restored" || w.stage === "logs" || w.stage === "reveal" ? GREEN : w.stage === "readmit" ? AMBER : w.stage === "pre" ? GREEN : RED }}>{["restored", "logs", "reveal"].includes(w.stage) ? "UP" : w.stage === "readmit" ? `${w.pct}%` : w.stage === "pre" ? "UP" : "DOWN"}</div></div>
              <div style={{ flex: 1 }}><div style={S.label}>FIX-FORWARD ATTEMPTS</div><div style={{ fontSize: 13, fontWeight: 700 }}>{Object.keys(w.tried).length}/4</div></div>
              <div style={{ flex: 1 }}><div style={S.label}>HERDS UNLEASHED</div><div style={{ fontSize: 13, fontWeight: 700, color: w.herds ? RED : "#c8cdd8" }}>{w.herds}</div></div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ color: "#6b7080", fontSize: 10, marginTop: 12, borderTop: "1px solid #2a2a3a", paddingTop: 8, lineHeight: 1.7 }}>
        The two-minutes-to-chaos timeline, dead Kubernetes-native metrics with surviving low-level logs and separated CDN stats, the split-DNS clue (Consul and in-cluster dead, public fine), the fix-forward sequence (the CRI-O lookalike pod deletion, typha pods never recreating, the futile full control-plane restart, the OPA webhook deletion that killed the timeouts and saved nothing), Kubernetes' absent downgrade path, the twenty-minute worker termination, the Docker-era runbook rewritten live, the any-node-backup/same-node-restore asymmetry surfacing as silent TLS join failures, the AWS control-plane capacity exhaustion, the 1-5-10-20-35-55-80-100 readmission walk with thundering-herd caution and hand-gated legacy services, the 3.9-billion-line log dig (the 5x API-server explosion at 19:04:49, OPA's five-seconds-prior silence, Calico's two-seconds-prior all-routes drop), the route-reflector configuration selecting node-role.kubernetes.io/master, Kubernetes 1.24's removal of that label from running clusters, the committed-nowhere finding with its departed authors, and the proximate-vs-actual (Inconsistency) verdict with the standardize-and-codify remediation program are all from Reddit's r/RedditEng Pi-Day postmortem. The 30-minute attempt costs and the single-choice restore branch are an illustrative compression of a response that ran many threads in parallel.
        {" "}<a href="https://behindscale.com/articles/reddit-piday-outage" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: "none" }}>From the full dissection at behindscale.com →</a>
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
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 8 }}><span style={lbl}>THE PROBLEM · </span>A routine Kubernetes upgrade took Reddit down in two minutes, for 314 minutes — because the cluster's network routing depended on configuration set up years earlier by a departed team, hand-edited through a vendor tool, saved in no repository, and keyed to a label the new Kubernetes version silently deleted. Nothing and no one could see the dependency before it fired.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>THE MOVE · </span>Survive the day (an unrehearsed restore from backup, rewritten live, plus a walked 1%-to-100% traffic return) — then fix the real cause: standardize the bespoke clusters and codify everything, so no load-bearing state exists without a record and a breadcrumb trail for whoever comes after.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>TRY · </span>Run the incident from the commander's seat: go blind at T+2, burn the fix-forward attempts, pull the ripcord, hit the runbook's hidden trap, open the firehose once to meet the thundering herd — then walk home in eight steps and dig the two-second clue out of 3.9 billion log lines.</div>
    </div>
  );
}
