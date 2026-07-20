import type { AssessmentFormat, Calibration, Course, Topic, TopicSection } from '../data/schema'

/**
 * Aufwandsschätzung nach ADR-004 (DECISIONS.md): eindeutiger Textumfang
 * statt Seitenzahl, weil Letztere über Fächer hinweg unbrauchbar schwankt
 * (an echtem Material zwischen 1,10× und 2,21× Aufblähung durch
 * Animationsschritte gemessen).
 *
 * Reine Funktion (ARCHITECTURE.md „domain/ … kennt weder DB noch UI noch
 * KI"): nimmt einfache Datenstrukturen, kein Datenbankzugriff.
 *
 *   minuten = [(eindeutige_zeichen / 1000) × minuten_pro_1000_zeichen
 *              + (echte_folien × 0,5)]
 *           × fach_schwierigkeit
 *           × themen_gewicht
 *           × prüfungsart
 *
 * `minuten_pro_1000_zeichen` ist der in ADR-004 fest verdrahtete
 * Ausgangswert 4,5 — sobald `calibration.sample_count` die Mindestzahl
 * an Datenpunkten erreicht (siehe CONTEXT.md „Bekannte Einschränkungen":
 * „~10 Datenpunkte pro Fach, bis sie taugt"), ersetzt der gelernte Wert aus
 * `calibration.minutes_per_1k_chars` die Konstante — das ist exakt, wofür
 * das Feld existiert (siehe DATA_MODEL.md „Zeit und Plan"). ADR-004 listet
 * „kalibrierung" als eigenen Faktor am Ende der Formel; da
 * `minutes_per_1k_chars` aber wörtlich „Minuten pro 1000 Zeichen" heißt,
 * wird sie hier als Ersatz für die 4,5-Konstante gelesen, nicht als
 * zusätzlicher Multiplikator über die gesamte Summe — sonst würde derselbe
 * Kalibrierungseffekt doppelt einfließen.
 */

/** ADR-004: Ausgangswert, bis genug Datenpunkte kalibrieren. */
const DEFAULT_MINUTES_PER_1K_CHARS = 4.5

/** ADR-004: Zuschlag pro Folie für Inhalte ohne Text (Diagramme, Grafiken). */
const MINUTES_PER_SLIDE = 0.5

/** Siehe CONTEXT.md „Bekannte Einschränkungen" — darunter ist die Kalibrierung noch nicht belastbar. */
const MIN_CALIBRATION_SAMPLES = 10

/**
 * Skaliert eine 1–5-Bewertung (`course.difficulty`, `topic.weight`) auf
 * einen Multiplikator um 1,0: die mittlere Bewertung (3) verändert die
 * Schätzung nicht, 1 und 5 stauchen/strecken sie proportional. In ADR-004
 * nicht als Zahl festgelegt (nur als Formelglied benannt) — dieser lineare
 * Ansatz ist der naheliegendste, der „3 = neutral" respektiert, aber noch
 * nicht an echten Daten validiert.
 */
function scaleMultiplier(rating: 1 | 2 | 3 | 4 | 5): number {
  return rating / 3
}

/**
 * Multiplikator je Prüfungsformat: wie viel zusätzliche aktive Übung ein
 * Format über das reine Durcharbeiten des Stoffs hinaus braucht.
 *
 * **Bewusst festgelegter Startwert, nicht in ADR-004 spezifiziert und nicht
 * an echten Daten validiert** — geschätzt aus der Überlegung heraus, dass
 * Open-Book und Multiple-Choice weniger freies Reproduzieren brauchen als
 * Freitext/Essay/Fallstudie/Rechnen. Ursprünglich als offene Rückfrage an
 * den Nutzer markiert; auf dessen Wunsch final entschieden (Session vom
 * 20.07.2026), weil die Themen-Regler in `TopicTree.tsx`
 * (`setTopicWeight`/`setTopicDifficulty`) den eigentlichen, direkten
 * Korrekturhebel liefern — dieser Multiplikator ist nur noch ein grober
 * Startwert, keine Zahl, die exakt stimmen muss. Bewusst als benannte,
 * leicht auffindbare Konstante statt verstreuter Magic Numbers, falls sich
 * mit echten Nutzungsdaten (`ai_usage`-artige Kalibrierung) doch noch eine
 * bessere Zahl ergibt.
 */
export const EXAM_FORMAT_MULTIPLIER: Record<AssessmentFormat, number> = {
  mc: 0.8,
  open_book: 0.7,
  mixed: 1.0,
  rechnen: 1.1,
  fallstudie: 1.2,
  freitext: 1.2,
  essay: 1.2,
}

export interface EstimationInput {
  topic: Pick<Topic, 'weight'>
  sections: Pick<TopicSection, 'unique_chars' | 'slide_count'>[]
  course: Pick<Course, 'difficulty'>
  assessmentFormat: AssessmentFormat
  /** `null`, solange für den Kurs noch keine Kalibrierung existiert. */
  calibration: Pick<Calibration, 'minutes_per_1k_chars' | 'sample_count'> | null
}

export interface EstimationResult {
  minutes: number
  /** true, wenn `calibration` statt der ADR-004-Ausgangskonstante verwendet wurde. */
  calibrated: boolean
}

/** Schätzt den Lernaufwand für ein Thema in einer Prüfungsvorbereitung, in Minuten. */
export function estimateMinutes(input: EstimationInput): EstimationResult {
  const uniqueChars = input.sections.reduce((sum, s) => sum + s.unique_chars, 0)
  const slideCount = input.sections.reduce((sum, s) => sum + s.slide_count, 0)

  const calibrated = input.calibration !== null && input.calibration.sample_count >= MIN_CALIBRATION_SAMPLES
  const minutesPer1kChars = calibrated
    ? input.calibration!.minutes_per_1k_chars
    : DEFAULT_MINUTES_PER_1K_CHARS

  const base = (uniqueChars / 1000) * minutesPer1kChars + slideCount * MINUTES_PER_SLIDE
  const minutes =
    base *
    scaleMultiplier(input.course.difficulty) *
    scaleMultiplier(input.topic.weight) *
    EXAM_FORMAT_MULTIPLIER[input.assessmentFormat]

  return { minutes: Math.round(minutes), calibrated }
}
