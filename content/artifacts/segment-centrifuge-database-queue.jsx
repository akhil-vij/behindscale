import { useState, useEffect } from "react";

const ACCENT = "#52BD94";
const RED = "#ef4444"; const AMBER = "#eab308"; const GREEN = "#22c55e"; const VIOLET = "#9b8cf0";
// tenants A (whale), B, C → destinations GA, MIX, SF. Rates per tick.
const BASE = { A: 40, B: 8, C: 6 };
const DESTS = ["GA", "MIX", "SF"];

const initial = (topo) => ({
  t: 0, topo, outage: false, flood: false, poison: null, // poison: cap | retry | dlq
  backlog: { GA: 0, MIX: 0, SF: 0 }, cBacklog: { A: 0, B: 0, C: 0 }, // centrifuge per-tenant (GA only for clarity)
  delivered: 0, delayedBC: 0, dlqBytes: 0, r429: 0, retried: 0, absorbed: 0, drainT: null,
});

function step(w) {
  const n = { ...w, backlog: { ...w.backlog }, cBacklog: { ...w.cBacklog } };
  n.t++;
  const gaCap = n.outage ? 8 : 60;           // GA capacity per tick (outage → 15% of normal-ish)
  const aRate = n.flood ? 120 : BASE.A;       // whale flood into GA
  const inGA = aRate + BASE.B, inMIX = BASE.C + 4, inSF = 5;
  if (n.topo === "single") {
    // one shared queue: effective throughput gated by the slowest destination's share
    const cap = Math.min(60, n.outage ? 12 : 60);
    const inn = inGA + inMIX + inSF;
    n.backlog.GA += Math.max(0, inn - cap); // rendered as one shared backlog on GA row
    n.delivered += Math.min(inn, cap);
    if (n.outage) n.delayedBC += inMIX + inSF; // unrelated destinations stalled too
  } else if (n.topo === "dest") {
    // per-destination queues; whale flood head-of-line inside GA queue
    let gaServe = gaCap;
    if (n.flood) {
      const limit = 10; // per-customer rate limit share per tick
      if (n.poison === "cap") { gaServe = Math.min(gaServe, limit); n.delayedBC += BASE.B; }
      else if (n.poison === "retry") { n.r429 += Math.max(0, Math.min(aRate, gaServe) - limit); n.delayedBC += BASE.B; gaServe = limit; }
      else if (n.poison === "dlq") { n.dlqBytes += (aRate - limit) * 5; gaServe = limit + BASE.B; } // B unblocked, terabytes move
      else { n.delayedBC += BASE.B; gaServe = Math.min(gaServe, limit); } // undecided: whale blocks
    }
    n.backlog.GA = Math.max(0, n.backlog.GA + inGA - gaServe);
    n.backlog.MIX = Math.max(0, n.backlog.MIX + inMIX - 20);
    n.backlog.SF = Math.max(0, n.backlog.SF + inSF - 20);
    n.delivered += Math.min(inGA, gaServe) + Math.min(inMIX, 20) + Math.min(inSF, 20);
  } else {
    // centrifuge: per <tenant,dest> virtual queues; stuck jobs never block others
    const limit = 10;
    const aServe = Math.min(n.flood ? limit : aRate, n.outage ? 3 : aRate); // rate-limited whale; outage shrinks all GA
    const bServe = n.outage ? 3 : BASE.B;
    n.cBacklog.A = Math.max(0, n.cBacklog.A + aRate - aServe);
    n.cBacklog.B = Math.max(0, n.cBacklog.B + BASE.B - bServe);
    if (n.outage) { n.absorbed += (aRate - aServe) + (BASE.B - bServe); n.retried += 2; }
    else {
      // drain: deliver backlog fast once healthy
      const drain = 40;
      const d = Math.min(drain, n.cBacklog.A + n.cBacklog.B);
      n.cBacklog.A = Math.max(0, n.cBacklog.A - drain * 0.7);
      n.cBacklog.B = Math.max(0, n.cBacklog.B - drain * 0.3);
      n.delivered += d;
      if (d > 0 && n.drainT === null && n.absorbed > 0) n.drainT = n.t;
    }
    n.delivered += aServe + bServe + inMIX + inSF; // MIX/SF always flowing
  }
  return n;
}

export default function WhenQueuesStopWorking() {
  const [w, setW] = useState(() => initial("single"));
  useEffect(() => { const id = setInterval(() => setW(step), 600); return () => clearInterval(id); }, []);
  const setTopo = (topo) => setW(x => ({ ...initial(topo), t: x.t }));
  const stuckC = w.cBacklog.A + w.cBacklog.B;

  const verdict = (() => {
    if (w.topo === "single") {
      if (w.outage) return { c: RED, code: "ONE SLOW ENDPOINT, EVERYONE'S BACKLOG", t: `GA is failing and the whole pipeline is waiting behind it — Mixpanel and Salesforce traffic (${w.delayedBC} events and counting) is stalled by a failure it has nothing to do with, because a queue has one head and everything stands in the same line. The post's arithmetic: 200+ endpoints at 99.9% each means this happens once a day. Try PER-DESTINATION.` };
      return { c: AMBER, code: "ONE QUEUE, ONE LINE, 200+ DOORS", t: "Workers pop from a single shared queue and call whichever API each job needs. It works — until any one of the doors sticks. Trigger the PARTNER OUTAGE." };
    }
    if (w.topo === "dest") {
      if (w.flood && !w.poison) return { c: RED, code: "THE WHALE BLOCKS THE QUEUE", t: `Customer A's 50,000-message burst sits contiguously in the GA queue, and the endpoint rate-limits at 1,000/s per customer. B's traffic (${w.delayedBC} events delayed) is behind the whale. The post gives you exactly three exits — pick your poison below and pay its price.` };
      if (w.poison === "cap") return { c: AMBER, code: "POISON PICKED: CAP THE WHALE", t: `Hard-cap A at the rate limit. Orderly — and B still waits ${Math.round(w.backlog.GA / 10)}+ seconds behind A's capped-but-contiguous block (${w.delayedBC} B-events delayed). The queue's order was set at write time; capping changes the pace, not the line.` };
      if (w.poison === "retry") return { c: RED, code: "POISON PICKED: RETRY INTO THE LIMIT", t: `Keep sending past 1,000/s and the endpoint answers 429 (${w.r429} so far). The retries re-enter the queue and thicken the very block B is stuck behind. Work amplification wearing a delivery costume.` };
      if (w.poison === "dlq") return { c: AMBER, code: "POISON PICKED: TERABYTES ON THE MOVE", t: `Copy A's remaining 49,000 messages to a dead-letter queue: B flows again — and the network is now moving ${(w.dlqBytes / 1000).toFixed(1)}TB of duplicated data (illustrative) to reorder a line that a database would reorder with one SQL statement. This is the exit that motivated Centrifuge.` };
      if (w.outage) return { c: GREEN, code: "ISOLATED BY DESTINATION — THIS FAILURE, AT LEAST", t: "GA's outage strands only GA's queue; Mixpanel and Salesforce flow. Per-destination isolation handles the single-endpoint failure. Now trigger the WHALE FLOOD and meet the failure mode that lives inside one queue." };
      return { c: AMBER, code: "A QUEUE PER DESTINATION — BETTER WALLS", t: "A router splits traffic by endpoint, so one failing API strands only its own queue. Trigger the WHALE FLOOD to find the tenant problem the walls don't solve." };
    }
    // centrifuge
    if (w.outage) return { c: VIOLET, code: "ABSORBING — STUCK JOBS IN NOBODY'S WAY", t: `GA is failing; its jobs sit in awaiting-retry rows (${Math.round(stuckC)} queued, ${w.absorbed} absorbed) with exponential backoff, per <customer, destination>. Nothing is blocked, because nothing stands in a line — order is a query, and the query skips what isn't ready. Mixpanel and Salesforce never noticed. End the outage and watch the drain.` };
    if (w.absorbed > 0 && stuckC > 1) return { c: GREEN, code: "DRAINING — THE BACKLOG STEPS ASIDE, THEN DELIVERS", t: `The endpoint recovered and the stored jobs are flowing out (${Math.round(stuckC)} left of ${w.absorbed} absorbed). In the March 17 outage this was 85 million events absorbed over 105 minutes and delivered within 30 minutes of recovery — delays for a handful of customers, loss for none, and no other integration touched.` };
    if (w.flood) return { c: GREEN, code: "THE WHALE HAS ITS OWN QUEUE", t: "Customer A floods, and A's <A, GA> virtual queue absorbs it at A's rate limit while B's <B, GA> queue flows untouched — the per-pair isolation that needed 88,000 queues and got them as database rows. No poison to pick; the choices from the last architecture simply don't arise." };
    if (w.absorbed > 0) return { c: GREEN, code: "REORDERING IS A SQL STATEMENT", t: "Backlog delivered. The jobs table never moved — the awaiting-retry rows just stopped matching the delivery query, then matched it again. That is the whole trick: a buffer whose order is computed, not physical." };
    return { c: AMBER, code: "88,000 VIRTUAL QUEUES, ZERO QUEUES", t: "Jobs are immutable MySQL rows; a single-writer Director owns each JobDB; delivery order is a query. Run both disasters — the outage and the flood — and compare against the other two architectures." };
  })();

  const mono = "'JetBrains Mono','Fira Code',ui-monospace,monospace";
  const S = {
    root: { background: "#08090D", color: "#c8cdd8", fontFamily: mono, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid #2a2a3a", fontSize: 12, lineHeight: 1.5 },
    panel: { background: "#111118", border: "1px solid #2a2a3a", borderRadius: 8, padding: 12 },
    label: { color: "#6b7080", fontSize: 10, letterSpacing: 1.2 },
    btn: (on, dis) => ({ padding: "7px 10px", borderRadius: 6, cursor: dis ? "not-allowed" : "pointer", opacity: dis ? 0.4 : 1, border: `1px solid ${on ? ACCENT : "#2a2a3a"}`, color: on ? "#a9e8cf" : "#8b90a0", background: on ? "rgba(82,189,148,0.10)" : "#0c0d13", fontFamily: mono, fontSize: 11, marginRight: 6, marginTop: 6 }),
  };
  const row = (name, backlog, state, sub) => (
    <div key={name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, marginTop: 4, background: "#0c0d13", border: `1px solid ${state === "bad" ? RED : state === "warn" ? AMBER : "#2a2f45"}` }}>
      <div style={{ width: 92, fontSize: 10.5, fontWeight: 700, color: state === "bad" ? RED : state === "warn" ? AMBER : "#c8cdd8" }}>{name}</div>
      <div style={{ flex: 1, height: 6, background: "#1a1a24", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${Math.min(100, backlog)}%`, height: "100%", background: state === "bad" ? RED : state === "warn" ? AMBER : ACCENT, opacity: 0.75 }} />
      </div>
      <div style={{ width: 160, textAlign: "right", fontSize: 9.5, color: "#6b7080" }}>{sub}</div>
    </div>
  );
  const poisonBtn = (key, label) => (
    <button style={{ ...S.btn(w.poison === key, !(w.topo === "dest" && w.flood)), display: "block", width: "100%", textAlign: "left" }} disabled={!(w.topo === "dest" && w.flood)} onClick={() => setW(x => ({ ...x, poison: key }))}>{label}</button>
  );

  return (
    <div style={S.root}>
      <div style={{ color: ACCENT, fontSize: 10, letterSpacing: 2 }}>SEGMENT · CENTRIFUGE — INTERACTIVE</div>
      <div style={{ color: "#edeff3", fontSize: 16, margin: "4px 0 2px", fontWeight: 700 }}>When queues stop working</div>
      <p style={{ color: "#8b90a0", fontSize: 11, margin: 0 }}>Two disasters, three architectures — Segment's actual progression. Customer A is a whale; GA is the door that sticks.</p>
      <ContextBlock />

      <div style={{ marginTop: 12 }}>
        <span style={S.label}>ARCHITECTURE · </span>
        <button style={S.btn(w.topo === "single", false)} onClick={() => setTopo("single")}>1 · SINGLE QUEUE</button>
        <button style={S.btn(w.topo === "dest", false)} onClick={() => setTopo("dest")}>2 · PER-DESTINATION</button>
        <button style={S.btn(w.topo === "cent", false)} onClick={() => setTopo("cent")}>3 · CENTRIFUGE</button>
        <span style={{ ...S.label, marginLeft: 10 }}>DISASTERS · </span>
        <button style={{ ...S.btn(w.outage, false), borderColor: w.outage ? RED : undefined, color: w.outage ? RED : undefined }} onClick={() => setW(x => ({ ...x, outage: !x.outage, drainT: null }))}>PARTNER OUTAGE (GA): {w.outage ? "ON" : "OFF"}</button>
        <button style={{ ...S.btn(w.flood, false), borderColor: w.flood ? AMBER : undefined, color: w.flood ? AMBER : undefined }} onClick={() => setW(x => ({ ...x, flood: !x.flood, poison: null }))}>WHALE FLOOD (A→GA): {w.flood ? "ON" : "OFF"}</button>
        <button style={S.btn(false, false)} onClick={() => setW(x => initial(x.topo))}>↺ RESET</button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
        <div style={{ flex: "2 1 420px", minWidth: 300 }}>
          <div style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${verdict.c}`, background: `${verdict.c}14`, marginBottom: 12 }}>
            <div style={{ color: verdict.c, fontWeight: 700 }}>{verdict.code}</div>
            <div style={{ marginTop: 5, fontSize: 11.5, lineHeight: 1.6 }}>{verdict.t}</div>
          </div>
          <div style={S.panel}>
            <div style={S.label}>
              {w.topo === "single" ? "THE ONE LINE — every destination's traffic, in arrival order" : w.topo === "dest" ? "QUEUES BY DESTINATION — walls between doors, not between tenants" : "VIRTUAL QUEUES — awaiting-retry rows in a JobDB, one per ⟨tenant, destination⟩"}
            </div>
            <div style={{ marginTop: 6 }}>
              {w.topo !== "cent" ? (
                <>
                  {row("→ GA" + (w.outage ? " ⚠" : ""), w.backlog.GA, w.outage || (w.flood && w.topo === "dest") ? "bad" : "ok", w.topo === "dest" && w.flood ? "A A A A A … B  (50k contiguous)" : w.outage ? "5xx storm · 15% success" : "healthy")}
                  {row("→ MIXPANEL", w.backlog.MIX, w.topo === "single" && w.outage ? "warn" : "ok", w.topo === "single" && w.outage ? "stalled behind GA's failure" : "healthy")}
                  {row("→ SALESFORCE", w.backlog.SF, w.topo === "single" && w.outage ? "warn" : "ok", w.topo === "single" && w.outage ? "stalled behind GA's failure" : "healthy")}
                </>
              ) : (
                <>
                  {row("⟨A, GA⟩", w.cBacklog.A, w.outage ? "warn" : w.flood ? "warn" : "ok", w.outage ? "awaiting-retry · backoff armed" : w.flood ? "absorbing at A's rate limit" : "flowing")}
                  {row("⟨B, GA⟩", w.cBacklog.B, w.outage ? "warn" : "ok", w.outage ? "awaiting-retry · backoff armed" : "flowing — never behind A")}
                  {row("⟨*, MIXPANEL⟩", 0, "ok", "never noticed anything")}
                  {row("⟨*, SALESFORCE⟩", 0, "ok", "never noticed anything")}
                </>
              )}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              <div style={{ flex: 1 }}><div style={S.label}>DELIVERED</div><div style={{ fontSize: 15, fontWeight: 700, color: GREEN }}>{Math.round(w.delivered)}</div></div>
              <div style={{ flex: 1 }}><div style={S.label}>INNOCENTS DELAYED</div><div style={{ fontSize: 15, fontWeight: 700, color: w.delayedBC > 0 ? RED : "#c8cdd8" }}>{w.delayedBC}</div></div>
              <div style={{ flex: 1 }}><div style={S.label}>429s</div><div style={{ fontSize: 15, fontWeight: 700, color: w.r429 ? RED : "#c8cdd8" }}>{w.r429}</div></div>
              <div style={{ flex: 1 }}><div style={S.label}>DLQ COPIED</div><div style={{ fontSize: 15, fontWeight: 700, color: w.dlqBytes ? AMBER : "#c8cdd8" }}>{(w.dlqBytes / 1000).toFixed(1)}TB</div></div>
              <div style={{ flex: 1 }}><div style={S.label}>ABSORBED (CENT.)</div><div style={{ fontSize: 15, fontWeight: 700, color: VIOLET }}>{w.absorbed}</div></div>
            </div>
          </div>
        </div>

        <div style={{ ...S.panel, flex: "1 1 230px", minWidth: 230 }}>
          <div style={S.label}>PICK YOUR POISON {w.topo === "dest" && w.flood ? "· THE POST'S THREE EXITS" : "· (arch. 2 + flood only)"}</div>
          {poisonBtn("cap", "① HARD-CAP A AT 1,000/s — B waits 50s behind the block")}
          {poisonBtn("retry", "② KEEP SENDING — eat 429s, retries thicken the block")}
          {poisonBtn("dlq", "③ COPY 49K MSGS TO DLQ — B flows, terabytes move")}
          <div style={{ ...S.label, marginTop: 14 }}>WHY CENTRIFUGE ESCAPES THE CHOICE</div>
          <div style={{ fontSize: 10.5, color: "#8b90a0", lineHeight: 1.7, marginTop: 4 }}>
            Jobs are immutable rows; state transitions append (awaiting-scheduling → executing → succeeded / awaiting-retry / discarded). Delivery order is a query, so a stuck job simply stops matching it — nothing is ever "in front of" anything. One Director exclusively owns each JobDB (Consul lease), caching everything, reading only on recovery. JobDBs are cycled every ~30 min: deletes become one drop table.
          </div>
        </div>
      </div>

      <div style={{ color: "#6b7080", fontSize: 10, marginTop: 12, borderTop: "1px solid #2a2a3a", paddingTop: 8, lineHeight: 1.7 }}>
        The three-architecture progression, the once-a-day outage arithmetic (200+ endpoints × 99.9%), the whale scenario with its three exits (1,000/s per-customer limit, 50s delay, 429 retries, terabyte DLQ copies), the 88,000 source-destination pairs (42K sources × 2.1 destinations), the JobDB model (immutable rows, KSUID keys, state-transition log, 4-hour expiry to S3), the single-writer Director with Consul sessions, 30-minute database cycling with drainers, and the March 17 outage (16K rps partner, ~15% success for 105 minutes, 85M events absorbed, delivered within 30 minutes, retries peaking at 100K rps — "still needs some tuning") are all from the Segment post. Per-tick rates and backlog dynamics here are illustrative.
        {" "}<a href="https://behindscale.com/articles/segment-centrifuge-database-queue" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: "none" }}>From the full dissection at behindscale.com →</a>
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
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 8 }}><span style={lbl}>THE PROBLEM · </span>Segment delivers events to hundreds of third-party endpoints, dozens failing at any moment. A queue only supports push and pop — so one failing destination's backlog, or one whale customer's burst, physically stands in front of everyone else's traffic, and the escapes (cap, retry, dead-letter copies) each punish the innocent. True isolation needs 88,000 per-⟨customer, destination⟩ queues — beyond any queue system.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>THE MOVE · </span>Centrifuge: jobs as immutable MySQL rows with an append-only state log, one single-writer Director owning each JobDB, delivery order as a query. Stuck jobs stop matching the query instead of blocking a line. Proof: an 85M-event partner outage absorbed and drained in 30 minutes, with no other integration affected.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>TRY · </span>Run the PARTNER OUTAGE on the single queue and watch unrelated traffic stall. Switch to per-destination queues, trigger the WHALE FLOOD, and pick each of the post's three poisons. Then run both disasters on Centrifuge — and notice the poison menu never appears.</div>
    </div>
  );
}
