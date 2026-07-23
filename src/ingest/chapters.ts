import { normalizeForCompare } from './extract'
import type { BodyLine, Chapter, ChapterSource, Page, Slide } from './types'

/**
 * Kapitelerkennung: Folien einem Kapitel zuordnen.
 *
 * Drei Signale wurden an echtem Material gefunden (siehe CONTEXT.md
 * Abschnitt 4), in dieser Reihenfolge versucht:
 *
 *   1. **Untertitel** (Microeconomics): eine feste Zeile direkt unter dem
 *      Folientitel, unabhängig von der Titellänge immer an derselben
 *      Position/Schriftgröße — z. B. „Consumer Theory - Preferences" auf
 *      acht aufeinanderfolgenden Folien. Unterscheidet sich von einer
 *      Kopf-/Fußzeile dadurch, dass der TEXT wechselt, die POSITION aber
 *      nicht.
 *   2. **Trennfolien** (Money & Banking): eigene, fast leere Folien mit
 *      Kapitelname oder -nummer zwischen den Abschnitten.
 *   3. **Dateiname** (Entrepreneurial Transformation): keins von beidem
 *      vorhanden — die Datei selbst ist ein Kapitel (z. B. "Session 1").
 *
 * Uneinheitliche Kapitelnamen (Bindestrich vs. Gedankenstrich, Singular vs.
 * Plural) werden anschließend fuzzy zusammengeführt.
 */

/** Toleranz beim Positionsvergleich der Untertitelzeile, analog slides.ts. */
const SUBTITLE_Y_TOLERANCE = 3
const SUBTITLE_SIZE_TOLERANCE = 0.6

/**
 * Anteil der infrage kommenden Seiten, auf denen die Kandidatenposition
 * vorkommen muss, damit sie als Untertitel-Slot gilt (nicht nur Zufall).
 * Bewusst nicht bei 0,5: An echtem Material (Consumer Theory 02, Producer
 * Theory 02) fehlt die Untertitelzeile auf den ersten Folien eines
 * Foliensatzes (vermutlich, weil diese Dateien Fortsetzungen sind und die
 * Vorlage dort nicht genutzt wurde), obwohl der Rest des Dokuments ein
 * eindeutiges Signal zeigt (≥ 38 % Abdeckung, Wiederholungsfaktor > 3). Ein
 * zu hoher Schwellenwert würde dieses echte Teilsignal verwerfen. 0,35
 * trennt das noch klar von Zufallstreffern (z. B. „01 Introduction.pdf":
 * 22 % Abdeckung, eine Dozenten-Berufsbezeichnung an zufällig gleicher
 * Position — kein Kapitelname).
 */
const MIN_SUBTITLE_COVERAGE = 0.35

/**
 * Wie oft ein Kapitelname im Schnitt wiederkehren muss. Trennt einen echten
 * Untertitel (wenige Namen, oft wiederholt) von normalem Fließtext an
 * zufällig gleicher Position (fast jeder Wert kommt nur einmal vor).
 */
const MIN_REPETITION_FACTOR = 2

/** Kürzere Kapitelnamen sind zu unspezifisch, um verlässlich zu sein. */
const MIN_NAME_LENGTH = 4

/**
 * Maximaler Editierabstand (Levenshtein) für "derselbe Name". Reine
 * Präfix-Regeln fangen nur Endungen ab ("Constraint"/"Constraints") — echte
 * Einfügungen mitten im Namen ("Market Structure …" / "Market Structures
 * …") brauchen einen echten Editierabstand.
 */
const FUZZY_MAX_DISTANCE = 2

/**
 * Zusätzlich zur absoluten Distanz muss sie relativ zur Namenslänge klein
 * sein — sonst würden kurze, aber inhaltlich verschiedene Namen
 * verschmolzen (z. B. "Chapter 5" vs. "Chapter 6": Distanz 1, aber klar
 * unterschiedliche Kapitel).
 */
const FUZZY_MAX_DISTANCE_RATIO = 0.1

/** Sammelbecken für Folien vor dem ersten erkannten Kapitelsignal. */
const NO_CHAPTER = 'Ohne Kapitel'

interface SubtitleCandidate {
  pageNumber: number
  text: string
  size: number
  y: number
}

/** Für jede Seite die oberste Inhaltszeile als Untertitel-Kandidat. */
function subtitleCandidates(
  pages: Page[],
  bodyLinesByPage: Map<number, BodyLine[]>,
): SubtitleCandidate[] {
  const candidates: SubtitleCandidate[] = []
  for (const page of pages) {
    const body = bodyLinesByPage.get(page.number) ?? []
    const first = body[0]
    if (!first) continue
    if (normalizeForCompare(first.text).length < MIN_NAME_LENGTH) continue
    candidates.push({ pageNumber: page.number, text: first.text, size: first.size, y: first.y })
  }
  return candidates
}

/**
 * Findet die Seiten, deren oberste Inhaltszeile an derselben Position und
 * Schriftgröße stehen wie ein gegebener Ankerpunkt — Kandidat für einen
 * Untertitel-Slot.
 */
function positionCluster(
  candidates: SubtitleCandidate[],
  anchor: SubtitleCandidate,
): SubtitleCandidate[] {
  return candidates.filter(
    (c) =>
      Math.abs(c.y - anchor.y) <= SUBTITLE_Y_TOLERANCE &&
      Math.abs(c.size - anchor.size) <= SUBTITLE_SIZE_TOLERANCE,
  )
}

/**
 * Versucht, Kapitel aus einer wiederkehrenden Untertitelzeile abzuleiten.
 * Liefert `null`, wenn keine verlässliche Position gefunden wurde oder die
 * Kandidatenposition zu divers ist (dann ist es normaler Fließtext, kein
 * Kapitelname).
 *
 * Wichtig: Es gibt oft mehrere Positionen, an denen sich Seiten "häufen"
 * (z. B. die erste Aufzählungszeile des Fließtexts, weil viele Folien
 * ähnlich aufgebaut sind) — aber nur eine devon ist der echte
 * Kapitel-Slot. Ausschlaggebend ist nicht die größte Seitenzahl, sondern
 * der höchste Wiederholungsfaktor (wenige, oft wiederkehrende Werte statt
 * vieler verschiedener).
 */
function detectSubtitleChapters(
  pages: Page[],
  bodyLinesByPage: Map<number, BodyLine[]>,
): Map<number, string> | null {
  const eligiblePages = pages.filter((p) => (bodyLinesByPage.get(p.number)?.length ?? 0) > 0)
  if (eligiblePages.length === 0) return null

  const candidates = subtitleCandidates(pages, bodyLinesByPage)

  let best: SubtitleCandidate[] = []
  let bestFactor = 0
  for (const anchor of candidates) {
    const cluster = positionCluster(candidates, anchor)
    if (cluster.length / eligiblePages.length < MIN_SUBTITLE_COVERAGE) continue
    const distinct = new Set(cluster.map((c) => normalizeForCompare(c.text))).size
    const factor = cluster.length / distinct
    if (factor > bestFactor) {
      best = cluster
      bestFactor = factor
    }
  }

  if (bestFactor < MIN_REPETITION_FACTOR) return null
  return new Map(best.map((c) => [c.pageNumber, c.text]))
}

function isNamedDividerTitle(title: string): boolean {
  const t = title.trim()
  return t.length >= MIN_NAME_LENGTH && !/^\d+$/.test(t)
}

/**
 * Versucht, Kapitel aus Trennfolien abzuleiten. Eine Trennfolie mit rein
 * numerischem Titel ("1", "2", …) trägt für sich keinen Namen — sie wird
 * aber nur dann komplett übersprungen, wenn direkt danach eine benannte
 * Trennfolie folgt (die liefert dann den eigentlichen Namen, z. B. "1" →
 * "Financial & Economic Development"). Folgt keine benannte Trennfolie
 * (Nummer steht allein), markiert sie trotzdem eine echte Abschnittsgrenze —
 * sonst würde der Name des vorigen Kapitels fälschlich über die Grenze
 * hinweg weiterlaufen ("1 Financial Systems.pdf": "2" und "3" stehen ohne
 * eigenen Titel, aber leiten klar neue Abschnitte ein).
 */
function detectDividerChapters(slides: Slide[]): Map<number, string> | null {
  const hasNamedDivider = slides.some((s) => s.isDivider && isNamedDividerTitle(s.title))
  if (!hasNamedDivider) return null

  const bySlideIndex = new Map<number, string>()
  let current: string | null = null
  slides.forEach((slide, index) => {
    if (slide.isDivider) {
      const title = slide.title.trim()
      if (isNamedDividerTitle(title)) {
        current = title
      } else if (/^\d+$/.test(title)) {
        const next = slides[index + 1]
        const nextIsNamedDivider = next?.isDivider && isNamedDividerTitle(next.title)
        if (!nextIsNamedDivider) current = `Kapitel ${title}`
      }
      return
    }
    if (current) bySlideIndex.set(index, current)
  })
  return bySlideIndex
}

/**
 * Nummerierungspräfix und Dateiendung entfernen: "02 Consumer Theory 01.pdf"
 * -> "Consumer Theory 01". Die Endungsliste deckt inzwischen auch die
 * anderen unterstützten Import-Formate ab (ingest/docx.ts, pptx.ts,
 * markdown.ts) — dieselbe Fallback-Logik "kein Struktursignal gefunden,
 * Dateiname wird zum Kapitelnamen" gilt dort genauso wie bei PDF.
 */
export function chapterNameFromFilename(filename: string): string {
  return filename
    .replace(/\.(pdf|docx|pptx|md|markdown)$/i, '')
    .replace(/^\d+[\s._-]+/, '')
    .trim()
}

/** Levenshtein-Distanz, mit früher Abbruchgrenze — hier reichen kurze Kapitelnamen. */
function levenshtein(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const curr = [i]
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr.push(Math.min(prev[j]! + 1, curr[j - 1]! + 1, prev[j - 1]! + cost))
    }
    prev = curr
  }
  return prev[b.length]!
}

function namesAreFuzzyEqual(a: string, b: string): boolean {
  if (a === b) return true
  const maxLen = Math.max(a.length, b.length)
  const distance = levenshtein(a, b, FUZZY_MAX_DISTANCE)
  return distance <= FUZZY_MAX_DISTANCE && distance / maxLen <= FUZZY_MAX_DISTANCE_RATIO
}

/**
 * Führt Kapitelnamen zusammen, die sich nur in Zeichensetzung oder
 * Singular/Plural unterscheiden ("Budget Constraint" vs. "Budget
 * Constraints", "Market Structure" vs. "Market Structures", "-" vs. "–").
 * `normalizeForCompare` erledigt Satzzeichen und Bindestriche bereits; hier
 * kommt der Editierabstand für den Rest dazu.
 */
function fuzzyGroupNames(rawNames: string[]): Map<string, string> {
  const countByKey = new Map<string, number>()
  const firstSeenByKey = new Map<string, string>()
  for (const name of rawNames) {
    const key = normalizeForCompare(name)
    countByKey.set(key, (countByKey.get(key) ?? 0) + 1)
    if (!firstSeenByKey.has(key)) firstSeenByKey.set(key, name)
  }

  const keys = [...countByKey.keys()]
  const keyToGroupKey = new Map<string, string>()
  for (const key of keys) {
    if (keyToGroupKey.has(key)) continue
    keyToGroupKey.set(key, key)
    for (const other of keys) {
      if (other === key || keyToGroupKey.has(other)) continue
      if (namesAreFuzzyEqual(key, other)) keyToGroupKey.set(other, key)
    }
  }

  // Pro Gruppe die häufigste Rohvariante als Anzeigename wählen.
  const groupCounts = new Map<string, Map<string, number>>()
  for (const key of keys) {
    const groupKey = keyToGroupKey.get(key)!
    const inner = groupCounts.get(groupKey) ?? new Map<string, number>()
    inner.set(key, (inner.get(key) ?? 0) + countByKey.get(key)!)
    groupCounts.set(groupKey, inner)
  }

  const canonicalByGroupKey = new Map<string, string>()
  for (const [groupKey, inner] of groupCounts) {
    const winningKey = [...inner.entries()].sort((a, b) => b[1] - a[1])[0]![0]
    canonicalByGroupKey.set(groupKey, firstSeenByKey.get(winningKey)!)
  }

  const rawKeyToCanonical = new Map<string, string>()
  for (const key of keys) {
    rawKeyToCanonical.set(key, canonicalByGroupKey.get(keyToGroupKey.get(key)!)!)
  }
  return rawKeyToCanonical
}

/**
 * Baut die endgültigen Kapitel aus einer rohen Zuordnung Folie -> Name.
 * Exportiert, weil `ingest/pptx.ts` dieselbe Zusammenführungslogik (inkl.
 * Fuzzy-Namensgruppierung) für PowerPoint-Trennfolien wiederverwendet
 * (siehe `detectChaptersFromSlides` unten) — dort gibt es dieselbe
 * Trennfolien-Konvention wie bei PDF-Foliensätzen (Money & Banking).
 */
export function buildChapters(
  slides: Slide[],
  rawNameByIndex: Map<number, string>,
  source: ChapterSource,
): Chapter[] {
  const contentIndices = slides
    .map((s, i) => i)
    .filter((i) => !slides[i]!.isDivider)

  const rawNames: string[] = []
  let carry: string | null = null
  const resolvedByIndex = new Map<number, string>()
  for (const i of contentIndices) {
    const raw = rawNameByIndex.get(i)
    if (raw) carry = raw
    const resolved = carry ?? NO_CHAPTER
    resolvedByIndex.set(i, resolved)
    rawNames.push(resolved)
  }

  const canonicalByRaw = fuzzyGroupNames(rawNames)

  const order: string[] = []
  const slidesByTitle = new Map<string, Slide[]>()
  for (const i of contentIndices) {
    const raw = resolvedByIndex.get(i)!
    const canonical = canonicalByRaw.get(normalizeForCompare(raw)) ?? raw
    if (!slidesByTitle.has(canonical)) {
      slidesByTitle.set(canonical, [])
      order.push(canonical)
    }
    slidesByTitle.get(canonical)!.push(slides[i]!)
  }

  return order.map((title) => ({
    title,
    normalized: normalizeForCompare(title),
    slides: slidesByTitle.get(title)!,
    source,
  }))
}

/**
 * Kapitelerkennung ohne Untertitelzeile: Trennfolie → Dateiname → gar
 * kein Signal. Der Untertitel-Weg (`detectSubtitleChapters`) bleibt
 * PDF-exklusiv, weil er Schriftgröße/Position aus `pdf.js` braucht — die
 * beiden anderen Signale (Trennfolie, Dateiname) kennen dagegen nur
 * `Slide[]` (Titel, `isDivider`) und funktionieren identisch für jedes
 * Format, das sich als Folienfolge modellieren lässt. Exportiert für
 * `ingest/pptx.ts` (echte PowerPoint-Folien haben von Natur aus keine
 * Animationsschritte, siehe dort — aber dieselben Trennfolien-Muster wie
 * PDF-Foliensätze kommen an echtem PowerPoint-Material genauso vor).
 */
export function detectChaptersFromSlides(slides: Slide[], filename: string): Chapter[] {
  const dividerMap = detectDividerChapters(slides)
  if (dividerMap) return buildChapters(slides, dividerMap, 'divider')

  const filenameChapter = chapterNameFromFilename(filename)
  if (normalizeForCompare(filenameChapter).length >= MIN_NAME_LENGTH) {
    const rawNameByIndex = new Map<number, string>()
    slides.forEach((slide, index) => {
      if (!slide.isDivider) rawNameByIndex.set(index, filenameChapter)
    })
    return buildChapters(slides, rawNameByIndex, 'filename')
  }

  const rawNameByIndex = new Map<number, string>()
  slides.forEach((slide, index) => {
    if (!slide.isDivider) rawNameByIndex.set(index, NO_CHAPTER)
  })
  return buildChapters(slides, rawNameByIndex, 'fallback')
}

/** Vollständige Kapitelerkennung für ein PDF-Dokument. */
export function detectChapters(
  pages: Page[],
  bodyLinesByPage: Map<number, BodyLine[]>,
  slides: Slide[],
  filename: string,
): Chapter[] {
  const subtitleMap = detectSubtitleChapters(pages, bodyLinesByPage)
  if (subtitleMap) {
    const lastPageOfSlide = (slide: Slide) => slide.pageNumbers[slide.pageNumbers.length - 1]!
    const rawNameByIndex = new Map<number, string>()
    slides.forEach((slide, index) => {
      if (slide.isDivider) return
      const name = subtitleMap.get(lastPageOfSlide(slide))
      if (name) rawNameByIndex.set(index, name)
    })
    return buildChapters(slides, rawNameByIndex, 'subtitle')
  }

  return detectChaptersFromSlides(slides, filename)
}
