import { useState, useEffect } from "react";

const ACCENT = "#9b8cf0";
const RED = "#ef4444"; const AMBER = "#eab308"; const GREEN = "#22c55e";
const CAP_NORMAL = 190, CAP_MAINT = 90, DEMAND = 160;

const initial = (mode) => ({ t: 0, mode, maint: 0, ran: false, amp: 1, err: 0, good: 100, lost: 0, eng: 0, dbLoad: DEMAND, brkOpen: false, brkCool: 0, broken: 0, globShed: false, seen: {}, settledMode: null });

// pure step function — no refs, no stale closures (checklist item 3 avoided by construction)
function step(w) {
  const n = { ...w, seen: { ...w.seen } };
  n.t++;
  const cap = n.maint > 0 ? CAP_MAINT : CAP_NORMAL;
  const maintNow = n.maint > 0;
  const retries = n.broken === 0;
  if (n.broken > 0) n.broken--;
  let s1 = DEMAND * 0.625, s3 = DEMAND * 0.375;
  if (n.mode === "local" && n.brkOpen) { s1 = 0; s3 = 0; }
  let arriving = (s1 + s3) * (retries ? n.amp : 1);
  n.globShed = false;
  if (n.mode === "global") {
    const stressed = n.err > 8 || maintNow;
    if (stressed) { n.globShed = true; arriving = Math.min(arriving, Math.round(cap * 0.92)); }
  }
  if (n.mode === "local") arriving = Math.min(arriving, 260); // shedder limit set above true capacity
  n.dbLoad = Math.round(arriving);
  const over = Math.max(0, arriving - cap);
  const target = arriving > 0 ? Math.min(95, Math.round((over / arriving) * 130)) : 0;
  n.err = Math.round(n.err * 0.5 + target * 0.5);
  n.amp = retries ? Math.min(3, 1 + 2 * (n.err / 100)) : 1;
  if (n.mode === "local") {
    if (!n.brkOpen && n.err > 50) { n.brkOpen = true; n.brkCool = 4; }
    else if (n.brkOpen) { n.brkCool--; if (n.brkCool <= 0) n.brkOpen = false; }
  }
  let completed = n.mode === "local" && n.brkOpen ? 0 : Math.max(0, Math.round((Math.min(arriving, cap) * (1 - n.err / 100)) / (retries ? n.amp : 1)));
  completed = Math.min(DEMAND, completed);
  n.good = Math.round((completed / DEMAND) * 100);
  n.lost += Math.max(0, DEMAND - completed) / 10;
  const metastable = n.ran && n.maint === 0 && n.err > 20 && n.mode !== "global";
  if (metastable) n.eng += 1;
  if (n.ran && n.maint === 0 && n.err < 6 && n.settledMode !== n.mode) { n.settledMode = n.mode; n.seen[n.mode] = Math.round(n.lost); }
  if (maintNow) n.maint--;
  return n;
}

export default function TheLocalView() {
  const [w, setW] = useState(() => initial("none"));
  useEffect(() => { const id = setInterval(() => setW(step), 600); return () => clearInterval(id); }, []);
  const metastable = w.ran && w.maint === 0 && w.err > 20 && w.mode !== "global";
  const setMode = (m) => setW(x => ({ ...initial(m), seen: x.seen }));

  const verdict = (() => {
    const L = Math.round(w.lost);
    if (w.settledMode === w.mode && w.ran) {
      if (w.mode === "none") return { c: RED, code: "THE TRIGGER LEFT. THE FAILURE STAYED.", t: `Maintenance ended ticks ago; the retry loop kept the database pinned by itself — work amplification feeding error rate feeding amplification. That is a metastable failure, and it ended only when you broke the loop by hand (${w.eng} engineer-minutes, ${L} orders gone). No component misbehaved. The loop is not a component.` };
      if (w.mode === "local") return { c: AMBER, code: "EVERY DEFENSE WORKED. THE OUTAGE WIDENED.", t: `The breaker tripped at exactly its threshold and severed SERVICE 3's unrelated traffic with the shared path — the defense drew the blast radius. The shedder guarded a limit set above the DB's real capacity. Both acted correctly on what they could see, which was one circle each. ${L} orders lost. Now try GLOBAL and compare.` };
      return { c: GREEN, code: "SHED AT THE EDGE, BEFORE THE SUBGRAPH", t: `One controller saw DB stress and refused low-priority work at SERVICE 1 — excess requests failed cheaply at the edge instead of feeding the loop. Goodput sagged but never collapsed, and when maintenance ended the system recovered by itself: no metastable lock, no engineer-minutes. ${L} orders lost — check it against your other runs. One honest asterisk from the source: DoorDash validated this style of control as a load shedder in a test environment; the cross-service coordination you just used is the part they haven't run in production.` };
    }
    if (metastable) return { c: RED, code: w.mode === "none" ? "TRIGGER GONE — LOAD STILL PINNED" : "FLAPPING — THE BREAKER'S VIEW IS ONE CIRCLE", t: w.mode === "none" ? `Maintenance is over and the error rate is holding itself up: failures beget retries beget failures. Nothing local will end this — BREAK THE LOOP, and watch the engineer-minutes you're paying meanwhile (${w.eng}).` : "The breaker opens on errors, the DB drains, the breaker half-opens, traffic returns to a still-sick DB, errors spike, it opens again — each transition correct, the cycle absurd." };
    if (w.maint > 0) return { c: AMBER, code: "MAINTENANCE UNDERWAY — CAPACITY 190 → 90", t: w.mode === "global" ? "The controller sees latency deviating and is already refusing low-priority work at the edge — inside the subgraph, nothing needs to act." : w.mode === "local" ? "Watch the dashed circles: the breaker sees only S2's errors, the shedder only the DB's latency. Each will act correctly. Watch who pays." : "Retries are multiplying every failure into more load. The amplification readout is the transmission mechanism, live." };
    return { c: AMBER, code: w.mode === "none" ? "NO DEFENSES — RETRIES AND TIMEOUTS ONLY" : w.mode === "local" ? "LOCAL DEFENSES ARMED — ONE CIRCLE EACH" : "GLOBAL CONTROLLER WATCHING EVERY SIGNAL", t: "Run the DB maintenance and let it play out. The comparison that matters is the ORDERS LOST counter across all three modes — that number is the price of each mode's field of view." };
  })();

  const mono = "'JetBrains Mono','Fira Code',ui-monospace,monospace";
  const S = {
    root: { background: "#08090D", color: "#c8cdd8", fontFamily: mono, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid #2a2a3a", fontSize: 12, lineHeight: 1.5 },
    panel: { background: "#111118", border: "1px solid #2a2a3a", borderRadius: 8, padding: 12 },
    label: { color: "#6b7080", fontSize: 10, letterSpacing: 1.2 },
    btn: (on, dis) => ({ padding: "7px 10px", borderRadius: 6, cursor: dis ? "not-allowed" : "pointer", opacity: dis ? 0.4 : 1, border: `1px solid ${on ? ACCENT : "#2a2a3a"}`, color: on ? "#cfc5ff" : "#8b90a0", background: on ? "rgba(155,140,240,0.10)" : "#0c0d13", fontFamily: mono, fontSize: 11, marginRight: 6, marginTop: 6 }),
  };
  const chip = (name, state, sub, lens) => (
    <div style={{ flex: "1 1 130px", background: "#0c0d13", border: `1px ${lens ? "dashed" : "solid"} ${state === "bad" ? RED : state === "warn" ? AMBER : state === "auto" ? ACCENT : "#2a2f45"}`, borderRadius: 6, padding: "8px 10px" }}>
      <div style={{ fontWeight: 700, fontSize: 11, color: state === "bad" ? RED : state === "warn" ? AMBER : state === "auto" ? ACCENT : "#c8cdd8" }}>{name}</div>
      <div style={{ fontSize: 9.5, color: "#6b7080", marginTop: 2 }}>{sub}</div>
    </div>
  );
  const local = w.mode === "local", glob = w.mode === "global";
  const cap = w.maint > 0 ? CAP_MAINT : CAP_NORMAL;
  const cut = local && w.brkOpen;

  return (
    <div style={S.root}>
      <div style={{ color: ACCENT, fontSize: 10, letterSpacing: 2 }}>DOORDASH · APERTURE — INTERACTIVE</div>
      <div style={{ color: "#edeff3", fontSize: 16, margin: "4px 0 2px", fontWeight: 700 }}>The local view</div>
      <p style={{ color: "#8b90a0", fontSize: 11, margin: 0 }}>Every defense here works. The dashed borders are what each one can see. The failure lives between them.</p>
      <ContextBlock />

      <div style={{ marginTop: 12 }}>
        <span style={S.label}>DEFENSE MODE · </span>
        <button style={S.btn(w.mode === "none", false)} onClick={() => setMode("none")}>NO DEFENSES</button>
        <button style={S.btn(w.mode === "local", false)} onClick={() => setMode("local")}>LOCAL</button>
        <button style={S.btn(w.mode === "global", false)} onClick={() => setMode("global")}>GLOBAL</button>
        <button style={S.btn(false, w.maint > 0)} disabled={w.maint > 0} onClick={() => setW(x => ({ ...x, maint: 8, ran: true, settledMode: null }))}>RUN DB MAINTENANCE (8 TICKS)</button>
        <button style={{ ...S.btn(false, !(metastable && w.mode === "none")), borderColor: metastable && w.mode === "none" ? RED : "#2a2a3a", color: metastable && w.mode === "none" ? RED : "#8b90a0" }} disabled={!(metastable && w.mode === "none")} onClick={() => setW(x => ({ ...x, broken: 3, eng: x.eng + 5 }))}>BREAK THE LOOP (+5 ENG-MIN)</button>
        <button style={S.btn(false, false)} onClick={() => setW(x => ({ ...initial(x.mode), seen: x.seen }))}>↺ RESET RUN</button>
      </div>

      <div style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${verdict.c}`, background: `${verdict.c}14`, marginTop: 12 }}>
        <div style={{ color: verdict.c, fontWeight: 700 }}>{verdict.code}</div>
        <div style={{ marginTop: 5, fontSize: 11.5, lineHeight: 1.6 }}>{verdict.t}</div>
      </div>

      <div style={{ ...S.panel, marginTop: 12 }}>
        <div style={S.label}>CALL GRAPH {glob ? "· ONE LENS OVER EVERYTHING" : local ? "· ONE DASHED LENS PER DEFENSE" : ""}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8, ...(glob ? { border: `1px dashed ${ACCENT}`, borderRadius: 8, padding: 8 } : {}) }}>
          {glob && chip("APERTURE CONTROLLER", "auto", w.globShed ? "policy active: shed at the edge" : "watching every signal", false)}
          {chip("SERVICE 1 · edge", w.globShed ? "auto" : w.err > 40 ? "warn" : "ok", w.globShed ? "shedding low-priority at the door" : "forwards demand downstream", false)}
          {chip("SERVICE 2", cut ? "bad" : w.err > 30 ? "warn" : "ok", cut ? "behind open breaker" : "calls DB" + (local ? " · breaker sees only this hop" : ""), local)}
          {chip("SERVICE 3", cut ? "bad" : "ok", cut ? "SEVERED — never was sick" : "unrelated traffic, shared east-west path", false)}
          {chip("DATABASE", w.err > 50 ? "bad" : w.err > 8 ? "warn" : "ok", `load ${w.dbLoad} / cap ${cap}` + (local ? " · shedder sees only its own latency" : ""), local)}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          <div style={{ flex: 1 }}><div style={S.label}>GOODPUT</div><div style={{ fontSize: 16, fontWeight: 700, color: w.good > 85 ? GREEN : w.good > 50 ? AMBER : RED }}>{w.good}%</div></div>
          <div style={{ flex: 1 }}><div style={S.label}>DB ERROR RATE</div><div style={{ fontSize: 16, fontWeight: 700, color: w.err > 50 ? RED : w.err > 8 ? AMBER : GREEN }}>{w.err}%</div></div>
          <div style={{ flex: 1 }}><div style={S.label}>WORK AMPLIFICATION</div><div style={{ fontSize: 16, fontWeight: 700, color: w.amp > 1.8 ? RED : w.amp > 1.05 ? AMBER : "#c8cdd8" }}>{w.amp.toFixed(1)}×</div></div>
          <div style={{ flex: 1 }}><div style={S.label}>ORDERS LOST</div><div style={{ fontSize: 16, fontWeight: 700, color: RED }}>{Math.round(w.lost)}</div></div>
          <div style={{ flex: 1 }}><div style={S.label}>ENG-MIN</div><div style={{ fontSize: 16, fontWeight: 700, color: AMBER }}>{w.eng}</div></div>
        </div>
        <div style={{ fontSize: 10, color: "#6b7080", marginTop: 8 }}>RUNS SETTLED — orders lost by mode: {["none", "local", "global"].map(m => `${m.toUpperCase()}: ${w.seen[m] ?? "—"}`).join(" · ")}</div>
      </div>

      <div style={{ color: "#6b7080", fontSize: 10, marginTop: 12, borderTop: "1px solid #2a2a3a", paddingTop: 8, lineHeight: 1.7 }}>
        The four failure classes (cascading, retry storm, death spiral, metastable), the graded local defenses (Netflix concurrency-limit shedder with priority headers; gRPC circuit breakers with no principled threshold; reactive autoscaling rejected for predictive KEDA cron), and the shed-at-the-upstream-edge policy are the post's; the shared-breaker mechanic severing unrelated traffic is from DoorDash's own May 12, 2022 postmortem. Aperture's observe/analyze/actuate loop, EMA-smoothed YAML circuits, and the test-environment-only validation scope are stated in the source. All rps numbers, capacities, and tick dynamics here are illustrative.
        {" "}<a href="https://behindscale.com/articles/doordash-aperture-global-failure-mitigation" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: "none" }}>From the full dissection at behindscale.com →</a>
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
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 8 }}><span style={lbl}>THE PROBLEM · </span>Microservice failures spread through the interactions between services — latency becomes timeouts, timeouts become retries, retries feed the overload — but every defense (shedder, breaker, autoscaler) measures one service's signals and acts inside one service's walls. Each can behave correctly while the failure lives in the loop between them.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>THE MOVE · </span>Aperture: one controller observes every signal via Prometheus, tracks SLO deviation, and actuates coordinated YAML policies — including the move no local defense can make: shed at the upstream edge, before requests enter the sick subgraph. DoorDash's honest scope: validated so far only as a load shedder, in a test environment.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>TRY · </span>Run the same DB maintenance in all three modes. With no defenses, the retry loop outlives its trigger — break it by hand and count the engineer-minutes. With local defenses, the breaker fires correctly and severs a service that was never sick. With global, the edge sheds and the system recovers itself. Compare ORDERS LOST.</div>
    </div>
  );
}
