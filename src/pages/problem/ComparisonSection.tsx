import { Link } from 'react-router-dom'
import type {
  ProblemComparison,
  ProblemMatrixCell,
  ProblemQuestion,
} from '../../types'
import { escapeHtml, pp } from './inline'
import type { YouState } from './youState'

// The hint sheet: burden spectrum, the anatomy strip (N company rows + the
// YOU row), the at-a-glance matrix (N columns + the YOU column), and the
// full answers. Everything company-specific is content; the YOU cells and
// diagram slots fill from `you` (the host's view of the mission state,
// computed by the wall module's youMapping()). Both YOU empty states render
// verbatim from content: the column header + the empty-diagram SVG.
interface ComparisonSectionProps {
  comparison: ProblemComparison
  // Inline SVG sources keyed by name (content/problems/<cruxTag>/<name>.svg).
  svg: (name: string) => string | undefined
  you: YouState
  // Columns (company display names) currently pointed at by a selected
  // "Which answer is yours" row; they take the YOU column's grammar.
  highlightColumns?: readonly string[]
}

const EMPTY_CELL = '—'

export default function ComparisonSection({
  comparison: c,
  svg,
  you,
  highlightColumns = [],
}: ComparisonSectionProps) {
  const lit = new Set(highlightColumns)
  const colClass = (col: string | undefined) =>
    col !== undefined && lit.has(col) ? 'col-hl' : undefined
  return (
    <section>
      <h2 className="pp-h2" id="hintsheet">
        {c.title}
      </h2>
      <p className="lede" style={{ fontSize: 16 }}>
        {pp(c.lede)}
      </p>

      <div className="spectrum">
        <div className="eyebrow">{c.spectrum.eyebrow}</div>
        <div className="spectrum-track">
          {c.spectrum.points.map((pt) => (
            <span key={pt.label}>
              <span className="spectrum-dot" style={{ left: `${pt.left}%` }} />
              <span
                className={pt.up ? 'spectrum-label up' : 'spectrum-label'}
                style={{ left: `${pt.left}%` }}
              >
                {pt.label}
              </span>
            </span>
          ))}
        </div>
        <div className="spectrum-ends">
          <span>{c.spectrum.ends[0]}</span>
          <span>{c.spectrum.ends[1]}</span>
        </div>
        <p className="spectrum-caption">{pp(c.spectrum.caption)}</p>
      </div>

      <h3 className="pp-h3" style={{ marginTop: 34 }}>
        {c.diagramTitle}
      </h3>
      <div className="legend">
        {c.legend.map((item) => (
          <span key={item.kind}>
            <span className={`sw ${LEGEND_SWATCH[item.kind]}`} /> {item.label}
          </span>
        ))}
      </div>

      {c.diagramRows.map((row) => (
        <details key={row.svg} className="anat-row" open={row.open}>
          <summary className="anat-head">
            <span className="co">
              {row.articleSlug !== undefined ? (
                <Link to={`/articles/${row.articleSlug}`}>{row.company}</Link>
              ) : (
                row.company
              )}
            </span>
            <span className="yr">{row.year}</span>
            <span className="vant">{row.vantage}</span>
          </summary>
          <div
            className="anat-scroll"
            dangerouslySetInnerHTML={{ __html: svg(row.svg) ?? '' }}
          />
          <p className="anat-cap">{row.caption}</p>
        </details>
      ))}

      {/* YOU row: empty until a survived day; then the filled SVG with its
          {{slot}} placeholders substituted from youMapping(). */}
      <details className="anat-row" open={c.you.open} id="you-row">
        <summary className="anat-head">
          <span className="co">{c.you.name}</span>
          <span className="yr">{c.you.year}</span>
          <span className="vant">{c.you.vantage}</span>
        </summary>
        <div
          className="anat-scroll"
          dangerouslySetInnerHTML={{
            __html: you.filled
              ? fillSlots(svg(c.you.filledSvg) ?? '', you.cells)
              : (svg(c.you.emptySvg) ?? ''),
          }}
        />
        <p
          className="anat-cap"
          id="you-commit-foot"
          hidden={you.commit === undefined}
        >
          {you.commit !== undefined ? `You said: "${you.commit}"` : ''}
        </p>
      </details>
      {/* B2-10 (F23): the YOU row promises "your design draws itself here after
          a survived day" until the mission fills it; hide it with JS off. */}
      <noscript
        dangerouslySetInnerHTML={{ __html: '<style>#you-row{display:none}</style>' }}
      />

      {c.stripNote !== undefined && (
        <p className="strip-note">{pp(c.stripNote)}</p>
      )}

      {c.matrixLead !== undefined && (
        <p className="matrix-lead">{pp(c.matrixLead)}</p>
      )}
      <div className="matrix-wrap" id="glance">
        <table className="matrix">
          <thead>
            <tr>
              <th scope="col" className="dim">
                At a glance
              </th>
              {c.columns.map((col) => (
                <th key={col} scope="col" data-col={col} className={colClass(col)}>
                  {col}
                </th>
              ))}
              <th scope="col" id="you-th">
                {you.filled ? c.youColumn.label : c.youColumn.emptyLabel}
              </th>
            </tr>
          </thead>
          <tbody>
            {c.matrixRows.map((row) => (
              <tr key={row.id} className={row.hot ? 'hot' : undefined}>
                <td className={row.lead ? 'dim lead' : 'dim'}>
                  {row.qref !== undefined ? (
                    <a href={`#${row.qref}`}>{row.label}</a>
                  ) : (
                    row.label
                  )}
                </td>
                {row.cells.map((cell, j) => (
                  <td key={j} data-col={c.columns[j]} className={colClass(c.columns[j])}>
                    {renderCell(cell)}
                  </td>
                ))}
                <td id={`you-c-${row.id}`}>
                  {you.filled ? (you.cells[row.id] ?? EMPTY_CELL) : EMPTY_CELL}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {c.matrixCaption !== undefined && (
        <p className="matrix-caption">{pp(c.matrixCaption)}</p>
      )}

      {c.questions.map((q) => (
        <Question key={q.id} q={q} svg={svg} />
      ))}
    </section>
  )
}

const LEGEND_SWATCH = { key: 'k', state: 's', reply: 'r', break: 'x' } as const

function renderCell(cell: ProblemMatrixCell) {
  if (typeof cell === 'string') return cell
  return <span className="ns">{cell.ns}</span>
}

function Question({
  q,
  svg,
}: {
  q: ProblemQuestion
  svg: (name: string) => string | undefined
}) {
  return (
    <details className={q.hot ? 'q hot' : 'q'} id={q.id} open={q.open}>
      <summary>
        <span className="qno">{q.id.toUpperCase()}</span>
        <span className="qtext">{q.title}</span>
        <span className="chev">▸</span>
      </summary>
      {q.why !== undefined && <div className="qwhy">{pp(q.why)}</div>}
      {q.figure !== undefined && (
        <div className="winfig">
          <div dangerouslySetInnerHTML={{ __html: svg(q.figure.svg) ?? '' }} />
          {q.figure.caption !== undefined && (
            <p className="win-cap">{pp(q.figure.caption)}</p>
          )}
        </div>
      )}
      <div className="answers">
        {q.answers.map((a, i) => (
          <div key={i} className="arow">
            <span className="co">
              {a.company}
              {a.year !== undefined && <span className="yr">{a.year}</span>}
            </span>
            <span className={a.ns ? 'ns-cell' : undefined}>{pp(a.text)}</span>
          </div>
        ))}
      </div>
    </details>
  )
}

// Substitute `{{slot}}` placeholders in the YOU row's filled SVG with the
// youMapping() strings (HTML-escaped; the SVG is inlined into the page).
export function fillSlots(template: string, cells: Readonly<Record<string, string>>): string {
  return template.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_, key: string) =>
    escapeHtml(cells[key] ?? ''),
  )
}
