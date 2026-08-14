import { useState, useEffect, useRef } from "react";

const ACCENT = "#A259FF";
const RED = "#EF4444"; const AMBER = "#F59E0B"; const GREEN = "#22C55E"; const OFF = "#4a4f60";
const mono = "'JetBrains Mono','Fira Code',ui-monospace,monospace";

const STAGES = [
  { key: "big",     label: "One big table",  undo: 0 },
  { key: "fake",    label: "Faked with views", undo: 1 },
  { key: "moving",  label: "Moving the data", undo: 2 },
  { key: "split",   label: "Truly split",    undo: 3 },
];
const CAPTIONS = [
  "One table on one server. This is the table that outgrew its server, and vertical partitioning can't help: the smallest thing it can move is a whole table.",
  "Views (saved queries) make the app treat this one table as if it were already split, while every row still sits on one server. Ramp the flag to send more traffic through them.",
  "Now the data actually moves: the whole dataset is copied to each new server, then traffic is switched over.",
  "Four real servers, each owning a slice of the rows. From here, a query sent to the wrong server is the one mistake the team can't tolerate.",
];
// how reversible each stage is (the heart of the story)
const UNDO = [
  { c: "#8b90a0", txt: "Nothing done yet" },
  { c: GREEN,     txt: "Easy to undo: flip the flag off, seconds" },
  { c: AMBER,     txt: "Harder: a careful data operation, not a flag" },
  { c: RED,       txt: "Hard to undo: the data really moved" },
];

const BREAKS = {
  big:   [{ id: "limit", label: "The table hits its limit" }],
  fake:  [{ id: "badroute-l", label: "A routing bug appears" }, { id: "unsupported", label: "An unsupported query runs" }],
  moving:[{ id: "partial", label: "The move half-fails" }],
  split: [{ id: "badroute-p", label: "A routing bug appears now" }, { id: "xshard", label: "A write spans two shards" }],
};

function verdict(stageKey, brk, flagPct, phase) {
  if (!brk) {
    const u = UNDO[STAGES.findIndex(s => s.key === stageKey)];
    if (stageKey === "big")   return { c: "#8b90a0", title: "Nothing built yet", who: null, undo: null, note: "This table is close to what one server can do. The only real fix is to split it across servers, and that is what the next steps do." };
    if (stageKey === "fake")  return { c: GREEN, title: "The safe rehearsal", who: `${flagPct}% of this table's traffic is running the sharded way`, undo: "Flip the flag off and traffic goes back to the one table in seconds", note: "The app behaves as if the table were split, but every row still sits on one server. You are taking the risk where it is cheap to take back." };
    if (stageKey === "moving")return { c: AMBER, title: "The real move", who: phase === "failover" ? "About 10 seconds where some writes fail on the main servers" : "None yet: the copy runs alongside live traffic", undo: "Still possible, but now a careful data operation, not a flag", note: "The behaviour was already proven in the rehearsal. Only the data is moving now. That ordering is the whole point." };
    return { c: ACCENT, title: "Done: truly split", who: null, undo: "Still possible by design, but it is now a data operation", note: "Each server holds a full copy but only answers for its own slice of rows. The map of which rows live where updates in under a second." };
  }
  switch (brk) {
    case "limit": return { c: RED, title: "The whole product feels it", who: "Every feature that uses this table slows down together", undo: "Nothing to undo: there is no flag and no bigger server to buy. The only way out is to split the table.", note: "This is the reason for the whole project: one table has outgrown one server, and vertical partitioning can't cut a table any finer." };
    case "badroute-l": return { c: AMBER, title: `Only ${flagPct}% of traffic sees it`, who: `Just the ${flagPct}% running the new way; the other ${100 - flagPct}% never left the one table`, undo: "Flip the flag to 0%: seconds. No data has moved, so nothing is wrong at rest.", note: "This is exactly why you rehearse: bugs show up on real traffic while undoing is still just a switch." };
    case "unsupported": return { c: AMBER, title: "Caught before it runs", who: "This one query is rejected by the router; it never reaches the database", undo: "Nothing to undo: rewrite the query, or adjust the table's plan", note: "The router supports the most common 90% of queries on purpose. The test harness found these odd queries before any data moved." };
    case "partial": return { c: AMBER, title: "The move succeeds on only some servers", who: "Bounded to this table's switchover; the process was built to expect exactly this", undo: "Stop and point back at the untouched original: a rehearsed data operation, not a flag", note: "Going from one server to many creates failure modes one-to-one never had. Watch server 2 stall, retry, and rejoin without restarting the copy." };
    case "badroute-p": return { c: RED, title: "The mistake that can't be tolerated", who: "A query lands on a server that doesn't own those rows and quietly returns a wrong answer (missing data)", undo: "This isn't about undo, it's about prevention: an always-current map, updated in under a second, and one enforced rule: every shard lives on exactly one server", note: "Before the split, a wrong route was just slow. After it, a wrong route is wrong data. That flip is what the whole rehearsal existed to make safe." };
    default: return { c: AMBER, title: "All-or-nothing is gone", who: "A write touching two shards can half-succeed: one server saves it, the other doesn't", undo: "No undo: the fix is structural, colos keep related tables together so normal writes never span two shards", note: "All-or-nothing writes across shards are on the team's to-build list. Until then, careful product code carries the guarantee the database used to." };
  }
}

export default function OneWayDoors() {
  const [stage, setStage] = useState(0);
  const [flagPct, setFlagPct] = useState(0);
  const [copyProg, setCopyProg] = useState(0);
  const [phase, setPhase] = useState("idle");   // idle|copying|failover
  const [brk, setBrk] = useState(null);
  const [failUntil, setFailUntil] = useState(0);
  const [route, setRoute] = useState(null);
  const [ctx, setCtx] = useState(true);
  const [, force] = useState(0);
  const rng = useRef(() => (Math.sin((rng.n = (rng.n || 1) + 1) * 99.13) + 1) / 2);
  const progRef = useRef(0); const stallRef = useRef(0); const timer = useRef(null);
  useEffect(() => { stallRef.current = failUntil; }, [failUntil]);

  useEffect(() => {
    if (phase === "copying") {
      let last = Date.now();
      timer.current = setInterval(() => {
        const now = Date.now(); const dt = now - last; last = now;
        const stalled = now < stallRef.current;
        progRef.current = Math.min(100, progRef.current + (dt / 4000) * 100 * (stalled ? 0.25 : 1));
        setCopyProg(progRef.current);
        if (progRef.current >= 100) setPhase("failover");
        force(x => x + 1);
      }, 80);
      return () => clearInterval(timer.current);
    }
    if (phase === "failover") {
      const id = setTimeout(() => { setPhase("idle"); setStage(3); setBrk(null); }, 1000);
      return () => clearTimeout(id);
    }
  }, [phase]);
  useEffect(() => { if (!route) return; const id = setTimeout(() => setRoute(null), 1500); return () => clearTimeout(id); }, [route]);

  const stageKey = STAGES[stage].key;
  const v = verdict(stageKey, brk, flagPct, phase);

  const doBreak = (id) => { setBrk(id); if (id === "partial" && phase === "copying") setFailUntil(Date.now() + 1400); };
  const advance = () => {
    setBrk(null); setRoute(null);
    if (stage === 0) { setStage(1); setFlagPct(0); }
    else if (stage === 1 && flagPct >= 100) { setStage(2); setCopyProg(0); progRef.current = 0; setPhase("idle"); }
  };
  const ramp = () => { const n = [1, 10, 50, 100].find(s => s > flagPct); if (n) setFlagPct(n); };
  const runMove = () => { if (phase === "idle" && copyProg < 100) { if (brk === "partial") setFailUntil(Date.now() + 2200); setPhase("copying"); } };
  const reset = () => { setStage(0); setFlagPct(0); setCopyProg(0); progRef.current = 0; setFailUntil(0); setPhase("idle"); setBrk(null); setRoute(null); if (timer.current) clearInterval(timer.current); };

  const routerOn = stage === 1 || stage === 3;
  const send = (kind) => { if (!routerOn) return; const hits = Array(4).fill(false); if (kind === "all") hits.fill(true); else hits[Math.floor(rng.current() * 4)] = true; setRoute({ kind, hits }); };

  const S = {
    root: { background: "#08090D", color: "#C8CDD8", fontFamily: mono, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid #2a2a3a", fontSize: 12, lineHeight: 1.5 },
    panel: { background: "#111118", border: "1px solid #2a2a3a", borderRadius: 8, padding: 12 },
    label: { color: "#6b7080", fontSize: 10, letterSpacing: 1.2 },
    btn: (on, dis) => ({ display: "block", width: "100%", textAlign: "left", padding: "8px 10px", marginTop: 6, borderRadius: 6, cursor: dis ? "not-allowed" : "pointer", opacity: dis ? 0.4 : 1, border: `1px solid ${on ? ACCENT : OFF}`, color: on ? "#DCC6FF" : "#c3c8d2", background: on ? "rgba(162,89,255,0.10)" : "#0c0d13", fontFamily: mono, fontSize: 11 }),
    chip: (i) => ({ padding: "6px 9px", borderRadius: 6, fontSize: 11, border: `1px solid ${i === stage ? ACCENT : i < stage ? "#3d2b5e" : "#2a2a3a"}`, color: i === stage ? ACCENT : i < stage ? "#8b90a0" : "#4a4f5e", background: i === stage ? "rgba(162,89,255,0.08)" : "#111118" }),
    bar: { height: 8, borderRadius: 4, background: "#1a1b24", marginTop: 6, overflow: "hidden", position: "relative" },
  };

  // the intuitive centerpiece: can you still go back?
  const undoMeter = () => (
    <div style={{ ...S.panel, marginTop: 10, borderColor: UNDO[stage].c }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={S.label}>CAN YOU STILL GO BACK?</div>
        <div style={{ fontSize: 11, color: UNDO[stage].c, fontWeight: 700 }}>{UNDO[stage].txt}</div>
      </div>
      <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
        {["one big table", "faked (views)", "moving data", "truly split"].map((lbl, i) => (
          <div key={i} style={{ flex: 1, textAlign: "center" }}>
            <div style={{ height: 8, borderRadius: 3, background: i <= stage ? UNDO[i].c : "#1a1b24" }} />
            <div style={{ fontSize: 8.5, color: i === stage ? UNDO[i].c : "#4a4f5e", marginTop: 3 }}>{lbl}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 9.5, color: "#6b7080", marginTop: 6 }}>Each step to the right is harder to reverse. Figma spent its effort making the easy-to-undo step do the proving.</div>
    </div>
  );

  const shards = () => {
    const stalled = Date.now() < failUntil;
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
        {Array.from({ length: 4 }, (_, i) => {
          const lit = route ? route.hits[i] : false;
          const isStall = stalled && i === 1 && stage === 2;
          const fill = stage === 2 ? copyProg * (isStall ? 0.9 : 1) : 100;
          return (
            <div key={i} style={{ flex: "1 1 90px", minWidth: 90, borderRadius: 8, padding: 10, border: `1px solid ${isStall ? RED : lit ? ACCENT : "#2a2a3a"}`, background: lit ? "rgba(162,89,255,0.10)" : "#0c0d13" }}>
              <div style={{ color: lit ? ACCENT : "#8b90a0", fontSize: 10 }}>server {i + 1}{isStall ? " · retrying" : ""}</div>
              <div style={S.bar}><div style={{ position: "absolute", inset: 0, width: `${Math.min(fill, 100)}%`, background: "#3d2b5e" }} />{stage === 3 && <div style={{ position: "absolute", top: 0, bottom: 0, left: `${i * 25}%`, width: "25%", background: ACCENT }} />}</div>
              <div style={{ color: "#4a4f5e", fontSize: 9, marginTop: 4 }}>{stage === 2 ? `copying ${Math.floor(fill)}%` : `owns rows ${i + 1} of 4`}</div>
            </div>
          );
        })}
      </div>
    );
  };
  const oneTable = () => (
    <div style={{ borderRadius: 8, padding: 10, border: `1px solid ${route && stage === 1 && route.hits.some(Boolean) ? ACCENT : "#2a2a3a"}`, background: "#0c0d13", maxWidth: stage >= 2 ? 220 : undefined }}>
      <div style={{ color: "#8b90a0", fontSize: 10 }}>one server{stage === 2 ? " · original, untouched until switchover" : ""}</div>
      <div style={S.bar}><div style={{ position: "absolute", inset: 0, width: "100%", background: stage >= 2 ? "#2a2a3a" : "#3d2b5e" }} /></div>
      {stage === 1 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {Array.from({ length: 4 }, (_, i) => { const lit = route ? route.hits[i] : false; return (
            <div key={i} style={{ flex: "1 1 80px", border: `1px dashed ${lit ? ACCENT : "#3d2b5e"}`, borderRadius: 6, padding: "5px 7px", color: lit ? ACCENT : "#6b7080", fontSize: 9 }}>view: shard {i + 1}</div>); })}
          <div style={{ flexBasis: "100%", color: "#4a4f5e", fontSize: 9 }}>four views over the same table: it looks split, the data hasn't moved</div>
        </div>
      )}
    </div>
  );

  return (
    <div style={S.root}>
      <div style={{ color: ACCENT, fontSize: 10, letterSpacing: 2 }}>FIGMA · SHARDING ONE TABLE, STEP BY STEP</div>
      <div style={{ color: "#EDEFF3", fontSize: 16, margin: "4px 0 2px", fontWeight: 700 }}>Can you still go back?</div>
      <p style={{ color: "#8b90a0", fontSize: 11, margin: 0 }}>Walk one table from a single server to truly split. At each step, break something and see who it hits and whether you can undo it.</p>

      {ctx ? (
        <div style={{ ...S.panel, marginTop: 12, borderColor: "#3d2b5e" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={S.label}>CONTEXT - IF YOU ARRIVED HERE WITHOUT THE ARTICLE</div>
            <button style={{ background: "none", border: "none", color: "#6b7080", cursor: "pointer", fontFamily: mono, fontSize: 10, padding: 0 }} onClick={() => setCtx(false)}>HIDE</button>
          </div>
          <div style={{ marginTop: 8, fontSize: 12, lineHeight: 1.6 }}><span style={{ color: ACCENT, fontSize: 10, letterSpacing: 1.2 }}>THE PROBLEM · </span>One table grew too big for a single server, and vertical partitioning can't help: the smallest thing it can move is a whole table.</div>
          <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.6 }}><span style={{ color: ACCENT, fontSize: 10, letterSpacing: 1.2 }}>THE MOVE · </span>Split the table across servers from inside the app, and, the clever part, make it act split with views (saved queries) first, prove that works, then move the data for real.</div>
          <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.6 }}><span style={{ color: ACCENT, fontSize: 10, letterSpacing: 1.2 }}>TRY · </span>Walk the four steps. At each one, break something and see who it hits and whether you can still undo it.</div>
        </div>
      ) : (<button style={{ background: "none", border: "none", color: "#6b7080", cursor: "pointer", fontFamily: mono, fontSize: 10, padding: 0, marginTop: 10, display: "block" }} onClick={() => setCtx(true)}>SHOW CONTEXT</button>)}

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, margin: "14px 0 4px" }}>
        {STAGES.map((st, i) => (
          <span key={st.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={S.chip(i)}>{i + 1}. {st.label}</span>
            {i < 3 && <span style={{ color: "#4a4f5e" }}>{"\u2192"}</span>}
          </span>
        ))}
        <button style={{ ...S.btn(false, false), display: "inline", width: "auto", marginTop: 0, marginLeft: "auto" }} onClick={reset}>RESET</button>
      </div>
      <p style={{ color: "#8b90a0", fontSize: 11, minHeight: 30, margin: "2px 0 8px" }}>{CAPTIONS[stage]}</p>

      {undoMeter()}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
        <div style={{ ...S.panel, flex: "1 1 230px", minWidth: 230 }}>
          <div style={S.label}>NEXT STEP</div>
          {stage === 0 && <button style={S.btn(true, false)} onClick={advance}>Build the views {"\u2192"}<div style={{ color: "#6b7080", fontSize: 10 }}>load-tested first: under 10% slower in the worst case</div></button>}
          {stage === 1 && (<>
            <button style={S.btn(flagPct < 100, flagPct >= 100)} onClick={ramp}>Send more traffic through the views: {flagPct}% {"\u2192"} {[1, 10, 50, 100].find(s => s > flagPct) ?? 100}%<div style={{ color: "#6b7080", fontSize: 10 }}>the team compares results with and without views as it ramps</div></button>
            <button style={S.btn(flagPct >= 100, flagPct < 100)} onClick={advance} disabled={flagPct < 100}>Move the data for real<div style={{ color: "#6b7080", fontSize: 10 }}>{flagPct < 100 ? "get to 100% first: prove it works before moving anything" : "the sharded setup has already been running in production"}</div></button>
          </>)}
          {stage === 2 && <button style={S.btn(phase === "idle" && copyProg < 100, phase !== "idle")} onClick={runMove}>{phase === "failover" ? "Switching over…" : phase === "copying" ? `Copying… ${Math.floor(copyProg)}%` : "Copy the data + switch over"}<div style={{ color: "#6b7080", fontSize: 10 }}>the whole table is copied to each server, then each is limited to its slice</div></button>}
          {stage === 3 && <div style={{ color: "#6b7080", fontSize: 10, marginTop: 6 }}>Done. First table: about 9 months of work, live September 2023, ~10 seconds where some writes failed.</div>}

          <div style={{ ...S.label, marginTop: 14 }}>BREAK SOMETHING</div>
          {BREAKS[stageKey].map(x => <button key={x.id} style={S.btn(brk === x.id, false)} onClick={() => doBreak(x.id)}>{x.label}</button>)}

          <div style={{ ...S.label, marginTop: 14 }}>SEND A QUERY {routerOn ? "" : "(only works once views exist)"}</div>
          <button style={S.btn(false, !routerOn)} onClick={() => send("one")} disabled={!routerOn}>Query with an ID<div style={{ color: "#6b7080", fontSize: 10 }}>has a shard key {"\u2192"} goes to one server</div></button>
          <button style={S.btn(false, !routerOn)} onClick={() => send("all")} disabled={!routerOn}>Query with no ID<div style={{ color: "#6b7080", fontSize: 10 }}>no shard key {"\u2192"} must ask every server</div></button>
        </div>

        <div style={{ flex: "2 1 380px", minWidth: 300 }}>
          <div style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${v.c}`, background: `${v.c}14`, marginBottom: 12 }}>
            <div style={{ color: v.c, fontWeight: 700 }}>{v.title}</div>
            {v.who && <div style={{ marginTop: 5 }}><span style={S.label}>WHO'S AFFECTED · </span>{v.who}</div>}
            {v.undo && <div style={{ marginTop: 4 }}><span style={S.label}>CAN YOU UNDO IT · </span>{v.undo}</div>}
            <div style={{ color: "#8b90a0", marginTop: 6, fontSize: 11 }}>{v.note}</div>
          </div>
          <div style={S.panel}>
            <div style={S.label}>THE TABLE</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {stage <= 2 && oneTable()}
              {stage >= 2 && <div style={{ flexBasis: "100%" }}>{shards()}</div>}
            </div>
            {stage === 1 && (<div style={{ ...S.panel, marginTop: 8 }}><div style={S.label}>FLAG: {flagPct}% OF TRAFFIC THROUGH VIEWS</div><div style={S.bar}><div style={{ position: "absolute", inset: 0, width: `${flagPct}%`, background: ACCENT }} /></div></div>)}
            {route && (<div style={{ marginTop: 8, color: route.kind === "all" ? AMBER : "#8b90a0", fontSize: 10 }}>{route.kind === "all" ? (stage === 3 ? "Asked all 4 servers (scatter-gather): as slow as if nothing were sharded" : "Asked all 4 views, but they all live on one server: the pattern is rehearsed, the cost isn't real yet") : "Routed to one server by the ID's hash"}</div>)}
          </div>
        </div>
      </div>

      <div style={{ color: "#6b7080", fontSize: 10, marginTop: 12, borderTop: "1px solid #2a2a3a", paddingTop: 8, lineHeight: 1.7 }}>
        Server count, ramp percentages, and timing are illustrative. The real mechanisms: views make one table look split (under 10% slower, checked on live traffic), an on/off flag rolls out with seconds-scale undo, the whole table is copied to each server (not filtered) then limited to its slice, a query with no shard key must ask every server and costs as much as if nothing were sharded, the row-to-server map updates in under a second, and the first real switchover took about 10 seconds where some writes failed. Undo stays possible after the real move, by design, at rising cost.
        {" "}<a href="https://behindscale.com/articles/figma-postgres-sharding" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: "none" }}>From the full dissection at behindscale.com {"\u2192"}</a>
      </div>
    </div>
  );
}
