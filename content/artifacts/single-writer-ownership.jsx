import { useState } from "react";

// Pattern artifact - Single-Writer Ownership (interactive: pay the coordination tax yourself).
// In the SHARED tier, every write you send has to take a lock and invalidate every other server's cache - so
// the coordination tax climbs with each write, faster the more writers there are. Give the store ONE owner and
// that tax drops to zero: it writes from its own memory. The two costs it accepts, on failure only: a crashed
// owner means the store is down until a successor takes the lease; a broken lease means two writers corrupt it.

const BG = "#08090D", SURFACE = "#0F1118", SURFACE2 = "#161922", BORDER = "#1F2333";
const TEXT = "#C8CDD8", MUTED = "#6B7280";
const GREEN = "#22C55E", AMBER = "#F5B841", RED = "#EF4444", ACCENT = "#F97316", BLUE = "#60A5FA";
const MONO = "'JetBrains Mono','Fira Code',ui-monospace,monospace";

export default function PatternSingleWriterOwnership() {
  const [mode, setMode] = useState("shared"); // shared | single (problem-first: the coordinating default)
  const [writers, setWriters] = useState(4);    // shared-tier writer count
  const [sent, setSent] = useState(0);           // writes sent
  const [tax, setTax] = useState(0);             // coordination ops paid
  const [fault, setFault] = useState(null);      // null | failover | splitbrain

  const single = mode === "single";
  const perWrite = single ? 0 : writers; // 1 lock + (writers-1) invalidations = writers ops
  const reset = (m) => { setSent(0); setTax(0); setFault(null); if (m) setMode(m); };

  const send = (n) => {
    if (single && fault) return; // during a fault, nothing new is written
    setSent((s) => s + n);
    setTax((t) => t + n * perWrite);
  };

  let note;
  if (single && fault === "failover") note = { c: RED, t: "The owner crashed, so this store is down. A successor is acquiring the lease and reading the state back from the store before it can serve writes again. Availability is traded per store, by design." };
  else if (single && fault === "splitbrain") note = { c: RED, t: "The lease slipped: an old owner kept writing while a new one started. Two owners now both trust their own memory, and the data is silently inconsistent. This is why the lease is the whole design's correctness." };
  else if (single) note = { c: GREEN, t: "One owner holds the lease and is the only writer. Each write goes straight to its own memory - no lock, no cache to invalidate. Send as many as you like: the coordination tax stays at zero." };
  else note = { c: MUTED, t: "Any of the " + writers + " writers can write, so every write takes a lock and invalidates the other " + (writers - 1) + " caches - " + writers + " coordination ops each. Send some writes and watch the tax climb, then switch to single-writer ownership." };

  const modeBtn = (k, lab) => (
    <button onClick={() => reset(k)} style={{ flex: "1 1 0", padding: "9px 12px", borderRadius: 7, cursor: "pointer", fontFamily: MONO, fontSize: 12.5, fontWeight: 700, border: "1px solid " + (mode === k ? ACCENT : "#333947"), background: mode === k ? ACCENT + "1E" : "#0C0D13", color: mode === k ? "#EDEFF3" : "#9AA0B0" }}>{lab}</button>
  );
  const stat = (label, value, c, sub) => (
    <div style={{ flex: "1 1 0", background: SURFACE, border: "1px solid " + BORDER, borderRadius: 8, padding: "10px 12px" }}>
      <div style={{ color: MUTED, fontSize: 10.5, letterSpacing: 0.5 }}>{label}</div>
      <div style={{ color: c, fontSize: 20, fontWeight: 700, lineHeight: 1.15, marginTop: 3 }}>{value}</div>
      <div style={{ color: "#7C8290", fontSize: 10, marginTop: 2 }}>{sub}</div>
    </div>
  );
  const evt = (onClick, lab, on) => (
    <button onClick={onClick} style={{ padding: "7px 12px", borderRadius: 7, cursor: "pointer", fontFamily: MONO, fontSize: 11.5, fontWeight: 700, border: "1px solid " + (on ? RED : "#333947"), background: on ? RED + "1E" : "#0C0D13", color: on ? RED : "#B7BCC9" }}>{lab}</button>
  );

  const busy = single && fault;

  return (
    <div style={{ background: BG, color: TEXT, fontFamily: MONO, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid " + BORDER, fontSize: 12.5, lineHeight: 1.55 }}>
      <div style={{ color: ACCENT, fontSize: 10.5, letterSpacing: 2 }}>SINGLE-WRITER OWNERSHIP - ONE WRITER, NO COORDINATION</div>
      <div style={{ color: "#EDEFF3", fontSize: 16.5, margin: "4px 0 3px", fontWeight: 700 }}>One writer, and the coordination disappears</div>
      <p style={{ color: "#9096A6", fontSize: 12, margin: 0 }}>Send writes and watch the coordination tax. With many writers sharing a database it climbs with every write; give the store one owner and it drops to zero.</p>

      {/* mode toggle */}
      <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
        {modeBtn("shared", "Shared tier (many writers)")}
        {modeBtn("single", "Single-writer ownership")}
      </div>

      {/* config: writers slider (shared) or lease note (single) */}
      {single ? (
        <div style={{ marginTop: 9, padding: "10px 13px", borderRadius: 8, border: "1px solid " + GREEN + "55", background: GREEN + "10", color: "#9FE7B6", fontSize: 11.5 }}>
          One owner holds the lease and is the only writer - there is no one to coordinate with.
        </div>
      ) : (
        <div style={{ marginTop: 9, padding: "10px 13px", borderRadius: 8, border: "1px solid #333947", background: "#0C0D13" }}>
          <div style={{ color: "#AEB4C2", fontWeight: 700, fontSize: 12.5 }}>Writers sharing the database: {writers}</div>
          <input type="range" min="2" max="6" value={writers} onChange={(e) => { setWriters(Number(e.target.value)); setSent(0); setTax(0); }} style={{ width: "100%", marginTop: 7, accentColor: ACCENT }} />
          <div style={{ color: "#7C8290", fontSize: 11 }}>each write = 1 lock + {writers - 1} cache invalidations = {writers} coordination ops</div>
        </div>
      )}

      {/* send controls */}
      <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button disabled={busy} onClick={() => send(1)} style={{ padding: "7px 14px", borderRadius: 7, cursor: busy ? "not-allowed" : "pointer", fontFamily: MONO, fontSize: 12, fontWeight: 700, border: "1px solid " + (busy ? "#242A38" : ACCENT), background: busy ? "#0C0D13" : ACCENT, color: busy ? "#565C6B" : "#0A0B0F" }}>+1 write</button>
        <button disabled={busy} onClick={() => send(20)} style={{ padding: "7px 14px", borderRadius: 7, cursor: busy ? "not-allowed" : "pointer", fontFamily: MONO, fontSize: 12, fontWeight: 700, border: "1px solid " + (busy ? "#242A38" : "#3A4152"), background: "#0C0D13", color: busy ? "#565C6B" : "#C8CDD8" }}>+20 writes</button>
        <button onClick={() => reset()} style={{ padding: "7px 12px", borderRadius: 7, cursor: "pointer", fontFamily: MONO, fontSize: 11, border: "1px solid " + BORDER, background: "transparent", color: "#9AA0B0" }}>&#8635; reset counters</button>
      </div>

      {/* stats */}
      <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {stat("WRITES SENT", String(sent), "#C8CDD8", "you drove these")}
        {stat("COORDINATION TAX", String(tax), tax === 0 ? GREEN : RED, single ? "zero - nothing to coordinate" : perWrite + " ops per write")}
        {stat("READS SERVED FROM", single ? "memory" : "the database", single ? GREEN : AMBER, single ? "owner trusts its own memory" : "caches may be stale")}
      </div>

      {/* failure modes (single only) */}
      {single && (
        <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ color: MUTED, fontSize: 11 }}>the two costs it accepts, on failure:</span>
          {evt(() => setFault("failover"), "crash the owner", fault === "failover")}
          {evt(() => setFault("splitbrain"), "break the lease", fault === "splitbrain")}
          {fault && <button onClick={() => setFault(null)} style={{ padding: "7px 12px", borderRadius: 7, cursor: "pointer", fontFamily: MONO, fontSize: 11.5, fontWeight: 700, border: "1px solid " + GREEN, background: "#0C0D13", color: GREEN }}>&#8635; recover</button>}
        </div>
      )}

      {/* message */}
      <div style={{ marginTop: 12, background: SURFACE, border: "1px solid " + note.c, borderRadius: 8, padding: "11px 13px", fontSize: 12.5, lineHeight: 1.6, color: TEXT }}>{note.t}</div>

      <div style={{ color: "#8B90A0", fontSize: 12, marginTop: 13, borderTop: "1px solid " + BORDER, paddingTop: 10, lineHeight: 1.65 }}>
        Every write in the shared tier pays a coordination tax - a lock, plus a cache invalidation to every other server - and it grows with the number of writers. With one owner, its own memory is always correct, so that tax is simply zero. The bill only comes due on failure: a crashed owner is a brief per-store outage, and a broken lease that lets two owners write at once is silent corruption.
      </div>
    </div>
  );
}
