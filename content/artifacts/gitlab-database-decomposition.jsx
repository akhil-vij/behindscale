import { useState } from "react";

const ACCENT = "#FC6D26";
const RED = "#ef4444"; const AMBER = "#eab308"; const GREEN = "#22c55e"; const VIOLET = "#9b8cf0";

const initial = () => ({ stage: "monolith", replicas: 1, analyzed: false, detectors: false, ratchet: false, violations: 193, lfk: false, mirrored: false, asIf: false, readsSplit: false, proxiesSplit: false, rehearsals: 0, zeroDeclined: false, cut: false, last: null });

function act(w, a) {
  const n = { ...w, last: a };
  if (a === "replica" && n.stage === "monolith" && n.replicas < 5) n.replicas++;
  else if (a === "buyvm") { /* no larger machine exists — verdict only */ }
  else if (a === "shard") { /* deferred — verdict only */ }
  else if (a === "analyze" && n.stage === "monolith") n.analyzed = true;
  else if (a === "decompose" && n.stage === "monolith" && n.analyzed) n.stage = "prep";
  else if (a === "detectors" && n.stage === "prep") n.detectors = true;
  else if (a === "ratchet" && n.stage === "prep" && n.detectors) n.ratchet = true;
  else if (a === "newjoin" && n.stage === "prep") { if (!n.ratchet) n.violations += 12; }
  else if (a === "fix" && n.stage === "prep") { n.violations = Math.max(0, n.violations - 65 + (n.ratchet ? 0 : 30)); }
  else if (a === "lfk" && n.stage === "prep") n.lfk = true;
  else if (a === "mirror" && n.stage === "prep") n.mirrored = true;
  else if (a === "phases" && n.stage === "prep" && n.violations === 0 && n.lfk && n.mirrored) n.stage = "phases";
  else if (a === "asif" && n.stage === "phases") n.asIf = true;
  else if (a === "splitreads" && n.stage === "phases" && n.asIf) n.readsSplit = true;
  else if (a === "splitwrites" && n.stage === "phases" && n.readsSplit) n.proxiesSplit = true;
  else if (a === "rehearse" && n.stage === "phases" && n.proxiesSplit && n.rehearsals < 7) n.rehearsals++;
  else if (a === "zerodt" && n.stage === "phases" && n.rehearsals >= 1) n.zeroDeclined = true;
  else if (a === "window" && n.stage === "phases" && n.rehearsals >= 7) n.stage = "cutover";
  else if (a === "cut" && n.stage === "cutover") n.cut = true;
  else if (a === "results" && n.cut) n.stage = "results";
  return n;
}

export default function HalfTheWrites() {
  const [w, setW] = useState(initial);
  const D = (a) => () => setW(x => act(x, a));

  const verdict = (() => {
    if (w.stage === "results") return { c: VIOLET, code: "HALF THE WRITES LEFT HOME", t: "Vacuum saturation fell from 80–100% peaks to a stable ~15% on both databases; Sidekiq's average query duration improved at least five-fold once connection limits — long throttled to protect the primary — could rise into the new headroom; 9.2TiB and 12.5TiB became freeable by truncating each side's foreign tables. And the long-term answer stays on the map: sharding by namespace is where they still believe this ultimately goes. Decomposition was the reachable move." };
    if (w.stage === "cutover" && w.cut) return { c: GREEN, code: "REHEARSED SEVEN TIMES, RAN IN NINETY-THREE MINUTES", t: "Traffic blocked at the CDN, services stopped, CI cluster promoted, writes repointed, automated and manual checks run before reopening — 93 minutes against the two-hour budget, with the few surprises being ones staging never showed. The rollback (repoint reads, repoint writes, bump sequences past test data) stayed in its holster. LET THE RESULTS LAND." };
    if (w.stage === "cutover") return { c: AMBER, code: "THE WINDOW IS OPEN", t: "Two hours, scheduled and announced. Every participant has run their steps seven times. CUT OVER." };
    if (w.last === "zerodt" && w.zeroDeclined) return { c: VIOLET, code: "ROLLBACK BEAT ZERO DOWNTIME", t: "The near-zero plan existed in full: pause CI writes at PGBouncer, capture the primary's LSN, wait for the CI standby to catch up, promote, repoint. Declined on three stated grounds — no easy rollback (CI writes landed mid-migration would be lost), a few-seconds error window that muddies the did-it-work signal, and no hard business requirement for zero. Downtime is a cost; rollback clarity is a benefit; they did the arithmetic out loud. Schedule the window instead." };
    if (w.stage === "phases" && w.rehearsals >= 7) return { c: GREEN, code: "SEVEN REHEARSALS, MANY SMALL ISSUES FOUND", t: "Every staging run surfaced problems that would have burned production time, and every participant perfected their steps. Confidence in the two-hour budget is now earned, not hoped. You may examine THE ZERO-DOWNTIME PLAN — or SCHEDULE THE WINDOW." };
    if (w.stage === "phases" && w.rehearsals > 0) return { c: AMBER, code: `REHEARSAL ${w.rehearsals}/7 — STAGING FOUND SOMETHING`, t: "Another small issue that would likely have caused trouble in production, caught where it costs nothing. Rehearsal is how a two-hour window becomes a credible number instead of a wish. Keep going." };
    if (w.stage === "phases" && w.proxiesSplit) return { c: GREEN, code: "SIX PHASES DOWN, ALL ROLLBACKS TRIVIAL", t: "CI reads serve from the standby cluster; CI writes flow through their own PGBouncer — still landing on the same primary. The final migration is now 'trivial reconfiguration of a single database host.' Rehearse it. Seven times." };
    if (w.stage === "phases" && w.asIf) return { c: GREEN, code: "TWO DATABASES, ONE HOST — ROLLBACK IS FREE", t: "The application now runs two full connection topologies pointed at one physical database. This is the insight that turns a discrete 1→2 migration into seven phases, six of which ship early, carry almost no risk, and roll back trivially. Split the reads, then the write proxies." };
    if (w.stage === "phases") return { c: AMBER, code: "PHASES 1–7, ONE TRIVIAL STEP AT A TIME", t: "The discrete change becomes continuous: behave as-if-two-databases first, split reads, split write proxies — each phase shippable early with trivial rollback, 193 labeled issues distributed across teams by phase. Start with the AS-IF reconfiguration." };
    if (w.stage === "prep") {
      if (w.last === "newjoin" && w.ratchet) return { c: GREEN, code: "THE RATCHET ONLY TURNS ONE WAY", t: "An engineer who has never heard of this project just tried to merge a fresh cross-join — and the pipeline failed it, because it isn't in the allowlist. The invariant no longer depends on anyone knowing the migration exists; the pipeline knows. The list only shrinks now." };
      if (w.last === "newjoin") return { c: RED, code: "THE TARGET IS MOVING", t: `A new cross-join just merged — violations: ${w.violations}. The codebase evolves under many engineers who aren't in this project; without a gate, new offenses arrive faster than you can fix old ones, and the burn-down becomes a treadmill. Arm the DETECTORS, then the RATCHET.` };
      if (w.last === "lfk") return { c: VIOLET, code: "CASCADE BY QUEUE, NOT BY LOCK", t: "Foreign keys across the line are gone; in their place, on-delete triggers — unskippable, bulk-safe, guarantees model callbacks can't give — write parent deletions to a queue that Sidekiq drains in controlled batches. Same DELETE/NULLIFY semantics, now eventual. The dividend: the giant cascading deletes that used to time out now proceed at whatever pace the database can afford." };
      if (w.violations === 0) return { c: GREEN, code: "THE ALLOWLIST IS EMPTY", t: `Every cross-join and cross-database transaction is gone, and the ratchet guarantees none return. ${w.lfk ? "" : "Loose foreign keys still needed. "}${w.mirrored ? "" : "Mirror projects and namespaces with consistency checking. "}${w.lfk && w.mirrored ? "PROCEED TO THE PHASES." : ""}` };
      return { c: AMBER, code: `${w.violations} VIOLATIONS ON THE LIST`, t: `${w.ratchet ? "The ratchet holds — fix in batches and the number only falls." : w.detectors ? "Detectors armed: cross-join analyzer, cross-transaction analyzer, 1-in-10,000 sampled query metrics to Prometheus (which also catches paths no test covers). Now RATCHET: allowlist these, fail CI on any new one." : "The PoC found what breaks; now the year of fixes begins — against a codebase that keeps evolving. Try MERGE A NEW CROSS-JOIN and see the problem."}` };
    }
    if (w.last === "replica") return { c: AMBER, code: "REPLICAS DON'T WRITE", t: `${w.replicas} Patroni replicas now serve reads — and the write path is exactly as tall as before, because every write must reach the one primary. Read scaling is incremental and solved; the write ceiling is structural. This is why the pools 'only got us so far.'` };
    if (w.last === "buyvm") return { c: RED, code: "NO BIGGER MACHINE EXISTS", t: "The primary already runs on 96 vCPUs — the limits of a single VM — and 'continually trying to vertically scale this VM would eventually not be possible.' Even a hypothetically infinite machine leaves a 22TiB database that grows harder to manage and keeps causing incidents. The ladder ends here." };
    if (w.last === "shard") return { c: VIOLET, code: "THE LONG ROAD, DEFERRED", t: "Sharding by top-level namespace was explored first — and the application was never designed with strict tenancy boundaries, so the problems stacked up. The judgment is precise: ultimately this is a good way to split and scale, but the scaling problem needs a shorter-term answer. The ultimate move stays on the map; the reachable move goes first." };
    if (w.analyzed) return { c: GREEN, code: "HALF THE WRITES MUST GO", t: "The analysis is in: CI tables carry ~49% of all writes per second and ~36% of the data — merge requests 20% of writes, webhook logs 22% of size but almost no reads. Splitting the database in half by write traffic is the optimal scaling step, and CI is that half (with only three tables missing the ci_ prefix). BEGIN THE DECOMPOSITION." };
    return { c: AMBER, code: "ONE PRIMARY, 22 TERABYTES, EVERY WRITE", t: "A well-scaled monolith: Patroni replica pools, PGBouncer connection pooling — and a single 96-vCPU primary that every write must reach. Try the classic moves first; then RUN THE WRITE ANALYSIS and find the split line the data chooses." };
  })();

  const mono = "'JetBrains Mono','Fira Code',ui-monospace,monospace";
  const S = {
    root: { background: "#08090D", color: "#c8cdd8", fontFamily: mono, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid #2a2a3a", fontSize: 12, lineHeight: 1.5 },
    panel: { background: "#111118", border: "1px solid #2a2a3a", borderRadius: 8, padding: 12 },
    label: { color: "#6b7080", fontSize: 10, letterSpacing: 1.2 },
    btn: (on, dis, col) => ({ display: "block", width: "100%", textAlign: "left", padding: "7px 9px", marginTop: 6, borderRadius: 6, cursor: dis ? "not-allowed" : "pointer", opacity: dis ? 0.4 : 1, border: `1px solid ${on ? (col || ACCENT) : "#2a2a3a"}`, color: on ? "#ffd0b3" : "#8b90a0", background: on ? "rgba(252,109,38,0.10)" : "#0c0d13", fontFamily: mono, fontSize: 11 }),
  };
  const mono_ = w.stage === "monolith"; const prep = w.stage === "prep"; const ph = w.stage === "phases";
  const comp = [["CI", 49, w.analyzed], ["Merge Requests", 20, false], ["Rest", 28, false], ["Webhook logs", 3, false]];

  return (
    <div style={S.root}>
      <div style={{ color: ACCENT, fontSize: 10, letterSpacing: 2 }}>GITLAB · DECOMPOSING THE BACKEND DATABASE — INTERACTIVE</div>
      <div style={{ color: "#edeff3", fontSize: 16, margin: "4px 0 2px", fontWeight: 700 }}>Half the writes must go</div>
      <p style={{ color: "#8b90a0", fontSize: 11, margin: 0 }}>You run the yearlong decomposition: find the ceiling, pick the half, hold the line with a ratchet, and cut over in a window you rehearsed.</p>
      <ContextBlock />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
        <div style={{ ...S.panel, flex: "1 1 250px", minWidth: 250 }}>
          <div style={S.label}>THE MONOLITH ERA</div>
          <button style={S.btn(false, !mono_)} disabled={!mono_} onClick={D("replica")}>ADD A READ REPLICA ({w.replicas})</button>
          <button style={S.btn(false, !mono_)} disabled={!mono_} onClick={D("buyvm")}>BUY A BIGGER PRIMARY (&gt;96 vCPU)</button>
          <button style={S.btn(false, !mono_)} disabled={!mono_} onClick={D("shard")}>SHARD BY NAMESPACE</button>
          <button style={S.btn(w.analyzed, !mono_)} disabled={!mono_} onClick={D("analyze")}>RUN THE WRITE ANALYSIS</button>
          <button style={S.btn(false, !(mono_ && w.analyzed), VIOLET)} disabled={!(mono_ && w.analyzed)} onClick={D("decompose")}>BEGIN DECOMPOSITION →</button>
          <div style={{ ...S.label, marginTop: 12 }}>THE YEAR OF FIXES</div>
          <button style={S.btn(w.detectors, !prep || w.detectors)} disabled={!prep || w.detectors} onClick={D("detectors")}>ARM DETECTORS (joins · txns · sampled metrics)</button>
          <button style={S.btn(w.ratchet, !prep || !w.detectors || w.ratchet)} disabled={!prep || !w.detectors || w.ratchet} onClick={D("ratchet")}>ALLOWLIST + RATCHET (fail CI on new)</button>
          <button style={S.btn(false, !prep)} disabled={!prep} onClick={D("newjoin")}>SOMEONE MERGES A NEW CROSS-JOIN</button>
          <button style={S.btn(false, !prep || w.violations === 0)} disabled={!prep || w.violations === 0} onClick={D("fix")}>FIX A BATCH OF VIOLATIONS</button>
          <button style={S.btn(w.lfk, !prep || w.lfk)} disabled={!prep || w.lfk} onClick={D("lfk")}>IMPLEMENT LOOSE FOREIGN KEYS</button>
          <button style={S.btn(w.mirrored, !prep || w.mirrored)} disabled={!prep || w.mirrored} onClick={D("mirror")}>MIRROR projects/namespaces (+checker)</button>
          <button style={S.btn(false, !(prep && w.violations === 0 && w.lfk && w.mirrored), VIOLET)} disabled={!(prep && w.violations === 0 && w.lfk && w.mirrored)} onClick={D("phases")}>PROCEED TO THE PHASES →</button>
          <div style={{ ...S.label, marginTop: 12 }}>PHASES & CUTOVER</div>
          <button style={S.btn(w.asIf, !ph || w.asIf)} disabled={!ph || w.asIf} onClick={D("asif")}>RUN AS-IF-TWO-DATABASES (one host)</button>
          <button style={S.btn(w.readsSplit, !ph || !w.asIf || w.readsSplit)} disabled={!ph || !w.asIf || w.readsSplit} onClick={D("splitreads")}>SPLIT CI READS TO STANDBY CLUSTER</button>
          <button style={S.btn(w.proxiesSplit, !ph || !w.readsSplit || w.proxiesSplit)} disabled={!ph || !w.readsSplit || w.proxiesSplit} onClick={D("splitwrites")}>SPLIT WRITE PROXIES (same primary)</button>
          <button style={S.btn(false, !ph || !w.proxiesSplit || w.rehearsals >= 7)} disabled={!ph || !w.proxiesSplit || w.rehearsals >= 7} onClick={D("rehearse")}>REHEARSE ON STAGING ({w.rehearsals}/7)</button>
          <button style={S.btn(w.zeroDeclined, !ph || w.rehearsals < 1)} disabled={!ph || w.rehearsals < 1} onClick={D("zerodt")}>EXAMINE THE ZERO-DOWNTIME PLAN</button>
          <button style={S.btn(false, !(ph && w.rehearsals >= 7), GREEN)} disabled={!(ph && w.rehearsals >= 7)} onClick={D("window")}>SCHEDULE THE TWO-HOUR WINDOW →</button>
          <button style={S.btn(w.cut, w.stage !== "cutover" || w.cut, GREEN)} disabled={w.stage !== "cutover" || w.cut} onClick={D("cut")}>CUT OVER (CDN blocked · promote · repoint)</button>
          <button style={S.btn(false, !w.cut || w.stage === "results", VIOLET)} disabled={!w.cut || w.stage === "results"} onClick={D("results")}>LET THE RESULTS LAND →</button>
          <button style={{ ...S.btn(false, false), marginTop: 12 }} onClick={() => setW(initial())}>↺ RESET</button>
        </div>

        <div style={{ flex: "2 1 440px", minWidth: 300 }}>
          <div style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${verdict.c}`, background: `${verdict.c}14`, marginBottom: 12 }}>
            <div style={{ color: verdict.c, fontWeight: 700 }}>{verdict.code}</div>
            <div style={{ marginTop: 5, fontSize: 11.5, lineHeight: 1.6 }}>{verdict.t}</div>
          </div>
          <div style={S.panel}>
            <div style={S.label}>WRITES/S BY TABLE GROUP {w.analyzed ? "· THE SPLIT LINE THE DATA CHOSE" : "· run the analysis to reveal shares"}</div>
            <div style={{ display: "flex", height: 26, borderRadius: 6, overflow: "hidden", marginTop: 8, border: "1px solid #2a2a3a" }}>
              {comp.map(([name, pct, hot]) => (
                <div key={name} style={{ width: pct + "%", background: hot ? ACCENT : "#1a1c26", borderRight: "1px solid #2a2a3a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: hot ? "#0b0b0d" : "#6b7080", fontWeight: hot ? 700 : 400 }}>{w.analyzed ? `${name} ${pct}%` : "?"}</div>
              ))}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              <div style={{ flex: 1, minWidth: 110 }}><div style={S.label}>PRIMARY</div><div style={{ fontSize: 14, fontWeight: 700, color: w.stage === "results" ? GREEN : RED }}>{w.stage === "results" ? "2 hosts · headroom" : "96/96 vCPU"}</div><div style={{ fontSize: 9, color: "#6b7080" }}>{w.stage === "results" ? "writes split ~in half" : "every write lands here"}</div></div>
              <div style={{ flex: 1, minWidth: 110 }}><div style={S.label}>READ REPLICAS</div><div style={{ fontSize: 14, fontWeight: 700 }}>{w.replicas}</div><div style={{ fontSize: 9, color: "#6b7080" }}>reads scale · writes don't</div></div>
              <div style={{ flex: 1, minWidth: 110 }}><div style={S.label}>VIOLATIONS</div><div style={{ fontSize: 14, fontWeight: 700, color: w.violations === 0 ? GREEN : AMBER }}>{w.violations} {w.ratchet ? "🔒" : ""}</div><div style={{ fontSize: 9, color: "#6b7080" }}>{w.ratchet ? "ratchet: new ones can't merge" : "unguarded list"}</div></div>
              <div style={{ flex: 1, minWidth: 110 }}><div style={S.label}>VACUUM SAT.</div><div style={{ fontSize: 14, fontWeight: 700, color: w.stage === "results" ? GREEN : RED }}>{w.stage === "results" ? "~15%" : "80–100%"}</div></div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ color: "#6b7080", fontSize: 10, marginTop: 12, borderTop: "1px solid #2a2a3a", paddingTop: 8, lineHeight: 1.7 }}>
        The 96-vCPU vertical ceiling and all-writes-to-one-primary framing, the Patroni/PGBouncer prior art, the deferred namespace-sharding exploration, the write-traffic analysis table (CI ≈49% of writes/s, ≈36% of size; three unprefixed CI tables), the unmerged proof-of-concept, the ratchet workflow (cross-join and cross-transaction analyzers, 1-in-10,000 sampled query metrics to Prometheus, the ActiveRecord::Base RuboCop rule, allowlist + pipeline failure on new violations, 193 labeled issues), loose foreign keys (on-delete triggers → queue table → Sidekiq, callbacks rejected as skippable, the big-cascade-timeout dividend), the projects/namespaces mirroring with Redis-cursor consistency checking, the as-if-two-databases insight and seven-phase rollout, the designed-then-declined zero-downtime plan with its three stated reasons, the seven staging rehearsals, the 93-minute production cutover behind a CDN block with a three-step rollback, and the results (vacuum saturation 80–100% → ~15%, ≥5× Sidekiq query-duration improvement, 9.2/12.5 TiB freeable of 22TiB) are all from Dylan Griffith's GitLab blog series, parts 1 and 2. Part 3 (additional challenges and surprises) exists and is not covered here. The violation counts and batch sizes in this simulation are illustrative pacing around the real 193-issue figure.
        {" "}<a href="https://behindscale.com/articles/gitlab-database-decomposition" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: "none" }}>From the full dissection at behindscale.com →</a>
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
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 8 }}><span style={lbl}>THE PROBLEM · </span>GitLab.com's 22TiB monolithic Postgres sat behind replica pools that scale reads and can't touch the real ceiling: every write reaches one primary, the primary is a 96-vCPU VM, and no larger machine exists. Vacuum saturation ran at 80–100% peaks and async connections were throttled to protect it.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>THE MOVE · </span>Split the database in half by the metric that binds — CI tables carried ~49% of writes — governed by a violation ratchet (detect cross-joins, allowlist the existing, fail CI on new), loose foreign keys for cross-database cascades, an as-if-two-databases rollout whose final step is one host's reconfiguration, and a deliberately declined zero-downtime plan in favor of a rehearsed two-hour window that ran in 93 minutes.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>TRY · </span>Add replicas and learn why they don't help; ask for a bigger machine and find none. Run the analysis, watch an uninvolved engineer merge a fresh cross-join before the ratchet — and get blocked after it. Replace the foreign keys with queues, rehearse seven times, read why zero downtime lost to rollback clarity, and cut over.</div>
    </div>
  );
}
