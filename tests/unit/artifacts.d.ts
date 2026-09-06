// The unit suites render artifact SOURCES (content/artifacts/*.jsx) and
// import the rules module; vitest transforms them, tsc never sees tests/.
declare module '*.jsx' {
  import type { ComponentType } from 'react'
  const Artifact: ComponentType
  export default Artifact
}
declare module '*/problem-ambiguous-timeouts-rules.js' {
  export function dayTokens(q: Record<string, string | undefined>): unknown
  export default dayTokens
}
