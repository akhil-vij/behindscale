import { useState, useEffect } from "react";

const ACCENT = "#FF9900";
const RED = "#ef4444"; const AMBER = "#eab308"; const GREEN = "#22c55e"; const VIOLET = "#9b8cf0";

const PER_SERVER = 30; const FLEET0 = 4; // capacity = fleet * 30 tps
const HUMAN = 80; const SURGE = 80; const CRAWLER = 60;

const initial = () => ({ t: 0, mode: 0, knobLow: true, surge: false, crawler: false, storm: false, fleet: FLEET0, retryLoad: 0, overTicks: 0, goodput: 0, humanGood: 0, wasted: 0, rejected: 0, offered: 0 });

// modes: 0 none · 1 maxconns · 2 shed blind · 3 +priorities · 4 +deadlines
function step(w) {
  const n = { ...w };
  n.t++;
  const cap = n.fleet * PER_SERVER;
  const humanDemand = HUMAN + (n.surge ? SURGE : 0);
  const crawlerDemand = n.crawler ? CRAWLER : 0;
  const demand = humanDemand + crawlerDemand;
  const offered = demand + n.retryLoad;
  n.offered = Math.round(offered);
  const retryFactor = n.storm ? 1.4 : 0.7;

  let admitted, rejectedCheap = 0;
  if (n.mode === 0) admitted = offered;
  else if (n.mode === 1) { const knob = n.knobLow ? 70 : 10000; admitted = Math.min(offered, knob); rejectedCheap = offered - admitted; }
  else { admitted = Math.min(offered, cap); rejectedCheap = offered - admitted; }

  let goodput, timeouts, doomedServed = 0;
  if (admitted <= cap) {
    goodput = admitted; timeouts = 0;
    // retry storms fill queues with requests whose clients left while waiting:
    // without deadline enforcement the server serves them anyway — useless replies.
    if (n.storm) { const doomed = admitted * 0.3; if (n.mode >= 4) { n.wasted = Math.round(n.wasted + doomed * 0.1); } else { goodput -= doomed; doomedServed = doomed; } }
  }
  else { const over = admitted - cap; goodput = Math.max(0, cap - over * 1.2); timeouts = admitted - goodput; }

  // blind shedding treats pings like any other request: sustained rejection drops health checks → LB pulls servers
  if (n.mode === 2 && rejectedCheap > 0) { n.overTicks++; if (n.overTicks % 2 === 0 && n.fleet > 1) n.fleet--; }
  else if (n.mode !== 2) n.overTicks = 0;

  // priorities: crawlers shed first — human goodput fills before crawler
  n.humanGood = Math.round(n.mode >= 3 ? Math.min(humanDemand, Math.max(0, goodput)) : Math.max(0, goodput) * (humanDemand / Math.max(1, offered)));

  // wasted work: cycles spent on timed-out or doomed-but-served requests
  const wastedNow = (n.mode >= 4 ? timeouts * 0.2 : timeouts) + doomedServed;
  n.wasted = Math.round(n.wasted + wastedNow);

  // retries: timeouts retry hard; cheap rejections retry softly; the client population is finite
  n.retryLoad = Math.min(300, Math.round(timeouts * retryFactor + rejectedCheap * 0.25));
  n.goodput = Math.round(Math.max(0, goodput));
  n.rejected = Math.round(rejectedCheap);
  return n;
}

export default function ThePingComesFirst() {
  const [w, setW] = useState(initial);
  useEffect(() => { const id = setInterval(() => setW(step), 650); return () => clearInterval(id); }, []);
  const cap = w.fleet * PER_SERVER;
  const collapsing = w.mode < 2 && w.goodput < cap * 0.5 && w.retryLoad > 40;

  const verdict = (() => {
    if (w.mode === 2 && w.fleet < FLEET0) return { c: RED, code: "SHED BLIND, THE FLEET SHRANK", t: `The shedder can't tell a health check from a crawler hit, so under sustained rejection the load balancer's pings get dropped with the excess — and the balancer pulls the "dead" servers. Fleet: ${w.fleet}/${FLEET0}, capacity down to ${cap} tps, which makes the overload worse, which sheds more pings. The drop budget spent so wrongly it destroys the capacity that would have absorbed the load. Arm +PRIORITIES.` };
    if (w.mode === 0 && collapsing) return { c: RED, code: "GOODPUT COLLAPSES, RETRIES MULTIPLY", t: `Admitted load is past the inflection point: latency crossed the client timeout, so completed work counts for nothing — goodput ${w.goodput}/${cap} tps — and every timeout respawns as a retry (${w.retryLoad} tps of retry load and climbing). Overload as a steady state: the system can't work its way out, because working is the mechanism of the collapse.` };
    if (w.mode === 1 && w.knobLow && w.rejected > 0 && w.offered < cap) return { c: AMBER, code: "THE KNOB HAS NO RIGHT VALUE", t: `max_conns=70 is rejecting ${w.rejected} tps while the fleet has ${cap - w.goodput} tps of idle capacity — false positives by construction. Flip the knob HIGH and it admits everything, which is brownout with extra steps. Too low cuts off capacity you have; too high permits collapse; just right decays into wrong at the next workload shift.` };
    if (w.mode === 1 && !w.knobLow) return { c: AMBER, code: "THE KNOB HAS NO RIGHT VALUE", t: "max_conns is now set high — which is to say, off. Overload the system and watch it behave exactly like no protection at all. The concept was too imprecise to be the answer: a static number sees none of what matters — importance, deadlines, queue age." };
    if (w.mode >= 4 && w.storm) return { c: VIOLET, code: "DOOMED WORK, DROPPED AT DEQUEUE", t: "The retry storm is filling the queues with requests whose clients have already left — and the propagated deadline hints identify them at dequeue, so they're discarded for a fraction of the cost of serving them. A late reply is a success only from the server's perspective; the wasted-work meter is what deadline propagation exists to flatten." };
    if (w.mode >= 3 && w.surge && w.goodput >= cap * 0.9 && w.fleet === FLEET0) return { c: GREEN, code: "GOODPUT HOLDS PAST THE BREAK", t: `Offered load ${w.offered} tps against ${cap} of capacity — and goodput sits at ${w.goodput}, flat on the plateau, which is the ideal load-test shape the post describes. Pings admitted first (fleet intact at ${w.fleet}), crawlers shed ahead of humans (human goodput ${w.humanGood} tps), excess rejected fast. Only the excess traffic's availability is affected.` };
    if (w.mode >= 3) return { c: GREEN, code: "THE PING COMES FIRST", t: `Triage is armed. The health check outranks every customer request — drop it and the fleet shrinks; below it, completions over initiations, within-quota over burst, humans over crawlers (crawlers shift off-peak; humans don't). Push SURGE and RETRY STORM at it and watch the plateau hold.` };
    if (w.mode === 2) return { c: AMBER, code: "SHEDDING, BUT BLIND", t: "Excess load is being rejected and goodput protected — for now. This shedder treats every request identically, including the load balancer's pings. Hold it under sustained overload (SURGE ON) and watch what a blind drop budget does to the fleet." };
    return { c: AMBER, code: "A SERVER, ITS CLIENTS, AND THEIR PATIENCE", t: `${cap} tps of capacity, ${w.offered} tps offered. Turn on the SURGE with no protection and watch latency cross the client timeout — then meet the feedback loop. Arm the ladder one rung at a time; each rung exists because the previous one fails a specific way.` };
  })();

  const mono = "'JetBrains Mono','Fira Code',ui-monospace,monospace";
  const S = {
    root: { background: "#08090D", color: "#c8cdd8", fontFamily: mono, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid #2a2a3a", fontSize: 12, lineHeight: 1.5 },
    panel: { background: "#111118", border: "1px solid #2a2a3a", borderRadius: 8, padding: 12 },
    label: { color: "#6b7080", fontSize: 10, letterSpacing: 1.2 },
    btn: (on, dis, col) => ({ display: "block", width: "100%", textAlign: "left", padding: "7px 9px", marginTop: 6, borderRadius: 6, cursor: dis ? "not-allowed" : "pointer", opacity: dis ? 0.4 : 1, border: `1px solid ${on ? (col || ACCENT) : "#2a2a3a"}`, color: on ? "#ffd9a8" : "#8b90a0", background: on ? "rgba(255,153,0,0.10)" : "#0c0d13", fontFamily: mono, fontSize: 11 }),
  };
  const M = (m, label, sub) => (
    <button key={m} style={S.btn(w.mode === m, false)} onClick={() => setW(x => ({ ...initial(), mode: m, knobLow: x.knobLow, surge: x.surge, crawler: x.crawler, storm: x.storm }))}>{label}<div style={{ color: "#6b7080", fontSize: 10 }}>{sub}</div></button>
  );
  const bar = (v, max, col) => <div style={{ height: 10, background: "#0c0d13", border: "1px solid #2a2a3a", borderRadius: 4, overflow: "hidden" }}><div style={{ width: Math.min(100, (v / max) * 100) + "%", height: "100%", background: col }} /></div>;

  return (
    <div style={S.root}>
      <div style={{ color: ACCENT, fontSize: 10, letterSpacing: 2 }}>AWS · USING LOAD SHEDDING TO AVOID OVERLOAD — INTERACTIVE</div>
      <div style={{ color: "#edeff3", fontSize: 16, margin: "4px 0 2px", fontWeight: 700 }}>The ping comes first</div>
      <p style={{ color: "#8b90a0", fontSize: 11, margin: 0 }}>You operate an overloaded fleet. Each rung of the ladder exists because the rung below fails a specific, watchable way.</p>
      <ContextBlock />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
        <div style={{ ...S.panel, flex: "1 1 250px", minWidth: 250 }}>
          <div style={S.label}>THE LADDER</div>
          {M(0, "0 · NO PROTECTION", "admit everything; meet the loop")}
          {M(1, "1 · MAX CONNECTIONS", "the knob with no right value")}
          {w.mode === 1 && <button style={S.btn(false, false, AMBER)} onClick={() => setW(x => ({ ...x, knobLow: !x.knobLow }))}>FLIP KNOB: {w.knobLow ? "LOW (70) → set HIGH" : "HIGH (∞) → set LOW"}</button>}
          {M(2, "2 · LOAD SHEDDING (BLIND)", "reject excess — pings included")}
          {M(3, "3 · + PRIORITIES", "pings first · humans over crawlers")}
          {M(4, "4 · + DEADLINE PROPAGATION", "drop the doomed at dequeue")}
          <div style={{ ...S.label, marginTop: 12 }}>TROUBLE</div>
          <button style={S.btn(w.surge, false, AMBER)} onClick={() => setW(x => ({ ...x, surge: !x.surge }))}>TRAFFIC SURGE: {w.surge ? "ON (+80 tps)" : "OFF"}</button>
          <button style={S.btn(w.crawler, false, AMBER)} onClick={() => setW(x => ({ ...x, crawler: !x.crawler }))}>CRAWLER WAVE: {w.crawler ? "ON (+60 tps, shiftable)" : "OFF"}</button>
          <button style={S.btn(w.storm, false, RED)} onClick={() => setW(x => ({ ...x, storm: !x.storm }))}>RETRY STORM: {w.storm ? "ON (timeouts retry ×1.4)" : "OFF"}</button>
          <button style={{ ...S.btn(false, false), marginTop: 12 }} onClick={() => setW(x => ({ ...initial(), mode: x.mode }))}>↺ RESET METERS</button>
        </div>

        <div style={{ flex: "2 1 440px", minWidth: 300 }}>
          <div style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${verdict.c}`, background: `${verdict.c}14`, marginBottom: 12 }}>
            <div style={{ color: verdict.c, fontWeight: 700 }}>{verdict.code}</div>
            <div style={{ marginTop: 5, fontSize: 11.5, lineHeight: 1.6 }}>{verdict.t}</div>
          </div>
          <div style={S.panel}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={S.label}>THE FLEET — {w.fleet}/{FLEET0} SERVERS THE BALANCER TRUSTS · CAPACITY {cap} TPS</div>
              <div style={{ fontSize: 10, color: "#6b7080" }}>t={w.t}</div>
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              {Array.from({ length: FLEET0 }, (_, i) => (
                <div key={i} style={{ flex: 1, textAlign: "center", padding: "8px 4px", borderRadius: 6, background: "#0c0d13", border: `1px solid ${i < w.fleet ? GREEN : RED}` }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: i < w.fleet ? GREEN : RED }}>{i < w.fleet ? "IN ROTATION" : "PULLED"}</div>
                  <div style={{ fontSize: 9, color: "#6b7080" }}>{i < w.fleet ? "ping answered" : "ping was shed"}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={S.label}>OFFERED (incl. retries)</span><span style={{ fontSize: 11 }}>{w.offered} tps</span></div>
              {bar(w.offered, 300, AMBER)}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}><span style={S.label}>GOODPUT</span><span style={{ fontSize: 11, color: w.goodput >= cap * 0.9 ? GREEN : w.goodput < cap * 0.5 ? RED : "#c8cdd8" }}>{w.goodput} tps</span></div>
              {bar(w.goodput, 300, w.goodput < cap * 0.5 ? RED : GREEN)}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}><span style={S.label}>RETRY LOAD (the loop)</span><span style={{ fontSize: 11, color: w.retryLoad > 60 ? RED : "#c8cdd8" }}>{w.retryLoad} tps</span></div>
              {bar(w.retryLoad, 300, RED)}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              <div style={{ flex: 1 }}><div style={S.label}>HUMAN GOODPUT</div><div style={{ fontSize: 16, fontWeight: 700, color: GREEN }}>{w.humanGood}</div></div>
              <div style={{ flex: 1 }}><div style={S.label}>REJECTED (cheap)</div><div style={{ fontSize: 16, fontWeight: 700 }}>{w.rejected}</div></div>
              <div style={{ flex: 1 }}><div style={S.label}>WASTED WORK Σ</div><div style={{ fontSize: 16, fontWeight: 700, color: w.wasted > 200 ? RED : "#c8cdd8" }}>{w.wasted}</div></div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ color: "#6b7080", fontSize: 10, marginTop: 12, borderTop: "1px solid #2a2a3a", paddingTop: 8, lineHeight: 1.7 }}>
        The max-connections confession (too low, too high, and just-right-until-the-workload-shifts), the goodput/throughput vocabulary, the timeout-crossing availability collapse and retry feedback loop, the ping-outranks-everything triage (a shed health check idles the server and shrinks the fleet), end()-over-start() and later-pages-over-first, within-quota over burst, crawler-versus-human shaping pushed to the front of the stack, transitive deadline propagation with its clock plumbing (Time Sync, monotonic timers, TCP-buffer stopwatch hazards) and drop-at-dequeue enforcement, queue-age bounding with LIFO preference and the Classic-ELB-surge-queue-to-ALB-spillover lesson, layered protection (WAF, API Gateway, iptables, framework, code) with false positives held at zero, the autoscaling-silencing and AZ-headroom warnings, and the serverless per-request-isolation coda are all from David Yanacek's Builders' Library article. The four-server fleet, tick dynamics, and tps figures here are an illustrative miniature; the fleet-shrinkage rate under blind shedding is a dramatization of the stated mechanism, not a sourced measurement.
        {" "}<a href="https://behindscale.com/articles/aws-load-shedding" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: "none" }}>From the full dissection at behindscale.com →</a>
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
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 8 }}><span style={lbl}>THE PROBLEM · </span>An overloaded server's latency crosses its clients' timeouts, so finished work counts for nothing and every timeout respawns as a retry — overload as a self-sustaining steady state. And a shedder that can't rank importance drops the wrong things, up to and including the health checks that keep the server in the fleet.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>THE MOVE · </span>Shed excess load to hold the goodput plateau — and shed by explicit priority: pings above everything, completions over initiations, within-quota over burst, humans over crawlers; propagate client deadlines transitively and drop doomed requests at dequeue; bound queue age; protect in layers from WAF to iptables to code, false positives held at zero.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>TRY · </span>Surge the unprotected server and watch the retry loop close. Try the max-connections knob at both ends. Arm blind shedding and shrink your own fleet — then add priorities and hold the plateau; add deadlines during a retry storm and watch the wasted-work meter go flat.</div>
    </div>
  );
}
