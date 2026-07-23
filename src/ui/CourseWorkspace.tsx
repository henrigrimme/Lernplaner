import type { ReactNode } from 'react'
import { TabbedPanel } from './TabbedPanel'
import type { Course } from '../data/schema'

/**
 * Fokussierte Detailansicht für das gewählte Fach (Redesign 2026-07-23,
 * Nutzerwunsch aus der Nachtsitzung: „eine fokussierte Detailansicht pro
 * gewähltem Fach statt einer langen Ein-Seiten-Liste", siehe CONTEXT.md).
 *
 * Vorher standen Prüfungen, Paper-Schritte, Import, Dokumentenliste,
 * Altklausur-Analyse, Themenbaum und Quellen-Betrachter alle
 * untereinander auf einer einzigen, sehr langen Seite. Diese Komponente
 * bündelt sie stattdessen in drei Reitern — reine Präsentation
 * (ARCHITECTURE.md „ui/ … keine Geschäftslogik"): jeder Reiterinhalt
 * kommt fertig zusammengesetzt von `App.tsx` als `ReactNode` herein,
 * `CourseWorkspace` kennt weder Themen noch Dokumente noch Prüfungen im
 * Detail, nur die Reiter-Umschaltung selbst.
 *
 * Alle drei Panels bleiben permanent im DOM (`hidden`-Attribut statt
 * bedingtem Rendern) — ein Wechsel zurück zu „Prüfungen" darf keinen
 * offenen Bearbeitungszustand in „Material" (z. B. ein angefangenes
 * Formular) verwerfen. Die eigentliche Reiter-Mechanik lebt seit dem
 * Einstellungen-Redesign (23.07.2026) in `ui/TabbedPanel.tsx` — geteilt,
 * damit nicht zwei Seiten mit demselben Grundproblem („mehrere
 * gleichrangige Bereiche") zwei verschiedene Lösungen bekommen.
 */

export interface CourseWorkspaceProps {
  course: Course
  pruefungenContent: ReactNode
  materialContent: ReactNode
  themenContent: ReactNode
}

export function CourseWorkspace({ course, pruefungenContent, materialContent, themenContent }: CourseWorkspaceProps) {
  return (
    <section aria-label={`Fach-Detail: ${course.name}`} className="course-workspace">
      <TabbedPanel
        tablistLabel="Fach-Bereiche"
        tabs={[
          { key: 'pruefungen', label: 'Prüfungen', content: pruefungenContent },
          { key: 'material', label: 'Material', content: materialContent },
          { key: 'themen', label: 'Themen & Quellen', content: themenContent },
        ]}
      />
    </section>
  )
}
