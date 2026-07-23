import { useState } from 'react'
import type { ReactNode } from 'react'

/**
 * Generische Reiter-Umschaltung — extrahiert aus `ui/CourseWorkspace.tsx`
 * (Redesign 2026-07-23), damit ein zweiter Ort mit demselben Problem
 * („zu viele unabhängige Bereiche auf einer Seite", hier: Einstellungen)
 * dasselbe Muster wiederverwendet statt ein drittes Organisationsprinzip
 * einzuführen — genau die Inkonsistenz, die ein `impeccable`-Durchgang
 * (23.07.2026) an diesem Punkt bemängelt hätte (drei verschiedene
 * „viele Dinge auf einer Seite"-Lösungen: flache Liste, Reiter,
 * Assistent). Reine Präsentation (ARCHITECTURE.md „ui/") — jeder
 * Reiterinhalt kommt fertig zusammengesetzt als `ReactNode` herein.
 *
 * Alle Panels bleiben über `hidden` im DOM (kein bedingtes Unmounten) —
 * ein Reiterwechsel darf keinen offenen Formularzustand in einem anderen
 * Reiter verwerfen (z. B. einen halb eingetippten API-Schlüssel in den
 * KI-Einstellungen, während man kurz zu „Erscheinungsbild" wechselt).
 */

export interface TabDefinition<Key extends string> {
  key: Key
  label: string
  content: ReactNode
}

export interface TabbedPanelProps<Key extends string> {
  /** Beschriftet die Reiterleiste selbst (`role="tablist"`), nicht die einzelnen Reiter. */
  tablistLabel: string
  tabs: TabDefinition<Key>[]
}

export function TabbedPanel<Key extends string>({ tablistLabel, tabs }: TabbedPanelProps<Key>) {
  const [activeTab, setActiveTab] = useState<Key>(tabs[0]!.key)

  return (
    <>
      <div role="tablist" aria-label={tablistLabel} className="tab-strip">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            id={`tab-${tab.key}`}
            aria-selected={activeTab === tab.key}
            aria-controls={`tabpanel-${tab.key}`}
            className="tab-strip-button"
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.key}
          role="tabpanel"
          id={`tabpanel-${tab.key}`}
          aria-labelledby={`tab-${tab.key}`}
          hidden={activeTab !== tab.key}
          className="tab-panel"
        >
          {tab.content}
        </div>
      ))}
    </>
  )
}
