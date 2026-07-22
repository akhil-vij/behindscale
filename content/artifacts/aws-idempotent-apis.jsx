import { useState } from "react";

const ACCENT = "#FF9900";
const RED = "#ef4444"; const AMBER = "#eab308"; const GREEN = "#22c55e"; const VIOLET = "#9b8cf0";

const TOKEN = "eb3c…abdc";
const initial = () => ({ mode: "none", phase: null, atomic: true, instances: [], sessions: [], nextId: 1, lastVerdict: null, wantTwo: false, crashed: false, expired: false });

export default function AskedTwiceDoneOnce() {
  const [w, setW] = useState(initial);
  const running = w.instances.filter(i => i.state !== "terminated").length;
  const singletonViolated = w.instances.length > 1 && !w.wantTwo;

  const send = (isRetry, changedParams) => setW(x => {
    const y = { ...x, instances: [...x.instances], sessions: [...x.sessions] };
    const key = y.mode === "token" ? TOKEN : y.mode === "hash" ? "hash(ami+t2.micro)" : null;
    if (key && isRetry && !y.expired) {
      const s = y.sessions.find(s => s.key === key);
      if (s) {
        if (changedParams) return { ...y, phase: "done", lastVerdict: "mismatch" };
        if (!s.tokenRecorded) { /* non-atomic crash lost the token */ }
        else {
          const inst = y.instances.find(i => i.id === s.instanceId);
          return { ...y, phase: "done", lastVerdict: inst && inst.state === "terminated" ? "deadReplay" : "replay" };
        }
      }
    }
    // synthetic-hash trap: a NEW request that looks identical gets wrongly deduped
    if (key && !isRetry && y.wantTwo && y.mode === "hash" && y.sessions.find(s => s.key === key)) {
      return { ...y, phase: "done", lastVerdict: "hashTrap" };
    }
    // process: mutations + (maybe) token, atomicity decides ordering safety
    const id = `i-0${y.nextId}x`;
    y.instances.push({ id, state: "running" });
    if (key) {
      if (y.atomic) y.sessions.push({ key, instanceId: id, tokenRecorded: true });
      else if (!y.crashed) y.sessions.push({ key, instanceId: id, tokenRecorded: true });
      // non-atomic + crash: mutation committed, token write lost (handled by CRASH button setting crashed before retry)
    }
    y.nextId++;
    y.phase = "inflight";
    y.lastVerdict = null;
    return y;
  });

  const crashBetween = () => setW(x => {
    // simulate: mutations committed, process dies before token write → strip the last session row
    const sessions = x.sessions.slice(0, -1);
    return { ...x, sessions, crashed: true, phase: "timedout", lastVerdict: "crashGap" };
  });

  const verdict = (() => {
    const v = w.lastVerdict;
    if (v === "replay") return { c: GREEN, code: "ASKED TWICE, DONE ONCE", t: `The session table already holds (customer, ${TOKEN}) — the service replays a semantically equivalent response instead of processing. One instance, and the client's code never even knew a retry happened; this is the property that lets the SDK retry invisibly by default. Now try TERMINATE + LATE RETRY, or break the atomicity.` };
    if (v === "deadReplay") return { c: VIOLET, code: "EQUIVALENT, EVEN ABOUT THE DEAD", t: "The instance was terminated by another actor, and the late retry still gets a semantically equivalent SUCCESS — whose body reads state: terminated. The principle of least astonishment: every response to this token has carried the same meaning, and consistency of experience beats freshness of verdict. The caller's obligation: read the state from the body, never infer it from the success." };
    if (v === "mismatch") return { c: AMBER, code: "PARAMETER MISMATCH — INTENT CHANGED", t: "Same token, different parameters. The safest assumption is that the customer meant a different outcome, so the service returns a validation error naming the mismatch — which is why the session stores the original request's parameters alongside the token. A reused key with changed content is a contradiction of intent, not a retry." };
    if (v === "hashTrap") return { c: RED, code: "DEDUPED THE CUSTOMER'S REAL INTENT", t: "You genuinely wanted a second identical instance — and the synthetic hash of (ami, instance-type) can't tell your new intent from a retry, so it silently replayed the first response. Plausible dedup for near-simultaneous CreateTable calls; wrong for RunInstances. Sameness of parameters is not sameness of intent — only the caller knows, which is why the caller supplies the token." };
    if (v === "crashGap") return { c: RED, code: "THE TOKEN LIED — WRITTEN APART FROM THE WORK", t: "The mutations committed; the process died before the token write. The instance exists and the session table has no memory of it — so the incoming retry will process as brand new and duplicate the workload DESPITE tokens being 'on.' This is why the post's load-bearing sentence demands the token and ALL mutations commit as one ACID unit. Retry now and watch." };
    if (w.phase === "inflight") return { c: AMBER, code: "RESPONSE IN FLIGHT — CUT IT OR DELIVER IT", t: `RunInstances processed; ${w.instances[w.instances.length - 1]?.id} is launching. The interesting failure isn't a clean error — it's the response that never arrives.` };
    if (w.phase === "timedout" && !singletonViolated) return { c: AMBER, code: "THE SINGLETON DILEMMA", t: `No response. Is the workload running? ${w.mode === "none" ? "With no idempotent contract, your options are a heavy reconciliation workflow (which still can't prove WHO created a found instance) — or the retry that risks a second workload. Retry and see." : "Your token is your evidence — retry and let the session table answer."}` };
    if (singletonViolated) return { c: RED, code: "TWO INSTANCES, ONE INTENT", t: `The retry launched a second instance — ${running} now running for a workload whose invariant is at most one. The post's phrase is 'dire consequences.' This is the baseline the ClientToken contract exists to eliminate; switch TOKEN MODE and re-run.` };
    if (w.expired) return { c: AMBER, code: "THE CONTRACT HAS A CLOCK", t: "Retention lapsed — the session row for this token is gone (resource lifetime + a reasonable-lateness interval, in EC2's policy). A retry now processes as brand new. 'At most once' everywhere carries a quietly bounded time horizon; retry and confirm." };
    return { c: AMBER, code: "YOU RUN A SINGLETON WORKLOAD", t: "At most one instance, ever. Pick the dedup mode, send RunInstances, and cut the response after the work is done — the provider-side session table on the right is where the contract lives or dies." };
  })();

  const mono = "'JetBrains Mono','Fira Code',ui-monospace,monospace";
  const S = {
    root: { background: "#08090D", color: "#c8cdd8", fontFamily: mono, maxWidth: 960, margin: "0 auto", padding: 20, borderRadius: 12, border: "1px solid #2a2a3a", fontSize: 12, lineHeight: 1.5 },
    panel: { background: "#111118", border: "1px solid #2a2a3a", borderRadius: 8, padding: 12 },
    label: { color: "#6b7080", fontSize: 10, letterSpacing: 1.2 },
    btn: (on, dis) => ({ display: "block", width: "100%", textAlign: "left", padding: "7px 9px", marginTop: 6, borderRadius: 6, cursor: dis ? "not-allowed" : "pointer", opacity: dis ? 0.4 : 1, border: `1px solid ${on ? ACCENT : "#2a2a3a"}`, color: on ? "#ffd9a8" : "#8b90a0", background: on ? "rgba(255,153,0,0.10)" : "#0c0d13", fontFamily: mono, fontSize: 11 }),
  };
  const idle = w.phase === null || w.phase === "done";
  const canRetry = w.phase === "timedout";

  return (
    <div style={S.root}>
      <div style={{ color: ACCENT, fontSize: 10, letterSpacing: 2 }}>AWS · IDEMPOTENT APIS (BUILDERS' LIBRARY) — INTERACTIVE</div>
      <div style={{ color: "#edeff3", fontSize: 16, margin: "4px 0 2px", fontWeight: 700 }}>Asked twice, done once</div>
      <p style={{ color: "#8b90a0", fontSize: 11, margin: 0 }}>You are the provisioning process; the panel on the right is the provider. The contract is only as strong as the row in that table.</p>
      <ContextBlock />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
        <div style={{ ...S.panel, flex: "1 1 250px", minWidth: 250 }}>
          <div style={S.label}>DEDUP MODE</div>
          <button style={S.btn(w.mode === "none", !idle)} disabled={!idle} onClick={() => setW(x => ({ ...initial(), mode: "none" }))}>NO CONTRACT<div style={{ color: "#6b7080", fontSize: 10 }}>retries are just… more requests</div></button>
          <button style={S.btn(w.mode === "hash", !idle)} disabled={!idle} onClick={() => setW(x => ({ ...initial(), mode: "hash" }))}>SYNTHETIC HASH OF PARAMETERS<div style={{ color: "#6b7080", fontSize: 10 }}>identical-looking = duplicate (the tempting shortcut)</div></button>
          <button style={S.btn(w.mode === "token", !idle)} disabled={!idle} onClick={() => setW(x => ({ ...initial(), mode: "token" }))}>CLIENT TOKEN (caller-provided)<div style={{ color: "#6b7080", fontSize: 10 }}>intent declared: {TOKEN}</div></button>
          <div style={{ ...S.label, marginTop: 12 }}>THE REQUEST</div>
          <button style={S.btn(false, !idle)} disabled={!idle} onClick={() => send(false, false)}>SEND RunInstances (singleton)</button>
          <button style={S.btn(w.wantTwo, !idle || w.mode !== "hash")} disabled={!idle || w.mode !== "hash"} onClick={() => setW(x => ({ ...x, wantTwo: true })) || send(false, false)}>SEND AGAIN — I REALLY WANT A 2ND ONE<div style={{ color: "#6b7080", fontSize: 10 }}>new intent, identical parameters</div></button>
          <button style={{ ...S.btn(false, w.phase !== "inflight"), borderColor: w.phase === "inflight" ? RED : undefined, color: w.phase === "inflight" ? RED : undefined }} disabled={w.phase !== "inflight"} onClick={() => setW(x => ({ ...x, phase: "timedout" }))}>✂ CUT THE RESPONSE</button>
          <button style={S.btn(false, w.phase !== "inflight")} disabled={w.phase !== "inflight"} onClick={() => setW(x => ({ ...x, phase: "done" }))}>DELIVER THE RESPONSE</button>
          <div style={{ ...S.label, marginTop: 12 }}>RECOVER / BREAK THINGS</div>
          <button style={S.btn(false, !canRetry)} disabled={!canRetry} onClick={() => send(true, false)}>RETRY (same request{w.mode === "token" ? ", same token" : ""})</button>
          <button style={S.btn(false, !canRetry || w.mode !== "token")} disabled={!canRetry || w.mode !== "token"} onClick={() => send(true, true)}>RETRY WITH CHANGED PARAMETERS (same token)</button>
          <button style={S.btn(!w.atomic, w.mode !== "token" || !idle)} disabled={w.mode !== "token" || !idle} onClick={() => setW(x => ({ ...x, atomic: !x.atomic }))}>ATOMICITY: {w.atomic ? "TOKEN+MUTATIONS ONE ACID UNIT" : "TOKEN WRITTEN AFTER (unsafe)"}</button>
          <button style={S.btn(false, w.atomic || w.phase !== "inflight" || w.sessions.length === 0)} disabled={w.atomic || w.phase !== "inflight" || w.sessions.length === 0} onClick={crashBetween}>CRASH BETWEEN MUTATION AND TOKEN WRITE</button>
          <button style={S.btn(false, !(idle && w.instances.some(i => i.state === "running")))} disabled={!(idle && w.instances.some(i => i.state === "running"))} onClick={() => setW(x => ({ ...x, instances: x.instances.map(i => ({ ...i, state: "terminated" })), phase: "timedout", lastVerdict: null }))}>ANOTHER ACTOR TERMINATES THE INSTANCE<div style={{ color: "#6b7080", fontSize: 10 }}>then fire the late retry</div></button>
          <button style={S.btn(false, w.mode !== "token" || w.sessions.length === 0)} disabled={w.mode !== "token" || w.sessions.length === 0} onClick={() => setW(x => ({ ...x, sessions: [], expired: true, phase: "timedout", lastVerdict: null }))}>LET TOKEN RETENTION EXPIRE</button>
          <button style={{ ...S.btn(false, false), marginTop: 12 }} onClick={() => setW(initial())}>↺ RESET</button>
        </div>

        <div style={{ flex: "2 1 420px", minWidth: 300 }}>
          <div style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${verdict.c}`, background: `${verdict.c}14`, marginBottom: 12 }}>
            <div style={{ color: verdict.c, fontWeight: 700 }}>{verdict.code}</div>
            <div style={{ marginTop: 5, fontSize: 11.5, lineHeight: 1.6 }}>{verdict.t}</div>
          </div>
          <div style={S.panel}>
            <div style={S.label}>THE PROVIDER — EC2's SIDE OF THE CONTRACT</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              <div style={{ flex: 1, minWidth: 170, background: "#0c0d13", border: "1px solid #2a2f45", borderRadius: 6, padding: "8px 10px" }}>
                <div style={S.label}>IDEMPOTENT SESSIONS (customer, token) → instance</div>
                <div style={{ fontSize: 11, marginTop: 4, whiteSpace: "pre-line" }}>{w.sessions.length ? w.sessions.map(s => `acct-42 · ${s.key} → ${s.instanceId}`).join("\n") : "— no rows —"}</div>
              </div>
              <div style={{ flex: 1, minWidth: 150, background: "#0c0d13", border: "1px solid #2a2f45", borderRadius: 6, padding: "8px 10px" }}>
                <div style={S.label}>INSTANCES</div>
                <div style={{ fontSize: 11, marginTop: 4, whiteSpace: "pre-line" }}>{w.instances.length ? w.instances.map(i => `${i.id} · ${i.state}`).join("\n") : "— none —"}</div>
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              <div style={{ flex: 1 }}><div style={S.label}>RUNNING</div><div style={{ fontSize: 16, fontWeight: 700, color: running > 1 && !w.wantTwo ? RED : "#c8cdd8" }}>{running}</div></div>
              <div style={{ flex: 1 }}><div style={S.label}>SINGLETON INVARIANT</div><div style={{ fontSize: 16, fontWeight: 700, color: singletonViolated ? RED : GREEN }}>{singletonViolated ? "VIOLATED" : "holding"}</div></div>
              <div style={{ flex: 1 }}><div style={S.label}>ATOMICITY</div><div style={{ fontSize: 13, fontWeight: 700, color: w.atomic ? GREEN : RED }}>{w.atomic ? "one ACID unit" : "token written after"}</div></div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ color: "#6b7080", fontSize: 10, marginTop: 12, borderTop: "1px solid #2a2a3a", paddingTop: 8, lineHeight: 1.7 }}>
        The singleton-workload dilemma, the reconciliation critique (heavy lifting, and a found resource might be another process's), the synthetic-hash rejection (CreateTable vs RunInstances intent), the ClientToken contract with CloudTrail auditability and resource labeling, the session keyed on (customer, identifier), the token-plus-mutations ACID requirement with both failure orders named, semantic equivalence vs ResourceAlreadyExists (a client-side side effect), the SDK/CLI default token generation and invisible retries, the terminate-then-late-retry example replaying success with state 'terminated' (least astonishment), the lifetime-plus-interval retention policy, and the parameter-mismatch validation error are all from Malcolm Featonby's Builders' Library article. The session-table rendering and instance IDs here are illustrative.
        {" "}<a href="https://behindscale.com/articles/aws-idempotent-apis" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: "none" }}>From the full dissection at behindscale.com →</a>
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
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 8 }}><span style={lbl}>THE PROBLEM · </span>A RunInstances call that times out may have launched the instance — and for a singleton workload, the only recovery action, retrying, is exactly the action that can violate the at-most-one invariant. Reconciliation is heavy lifting that still can't prove whose instance you found.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>THE MOVE · </span>A caller-provided ClientToken declares intent (a parameter hash can't tell a retry from a customer who wants two identical instances); the provider records the token and every mutation as one ACID unit and replays semantically equivalent responses for the token's lifetime — even after the resource is deleted — so SDKs can retry invisibly by default.</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6 }}><span style={lbl}>TRY · </span>Cut the response and retry with no contract — two instances, one intent. Arm the token and watch the replay; break the atomicity and duplicate anyway; use the hash mode to dedupe your own real intent; terminate the instance and fire the late retry; let retention expire and meet the contract's clock.</div>
    </div>
  );
}
