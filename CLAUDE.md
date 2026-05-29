# behindscale — Claude Code Context

behindscale is a system design learning platform: it dissects top
engineering blog posts into structured summaries and interactive visual
artifacts, and tracks the reusable patterns across them. It is built as two
decoupled sub-systems in one repo — a build-time **pipeline** and a static
**website** — communicating only through generated files (the content
contract).

## Read First

Read the following files in order before implementing or making any
architectural decision:

1. `context/project-overview.md` — product definition, goals, features, scope
2. `context/architecture.md` — the two sub-systems, boundaries, storage model,
   and invariants
3. `context/ui-context.md` — theme (light shell + dark artifacts), color
   tokens, typography, layout
4. `context/code-standards.md` — implementation rules and conventions
5. `context/ai-workflow-rules.md` — development workflow, scoping, build order
6. `context/progress-tracker.md` — current phase, decisions, open questions,
   next steps

## Working Agreements

- Implement against the specs in the context files. Do not invent product
  behavior; resolve gaps in the context files first.
- Respect the system boundaries: never mix pipeline (`pipeline/`) and website
  (`src/`) work in one step, and never import across that boundary — they
  communicate only through `content/` and `public/artifacts/`.
- Uphold the invariants in `architecture.md`, especially: the website does no
  runtime network fetching (static-by-construction); each artifact renders in
  a sandboxed iframe and must fail in isolation; the pipeline is idempotent.
- Use the ui-context.md tokens — no hardcoded hex in `src/`.
- Never commit secrets; the Anthropic API key comes from `ANTHROPIC_API_KEY`.

## Keep In Sync

Update `context/progress-tracker.md` after each meaningful implementation
change. If implementation changes the architecture, scope, standards, or UI
tokens documented in the context files, update the relevant file before
continuing. Treat Claude prompt changes under `pipeline/prompts/` as
meaningful changes worth noting.
