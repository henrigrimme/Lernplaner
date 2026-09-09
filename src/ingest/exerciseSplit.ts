/**
 * Zerlegt ein Übungsblatt in einzelne Aufgaben (ROADMAP.md „Später/offen":
 * „Übungsblatt-Zerlegung in Einzelaufgaben", vorgezogen auf Nutzerwunsch
 * 09.09.2026). Rein deterministisch, **kein KI-Aufruf** — dieselbe
 * Begründung wie bei `ingest/docType.ts`: die an echtem Material
 * (WHU „Problem Set"/„Online Questions", Mathe „Aufgabenblatt") beobachtete
 * Nummerierung („1." / „1)") ist ein verlässliches Signal, eine
 * KI-Zerlegung wäre langsamer, kostet und wäre nicht treffsicherer.
 *
 * Reine Funktion (ARCHITECTURE.md „ingest/"), formatunabhängig: die
 * Eingabe ist eine Liste von Seiten mit bereits extrahierten Textzeilen —
 * `App.tsx` füllt sie beim PDF aus `readPages` (`page.lines`), bei den
 * anderen Formaten aus deren `ExtractedDocument.slides`. Wiederkehrende
 * Kopfzeilen (der Dokumenttitel steht bei mehrseitigen Blättern auf jeder
 * Seite) und reine Seitenzahl-Fußzeilen werden hier entfernt — `bodyLines`
 * aus `readPages` ist auf Vorlesungsfolien zugeschnitten und bei reinen
 * Textdokumenten (Übungsblätter) leer, taugt hier also nicht.
 */

export interface ExercisePage {
  /** 1-basierte Seitenzahl wie im Dokument. */
  pageNumber: number
  /** Textzeilen der Seite, von oben nach unten, bereits getrimmt oder nicht — egal. */
  lines: string[]
}

export interface ParsedExercise {
  /** Aufgabennummer, wie gedruckt: „1", „2", … */
  number: string
  /**
   * Kurzer Titel aus der Markerzeile (z. B. „Leverage", „Bond Pricing") —
   * leerer String, wenn die Markerzeile direkt mit dem Aufgabentext
   * weitergeht (typisch bei „Online Questions").
   */
  label: string
  /** Vollständiger Aufgabentext inklusive Teilaufgaben (a./b./…), Zeilen mit `\n` verbunden. */
  text: string
  /** Seite, auf der die Aufgabe beginnt. */
  pageStart: number
  /** Seite, auf der die Aufgabe endet (bei mehrseitigen Aufgaben > `pageStart`). */
  pageEnd: number
}

export interface ExerciseSplitResult {
  exercises: ParsedExercise[]
  /**
   * Zeilen vor der ersten erkannten Aufgabe (Dokumenttitel, „Problem Set 1"
   * usw.) — nur zur Anzeige/Diagnose, nicht Teil einer Aufgabe.
   */
  preamble: string[]
  /**
   * Heuristik gegen Fehlalarm auf Vorlesungsfolien: eine Agenda-Folie
   * („1. Überblick  2. …  3. …") trifft `MARKER_RE` genauso, liefert aber
   * viele sehr kurze „Aufgaben". `true` nur, wenn es mindestens drei
   * Aufgaben mit im Median spürbarem Textumfang gibt. `App.tsx` bietet die
   * Zerlegung ohnehin nur bei Dokumenttyp „Übungsblatt"/„Musterlösung" an —
   * das hier ist die zweite Absicherung, falls der Typ falsch gesetzt war.
   */
  looksLikeExerciseSheet: boolean
}

/** Ab hier gilt ein Blatt als echtes Übungsblatt (siehe `looksLikeExerciseSheet`). */
const MIN_EXERCISES = 3
const MIN_MEDIAN_TEXT_LENGTH = 60

/** Markerzeile: führende Nummer + `.` oder `)`, danach optional Text. */
const MARKER_RE = /^(\d{1,3})[.)](?:\s+(.*\S))?\s*$/
/** Reine Seitenzahl-Zeile (Fußzeile) — nie ein Aufgabenmarker (die haben `.`/`)`). */
const BARE_NUMBER_RE = /^\d{1,3}$/

/**
 * Zeilen, die auf mindestens zwei Seiten unter den ersten beiden
 * nicht-leeren Zeilen der Seite stehen — praktisch immer der Dokumenttitel
 * als wiederkehrende Kopfzeile. Bei einseitigen Blättern greift das nie
 * (dort landet der Titel ohnehin in der Präambel).
 */
function findRepeatingHeaders(pages: ExercisePage[]): Set<string> {
  const seenOnPages = new Map<string, Set<number>>()
  for (const page of pages) {
    let taken = 0
    for (const raw of page.lines) {
      const text = raw.trim()
      if (text.length === 0) continue
      if (++taken > 2) break
      if (!seenOnPages.has(text)) seenOnPages.set(text, new Set())
      seenOnPages.get(text)!.add(page.pageNumber)
    }
  }
  const headers = new Set<string>()
  for (const [text, pageSet] of seenOnPages) {
    if (pageSet.size >= 2) headers.add(text)
  }
  return headers
}

function looksLikeLabel(rest: string): boolean {
  if (rest.length === 0 || rest.length > 32) return false
  if (/[.?:!,;]$/.test(rest)) return false
  const words = rest.split(/\s+/)
  if (words.length > 4) return false
  // Ein Titel beginnt groß (oder mit einer Zahl wie „10-Year Bond"); ein
  // angefangener Satz („Which of the following …") wird dadurch nicht als
  // Titel missverstanden, selbst wenn er kurz anfängt.
  return /^[A-ZÄÖÜ0-9]/.test(rest)
}

/**
 * Findet die Aufgabengrenzen. Ein Marker zählt nur, wenn seine Nummer die
 * lückenlose Fortsetzung ist (`1, 2, 3, …`) — so werden Zeilen wie
 * „3 percent has risen." (kein `.`/`)` direkt hinter der Zahl, fällt schon
 * an `MARKER_RE`) und ein zufälliges „2)" mitten im Text von Aufgabe 5
 * nicht fälschlich als neue Aufgabe erkannt. Die erste Aufgabe darf mit
 * beliebiger Nummer beginnen (manche Blätter fangen bei 0 an).
 */
export function splitExercises(pages: ExercisePage[]): ExerciseSplitResult {
  const repeatingHeaders = findRepeatingHeaders(pages)

  const flat: { text: string; page: number }[] = []
  for (const page of pages) {
    for (const raw of page.lines) {
      const text = raw.trim()
      if (text.length === 0) continue
      if (BARE_NUMBER_RE.test(text)) continue
      if (repeatingHeaders.has(text)) continue
      flat.push({ text, page: page.pageNumber })
    }
  }

  const preamble: string[] = []
  const exercises: ParsedExercise[] = []
  let current: { number: string; label: string; lines: string[]; pageStart: number; pageEnd: number } | null = null
  let expectedNext: number | null = null

  const flush = () => {
    if (!current) return
    exercises.push({
      number: current.number,
      label: current.label,
      text: current.lines.join('\n').trim(),
      pageStart: current.pageStart,
      pageEnd: current.pageEnd,
    })
    current = null
  }

  for (let i = 0; i < flat.length; i++) {
    const { text, page } = flat[i]!
    const match = text.match(MARKER_RE)
    const n = match ? Number(match[1]) : null
    const isNewExercise = n !== null && (expectedNext === null ? true : n === expectedNext)

    if (isNewExercise) {
      flush()
      const rest = (match![2] ?? '').trim()
      const hasLabel = looksLikeLabel(rest)
      current = {
        number: match![1]!,
        label: hasLabel ? rest : '',
        lines: hasLabel || rest.length === 0 ? [] : [rest],
        pageStart: page,
        pageEnd: page,
      }
      expectedNext = n! + 1
      continue
    }

    if (current) {
      current.lines.push(text)
      current.pageEnd = page
    } else {
      preamble.push(text)
    }
  }
  flush()

  return { exercises, preamble, looksLikeExerciseSheet: isExerciseSheet(exercises) }
}

function isExerciseSheet(exercises: ParsedExercise[]): boolean {
  if (exercises.length < MIN_EXERCISES) return false
  const lengths = exercises.map((e) => e.text.length).sort((a, b) => a - b)
  const mid = Math.floor(lengths.length / 2)
  const median = lengths.length % 2 === 0 ? (lengths[mid - 1]! + lengths[mid]!) / 2 : lengths[mid]!
  return median >= MIN_MEDIAN_TEXT_LENGTH
}
