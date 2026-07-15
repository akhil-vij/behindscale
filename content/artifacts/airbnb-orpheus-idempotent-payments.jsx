import { useState } from "react";

const ACCENT = "#FF5A5F";
const RED = "#ef4444"; const AMBER = "#eab308"; const GREEN = "#22c55e";

const initial = { t: 0, orpheus: false, src: "M", lag: 3, keySeq: 1, phase: null, isRetry: false, sameKey: false, moved: 0, doubles: 0, master: [], repl: [], replQ: [], lastOutcome: null };

export default function AtMostOnce() {
  const [w, setW] = useState(initial);
  const key = w.keySeq;

  const mWrite = (x, k, state) => {
    const master = [...x.master.filter(r => r.key !== k), { key: k, state }];
    const replQ = [...x.replQ, { row: { key: k, state }, at: x.t + x.lag }];
    return { ...x, master, replQ };
  };
  const tick = (x, n) => {
    let y = { ...x, t: x.t + n };
    const due = y.replQ.filter(q => y.t >= q.at);
    y.repl = due.reduce((acc, q) => [...acc.filter(r => r.key !== q.row.key), q.row], y.repl);
    y.replQ = y.replQ.filter(q => y.t < q.at);
    return y;
  };
  const hasDone = (x, k) => (x.src === "M" ? x.master : x.repl).some(r => r.key === k && r.state === "DONE");

  const send = (isRetry, sameKey) => setW(x => {
    const k = sameKey ? x.keySeq : x.keySeq + (isRetry ? 1 : 0);
    let y = { ...x, keySeq: k, isRetry, sameKey };
    if (y.orpheus && isRetry && sameKey && hasDone(y, k)) return { ...tick(y, 1), lastOutcome: "replayed", phase: null };
    y = mWrite(tick(y, 1), k, "LEASED");            // Pre-RPC txn: intent + lease
    y = tick(y, 1); y.moved++;                        // RPC: the bank moves the money
    if (isRetry && y.moved > 1) y.doubles++;
    y = y.orpheus ? mWrite(tick(y, 1), k, "DONE") : tick(y, 1); // Post-RPC txn: response recorded
    return { ...y, phase: "inflight", lastOutcome: null };
  });
  const newCharge = () => setW(x => { const y = { ...x, keySeq: x.keySeq + 1 }; return y; }) || send(false, true);

  const verdict = (() => {
    if (w.lastOutcome === "replayed") return { c: GREEN, code: "THE RETRY WAS FREE", t: `The framework found the recorded response for key K-${key} on ${w.src === "M" ? "MASTER" : "the replica"} and replayed it. No lease, no RPC, no second charge — the guest was charged exactly once, and the client finally has its evidence. Write repair doing its job: the identical request repaired the ambiguity instead of repeating the work.` };
    if (w.phase === "inflight") return { c: AMBER, code: "RESPONSE IN FLIGHT — ITS FATE IS YOURS", t: `The bank has already moved the money (${w.moved}× total). ${w.orpheus ? "Post-RPC recorded the response on MASTER; replication to the replica lags " + w.lag + " ticks." : "Nothing was recorded anywhere — there is no framework."} Deliver the response, or cut it and become the client the post describes.` };
    if (w.phase === "timedout") {
      if (w.isRetry && w.doubles > 0) return { c: RED, code: "THE CURE RE-CREATED THE DISEASE", t: w.orpheus && w.sameKey ? "Orpheus was ON and the client did everything right — same key, correct retry. But the idempotency tables were read from a REPLICA, and the recorded response hadn't replicated when the retry arrived. The framework found nothing, concluded the payment never happened, and moved the money again. A few ticks of replica lag, one double charge — the post's own scenario, and why Orpheus reads master only." : w.orpheus ? "A new key is a new request — that's the definition. Orpheus faithfully processed what the client declared to be different work, and the guest paid for the distinction. The framework is only as idempotent as the client's key discipline." : "Without idempotency there is no such thing as a retry — only a second request. The first charge succeeded invisibly, the second visibly, and the guest paid twice. This is the baseline the framework exists to eliminate." };
      return { c: AMBER, code: "THE AMBIGUOUS STATE", t: `The bank moved the money. The response is gone. From where the client sits, those facts are indistinguishable from a charge that never happened — this is the crux, and every recovery path starts here. ${w.orpheus ? "Retry with the same key — or, against the rules, a new one. If you're reading the REPLICA, consider WAITing for replication first (or don't, and see why master-only is the rule)." : "There are no keys: a retry is just another charge."}` };
    }
    if (w.phase === "done") return { c: w.isRetry && w.doubles > 0 ? RED : GREEN, code: w.isRetry && w.doubles > 0 ? "RESPONSE DELIVERED — AND THE GUEST PAID TWICE" : "THE HAPPY PATH", t: w.isRetry && w.doubles > 0 ? "The retry completed cleanly from the client's view — success received, key consumed. The double charge already happened at the bank, invisible to a client that can only see responses." : "Charge sent, money moved once, response consumed. Uneventful — which is the point of the fences: intent recorded before the RPC, outcome after, network never inside a transaction. Now do it again and cut the response mid-flight." };
    return { c: AMBER, code: "YOU ARE THE CLIENT — $100 TO CHARGE", t: "Set Orpheus and the read source, then send. The scissors only matter once the money has moved: the interesting failure isn't a clean error, it's a vanished response." };
  })();

  const mono = "'JetBrains Mono','Fira Code',ui-monospace,monospace";
  const S = {
    root: { background: "#08090D", color: "#c8cdd8", fontFamily: mono, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid #2a2a3a", fontSize: 12, lineHeight: 1.5 },
    panel: { background: "#111118", border: "1px solid #2a2a3a", borderRadius: 8, padding: 12 },
    label: { color: "#6b7080", fontSize: 10, letterSpacing: 1.2 },
    btn: (on, dis) => ({ display: "block", width: "100%", textAlign: "left", padding: "7px 9px", marginTop: 6, borderRadius: 6, cursor: dis ? "not-allowed" : "pointer", opacity: dis ? 0.4 : 1, border: `1px solid ${on ? ACCENT : "#2a2a3a"}`, color: on ? "#ffc2c4" : "#8b90a0", background: on ? "rgba(255,90,95,0.10)" : "#0c0d13", fontFamily: mono, fontSize: 11 }),
  };
  const rows = (arr) => arr.length ? arr.map(r => `K-${r.key}·${r.state}`).join("  ") : "— no rows —";
  const idle = w.phase === null || w.phase === "done";
  const cons = w.moved === 0 ? 100 : Math.max(0, Math.round((1 - w.doubles / w.moved) * 1000) / 10);

  return (
    <div style={S.root}>
      <div style={{ color: ACCENT, fontSize: 10, letterSpacing: 2 }}>AIRBNB · ORPHEUS IDEMPOTENCY — INTERACTIVE</div>
      <div style={{ color: "#edeff3", fontSize: 16, margin: "4px 0 2px", fontWeight: 700 }}>At most once</div>
      <p style={{ color: "#8b90a0", fontSize: 11, margin: 0 }}>One request, three phases, and a pair of scissors. The bank always moves the money; only the evidence is at stake.</p>
      <ContextBlock />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
        <div style={{ ...S.panel, flex: "1 1 250px", minWidth: 250 }}>
          <div style={S.label}>FRAMEWORK</div>
          <button style={S.btn(w.orpheus, !idle)} disabled={!idle} onClick={() => setW(x => ({ ...x, orpheus: !x.orpheus }))}>ORPHEUS: {w.orpheus ? "ON" : "OFF"}<div style={{ color: "#6b7080", fontSize: 10 }}>{w.orpheus ? "keys, leases, recorded responses" : "no keys — a retry is just a second request"}</div></button>
          <button style={S.btn(w.src === "R", !idle)} disabled={!idle} onClick={() => setW(x => ({ ...x, src: x.src === "M" ? "R" : "M" }))}>READ SOURCE: {w.src === "M" ? "MASTER" : `REPLICA (lag ${w.lag})`}<div style={{ color: "#6b7080", fontSize: 10 }}>{w.src === "M" ? "the framework sees its own writes" : "the framework sees the past"}</div></button>
          <div style={{ ...S.label, marginTop: 12 }}>THE REQUEST</div>
          <button style={S.btn(false, !idle)} disabled={!idle} onClick={newCharge}>SEND CHARGE $100 (new key K-{w.keySeq + 1})</button>
          <button style={S.btn(false, w.phase !== "inflight")} disabled={w.phase !== "inflight"} onClick={() => setW(x => ({ ...tick(x, 1), phase: "done" }))}>DELIVER THE RESPONSE</button>
          <button style={{ ...S.btn(false, w.phase !== "inflight"), borderColor: w.phase === "inflight" ? RED : "#2a2a3a", color: w.phase === "inflight" ? RED : "#8b90a0" }} disabled={w.phase !== "inflight"} onClick={() => setW(x => ({ ...tick(x, 1), phase: "timedout" }))}>✂ CUT THE RESPONSE</button>
          <div style={{ ...S.label, marginTop: 12 }}>RECOVERY {w.phase === "timedout" ? "· THE AMBIGUITY IS YOURS" : ""}</div>
          <button style={S.btn(false, w.phase !== "timedout")} disabled={w.phase !== "timedout"} onClick={() => send(true, true)}>RETRY (SAME KEY K-{key})</button>
          <button style={S.btn(false, w.phase !== "timedout" || !w.orpheus)} disabled={w.phase !== "timedout" || !w.orpheus} onClick={() => send(true, false)}>RETRY (NEW KEY — breaks the contract)</button>
          <button style={S.btn(false, w.phase !== "timedout")} disabled={w.phase !== "timedout"} onClick={() => setW(x => tick(x, x.lag))}>WAIT — LET REPLICATION CATCH UP</button>
          <button style={{ ...S.btn(false, false), marginTop: 12 }} onClick={() => setW(initial)}>↺ RESET</button>
        </div>

        <div style={{ flex: "2 1 420px", minWidth: 300 }}>
          <div style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${verdict.c}`, background: `${verdict.c}14`, marginBottom: 12 }}>
            <div style={{ color: verdict.c, fontWeight: 700 }}>{verdict.code}</div>
            <div style={{ marginTop: 5, fontSize: 11.5, lineHeight: 1.6 }}>{verdict.t}</div>
          </div>
          <div style={S.panel}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={S.label}>PRE-RPC ▸ RPC ▸ POST-RPC — network never inside a transaction</div>
              <div style={{ fontSize: 11, color: "#6b7080" }}>t={w.t}</div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              <div style={{ flex: 1, minWidth: 140, background: "#0c0d13", border: "1px solid #2a2f45", borderRadius: 6, padding: "8px 10px" }}><div style={S.label}>MASTER (leases live here)</div><div style={{ fontSize: 11, marginTop: 4 }}>{rows(w.master)}</div></div>
              <div style={{ flex: 1, minWidth: 140, background: "#0c0d13", border: `1px solid ${w.src === "R" ? AMBER : "#2a2f45"}`, borderRadius: 6, padding: "8px 10px" }}><div style={S.label}>REPLICA (lag {w.lag}){w.src === "R" ? " · BEING READ" : ""}</div><div style={{ fontSize: 11, marginTop: 4 }}>{rows(w.repl)}</div></div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              <div style={{ flex: 1 }}><div style={S.label}>GUEST CHARGED</div><div style={{ fontSize: 16, fontWeight: 700, color: w.moved > 1 ? RED : "#c8cdd8" }}>{w.moved}×</div></div>
              <div style={{ flex: 1 }}><div style={S.label}>DOUBLE CHARGES</div><div style={{ fontSize: 16, fontWeight: 700, color: w.doubles ? RED : GREEN }}>{w.doubles}</div></div>
              <div style={{ flex: 1 }}><div style={S.label}>CONSISTENCY</div><div style={{ fontSize: 16, fontWeight: 700, color: w.doubles ? RED : GREEN }}>{cons}%</div></div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ color: "#6b7080", fontSize: 10, marginTop: 12, borderTop: "1px solid #2a2a3a", paddingTop: 8, lineHeight: 1.7 }}>
        The three-phase structure and its two ground rules, the row-lock lease (expiration longer than the RPC timeout), recorded-response replay, retryable/non-retryable classification, request-level vs entity-level keys, and the replica-lag double-payment scenario are the post's; five nines of consistency and doubled annual payment volume are its reported results. Tick timings and the consistency meter are illustrative.
        {" "}<a href="https://behindscale.com/articles/airbnb-orpheus-idempotent-payments" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: "none" }}>From the full dissection at behindscale.com →</a>
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
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 8 }}><span style={lbl}>THE PROBLEM · </span>A payment call that times out may have already moved the money — the client holds no evidence either way, and the only recovery action, retrying, is exactly the one that can charge a guest twice.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>THE MOVE · </span>Orpheus, Airbnb's idempotency library: a key per logical request, a row-lock lease, a recorded response replayed to retries — read only from the master database, because a lagged replica re-creates the double charge inside the cure. Result: five nines of payment consistency while volume doubled.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>TRY · </span>Send, cut the response, retry — first with Orpheus off (the guest pays twice), then on-and-reading-master (the replay is free). Then read the replica and retry fast: the post's own double-charge scenario, by your hand. Finish with a new-key retry and find the half of the contract that lives in the client.</div>
    </div>
  );
}
