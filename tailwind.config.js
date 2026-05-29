/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Reading shell (light)
        'bg-base': 'var(--bg-base)',
        'bg-surface': 'var(--bg-surface)',
        'bg-subtle': 'var(--bg-subtle)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'accent-primary': 'var(--accent-primary)',
        'accent-hover': 'var(--accent-hover)',
        'border-default': 'var(--border-default)',
        'border-strong': 'var(--border-strong)',
        'state-success': 'var(--state-success)',
        'state-error': 'var(--state-error)',
        'code-bg': 'var(--code-bg)',
        // Artifact / dark tokens
        'art-bg': 'var(--art-bg)',
        'art-surface': 'var(--art-surface)',
        'art-surface-2': 'var(--art-surface-2)',
        'art-border': 'var(--art-border)',
        'art-text': 'var(--art-text)',
        'art-text-muted': 'var(--art-text-muted)',
        // Pattern / tag accent ramp
        'cat-blue': 'var(--cat-blue)',
        'cat-green': 'var(--cat-green)',
        'cat-orange': 'var(--cat-orange)',
        'cat-purple': 'var(--cat-purple)',
        'cat-cyan': 'var(--cat-cyan)',
        'cat-red': 'var(--cat-red)',
        'cat-amber': 'var(--cat-amber)',
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      borderRadius: {
        md: '6px',
        xl: '12px',
        '2xl': '16px',
      },
    },
  },
  plugins: [],
}
