import { normalizeForCompare } from '../ingest/extract'
import type { Topic } from './schema'

/**
 * Reine Editierfunktionen über den flachen `topics`-Zeilentyp (siehe
 * `schema.ts`, `migrations/0001_init.sql`) — keine Datenbankzugriffe, keine
 * UI. Jede Funktion nimmt den vollständigen Zustand entgegen und liefert den
 * neuen zurück, statt zu mutieren, damit die aufrufende Stelle (UI oder
 * `data/`-Persistenz) selbst entscheidet, was tatsächlich gespeichert wird.
 *
 * Jede Änderung durch den Nutzer setzt `manual_override = true` — siehe
 * DATA_MODEL.md „Warum manual_override existiert": ein Re-Import darf das
 * nie überschreiben.
 */

export interface TopicTreeNode extends Topic {
  children: TopicTreeNode[]
}

/** Baut den verschachtelten Baum aus der flachen Liste, sortiert nach `sort_order`. */
export function buildTree(topics: Topic[]): TopicTreeNode[] {
  const nodesById = new Map<number, TopicTreeNode>(
    topics.map((t) => [t.id, { ...t, children: [] }]),
  )
  const roots: TopicTreeNode[] = []

  for (const topic of topics) {
    const node = nodesById.get(topic.id)!
    if (topic.parent_id === null) {
      roots.push(node)
      continue
    }
    const parent = nodesById.get(topic.parent_id)
    // Ein Elternverweis ins Leere (Datenfehler) darf den Baum nicht zum
    // Absturz bringen — das Thema erscheint dann als eigene Wurzel.
    if (parent) parent.children.push(node)
    else roots.push(node)
  }

  const bySortOrder = (a: Topic, b: Topic) => a.sort_order - b.sort_order
  const sortRecursive = (nodes: TopicTreeNode[]) => {
    nodes.sort(bySortOrder)
    for (const node of nodes) sortRecursive(node.children)
  }
  sortRecursive(roots)

  return roots
}

function findTopic(topics: Topic[], id: number): Topic {
  const topic = topics.find((t) => t.id === id)
  if (!topic) throw new Error(`Thema ${id} nicht gefunden`)
  return topic
}

/** Alle IDs, die von `id` erreicht werden (inklusive `id` selbst) — für Zyklenschutz und Kaskaden-Löschung. */
function descendantIds(topics: Topic[], id: number): Set<number> {
  const result = new Set<number>([id])
  let grew = true
  while (grew) {
    grew = false
    for (const topic of topics) {
      if (topic.parent_id !== null && result.has(topic.parent_id) && !result.has(topic.id)) {
        result.add(topic.id)
        grew = true
      }
    }
  }
  return result
}

/** Benennt ein Thema um. Setzt `manual_override`, ein Re-Import darf das nie zurücksetzen. */
export function renameTopic(topics: Topic[], id: number, name: string): Topic[] {
  const trimmed = name.trim()
  if (trimmed.length === 0) throw new Error('Themenname darf nicht leer sein')
  findTopic(topics, id)

  return topics.map((t) =>
    t.id === id ? { ...t, name: trimmed, normalized_name: normalizeForCompare(trimmed), manual_override: 1 } : t,
  )
}

/**
 * Verschiebt ein Thema zu einem neuen Elternthema (oder zur Wurzel, bei
 * `newParentId = null`) an eine neue Position unter seinen neuen
 * Geschwistern. Verweigert Verschieben in den eigenen Teilbaum (Zyklus).
 * Setzt `manual_override` sowohl auf dem verschobenen Thema als auch auf
 * allen betroffenen Geschwistern, deren `sort_order` sich dadurch ändert —
 * sonst würde ein Re-Import die Reihenfolge stillschweigend zurückdrehen.
 */
export function moveTopic(
  topics: Topic[],
  id: number,
  newParentId: number | null,
  newIndex: number,
): Topic[] {
  const topic = findTopic(topics, id)

  if (newParentId !== null) {
    findTopic(topics, newParentId)
    if (descendantIds(topics, id).has(newParentId)) {
      throw new Error('Ein Thema kann nicht in seinen eigenen Teilbaum verschoben werden')
    }
  }

  const oldSiblings = topics
    .filter((t) => t.id !== id && t.parent_id === topic.parent_id)
    .sort((a, b) => a.sort_order - b.sort_order)
  const newSiblingsBefore = topics
    .filter((t) => t.id !== id && t.parent_id === newParentId)
    .sort((a, b) => a.sort_order - b.sort_order)

  const reindexed = [...newSiblingsBefore]
  const clampedIndex = Math.max(0, Math.min(newIndex, reindexed.length))
  reindexed.splice(clampedIndex, 0, topic)

  const updates = new Map<number, Partial<Topic>>()
  updates.set(id, { parent_id: newParentId, sort_order: clampedIndex, manual_override: 1 })
  reindexed.forEach((sibling, index) => {
    if (sibling.id === id || sibling.sort_order === index) return
    updates.set(sibling.id, { sort_order: index, manual_override: 1 })
  })
  // Alte Geschwister (anderer Elternknoten) lückenlos neu durchnummerieren.
  if (topic.parent_id !== newParentId) {
    oldSiblings.forEach((sibling, index) => {
      if (sibling.sort_order === index) return
      updates.set(sibling.id, { ...updates.get(sibling.id), sort_order: index })
    })
  }

  return topics.map((t) => (updates.has(t.id) ? { ...t, ...updates.get(t.id) } : t))
}

/**
 * Löscht ein Thema samt aller Unterthemen — spiegelt `ON DELETE CASCADE`
 * auf `topics.parent_id` in der Datenbank (siehe `0001_init.sql`), damit der
 * In-Memory-Zustand vor dem Speichern schon konsistent ist.
 */
export function deleteTopic(topics: Topic[], id: number): Topic[] {
  findTopic(topics, id)
  const toRemove = descendantIds(topics, id)
  return topics.filter((t) => !toRemove.has(t.id))
}
