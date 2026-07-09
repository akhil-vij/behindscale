import { useState, useEffect, useRef } from "react";

function mulberry32(seed) { let a = seed >>> 0; return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const ACCENT = "#DE8A5A";
const RED = "#ef4444"; const AMBER = "#eab308"; const GREEN = "#22c55e";
const STAGES = ["MONOLITH", "DOUBLE-WRITE", "BACKFILL", "VERIFY", "SWITCHOVER"];

export default function BeforeTheWraparound() {
  const [stage, setStage] = useState(0);
  const [risk, setRisk] = useState(34);          // TXID wraparound risk %
  const [frozen, setFrozen] = useState(false);   // switchover complete
  const [dw, setDw] = useState(null);            // chosen double-write strategy verdict key
  const [compare, setCompare] = useState(true);  // backfill version-compare
  const [twoAuthors, setTwoAuthors] = useState(true);
  const [backfilled, setBackfilled] = useState(false);
  const [backfillDirty, setBackfillDirty] = useState(false); // ran with compare off
  const [verifyState, setVerifyState] = useState(null);      // pass | fail | falsepass
  const [finale, setFinale] = useState(null);    // shipnow | optimized | corrupted | wraparound
  const [shards, setShards] = useState(480);
  const [hosts, setHosts] = useState(32);
  const [growMsg, setGrowMsg] = useState(null);
  const [t, setT] = useState(0);
  const rng = useRef(mulberry32(42));

  useEffect(() => {
    const id = setInterval(() => {
      setT((x) => x + 0.3);
      setRisk((r) => {
        if (frozen || finale === "wraparound") return r;
        const nr = Math.min(100, r + 0.35);
        return nr;
      });
    }, 300);
    return () => clearInterval(id);
  }, [frozen, finale]);

  useEffect(() => { if (risk >= 100 && !frozen && finale !== "wraparound") setFinale("wraparound"); }, [risk, frozen, finale]);

  const resetAll = () => { setStage(0); setRisk(34); setFrozen(false); setDw(null); setCompare(true); setTwoAuthors(true); setBackfilled(false); setBackfillDirty(false); setVerifyState(null); setFinale(null); setShards(480); setHosts(32); setGrowMsg(null); rng.current = mulberry32(42); };

  const runBackfill = () => { setBackfilled(true); setBackfillDirty(!compare); setVerifyState(null); setStage(3); };
  const runVerify = () => {
    if (!backfillDirty) setVerifyState("pass");
    else if (!twoAuthors) setVerifyState("falsepass"); // correlated blind spot
    else setVerifyState("fail");
    // pass or falsepass unlock switchover
  };
  const ship = (optimized) => {
    if (optimized) setRisk((r) => Math.min(100, r + 9)); // a week passes
    if (verifyState === "falsepass") { setFinale("corrupted"); return; }
    setFrozen(true); setFinale(optimized ? "optimized" : "shipnow"); 
  };
  const grow = () => {
    const seq = { 32: 40, 40: 48, 48: 48 };
    const next = seq[hosts] || 48;
    if (shards % next === 0) { setHosts(next); setGrowMsg(`even: ${shards / next} shards per host — the factors of ${shards} at work`); }
    else setGrowMsg(`UNEVEN: ${shards} does not divide by ${next}. With ${shards} shards your only even move is DOUBLING to ${hosts * 2} hosts. Pick values with a lot of factors.`);
  };

  const verdict = (() => {
    if (finale === "wraparound") return { c: RED, code: "TXID WRAPAROUND — POSTGRES STOPS ALL WRITES", t: "The safety mechanism fired: to avoid clobbering existing data, the database no longer accepts writes. For a product where every keystroke is a write, this is the existential outcome the whole migration raced against. Reset and move faster." };
    if (finale === "corrupted") return { c: RED, code: "SWITCHOVER SHIPS THE CORRUPTION", t: "The backfill clobbered newer records (no version compare) and verification passed anyway — the same engineer wrote the migration and the check, so the check shared its author's blind spot. This is exactly why Notion had different people implement migration and verification. Reset the backfill." };
    if (finale === "shipnow") return { c: GREEN, code: "SWITCHED OVER — 5 MINUTES OF DOWNTIME", t: `Wraparound risk frozen at ${Math.round(risk)}%. The window was gated on the catch-up script draining the double-write backlog — Notion's actual outcome, and users noticed the speedup unprompted. The post's hindsight: one more week optimizing catch-up to under 30 seconds might have made this a zero-downtime hot swap at the load balancer.` };
    if (finale === "optimized") return { c: GREEN, code: "ZERO DOWNTIME — AND A WEEK CLOSER TO THE EDGE", t: `Catch-up under 30 seconds allowed a hot swap: no maintenance window at all. Risk climbed to ${Math.round(risk)}% while you spent the week — the tradeoff in one number. Downtime windows are engineering variables with a price, not fixed ceremonies; the moment to cost them is before the banner goes up.` };
    if (stage === 0) return { c: risk > 70 ? RED : AMBER, code: "VACUUM IS STALLING — THE CLOCK IS THE CRUX", t: "Dead tuples aren't being reclaimed, and behind a stalled vacuum waits transaction-ID wraparound. Query performance and upkeep degrade well before a table hits its hardware-bound maximum — the ceiling is soft. Resize the instance if you like; the meter will tell you what it buys." };
    if (stage === 1) return { c: dw === "audit" ? GREEN : dw ? RED : AMBER, code: dw === "audit" ? "AUDIT LOG + CATCH-UP — PROCEED" : dw === "direct" ? "TOO FLAKY FOR THE CRITICAL PATH" : dw === "logical" ? "LOGICAL REPLICATION CANNOT KEEP UP" : "CHOOSE A DOUBLE-WRITE STRATEGY", t: dw === "audit" ? "Every write to a migrating table is journaled; a catch-up script replays the journal onto the shards, backfilling the missing workspace-ID partition key on the fly — the strained monolith couldn't afford a column backfill. A reverse audit log stands ready for the road back." : dw === "direct" ? "Either write failing breeds inconsistency between databases. Seemingly straightforward, and disqualified for exactly that reason." : dw === "logical" ? "The built-in choice — and it struggled to keep up with the block table's write volume during the initial snapshot step. Waiting this long ruled out the standard tool; this is what 'shard earlier' costs when ignored." : "Direct dual-write, logical replication, or an audit log. Two of these fail for sourced reasons." };
    if (stage === 2) return { c: AMBER, code: "BACKFILL — 96 CPUs, THREE DAYS", t: `Historical data flows to the shards on an m5.24xlarge. The rule that makes it safe: compare record versions before writing, so newer updates are never clobbered — catch-up and backfill can then run in any order and converge. Version compare is currently ${compare ? "ON" : "OFF — try it and see what verification thinks"}.` };
    if (stage === 3) return verifyState === "pass" ? { c: GREEN, code: "VERIFIED — SAMPLED RANGES + DARK READS", t: "Sampled UUID ranges match; dark reads compared both databases on live traffic (at an API-latency price) and logged no discrepancies. Migration and verification were written by different people — correlated errors, not missing checks, are what let bad migrations pass their own tests. Switchover unlocked." }
      : verifyState === "fail" ? { c: RED, code: "MISMATCHES FOUND — THE COMPARE RULE MATTERED", t: "The backfill overwrote newer records with stale history; independent verification caught it. Re-run the backfill with version compare on." }
      : verifyState === "falsepass" ? { c: AMBER, code: "VERIFICATION PASSES — SHOULD IT HAVE?", t: "Same engineer, same blind spot: the check inherits the migration's own bug. Everything looks green. The switchover will tell you the truth." }
      : { c: AMBER, code: "VERIFY BEFORE YOU TRUST", t: "Run sampled verification and dark reads. And note who wrote them." };
    return { c: AMBER, code: "THE SWITCHOVER GATE", t: "Downtime is gated on the catch-up script draining. Ship now at five minutes, or spend a week for under 30 seconds — while the risk meter keeps running." };
  })();

  const mono = "'JetBrains Mono','Fira Code','SF Mono',ui-monospace,monospace";
  const S = {
    root: { background: "#08090D", color: "#c8cdd8", fontFamily: mono, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid #2a2a3a", fontSize: 12, lineHeight: 1.5 },
    panel: { background: "#111118", border: "1px solid #2a2a3a", borderRadius: 8, padding: 12 },
    label: { color: "#6b7080", fontSize: 10, letterSpacing: 1.2 },
    btn: (on, dis) => ({ display: "block", width: "100%", textAlign: "left", padding: "7px 9px", marginTop: 6, borderRadius: 6, cursor: dis ? "not-allowed" : "pointer", opacity: dis ? 0.45 : 1, border: `1px solid ${on ? ACCENT : "#2a2a3a"}`, color: on ? "#ffd2b8" : "#8b90a0", background: on ? "rgba(222,138,90,0.10)" : "#0c0d13", fontFamily: mono, fontSize: 11 }),
    chip: (i) => ({ padding: "5px 9px", borderRadius: 6, fontSize: 10, border: `1px solid ${i === stage ? ACCENT : i < stage ? "#5a4432" : "#2a2a3a"}`, color: i === stage ? ACCENT : i < stage ? "#8b90a0" : "#4a4f5e" }),
  };

  return (
    <div style={S.root}>
      <div style={{ color: ACCENT, fontSize: 10, letterSpacing: 2 }}>NOTION · SHARDING POSTGRES — INTERACTIVE</div>
      <div style={{ color: "#edeff3", fontSize: 16, margin: "4px 0 2px", fontWeight: 700 }}>Before the wraparound</div>
      <p style={{ color: "#8b90a0", fontSize: 11, margin: 0 }}>Migrate the monolith while the TXID clock runs. Every fork in this machine is a decision Notion actually faced — including the ones that fail.</p>
      <ContextBlock />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginTop: 12 }}>
        {STAGES.map((st, i) => <span key={st} style={S.chip(i)}>{st}</span>)}
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: "#6b7080" }}>t = {t.toFixed(1)}s</span>
        <button style={{ ...S.btn(false, false), display: "inline", width: "auto", marginTop: 0 }} onClick={resetAll}>↺ RESET</button>
      </div>

      <div style={{ ...S.panel, marginTop: 10, borderColor: risk > 80 && !frozen ? RED : "#2a2a3a" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 4 }}>
          <span style={{ color: frozen ? GREEN : risk > 80 ? RED : "#8b90a0", letterSpacing: 1.2 }}>TXID WRAPAROUND RISK {frozen ? "— FROZEN (sharded fleet vacuums keep up)" : "— climbing while the monolith carries the writes"}</span>
          <span style={{ color: frozen ? GREEN : risk > 80 ? RED : AMBER, fontWeight: 700 }}>{Math.round(risk)}%</span>
        </div>
        <div style={{ height: 10, background: "#1a1b24", borderRadius: 5, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${risk}%`, background: frozen ? GREEN : risk > 80 ? RED : ACCENT, transition: "width 280ms linear" }} />
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
        <div style={{ ...S.panel, flex: "1 1 250px", minWidth: 250 }}>
          {stage === 0 && (<>
            <div style={S.label}>THE MONOLITH — 5 YEARS, 4 ORDERS OF MAGNITUDE</div>
            <button style={S.btn(false, false)} onClick={() => setRisk((r) => Math.min(100, r + 4))}>RESIZE INSTANCE (Cookie Clicker)<div style={{ color: "#6b7080", fontSize: 10 }}>bigger box, same stalling vacuum — the ceiling is soft</div></button>
            <button style={S.btn(true, false)} onClick={() => setStage(1)}>BEGIN THE MIGRATION</button>
          </>)}
          {stage === 1 && (<>
            <div style={S.label}>PICK THE DOUBLE-WRITE STRATEGY</div>
            <button style={S.btn(dw === "direct", false)} onClick={() => setDw("direct")}>WRITE DIRECTLY TO BOTH</button>
            <button style={S.btn(dw === "logical", false)} onClick={() => setDw("logical")}>POSTGRES LOGICAL REPLICATION</button>
            <button style={S.btn(dw === "audit", false)} onClick={() => setDw("audit")}>AUDIT LOG + CATCH-UP SCRIPT</button>
            <button style={S.btn(false, dw !== "audit")} disabled={dw !== "audit"} onClick={() => setStage(2)}>PROCEED → BACKFILL</button>
          </>)}
          {stage === 2 && (<>
            <div style={S.label}>BACKFILL CONTROLS</div>
            <button style={S.btn(compare, false)} onClick={() => setCompare(!compare)}>VERSION COMPARE: {compare ? "ON" : "OFF"}<div style={{ color: "#6b7080", fontSize: 10 }}>skip records with newer updates</div></button>
            <button style={S.btn(true, false)} onClick={runBackfill}>▶ RUN BACKFILL (96 CPUs, ~3 days)</button>
          </>)}
          {stage === 3 && (<>
            <div style={S.label}>VERIFICATION</div>
            <button style={S.btn(twoAuthors, false)} onClick={() => { setTwoAuthors(!twoAuthors); setVerifyState(null); }}>AUTHORS: {twoAuthors ? "DIFFERENT PEOPLE" : "SAME ENGINEER"}<div style={{ color: "#6b7080", fontSize: 10 }}>who wrote the check vs the migration</div></button>
            <button style={S.btn(true, false)} onClick={runVerify}>▶ SAMPLED RANGES + DARK READS</button>
            {verifyState === "fail" && <button style={S.btn(false, false)} onClick={() => { setStage(2); setVerifyState(null); }}>← RE-RUN BACKFILL</button>}
            <button style={S.btn(false, !(verifyState === "pass" || verifyState === "falsepass"))} disabled={!(verifyState === "pass" || verifyState === "falsepass")} onClick={() => setStage(4)}>PROCEED → SWITCHOVER</button>
          </>)}
          {stage === 4 && !finale && (<>
            <div style={S.label}>THE SWITCHOVER — CATCH-UP LAG DECIDES</div>
            <button style={S.btn(false, false)} onClick={() => ship(false)}>SHIP NOW — CATCH-UP TAKES 5 MINUTES</button>
            <button style={S.btn(false, false)} onClick={() => ship(true)}>SPEND A WEEK OPTIMIZING — UNDER 30s<div style={{ color: "#6b7080", fontSize: 10 }}>hot swap at the load balancer; the risk meter keeps running</div></button>
          </>)}
          <div style={{ ...S.label, marginTop: 16 }}>CAPACITY PANEL — WHY 480?</div>
          <button style={S.btn(shards === 480, false)} onClick={() => { setShards(480); setHosts(32); setGrowMsg(null); }}>480 LOGICAL SHARDS</button>
          <button style={S.btn(shards === 512, false)} onClick={() => { setShards(512); setHosts(32); setGrowMsg(null); }}>512 (a power of 2)</button>
          <button style={S.btn(false, false)} onClick={grow}>GROW FLEET: {hosts} → {hosts === 32 ? 40 : 48} HOSTS</button>
          {growMsg && <div style={{ fontSize: 10, marginTop: 6, color: growMsg.startsWith("UNEVEN") ? RED : GREEN, lineHeight: 1.5 }}>{growMsg}</div>}
        </div>

        <div style={{ flex: "2 1 400px", minWidth: 300 }}>
          <div style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${verdict.c}`, background: `${verdict.c}14` }}>
            <div style={{ color: verdict.c, fontWeight: 700 }}>{verdict.code}</div>
            <div style={{ marginTop: 6, fontSize: 11.5, lineHeight: 1.65 }}>{verdict.t}</div>
          </div>
          <div style={{ ...S.panel, marginTop: 12, fontSize: 10.5, color: "#8b90a0", lineHeight: 1.8 }}>
            <div style={S.label}>THE SCHEME (sourced)</div>
            {shards} logical shards (Postgres schemas) · {hosts} physical databases · {Math.round(shards / hosts)} shards per host · partition key: workspace_id · everything transitively reachable from block sharded together, so rows that commit together live together · routing: application code → database → schema, one source of truth
          </div>
        </div>
      </div>

      <div style={{ color: "#6b7080", fontSize: 10, marginTop: 12, borderTop: "1px solid #2a2a3a", paddingTop: 8, lineHeight: 1.7 }}>
        The risk meter and its pacing are illustrative pressure — the threat is sourced: a consistently stalling VACUUM with transaction-ID wraparound behind it, the mechanism where Postgres stops processing writes. Everything else is the post's: the soft ceiling ("Cookie Clicker with the Resize Instance button"); three double-write options with two sourced disqualifications (direct writes too flaky; logical replication unable to keep up with block volume, the price of sharding late); the audit log with on-the-fly partition-key backfill and a tested reverse log; version-compared backfill on 96 CPUs for ~3 days; sampled verification, dark reads, and migration-vs-verification by different people; the five-minute switchover with the team's own hindsight that a week of catch-up optimization could have made it zero; and 480 shards across 32 databases, chosen for 480's many factors.
        {" "}<a href="https://behindscale.com/articles/notion-sharding-postgres" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: "none" }}>From the full dissection at behindscale.com →</a>
      </div>
    </div>
  );
}

function ContextBlock() {
  const [open, setOpen] = useState(true);
  const lbl = { fontSize: 10, color: ACCENT, letterSpacing: 1.2 };
  if (!open) return <button onClick={() => setOpen(true)} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontFamily: "inherit", fontSize: 10, padding: 0, margin: "10px 0 0", display: "block" }}>SHOW CONTEXT ▾</button>;
  return (
    <div style={{ background: "#111118", border: "1px solid #2a2a3a", borderRadius: 8, padding: "12px 14px", marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <div style={{ fontSize: 10, color: "#6b7080", letterSpacing: 1.2 }}>CONTEXT — IF YOU ARRIVED HERE WITHOUT THE ARTICLE</div>
        <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontFamily: "inherit", fontSize: 10, padding: 0 }}>HIDE ✕</button>
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 8 }}><span style={lbl}>THE PROBLEM · </span>Notion's Postgres monolith carried five years and four orders of magnitude of growth before the block table's write volume began defeating the instance beneath it: VACUUM stalled, and behind it waited transaction-ID wraparound — Postgres refusing all writes. The ceiling was soft; bigger instances could not buy the way out.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>THE MOVE · </span>Application-level sharding, chosen over Citus and Vitess for control: 480 logical shards (picked for its many factors) across 32 databases, partitioned by workspace ID with everything transitively related to block colocated — migrated by double-write, backfill, verification, and a five-minute switchover.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>TRY · </span>Race the wraparound meter through the four migration phases. Pick the double-write strategy (two fail for sourced reasons), turn off version compare and see what verification catches — then let the same engineer write both, and see what it doesn't. Then try growing a 512-shard fleet.</div>
    </div>
  );
}
