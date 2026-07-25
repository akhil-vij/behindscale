import { useState, useEffect } from "react";

const ACCENT = "#2EB67D";
const RED = "#ef4444"; const AMBER = "#eab308"; const GREEN = "#22c55e"; const VIOLET = "#9b8cf0";

const CAP = 100; const BASE = 40; const PEAK = 120; const STEP_DROP = 35;
const initial = () => ({ t: 0, hit: 100, steps: 0, paused: false, peak: false, throttled: false, limit: 30, fixed: false, retryLoad: 0, dbLoad: 0, over: 0, last: null });

function step(w) {
  const n = { ...w };
  n.t++;
  const demand = (n.peak ? PEAK : BASE) + n.retryLoad;
  const admitted = n.throttled ? Math.min(demand, n.limit) : demand;
  const miss = 1 - n.hit / 100;
  n.dbLoad = Math.round(admitted * (0.15 + miss * (n.fixed ? 0.5 : 2.6)));
  if (n.dbLoad <= CAP) { n.hit = Math.min(100, n.hit + 6); n.over = 0; }
  else { n.hit = Math.max(5, n.hit - 8); n.over = n.dbLoad - CAP; } // timeouts: the refill queries are the ones dying
  n.retryLoad = Math.min(80, Math.round(n.over * 0.6));
  return n;
}

export default function TwoTwentyTwo() {
  const [w, setW] = useState(initial);
  useEffect(() => { const id = setInterval(() => setW(step), 650); return () => clearInterval(id); }, []);
  const collapsed = w.over > 0 && w.hit < 50;

  const verdict = (() => {
    if (collapsed && w.paused && !w.throttled) return { c: RED, code: "THE TRIGGER IS GONE, THE OUTAGE ISN'T", t: `The rollout is paused — the correct move, made early in the real incident — and it changes nothing, because the failure no longer needs its trigger. Empty cache drives ${w.dbLoad} units of load against ${CAP} of database capacity; the overloaded database times out the very queries that would refill the cache; the still-empty cache generates the next wave of misses. This state regenerates itself indefinitely. The exits are external: THROTTLE below the tipping point, or fix the amplifier.` };
    if (w.throttled && collapsed) return { c: RED, code: "TOO MUCH, TOO SOON", t: `The limit came up too fast — exactly what happened in the real incident — and the system tipped straight back over: ${w.dbLoad} against ${CAP}, hit rate falling again. Drop back down and climb in +10 steps, watching the database at every one. Near a tipping point, the road back to full traffic is walked, not jumped.` };
    if (w.throttled && w.hit >= 95) return { c: GREEN, code: "WARM AGAIN — WALK THE LIMIT HOME", t: "Caches full, database healthy. Keep raising in small steps until the throttle is gone and full traffic is restored — the real recovery walked the boot limit up while maximizing database goodput the whole way." };
    if (w.throttled && !collapsed) return { c: GREEN, code: "THROTTLED BELOW THE TIPPING POINT", t: `Admission is capped at ${w.limit}, database load is ${w.dbLoad}/${CAP}, and for the first time the refill queries are surviving — the hit rate is climbing (${Math.round(w.hit)}%). This throttle was a priority decision made out loud: users without booted clients stay out so connected users keep working. Raise the limit — and choose how fast.` };
    if (w.fixed && !collapsed && w.peak && w.hit < 95) return { c: GREEN, code: "THE AMPLIFIER IS FIXED, THE CORRIDOR WIDENS", t: `The query now fetches only what's missing, and immutable data reads from replicas too — each miss costs a fraction of what it did. At the same peak demand, database load is ${w.dbLoad}/${CAP} and the cache is refilling without a throttle. The tipping point didn't vanish; it moved far enough away that recovery fits through the gap.` };
    if (collapsed) return { c: RED, code: "THE TIPPING POINT, AT PEAK", t: `The third step landed at peak traffic and enough cache emptied: every miss scatters to every shard, load is ${w.dbLoad} against ${CAP}, refill queries are timing out, and ${w.retryLoad} units of load are retries — correctly jittered, still arriving. Try PAUSING THE ROLLOUT and learn this class's defining fact.` };
    if (w.steps > 0 && w.steps <= 2 && w.hit >= 90) return { c: AMBER, code: "TWO STEPS PASSED. SO DID LAST WEEK'S.", t: "Each 25% step empties a slice of the cache, the database absorbs the refill, and warmth returns in minutes — the system looks resilient because, off-peak, it is. The tipping point isn't visible from here. Turn on PEAK TRAFFIC and roll the next step." };
    if (w.hit >= 95 && w.steps > 0) return { c: GREEN, code: "WARM AGAIN", t: "Full caches, quiet database. The tipping point is still out there — it's a function of hit rate and demand meeting at the wrong moment." };
    return { c: AMBER, code: "A WARM CACHE, WEARING AN OPTIMIZATION'S CLOTHES", t: `Boot traffic is served by Memcached in front of Vitess; at full warmth the database sees ${Math.round(BASE * 0.15)} units of load against ${CAP} of capacity. The honest question this artifact asks: can the database take the traffic alone? Roll the Consul upgrade and find out — two steps off-peak first, like the real week before.` };
  })();

  const mono = "'JetBrains Mono','Fira Code',ui-monospace,monospace";
  const S = {
    root: { background: "#08090D", color: "#c8cdd8", fontFamily: mono, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid #2a2a3a", fontSize: 12, lineHeight: 1.5 },
    panel: { background: "#111118", border: "1px solid #2a2a3a", borderRadius: 8, padding: 12 },
    label: { color: "#6b7080", fontSize: 10, letterSpacing: 1.2 },
    btn: (on, dis, col) => ({ display: "block", width: "100%", textAlign: "left", padding: "7px 9px", marginTop: 6, borderRadius: 6, cursor: dis ? "not-allowed" : "pointer", opacity: dis ? 0.4 : 1, border: `1px solid ${on ? (col || ACCENT) : "#2a2a3a"}`, color: on ? "#b9f0d5" : "#8b90a0", background: on ? "rgba(46,182,125,0.10)" : "#0c0d13", fontFamily: mono, fontSize: 11 }),
  };
  const bar = (v, max, col) => <div style={{ height: 10, background: "#0c0d13", border: "1px solid #2a2a3a", borderRadius: 4, overflow: "hidden" }}><div style={{ width: Math.min(100, (v / max) * 100) + "%", height: "100%", background: col }} /></div>;

  return (
    <div style={S.root}>
      <div style={{ color: ACCENT, fontSize: 10, letterSpacing: 2 }}>SLACK · THE INCIDENT ON 2-22-22 — INTERACTIVE</div>
      <div style={{ color: "#edeff3", fontSize: 16, margin: "4px 0 2px", fontWeight: 700 }}>Stopping the cause didn't stop the outage</div>
      <p style={{ color: "#8b90a0", fontSize: 11, margin: 0 }}>You run the cache fleet through a routine maintenance week. Somewhere ahead is a tipping point that only exists at peak.</p>
      <ContextBlock />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
        <div style={{ ...S.panel, flex: "1 1 250px", minWidth: 250 }}>
          <div style={S.label}>THE MAINTENANCE</div>
          <button style={S.btn(false, w.steps >= 4 || w.paused)} disabled={w.steps >= 4 || w.paused} onClick={() => setW(x => ({ ...x, steps: x.steps + 1, hit: Math.max(5, x.hit - STEP_DROP), last: "roll" }))}>ROLL NEXT 25% CONSUL STEP ({w.steps}/4)<div style={{ color: "#6b7080", fontSize: 10 }}>restarting agents drop cache nodes; Mcrib swaps in empty spares</div></button>
          <button style={S.btn(w.paused, w.steps === 0 || w.paused, AMBER)} disabled={w.steps === 0 || w.paused} onClick={() => setW(x => ({ ...x, paused: true }))}>PAUSE THE ROLLOUT</button>
          <button style={S.btn(w.peak, false, AMBER)} onClick={() => setW(x => ({ ...x, peak: !x.peak }))}>PEAK TRAFFIC: {w.peak ? "ON (demand 120)" : "OFF (demand 40)"}</button>
          <div style={{ ...S.label, marginTop: 12 }}>THE RESPONSE</div>
          <button style={S.btn(w.throttled, w.throttled, GREEN)} disabled={w.throttled} onClick={() => setW(x => ({ ...x, throttled: true, limit: 30 }))}>THROTTLE CLIENT BOOTS (limit 30)<div style={{ color: "#6b7080", fontSize: 10 }}>unbooted users wait; booted users keep working</div></button>
          <button style={S.btn(false, !w.throttled, RED)} disabled={!w.throttled} onClick={() => setW(x => ({ ...x, limit: x.limit + 50 }))}>RAISE LIMIT +50 (the big jump)</button>
          <button style={S.btn(false, !w.throttled, GREEN)} disabled={!w.throttled} onClick={() => setW(x => ({ ...x, limit: x.limit + 10 }))}>RAISE LIMIT +10 (small increments)</button>
          <button style={S.btn(false, !w.throttled)} disabled={!w.throttled} onClick={() => setW(x => ({ ...x, throttled: false }))}>REMOVE THROTTLE (limit: {w.limit})</button>
          <button style={S.btn(w.fixed, w.fixed, VIOLET)} disabled={w.fixed} onClick={() => setW(x => ({ ...x, fixed: true }))}>FIX THE SCATTER QUERY<div style={{ color: "#6b7080", fontSize: 10 }}>fetch only what's missing · immutable data reads replicas</div></button>
          <button style={{ ...S.btn(false, false), marginTop: 12 }} onClick={() => setW(initial())}>↺ RESET</button>
        </div>

        <div style={{ flex: "2 1 440px", minWidth: 300 }}>
          <div style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${verdict.c}`, background: `${verdict.c}14`, marginBottom: 12 }}>
            <div style={{ color: verdict.c, fontWeight: 700 }}>{verdict.code}</div>
            <div style={{ marginTop: 5, fontSize: 11.5, lineHeight: 1.6 }}>{verdict.t}</div>
          </div>
          <div style={S.panel}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={S.label}>THE LOOP — CACHE ↔ DATABASE</div>
              <div style={{ fontSize: 10, color: "#6b7080" }}>t={w.t}{w.paused ? " · rollout PAUSED" : ""}</div>
            </div>
            <div style={{ marginTop: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={S.label}>CACHE HIT RATE</span><span style={{ fontSize: 11, color: w.hit >= 90 ? GREEN : w.hit >= 50 ? AMBER : RED }}>{Math.round(w.hit)}%</span></div>
              {bar(w.hit, 100, w.hit >= 90 ? GREEN : w.hit >= 50 ? AMBER : RED)}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}><span style={S.label}>DATABASE LOAD (capacity {CAP})</span><span style={{ fontSize: 11, color: w.dbLoad > CAP ? RED : "#c8cdd8" }}>{w.dbLoad}{w.dbLoad > CAP ? " · refill queries timing out" : ""}</span></div>
              {bar(w.dbLoad, 250, w.dbLoad > CAP ? RED : GREEN)}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}><span style={S.label}>RETRY LOAD (backoff + jitter, still arriving)</span><span style={{ fontSize: 11, color: w.retryLoad > 0 ? AMBER : "#c8cdd8" }}>{w.retryLoad}</span></div>
              {bar(w.retryLoad, 80, AMBER)}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              <div style={{ flex: 1 }}><div style={S.label}>STATE</div><div style={{ fontSize: 13, fontWeight: 700, color: collapsed ? RED : GREEN }}>{collapsed ? "SELF-SUSTAINING" : "STABLE"}</div></div>
              <div style={{ flex: 1 }}><div style={S.label}>BOOTED USERS</div><div style={{ fontSize: 13, fontWeight: 700, color: collapsed && !w.throttled ? RED : GREEN }}>{collapsed && !w.throttled ? "DEGRADED" : "SERVED"}</div></div>
              <div style={{ flex: 1 }}><div style={S.label}>NEW BOOTS</div><div style={{ fontSize: 13, fontWeight: 700, color: w.throttled ? AMBER : collapsed ? RED : GREEN }}>{w.throttled ? "THROTTLED" : collapsed ? "FAILING" : "FLOWING"}</div></div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ color: "#6b7080", fontSize: 10, marginTop: 12, borderTop: "1px solid #2a2a3a", paddingTop: 8, lineHeight: 1.7 }}>
        The boot process and its dependence on cached data, the Vitess keyspace sharded by user, Memcached/Mcrouter/Mcrib roles, Mcrib's watch-Consul-and-replace design with flush-on-rejoin, the 25% Consul upgrade steps (two uneventful the prior week, the third crossing the tipping point at peak), the scatter query's every-shard cost per miss with superlinear database load, timeouts preventing cache refill, the paused-rollout-changed-nothing fact, the client-boot throttle and its priority reasoning, the too-large limit increase and smaller-increment recovery, the miss-only + replica-read query fix, the metastable-states framing (HotOS 2021), Mcrib's efficiency-made-it-less-safe verdict, and the exponential-backoff-with-jitter retries that still contributed are all from Laura Nolan's Slack Engineering postmortem (with Sanford, Scheinblum, and Sullivan, 2022). The capacity units, demand figures, per-step cache-drop fraction, and tick dynamics are an illustrative miniature calibrated to reproduce the stated relationships, not measurements from the incident.
        {" "}<a href="https://behindscale.com/articles/slack-incident-2-22-22" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: "none" }}>From the full dissection at behindscale.com →</a>
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
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 8 }}><span style={lbl}>THE PROBLEM · </span>A routine upgrade kept briefly dropping cache servers, and the cache manager kept replacing them with empty ones — until, at peak traffic, enough cache was cold that one common query began hitting every database shard on every miss. The overloaded database timed out the queries that would refill the cache, so the failure fed itself — and pausing the upgrade that started it changed nothing.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>THE MOVE · </span>Break the loop from outside: throttle new connections below the tipping point (protecting already-connected users first), fix the query to fetch only what's missing and read from replicas, then walk the limit back up in small steps — because one too-large step caused a relapse.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>TRY · </span>Roll two upgrade steps off-peak and watch them get absorbed. Land the third at peak, cross the tipping point, then pause the rollout — and learn the fact this failure class is named for. Throttle your way back, relapse once on purpose, fix the amplifier, and walk home.</div>
    </div>
  );
}
