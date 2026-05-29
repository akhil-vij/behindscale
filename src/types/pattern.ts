export interface PatternReference {
  slug: string
  note: string
}

export interface PatternDefinition {
  slug: string
  name: string
  definition: string
  whenItApplies: string[]
  tradeoffs: string[]
  category?: string
}
