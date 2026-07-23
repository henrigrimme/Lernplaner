import { useEffect, useState } from 'react'
import type { Course } from '../data/schema'

/**
 * Eigener Reiter in `CourseWorkspace` für frei formulierte Fach-Anweisungen
 * (`Course.instructions`, Migration 0007) — Nutzerwunsch: "wie die Custom
 * Instructions eines Claude-Projects". Fließen bisher in die
 * Quiz-Generierung ein (`ai/*Provider.ts` `generateQuestions`), nicht in
 * jeden KI-Aufruf — Altklausur-Analyse/Zusammenfassungs-Erkennung kennen
 * das Fach an ihrer Aufrufstelle in `App.tsx` nur indirekt über bereits
 * importierte Dokumente, eine Anbindung dort wäre ein größerer Umbau.
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
        Wird bei der KI-Fragen-Generierung für dieses Fach berücksichtigt — z. B. „Fokus auf Rechenaufgaben,
        weniger Theorie" oder „Erklärungen immer mit einem konkreten Beispiel".
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
