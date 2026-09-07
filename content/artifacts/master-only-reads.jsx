import { useState, useRef, useEffect } from "react";

// Pattern artifact - Master-Only Reads (interactive).
// Charge an order: the primary records "charged" instantly; the replica lags a couple of seconds before it
// catches up. A retry arrives and checks "already charged?". Read the REPLICA during the lag window and it
// still says NO - so you charge again (double charge). Read the PRIMARY and it always says YES, so you skip.

const BG = "#08090D", SURFACE = "#0F1118", SURFACE2 = "#161922", BORDER = "#1F2333";
const TEXT = "#C8CDD8", MUTED = "#6B7280";
const GREEN = "#22C55E", AMBER = "#F5B841", RED = "#EF4444", ACCENT = "#F97316", PURPLE = "#A78BFA";
const MONO = "'JetBrains Mono','Fira Code',ui-monospace,monospace";

const LAG = 130; // ticks (~6.5s at 50ms) the replica lags the primary - long enough to retry during the window

export default function PatternMasterOnlyReads() {
  const [mode, setMode] = useState("replica"); // replica | primary (problem-first: read replicas)
  const [, force] = useState(0);
  const st = useRef({ primary: false, replica: false, lag: 0, charges: 0, result: null });

  useEffect(() => {
    const id = setInterval(() => {
      const s = st.current;
      if (s.lag > 0) { s.lag -= 1; if (s.lag === 0) s.replica = true; force((n) => n + 1); }
    }, 50);
    return () => clearInterval(id);
  }, []);

  const s = st.current;
  const lagging = s.lag > 0;
  const reset = (m) => { st.current = { primary: false, replica: false, lag: 0, charges: 0, result: null }; if (m !== undefined) setMode(m); force((n) => n + 1); };

  const charge = () => {
    if (s.primary) return; // already the first charge
    s.primary = true; s.replica = false; s.lag = LAG; s.charges = 1; s.result = null;
    force((n) => n + 1);
  };
  const retryCheck = () => {
    if (!s.primary) { s.result = { c: MUTED, t: "Charge the order first, then the retry check has something to look up." }; force((n) => n + 1); return; }
    const seen = mode === "primary" ? s.primary : s.replica;
    if (seen) s.result = { c: GREEN, t: "The " + mode + " says CHARGED, so the retry skips. Correct - charged once." };
    else { s.charges += 1; s.result = { c: RED, t: "The replica has not caught up, so it says NOT charged - the retry runs the payment again. Double charge." }; }
    force((n) => n + 1);
  };

  const total = s.charges * 50;
  const dbBox = (name, val, col, note) => (
    <div style={{ flex: "1 1 0", background: SURFACE, border: "1px solid " + col, borderRadius: 8, padding: "11px 13px" }}>
      <div style={{ color: col, fontSize: 11.5, fontWeight: 700 }}>{name}</div>
      <div style={{ color: val ? GREEN : "#9AA0B0", fontSize: 15, fontWeight: 700, marginTop: 4 }}>charged: {val ? "YES" : "NO"}</div>
      <div style={{ color: "#7C8290", fontSize: 10.5, marginTop: 3 }}>{note}</div>
    </div>
  );

  return (
    <div style={{ background: BG, color: TEXT, fontFamily: MONO, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid " + BORDER, fontSize: 12.5, lineHeight: 1.55 }}>
      <div style={{ color: ACCENT, fontSize: 10.5, letterSpacing: 2 }}>MASTER-ONLY READS - READ THE PRIMARY, ALWAYS</div>
      <div style={{ color: "#EDEFF3", fontSize: 16.5, margin: "4px 0 3px", fontWeight: 700 }}>A stale read turns a retry into a double charge</div>
      <p style={{ color: "#9096A6", fontSize: 12, margin: 0 }}>Charge an order, then a retry checks "already charged?" before charging again. Where that check reads - the lagging replica or the primary - decides whether you double-charge.</p>

      {/* read source toggle */}
      <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
        <button onClick={() => reset("replica")} style={{ flex: "1 1 0", padding: "9px 12px", borderRadius: 7, cursor: "pointer", fontFamily: MONO, fontSize: 12, fontWeight: 700, border: "1px solid " + (mode === "replica" ? ACCENT : "#333947"), background: mode === "replica" ? ACCENT + "1E" : "#0C0D13", color: mode === "replica" ? "#EDEFF3" : "#9AA0B0" }}>Check reads a replica</button>
        <button onClick={() => reset("primary")} style={{ flex: "1 1 0", padding: "9px 12px", borderRadius: 7, cursor: "pointer", fontFamily: MONO, fontSize: 12, fontWeight: 700, border: "1px solid " + (mode === "primary" ? ACCENT : "#333947"), background: mode === "primary" ? ACCENT + "1E" : "#0C0D13", color: mode === "primary" ? "#EDEFF3" : "#9AA0B0" }}>Check reads the primary</button>
      </div>

      {/* the two databases */}
      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {dbBox("PRIMARY", s.primary, mode === "primary" ? PURPLE : "#2A3040", "takes the write - always current")}
        {dbBox("REPLICA", s.replica, mode === "replica" ? PURPLE : "#2A3040", lagging ? "catching up..." : (s.primary ? "in sync" : "a copy that lags behind the primary"))}
      </div>

      {/* replica lag bar */}
      <div style={{ marginTop: 8, height: 8, background: SURFACE2, borderRadius: 4, overflow: "hidden", border: "1px solid #242A38" }}>
        <div style={{ height: "100%", width: (lagging ? (100 - (s.lag / LAG) * 100) : (s.primary ? 100 : 0)) + "%", background: lagging ? RED : GREEN, transition: "width 0.05s linear" }} />
      </div>
      <div style={{ color: lagging ? RED : MUTED, fontSize: 10.5, marginTop: 3 }}>{lagging ? "replica is behind the primary - a read now is stale" : (s.primary ? "replica has caught up" : "replica lag")}</div>

      {/* actions */}
      <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={charge} disabled={s.primary} style={{ padding: "8px 14px", borderRadius: 7, cursor: s.primary ? "not-allowed" : "pointer", fontFamily: MONO, fontSize: 12, fontWeight: 700, border: "1px solid " + (s.primary ? "#333947" : ACCENT), background: s.primary ? "#0C0D13" : ACCENT, color: s.primary ? "#565C6B" : "#0A0B0F" }}>1. Charge order ($50)</button>
        <button onClick={retryCheck} disabled={!s.primary} style={{ padding: "8px 14px", borderRadius: 7, cursor: !s.primary ? "not-allowed" : "pointer", fontFamily: MONO, fontSize: 12, fontWeight: 700, border: "1px solid " + (!s.primary ? "#242A38" : "#3A4152"), background: "#0C0D13", color: !s.primary ? "#565C6B" : "#C8CDD8" }}>2. Retry: check "already charged?"</button>
        <button onClick={() => reset()} style={{ padding: "8px 12px", borderRadius: 7, cursor: "pointer", fontFamily: MONO, fontSize: 11.5, border: "1px solid " + BORDER, background: "transparent", color: "#9AA0B0" }}>&#8635; reset</button>
        <span style={{ marginLeft: "auto", color: total > 50 ? RED : (total === 50 ? GREEN : MUTED), fontSize: 12, fontWeight: 700 }}>total charged: ${total}</span>
      </div>

      {/* result */}
      {s.result && <div style={{ marginTop: 12, background: SURFACE, border: "1px solid " + s.result.c, borderRadius: 8, padding: "11px 13px", fontSize: 12.5, lineHeight: 1.6, color: TEXT }}>{s.result.t}</div>}

      <div style={{ color: "#8B90A0", fontSize: 12, marginTop: 13, borderTop: "1px solid " + BORDER, paddingTop: 10, lineHeight: 1.65 }}>
        A replica lags the primary by a little. For a page that is harmless, but for state that decides an action - like whether a payment already happened - a stale read gives the wrong answer and the work runs again. Master-only reads send every such read to the primary, so the staleness bug simply cannot occur; the replicas stay for failover only.
      </div>
    </div>
  );
}
