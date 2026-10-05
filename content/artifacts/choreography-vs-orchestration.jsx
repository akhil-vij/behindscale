import { useState, useRef, useEffect } from "react";

// Pattern artifact - Choreography vs Orchestration (live order flow).
// Orders move through three services: take order -> charge payment -> ship. In CHOREOGRAPHY each service reacts
// to the event the previous one sent; nothing owns the whole process, so when Payment breaks, orders pile up and
// the system cannot say which orders are stuck or where. In ORCHESTRATION an engine holds the process and tells
// each service when to act, so it always knows where every order is - but if the engine goes down, every order
// stops. Click a service to break it, click the engine to take it down, click an order to ask where it is.

const BG = "#08090D", SURFACE = "#0F1118", SURFACE2 = "#161922", BORDER = "#1F2333";
const TEXT = "#C8CDD8", MUTED = "#6B7280";
const GREEN = "#22C55E", AMBER = "#F5B841", RED = "#EF4444", ACCENT = "#F97316";
const MONO = "'JetBrains Mono','Fira Code',ui-monospace,monospace";

const STEPS = [
  { key: "orders", name: "Orders", job: "take order", hears: "a new order", says: "OrderPlaced" },
  { key: "payment", name: "Payment", job: "charge payment", hears: "OrderPlaced", says: "PaymentDone" },
  { key: "shipping", name: "Shipping", job: "ship", hears: "PaymentDone", says: "Shipped" },
];
const TICK = 1100;          // ms per step of the simulation
const STUCK_AFTER = 4;      // ticks waiting at one step before it counts as stuck
const SHOW = 5;             // order chips shown per service before "+N more"

function initSim() {
  return { tick: 0, id: 40, orders: [], done: 0, lastDone: [], broken: {}, engineDown: false };
}

export default function PatternChoreographyVsOrchestration() {
  const [mode, setMode] = useState("choreo");   // problem-first: choreography
  const [selected, setSelected] = useState(null);
  const [, force] = useState(0);
  const sim = useRef(null);
  if (!sim.current) sim.current = initSim();
  const modeRef = useRef(mode);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  useEffect(() => {
    const h = setInterval(() => {
      const s = sim.current;
      s.tick += 1;
      const halted = modeRef.current === "orch" && s.engineDown;
      if (!halted) {
        // each working service finishes one order per tick, oldest first; the last step completes the order
        for (let i = STEPS.length - 1; i >= 0; i--) {
          if (s.broken[STEPS[i].key]) continue;
          const queue = s.orders.filter((o) => o.stage === i).sort((a, b) => a.since - b.since);
          const o = queue[0];
          if (!o || o.since === s.tick) continue;
          if (i === STEPS.length - 1) {
            s.orders = s.orders.filter((x) => x !== o);
            s.done += 1;
            s.lastDone = [o.id].concat(s.lastDone).slice(0, 3);
          } else { o.stage = i + 1; o.since = s.tick; }
        }
      }
      if (s.tick % 2 === 0) { s.id += 1; s.orders.push({ id: s.id, stage: 0, since: s.tick }); }
      force((x) => x + 1);
    }, TICK);
    return () => clearInterval(h);
  }, []);

  const s = sim.current;
  const orch = mode === "orch";
  const halted = orch && s.engineDown;
  const anyBroken = STEPS.some((st) => s.broken[st.key]);
  const waitSecs = (o) => Math.round(((s.tick - o.since) * TICK) / 1000);
  const isStuck = (o) => s.tick - o.since >= STUCK_AFTER;

  const toggleService = (key) => { s.broken[key] = !s.broken[key]; force((x) => x + 1); };
  const toggleEngine = () => { if (orch) { s.engineDown = !s.engineDown; force((x) => x + 1); } };
  const switchMode = (m) => { sim.current = initSim(); setSelected(null); setMode(m); };

  const sel = selected !== null ? s.orders.find((o) => o.id === selected) : null;
  const selDone = selected !== null && !sel;

  // verdict
  let v;
  if (!orch) {
    if (anyBroken) v = { c: RED, t: "Orders are piling up at the broken service - and nothing in the system knows. The process is not written down anywhere, so \"which orders are stuck, and where?\" has no answer. Click a stuck order and ask." };
    else v = { c: MUTED, t: "Each service hears an event, does its step, and announces the next. Nobody is in charge, so there is nothing central to fail. Now click Payment to break it." };
  } else if (halted) v = { c: RED, t: "The engine is down, so every order has stopped - even the ones whose services are all fine. That is the price of orchestration: one central piece that every flow depends on. Click the engine to bring it back." };
  else if (anyBroken) v = { c: GREEN, t: "The engine knows exactly which orders are stuck and at which step - see the list. When the service comes back, the engine picks each order up again from the step it was on. Now try failing the engine itself." };
  else v = { c: MUTED, t: "The engine holds the process - take order, charge payment, ship - and tells each service when to act, so it always knows where every order is. Click Payment to break it." };

  const chip = (o) => {
    const stuck = isStuck(o) || halted;
    const isSel = o.id === selected;
    return (
      <button key={o.id} onClick={() => setSelected(o.id)} title="Where is this order?" style={{ fontFamily: MONO, fontSize: 10.5, padding: "2px 6px", borderRadius: 5, cursor: "pointer", border: "1px solid " + (isSel ? ACCENT : stuck ? RED + "AA" : "#2E3547"), background: isSel ? ACCENT + "22" : stuck ? "#22141A" : SURFACE2, color: stuck ? "#E7A6A6" : "#C8CDD8" }}>#{o.id}</button>
    );
  };

  return (
    <div style={{ background: BG, color: TEXT, fontFamily: MONO, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid " + BORDER, fontSize: 12.5, lineHeight: 1.55 }}>
      <div style={{ color: ACCENT, fontSize: 10.5, letterSpacing: 2 }}>CHOREOGRAPHY VS ORCHESTRATION - WHO OWNS THE PROCESS?</div>
      <div style={{ color: "#EDEFF3", fontSize: 16.5, margin: "4px 0 3px", fontWeight: 700 }}>Where is order #42?</div>
      <p style={{ color: "#9096A6", fontSize: 12, margin: 0 }}>Orders go through three services: take order, charge payment, ship. Click a service to break it. Click any order to ask where it is.</p>

      {/* mode tabs */}
      <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
        {[["choreo", "Choreography (no owner)"], ["orch", "Orchestration (an engine owns it)"]].map(([m, label]) => (
          <button key={m} onClick={() => switchMode(m)} style={{ flex: "1 1 0", padding: "9px 10px", borderRadius: 7, cursor: "pointer", fontFamily: MONO, fontSize: 12, fontWeight: 700, border: "1px solid " + (mode === m ? ACCENT : "#333947"), background: mode === m ? ACCENT + "1E" : "#0C0D13", color: mode === m ? "#EDEFF3" : "#9AA0B0" }}>{label}</button>
        ))}
      </div>

      {/* engine row */}
      <div onClick={toggleEngine} style={{ marginTop: 12, borderRadius: 8, padding: "9px 12px", cursor: orch ? "pointer" : "default", border: orch ? "1.5px solid " + (halted ? RED : GREEN) : "1px dashed #333947", background: orch ? (halted ? "#22141A" : "#0F2016") : "transparent", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {orch ? (
          <>
            <span style={{ fontWeight: 700, color: halted ? "#F0A6A6" : "#B6F0C8" }}>ENGINE {halted ? "- DOWN" : ""}</span>
            <span style={{ fontSize: 11, color: halted ? "#E7A6A6" : "#9FE7B6" }}>process: 1 take order &#8594; 2 charge payment &#8594; 3 ship</span>
            <span style={{ fontSize: 10, color: MUTED }}>{halted ? "click to bring it back" : "click to fail it"}</span>
          </>
        ) : (
          <span style={{ fontSize: 11, color: MUTED }}>No engine here. The process is not written down anywhere - it exists only in the events services pass to each other.</span>
        )}
      </div>

      {/* the three services + done */}
      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
        {STEPS.map((st, i) => {
          const broken = !!s.broken[st.key];
          const here = s.orders.filter((o) => o.stage === i).sort((a, b) => a.since - b.since);
          return (
            <div key={st.key} style={{ background: SURFACE, border: "1px solid " + (broken ? RED : BORDER), borderRadius: 8, padding: "8px 8px 10px", minHeight: 150 }}>
              <div onClick={() => toggleService(st.key)} title="Click to break or fix" style={{ cursor: "pointer", borderRadius: 6, padding: "6px 7px", border: "1px solid " + (broken ? RED : "#2E3547"), background: broken ? "#22141A" : SURFACE2 }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 12, color: broken ? "#F0A6A6" : "#E2E5EC" }}>{st.name}</span>
                  <span style={{ fontSize: 9.5, color: broken ? RED : GREEN }}>{broken ? "BROKEN" : "ok"}</span>
                </div>
                <div style={{ fontSize: 9.5, color: MUTED, marginTop: 3, lineHeight: 1.4 }}>
                  {orch ? "waits for the engine to say: " + st.job : "hears " + st.hears + ", says " + st.says}
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                {here.slice(0, SHOW).map(chip)}
                {here.length > SHOW && <span style={{ fontSize: 10, color: "#E7A6A6", alignSelf: "center" }}>+{here.length - SHOW} more</span>}
              </div>
            </div>
          );
        })}
        <div style={{ background: SURFACE, border: "1px solid " + BORDER, borderRadius: 8, padding: "8px 8px 10px", minHeight: 150 }}>
          <div style={{ padding: "6px 7px" }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: "#9FE7B6" }}>Delivered</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: GREEN, marginTop: 4 }}>{s.done}</div>
            <div style={{ fontSize: 9.5, color: MUTED, marginTop: 2 }}>{s.lastDone.length ? "last: " + s.lastDone.map((d) => "#" + d).join(" ") : "none yet"}</div>
          </div>
        </div>
      </div>

      {/* where is each order? */}
      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 280px", background: SURFACE, border: "1px solid " + BORDER, borderRadius: 8, padding: "10px 12px" }}>
          <div style={{ color: MUTED, fontSize: 10.5, marginBottom: 6 }}>WHAT THE SYSTEM CAN TELL YOU ABOUT ORDERS IN PROGRESS</div>
          {!orch && (
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: AMBER }}>?</div>
              <div style={{ fontSize: 11, color: "#B7BCC9", lineHeight: 1.6 }}>Nothing. Each service only knows its own step. To find a stuck order you would search every service's logs, one by one.</div>
            </div>
          )}
          {orch && (
            <div>
              {s.orders.length === 0 && <div style={{ fontSize: 11, color: MUTED }}>no orders in progress</div>}
              {s.orders.slice().sort((a, b) => a.since - b.since).slice(0, 6).map((o) => {
                const stuck = isStuck(o) || halted;
                return (
                  <div key={o.id} style={{ fontSize: 11, color: stuck ? "#E7A6A6" : "#B7BCC9", lineHeight: 1.7 }}>
                    #{o.id} &middot; step {o.stage + 1} of 3 ({STEPS[o.stage].job}) &middot; {stuck ? "STUCK " : "waiting "}{waitSecs(o)}s
                  </div>
                );
              })}
              {s.orders.length > 6 && <div style={{ fontSize: 10.5, color: MUTED }}>+{s.orders.length - 6} more, all tracked</div>}
            </div>
          )}
        </div>
        <div style={{ flex: "1 1 220px", background: SURFACE, border: "1px solid " + (selected !== null ? ACCENT : BORDER), borderRadius: 8, padding: "10px 12px" }}>
          <div style={{ color: MUTED, fontSize: 10.5, marginBottom: 6 }}>ASK: WHERE IS THIS ORDER?</div>
          {selected === null && <div style={{ fontSize: 11, color: MUTED }}>Click any order chip above.</div>}
          {selected !== null && selDone && <div style={{ fontSize: 11.5, color: "#9FE7B6" }}>#{selected} was delivered.</div>}
          {sel && !orch && (
            <div style={{ fontSize: 11.5, color: "#E7D2A6", lineHeight: 1.6 }}>#{sel.id}: <b>the system cannot say.</b> No part of it holds the whole process - you can see it sitting at {STEPS[sel.stage].name} only because this demo shows you everything.</div>
          )}
          {sel && orch && (
            <div style={{ fontSize: 11.5, color: "#9FE7B6", lineHeight: 1.6 }}>#{sel.id}: step {sel.stage + 1} of 3 ({STEPS[sel.stage].job}), waiting {waitSecs(sel)}s{halted ? " - frozen while the engine is down" : s.broken[STEPS[sel.stage].key] ? " - " + STEPS[sel.stage].name + " is broken. The engine will pick it up again from this step once it is back" : ""}.</div>
          )}
        </div>
      </div>

      {/* verdict */}
      <div style={{ marginTop: 12, background: SURFACE, border: "1px solid " + v.c, borderRadius: 8, padding: "11px 13px", fontSize: 12.5, lineHeight: 1.6, color: TEXT }}>{v.t}</div>

      <div style={{ color: "#8B90A0", fontSize: 12, marginTop: 13, borderTop: "1px solid " + BORDER, paddingTop: 10, lineHeight: 1.65 }}>
        Choreography keeps services loosely tied and has nothing central to fail, but the process is written down nowhere - so when something stalls, nobody can list what is stuck. Orchestration writes the process down inside an engine that can always answer "where is it?", at the cost of one piece every flow depends on.
      </div>
    </div>
  );
}
