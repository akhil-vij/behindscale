import type { Source } from './source'
import type { PatternDefinition } from './pattern'

export interface PatternLibraryArticleRef {
  slug: string
  title: string
  source: Source
  note: string
}

export interface PatternLibraryEntry {
  definition: PatternDefinition
  frequency: number
  articles: PatternLibraryArticleRef[]
  companies: string[]
}

export interface PatternLibrary {
  generatedAt: string
  entries: PatternLibraryEntry[]
}
