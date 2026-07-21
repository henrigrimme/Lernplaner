import type { StudyBlockKind } from '../data/schema'

/** Anzeigenamen für `StudyBlockKind`, geteilt zwischen `PlanView`/`TodayView`/`ReplanView`. */
export const KIND_LABELS: Record<StudyBlockKind, string> = {
  erstdurchgang: 'Erstdurchgang',
  wiederholung: 'Wiederholung',
  uebung: 'Übung',
  quiz: 'Quiz',
  puffer: 'Puffer',
}
