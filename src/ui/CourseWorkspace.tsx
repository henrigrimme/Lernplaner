import { useState } from 'react'
import type { ReactNode } from 'react'
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
 * Formular) verwerfen.
 */

export type CourseWorkspaceTab = 'pruefungen' | 'material' | 'themen'

const TABS: { key: CourseWorkspaceTab; label: string }[] = [
  { key: 'pruefungen', label: 'Prüfungen' },
  { key: 'material', label: 'Material' },
  { key: 'themen', label: 'Themen & Quellen' },
]

export interface CourseWorkspaceProps {
  course: Course
  pruefungenContent: ReactNode
  materialContent: ReactNode
  themenContent: ReactNode
}

export function CourseWorkspace({ course, pruefungenContent, materialContent, themenContent }: CourseWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<CourseWorkspaceTab>('pruefungen')
  const contentByTab: Record<CourseWorkspaceTab, ReactNode> = {
    pruefungen: pruefungenContent,
    material: materialContent,
    themen: themenContent,
  }

  return (
    <section aria-label={`Fach-Detail: ${course.name}`} className="course-workspace">
      <div role="tablist" aria-label="Fach-Bereiche" className="course-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            id={`course-tab-${tab.key}`}
            aria-selected={activeTab === tab.key}
            aria-controls={`course-tabpanel-${tab.key}`}
            className="course-tab"
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {TABS.map((tab) => (
        <div
          key={tab.key}
          role="tabpanel"
          id={`course-tabpanel-${tab.key}`}
          aria-labelledby={`course-tab-${tab.key}`}
          hidden={activeTab !== tab.key}
          className="course-tabpanel"
        >
          {contentByTab[tab.key]}
        </div>
      ))}
    </section>
  )
}
