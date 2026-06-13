import { useState } from "react";

const sections = [
  { id: "evolution", label: "2017 → 2025" },
  { id: "2017", label: "2017 Architecture" },
  { id: "cracks", label: "The Four Cracks" },
  { id: "2025", label: "2025 Redesign" },
  { id: "bfg", label: "BFG Deep Dive" },
];

const cracks = [
  {
    id: "redis-drops",
    title: "Redis queue dropped messages",
    color: "#ef4444",
    icon: "💧",
    summary: "Indexing queue under sustained pressure → Redis CPU saturation → silent message drops.",
    detail: "When Elasticsearch nodes failed, the indexing queue backed up. Once Redis hit CPU saturation, messages began silently dropping. The original design treated Redis as a lightweight buffer — appropriate for the original scale, but indexing traffic had grown past what Redis as a buffer could absorb without loss.",
    fix: "Migrate to PubSub. Guaranteed delivery, tolerates large backlogs without dropping. Elasticsearch failures now produce indexing slowdowns rather than data loss.",
  },
  {
    id: "fanout",
    title: "Bulk indexing fault-intolerant",
    color: "#f97316",
    icon: "🌪",
    summary: "One batch of 50 messages could touch 50 nodes. Any single node failure → entire batch fails.",
    detail: "Elasticsearch bulk-operation semantics: the entire operation is considered failed if any single message fails. With a 100-node cluster and 50-item batches, a single failed node caused approximately 40% of bulk operations to fail. The fanout amplification turned single-point failures into fleet-wide indexing degradation.",
    fix: "Route messages by destination (cluster + index) before bulk indexing. Each bulk operation now targets exactly one Elasticsearch node. A single-node failure affects only its own destination's batches.",
  },
  {
    id: "coordination",
    title: "Cluster coordination overhead",
    color: "#eab308",
    icon: "⚙",
    summary: "200+ node clusters → master node OOM → indexing failures, query timeouts, cascading degradation.",
    detail: "Elasticsearch cluster-state grows with the number of nodes and indices. As Discord's clusters scaled past 200 nodes, the master node's coordination work began causing OOM crashes. The crashes triggered indexing failures, growing backlogs, query timeouts — and the kind of cascading failure modes that are operationally difficult to recover from quickly.",
    fix: "Forty smaller clusters instead of two large ones, grouped into logical 'cells.' Each cluster small enough that master coordination overhead stays bounded.",
  },
  {
    id: "upgrades",
    title: "No path to rolling restarts",
    color: "#a78bfa",
    icon: "🔒",
    summary: "log4shell patching required taking the entire search system offline. No graceful upgrade path.",
    detail: "The 200+ node clusters required graceful node-by-node restarts that would have taken prohibitively long. The team was locked into legacy OS and Elasticsearch versions. The log4shell vulnerability brought this to a head: patching required taking the entire search system offline for a maintenance window because no rolling-restart strategy was operationally feasible.",
    fix: "Elasticsearch on Kubernetes via the ECK operator. Automated OS upgrades. Ergonomic tooling for rolling restarts. The smaller clusters make graceful rolls feasible.",
  },
  {
    id: "max-doc",
    title: "Lucene MAX_DOC limit",
    color: "#06b6d4",
    icon: "📛",
    summary: "Indices approaching 2B documents → all indexing operations fail.",
    detail: "Lucene's MAX_DOC limit is approximately 2 billion documents per index. Discord's largest guilds were beginning to approach this limit; once an index hit MAX_DOC, all indexing to that index failed. The original workaround was identifying and deleting spam guilds, but legitimate communities were accumulating similar message counts.",
    fix: "'Big Freaking Guilds' (BFGs) get a dedicated cell with multi-shard indices. Spread across multiple primary shards to scale past the per-shard MAX_DOC limit.",
  },
];

const components2017 = [
  { name: "Message Queue", impl: "Redis", role: "Real-time message buffering", color: "#ef4444" },
  { name: "Index Workers", impl: "Python/Celery", role: "Pull batches, bulk-index to Elasticsearch", color: "#a78bfa" },
  { name: "Shard Mapping", impl: "Cassandra + Redis cache", role: "Persistent guild→shard, cached for hot reads", color: "#3b82f6" },
  { name: "Shard Allocator", impl: "Redis sorted set", role: "Weighted assignment of new guilds to less-loaded shards", color: "#06b6d4" },
  { name: "Service Discovery", impl: "etcd", role: "Cluster topology and node discovery", color: "#eab308" },
  { name: "Search API", impl: "Python", role: "Query routing, permission checks", color: "#f97316" },
  { name: "Storage", impl: "2 Elasticsearch clusters", role: "Each guild's messages on one Shard (cluster+index)", color: "#22c55e" },
];

const cells2025 = [
  {
    name: "guild-messages",
    purpose: "Messages from regular guilds",
    sharding: "by guild_id",
    color: "#5865F2",
    detail: "The largest cell. Messages sharded by guild_id, single-primary-shard indices (optimized for query performance — all of a guild's messages on one node).",
  },
  {
    name: "user-dm-messages",
    purpose: "Direct messages, sharded by user",
    sharding: "by user_id",
    color: "#06b6d4",
    detail: "Enables cross-DM search. Each DM message indexed twice (once per recipient's user_id-sharded index) — 2x storage, but eliminates the query-time fanout problem.",
  },
  {
    name: "BFG cell",
    purpose: "Big Freaking Guilds approaching MAX_DOC",
    sharding: "by guild_id, multi-shard",
    color: "#f97316",
    detail: "Dedicated cell for outlier guilds. Multi-primary-shard indices accept query coordination overhead in exchange for scaling past Lucene's 2B-document limit per shard.",
  },
];

const bfgFlow = [
  { step: 1, label: "Identify BFG", detail: "A guild's message count approaches Lucene's MAX_DOC threshold on its current index." },
  { step: 2, label: "Create new index", detail: "New index in the BFG cell, with 2x the primary shard count of the current index." },
  { step: 3, label: "Dual-index", detail: "New messages now written to BOTH the old index AND the new BFG index." },
  { step: 4, label: "Historical reindex", detail: "Background job copies the guild's existing messages from the old index into the new BFG index. Queries still served from old index." },
  { step: 5, label: "Cutover queries", detail: "Once historical reindex completes and the new BFG index is verified, query traffic switches to the new index." },
  { step: 6, label: "Cleanup", detail: "Stop writing to the old index. Delete the guild's data from it. Old index returns capacity for other guilds." },
];

function Architecture2017View() {
  return (
    <div>
      <p style={{ fontSize: 12, color: "#c0c0cc", lineHeight: 1.7, marginBottom: 14 }}>
        Discord's 2017 architecture (documented by Jake Heinz) routed messages in application code to a pool of smaller Elasticsearch clusters. The team explicitly rejected having Elasticsearch shard internally — a decision that would prove central to the system's future evolution.
      </p>
      <div style={{
        background: "#111118",
        border: "1px solid #5865F240",
        borderRadius: 8,
        padding: "14px 16px",
        marginBottom: 14,
      }}>
        <div style={{ fontSize: 10, color: "#5865F2", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10, fontWeight: 600 }}>
          The Core Decision
        </div>
        <p style={{ fontSize: 11.5, color: "#c0c0cc", margin: 0, lineHeight: 1.7 }}>
          Each guild's messages live on a single <strong style={{ color: "#f0f0f5" }}>Shard</strong> — Discord's term for a (cluster, index) pair. Application-layer routing maps guild_id → Shard. Elasticsearch sees only the operations it's told to perform; it doesn't make routing decisions on the application's behalf.
        </p>
      </div>
      <div style={{ fontSize: 10, color: "#666", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, fontWeight: 600 }}>
        Components
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {components2017.map((c) => (
          <div key={c.name} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "8px 12px", borderRadius: 5,
            background: `${c.color}10`, border: `1px solid ${c.color}25`,
          }}>
            <span style={{ fontSize: 11.5, color: c.color, fontWeight: 700, minWidth: 130 }}>{c.name}</span>
            <span style={{ fontSize: 10, color: "#888", minWidth: 130 }}>{c.impl}</span>
            <span style={{ fontSize: 11, color: "#c0c0cc", flex: 1 }}>{c.role}</span>
          </div>
        ))}
      </div>
      <div style={{
        marginTop: 14, padding: "12px 14px",
        background: "#111118", borderRadius: 6, borderLeft: "3px solid #5865F2",
      }}>
        <div style={{ fontSize: 10, color: "#5865F2", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6, fontWeight: 600 }}>
          What worked for 8 years
        </div>
        <div style={{ fontSize: 11.5, color: "#c0c0cc", lineHeight: 1.7 }}>
          The system grew to ~26 billion documents across 14 nodes in 2 clusters, with stable performance and minimal operational intervention. Median latency held steady as the library grew. The application-layer-sharding decision was vindicated: Discord retained operational control over its storage and could evolve the strategy without depending on Elasticsearch's coordination.
        </div>
      </div>
    </div>
  );
}

function CracksView() {
  const [selected, setSelected] = useState(cracks[0].id);
  const c = cracks.find((x) => x.id === selected);

  return (
    <div>
      <p style={{ fontSize: 12, color: "#c0c0cc", lineHeight: 1.7, marginBottom: 14 }}>
        By 2024, the 2017 architecture had reached five specific limits. None were design errors — they were the boundaries of choices that had been correct at the original scale. Click each to see the failure mode and the redesign's response.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
        {cracks.map((crack) => (
          <button
            key={crack.id}
            onClick={() => setSelected(crack.id)}
            style={{
              textAlign: "left",
              padding: "10px 14px",
              borderRadius: 6,
              border: `1px solid ${selected === crack.id ? crack.color + "80" : "#2a2a3a"}`,
              background: selected === crack.id ? `${crack.color}15` : "#0c0d13",
              cursor: "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span style={{ fontSize: 16 }}>{crack.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11.5, color: selected === crack.id ? "#f0f0f5" : "#c0c0cc", fontWeight: 600, marginBottom: 2 }}>
                {crack.title}
              </div>
              <div style={{ fontSize: 10, color: "#888", lineHeight: 1.5 }}>{crack.summary}</div>
            </div>
          </button>
        ))}
      </div>
      <div style={{
        background: "#111118",
        border: `1px solid ${c.color}50`,
        borderRadius: 8,
        padding: "14px 16px",
      }}>
        <div style={{ fontSize: 10, color: c.color, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, fontWeight: 600 }}>
          What happened
        </div>
        <p style={{ fontSize: 11.5, color: "#c0c0cc", margin: "0 0 14px 0", lineHeight: 1.7 }}>{c.detail}</p>
        <div style={{ padding: "10px 12px", background: "#08090D", borderRadius: 5, border: `1px solid ${c.color}30` }}>
          <div style={{ fontSize: 10, color: "#22c55e", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6, fontWeight: 600 }}>
            How the 2025 redesign solves it
          </div>
          <div style={{ fontSize: 11, color: "#c0c0cc", lineHeight: 1.7 }}>{c.fix}</div>
        </div>
      </div>
    </div>
  );
}

function Redesign2025View() {
  const [selected, setSelected] = useState(0);
  const cell = cells2025[selected];
  return (
    <div>
      <p style={{ fontSize: 12, color: "#c0c0cc", lineHeight: 1.7, marginBottom: 14 }}>
        Two large clusters became forty smaller ones, grouped into logical <strong style={{ color: "#f0f0f5" }}>cells</strong> dedicated to specific use cases. Application-layer sharding is preserved; everything else was replaced.
      </p>
      <div style={{
        background: "#111118",
        border: "1px solid #5865F240",
        borderRadius: 8,
        padding: "14px 16px",
        marginBottom: 14,
      }}>
        <div style={{ fontSize: 10, color: "#5865F2", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10, fontWeight: 600 }}>
          The Cell Concept
        </div>
        <p style={{ fontSize: 11.5, color: "#c0c0cc", margin: "0 0 10px 0", lineHeight: 1.7 }}>
          A cell is a logical group of Elasticsearch clusters dedicated to a specific use case. Each cluster within a cell runs dedicated ingest, master-eligible, and data nodes, with zone-aware shard allocation. Each cell can be tuned for its workload independently.
        </p>
        <div style={{ fontSize: 10, color: "#888", lineHeight: 1.6, fontStyle: "italic" }}>
          Click a cell to see its purpose and sharding strategy.
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {cells2025.map((c, i) => (
          <button
            key={c.name}
            onClick={() => setSelected(i)}
            style={{
              flex: "1 1 auto", minWidth: 120,
              padding: "10px 12px",
              borderRadius: 6,
              border: `1px solid ${selected === i ? c.color : "#2a2a3a"}`,
              background: selected === i ? `${c.color}18` : "#0c0d13",
              cursor: "pointer",
              fontFamily: "inherit",
              textAlign: "left",
            }}
          >
            <div style={{ fontSize: 11, color: c.color, fontWeight: 700, marginBottom: 3 }}>{c.name}</div>
            <div style={{ fontSize: 9, color: "#888", letterSpacing: 1, textTransform: "uppercase" }}>{c.sharding}</div>
          </button>
        ))}
      </div>
      <div style={{
        background: "#111118",
        border: `1px solid ${cell.color}50`,
        borderRadius: 8,
        padding: "14px 16px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 9, color: cell.color, letterSpacing: 2, textTransform: "uppercase", fontWeight: 700, padding: "2px 6px", background: `${cell.color}20`, borderRadius: 3 }}>
            {cell.sharding}
          </span>
          <span style={{ fontSize: 12.5, color: "#f0f0f5", fontWeight: 600 }}>{cell.purpose}</span>
        </div>
        <p style={{ fontSize: 11.5, color: "#c0c0cc", margin: 0, lineHeight: 1.7 }}>{cell.detail}</p>
      </div>
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 10, color: "#22c55e", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, fontWeight: 600 }}>
          Production Results
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[
            { value: "trillions", unit: "messages indexed", label: "from billions", color: "#5865F2" },
            { value: "2x", unit: "indexing throughput", label: "vs 2017 architecture", color: "#22c55e" },
            { value: "<100ms", unit: "median latency", label: "from 500ms", color: "#06b6d4" },
            { value: "<500ms", unit: "p99 latency", label: "from 1 second", color: "#a78bfa" },
            { value: "40", unit: "clusters", label: "from 2", color: "#f97316" },
          ].map((m) => (
            <div key={m.unit} style={{
              flex: "1 1 110px",
              padding: "8px 10px", textAlign: "center",
              background: `${m.color}10`, borderRadius: 5, border: `1px solid ${m.color}25`,
            }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: m.color }}>{m.value}</div>
              <div style={{ fontSize: 9, color: m.color, opacity: 0.85 }}>{m.unit}</div>
              <div style={{ fontSize: 9, color: "#888", marginTop: 3 }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BFGView() {
  const [step, setStep] = useState(0);
  const s = bfgFlow[step];
  return (
    <div>
      <p style={{ fontSize: 12, color: "#c0c0cc", lineHeight: 1.7, marginBottom: 14 }}>
        Lucene's <strong style={{ color: "#f0f0f5" }}>MAX_DOC limit (≈2 billion documents per index)</strong> threatened indexing for guilds approaching the limit. The BFG cell handles outliers with multi-shard indices, with a careful reindexing flow that keeps the system available throughout.
      </p>
      <div style={{
        background: "#111118",
        border: "1px solid #f9731640",
        borderRadius: 8,
        padding: "14px 16px",
        marginBottom: 14,
      }}>
        <div style={{ fontSize: 10, color: "#f97316", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, fontWeight: 600 }}>
          Why dedicated cells for outliers
        </div>
        <p style={{ fontSize: 11.5, color: "#c0c0cc", margin: 0, lineHeight: 1.7 }}>
          Most Discord guilds fit comfortably under MAX_DOC and benefit from single-shard indices (faster queries, no coordination overhead). A small number of very-large guilds need multi-shard indices to scale past MAX_DOC, accepting the query-time coordination cost. Giving BFGs a dedicated cell isolates their multi-shard cost from the rest of the workload.
        </p>
      </div>
      <div style={{ fontSize: 10, color: "#666", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10, fontWeight: 600 }}>
        Reindexing Flow
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 14, flexWrap: "wrap" }}>
        {bfgFlow.map((b, i) => (
          <button
            key={b.step}
            onClick={() => setStep(i)}
            style={{
              padding: "7px 11px", fontSize: 11, fontFamily: "inherit",
              border: `1px solid ${step === i ? "#f97316" : "#2a2a3a"}`,
              borderRadius: 4,
              background: step === i ? "#f9731618" : "transparent",
              color: step === i ? "#f97316" : "#666",
              cursor: "pointer",
            }}
          >
            {b.step}
          </button>
        ))}
      </div>
      <div style={{
        background: "#111118",
        border: "1px solid #f9731650",
        borderRadius: 8,
        padding: "14px 16px",
      }}>
        <div style={{ fontSize: 10, color: "#f97316", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6, fontWeight: 600 }}>
          Step {s.step}: {s.label}
        </div>
        <p style={{ fontSize: 11.5, color: "#c0c0cc", margin: 0, lineHeight: 1.7 }}>{s.detail}</p>
      </div>
      <div style={{
        marginTop: 14, padding: "10px 12px",
        background: "#22c55e15", borderRadius: 6, border: "1px solid #22c55e30",
      }}>
        <div style={{ fontSize: 10, color: "#22c55e", letterSpacing: 2, textTransform: "uppercase", marginBottom: 4, fontWeight: 600 }}>
          Why dual-indexing matters
        </div>
        <div style={{ fontSize: 11, color: "#c0c0cc", lineHeight: 1.7 }}>
          The dual-write period (step 3) ensures the new index catches up with reality before queries cut over. The system never goes through a state where new messages would be lost or where queries would return incomplete results. Operational complexity in exchange for zero-downtime reindexing of guilds with billions of messages.
        </div>
      </div>
    </div>
  );
}

// Centerpiece view for the Discord evolution article.
// The throughline the article is built on: the 2017 architecture was correct
// for its scale; specific components reached the boundaries of their design;
// the 2025 redesign replaced each one while PRESERVING the foundational
// application-layer-sharding decision. This view makes that legible:
// per-component, what 2017 chose, why it was right, what limit it hit, and
// what 2025 replaced it with — plus the one row that didn't change.

const EVOLUTION_ACCENT = "#5865F2";

const EVOLUTION_ROWS = [
  {
    id: "sharding",
    component: "Sharding strategy",
    preserved: true,
    y2017: "Application-layer routing: guild_id → (cluster, index)",
    y2025: "Unchanged — still application-layer routing",
    why: "Rejecting Elasticsearch's internal sharding in 2017 gave Discord operational control over where data lived. That control is exactly what made the 2025 redesign possible without depending on Elasticsearch's coordination — the team could re-route by changing the mapping layer, not by waiting for the engine to rebalance.",
    limit: "No limit. This is the decision the whole redesign was built to preserve. The 2025 post's framing: the foundation was right; everything resting on it had to change.",
  },
  {
    id: "queue",
    component: "Indexing queue",
    y2017: "Celery task queue; Redis as shard-mapping cache + refresh tracking",
    y2025: "Google Cloud PubSub — guaranteed delivery, tolerates large backlogs",
    why: "In 2017 the ingest path was a Celery queue feeding bulk-index workers, with Redis serving the shard-mapping cache. A lightweight buffer was the right tool for the launch-era volume.",
    limit: "By 2024 the indexing queue had grown into a workload that, when Elasticsearch nodes failed and the queue backed up, drove Redis to CPU saturation — at which point messages were silently dropped. A buffer's failure mode (drop under pressure) is unacceptable for the source of truth for search indexing.",
    pattern: "queue-with-guaranteed-delivery",
  },
  {
    id: "bulk",
    component: "Bulk indexing",
    y2017: "Batch messages from the queue; one bulk op may fan out to many nodes",
    y2025: "Rust+tokio router: one task per (cluster, index); each bulk op targets one node",
    why: "Batching is the throughput-optimal write path for Elasticsearch, and in a small cluster a bulk operation fanning across nodes is fine — the odds any node is down are low.",
    limit: "Elasticsearch fails a whole bulk op if any single message in it fails. At 100 nodes, a 50-message batch spread across the cluster means a single dead node fails ~40% of bulk operations (1 − (99/100)^50). The fanout turned single-node failures into fleet-wide indexing degradation — the failure mode scaled worse as the cluster grew.",
    pattern: "batched-routing-by-destination",
  },
  {
    id: "clusters",
    component: "Cluster topology",
    y2017: "Two large clusters, 14 nodes; grow by adding nodes",
    y2025: "~40 small clusters grouped into logical cells, per use case",
    why: "Two clusters were simple to operate and 'add a node' satisfied the linear-scalability requirement cleanly. For 26 billion documents, this was comfortably within range.",
    limit: "Past ~200 nodes, the master node's cluster-state coordination work grew faster than serving capacity — OOM crashes cascaded into indexing failures, backlogs, and query timeouts. Coordination overhead, not raw capacity, became the wall.",
    pattern: "cell-architecture",
  },
  {
    id: "upgrades",
    component: "Upgrades & restarts",
    y2017: "Manual; node-by-node graceful restarts on a 2-cluster fleet",
    y2025: "Elastic Cloud on Kubernetes (ECK) operator; automated rolling restarts",
    why: "With two clusters, manual operations were tolerable, and the team optimized for not running infrastructure it didn't have to.",
    limit: "On 200+ node clusters, graceful node-by-node restarts would have taken prohibitively long, freezing the team on legacy OS and Elasticsearch versions. log4shell was the breaking point: patching required taking all of search offline for a maintenance window — there was no rolling-restart path.",
    pattern: "cell-architecture",
  },
  {
    id: "maxdoc",
    component: "Largest-guild ceiling",
    y2017: "One primary shard per index (optimal for query performance)",
    y2025: "'BFG' cell with multi-shard indices for guilds near the limit",
    why: "A single primary shard per index keeps every guild's messages on one node — optimal for query performance, and far below any limit for an ordinary guild.",
    limit: "Lucene's MAX_DOC (~2 billion docs/index) was reachable by Discord's largest guilds; once hit, all indexing to that index failed. The original workaround — find and delete spam guilds — didn't scale once legitimate communities started approaching the same counts.",
    pattern: "cell-architecture",
  },
];

function EvolutionDiff() {
  const [openId, setOpenId] = useState("sharding");
  const [lens, setLens] = useState("2017"); // "2017" | "2025"

  return (
    <div>
      <p style={{ fontSize: 12, color: "#c0c0cc", lineHeight: 1.7, marginBottom: 12 }}>
        Eight years separate the two architectures. Flip the lens to read the system as it stood in each
        era, then open any component to see why the 2017 choice was right, the specific limit it reached,
        and what 2025 replaced it with. One row never changed — that's the point of the whole story.
      </p>

      {/* lens toggle */}
      <div style={{ display: "inline-flex", gap: 0, marginBottom: 14, border: `1px solid ${EVOLUTION_ACCENT}40`, borderRadius: 6, overflow: "hidden" }}>
        {[["2017", "2017 · correct for its scale"], ["2025", "2025 · re-architected"]].map(([id, label]) => (
          <button key={id} onClick={() => setLens(id)} style={{
            padding: "6px 12px", fontSize: 10.5, fontFamily: "inherit", cursor: "pointer", border: "none",
            background: lens === id ? `${EVOLUTION_ACCENT}25` : "transparent",
            color: lens === id ? "#fff" : "#777",
          }}>{label}</button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {EVOLUTION_ROWS.map((r) => {
          const open = openId === r.id;
          const accent = r.preserved ? "#22c55e" : EVOLUTION_ACCENT;
          return (
            <div key={r.id} style={{
              border: `1px solid ${open ? accent + "70" : "#2a2a3a"}`,
              borderRadius: 7, overflow: "hidden",
              background: open ? "#111118" : "#0c0d13",
            }}>
              <button onClick={() => setOpenId(open ? "" : r.id)} style={{
                width: "100%", textAlign: "left", cursor: "pointer", fontFamily: "inherit",
                background: "transparent", border: "none", padding: "10px 12px",
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <span style={{ fontSize: 11.5, color: "#f0f0f5", fontWeight: 600, minWidth: 150 }}>{r.component}</span>
                <span style={{ flex: 1, fontSize: 10.5, color: lens === "2017" ? "#c0c0cc" : "#777" }}>
                  {lens === "2017" ? r.y2017 : r.y2025}
                </span>
                {r.preserved
                  ? <span style={{ fontSize: 8, letterSpacing: 1, color: "#22c55e", border: "1px solid #22c55e50", borderRadius: 3, padding: "2px 6px" }}>PRESERVED</span>
                  : <span style={{ fontSize: 8, letterSpacing: 1, color: EVOLUTION_ACCENT, border: `1px solid ${EVOLUTION_ACCENT}50`, borderRadius: 3, padding: "2px 6px" }}>REPLACED</span>}
              </button>

              {open && (
                <div style={{ padding: "0 12px 12px" }}>
                  {/* side-by-side */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                    <div style={{ flex: "1 1 200px", background: "#08090D", borderRadius: 5, padding: "9px 11px", border: "1px solid #2a2a3a" }}>
                      <div style={{ fontSize: 8.5, letterSpacing: 1.5, color: "#666", marginBottom: 4 }}>2017</div>
                      <div style={{ fontSize: 11, color: "#c0c0cc", lineHeight: 1.5 }}>{r.y2017}</div>
                    </div>
                    <div style={{ flex: "1 1 200px", background: "#08090D", borderRadius: 5, padding: "9px 11px", border: `1px solid ${accent}30` }}>
                      <div style={{ fontSize: 8.5, letterSpacing: 1.5, color: accent, marginBottom: 4 }}>2025</div>
                      <div style={{ fontSize: 11, color: "#c0c0cc", lineHeight: 1.5 }}>{r.y2025}</div>
                    </div>
                  </div>

                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 9, letterSpacing: 1.5, color: "#22c55e", marginBottom: 3, textTransform: "uppercase" }}>Why 2017 was right</div>
                    <div style={{ fontSize: 11, color: "#c0c0cc", lineHeight: 1.65 }}>{r.why}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, letterSpacing: 1.5, color: r.preserved ? "#22c55e" : "#ef4444", marginBottom: 3, textTransform: "uppercase" }}>
                      {r.preserved ? "Why it survived" : "The limit it reached"}
                    </div>
                    <div style={{ fontSize: 11, color: "#c0c0cc", lineHeight: 1.65 }}>{r.limit}</div>
                  </div>

                  {r.pattern && (
                    <div style={{ marginTop: 10, fontSize: 9.5, color: "#777" }}>
                      pattern: <span style={{ color: accent }}>{r.pattern}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 14, padding: "11px 13px", background: "#111118", borderRadius: 6, borderLeft: "3px solid #22c55e" }}>
        <div style={{ fontSize: 9.5, letterSpacing: 2, color: "#22c55e", textTransform: "uppercase", marginBottom: 5, fontWeight: 600 }}>
          The throughline
        </div>
        <p style={{ fontSize: 11.5, color: "#c0c0cc", margin: 0, lineHeight: 1.7 }}>
          Five components replaced, one preserved — and the preserved one is load-bearing. Application-layer
          sharding wasn't just still correct in 2025; it was the decision that <em>made the rewrite
          possible</em>. The lesson for the reader isn't "Discord rebuilt search." It's that an architecture
          ages component by component, that reaching a design's boundary is not the same as having chosen
          wrong, and that the choices which preserve your freedom to change are the ones worth getting right
          early.
        </p>
      </div>
    </div>
  );
}

export default function DiscordTrillionsMessageSearch() {
  const [section, setSection] = useState("evolution");
  return (
    <div style={{
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      background: "#08090D",
      color: "#C8CDD8",
      minHeight: "100vh",
      padding: "20px 16px",
      boxSizing: "border-box",
    }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, letterSpacing: 4, color: "#5865F2", marginBottom: 6, textTransform: "uppercase" }}>
            Discord · Search Infrastructure
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#f0f0f5", margin: 0, lineHeight: 1.3 }}>
            How Discord Indexes Trillions of Messages
          </h1>
          <p style={{ fontSize: 12, color: "#888", marginTop: 6, lineHeight: 1.6 }}>
            Eight years and three orders of magnitude separate Discord's original 2017 search architecture from its 2025 redesign. The application-layer-sharding decision is preserved; everything else was rebuilt.
          </p>
        </div>

        <div style={{
          background: "#111118",
          border: "1px solid #2a2a3a",
          borderRadius: 8,
          padding: "14px 16px",
          marginBottom: 18,
          borderLeft: "3px solid #5865F2",
        }}>
          <div style={{ fontSize: 10, color: "#5865F2", letterSpacing: 2, marginBottom: 6, textTransform: "uppercase" }}>
            The Key Insight
          </div>
          <p style={{ fontSize: 12, color: "#c0c0cc", margin: 0, lineHeight: 1.7 }}>
            The 2017 design wasn't wrong — it served well for eight years. The 2025 redesign isn't a correction; it's the next iteration of a system that grew into the boundaries of its original choices. The decision the team got right early (application-layer routing) is the one that made the later redesign possible.
          </p>
        </div>

        <div style={{ display: "flex", gap: 4, marginBottom: 18, flexWrap: "wrap" }}>
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              style={{
                padding: "7px 12px", fontSize: 11, fontFamily: "inherit",
                border: `1px solid ${section === s.id ? "#5865F2" : "#2a2a3a"}`,
                borderRadius: 6,
                background: section === s.id ? "#5865F218" : "transparent",
                color: section === s.id ? "#5865F2" : "#666",
                cursor: "pointer",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {section === "evolution" && <EvolutionDiff />}
        {section === "2017" && <Architecture2017View />}
        {section === "cracks" && <CracksView />}
        {section === "2025" && <Redesign2025View />}
        {section === "bfg" && <BFGView />}
      </div>
    </div>
  );
}
