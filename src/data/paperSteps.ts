import type { PaperStep } from './schema'

/**
 * Reine Editierfunktionen für den lokalen Paper-Teilschritt-Zustand
 * (DATA_MODEL.md „paper_steps — Teilschritte für Abgaben", CONTEXT.md
 * Abschnitt 3 „der Planer muss Paper-Teilschritte von Anfang an
 * mitdenken, auch wenn der Paper-Workflow erst in Phase 4 ausgebaut
 * wird"). Kein Datenbankzugriff, keine Systemuhr — wie `courses.ts`
 * übernehmen diese Funktionen nur Änderungen mit bereits bekannter `id`
 * (Aktualisieren/Löschen), Neuanlegen liefert die echte `id` aus
 * `data/paperStepsRepo.ts` (`AUTOINCREMENT`).
 */

export interface NewPaperStepInput {
  assessment_id: number
  title: string
  due_date: string | null
  status: PaperStep['status']
  notes: string | null
}

export function updatePaperStep(steps: PaperStep[], id: number, changes: Partial<NewPaperStepInput>): PaperStep[] {
  return steps.map((s) => (s.id === id ? { ...s, ...changes } : s))
}

export function removePaperStep(steps: PaperStep[], id: number): PaperStep[] {
  return steps.filter((s) => s.id !== id)
}
