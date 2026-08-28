import { useState } from "react";

// Pattern artifact - Retryable Error Classification (interactive 2x2).
// Every error is either temporary (a retry may work) or permanent (a retry never will). Your label - retry or
// do not retry - lands the outcome in one of four cells: two right, two costly. The unknown-payment case shows
// why the careful default, when you cannot tell and the action cannot be undone, is "do not retry".

const BG = "#08090D", SURFACE = "#0F1118", SURFACE2 = "#161922", BORDER = "#1F2333";
const TEXT = "#C8CDD8", MUTED = "#6B7280";
const GREEN = "#22C55E", AMBER = "#F5B841", RED = "#EF4444", ACCENT = "#F97316", BLUE = "#60A5FA";
const MONO = "'JetBrains Mono','Fira Code',ui-monospace,monospace";

const SC = [
  { name: "Network timeout", nature: "temporary", side: false, note: "the connection dropped; the server may be fine" },
  { name: "Server busy (503)", nature: "temporary", side: false, note: "the server was overloaded for a moment" },
  { name: "Invalid input (400)", nature: "permanent", side: false, note: "the request itself is malformed" },
  { name: "Account already closed", nature: "permanent", side: false, note: "the state will not change by trying again" },
  { name: "Unknown error mid-payment", nature: "unknown", side: true, note: "you cannot tell if the charge went through" },
];

// intrinsic meaning of each matrix cell: [row][col], row 0 = temporary, 1 = permanent; col 0 = retry, 1 = don't
const CELLS = [
  [{ c: GREEN, h: "Recovers", s: "the retry works" }, { c: AMBER, h: "Gave up too early", s: "a retry would have worked" }],
  [{ c: RED, h: "Wasted, and risky", s: "fails again; may double a side effect" }, { c: GREEN, h: "Fails fast, clean", s: "correct to stop" }],
];

function verdict(sc, label) {
  const retry = label === "retry";
  if (sc.nature === "temporary") return retry
    ? { c: GREEN, code: "RECOVERS", t: "This was a temporary fault, so the next attempt is likely to succeed. Retrying is exactly right." }
    : { c: AMBER, code: "GAVE UP TOO EARLY", t: "This failure would have cleared on a retry, but you stopped. The request fails even though it did not have to." };
  if (sc.nature === "permanent") return retry
    ? { c: RED, code: "WASTED, AND RISKY", t: "Every attempt fails the same way, so retrying only burns work" + (sc.side ? " - and can repeat the side effect, like a double charge." : ".") }
    : { c: GREEN, code: "FAILS FAST, CLEAN", t: "The error will not change by trying again, so stopping now is right. A person can look into it if needed." };
  // unknown
  return retry
    ? { c: RED, code: "DANGEROUS", t: "You cannot tell if the charge already went through. Retrying can charge the customer twice, and you cannot take it back." }
    : { c: GREEN, code: "SAFE DEFAULT", t: "You cannot tell if this is temporary or permanent, and the action cannot be undone. Not retrying avoids the worst case." };
}

export default function PatternRetryableErrorClassification() {
  const [idx, setIdx] = useState(4);        // start on the unknown payment
  const [label, setLabel] = useState("retry"); // start by retrying it - the dangerous default
  const sc = SC[idx];
  const v = verdict(sc, label);

  // which cells are active
  const col = label === "retry" ? 0 : 1;
  const activeRows = sc.nature === "temporary" ? [0] : sc.nature === "permanent" ? [1] : [0, 1];
  const isActive = (r, c) => c === col && activeRows.indexOf(r) !== -1;

  const rowLabel = ["Actually temporary", "Actually permanent"];
  const colLabel = ["You retry", "You don't retry"];

  return (
    <div style={{ background: BG, color: TEXT, fontFamily: MONO, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid " + BORDER, fontSize: 12.5, lineHeight: 1.55 }}>
      <div style={{ color: ACCENT, fontSize: 10.5, letterSpacing: 2 }}>RETRYABLE ERROR CLASSIFICATION - TWO WAYS TO BE WRONG</div>
      <div style={{ color: "#EDEFF3", fontSize: 16.5, margin: "4px 0 3px", fontWeight: 700 }}>Was that error safe to retry?</div>
      <p style={{ color: "#9096A6", fontSize: 12, margin: 0 }}>Pick an error, then decide: retry it, or not. Watch where it lands. Two cells are the right call; two are costly - and one costs a double charge.</p>

      {/* scenario picker */}
      <div style={{ marginTop: 14 }}>
        <div style={{ color: MUTED, fontSize: 11, marginBottom: 6 }}>THE ERROR</div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {SC.map((s, i) => (
            <button key={i} onClick={() => setIdx(i)} style={{ padding: "7px 11px", borderRadius: 7, cursor: "pointer", fontFamily: MONO, fontSize: 11.5, border: "1px solid " + (i === idx ? ACCENT : "#333947"), background: i === idx ? ACCENT + "1E" : "#0C0D13", color: i === idx ? "#EDEFF3" : "#9AA0B0" }}>{s.name}</button>
          ))}
        </div>
        <div style={{ marginTop: 7, color: "#7C8290", fontSize: 11 }}>
          {sc.note}
          {sc.side && <span style={{ color: AMBER }}> &middot; this action cannot be undone</span>}
        </div>
      </div>

      {/* label choice */}
      <div style={{ marginTop: 13 }}>
        <div style={{ color: MUTED, fontSize: 11, marginBottom: 6 }}>YOUR LABEL</div>
        <div style={{ display: "flex", gap: 8 }}>
          {[["retry", "Retry it"], ["dont", "Don't retry"]].map(([k, lab]) => (
            <button key={k} onClick={() => setLabel(k)} style={{ flex: "1 1 0", padding: "9px 12px", borderRadius: 7, cursor: "pointer", fontFamily: MONO, fontSize: 12.5, fontWeight: 700, border: "1px solid " + (label === k ? ACCENT : "#333947"), background: label === k ? ACCENT + "1E" : "#0C0D13", color: label === k ? "#EDEFF3" : "#9AA0B0" }}>{lab}</button>
          ))}
        </div>
      </div>

      {/* 2x2 matrix */}
      <div style={{ marginTop: 15, display: "grid", gridTemplateColumns: "1.1fr 1fr 1fr", gap: 6 }}>
        <div />
        {colLabel.map((cl, c) => (
          <div key={c} style={{ textAlign: "center", color: c === col ? "#EDEFF3" : MUTED, fontSize: 11.5, fontWeight: 700, padding: "2px 0" }}>{cl}</div>
        ))}
        {[0, 1].map((r) => (
          <RowFrag key={r} r={r} rowLabel={rowLabel[r]} activeRow={activeRows.indexOf(r) !== -1} isActive={isActive} />
        ))}
      </div>

      {/* verdict */}
      <div style={{ marginTop: 14, background: SURFACE, border: "1px solid " + v.c, borderRadius: 8, padding: "12px 14px" }}>
        <div style={{ color: v.c, fontWeight: 700, fontSize: 13.5 }}>{v.code}</div>
        <div style={{ fontSize: 12.5, lineHeight: 1.6, color: TEXT, marginTop: 4 }}>{v.t}</div>
      </div>

      <div style={{ color: "#8B90A0", fontSize: 12, marginTop: 13, borderTop: "1px solid " + BORDER, paddingTop: 10, lineHeight: 1.65 }}>
        A temporary error (a blip, a busy server) may clear on a retry; a permanent one (bad input, a closed account) never will. When you cannot tell and the action cannot be undone, the careful default is <b>don't retry</b> - because the worst case there is giving up too early, not charging someone twice.
      </div>
    </div>
  );
}

function RowFrag({ r, rowLabel, activeRow, isActive }) {
  const cells = CELLS[r];
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", color: activeRow ? "#EDEFF3" : "#8B90A0", fontSize: 11.5, fontWeight: 700, paddingRight: 4 }}>{rowLabel}</div>
      {cells.map((cell, c) => {
        const on = isActive(r, c);
        return (
          <div key={c} style={{ background: on ? cell.c + "24" : "#0C0D13", border: "1px solid " + (on ? cell.c : "#242A38"), borderRadius: 8, padding: "10px 11px", opacity: on ? 1 : 0.6 }}>
            <div style={{ color: cell.c, fontWeight: 700, fontSize: 12 }}>{cell.h}</div>
            <div style={{ color: "#8B90A0", fontSize: 10.5, marginTop: 2, lineHeight: 1.4 }}>{cell.s}</div>
          </div>
        );
      })}
    </>
  );
}
