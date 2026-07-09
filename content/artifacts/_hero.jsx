import { useState, useEffect, useRef } from "react";

// deterministic PRNG — organic-looking motion, reproducible frame to frame
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GOLD = "#F5B841";     // critical — payments
const BULK = "#5b6472";     // batch jobs
const RED = "#e5484d";
const GREEN = "#30a46c";
const DT = 0.1;
const CAPACITY = 50;        // requests/s the server can serve
const CRIT_SHARE = 0.3;     // payments are the minority of offered load
const TRAVEL = 2.1;         // seconds a request takes to cross the channel
const GATE = 0.7;           // where dropped requests peel away
const MAXDOTS = 90;

export default function HeroShedding() {
  const [traffic, setTraffic] = useState(80);   // 0..100 -> req/s offered
  const [smart, setSmart] = useState(true);
  const [, force] = useState(0);
  const w = useRef(null);
  if (!w.current) {
    w.current = { t: 0, rng: mulberry32(42), dots: [], nid: 0,
      offCrit: 12, srvCrit: 12, offBulk: 28, srvBulk: 15 };
  }
  const smartRef = useRef(smart); smartRef.current = smart;
  const trafRef = useRef(traffic); trafRef.current = traffic;

  useEffect(() => {
    const id = setInterval(() => {
      const W = w.current;
      W.t += DT;
      const offered = trafRef.current;
      const offCrit = CRIT_SHARE * offered;
      const offBulk = (1 - CRIT_SHARE) * offered;

      // how much of each class the server serves this instant
      let srvCrit, srvBulk;
      if (offered <= CAPACITY) { srvCrit = offCrit; srvBulk = offBulk; }
      else if (smartRef.current) {
        srvCrit = Math.min(offCrit, CAPACITY);           // protect payments first
        srvBulk = Math.max(0, CAPACITY - srvCrit);
        srvBulk = Math.min(srvBulk, offBulk);
      } else {
        const frac = CAPACITY / offered;                  // drop everything evenly
        srvCrit = offCrit * frac; srvBulk = offBulk * frac;
      }

      // smooth the meters so a toggle reads within ~1s
      const k = 0.25;
      W.offCrit += (offCrit - W.offCrit) * k;
      W.srvCrit += (srvCrit - W.srvCrit) * k;
      W.offBulk += (offBulk - W.offBulk) * k;
      W.srvBulk += (srvBulk - W.srvBulk) * k;

      // spawn dots matching the instantaneous served/dropped split
      const spawn = (kind, off, srv) => {
        const n = off * DT * 0.5;
        let count = Math.floor(n) + (W.rng() < n % 1 ? 1 : 0);
        const dropFrac = off > 0.01 ? 1 - srv / off : 0;
        for (let i = 0; i < count; i++) {
          const lanes = kind === "crit" ? 3 : 4;
          const laneBase = kind === "crit" ? 0 : 3;
          W.dots.push({
            id: W.nid++, kind,
            lane: laneBase + Math.floor(W.rng() * lanes),
            born: W.t + W.rng() * 0.05,
            dropped: W.rng() < dropFrac,
          });
        }
      };
      spawn("crit", offCrit, srvCrit);
      spawn("bulk", offBulk, srvBulk);

      // retire finished dots, cap the array
      W.dots = W.dots.filter((d) => W.t - d.born < TRAVEL * 1.25);
      if (W.dots.length > MAXDOTS) W.dots.splice(0, W.dots.length - MAXDOTS);

      force((x) => (x + 1) & 0xffff);
    }, 100);
    return () => clearInterval(id);
  }, []);

  const W = w.current;
  const offered = traffic;
  const over = offered > CAPACITY;
  const payPct = W.offCrit > 0.5 ? Math.round((W.srvCrit / W.offCrit) * 100) : 100;
  const totalServed = Math.round(W.srvCrit + W.srvBulk);

  const caption = !over
    ? { c: GREEN, t: "Traffic is under capacity — everything flows. Push it past the line." }
    : smart
      ? { c: GOLD, t: "Overwhelmed — yet payments hold at 100%. The system sheds batch jobs first." }
      : { c: RED, t: `Overwhelmed and shedding blindly — ${100 - payPct}% of payments are failing with everything else.` };

  const mono = "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, monospace";
  const H = 190;
  const laneY = (lane) => 16 + lane * ((H - 32) / 7);

  const dotStyle = (d) => {
    const p = Math.max(0, (W.t - d.born) / TRAVEL);
    const color = d.kind === "crit" ? GOLD : BULK;
    let left, top, opacity = 1;
    if (!d.dropped || p < GATE) {
      left = p * 100;
      top = laneY(d.lane);
      if (d.dropped && p > GATE - 0.08) opacity = 1; // still on line until gate
    } else {
      const fall = (p - GATE) / (1 - GATE);
      left = GATE * 100;
      top = laneY(d.lane) + fall * 70;
      opacity = Math.max(0, 1 - fall * 1.3);
    }
    if (!d.dropped && p >= 1) { left = 100; opacity = Math.max(0, 1 - (p - 1) * 4); }
    const served = !d.dropped && p >= 0.97;
    return {
      position: "absolute", left: `${left}%`, top: `${top}%`,
      width: d.kind === "crit" ? 9 : 7, height: d.kind === "crit" ? 9 : 7,
      marginLeft: -4, marginTop: -4, borderRadius: "50%",
      background: d.dropped && p > GATE ? RED : color, opacity,
      boxShadow: served ? `0 0 8px ${GOLD}` : d.kind === "crit" ? `0 0 5px ${GOLD}66` : "none",
      transition: "none",
    };
  };

  return (
    <div style={{ background: "#0b0d12", border: "1px solid #20242e", borderRadius: 14,
      padding: 18, fontFamily: mono, color: "#c7ccd6", maxWidth: 640, margin: "0 auto" }}>

      {/* channel */}
      <div style={{ position: "relative", height: H, borderRadius: 10, overflow: "hidden",
        background: "linear-gradient(90deg,#0d1017,#0f1219)", border: "1px solid #1b1f28" }}>
        {/* source labels */}
        <div style={{ position: "absolute", left: 10, top: laneY(1) - 8, fontSize: 10, color: GOLD, letterSpacing: 1 }}>PAYMENTS</div>
        <div style={{ position: "absolute", left: 10, top: laneY(5) - 8, fontSize: 10, color: "#78818f", letterSpacing: 1 }}>BATCH JOBS</div>

        {/* capacity gate line */}
        <div style={{ position: "absolute", left: `${GATE * 100}%`, top: 0, bottom: 0, width: 1,
          background: over ? `${RED}88` : "#2a2f3a" }} />
        <div style={{ position: "absolute", left: `${GATE * 100}%`, top: 6, transform: "translateX(-50%)",
          fontSize: 9, color: over ? RED : "#5a6270", letterSpacing: 1, whiteSpace: "nowrap" }}>
          CAPACITY {CAPACITY}/s
        </div>

        {/* server */}
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "10%",
          background: over ? `${RED}14` : `${GREEN}10`, borderLeft: `1px solid ${over ? RED + "55" : "#2a2f3a"}`,
          display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontSize: 9, color: over ? RED : GREEN, transform: "rotate(90deg)", letterSpacing: 2, whiteSpace: "nowrap" }}>SERVER</div>
        </div>

        {/* dots */}
        {W.dots.map((d) => <div key={d.id} style={dotStyle(d)} />)}

        {/* dropped tray hint */}
        <div style={{ position: "absolute", left: `${GATE * 100 - 4}%`, bottom: 4, fontSize: 8.5, color: `${RED}bb`, letterSpacing: 1 }}>
          ▼ dropped
        </div>
      </div>

      {/* payoff meters */}
      <div style={{ display: "flex", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 180px", background: "#0e1118", border: `1px solid ${payPct >= 99 ? GREEN + "55" : RED + "55"}`,
          borderRadius: 10, padding: "10px 14px" }}>
          <div style={{ fontSize: 10, color: "#78818f", letterSpacing: 1.5 }}>PAYMENTS SUCCEEDED</div>
          <div style={{ fontSize: 30, fontWeight: 700, color: payPct >= 99 ? GREEN : payPct > 70 ? GOLD : RED, lineHeight: 1.1 }}>
            {payPct}%
          </div>
        </div>
        <div style={{ flex: "1 1 130px", background: "#0e1118", border: "1px solid #20242e", borderRadius: 10, padding: "10px 14px" }}>
          <div style={{ fontSize: 10, color: "#78818f", letterSpacing: 1.5 }}>SERVED / OFFERED</div>
          <div style={{ fontSize: 30, fontWeight: 700, color: "#c7ccd6", lineHeight: 1.1 }}>
            {totalServed}<span style={{ fontSize: 15, color: "#5a6270" }}>/{offered}</span>
          </div>
        </div>
      </div>

      {/* caption */}
      <div style={{ marginTop: 12, fontSize: 12.5, color: caption.c, minHeight: 34, lineHeight: 1.5 }}>{caption.t}</div>

      {/* controls */}
      <div style={{ marginTop: 6, display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ flex: "1 1 240px", fontSize: 11, color: "#9aa2b0", letterSpacing: 0.5 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, color: "#78818f" }}>
            <span>TRAFFIC</span><span style={{ color: over ? RED : "#9aa2b0" }}>{offered} req/s</span>
          </div>
          <input type="range" min="10" max="100" value={traffic}
            onChange={(e) => setTraffic(+e.target.value)}
            style={{ width: "100%", accentColor: over ? RED : GOLD, cursor: "pointer" }} />
        </label>
        <button onClick={() => setSmart((s) => !s)}
          style={{ padding: "9px 16px", borderRadius: 8, cursor: "pointer", fontFamily: mono, fontSize: 12,
            border: `1px solid ${smart ? GOLD : "#333a46"}`,
            background: smart ? "rgba(245,184,65,0.12)" : "#12151d",
            color: smart ? GOLD : "#8a92a0", fontWeight: 600, letterSpacing: 0.5 }}>
          SHED SMART: {smart ? "ON" : "OFF"}
        </button>
      </div>
    </div>
  );
}
