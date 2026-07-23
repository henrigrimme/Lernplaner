import type { RecurringBlocker } from './schema'

/**
 * Reine Editierfunktionen für den lokalen Zustand (Migration 0006,
 * DATA_MODEL.md „recurring_blockers"). Wie `paperSteps.ts`/`courses.ts`:
 * kein Datenbankzugriff, Neuanlegen liefert die echte `id` aus
 * `data/recurringBlockersRepo.ts` (`AUTOINCREMENT`) — hier nur zum
 * Entfernen mit bereits bekannter `id`.
 */
export interface NewRecurringBlockerInput {
  weekday: RecurringBlocker['weekday']
  starts_at: string
  ends_at: string
  label: string
}

export function removeRecurringBlocker(blockers: RecurringBlocker[], id: number): RecurringBlocker[] {
  return blockers.filter((b) => b.id !== id)
}
