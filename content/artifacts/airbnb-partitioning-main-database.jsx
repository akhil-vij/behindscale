import { useState, useEffect } from "react";

const ACCENT = "#FF5A5F";
const RED = "#ef4444"; const AMBER = "#eab308"; const GREEN = "#22c55e"; const BLUE = "#5b9bd5"; const OFF = "#4a4f60";
const mono = "'JetBrains Mono','Fira Code',ui-monospace,monospace";

export default function ZeroMigrationCode() {
  const [step, setStep] = useState(0);          // 0 preflight, 1 replicas, 2 swapped, 3 main-stopped, 4 done
  const [joins, setJoins] = useState(false);
  const [verified, setVerified] = useState(false);
  const [snapshot, setSnapshot] = useState(false);
  const [downtime, setDowntime] = useState(0);
  const [ticking, setTicking] = useState(false);
  const [outcome, setOutcome] = useState(null); // ok | broken | lostwrites | aborted

  useEffect(() => {
    if (!ticking) return;
    const id = setInterval(() => setDowntime(d => Math.min(d + 0.1, 4.0)), 90);
    return () => clearInterval(id);
  }, [ticking]);

  const reset = () => { setStep(0); setJoins(false); setVerified(false); setSnapshot(false); setDowntime(0); setTicking(false); setOutcome(null); };
  const swapWrites = () => { setStep(2); setDowntime(0); setTicking(true); };
  const promote = () => {
    setTicking(false); setDowntime(7.5); setStep(4);
    setOutcome(!verified ? "lostwrites" : !joins ? "broken" : "ok");
  };
  const abort = () => { setTicking(false); setOutcome("aborted"); setStep(4); };

  const done = step === 4;
  const clockColor = done ? (outcome === "ok" ? RED : outcome === "aborted" ? AMBER : RED) : ticking ? RED : "#6b7080";
  const clockText = done
    ? (outcome === "aborted" ? "restored after " + downtime.toFixed(1) + " min" : downtime.toFixed(1) + " min")
    : ticking ? downtime.toFixed(1) + " min - RUNNING" : "0.0 min";

  const verdict = (() => {
    if (step === 0) return snapshot
      ? { c: RED, code: "SNAPSHOT UNDER LOAD - THE SURPRISE THAT RESET THE DEADLINE", t: "A routine daily backup, even with Multi-AZ, spiked latency out of proportion under heavy load - enough to back up queries and threaten to take the database down. The team knew backups cost some latency; they had not known that rising load could turn a daily backup into an outage. Now finish the preflight." }
      : { c: AMBER, code: "THE MONOLITH - THE INBOX IS A THIRD OF WRITES, GROWING LINEARLY", t: "Much of Airbnb's core data still lives in the original Rails database, and the message inbox alone drives a third of its writes. Phase one is the unglamorous majority: find and remove every query that joins inbox tables to others. A promotion cannot be undone, so 'we think we found them all' is not enough - revoking database permissions turns finding them into enforcing it." };
    if (step === 1) return { c: BLUE, code: "REPLICA CHAIN BUILT - A COPY, AND A COPY OF THE COPY", t: "message-master is a live copy of the main database that will become the new independent one. message-replica is attached now so the new database has its own replica from birth. Reads and data pipelines move over ahead of time. From here, MySQL replication carries the whole consistency burden: no dual writes, no backfill, no bookkeeping." };
    if (step === 2) return { c: RED, code: "WRITES SWAPPED TO THE UNPROMOTED COPY - CLOCK RUNNING", t: "Inbox writes now point at message-master, which is not promoted yet, so every write fails by design. Reads still work, but marking a message read is a write, so messaging is effectively down. Next: stop the writes still hitting the main database, directly, so replication can finish catching up." };
    if (step === 3) return { c: verified ? GREEN : AMBER, code: verified ? "REPLICATION CAUGHT UP - VERIFIED THREE WAYS" : "VERIFY BEFORE YOU PROMOTE", t: verified ? "Newest inbox rows match on both sides; the old connections on main are gone; new connections are arriving at message-master. The promotion cannot be undone, so this check is what makes it safe. Promote when ready." : "Three checks: newest rows match on both sides, old connections gone, new connections arriving. Skip this and promote while the copy is still behind, and whatever has not caught up is data you leave behind." };
    if (outcome === "ok") return { c: GREEN, code: "PROMOTED - 7.5 MINUTES OF DOWNTIME, ZERO MIGRATION CODE", t: "Reads were down about 30 seconds, writes down nearly four minutes. Multi-AZ goes on before the next backup window; once the metrics settle, each database drops the other's leftover tables. Main-database writes fall 33% and it shrinks 20% - queries that were months from overwhelming it are gone, and the hard part was done by replication the team already trusted." };
    if (outcome === "broken") return { c: RED, code: "PROMOTED - AND THE JOINS YOU SKIPPED ARE NOW CROSS-DATABASE", t: "The promotion cannot be undone, and every query that joins inbox tables to others now spans two independent databases - invalid. This is why removing those joins, and revoking grants to be sure, was the most time-consuming phase: enforcement before an irreversible step, not hope. Reset and finish the preflight." };
    if (outcome === "lostwrites") return { c: RED, code: "PROMOTED WHILE THE COPY WAS BEHIND - THE GAP IS LOST DATA", t: "You stopped the writes but promoted before verifying the copy had caught up. Whatever had not replicated when the promotion kicked in is on neither database's future - they have diverged. The three-way check exists precisely because promotion cannot be undone." };
    return { c: AMBER, code: "ABORTED - SERVICE RESTORED, DIVERGED WRITES FORFEIT", t: "Reverting the write swap brings messaging back almost immediately. But any writes message-master already accepted are stranded on a database you are abandoning - recoverable in theory, messy and confusing in practice. The abort path exists and leaks; that is why the op was rehearsed, not trusted to rollback." };
  })();

  // ---- topology state ----
  const mainWrites = outcome === "ok" ? "-33% writes - 20% smaller" : step >= 2 ? "inbox writes stopped" : "inbox = 1/3 of all writes";
  const mm = step < 1 ? null
    : outcome === "ok" ? { txt: "INDEPENDENT DATABASE", c: GREEN }
    : outcome === "broken" ? { txt: "independent - joins now invalid", c: RED }
    : outcome === "lostwrites" ? { txt: "independent - diverged", c: RED }
    : outcome === "aborted" ? { txt: "discarded", c: OFF }
    : step === 2 ? { txt: "getting writes - FAILING (not promoted)", c: RED }
    : step === 3 ? { txt: "replica, catching up", c: AMBER }
    : { txt: "live copy (future master)", c: BLUE };

  const S = {
    root: { background: "#08090D", color: "#c8cdd8", fontFamily: mono, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid #2a2a3a", fontSize: 12, lineHeight: 1.5 },
    panel: { background: "#111118", border: "1px solid #2a2a3a", borderRadius: 8, padding: 12 },
    label: { color: "#6b7080", fontSize: 10, letterSpacing: 1.2 },
    btn: (on, dis) => ({ display: "block", width: "100%", textAlign: "left", padding: "8px 10px", marginTop: 6, borderRadius: 6, cursor: dis ? "not-allowed" : "pointer", opacity: dis ? 0.4 : 1, border: `1px solid ${on ? ACCENT : OFF}`, color: on ? "#ffc4c6" : "#c3c8d2", background: on ? "rgba(255,90,95,0.10)" : "#0c0d13", fontFamily: mono, fontSize: 11 }),
    dbcard: (c) => ({ flex: "1 1 150px", minWidth: 140, border: `1.5px solid ${c}`, borderRadius: 8, padding: "9px 10px", background: "#0c0d13" }),
  };

  const Step = ({ i, name }) => (
    <span style={{ padding: "4px 8px", borderRadius: 6, fontSize: 10, letterSpacing: 0.5, border: `1px solid ${i === step ? ACCENT : i < step ? "#5a3436" : "#2a2a3a"}`, color: i === step ? ACCENT : i < step ? "#8b90a0" : "#4a4f5e" }}>{i + 1}. {name}</span>
  );

  return (
    <div style={S.root}>
      <div style={{ color: ACCENT, fontSize: 10, letterSpacing: 2 }}>AIRBNB - MAIN DATABASE SPLIT - INTERACTIVE</div>
      <div style={{ color: "#edeff3", fontSize: 16, margin: "4px 0 2px", fontWeight: 700 }}>Zero migration code</div>
      <p style={{ color: "#8b90a0", fontSize: 11, margin: 0 }}>Run Airbnb's replica-promotion split. The machinery is borrowed from MySQL; all the risk lives in what you do before you press PROMOTE - and the downtime clock is watching.</p>
      <ContextBlock />

      {/* stepper + clock */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginTop: 12 }}>
        {["PREFLIGHT", "REPLICAS", "SWAP WRITES", "STOP + VERIFY", "DONE"].map((n, i) => <Step key={n} i={i} name={n} />)}
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: "#6b7080" }}>MESSAGING DOWNTIME</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: clockColor, minWidth: 150, textAlign: "right" }}>{clockText}</span>
        <button style={{ ...S.btn(false, false), display: "inline", width: "auto", marginTop: 0 }} onClick={reset}>RESET</button>
      </div>

      {/* live topology */}
      <div style={{ ...S.panel, marginTop: 12 }}>
        <div style={S.label}>LIVE TOPOLOGY</div>
        <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap", alignItems: "stretch" }}>
          <div style={S.dbcard(outcome === "ok" ? GREEN : "#8b90a0")}>
            <div style={{ color: "#edeff3", fontWeight: 700 }}>main database</div>
            <div style={{ fontSize: 10, color: "#8b90a0", marginTop: 3 }}>the old Rails monolith's DB</div>
            <div style={{ fontSize: 10, marginTop: 6, color: outcome === "ok" ? GREEN : step >= 2 ? AMBER : ACCENT }}>{mainWrites}</div>
          </div>
          <div style={{ alignSelf: "center", color: mm ? "#6b7080" : "#2a2a3a", fontSize: 16 }}>{outcome === "ok" || outcome === "broken" || outcome === "lostwrites" ? "|" : "\u2192"}</div>
          <div style={S.dbcard(mm ? mm.c : "#2a2a3a")}>
            <div style={{ color: mm ? "#edeff3" : "#3a3f4e", fontWeight: 700 }}>message-master</div>
            <div style={{ fontSize: 10, color: "#8b90a0", marginTop: 3 }}>{mm ? "the copy being promoted" : "not built yet"}</div>
            <div style={{ fontSize: 10, marginTop: 6, color: mm ? mm.c : "#3a3f4e" }}>{mm ? mm.txt : "-"}</div>
          </div>
          <div style={{ alignSelf: "center", color: step >= 1 && outcome !== "aborted" ? "#6b7080" : "#2a2a3a", fontSize: 16 }}>{"\u2192"}</div>
          <div style={S.dbcard(step >= 1 && outcome !== "aborted" ? BLUE : "#2a2a3a")}>
            <div style={{ color: step >= 1 ? "#edeff3" : "#3a3f4e", fontWeight: 700 }}>message-replica</div>
            <div style={{ fontSize: 10, color: "#8b90a0", marginTop: 3 }}>a copy of the copy</div>
            <div style={{ fontSize: 10, marginTop: 6, color: step >= 1 && outcome !== "aborted" ? BLUE : "#3a3f4e" }}>{step >= 1 && outcome !== "aborted" ? "second-tier replica" : "-"}</div>
          </div>
        </div>
        <div style={{ fontSize: 10, color: "#6b7080", marginTop: 8 }}>Consistency is carried entirely by MySQL replication - no dual writes, no migration code.</div>
      </div>

      {/* controls + verdict */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
        <div style={{ ...S.panel, flex: "1 1 260px", minWidth: 260 }}>
          {step === 0 && (<>
            <div style={S.label}>PREFLIGHT - THIS IS WHERE THE PROJECT ACTUALLY LIVES</div>
            <button style={S.btn(snapshot, false)} onClick={() => setSnapshot(true)}>RUN A BACKUP UNDER LOAD<div style={{ color: "#6b7080", fontSize: 10 }}>{snapshot ? "latency spiked - the mid-project surprise" : "see the mid-project surprise"}</div></button>
            {snapshot && <div style={{ margin: "6px 0", height: 26, borderRadius: 4, background: "#0c0d13", border: "1px solid #2a2a3a", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "62%", background: "linear-gradient(90deg,#22c55e33,#ef444455)" }} />
              <div style={{ position: "absolute", right: 6, top: 5, fontSize: 9, color: RED }}>latency to danger zone as load rises</div>
            </div>}
            <button style={S.btn(joins, false)} onClick={() => setJoins(!joins)}>ELIMINATE CROSS-TABLE JOINS + REVOKE GRANTS: {joins ? "DONE" : "SKIPPED"}</button>
            <button style={S.btn(true, false)} onClick={() => setStep(1)}>BUILD THE REPLICA CHAIN {"\u2192"}</button>
          </>)}
          {step === 1 && (<>
            <div style={S.label}>THE COPY IS LIVE - READS AND PIPELINES ALREADY MOVED</div>
            <button style={S.btn(true, false)} onClick={swapWrites}>BEGIN THE OP: SWAP WRITES {"\u2192"} <span style={{ color: RED }}>(starts the clock)</span></button>
          </>)}
          {step === 2 && (<>
            <div style={S.label}>WRITES ARE FAILING ON THE UNPROMOTED COPY</div>
            <button style={S.btn(true, false)} onClick={() => setStep(3)}>STOP THE WRITES ON MAIN (kill connections directly) {"\u2192"}</button>
          </>)}
          {step === 3 && (<>
            <div style={S.label}>REPLICATION CAN FINISH ONLY NOW THE WRITES HAVE STOPPED</div>
            <button style={S.btn(verified, false)} onClick={() => setVerified(!verified)}>VERIFY REPLICATION 3 WAYS: {verified ? "VERIFIED" : "SKIPPED"}<div style={{ color: "#6b7080", fontSize: 10 }}>rows match - old conns gone - new conns arriving</div></button>
            <button style={S.btn(true, false)} onClick={promote}>PROMOTE message-master (reads down ~30s, writes ~4 min)</button>
            <button style={S.btn(false, false)} onClick={abort}>ABORT - REVERT THE WRITE SWAP</button>
          </>)}
          {done && <div style={{ fontSize: 11, color: "#8b90a0" }}>Op complete. Reset to try a different path - skip the joins, or promote without verifying, or abort mid-op.</div>}
        </div>

        <div style={{ flex: "2 1 380px", minWidth: 300 }}>
          <div style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${verdict.c}`, background: `${verdict.c}14` }}>
            <div style={{ color: verdict.c, fontWeight: 700 }}>{verdict.code}</div>
            <div style={{ marginTop: 6, fontSize: 11.5, lineHeight: 1.65 }}>{verdict.t}</div>
          </div>
        </div>
      </div>

      <div style={{ color: "#6b7080", fontSize: 10, marginTop: 12, borderTop: "1px solid #2a2a3a", paddingTop: 8, lineHeight: 1.7 }}>
        The stage machine and failure paths are illustrative; the mechanics are the post's: the inbox as a third of main-database writes growing linearly; join elimination with grant revocation as the most time-consuming phase; the replica chain with a second-tier replica; the write swap that intentionally fails writes; stopping writes on main by killing connections directly; the three-way replication check; ~30s of read and ~4 min of write downtime during the promotion (7.5 minutes total); the abort path that restores service while forfeiting diverged writes; Multi-AZ before the next backup window; dropping leftover tables last; and the mid-project discovery that a routine backup under heavy load could threaten downtime. Sourced results: -33% main-master writes, -20% database size, two weeks end to end, zero migration code.
        {" "}<a href="https://behindscale.com/articles/airbnb-partitioning-main-database" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: "none" }}>From the full dissection at behindscale.com {"\u2192"}</a>
      </div>
    </div>
  );
}

function ContextBlock() {
  const [open, setOpen] = useState(true);
  const lbl = { fontSize: 10, color: ACCENT, letterSpacing: 1.2 };
  if (!open) return <button onClick={() => setOpen(true)} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontFamily: "inherit", fontSize: 10, padding: 0, margin: "10px 0 0", display: "block" }}>SHOW CONTEXT</button>;
  return (
    <div style={{ background: "#111118", border: "1px solid #2a2a3a", borderRadius: 8, padding: "12px 14px", marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <div style={{ fontSize: 10, color: "#6b7080", letterSpacing: 1.2 }}>CONTEXT - IF YOU ARRIVED WITHOUT THE ARTICLE</div>
        <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontFamily: "inherit", fontSize: 10, padding: 0 }}>HIDE</button>
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 8 }}><span style={lbl}>THE PROBLEM - </span>Airbnb's main database, the old Rails monolith's, was months from being overwhelmed: the message inbox alone drove a third of its writes, and routine daily backups under load turned out to threaten full downtime. The classic fix, moving a feature's tables onto their own database, normally costs weeks of migration code.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>THE MOVE - </span>Let MySQL replication do the hard part: build a live copy of the database, make the split real in the code first (remove every cross-table join, enforce it by revoking permissions), stop the writes, verify the copy has caught up, and promote it - 7.5 minutes of downtime, zero migration code.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>TRY - </span>Run the op. Then run it wrong: skip join removal and see what an irreversible promotion does to cross-database queries; skip the three-way check and promote while the copy is behind; or hit ABORT mid-op and read the fine print.</div>
    </div>
  );
}
