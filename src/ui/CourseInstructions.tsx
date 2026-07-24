import { useEffect, useState } from 'react'
import type { Course } from '../data/schema'

/**
 * Eigener Reiter in `CourseWorkspace` für frei formulierte Fach-Anweisungen
 * (`Course.instructions`, Migration 0007) — Nutzerwunsch: "wie die Custom
 * Instructions eines Claude-Projects". Fließen in alle drei KI-Aufrufe
 * ein, die bereits einem Fach zugeordnet sind (`ai/*Provider.ts`
 * `generateQuestions`/`classifyExamContent`/`detectTopicsFromText`,
 * Nachtrag 2026-07-24 — anfangs nur die Quiz-Generierung, siehe
 * Kommentar-Historie).
 *
 * Lokaler Entwurfs-Zustand statt direktem Schreiben bei jedem Tastendruck
 * (kein `onChange`-Autosave): ein Absenden mitten im Formulieren würde bei
 * jedem Buchstaben eine DB-Schreiboperation auslösen, wie `CourseSetup`
 * o.ä. es auch nicht tun.
 */

export interface CourseInstructionsProps {
  course: Course
  onSave: (instructions: string) => void
}

export function CourseInstructions({ course, onSave }: CourseInstructionsProps) {
  const [draft, setDraft] = useState(course.instructions)

  // Ein Fachwechsel (andere `course.id`) muss den Entwurf zurücksetzen —
  // sonst stünde beim Wechsel zu einem anderen Fach kurzzeitig der Text des
  // vorherigen Fachs im Feld.
  useEffect(() => {
    setDraft(course.instructions)
  }, [course.id, course.instructions])

  const dirty = draft !== course.instructions

  return (
    <section aria-label="Anweisungen">
      <h2>Anweisungen für {course.name}</h2>
      <p>
        Wird bei der KI-Fragen-Generierung, der Altklausur-Analyse und der Zusammenfassungs-Erkennung für dieses
        Fach berücksichtigt — z. B. „Fokus auf Rechenaufgaben, weniger Theorie" oder „Erklärungen immer mit einem
        konkreten Beispiel".
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSave(draft)
        }}
      >
        <label>
          Eigene Anweisungen
          <textarea
            rows={6}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="z. B. „Antworten stichpunktartig, nicht in ganzen Sätzen.“"
          />
        </label>
        <button type="submit" disabled={!dirty}>
          {dirty ? 'Speichern' : 'Gespeichert'}
        </button>
      </form>
    </section>
  )
}
