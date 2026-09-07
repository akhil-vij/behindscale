import { useState, useRef, useEffect } from "react";

// Pattern artifact - Idempotency Keys (animated flow).
// A request packet travels client -> server. The server handles it, and the reply travels back but is LOST on
// the way, so the client cannot tell it worked and retries. WITHOUT a key, every request the server receives
// runs the charge again. WITH a key (badge on the packet), the server matches the key in its store and
// replays the first result, so the charge stays at $50 no matter how many packets arrive.

const BG = "#08090D", SURFACE = "#0F1118", SURFACE2 = "#161922", BORDER = "#1F2333";
const TEXT = "#C8CDD8", MUTED = "#6B7280";
const GREEN = "#22C55E", AMBER = "#F5B841", RED = "#EF4444", ACCENT = "#F97316", PURPLE = "#A78BFA";
const MONO = "'JetBrains Mono','Fira Code',ui-monospace,monospace";

const CHARGE = 50, KEY = "pay-9f3c1a";
const X0 = 128, X1 = 566, CY = 66; // track endpoints (client edge -> server edge)

export default function PatternIdempotencyKeys() {
  const [keyOn, setKeyOn] = useState(false);
  const [, force] = useState(0);
  const sim = useRef({ phase: "idle", px: 0, sends: 0, charged: 0, seen: false, flash: 0, flashKind: "" });
  const keyRef = useRef(keyOn);
  useEffect(() => { keyRef.current = keyOn; }, [keyOn]);

  useEffect(() => {
    const id = setInterval(() => {
      const s = sim.current;
      if (s.phase === "toServer") {
        s.px += 0.05;
        if (s.px >= 1) {
          s.px = 1;
          const executed = keyRef.current ? !s.seen : true; // with key, only first runs
          s.sends += 1;
          if (executed) s.charged += 1;
          if (keyRef.current && executed) s.seen = true;
          s.flash = Date.now() + 650; s.flashKind = executed ? "charge" : "replay";
          s.phase = "reply";
        }
      } else if (s.phase === "reply") {
        s.px -= 0.045;
        if (s.px <= 0.4) s.phase = "idle"; // reply is lost before reaching the client
      }
      force((n) => n + 1);
    }, 45);
    return () => clearInterval(id);
  }, []);

  const s = sim.current;
  const reset = (kOn) => { sim.current = { phase: "idle", px: 0, sends: 0, charged: 0, seen: false, flash: 0, flashKind: "" }; if (kOn !== undefined) setKeyOn(kOn); force((n) => n + 1); };
  const send = () => { if (s.phase === "idle") { s.phase = "toServer"; s.px = 0; force((n) => n + 1); } };

  const total = s.charged * CHARGE;
  const busy = s.phase !== "idle";
  const flashing = s.flash > Date.now();
  const svColor = flashing ? (s.flashKind === "charge" ? RED : GREEN) : (keyOn ? PURPLE : "#2A3040");
  const pktX = X0 + s.px * (X1 - X0);
  const replyOpacity = s.phase === "reply" ? Math.max(0, (s.px - 0.4) / 0.6) : 1;

  let v;
  if (s.sends === 0) v = { c: MUTED, t: "Send the payment and watch the packet travel to the server. The reply gets lost on the way back, so the client will not know it worked - and retries." };
  else if (keyOn) v = { c: GREEN, t: "Charged once ($" + total + ") across " + s.sends + " packets. Each carried the same key, so the server matched it and replayed the saved result instead of charging again." };
  else if (s.sends > 1) v = { c: RED, t: "Double-charged: $" + total + " for one payment. With no key, every packet that reached the server looked new, so it ran the charge again." };
  else v = { c: AMBER, t: "Charged $" + total + " - once so far. But the reply was lost; with no key, the next retry will look new and charge again." };

  return (
    <div style={{ background: BG, color: TEXT, fontFamily: MONO, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid " + BORDER, fontSize: 12.5, lineHeight: 1.55 }}>
      <div style={{ color: ACCENT, fontSize: 10.5, letterSpacing: 2 }}>IDEMPOTENCY KEYS - RETRY WITHOUT REDOING</div>
      <div style={{ color: "#EDEFF3", fontSize: 16.5, margin: "4px 0 3px", fontWeight: 700 }}>Retry the payment - charge it once</div>
      <p style={{ color: "#9096A6", fontSize: 12, margin: 0 }}>The reply gets lost, so the client retries. Watch each packet reach the server - without a key it charges again, with a key it just replays.</p>

      {/* key toggle */}
      <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
        <button onClick={() => reset(false)} style={{ flex: "1 1 0", padding: "9px 12px", borderRadius: 7, cursor: "pointer", fontFamily: MONO, fontSize: 12.5, fontWeight: 700, border: "1px solid " + (!keyOn ? ACCENT : "#333947"), background: !keyOn ? ACCENT + "1E" : "#0C0D13", color: !keyOn ? "#EDEFF3" : "#9AA0B0" }}>No key</button>
        <button onClick={() => reset(true)} style={{ flex: "1 1 0", padding: "9px 12px", borderRadius: 7, cursor: "pointer", fontFamily: MONO, fontSize: 12.5, fontWeight: 700, border: "1px solid " + (keyOn ? ACCENT : "#333947"), background: keyOn ? ACCENT + "1E" : "#0C0D13", color: keyOn ? "#EDEFF3" : "#9AA0B0" }}>With idempotency key</button>
      </div>

      {/* animated flow */}
      <div style={{ marginTop: 12, background: SURFACE, border: "1px solid " + BORDER, borderRadius: 8, padding: "10px 10px 8px" }}>
        <svg viewBox="0 0 700 128" style={{ width: "100%", height: "auto", overflow: "visible" }}>
          {/* client */}
          <rect x="26" y="42" width="96" height="48" rx="8" fill={SURFACE2} stroke="#2A3040" strokeWidth="1.2" />
          <text x="74" y="64" fill={TEXT} fontSize="11.5" fontWeight="700" textAnchor="middle" fontFamily={MONO}>client</text>
          <text x="74" y="79" fill={MUTED} fontSize="8.5" textAnchor="middle" fontFamily={MONO}>pays $50</text>
          {/* track */}
          <line x1={X0} y1={CY} x2={X1} y2={CY} stroke="#242A38" strokeWidth="1.5" strokeDasharray="3 5" />
          {/* server */}
          <rect x="566" y="40" width="120" height="52" rx="8" fill={SURFACE2} stroke={svColor} strokeWidth={flashing ? 2.4 : 1.4} />
          <text x="626" y="60" fill={flashing ? svColor : TEXT} fontSize="11.5" fontWeight="700" textAnchor="middle" fontFamily={MONO}>server</text>
          <text x="626" y="76" fill={flashing ? svColor : MUTED} fontSize="8.5" textAnchor="middle" fontFamily={MONO}>{flashing ? (s.flashKind === "charge" ? "charged $50" : "replayed, $0") : (keyOn && s.seen ? "key on file" : "waiting")}</text>

          {/* in-flight packet */}
          {s.phase === "toServer" && (
            <g>
              <rect x={pktX - 24} y={CY - 11} width="48" height="22" rx="5" fill={keyOn ? PURPLE + "26" : ACCENT + "22"} stroke={keyOn ? PURPLE : ACCENT} strokeWidth="1.2" />
              <text x={pktX} y={CY + 4} fill={keyOn ? "#C9B8F5" : "#F0B27A"} fontSize="9" fontWeight="700" textAnchor="middle" fontFamily={MONO}>$50{keyOn ? " K" : ""}</text>
            </g>
          )}
          {/* dropped reply */}
          {s.phase === "reply" && (
            <g opacity={replyOpacity}>
              <circle cx={pktX} cy={CY} r="4" fill={GRAYreply()} />
              {s.px <= 0.55 && <text x={pktX} y={CY - 10} fill={RED} fontSize="9" textAnchor="middle" fontFamily={MONO}>reply lost</text>}
            </g>
          )}
        </svg>
      </div>

      {/* send controls */}
      <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={send} disabled={busy} style={{ padding: "8px 16px", borderRadius: 7, cursor: busy ? "wait" : "pointer", fontFamily: MONO, fontSize: 12.5, fontWeight: 700, border: "1px solid " + (busy ? "#333947" : ACCENT), background: busy ? "#0C0D13" : ACCENT, color: busy ? "#565C6B" : "#0A0B0F" }}>{s.sends === 0 ? "Send payment" : "Client retries"}</button>
        <button onClick={() => reset()} style={{ padding: "8px 12px", borderRadius: 7, cursor: "pointer", fontFamily: MONO, fontSize: 11.5, border: "1px solid " + BORDER, background: "transparent", color: "#9AA0B0" }}>&#8635; reset</button>
        {keyOn && <span style={{ marginLeft: "auto", color: PURPLE, fontSize: 11 }}>packets carry key <b style={{ color: "#C9B8F5" }}>{KEY}</b></span>}
      </div>

      {/* readouts */}
      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 0", background: SURFACE, border: "1px solid " + BORDER, borderRadius: 8, padding: "10px 12px" }}>
          <div style={{ color: MUTED, fontSize: 10.5 }}>PACKETS SENT</div>
          <div style={{ color: "#C8CDD8", fontSize: 21, fontWeight: 700, marginTop: 3 }}>{s.sends}</div>
        </div>
        <div style={{ flex: "1 1 0", background: SURFACE, border: "1px solid " + BORDER, borderRadius: 8, padding: "10px 12px" }}>
          <div style={{ color: MUTED, fontSize: 10.5 }}>TIMES CHARGED</div>
          <div style={{ color: s.charged > 1 ? RED : GREEN, fontSize: 21, fontWeight: 700, marginTop: 3 }}>{s.charged}</div>
        </div>
        <div style={{ flex: "1 1 0", background: SURFACE, border: "1px solid " + BORDER, borderRadius: 8, padding: "10px 12px" }}>
          <div style={{ color: MUTED, fontSize: 10.5 }}>TOTAL CHARGED</div>
          <div style={{ color: total > CHARGE ? RED : (total === CHARGE ? GREEN : "#C8CDD8"), fontSize: 21, fontWeight: 700, marginTop: 3 }}>${total}</div>
        </div>
      </div>

      {/* verdict */}
      <div style={{ marginTop: 12, background: SURFACE, border: "1px solid " + v.c, borderRadius: 8, padding: "11px 13px", fontSize: 12.5, lineHeight: 1.6, color: TEXT }}>{v.t}</div>

      <div style={{ color: "#8B90A0", fontSize: 12, marginTop: 13, borderTop: "1px solid " + BORDER, paddingTop: 10, lineHeight: 1.65 }}>
        The client can never be sure a failed request did not actually go through, so it retries. With no key, the server cannot tell a retry from a new order, and a charge runs again. The key is the client and server agreeing on one label per operation, so the work happens exactly once.
      </div>
    </div>
  );
}

function GRAYreply() { return "#8A93A5"; }
