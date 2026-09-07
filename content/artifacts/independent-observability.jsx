import { useState, useRef, useEffect } from "react";

// Pattern artifact - Independent Observability (live monitoring feed).
// Health checks roll into a feed every second. Kill the platform and watch what the feed does. With the monitor
// ON THE PLATFORM, the monitor dies with it: the feed goes silent, no alert, you are blind. With an INDEPENDENT
// watcher outside, it survives and its checks now fail - so alerts roll in and you know within seconds.

const BG = "#08090D", SURFACE = "#0F1118", SURFACE2 = "#161922", BORDER = "#1F2333";
const TEXT = "#C8CDD8", MUTED = "#6B7280";
const GREEN = "#22C55E", AMBER = "#F5B841", RED = "#EF4444", ACCENT = "#F97316";
const MONO = "'JetBrains Mono','Fira Code',ui-monospace,monospace";

const fmt = (s) => "00:" + String(s % 60).padStart(2, "0");

export default function PatternIndependentObservability() {
  const [mode, setMode] = useState("inband");   // inband | independent (problem-first)
  const [outage, setOutage] = useState(false);
  const [feed, setFeed] = useState([]);
  const modeRef = useRef(mode), outRef = useRef(outage), tRef = useRef(2), idRef = useRef(0);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { outRef.current = outage; }, [outage]);

  useEffect(() => {
    const h = setInterval(() => {
      tRef.current += 2;
      const ts = fmt(tRef.current);
      let entry = null;
      if (!outRef.current) entry = { ts, kind: "ok", t: "check OK - system healthy" };
      else if (modeRef.current === "independent") entry = { ts, kind: "alert", t: "ALERT - probe failed, system is DOWN" };
      // in-band + outage: the monitor died with the platform -> emit nothing (silence)
      if (entry) { idRef.current += 1; const e = { ...entry, id: idRef.current }; setFeed((f) => [e, ...f].slice(0, 7)); }
    }, 1100);
    return () => clearInterval(h);
  }, []);

  const independent = mode === "independent";
  const monitorDead = !independent && outage;
  const reset = (m) => { setOutage(false); setFeed([]); tRef.current = 2; if (m !== undefined) setMode(m); };

  let v;
  if (!outage) v = { c: MUTED, t: independent ? "Healthy checks are rolling in. The watcher lives outside the platform. Kill the platform and see what the feed does." : "Healthy checks are rolling in from the on-platform monitor. Kill the platform and watch the feed." };
  else if (independent) v = { c: GREEN, t: "The watcher survived the outage, so its checks now fail and ALERTS keep rolling in. You knew within seconds." };
  else v = { c: RED, t: "The monitor died with the platform, so the feed went silent - no alert, nothing rolling in. You are blind at the exact moment you needed to see." };

  const pill = (label, dead) => (
    <span style={{ fontSize: 10.5, padding: "3px 9px", borderRadius: 5, border: "1px solid " + (dead ? RED : GREEN), background: (dead ? RED : GREEN) + "16", color: dead ? "#E7A6A6" : "#9FE7B6", fontWeight: 700 }}>{label}: {dead ? "DOWN" : "up"}</span>
  );

  return (
    <div style={{ background: BG, color: TEXT, fontFamily: MONO, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid " + BORDER, fontSize: 12.5, lineHeight: 1.55 }}>
      <div style={{ color: ACCENT, fontSize: 10.5, letterSpacing: 2 }}>INDEPENDENT OBSERVABILITY - DON'T SHARE ITS FATE</div>
      <div style={{ color: "#EDEFF3", fontSize: 16.5, margin: "4px 0 3px", fontWeight: 700 }}>Does the alert still fire when the platform dies?</div>
      <p style={{ color: "#9096A6", fontSize: 12, margin: 0 }}>Health checks roll in every second. Kill the platform: if the monitor lived on it, the feed goes silent; if the watcher was independent, the alerts keep coming.</p>

      {/* mode toggle */}
      <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
        <button onClick={() => reset("inband")} style={{ flex: "1 1 0", padding: "9px 12px", borderRadius: 7, cursor: "pointer", fontFamily: MONO, fontSize: 12, fontWeight: 700, border: "1px solid " + (!independent ? ACCENT : "#333947"), background: !independent ? ACCENT + "1E" : "#0C0D13", color: !independent ? "#EDEFF3" : "#9AA0B0" }}>Monitor on the platform</button>
        <button onClick={() => reset("independent")} style={{ flex: "1 1 0", padding: "9px 12px", borderRadius: 7, cursor: "pointer", fontFamily: MONO, fontSize: 12, fontWeight: 700, border: "1px solid " + (independent ? ACCENT : "#333947"), background: independent ? ACCENT + "1E" : "#0C0D13", color: independent ? "#EDEFF3" : "#9AA0B0" }}>Independent watcher (outside)</button>
      </div>

      {/* status row */}
      <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {pill("system", outage)}
        {pill(independent ? "watcher (outside)" : "monitor (on platform)", monitorDead)}
        <span style={{ marginLeft: "auto", fontSize: 11.5, fontWeight: 700, color: (outage && independent) ? GREEN : (outage ? RED : MUTED) }}>{outage && independent ? "ALERTING" : outage ? "SILENT - no alert" : "quiet (healthy)"}</span>
      </div>

      {/* live feed */}
      <div style={{ marginTop: 10, background: "#0A0B0F", border: "1px solid " + BORDER, borderRadius: 8, padding: "10px 12px", minHeight: 150 }}>
        <div style={{ color: MUTED, fontSize: 10, letterSpacing: 0.5, marginBottom: 6 }}>MONITORING FEED</div>
        {monitorDead && <div style={{ color: RED, fontSize: 11.5, fontWeight: 700, marginBottom: 6 }}>-- monitor offline: no signal since the outage --</div>}
        {feed.length === 0 && !monitorDead && <div style={{ color: "#565C6B", fontSize: 11, fontStyle: "italic" }}>waiting for the first check...</div>}
        {feed.map((e) => (
          <div key={e.id} style={{ fontSize: 11.5, lineHeight: 1.7, color: e.kind === "alert" ? "#F0A6A6" : "#9FE7B6" }}>
            <span style={{ color: MUTED }}>{e.ts}</span>  {e.kind === "alert" ? "\u2715" : "\u2713"} {e.t}
          </div>
        ))}
      </div>

      {/* actions */}
      <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={() => setOutage(true)} disabled={outage} style={{ padding: "8px 15px", borderRadius: 7, cursor: outage ? "not-allowed" : "pointer", fontFamily: MONO, fontSize: 12, fontWeight: 700, border: "1px solid " + (outage ? "#333947" : RED), background: outage ? "#0C0D13" : RED + "22", color: outage ? "#565C6B" : "#F0A6A6" }}>Kill the platform</button>
        <button onClick={() => reset()} style={{ padding: "8px 12px", borderRadius: 7, cursor: "pointer", fontFamily: MONO, fontSize: 11.5, border: "1px solid " + BORDER, background: "transparent", color: "#9AA0B0" }}>&#8635; reset</button>
      </div>

      {/* verdict */}
      <div style={{ marginTop: 12, background: SURFACE, border: "1px solid " + v.c, borderRadius: 8, padding: "11px 13px", fontSize: 12.5, lineHeight: 1.6, color: TEXT }}>{v.t}</div>

      <div style={{ color: "#8B90A0", fontSize: 12, marginTop: 13, borderTop: "1px solid " + BORDER, paddingTop: 10, lineHeight: 1.65 }}>
        Whatever the watcher shares with the system it watches is a path for the system's failure to reach the watcher. Keep the deep, built-in monitoring for ordinary days, but also run one simple, independent watcher in a separate failure domain - its whole value is that it keeps reporting through the outage that silences everything else.
      </div>
    </div>
  );
}
