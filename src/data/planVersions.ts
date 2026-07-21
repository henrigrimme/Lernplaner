import type { PlanVersion, StudyBlock } from './schema'

/**
 * Reine Editierfunktion für `plan_versions` (wie `courses.ts`): kein
 * Datenbankzugriff, keine Systemuhr. Hält die **vorige** Fassung des Plans
 * fest, bevor eine Neuplanung angewendet wird — ADR-005 „Umplanung als
 * Vorschlag, nie automatisch": „Die vorige Fassung bleibt in
 * `plan_versions` erhalten." `snapshot_json` ist bewusst der komplette
 * `StudyBlock[]`-Bestand vor der Änderung, nicht nur der Diff — einfacher
 * wiederherzustellen, DATA_MODEL.md nennt keine kompaktere Form.
 */
export function recordPlanVersion(
  versions: PlanVersion[],
  reason: string,
  snapshot: StudyBlock[],
  createdAt: string,
): PlanVersion[] {
  const id = versions.reduce((max, v) => Math.max(max, v.id), 0) + 1
  return [...versions, { id, created_at: createdAt, reason, snapshot_json: JSON.stringify(snapshot) }]
}
