import type { Assessment, StudyBlock, Topic } from '../data/schema'

/**
 * Lokale Benachrichtigungen: Tagesübersicht + Fälligkeiten (ROADMAP.md
 * Phase 3; CONTEXT.md „Anforderungen": „Benachrichtigungen: Tagesübersicht
 * + Fälligkeiten"; CONTEXT.md Abschnitt 5, aus der Recherche zu
 * gescheiterten Lernplanern: „Höchstens zwei Benachrichtigungen pro Tag").
 *
 * Reine Entscheidungslogik — **was** angezeigt werden soll, nicht **wie**
 * (das ist `platform/notifications.ts`, ARCHITECTURE.md „domain/ … kennt
 * weder DB noch UI"). Genau zwei Benachrichtigungsarten
 * (`NotificationKind`), jede höchstens einmal pro Tag — das erfüllt die
 * „höchstens zwei pro Tag"-Grenze strukturell, ohne eigene Zähllogik: eine
 * dritte Art hinzuzufügen würde die Grenze verletzen und bräuchte dann eine
 * echte Kappung.
 */

export type NotificationKind = 'tagesuebersicht' | 'faelligkeit'

export interface NotificationContent {
  kind: NotificationKind
  title: string
  body: string
}

/**
 * Ab wie vielen Tagen vor dem Prüfungstermin die Fälligkeits-
 * Benachrichtigung greift. Nirgends in den Anforderungen beziffert —
 * erfunden, aber benannt und auffindbar exportiert statt einer versteckten
 * Magic Number (gleiches Vorgehen wie `EXAM_FORMAT_MULTIPLIER` in
 * `estimation.ts`/`FEEDBACK_MASTERY_WEIGHT` in `progress.ts`).
 */
export const DEFAULT_DUE_SOON_DAYS = 3

function daysUntil(today: string, date: string): number {
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.round((new Date(`${date}T00:00:00.000Z`).getTime() - new Date(`${today}T00:00:00.000Z`).getTime()) / msPerDay)
}

/** Tagesübersicht: welche Themen heute geplant sind, Gesamtminuten. `null`, wenn heute nichts (mehr) offen ist. */
export function buildDailyOverviewNotification(
  studyBlocksToday: StudyBlock[],
  topics: Pick<Topic, 'id' | 'name'>[],
): NotificationContent | null {
  const open = studyBlocksToday.filter((b) => b.status === 'offen')
  if (open.length === 0) return null

  const totalMinutes = open.reduce((sum, b) => sum + b.planned_minutes, 0)
  const topicById = new Map(topics.map((t) => [t.id, t.name]))
  const topicNames = [...new Set(open.map((b) => (b.topic_id !== null ? topicById.get(b.topic_id) : undefined)))].filter(
    (name): name is string => Boolean(name),
  )

  return {
    kind: 'tagesuebersicht',
    title: 'Heute im Lernplan',
    body: `${open.length} Lernblöcke, ${totalMinutes} Minuten geplant: ${topicNames.join(', ')}`,
  }
}

/** Fälligkeiten: Prüfungen innerhalb von `withinDays`. `null`, wenn keine bevorsteht. */
export function buildDueSoonNotification(
  today: string,
  assessments: Pick<Assessment, 'title' | 'date'>[],
  withinDays: number = DEFAULT_DUE_SOON_DAYS,
): NotificationContent | null {
  const dueSoon = assessments
    .filter((a) => {
      const days = daysUntil(today, a.date)
      return days >= 0 && days <= withinDays
    })
    .sort((a, b) => a.date.localeCompare(b.date))

  if (dueSoon.length === 0) return null

  return {
    kind: 'faelligkeit',
    title: dueSoon.length === 1 ? 'Prüfung bald fällig' : 'Prüfungen bald fällig',
    body: dueSoon.map((a) => `${a.title} (${a.date})`).join(', '),
  }
}

export interface DueNotificationsInput {
  today: string
  studyBlocksToday: StudyBlock[]
  topics: Pick<Topic, 'id' | 'name'>[]
  assessments: Pick<Assessment, 'title' | 'date'>[]
  /** Arten, die heute bereits gezeigt wurden — werden nicht erneut vorgeschlagen. */
  alreadyShownToday: ReadonlySet<NotificationKind>
  dueSoonDays?: number
}

/** Kombiniert Tagesübersicht + Fälligkeiten, überspringt bereits heute gezeigte Arten. */
export function computeDueNotifications(input: DueNotificationsInput): NotificationContent[] {
  const candidates = [
    input.alreadyShownToday.has('tagesuebersicht')
      ? null
      : buildDailyOverviewNotification(input.studyBlocksToday, input.topics),
    input.alreadyShownToday.has('faelligkeit')
      ? null
      : buildDueSoonNotification(input.today, input.assessments, input.dueSoonDays),
  ]
  return candidates.filter((c): c is NotificationContent => c !== null)
}
