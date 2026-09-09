/**
 * App-Logo — dieselbe Bildmarke wie das Dock-/Programm-Icon
 * (`src-tauri/app-icon.svg`, daraus `npm run tauri icon`). Feste
 * Markenfarben (nicht themenabhängig), damit die Marke im Hellen wie im
 * Dunklen gleich aussieht — sie bringt ihre eigene helle Fläche mit.
 *
 * Wird u. a. in der Seitenleiste neben „Lernplaner" gezeigt (`App.tsx`).
 */
type LogoProps = {
  /** Kantenlänge in px. Default 20 (Seitenleisten-Marke). */
  size?: number
  className?: string
  /** Sichtbarer Name für Screenreader; leer lassen = rein dekorativ. */
  title?: string
}

export function Logo({ size = 20, className, title }: LogoProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <rect
        x="16"
        y="16"
        width="992"
        height="992"
        rx="176"
        ry="176"
        fill="#f6eee4"
        stroke="#b1582b"
        strokeWidth="24"
      />
      <rect x="268" y="344" width="240" height="336" rx="34" ry="34" fill="#b1582b" />
      <rect x="516" y="344" width="240" height="336" rx="34" ry="34" fill="#392a20" />
      <path
        d="M604,410 L646,410 L646,544 L710,544 L710,586 L604,586 Z"
        fill="#f6eee4"
        stroke="#f6eee4"
        strokeWidth="26"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}
