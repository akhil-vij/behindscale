import { useState, useEffect } from "react";

const ACCENT = "#0A66C2"; const ACCENT_TXT = "#7FB8E8";
const RED = "#ef4444"; const AMBER = "#eab308"; const GREEN = "#22c55e"; const VIOLET = "#9b8cf0";

export const CAP = 100;
export const TRAFFIC = {
  normal: { opt: 32, deg: 24, non: 24 },
  surge: { opt: 60, deg: 45, non: 45 },
  heavy: { opt: 84, deg: 63, non: 63 },
  // member demand alone exceeds capacity: even after shedding all optional and
  // degradable, non-degradable does not fit - the case where tiering runs out.
  spike: { opt: 30, deg: 30, non: 110 },
};
export const LIMIT0 = 90; export const PROBE_STEP = 15; export const PROBE_BASE = 6;
export const LAT_FIRE = 70; export const LAT_OK = 35;
// cap the per-tick latency climb so demand can cross capacity for a beat with the
// detector still watching, before the confirmation line is crossed and the limit engages.
export const LAT_RISE = 26;

const TRAFFIC_LABEL = { normal: "NORMAL", surge: "SURGE", heavy: "HEAVY", spike: "MEMBER SPIKE" };

export const initial = () => ({
  t: 0, traffic: "normal", mode: "blind", scope: "host",
  lat: 18, on: false, limit: 0, pre: 0, stable: 0, probeIn: PROBE_BASE, backoff: 1,
  probing: false, reverted: false, budget: 100, retries: true, retryLoad: 0,
  served: { opt: 0, deg: 0, non: 0 }, dropped: { opt: 0, deg: 0, non: 0 },
  score: { blind: 0, tiered: 0 },
});

export function step(w) {
  const n = { ...w, served: { ...w.served }, dropped: { ...w.dropped }, score: { ...w.score } };
  n.t++;
  const D = TRAFFIC[n.traffic];
  const total = D.opt + D.deg + D.non;

  // admission - v1 blind: pro-rata across tiers; v2 tiered: fill from the top of the ladder
  let s;
  if (!n.on) s = { ...D };
  else if (n.mode === "blind") {
    const sc = Math.min(1, n.limit / total);
    s = { opt: Math.round(D.opt * sc), deg: Math.round(D.deg * sc), non: Math.round(D.non * sc) };
  } else {
    let r = n.limit;
    const non = Math.min(D.non, r); r -= non;
    const deg = Math.min(D.deg, r); r -= deg;
    const opt = Math.min(D.opt, r);
    s = { opt, deg, non };
  }
  n.served = s;
  n.dropped = { opt: D.opt - s.opt, deg: D.deg - s.deg, non: D.non - s.non };
  const droppedTotal = n.dropped.opt + n.dropped.deg + n.dropped.non;
  n.score[n.mode] += n.dropped.non;

  // retries: on one hot host, drops land on healthy peers; cluster-wide, they add load and burn budget
  if (n.scope === "cluster") {
    if (n.retries) {
      n.retryLoad = Math.round(droppedTotal * 0.6);
      n.budget = Math.max(0, n.budget - Math.round(droppedTotal * 0.5));
      if (n.budget === 0) n.retries = false;
    } else {
      n.retryLoad = 0;
      if (droppedTotal === 0) n.budget = Math.min(100, n.budget + 4);
      if (n.budget >= 100) n.retries = true;
    }
  } else {
    n.retryLoad = 0;
    n.budget = Math.min(100, n.budget + 4);
    n.retries = true;
  }

  // latency responds to work actually admitted (plus cluster-wide retry arrivals).
  // the per-tick rise is capped so the climb is visible: demand can sit above capacity
  // for a tick or two, detector watching, before the confirmation line is crossed.
  const work = s.opt + s.deg + s.non + n.retryLoad;
  if (work > CAP) n.lat = Math.min(200, n.lat + Math.min(LAT_RISE, (work - CAP) * 2.2));
  else n.lat = Math.max(18, n.lat - 14);

  // detector fires on confirmed latency; the limit engages, probes, burns, backs off
  const fired = n.lat > LAT_FIRE;
  if (fired) {
    if (!n.on) {
      n.on = true; n.limit = LIMIT0; n.stable = 0; n.probeIn = PROBE_BASE; n.backoff = 1; n.probing = false; n.reverted = false;
    } else if (n.probing) {
      n.limit = n.pre; n.probing = false; n.reverted = true;
      n.backoff = Math.min(16, n.backoff * 2); n.probeIn = PROBE_BASE * n.backoff; n.stable = 0;
    } else if (work > CAP) {
      // the admitted work itself exceeds capacity (e.g., retry amplification) - tighten;
      // residual latency draining after engagement is not evidence against the limit
      n.limit = Math.max(40, Math.round(n.limit * 0.85)); n.stable = 0;
    }
  } else if (n.on) {
    n.stable++;
    // a probe is accepted only after stability outlasts the detector's confirmation lag
    if (n.probing && n.stable >= 8) { n.probing = false; n.reverted = false; n.stable = 0; }
    else if (!n.probing && n.stable >= n.probeIn) {
      n.pre = n.limit; n.limit = n.limit + PROBE_STEP; n.probing = true; n.reverted = false; n.stable = 0;
    }
    if (n.limit >= total + 10 && n.lat <= LAT_OK) { n.on = false; n.limit = 0; n.backoff = 1; n.probing = false; n.reverted = false; }
  }
  return n;
}

export default function Hodor() {
  const [w, setW] = useState(initial);
  useEffect(() => { const id = setInterval(() => setW(step), 650); return () => clearInterval(id); }, []);
  const D = TRAFFIC[w.traffic];

  const verdict = (() => {
    if (w.on && w.mode === "blind" && w.dropped.non > 0 && w.served.opt > 0)
      return { c: RED, code: "THE DROP BUDGET, SPENT ON MEMBERS", t: `The shedder is engaged and blind: it caps admissions at ${w.limit} without reading priorities, so this tick it refused ${w.dropped.non} member requests while ${w.served.opt} optional offline reads sailed through. This is Hodor v1 - the blind, count-based limiter protects the service, but the protection is being spent on exactly the traffic the framework's most important goal exists to protect. Flip the shedder to V2: TIERED.` };
    if (w.scope === "cluster" && !w.retries)
      return { c: RED, code: "THE BUDGET SAYS STOP", t: `Every instance is hot, so retried drops were just load arriving twice - and the server-side retry budget has hit zero. The server stops instructing clients to retry: dropped requests now simply fail, on purpose, because keeping the traffic it can still serve beats a retry storm that finishes the cluster. Rescue-by-retry only works while the overload is local.` };
    if (w.reverted)
      return { c: AMBER, code: "THE CAP TRIED, THEN SNAPPED BACK", t: `The cap edged up to ${w.pre + PROBE_STEP}, the detector re-fired, and the cap snapped back to ${w.limit}. The wait before the next try doubled: ${w.probeIn} ticks. This is the price of a cap that is worked out fresh instead of remembered - every safe level is rediscovered, and failed tries are the visible cost of adapting.` };
    if (w.probing)
      return { c: ACCENT_TXT, code: "PROBING FOR HEADROOM", t: `Stability held long enough, so the limit is probing upward: ${w.pre} -> ${w.limit}. If the detector stays quiet, the raise sticks and the system carries more traffic; if it fires, the limit reverts and the backoff doubles. Watch the latency meter.` };
    if (w.on && w.mode === "tiered" && w.dropped.non > 0)
      return { c: RED, code: "THE LADDER RAN OUT", t: `Optional and degradable are fully shed and the limit still can't fit all non-degradable demand - ${w.dropped.non} member requests dropped this tick. Tiering chooses who fails first; it does not create capacity. Below this line the only answers are more capacity or fewer members served.` };
    if (w.on && w.mode === "tiered" && w.dropped.deg > 0 && w.dropped.opt >= D.opt)
      return { c: AMBER, code: "WALKING UP THE LADDER", t: `Optional is fully shed (${w.dropped.opt}/${D.opt}) and the pressure persists, so the threshold walked up: ${w.dropped.deg} degradable requests are dropping this tick - and every non-degradable member request is still served (${w.served.non}/${D.non}). The ladder is climbing exactly as designed: each tier is sacrificed completely before the next is touched.` };
    if (w.on && w.mode === "tiered" && w.dropped.opt > 0)
      return { c: GREEN, code: "OPTIONAL DIES FIRST. MEMBERS DON'T.", t: `Same overload, same limit of ${w.limit} - different victims. The tiered shedder fills admission from the top of the ladder down, so all ${w.served.non}/${D.non} member requests and all degradable traffic fit, and the entire cut (${w.dropped.opt} requests) lands on optional offline reads that cost nothing to drop. The per-priority rate told the shedder this cut was available before it made it.` };
    if (!w.on && (D.opt + D.deg + D.non) > CAP)
      return { c: AMBER, code: "LOAD CLIMBING - DETECTOR WATCHING", t: `Demand (${D.opt + D.deg + D.non}) exceeds capacity (${CAP}) and latency is rising (${Math.round(w.lat)}ms). The detectors are tuned to avoid false alarms even if they miss some: nothing is shed until the latency confirmation crosses the line. Hodor would rather act a beat late than harm members on a false alarm.` };
    if (w.on)
      return { c: AMBER, code: "LIMIT ENGAGED - SHEDDING TO RECOVER", t: `The detector fired and the limit clamped admissions to ${w.limit} against ${CAP} capacity. Latency (${Math.round(w.lat)}ms) is draining as the shed takes hold. Once it settles below the line, stability is counted and the limit begins probing upward on its own.` };
    return { c: ACCENT_TXT, code: "A SHEDDER MUST KNOW WHO IT'S DROPPING", t: `A service under Hodor, serving three kinds of traffic: member requests (non-degradable), degradable features, and optional offline reads. At normal demand (${D.opt + D.deg + D.non} against ${CAP} capacity) nothing is shed and the detectors just watch. Push traffic to SURGE and see what the v1 blind shedder does with the overflow.` };
  })();

  const mono = "'JetBrains Mono','Fira Code',ui-monospace,monospace";
  const S = {
    root: { background: "#08090D", color: "#c8cdd8", fontFamily: mono, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid #2a2a3a", fontSize: 12, lineHeight: 1.5 },
    panel: { background: "#111118", border: "1px solid #2a2a3a", borderRadius: 8, padding: 12 },
    label: { color: "#6b7080", fontSize: 10, letterSpacing: 1.2 },
    // FIX (2026-08-08 readability round): neutral off-state border lightened from #2a2a3a to
    // #4a4f60 so a button that is not selected stays findable against the dark background.
    btn: (on, dis, col) => ({ display: "block", width: "100%", textAlign: "left", padding: "7px 9px", marginTop: 6, borderRadius: 6, cursor: dis ? "not-allowed" : "pointer", opacity: dis ? 0.4 : 1, border: `1px solid ${on ? (col || ACCENT) : "#4a4f60"}`, color: on ? "#cfe6f7" : "#8b90a0", background: on ? "rgba(10,102,194,0.14)" : "#0c0d13", fontFamily: mono, fontSize: 11 }),
    // pivotal selectors (traffic level, overload scope) carry a permanent signal-color border and
    // show selection by fill, never brightness, so the whole choice set stays legible at a glance.
    tog: (on, dis, col) => ({ display: "block", width: "100%", textAlign: "left", padding: "7px 9px", marginTop: 6, borderRadius: 6, cursor: dis ? "not-allowed" : "pointer", opacity: dis ? 0.4 : 1, border: `1px solid ${col}`, color: col, background: on ? `${col}29` : "#0c0d13", fontWeight: on ? 700 : 400, fontFamily: mono, fontSize: 11 }),
  };
  const bar = (v, max, col) => <div style={{ height: 10, background: "#0c0d13", border: "1px solid #2a2a3a", borderRadius: 4, overflow: "hidden" }}><div style={{ width: Math.min(100, (v / max) * 100) + "%", height: "100%", background: col }} /></div>;
  const tierRow = (name, srv, drp, dem, col) => (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={S.label}>{name}</span>
        <span style={{ fontSize: 11 }}><span style={{ color: GREEN }}>{srv} served</span><span style={{ color: "#6b7080" }}> · </span><span style={{ color: drp > 0 ? RED : "#6b7080" }}>{drp} dropped</span><span style={{ color: "#6b7080" }}> / {dem}</span></span>
      </div>
      <div style={{ display: "flex", gap: 2 }}>
        <div style={{ flex: srv || 0.001 }}>{bar(srv, dem, col)}</div>
        <div style={{ flex: drp || 0.001 }}>{bar(drp, dem, drp > 0 ? RED : "#0c0d13")}</div>
      </div>
    </div>
  );

  return (
    <div style={S.root}>
      <div style={{ color: ACCENT_TXT, fontSize: 10, letterSpacing: 2 }}>LINKEDIN · HODOR - OVERLOAD PROTECTION - INTERACTIVE</div>
      <div style={{ color: "#edeff3", fontSize: 16, margin: "4px 0 2px", fontWeight: 700 }}>Who gets dropped</div>
      <p style={{ color: "#8b90a0", fontSize: 11, margin: 0 }}>You run a service under Hodor. Traffic is a mix of member and offline requests, and the shedder only protects members if it can tell them apart.</p>
      <ContextBlock />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
        <div style={{ ...S.panel, flex: "1 1 250px", minWidth: 250 }}>
          <div style={S.label}>TRAFFIC</div>
          {["normal", "surge", "heavy", "spike"].map(k => {
            const col = k === "normal" ? GREEN : k === "spike" ? RED : AMBER;
            return (
              <button key={k} style={S.tog(w.traffic === k, false, col)} onClick={() => setW(x => ({ ...x, traffic: k }))}>
                {TRAFFIC_LABEL[k]} ({TRAFFIC[k].opt + TRAFFIC[k].deg + TRAFFIC[k].non} req/tick vs capacity {CAP}){k === "spike" ? <div style={{ color: "#8b90a0", fontSize: 10 }}>member demand alone is over capacity</div> : null}
              </button>
            );
          })}
          <div style={{ ...S.label, marginTop: 12 }}>THE SHEDDER</div>
          <button style={S.btn(w.mode === "blind", false)} onClick={() => setW(x => ({ ...x, mode: "blind" }))}>V1: BLIND CAP (COUNTS REQUESTS)<div style={{ color: "#6b7080", fontSize: 10 }}>caps requests in flight; drops fall on every priority alike</div></button>
          <button style={S.btn(w.mode === "tiered", false, GREEN)} onClick={() => setW(x => ({ ...x, mode: "tiered" }))}>V2: TIERED (RATE-BASED)<div style={{ color: "#6b7080", fontSize: 10 }}>per-priority rate; optional dropped first, members last</div></button>
          <div style={{ ...S.label, marginTop: 12 }}>OVERLOAD SCOPE</div>
          <button style={S.tog(w.scope === "host", false, GREEN)} onClick={() => setW(x => ({ ...x, scope: "host" }))}>ONE HOT HOST<div style={{ color: "#8b90a0", fontSize: 10 }}>dropped requests retry on healthy peers</div></button>
          <button style={S.tog(w.scope === "cluster", false, RED)} onClick={() => setW(x => ({ ...x, scope: "cluster" }))}>WHOLE CLUSTER HOT<div style={{ color: "#8b90a0", fontSize: 10 }}>retries arrive as more load; the budget drains</div></button>
          <button style={{ ...S.btn(false, false), marginTop: 12 }} onClick={() => setW(initial())}>↺ RESET</button>
        </div>

        <div style={{ flex: "2 1 440px", minWidth: 300 }}>
          <div style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${verdict.c}`, background: `${verdict.c}14`, marginBottom: 12 }}>
            <div style={{ color: verdict.c, fontWeight: 700 }}>{verdict.code}</div>
            <div style={{ marginTop: 5, fontSize: 11.5, lineHeight: 1.6 }}>{verdict.t}</div>
          </div>
          <div style={S.panel}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={S.label}>THE LADDER - SERVED vs DROPPED, BY TIER</div>
              <div style={{ fontSize: 10, color: "#6b7080" }}>t={w.t} · limit {w.on ? w.limit : "off"}{w.probing ? " · probing" : ""}</div>
            </div>
            {tierRow("NON-DEGRADABLE (members, tier 10000)", w.served.non, w.dropped.non, D.non, ACCENT)}
            {tierRow("DEGRADABLE (tier 5000)", w.served.deg, w.dropped.deg, D.deg, VIOLET)}
            {tierRow("OPTIONAL (offline, tier 1000)", w.served.opt, w.dropped.opt, D.opt, "#5a6070")}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}><span style={S.label}>LATENCY (detector fires &gt; {LAT_FIRE}ms, confirmed)</span><span style={{ fontSize: 11, color: w.lat > LAT_FIRE ? RED : w.lat > LAT_OK ? AMBER : GREEN }}>{Math.round(w.lat)}ms</span></div>
            {bar(w.lat, 200, w.lat > LAT_FIRE ? RED : w.lat > LAT_OK ? AMBER : GREEN)}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}><span style={S.label}>RETRY BUDGET (server side)</span><span style={{ fontSize: 11, color: w.budget === 0 ? RED : w.budget < 50 ? AMBER : "#c8cdd8" }}>{w.budget}{w.retries ? "" : " · retries OFF"}</span></div>
            {bar(w.budget, 100, w.budget === 0 ? RED : AMBER)}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              <div style={{ flex: 1 }}><div style={S.label}>MEMBER REQS SERVED</div><div style={{ fontSize: 13, fontWeight: 700, color: w.dropped.non > 0 ? RED : GREEN }}>{D.non ? Math.round((w.served.non / D.non) * 100) : 100}%</div></div>
              <div style={{ flex: 1 }}><div style={S.label}>DROPPED MEMBERS · V1 BLIND</div><div style={{ fontSize: 13, fontWeight: 700, color: w.score.blind > 0 ? RED : "#6b7080" }}>{w.score.blind}</div></div>
              <div style={{ flex: 1 }}><div style={S.label}>DROPPED MEMBERS · V2 TIERED</div><div style={{ fontSize: 13, fontWeight: 700, color: w.score.tiered > 0 ? AMBER : GREEN }}>{w.score.tiered}</div></div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ color: "#6b7080", fontSize: 10, marginTop: 12, borderTop: "1px solid #2a2a3a", paddingTop: 8, lineHeight: 1.7 }}>
        The blind-then-priority evolution, the three priorities with IDs 1000/5000/10000 and how they travel through the call chain, the member-ID hash groups, dropping the lowest priority first, the switch from capping requests in flight to capping request rate (a dropped request never appears in an in-flight count) with a live per-service, per-priority rate breakdown, the adaptive cap that tests upward and backs off and is worked out fresh each overload, latency-confirmed detection tuned to avoid false alarms, safe retries on another copy before the application code runs, and the caller and server retry budgets that switch retries off to protect the traffic still being served are all from LinkedIn Engineering's two Hodor posts (Barkley et al. 2022; Gilra, Mankulangara, Kanitkar, and Deshpande 2023). The capacity of 100, the traffic mix, the limit and step constants, and the tick timing are an illustrative miniature tuned to reproduce the stated relationships; LinkedIn publishes the mechanisms, not these magnitudes. The even drop split in V1 mode and the single-service cluster view are simplifications of a fleet-scale system.
        {" "}<a href="https://behindscale.com/articles/linkedin-hodor-overload-protection" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT_TXT, textDecoration: "none" }}>From the full dissection at behindscale.com →</a>
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
        <div style={{ fontSize: 10, color: "#6b7080", letterSpacing: 1.2 }}>CONTEXT - IF YOU ARRIVED HERE WITHOUT THE ARTICLE</div>
        <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontFamily: "inherit", fontSize: 10, padding: 0 }}>HIDE ✕</button>
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 8 }}><span style={lbl}>THE PROBLEM · </span>LinkedIn's overload protection runs by default on more than 1,000 Java services, with no per-service tuning, and its most important rule is that it must never harm members - LinkedIn's logged-in users. But its first load shedder capped how many requests a service handled at once without knowing what it was refusing. A member loading their feed and an offline batch job counted the same, so the mechanism protecting the service could spend its drops on exactly the traffic it exists to protect.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>THE MOVE · </span>Stamp every request with a priority tier at the front door - optional, degradable, or non-degradable. Carry the tier through every downstream call, and shed from the bottom of the ladder up, grouping users by a hash of their ID and dropping whole groups so the same few members degrade consistently instead of a random set each time. Retry what gets dropped on another instance, inside a budget that shuts retries off when the whole cluster is hot.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>TRY · </span>Push a mixed traffic stream past capacity under the v1 blind shedder and watch member requests get refused while offline reads sail through. Switch to tiered shedding and watch optional traffic absorb the whole cut. Escalate to heavy load until the ladder climbs a tier, then watch the cap edge up and snap back when it tries raising itself too far. Set the whole cluster hot and find out what the retry budget does when retrying can no longer help. Finally, push MEMBER SPIKE and watch tiering run out of room.</div>
    </div>
  );
}
