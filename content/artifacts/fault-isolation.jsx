import { useState } from "react";

// Pattern artifact - Fault Isolation (the general mechanism, situational detail removed).
// Structural grays use the named artifact tokens; GREEN/AMBER/RED and ACCENT are content accents.
// Deterministic and state-driven (no timers): the toggle is the pattern.

const BG = "#08090D", SURFACE = "#0F1118", SURFACE2 = "#161922", BORDER = "#1F2333";
const TEXT = "#C8CDD8", MUTED = "#6B7280";
const GREEN = "#22C55E", AMBER = "#F5B841", RED = "#EF4444", ACCENT = "#F97316";
const MONO = "'JetBrains Mono','Fira Code',ui-monospace,monospace";

const N = 4;              // services
const DEMAND = 3;         // slots a healthy service needs
const POOL = N * DEMAND;  // 12 total
const NAMES = ["A", "B", "C", "D"];

export default function PatternFaultIsolation() {
  const [isolate, setIsolate] = useState(false);
  const [stuck, setStuck] = useState(null);

  // Who owns each of the 12 resource slots.
  let slotOwner;
  if (isolate || stuck === null) {
    // fixed slices, or a healthy shared pool: each service holds its fair 3
    slotOwner = Array.from({ length: POOL }, (_, i) => Math.floor(i / DEMAND));
  } else {
    // shared pool + a stuck service: it grabs every slot and never lets go
    slotOwner = Array.from({ length: POOL }, () => stuck);
  }

  const held = Array(N).fill(0);
  slotOwner.forEach((o) => { held[o]++; });

  const stateOf = (i) => (i === stuck ? "stuck" : held[i] >= DEMAND ? "ok" : "starved");
  const states = NAMES.map((_, i) => stateOf(i));
  const healthy = states.filter((s) => s === "ok").length;
  const impacted = N - healthy;
  const stateColor = { ok: GREEN, starved: AMBER, stuck: RED };
  const stateWord = { ok: "OK", starved: "STARVED", stuck: "STUCK" };

  let verdict;
  if (stuck === null) {
    verdict = {
      c: GREEN,
      code: isolate ? "ISOLATED - EACH SERVICE HAS ITS OWN SLICE" : "SHARED POOL - EVERY SERVICE DRAWS FROM ONE",
      t: "All four services are healthy. Click one to make it STUCK, then watch how far the damage reaches.",
    };
  } else if (isolate) {
    verdict = {
      c: GREEN,
      code: "ISOLATED - THE DAMAGE STOPPED AT THE BOUNDARY",
      t: `Service ${NAMES[stuck]} could only drain its own slice. The other three keep their dedicated slots and serve normally. Blast radius: one service.`,
    };
  } else {
    verdict = {
      c: RED,
      code: "SHARED POOL - THE STUCK SERVICE DRAINED EVERYTHING",
      t: `Service ${NAMES[stuck]} grabbed every slot in the shared pool and never let go, so the other three are starved. Blast radius: the whole system.`,
    };
  }

  const S = {
    root: { background: BG, color: TEXT, fontFamily: MONO, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: `1px solid ${BORDER}`, fontSize: 12, lineHeight: 1.5 },
    label: { color: MUTED, fontSize: 10, letterSpacing: 1.2 },
    btn: (on) => ({ padding: "7px 11px", borderRadius: 6, cursor: "pointer", fontFamily: MONO, fontSize: 11, marginRight: 8, border: `1px solid ${on ? ACCENT : "#4A4F60"}`, color: on ? "#FFD9A8" : "#9AA0B0", background: on ? "rgba(249,115,22,0.12)" : "#0C0D13", fontWeight: on ? 700 : 400, transition: "all .25s ease" }),
    cure: { padding: "3px 9px", borderRadius: 6, cursor: "pointer", fontFamily: MONO, fontSize: 9.5, border: `1px solid ${BORDER}`, color: MUTED, background: "#0C0D13", marginLeft: 6 },
  };

  const slotColorOf = (owner) => stateColor[stateOf(owner)];

  return (
    <div style={S.root}>
      <div style={{ color: ACCENT, fontSize: 10, letterSpacing: 2 }}>FAULT ISOLATION - THE PATTERN, GENERAL</div>
      <div style={{ color: "#EDEFF3", fontSize: 16, margin: "4px 0 2px", fontWeight: 700 }}>Contain the blast</div>
      <p style={{ color: "#8B90A0", fontSize: 11, margin: 0 }}>Four services draw on one pool of resources. Break one and see how far the damage spreads.</p>

      {/* controls */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 14 }}>
        <span style={{ ...S.label, marginRight: 2 }}>ISOLATION</span>
        <button style={S.btn(isolate)} onClick={() => setIsolate((v) => !v)}>ISOLATE: {isolate ? "ON" : "OFF"}</button>
        <span style={{ color: MUTED, fontSize: 10 }}>click a service to break it{stuck !== null && <button style={S.cure} onClick={() => setStuck(null)}>CURE</button>}</span>
      </div>

      {/* verdict */}
      <div style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${verdict.c}`, background: `${verdict.c}14`, marginTop: 12 }}>
        <div style={{ color: verdict.c, fontWeight: 700 }}>{verdict.code}</div>
        <div style={{ marginTop: 5, fontSize: 11.5, lineHeight: 1.6, color: TEXT }}>{verdict.t}</div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
        {/* main: pool + services */}
        <div style={{ flex: "2 1 470px", minWidth: 300 }}>
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 12 }}>
            <div style={S.label}>{isolate ? "ISOLATED POOLS - ONE DEDICATED SLICE PER SERVICE" : "SHARED POOL - 12 SLOTS, FIRST COME FIRST SERVED"}</div>
            <div style={{ display: "flex", gap: 3, marginTop: 8, flexWrap: "wrap" }}>
              {slotOwner.map((owner, i) => (
                <span key={i} style={{ display: "flex", alignItems: "center" }}>
                  <span style={{ width: 26, height: 22, borderRadius: 4, background: `${slotColorOf(owner)}22`, border: `1px solid ${slotColorOf(owner)}`, color: slotColorOf(owner), fontSize: 8.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", transition: "all .35s ease" }}>{NAMES[owner]}</span>
                  {isolate && i % DEMAND === DEMAND - 1 && i !== POOL - 1 && (
                    <span style={{ width: 2, height: 26, background: BORDER, margin: "0 5px", borderRadius: 2 }} />
                  )}
                </span>
              ))}
            </div>
          </div>

          <div style={{ ...S.label, marginTop: 12 }}>SERVICES - CLICK ONE TO BREAK IT</div>
          <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
            {NAMES.map((name, i) => {
              const st = states[i];
              const c = stateColor[st];
              return (
                <button key={i} onClick={() => setStuck(stuck === i ? null : i)}
                  style={{ flex: "1 1 96px", minWidth: 96, textAlign: "left", cursor: "pointer", fontFamily: MONO, padding: "9px 10px", borderRadius: 8, background: `${c}14`, border: `1px solid ${c}`, color: TEXT, transition: "all .35s ease" }}>
                  <div style={{ fontWeight: 700, fontSize: 12 }}>Service {name}{i === stuck ? " \u2715" : ""}</div>
                  <div style={{ color: c, fontWeight: 700, fontSize: 10.5, marginTop: 2 }}>{stateWord[st]}</div>
                  <div style={{ color: MUTED, fontSize: 9.5, marginTop: 1 }}>{held[i]} slot{held[i] === 1 ? "" : "s"}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* side: meters */}
        <div style={{ flex: "1 1 210px", minWidth: 210, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 12 }}>
          <div style={S.label}>SERVICES HEALTHY</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: healthy === N ? GREEN : healthy === 0 ? RED : AMBER, transition: "color .35s ease" }}>{healthy}<span style={{ fontSize: 13, color: MUTED }}>/{N}</span></div>
          <div style={{ ...S.label, marginTop: 12 }}>BLAST RADIUS</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: impacted === 0 ? GREEN : impacted === N ? RED : AMBER, transition: "color .35s ease" }}>{impacted}<span style={{ fontSize: 13, color: MUTED }}>/{N}</span></div>
          <div style={{ fontSize: 10.5, color: "#8B90A0", lineHeight: 1.7, marginTop: 12 }}>
            The boundary is the whole story: <b style={{ color: TEXT }}>share</b> the pool and one stuck service starves everyone; <b style={{ color: TEXT }}>isolate</b> it and the same failure stops at one service.
          </div>
        </div>
      </div>

      <div style={{ color: MUTED, fontSize: 10, marginTop: 12, borderTop: `1px solid ${BORDER}`, paddingTop: 8, lineHeight: 1.7 }}>
        Dedicated resources are one boundary among many - the same move applies to tenants, availability zones, network paths, and sandboxed code. The logic is constant: a failure should not spread past the boundary meant to contain it.
      </div>
    </div>
  );
}
