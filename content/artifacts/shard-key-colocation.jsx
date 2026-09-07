import { useState } from "react";

// Pattern artifact - Shard-Key Colocation (interactive).
// A workspace's rows (the workspace, its documents, its comments) get placed on shards. SCATTER them by row id
// and they land on different machines; running one transaction over them (delete the workspace) spans machines,
// one machine fails mid-commit, and you are left with orphaned rows - silent corruption. COLOCATE them by the
// workspace key and they all sit on one machine, so the same transaction is all-or-nothing and commits cleanly.

const BG = "#08090D", SURFACE = "#0F1118", SURFACE2 = "#161922", BORDER = "#1F2333";
const TEXT = "#C8CDD8", MUTED = "#6B7280";
const GREEN = "#22C55E", AMBER = "#F5B841", RED = "#EF4444", ACCENT = "#F97316", PURPLE = "#A78BFA";
const MONO = "'JetBrains Mono','Fira Code',ui-monospace,monospace";

const SHARDS = ["A", "B", "C"];
const ROWS = [
  { id: "workspace", label: "workspace" }, { id: "doc-1", label: "document" }, { id: "doc-2", label: "document" },
  { id: "comment-1", label: "comment" }, { id: "comment-2", label: "comment" }, { id: "member", label: "member" },
];
const SCATTER = ["A", "B", "C", "A", "B", "C"]; // by row id (hash)
const FAIL_SHARD = "B"; // the machine that fails mid cross-shard commit

export default function PatternShardKeyColocation() {
  const [mode, setMode] = useState("scatter"); // scatter | colocate (problem-first: scattered)
  const [deleted, setDeleted] = useState([]);    // row ids removed
  const [result, setResult] = useState(null);

  const shardOf = (i) => (mode === "colocate" ? "A" : SCATTER[i]);
  const reset = (m) => { setDeleted([]); setResult(null); if (m !== undefined) setMode(m); };

  const runTxn = () => {
    const touched = ROWS.map((r, i) => ({ ...r, shard: shardOf(i) }));
    const shardsHit = Array.from(new Set(touched.map((r) => r.shard)));
    if (shardsHit.length === 1) {
      setDeleted(ROWS.map((r) => r.id));
      setResult({ c: GREEN, code: "COMMITTED", t: "Every row was on one machine, so the transaction was all-or-nothing. The workspace and everything under it deleted cleanly." });
    } else {
      const removed = touched.filter((r) => r.shard !== FAIL_SHARD).map((r) => r.id);
      setDeleted(removed);
      const orphans = touched.filter((r) => r.shard === FAIL_SHARD).map((r) => r.label);
      setResult({ c: RED, code: "CORRUPTED", t: "The rows spanned machines " + shardsHit.join(", ") + ", so the commit had to coordinate across them. Machine " + FAIL_SHARD + " failed, so its rows survived while the rest were deleted - orphaned " + orphans.join(" and ") + ", with no workspace left." });
    }
  };

  const chip = (r, orphan) => (
    <span key={r.id} style={{ fontSize: 10, padding: "3px 7px", borderRadius: 5, border: "1px solid " + (orphan ? RED : (r.id === "workspace" ? PURPLE : "#2E3547")), background: orphan ? RED + "1E" : (r.id === "workspace" ? PURPLE + "1A" : SURFACE2), color: orphan ? "#E7A6A6" : (r.id === "workspace" ? "#C9B8F5" : "#B7BCC9") }}>{r.label}</span>
  );

  const done = deleted.length > 0 || result;
  const orphanIds = result && result.code === "CORRUPTED" ? ROWS.filter((_, i) => shardOf(i) === FAIL_SHARD).map((r) => r.id) : [];

  return (
    <div style={{ background: BG, color: TEXT, fontFamily: MONO, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid " + BORDER, fontSize: 12.5, lineHeight: 1.55 }}>
      <div style={{ color: ACCENT, fontSize: 10.5, letterSpacing: 2 }}>SHARD-KEY COLOCATION - ONE ENTITY, ONE SHARD</div>
      <div style={{ color: "#EDEFF3", fontSize: 16.5, margin: "4px 0 3px", fontWeight: 700 }}>Delete a workspace without stranding its data</div>
      <p style={{ color: "#9096A6", fontSize: 12, margin: 0 }}>A workspace's rows get placed on machines. Run one transaction over them and where they sit - scattered, or all together - decides whether it commits or corrupts.</p>

      {/* mode toggle */}
      <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
        <button onClick={() => reset("scatter")} style={{ flex: "1 1 0", padding: "9px 12px", borderRadius: 7, cursor: "pointer", fontFamily: MONO, fontSize: 12, fontWeight: 700, border: "1px solid " + (mode === "scatter" ? ACCENT : "#333947"), background: mode === "scatter" ? ACCENT + "1E" : "#0C0D13", color: mode === "scatter" ? "#EDEFF3" : "#9AA0B0" }}>Scatter by row id</button>
        <button onClick={() => reset("colocate")} style={{ flex: "1 1 0", padding: "9px 12px", borderRadius: 7, cursor: "pointer", fontFamily: MONO, fontSize: 12, fontWeight: 700, border: "1px solid " + (mode === "colocate" ? ACCENT : "#333947"), background: mode === "colocate" ? ACCENT + "1E" : "#0C0D13", color: mode === "colocate" ? "#EDEFF3" : "#9AA0B0" }}>Colocate by workspace</button>
      </div>

      {/* shards */}
      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {SHARDS.map((sh) => {
          const here = ROWS.map((r, i) => ({ ...r, shard: shardOf(i) })).filter((r) => r.shard === sh && !deleted.includes(r.id));
          return (
            <div key={sh} style={{ background: SURFACE, border: "1px solid " + BORDER, borderRadius: 8, padding: "10px 10px 12px", minHeight: 110 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ color: "#AEB4C2", fontWeight: 700, fontSize: 12 }}>machine {sh}</span>
                {result && result.code === "CORRUPTED" && sh === FAIL_SHARD && <span style={{ color: RED, fontSize: 9.5 }}>failed mid-commit</span>}
              </div>
              <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 5, minHeight: 48 }}>
                {here.length === 0 && <span style={{ color: "#565C6B", fontSize: 10, fontStyle: "italic" }}>empty</span>}
                {here.map((r) => chip(r, orphanIds.includes(r.id)))}
              </div>
            </div>
          );
        })}
      </div>

      {/* actions */}
      <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={runTxn} disabled={done} style={{ padding: "8px 14px", borderRadius: 7, cursor: done ? "not-allowed" : "pointer", fontFamily: MONO, fontSize: 12, fontWeight: 700, border: "1px solid " + (done ? "#333947" : ACCENT), background: done ? "#0C0D13" : ACCENT, color: done ? "#565C6B" : "#0A0B0F" }}>Run transaction: delete the workspace</button>
        <button onClick={() => reset()} style={{ padding: "8px 12px", borderRadius: 7, cursor: "pointer", fontFamily: MONO, fontSize: 11.5, border: "1px solid " + BORDER, background: "transparent", color: "#9AA0B0" }}>&#8635; reset</button>
        <span style={{ marginLeft: "auto", color: MUTED, fontSize: 11 }}>{mode === "colocate" ? "sharded by workspace key - one machine" : "sharded by row id - spread across machines"}</span>
      </div>

      {/* result */}
      {result && (
        <div style={{ marginTop: 12, background: SURFACE, border: "1px solid " + result.c, borderRadius: 8, padding: "12px 14px" }}>
          <div style={{ color: result.c, fontWeight: 700, fontSize: 13.5 }}>{result.code}</div>
          <div style={{ fontSize: 12.5, lineHeight: 1.6, color: TEXT, marginTop: 4 }}>{result.t}</div>
        </div>
      )}

      <div style={{ color: "#8B90A0", fontSize: 12, marginTop: 13, borderTop: "1px solid " + BORDER, paddingTop: 10, lineHeight: 1.65 }}>
        A database can only make a transaction all-or-nothing within one machine. Spread related rows across machines and a transaction over them can half-succeed, leaving orphaned data. Shard every related table by the same key - here the workspace - and each workspace's rows sit on one machine, where its transactions and queries stay fast and safe.
      </div>
    </div>
  );
}
