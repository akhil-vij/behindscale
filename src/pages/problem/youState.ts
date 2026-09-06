// The host-side view of the mission's state that the comparison renders:
// once the reader's design has survived a day, the YOU column, the YOU
// diagram, and the interview ticks fill from the wall's youMapping().
// `commit` is the reader's locked-in sentence (persisted per wall).
export interface YouState {
  filled: boolean
  // youMapping() output: matrix row id / diagram slot -> string.
  cells: Readonly<Record<string, string>>
  // One flag per attack, in attack order.
  held: readonly boolean[]
  commit?: string
}

export const EMPTY_YOU: YouState = { filled: false, cells: {}, held: [] }
