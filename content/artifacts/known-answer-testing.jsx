import { useState, useRef, useEffect } from "react";

// Pattern artifact - Known-Answer Testing (live request stream).
// Requests flow left to right through a chip that squares numbers. Break the chip silently and it starts
// returning wrong answers for some inputs - but its health check stays green, and real requests have no known
// answer to compare against, so nothing notices. Slide known-answer tests into the stream: each test carries
// its expected answer, and the first one that comes back wrong catches the broken chip.

const BG = "#08090D", SURFACE = "#0F1118", SURFACE2 = "#161922", BORDER = "#1F2333";
const TEXT = "#C8CDD8", MUTED = "#6B7280";
const GREEN = "#22C55E", AMBER = "#F5B841", RED = "#EF4444", ACCENT = "#F97316";
const MONO = "'JetBrains Mono','Fira Code',ui-monospace,monospace";

const IN_X = [1, 10, 19, 28];          // % positions before the chip
const CHIP_X = 44.5;                   // % position inside the chip
const OUT_X = [61, 70, 79, 88];        // % positions after the chip
const STEPS = IN_X.length + 1 + OUT_X.length;
const AT_CHIP = IN_X.length;
const posX = (p) => (p < 0 ? -9 : p >= STEPS ? 100 : p < AT_CHIP ? IN_X[p] : p === AT_CHIP ? CHIP_X : OUT_X[p - AT_CHIP - 1]);  // -9 / 100 are just off the edges, so requests slide in and out
const TEST_BANK = [3, 7, 12, 16, 20, 9];   // inputs whose answers are known
const breaks = (n) => n % 3 === 1;          // the inputs a broken chip gets wrong
const TICK = 1200;   // ms per step of the stream (slowed so each request can be followed)
const SQ = "²";

function newItem(id, rate) {
  const test = Math.random() * 100 < rate;
  const n = test ? TEST_BANK[Math.floor(Math.random() * TEST_BANK.length)] : 2 + Math.floor(Math.random() * 19);
  return { id, n, test, p: -1, got: null, wrong: false };
}
function initSim() {
  const items = [];
  for (let p = 0; p < STEPS; p++) {
    const it = newItem(p + 1, 0);
    it.p = STEPS - 1 - p;
    if (it.p >= AT_CHIP) it.got = it.n * it.n;
    items.push(it);
  }
  return { items, id: STEPS, broken: false, brokenTick: 0, tick: 0, wrongSent: 0, caught: null };
}

export default function PatternKnownAnswerTesting() {
  const [rate, setRate] = useState(0);        // % of traffic that is known-answer tests (problem-first: none)
  const [, force] = useState(0);
  const sim = useRef(null);
  if (!sim.current) sim.current = initSim();
  const rateRef = useRef(rate);
  const trackRef = useRef(null);
  const [compact, setCompact] = useState(false);   // narrow screens get slimmer chips and shorter labels
  useEffect(() => {
    const el = trackRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => setCompact(entries[0].contentRect.width < 560));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => { rateRef.current = rate; }, [rate]);

  useEffect(() => {
    const h = setInterval(() => {
      const s = sim.current;
      if (s.caught) return;
      s.tick += 1;
      s.items.forEach((it) => { it.p += 1; });
      s.items = s.items.filter((it) => it.p <= STEPS);
      s.id += 1;
      s.items.push(newItem(s.id, rateRef.current));
      s.items.forEach((it) => {
        if (it.p === AT_CHIP && it.got === null) {
          it.wrong = s.broken && breaks(it.n);
          it.got = it.wrong ? it.n * it.n - 1 : it.n * it.n;
          if (it.wrong && !it.test) s.wrongSent += 1;
          if (it.wrong && it.test) s.caught = { n: it.n, got: it.got, exp: it.n * it.n, secs: ((s.tick - s.brokenTick) * TICK / 1000).toFixed(1) };
        }
      });
      force((x) => x + 1);
    }, TICK);
    return () => clearInterval(h);
  }, []);

  const s = sim.current;
  const breakChip = () => { if (!s.broken) { s.broken = true; s.brokenTick = s.tick; force((x) => x + 1); } };
  const reset = () => { sim.current = initSim(); force((x) => x + 1); };

  let v;
  if (s.caught) v = { c: GREEN, t: "Caught after " + s.caught.secs + "s. A known-answer test asked " + s.caught.n + SQ + " and got " + s.caught.got + " instead of " + s.caught.exp + ", so the chip was pulled. " + s.wrongSent + " wrong answer" + (s.wrongSent === 1 ? "" : "s") + " reached users before that. More tests catch it sooner - but every test is work spent checking a chip that is usually fine." };
  else if (s.broken && rate === 0) v = { c: RED, t: "The chip is quietly wrong - " + s.wrongSent + " wrong answer" + (s.wrongSent === 1 ? "" : "s") + " sent to users so far - and the health check still says UP. Real requests have no known answer to compare against, so nothing will ever flag this. Slide in some known-answer tests." };
  else if (s.broken) v = { c: AMBER, t: s.wrongSent + " wrong answer" + (s.wrongSent === 1 ? "" : "s") + " sent to users so far. Known-answer tests are flowing through - the moment one comes back with the wrong answer, the broken chip is caught." };
  else v = { c: MUTED, t: "The chip is working and its health check is green. Break it silently and watch: does anything notice?" };

  const chip = (it) => {
    const done = it.got !== null;
    let border = "#2E3547", bg = SURFACE2, label = "user", labelC = "#7C8290", sub = "", subC = MUTED, dash = "solid";
    if (it.test) { border = AMBER; bg = "#1E1810"; label = "TEST"; labelC = AMBER; sub = done ? "" : (compact ? "\u2192" : "want ") + it.n * it.n; subC = "#C9A86A"; }
    if (done && it.test) {
      if (it.wrong) { border = RED; bg = "#2A1214"; sub = "✕ wrong"; subC = RED; }
      else { border = GREEN; bg = "#0F2016"; sub = "✓ match"; subC = GREEN; }
    }
    if (done && !it.test && it.wrong) { border = RED; dash = "dashed"; sub = compact ? "\u2715*" : "wrong*"; subC = "#E7A6A6"; }
    return (
      <div key={it.id} style={{ position: "absolute", left: posX(it.p) + "%", top: 22, width: compact ? "9%" : "7.8%", minWidth: compact ? 0 : 30, height: 54, transition: "left " + (TICK - 60) / 1000 + "s linear", zIndex: 2, background: bg, border: "1px " + dash + " " + border, borderRadius: 6, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: 10, lineHeight: 1.3, overflow: "hidden" }}>
        <span style={{ color: labelC, fontSize: compact ? 7.5 : 8.5, letterSpacing: 0.5 }}>{label}</span>
        <span style={{ color: "#E2E5EC", fontWeight: 700, fontSize: compact ? 9.5 : 11 }}>{done ? (compact ? "" : "= ") + it.got : it.n + SQ}</span>
        <span style={{ color: subC, fontSize: 8.5 }}>{sub || " "}</span>
      </div>
    );
  };

  const pulled = !!s.caught;

  return (
    <div style={{ background: BG, color: TEXT, fontFamily: MONO, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid " + BORDER, fontSize: 12.5, lineHeight: 1.55 }}>
      <div style={{ color: ACCENT, fontSize: 10.5, letterSpacing: 2 }}>KNOWN-ANSWER TESTING - TEST IF IT'S RIGHT</div>
      <div style={{ color: "#EDEFF3", fontSize: 16.5, margin: "4px 0 3px", fontWeight: 700 }}>The chip says it's healthy. Is it right?</div>
      <p style={{ color: "#9096A6", fontSize: 12, margin: 0 }}>Requests flow through a chip that squares numbers. A real request has no known answer, so nobody can tell if the reply is wrong. A known-answer test carries the answer it expects.</p>

      {/* live stream */}
      <div ref={trackRef} style={{ position: "relative", marginTop: 14, height: 98, background: "#0A0B0F", border: "1px solid " + BORDER, borderRadius: 8, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: "1%", right: "1%", top: 49, height: 1, background: "#1C2130" }} />
        <div style={{ position: "absolute", left: "40.5%", width: "17%", top: 6, height: 86, borderRadius: 8, border: "1.5px solid " + (pulled ? RED : s.broken ? "#3A3022" : "#2E3547"), background: pulled ? "#2A1214" : "#11141C", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", padding: "4px 2px" }}>
          <span style={{ color: "#AEB4C2", fontSize: 9.5, fontWeight: 700 }}>chip</span>
          <span style={{ fontSize: 8.5, color: pulled ? RED : GREEN, textAlign: "center" }}>{pulled ? "PULLED" : (compact ? "\u2713 UP" : "health: \u2713 UP")}</span>
        </div>
        {s.items.map(chip)}
      </div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 6, fontSize: 10, color: MUTED }}>
        <span><span style={{ color: "#7C8290" }}>&#9632;</span> user request</span>
        <span><span style={{ color: AMBER }}>&#9632;</span> known-answer test</span>
        <span><span style={{ color: RED }}>wrong*</span> = a wrong answer only you can see - the system can't tell</span>
      </div>

      {/* controls */}
      <div style={{ marginTop: 12, background: SURFACE, border: "1px solid " + BORDER, borderRadius: 8, padding: "11px 13px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
          <span style={{ color: "#AEB4C2" }}>Known-answer tests mixed into the traffic</span>
          <span style={{ color: rate ? AMBER : MUTED, fontWeight: 700 }}>{rate}%</span>
        </div>
        <input type="range" min="0" max="30" step="5" value={rate} onChange={(e) => setRate(Number(e.target.value))} style={{ width: "100%", marginTop: 6, accentColor: AMBER }} />
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <button onClick={breakChip} disabled={s.broken} style={{ padding: "8px 14px", borderRadius: 7, cursor: s.broken ? "not-allowed" : "pointer", fontFamily: MONO, fontSize: 12, fontWeight: 700, border: "1px solid " + (s.broken ? "#333947" : RED), background: s.broken ? "#0C0D13" : RED + "22", color: s.broken ? "#565C6B" : "#F0A6A6" }}>{s.broken ? "Chip is broken" : "Break the chip (silently)"}</button>
          <button onClick={reset} style={{ padding: "8px 12px", borderRadius: 7, cursor: "pointer", fontFamily: MONO, fontSize: 11.5, border: "1px solid " + BORDER, background: "transparent", color: "#9AA0B0" }}>&#8635; reset</button>
        </div>
      </div>

      {/* readouts */}
      <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 0", minWidth: 150, background: SURFACE, border: "1px solid " + BORDER, borderRadius: 8, padding: "10px 12px" }}>
          <div style={{ color: MUTED, fontSize: 10.5 }}>WRONG ANSWERS SENT TO USERS</div>
          <div style={{ color: s.wrongSent ? RED : "#C8CDD8", fontSize: 21, fontWeight: 700, marginTop: 3 }}>{s.wrongSent}</div>
        </div>
        <div style={{ flex: "1 1 0", minWidth: 150, background: SURFACE, border: "1px solid " + BORDER, borderRadius: 8, padding: "10px 12px" }}>
          <div style={{ color: MUTED, fontSize: 10.5 }}>HEALTH CHECK</div>
          <div style={{ color: pulled ? RED : GREEN, fontSize: 21, fontWeight: 700, marginTop: 3 }}>{pulled ? "PULLED" : "UP"}</div>
        </div>
        <div style={{ flex: "1 1 0", minWidth: 150, background: SURFACE, border: "1px solid " + BORDER, borderRadius: 8, padding: "10px 12px" }}>
          <div style={{ color: MUTED, fontSize: 10.5 }}>WORK SPENT ON TESTS</div>
          <div style={{ color: rate ? AMBER : "#C8CDD8", fontSize: 21, fontWeight: 700, marginTop: 3 }}>{rate}%</div>
        </div>
      </div>

      {/* verdict */}
      <div style={{ marginTop: 12, background: SURFACE, border: "1px solid " + v.c, borderRadius: 8, padding: "11px 13px", fontSize: 12.5, lineHeight: 1.6, color: TEXT }}>{v.t}</div>

      <div style={{ color: "#8B90A0", fontSize: 12, marginTop: 13, borderTop: "1px solid " + BORDER, paddingTop: 10, lineHeight: 1.65 }}>
        Some faults are silent: the chip returns a wrong answer with full confidence and its health check stays green. You cannot wait for a signal it will never send, so you create one - mix in requests whose answers are already known, and treat any mismatch as the fault.
      </div>
    </div>
  );
}
