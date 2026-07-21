import { useState } from 'react'
import {
  buildTree,
  deleteTopic,
  moveTopic,
  renameTopic,
  setTopicDifficulty,
  setTopicWeight,
  type TopicTreeNode,
} from '../data/topicTree'
import type { Topic } from '../data/schema'

/**
 * Editierbare Themenbaum-Ansicht (siehe ROADMAP.md Phase 1, ARCHITECTURE.md
 * „Datenfluss beim Import" — „ui/ zeigt Themenbaum zur Prüfung").
 *
 * Trägt selbst keine Geschäftslogik (ARCHITECTURE.md „ui/ … keine
 * Geschäftslogik") — jede Änderung geht über die reinen Funktionen in
 * `data/topicTree.ts`. Diese Komponente hält keinen eigenen Datenzustand:
 * `topics` kommt von außen (aus der Datenbank geladen bzw. aus dem
 * Ergebnis von `persistExtractedDocument`, siehe `data/importTopics.ts`),
 * `onChange` liefert den neuen Stand zurück — `App.tsx` vergleicht ihn
 * mit dem vorigen und persistiert nur die Differenz (`data/topicsRepo.ts`
 * `syncTopics`), diese Komponente kennt davon nichts.
 *
 * Bewegen bewusst über Auf/Ab/Ein-/Ausrücken-Schaltflächen statt
 * Drag & Drop: tastaturbedienbar, ohne zusätzliche Abhängigkeit, und An-
 * spruchsniveau passend zu zwei Nutzern statt einem breiten Publikum.
 *
 * **Gewicht/Schwierigkeit-Regler:** wirken auf einem Kapitel (Elternknoten)
 * verschoben auf den ganzen Themenbereich — vererben sich auf alle
 * Unterthemen (siehe `setTopicWeight`/`setTopicDifficulty` in
 * `topicTree.ts`). Auf einem Blattthema betreffen sie nur dieses eine
 * Thema. Beide Werte fließen direkt in `estimateMinutes` ein
 * (`domain/estimation.ts`) — der Regler ist der eigentliche Hebel, mit dem
 * die Zeitschätzung an das eigene Gefühl angepasst wird, nicht ein
 * geschätzter Prüfungsformat-Multiplikator allein.
 */

export interface TopicTreeProps {
  topics: Topic[]
  onChange: (topics: Topic[]) => void
}

export function TopicTree({ topics, onChange }: TopicTreeProps) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)
  const tree = buildTree(topics)

  const commitRename = (id: number, name: string) => {
    setEditingId(null)
    if (name.trim().length === 0) return
    onChange(renameTopic(topics, id, name))
  }

  const move = (id: number, parentId: number | null, index: number) => {
    onChange(moveTopic(topics, id, parentId, index))
  }

  const remove = (id: number) => {
    setPendingDeleteId(null)
    onChange(deleteTopic(topics, id))
  }

  const changeWeight = (id: number, weight: Topic['weight']) => onChange(setTopicWeight(topics, id, weight))
  const changeDifficulty = (id: number, difficulty: Topic['difficulty']) =>
    onChange(setTopicDifficulty(topics, id, difficulty))

  if (tree.length === 0) {
    return <p className="topic-tree-empty">Noch kein Themenbaum importiert.</p>
  }

  return (
    <ul className="topic-tree" role="tree">
      {tree.map((node) => (
        <TopicNode
          key={node.id}
          node={node}
          parent={null}
          siblings={tree}
          editingId={editingId}
          pendingDeleteId={pendingDeleteId}
          onStartEdit={setEditingId}
          onCommitRename={commitRename}
          onMove={move}
          onRequestDelete={setPendingDeleteId}
          onConfirmDelete={remove}
          onCancelDelete={() => setPendingDeleteId(null)}
          onChangeWeight={changeWeight}
          onChangeDifficulty={changeDifficulty}
        />
      ))}
    </ul>
  )
}

interface TopicNodeProps {
  node: TopicTreeNode
  /** Der Elternknoten von `node`, oder `null` auf Wurzelebene — für „Ausrücken" (braucht dessen `parent_id`). */
  parent: TopicTreeNode | null
  siblings: TopicTreeNode[]
  editingId: number | null
  pendingDeleteId: number | null
  onStartEdit: (id: number | null) => void
  onCommitRename: (id: number, name: string) => void
  onMove: (id: number, parentId: number | null, index: number) => void
  onRequestDelete: (id: number) => void
  onConfirmDelete: (id: number) => void
  onCancelDelete: () => void
  onChangeWeight: (id: number, weight: Topic['weight']) => void
  onChangeDifficulty: (id: number, difficulty: Topic['difficulty']) => void
}

function TopicNode({
  node,
  parent,
  siblings,
  editingId,
  pendingDeleteId,
  onStartEdit,
  onCommitRename,
  onMove,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
  onChangeWeight,
  onChangeDifficulty,
}: TopicNodeProps) {
  const [draft, setDraft] = useState(node.name)
  const index = siblings.findIndex((s) => s.id === node.id)
  const isFirst = index <= 0
  const isLast = index === siblings.length - 1
  const previousSibling = index > 0 ? siblings[index - 1] : undefined
  const isChapter = node.children.length > 0

  return (
    <li role="treeitem" aria-label={node.name} data-topic-id={node.id}>
      <div className="topic-node">
        {editingId === node.id ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              onCommitRename(node.id, draft)
            }}
          >
            <input
              aria-label={`Name von ${node.name}`}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
            />
            <button type="submit">Speichern</button>
            <button type="button" onClick={() => onStartEdit(null)}>
              Abbrechen
            </button>
          </form>
        ) : (
          <>
            <span className="topic-name">{node.name}</span>
            {node.manual_override === 1 && (
              <span className="topic-manual-badge" title="Manuell bearbeitet — Re-Import überschreibt dies nicht">
                bearbeitet
              </span>
            )}
            <label>
              Gewicht{isChapter ? ' (ganzer Bereich)' : ''}
              <input
                type="range"
                min={1}
                max={5}
                value={node.weight}
                aria-label={`Gewicht von ${node.name}`}
                onChange={(e) => onChangeWeight(node.id, Number(e.target.value) as Topic['weight'])}
              />
              {node.weight}
            </label>
            <label>
              Schwierigkeit{isChapter ? ' (ganzer Bereich)' : ''}
              <input
                type="range"
                min={1}
                max={5}
                value={node.difficulty}
                aria-label={`Schwierigkeit von ${node.name}`}
                onChange={(e) => onChangeDifficulty(node.id, Number(e.target.value) as Topic['difficulty'])}
              />
              {node.difficulty}
            </label>
            <button type="button" onClick={() => { setDraft(node.name); onStartEdit(node.id) }}>
              Umbenennen
            </button>
            <button type="button" disabled={isFirst} onClick={() => onMove(node.id, node.parent_id, index - 1)}>
              ↑
            </button>
            <button type="button" disabled={isLast} onClick={() => onMove(node.id, node.parent_id, index + 1)}>
              ↓
            </button>
            <button
              type="button"
              disabled={!previousSibling}
              title="Einrücken: unter das vorige Geschwisterthema verschieben"
              onClick={() =>
                previousSibling &&
                // Ans Ende der (noch unbekannten) Kinderzahl anhängen: moveTopic
                // klemmt den Index selbst auf die tatsächliche Länge (siehe
                // topicTree.ts) — Number.MAX_SAFE_INTEGER heißt einfach "letzte Position".
                onMove(node.id, previousSibling.id, Number.MAX_SAFE_INTEGER)
              }
            >
              →
            </button>
            <button
              type="button"
              disabled={parent === null}
              title="Ausrücken: eine Ebene nach oben verschieben, direkt hinter das bisherige Elternthema"
              onClick={() => parent && onMove(node.id, parent.parent_id, Number.MAX_SAFE_INTEGER)}
            >
              ←
            </button>
            {pendingDeleteId === node.id ? (
              <span>
                Wirklich löschen?
                <button type="button" onClick={() => onConfirmDelete(node.id)}>
                  Ja
                </button>
                <button type="button" onClick={onCancelDelete}>
                  Nein
                </button>
              </span>
            ) : (
              <button type="button" onClick={() => onRequestDelete(node.id)}>
                Löschen
              </button>
            )}
          </>
        )}
      </div>
      {node.children.length > 0 && (
        <ul role="group">
          {node.children.map((child) => (
            <TopicNode
              key={child.id}
              node={child}
              parent={node}
              siblings={node.children}
              editingId={editingId}
              pendingDeleteId={pendingDeleteId}
              onStartEdit={onStartEdit}
              onCommitRename={onCommitRename}
              onMove={onMove}
              onRequestDelete={onRequestDelete}
              onConfirmDelete={onConfirmDelete}
              onCancelDelete={onCancelDelete}
              onChangeWeight={onChangeWeight}
              onChangeDifficulty={onChangeDifficulty}
            />
          ))}
        </ul>
      )}
    </li>
  )
}
