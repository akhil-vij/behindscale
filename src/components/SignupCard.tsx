import { newsletterLatestEdition, newsletterSignupUrl } from '../config/site'

// The newsletter signup card (author + newsletter handoff, option B: our own
// button rather than Substack's embed, whose fixed box and fonts the site can't
// restyle). One component, three placements: the landing before the closing
// CTA (size "lg", heading 22, 20 on phones) and the end of every lesson and
// every article (size "md", heading 18).
//
// At 700px and up the text sits left and the button + note right, bottom-
// aligned; below 700 they stack and the button goes full width. The button is
// 44px tall at least, 48px on the landing to pair with the Browse CTA under
// it. Renders nothing while newsletterSignupUrl is empty; the "Latest:" line
// shows only once newsletterLatestEdition.url is set.
export default function SignupCard({
  size = 'md',
  className = '',
}: {
  size?: 'lg' | 'md'
  className?: string
}) {
  if (!newsletterSignupUrl) return null
  const lg = size === 'lg'
  const latest = newsletterLatestEdition
  const headingId = `signup-heading-${size}`

  return (
    <section
      aria-labelledby={headingId}
      data-signup-card={size}
      className={`rounded-xl border border-border-default bg-bg-surface ${
        lg
          ? 'px-5 pb-5 pt-[22px] min-[700px]:px-7 min-[700px]:pb-6 min-[700px]:pt-[26px]'
          : 'px-[18px] py-5 min-[700px]:px-6 min-[700px]:py-[22px]'
      } ${className}`}
    >
      <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted min-[700px]:mb-2.5">
        The newsletter
      </div>
      <div className="flex flex-col gap-4 min-[700px]:flex-row min-[700px]:flex-wrap min-[700px]:items-end min-[700px]:justify-between min-[700px]:gap-x-10 min-[700px]:gap-y-5">
        <div className="min-w-0 min-[700px]:flex-[1_1_320px]">
          <h2
            id={headingId}
            className={`font-sans font-bold text-text-primary ${
              lg
                ? 'mb-2 text-[20px] leading-tight tracking-[-0.015em] min-[700px]:text-[22px]'
                : 'mb-1.5 text-[18px] leading-snug tracking-[-0.01em]'
            }`}
          >
            One real failure every two weeks
          </h2>
          <p
            className={`max-w-[36em] text-text-secondary ${
              lg ? 'text-[15px] leading-relaxed' : 'text-sm leading-relaxed'
            }`}
          >
            Why the companies that faced it chose differently, what each choice
            cost, and how you&rsquo;d defend your own design.
          </p>
        </div>
        <div className="flex flex-col gap-2 min-[700px]:items-start">
          <a
            href={newsletterSignupUrl}
            target="_blank"
            rel="noopener"
            className={`inline-flex ${lg ? 'min-h-[48px]' : 'min-h-[44px]'} w-full items-center justify-center rounded-md bg-text-primary px-5 py-3 font-sans text-sm font-semibold text-bg-base no-underline transition-colors hover:bg-text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 min-[700px]:w-auto`}
          >
            Subscribe free on Substack ↗
          </a>
          <span className="text-center font-mono text-[11px] text-text-muted min-[700px]:text-left">
            EVERY TWO WEEKS · FREE · UNSUBSCRIBE ANY TIME
          </span>
        </div>
      </div>
      {latest.url && (
        <p className="mt-3.5 text-[13px] text-text-muted">
          Latest:{' '}
          <a
            href={latest.url}
            target="_blank"
            rel="noopener"
            className="text-text-secondary underline underline-offset-[3px] hover:text-text-primary"
          >
            {latest.title} ↗
          </a>
        </p>
      )}
    </section>
  )
}
