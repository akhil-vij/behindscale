import { useState } from "react";

const ACCENT = "#FF5A5F";
const RED = "#ef4444"; const AMBER = "#eab308"; const GREEN = "#22c55e";
const STAGES = ["PREFLIGHT", "REPLICATE", "QUIESCE", "VERIFY", "PROMOTE", "AFTER"];

export default function ZeroMigrationCode() {
  const [stage, setStage] = useState(0);
  const [joins, setJoins] = useState(false);      // joins eliminated + grants revoked
  const [verified, setVerified] = useState(false); // replication drained check
  const [downtime, setDowntime] = useState(0);     // minutes, accumulated at promote
  const [outcome, setOutcome] = useState(null);    // ok | broken | lostwrites | aborted
  const [snapshotHit, setSnapshotHit] = useState(false);

  const reset = () => { setStage(0); setJoins(false); setVerified(false); setDowntime(0); setOutcome(null); setSnapshotHit(false); };
  const promote = () => {
    // downtime: writes fail from quiesce through promotion ≈ 7.5 min total when verified path taken
    if (!verified) { setDowntime(7.5); setOutcome("lostwrites"); setStage(5); return; }
    if (!joins) { setDowntime(7.5); setOutcome("broken"); setStage(5); return; }
    setDowntime(7.5); setOutcome("ok"); setStage(5);
  };
  const abort = () => { setOutcome("aborted"); setStage(5); };

  const verdict = (() => {
    if (stage === 0) return snapshotHit
      ? { c: RED, code: "SNAPSHOT UNDER LOAD — THE SURPRISE THAT RESET THE DEADLINE", t: "A routine RDS snapshot, even Multi-AZ, spiked latency nonlinearly under heavy load — enough to backlog queries and threaten full downtime. The team knew snapshots cost latency; they didn't know rising load turned a daily backup into an outage risk. 'The project had been more urgent than we initially anticipated.' Now do the preflight." }
      : { c: AMBER, code: "THE MONOLITH — ⅓ OF WRITES ARE THE INBOX, GROWING LINEARLY", t: "Much of Airbnb's core data still lives in the original Rails monolith's database. Projected query growth would certainly overwhelm it. Phase one is the unglamorous majority: find and eliminate every cross-table join touching inbox tables — the promotion cannot be reverted, so 'we think we found them all' isn't enough. Revoking grants converts discovery into enforcement." };
    if (stage === 1) return { c: AMBER, code: "REPLICA CHAIN BUILT — message-master + its OWN replica", t: "A new replica of main (message-master) will become the independent master; a second-tier replica (message-replica) is attached now so the new master has its own replica from birth. Reads and data pipelines move to the replica ahead of time. MySQL replication is now carrying the entire consistency burden — no dual writes, no backfill, no bookkeeping." };
    if (stage === 2) return { c: RED, code: "WRITES SWAPPED TO THE UNPROMOTED MASTER — CLOCK RUNNING", t: "Zookeeper host entries flip inbox writes to message-master. It isn't promoted yet, so every write fails by design — reads technically work, but marking a message read is a write, so messaging is effectively down. Connections on main are killed directly (no redeploy) to quiesce fast: replication can only catch up once the writes stop." };
    if (stage === 3) return { c: verified ? GREEN : AMBER, code: verified ? "REPLICATION DRAINED — VERIFIED THREE WAYS" : "VERIFY BEFORE YOU PROMOTE", t: verified ? "Newest inbox rows match on both sides; the old message-user connections on main are gone; new connections are arriving at message-master. The promotion is irreversible — this check is what makes it safe. Promote." : "Three checks, per the post: newest table entries match across master and replica, old connections gone, new connections arriving. Skip this and promote with replication still lagging, and the lag is data you leave behind." };
    if (stage === 4) return { c: AMBER, code: "PROMOTING — READS DOWN ~30s, WRITES DOWN ~4 MINUTES", t: "RDS promotion takes minutes: about 3.5 waiting for it to kick in. The abort path is live until it completes — reverting Zookeeper restores messaging almost immediately, but any writes already accepted by the now-independent database are lost. That asymmetry is why every step was rehearsed in advance." };
    // stage 5 outcomes
    if (outcome === "ok") return { c: GREEN, code: "PROMOTED — 7.5 MINUTES OF DOWNTIME, ZERO MIGRATION CODE", t: "Multi-AZ enabled before the next backup window; once metrics settle, each database drops the other's tables so nothing consumes stale data. Main master writes fall 33%, the database shrinks 20% — queries months from overwhelming it are gone. Two weeks end to end, and the hard part was done by replication the team already trusted." };
    if (outcome === "broken") return { c: RED, code: "PROMOTED — AND THE JOINS YOU SKIPPED ARE NOW CROSS-DATABASE", t: "The promotion cannot be reverted, and every cross-table join you didn't eliminate is now a query spanning two independent databases — invalid. This is why join elimination with grant revocation was the most time-consuming phase: enforcement before an irreversible operation, not hope. Reset and do the preflight." };
    if (outcome === "lostwrites") return { c: RED, code: "PROMOTED WITH REPLICATION LAGGING — THE LAG IS LOST DATA", t: "You quiesced writes but promoted before verifying the drain. Whatever hadn't replicated when the promotion kicked in exists on neither side's future: the databases have diverged. The post's three-way verification exists precisely because promotion forecloses the way back." };
    return { c: AMBER, code: "ABORTED — SERVICE RESTORED, DIVERGED WRITES FORFEIT", t: "Reverting the Zookeeper entries brings messaging back almost immediately. But any writes the new master accepted are stranded on a database you're abandoning — recoverable in theory, nontrivial and user-confusing in practice. The abort path exists and leaks; that's why the op was rehearsed rather than trusted to rollback." };
  })();

  const mono = "'JetBrains Mono','Fira Code',ui-monospace,monospace";
  const S = {
    root: { background: "#08090D", color: "#c8cdd8", fontFamily: mono, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid #2a2a3a", fontSize: 12, lineHeight: 1.5 },
    panel: { background: "#111118", border: "1px solid #2a2a3a", borderRadius: 8, padding: 12 },
    label: { color: "#6b7080", fontSize: 10, letterSpacing: 1.2 },
    btn: (on, dis) => ({ display: "block", width: "100%", textAlign: "left", padding: "7px 9px", marginTop: 6, borderRadius: 6, cursor: dis ? "not-allowed" : "pointer", opacity: dis ? 0.4 : 1, border: `1px solid ${on ? ACCENT : "#2a2a3a"}`, color: on ? "#ffc4c6" : "#8b90a0", background: on ? "rgba(255,90,95,0.10)" : "#0c0d13", fontFamily: mono, fontSize: 11 }),
    chip: (i) => ({ padding: "5px 8px", borderRadius: 6, fontSize: 10, border: `1px solid ${i === stage ? ACCENT : i < stage ? "#5a3436" : "#2a2a3a"}`, color: i === stage ? ACCENT : i < stage ? "#8b90a0" : "#4a4f5e" }),
  };

  return (
    <div style={S.root}>
      <div style={{ color: ACCENT, fontSize: 10, letterSpacing: 2 }}>AIRBNB · MAIN DATABASE SPLIT — INTERACTIVE</div>
      <div style={{ color: "#edeff3", fontSize: 16, margin: "4px 0 2px", fontWeight: 700 }}>Zero migration code</div>
      <p style={{ color: "#8b90a0", fontSize: 11, margin: 0 }}>Run Airbnb's replica-promotion split. The machinery is borrowed; the risk all lives in what you do before pressing PROMOTE.</p>
      <ContextBlock />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginTop: 12 }}>
        {STAGES.map((st, i) => <span key={st} style={S.chip(i)}>{st}</span>)}
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: downtime > 0 ? RED : "#6b7080" }}>DOWNTIME: {downtime.toFixed(1)} min</span>
        <button style={{ ...S.btn(false, false), display: "inline", width: "auto", marginTop: 0 }} onClick={reset}>↺ RESET</button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
        <div style={{ ...S.panel, flex: "1 1 250px", minWidth: 250 }}>
          {stage === 0 && (<>
            <div style={S.label}>PREFLIGHT — PHASE ONE IS THE PROJECT</div>
            <button style={S.btn(false, false)} onClick={() => setSnapshotHit(true)}>📸 RDS SNAPSHOT UNDER LOAD<div style={{ color: "#6b7080", fontSize: 10 }}>the mid-project surprise</div></button>
            <button style={S.btn(joins, false)} onClick={() => setJoins(!joins)}>ELIMINATE CROSS-TABLE JOINS + REVOKE GRANTS: {joins ? "DONE" : "SKIPPED"}</button>
            <button style={S.btn(true, false)} onClick={() => setStage(1)}>PROCEED → BUILD REPLICAS</button>
          </>)}
          {stage === 1 && <button style={S.btn(true, false)} onClick={() => setStage(2)}>BEGIN THE OP → SWAP WRITES (starts downtime)</button>}
          {stage === 2 && (<>
            <button style={S.btn(true, false)} onClick={() => setStage(3)}>KILL CONNECTIONS ON MAIN → VERIFY</button>
          </>)}
          {stage === 3 && (<>
            <button style={S.btn(verified, false)} onClick={() => setVerified(!verified)}>3-WAY REPLICATION CHECK: {verified ? "VERIFIED" : "SKIPPED"}<div style={{ color: "#6b7080", fontSize: 10 }}>rows match · old conns gone · new conns arriving</div></button>
            <button style={S.btn(true, false)} onClick={() => setStage(4)}>INITIATE PROMOTION</button>
          </>)}
          {stage === 4 && (<>
            <button style={S.btn(true, false)} onClick={promote}>⏱ COMPLETE THE PROMOTION (~4 min writes down)</button>
            <button style={S.btn(false, false)} onClick={abort}>⎋ ABORT — REVERT ZOOKEEPER</button>
          </>)}
          {stage === 5 && <div style={{ fontSize: 11, color: "#8b90a0", marginTop: 6 }}>Op complete. Reset to run a different path — try skipping the preflight or the verification.</div>}
          <div style={{ ...S.label, marginTop: 14 }}>MAIN DATABASE</div>
          <div style={{ fontSize: 11, color: "#8b90a0", lineHeight: 1.7 }}>
            writes from inbox: <span style={{ color: outcome === "ok" ? GREEN : AMBER }}>{outcome === "ok" ? "0% (moved out — master writes −33%)" : "≈33% and growing linearly"}</span><br/>
            size: <span style={{ color: outcome === "ok" ? GREEN : "#c8cdd8" }}>{outcome === "ok" ? "−20%" : "monolith-era"}</span>
          </div>
        </div>

        <div style={{ flex: "2 1 420px", minWidth: 300 }}>
          <div style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${verdict.c}`, background: `${verdict.c}14` }}>
            <div style={{ color: verdict.c, fontWeight: 700 }}>{verdict.code}</div>
            <div style={{ marginTop: 6, fontSize: 11.5, lineHeight: 1.65 }}>{verdict.t}</div>
          </div>
          <div style={{ ...S.panel, marginTop: 12, fontSize: 10.5, color: "#8b90a0", lineHeight: 1.8 }}>
            <div style={S.label}>THE TOPOLOGY (sourced)</div>
            main-master {stage >= 1 ? "→ message-master (replica, future independent master) → message-replica (its second-tier replica)" : "— all inbox tables still resident"} · writes {stage >= 2 && stage < 5 ? "swapped to unpromoted master (failing by design)" : outcome === "ok" ? "on the promoted message-master" : "on main"} · consistency carried entirely by MySQL replication
          </div>
        </div>
      </div>

      <div style={{ color: "#6b7080", fontSize: 10, marginTop: 12, borderTop: "1px solid #2a2a3a", paddingTop: 8, lineHeight: 1.7 }}>
        The stage machine and failure paths are illustrative; the mechanics are the post's: the inbox as ⅓ of main-database writes growing linearly; join elimination with grant revocation as the most time-consuming phase; the replica chain with a second-tier replica; the Zookeeper write swap that intentionally fails writes; direct connection kills; the three-way replication verification; ~30s of read and ~4 min of write downtime during RDS promotion (7.5 minutes total for the op); the abort path that restores service while forfeiting diverged writes; Multi-AZ before the next backup window; dropping stale tables last; and the mid-project discovery that RDS snapshots under heavy load could go nonlinear enough to threaten downtime. Sourced results: −33% main-master writes, −20% database size, two weeks end to end, zero migration code.
        {" "}<a href="https://behindscale.com/articles/airbnb-partitioning-main-database" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: "none" }}>From the full dissection at behindscale.com →</a>
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
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 8 }}><span style={lbl}>THE PROBLEM · </span>Airbnb's main database — the Rails monolith's original — was months from being overwhelmed: the message inbox alone drove a third of its writes, and routine RDS snapshots under load turned out to threaten full downtime. The classic fix, moving whole tables to their own database, normally costs weeks of migration code.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>THE MOVE · </span>Let MySQL replication do the hard part: build a replica chain, make the separation logically true first (eliminate every cross-table join, enforce by revoking grants), quiesce writes, verify the drain, and promote — 7.5 minutes of downtime, zero migration code.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>TRY · </span>Run the op. Then run it wrong: skip join elimination and see what an irreversible promotion does to cross-database queries; skip the three-way verification and promote over replication lag; or hit ABORT mid-promotion and read the fine print.</div>
    </div>
  );
}
