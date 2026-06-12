import { useState, useMemo } from "react";

// ---------------------------------------------------------------------------
// behindscale artifact · stripe-idempotency (rebuild, sourced exclusively from
// https://stripe.com/blog/idempotency — failure taxonomy, key resolution,
// backoff + jitter. Mid-operation recovery is shown as the ACID-rollback case
// the post describes, with its implementation-dependence stated on screen.)
// ---------------------------------------------------------------------------

const ACCENT = "#6366F1";
const BG = "#08090D";
const PANEL = "#111118";
const BORDER = "#2a2a3a";
const TEXT = "#C8CDD8";
const MUTED = "#888";
const OK = "#22C55E";
const WARN = "#E09F3E";
const BAD = "#FF6B6B";

const ACTOR_STYLE = {
  client: { label: "CLIENT", color: "#A2B9EE" },
  net: { label: "NETWORK", color: BAD },
  server: { label: "SERVER", color: ACCENT },
};

// keys: contents of the server's idempotency-key table after this event
const SCENARIOS = [
  {
    id: "connect",
    title: "Connection fails",
    sub: "request never reaches the server",
    without: {
      events: [
        { who: "client", text: "POST /charges  ·  $20", tone: "info", keys: null },
        { who: "net", text: "✂ connection fails before reaching the server", tone: "bad", keys: null },
        { who: "client", text: "failure is definitive — nothing reached the server, retry is safe", tone: "info", keys: null },
        { who: "client", text: "retry: POST /charges  ·  $20", tone: "info", keys: null },
        { who: "server", text: "processes the charge → ch_1", tone: "ok", keys: null },
      ],
      verdict: { good: true, text: "Charged once — but only because this failure mode is unambiguous. The other two aren't." },
    },
    withKey: {
      events: [
        { who: "client", text: "POST /charges  ·  Idempotency-Key: agj6…X", tone: "info", keys: "— empty —" },
        { who: "net", text: "✂ connection fails before reaching the server", tone: "bad", keys: "— empty —" },
        { who: "client", text: "retry with the same key", tone: "info", keys: "— empty —" },
        { who: "server", text: "first time seeing key agj6…X → process normally", tone: "ok", keys: "agj6…X · seen, in flight" },
        { who: "server", text: "charge → ch_1  ·  result cached under the key", tone: "ok", keys: "agj6…X → ch_1 ✓ cached" },
      ],
      verdict: { good: true, text: "Charged once. The retry was simply the first request the server ever saw." },
    },
  },
  {
    id: "midop",
    title: "Crash mid-operation",
    sub: "the work is left in limbo",
    without: {
      events: [
        { who: "client", text: "POST /charges  ·  $20", tone: "info", keys: null },
        { who: "server", text: "begins fulfilling the operation…", tone: "info", keys: null },
        { who: "server", text: "💥 fails midway — the work is in limbo", tone: "bad", keys: null },
        { who: "client", text: "timeout. Did the charge happen? The client cannot tell.", tone: "warn", keys: null },
        { who: "client", text: "retry: POST /charges  ·  $20", tone: "warn", keys: null },
        { who: "server", text: "treats it as a brand-new charge → ch_2 (?)", tone: "bad", keys: null },
      ],
      verdict: { good: false, text: "Outcome unknown. If attempt 1's charge landed before the crash, the customer just paid twice." },
    },
    withKey: {
      events: [
        { who: "client", text: "POST /charges  ·  Idempotency-Key: agj6…X", tone: "info", keys: "— empty —" },
        { who: "server", text: "records the key, begins fulfilling the operation…", tone: "info", keys: "agj6…X · seen, in flight" },
        { who: "server", text: "💥 fails midway — interrupted attempt rolled back by the ACID database", tone: "bad", keys: "agj6…X · seen, no result" },
        { who: "client", text: "retry with the same key", tone: "info", keys: "agj6…X · seen, no result" },
        { who: "server", text: "key seen, no stored result → previous attempt rolled back, safe to retry wholesale", tone: "ok", keys: "agj6…X · seen, in flight" },
        { who: "server", text: "charge → ch_1  ·  result cached under the key", tone: "ok", keys: "agj6…X → ch_1 ✓ cached" },
      ],
      verdict: { good: true, text: "Charged once. The key told the server this was a retry of in-limbo work — and the rollback made wholesale re-execution safe. (The post is explicit: behavior in this case is heavily implementation-dependent.)" },
    },
  },
  {
    id: "response",
    title: "Response lost",
    sub: "the charge succeeded — the news didn't arrive",
    without: {
      events: [
        { who: "client", text: "POST /charges  ·  $20", tone: "info", keys: null },
        { who: "server", text: "charge succeeds → ch_1", tone: "ok", keys: null },
        { who: "net", text: "✂ connection breaks before the server can tell the client", tone: "bad", keys: null },
        { who: "client", text: "saw only an error — retries", tone: "warn", keys: null },
        { who: "server", text: "brand-new request, brand-new charge → ch_2", tone: "bad", keys: null },
      ],
      verdict: { good: false, text: "Double charge. The operation succeeded; only the news of it was lost." },
    },
    withKey: {
      events: [
        { who: "client", text: "POST /charges  ·  Idempotency-Key: agj6…X", tone: "info", keys: "— empty —" },
        { who: "server", text: "charge succeeds → ch_1  ·  result cached under the key", tone: "ok", keys: "agj6…X → ch_1 ✓ cached" },
        { who: "net", text: "✂ connection breaks before the server can tell the client", tone: "bad", keys: "agj6…X → ch_1 ✓ cached" },
        { who: "client", text: "retry with the same key", tone: "info", keys: "agj6…X → ch_1 ✓ cached" },
        { who: "server", text: "key has a cached result → replay it, execute nothing", tone: "ok", keys: "agj6…X → ch_1 ✓ cached" },
        { who: "client", text: "receives ch_1 — the same outcome as the original attempt", tone: "ok", keys: "agj6…X → ch_1 ✓ cached" },
      ],
      verdict: { good: true, text: "Charged once. For the server, the retry was a read." },
    },
  },
];

// deterministic PRNG so the herd re-rolls reproducibly per seed
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const toneColor = (tone) => (tone === "ok" ? OK : tone === "warn" ? WARN : tone === "bad" ? BAD : TEXT);

function Pill({ active, onClick, children, color = ACCENT, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        fontFamily: "inherit",
        fontSize: 11,
        padding: "6px 10px",
        borderRadius: 6,
        cursor: "pointer",
        border: `1px solid ${active ? color : BORDER}`,
        background: active ? `${color}22` : "transparent",
        color: active ? color : MUTED,
        transition: "all 120ms",
      }}
    >
      {children}
    </button>
  );
}

function RetryAnatomy() {
  const [scenarioIdx, setScenarioIdx] = useState(2);
  const [keyed, setKeyed] = useState(false);
  const [step, setStep] = useState(0);

  const scenario = SCENARIOS[scenarioIdx];
  const run = keyed ? scenario.withKey : scenario.without;
  const done = step >= run.events.length;
  const visible = run.events.slice(0, Math.min(step + 1, run.events.length));
  const currentKeys = keyed
    ? (visible.length ? visible[visible.length - 1].keys : "— empty —")
    : null;

  const pick = (i) => { setScenarioIdx(i); setStep(0); };
  const mode = (k) => { setKeyed(k); setStep(0); };

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        {SCENARIOS.map((s, i) => (
          <Pill key={s.id} active={i === scenarioIdx} onClick={() => pick(i)} title={s.sub}>
            {s.title}
          </Pill>
        ))}
        <span style={{ flex: 1 }} />
        <Pill active={!keyed} color={BAD} onClick={() => mode(false)}>no key</Pill>
        <Pill active={keyed} onClick={() => mode(true)}>Idempotency-Key</Pill>
      </div>

      <div style={{ fontSize: 11, color: MUTED, marginBottom: 12 }}>
        {scenario.title} — {scenario.sub}. Step through the attempt, then flip the key toggle and run the same crash again.
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
        {/* event log */}
        <div style={{ flex: "1 1 360px", minWidth: 0 }}>
          <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 12 }}>
            {visible.map((e, i) => {
              const actor = ACTOR_STYLE[e.who];
              const isCurrent = i === visible.length - 1 && !done;
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: 10,
                    padding: "7px 8px",
                    borderRadius: 6,
                    background: isCurrent ? `${ACCENT}14` : "transparent",
                    border: `1px solid ${isCurrent ? `${ACCENT}55` : "transparent"}`,
                    marginBottom: 4,
                  }}
                >
                  <span style={{ fontSize: 9, letterSpacing: 1.5, color: actor.color, minWidth: 62, paddingTop: 2 }}>
                    {actor.label}
                  </span>
                  <span style={{ fontSize: 12, lineHeight: 1.5, color: toneColor(e.tone) }}>{e.text}</span>
                </div>
              );
            })}
            {done && (
              <div
                style={{
                  marginTop: 8,
                  padding: "10px 12px",
                  borderRadius: 6,
                  fontSize: 12,
                  lineHeight: 1.6,
                  border: `1px solid ${run.verdict.good ? OK : BAD}`,
                  background: run.verdict.good ? "#11221a" : "#221114",
                  color: run.verdict.good ? "#95D5B2" : "#FFA8A8",
                }}
              >
                {run.verdict.good ? "✓ " : "✗ "}
                {run.verdict.text}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <Pill active onClick={() => setStep((s) => Math.min(s + 1, run.events.length))}>
              {done ? "done" : "next ▸"}
            </Pill>
            <Pill active={false} onClick={() => setStep(0)}>↺ reset</Pill>
          </div>
        </div>

        {/* server key table */}
        <div style={{ flex: "1 1 220px", minWidth: 0 }}>
          <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 9, letterSpacing: 2, color: MUTED, marginBottom: 8 }}>SERVER · IDEMPOTENCY-KEY TABLE</div>
            {keyed ? (
              <div style={{ fontSize: 12, color: currentKeys && currentKeys.includes("✓") ? OK : TEXT, lineHeight: 1.6 }}>
                {currentKeys}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.6 }}>
                (not in use — the server has no way to recognize a retry)
              </div>
            )}
          </div>
          <div style={{ fontSize: 10, color: MUTED, lineHeight: 1.7, marginTop: 10, padding: "0 2px" }}>
            Per HTTP semantics (RFC 7231), PUT and DELETE are idempotent by definition — fully-specified
            resources can be retried freely with no key at all. The key machinery exists for the operations
            that must happen exactly once: Stripe applies it to every mutating POST endpoint via the
            <span style={{ color: TEXT }}> Idempotency-Key</span> header.
          </div>
        </div>
      </div>
    </div>
  );
}

function ThunderingHerd() {
  const [n, setN] = useState(36);
  const [jitter, setJitter] = useState(false);
  const [seed, setSeed] = useState(7);

  const ATTEMPTS = 5; // waits ∝ 2^0 .. 2^4
  const WINDOW = 36; // seconds
  const BUCKET = 0.75;

  const { buckets, peak, capacity } = useMemo(() => {
    const rand = mulberry32(seed * 1000 + n * 7 + (jitter ? 1 : 0));
    const nb = Math.ceil(WINDOW / BUCKET);
    const counts = new Array(nb).fill(0);
    for (let c = 0; c < n; c++) {
      let t = 0;
      for (let a = 0; a < ATTEMPTS; a++) {
        const base = Math.pow(2, a);
        const wait = jitter ? rand() * base : base; // full jitter: rand(0, 2^n)
        t += wait;
        const b = Math.floor(t / BUCKET);
        if (b < nb) counts[b]++;
      }
    }
    return { buckets: counts, peak: Math.max(...counts), capacity: Math.max(3, Math.round(n / 7)) };
  }, [n, jitter, seed]);

  const maxBar = Math.max(peak, capacity) || 1;
  const overload = buckets.filter((b) => b > capacity).length;

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <Pill active={!jitter} color={BAD} onClick={() => setJitter(false)}>backoff only</Pill>
        <Pill active={jitter} color={OK} onClick={() => setJitter(true)}>backoff + jitter</Pill>
        <Pill active={false} onClick={() => setSeed((s) => s + 1)}>↻ re-roll</Pill>
        <span style={{ flex: 1 }} />
        <label style={{ fontSize: 10, color: MUTED, display: "flex", alignItems: "center", gap: 8 }}>
          clients: <span style={{ color: TEXT }}>{n}</span>
          <input
            type="range" min={12} max={72} value={n}
            onChange={(e) => setN(Number(e.target.value))}
            style={{ width: 110, accentColor: ACCENT }}
          />
        </label>
      </div>

      <div style={{ fontSize: 11, color: MUTED, marginBottom: 12, lineHeight: 1.6 }}>
        A server incident fails all {n} clients at t=0. Every client retries with exponential backoff
        (waits ∝ 2ⁿ). {jitter
          ? "With jitter, each wait is randomized — the same retries spread into a curve the server can absorb while it recovers."
          : "Without jitter, every client shares the same schedule — the retries arrive as synchronized waves that hammer the recovering server."}
      </div>

      <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "16px 12px 8px" }}>
        <div style={{ position: "relative", height: 150 }}>
          {/* capacity line */}
          <div style={{
            position: "absolute", left: 0, right: 0,
            bottom: `${(capacity / maxBar) * 130}px`,
            borderTop: `1px dashed ${WARN}`,
          }}>
            <span style={{ position: "absolute", right: 0, top: -14, fontSize: 9, color: WARN }}>
              server capacity ({capacity}/bucket)
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 150 }}>
            {buckets.map((b, i) => (
              <div
                key={i}
                title={`t≈${(i * BUCKET).toFixed(1)}s · ${b} retries`}
                style={{
                  flex: 1,
                  height: `${(b / maxBar) * 130}px`,
                  minHeight: b > 0 ? 2 : 0,
                  borderRadius: "2px 2px 0 0",
                  background: b > capacity ? BAD : b > 0 ? (jitter ? OK : ACCENT) : "transparent",
                  opacity: b > capacity ? 0.95 : 0.75,
                }}
              />
            ))}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: MUTED, marginTop: 6 }}>
          <span>t=0 · incident</span><span>{Math.round(WINDOW / 2)}s</span><span>{WINDOW}s</span>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 12, fontSize: 11 }}>
        <span style={{ color: peak > capacity ? BAD : OK }}>
          peak: {peak} retries/bucket {peak > capacity ? `— ${Math.round(peak / capacity)}× over capacity` : "— within capacity"}
        </span>
        <span style={{ color: overload > 0 ? BAD : OK }}>
          {overload > 0 ? `${overload} overloaded windows — each wave can re-fail its clients` : "no overloaded windows"}
        </span>
      </div>

      <div style={{ fontSize: 10, color: MUTED, lineHeight: 1.7, marginTop: 10 }}>
        Same clients, same backoff, same total retries — the only variable is randomness in the waits.
        Stripe's Ruby client library ships the full combination by default: automatic retries with an
        idempotency key, increasing backoff, and jitter.
      </div>
    </div>
  );
}

export default function StripeIdempotency() {
  const [tab, setTab] = useState("anatomy");
  return (
    <div style={{
      fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
      background: BG, color: TEXT, minHeight: "100vh",
      padding: "20px 16px", boxSizing: "border-box",
    }}>
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, letterSpacing: 4, color: ACCENT, marginBottom: 6, textTransform: "uppercase" }}>
            Stripe · API design
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#F0F0F5", margin: 0, lineHeight: 1.3 }}>
            Idempotency in an Unreliable Network
          </h1>
          <p style={{ fontSize: 12, color: MUTED, marginTop: 6, lineHeight: 1.6, maxWidth: 640 }}>
            A network call fails three ways: before arrival, mid-operation, or after success with the
            response lost. Crash a charge at each point — with and without an idempotency key.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <Pill active={tab === "anatomy"} onClick={() => setTab("anatomy")}>① anatomy of a retry</Pill>
          <Pill active={tab === "herd"} onClick={() => setTab("herd")}>② thundering herd</Pill>
        </div>

        {tab === "anatomy" ? <RetryAnatomy /> : <ThunderingHerd />}

        <div style={{ fontSize: 9, color: "#555", marginTop: 20, lineHeight: 1.6, borderTop: `1px solid ${BORDER}`, paddingTop: 10 }}>
          All mechanics from the source post. Mid-operation recovery is shown as the ACID-rollback case
          the post describes and is, in the post's own words, heavily implementation-dependent.
        </div>
      </div>
    </div>
  );
}
