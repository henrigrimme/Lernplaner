import type { ReactNode } from 'react'
import { TabbedPanel } from './TabbedPanel'
import { UpdateChecker, type UpdateInfo } from './UpdateChecker'
import { AppearanceSetting, type PalettePreference, type ThemePreference } from './AppearanceSetting'
import { AiSettings } from './AiSettings'
import { NotificationsPanel } from './NotificationsPanel'
import { CalendarExport } from './CalendarExport'
import { CourseExportImport } from './CourseExportImport'
import type { Assessment, Course, StudyBlock, Topic, TopicSection } from '../data/schema'
import type { NotificationContent } from '../domain/notifications'
import type { ImportedCourseResult } from '../data/courseExport'

/**
 * Einstellungen, nach Kategorie gruppiert statt als eine lange Liste
 * (Redesign 2026-07-23, `impeccable`-Durchgang: sechs unabhängige
 * Blöcke — Updates, Aussehen, KI, Benachrichtigungen, Kalender-Export,
 * Kurs-Export/Import — standen vorher einfach untereinander, dasselbe
 * „lange Ein-Seiten-Liste"-Problem wie zuvor bei „Fächer & Themen").
 * Nutzt dieselbe Reiter-Mechanik wie `ui/CourseWorkspace.tsx`
 * (`ui/TabbedPanel.tsx`) — an die Claude-App/macOS-Systemeinstellungen
 * angelehnt, die Einstellungen ebenfalls nach Kategorie statt als eine
 * lange Seite zeigen. Reine Zusammensetzung (ARCHITECTURE.md „ui/") —
 * jede der sechs Komponenten bleibt unverändert, nur ihre Anordnung
 * ändert sich.
 */

export interface SettingsViewProps {
  onCheckForUpdate: () => Promise<UpdateInfo>
  onInstallUpdate: () => Promise<void>
  theme: ThemePreference
  onChangeTheme: (theme: ThemePreference) => void
  palette: PalettePreference
  onChangePalette: (palette: PalettePreference) => void
  onCheckNotifications: () => Promise<NotificationContent[]>
  studyBlocks: StudyBlock[]
  topics: Topic[]
  courses: Course[]
  topicSections: TopicSection[]
  assessments: Assessment[]
  onImportCourse: (result: ImportedCourseResult) => void
}

export function SettingsView({
  onCheckForUpdate,
  onInstallUpdate,
  theme,
  onChangeTheme,
  palette,
  onChangePalette,
  onCheckNotifications,
  studyBlocks,
  topics,
  courses,
  topicSections,
  assessments,
  onImportCourse,
}: SettingsViewProps) {
  const tabs: { key: string; label: string; content: ReactNode }[] = [
    {
      key: 'allgemein',
      label: 'Allgemein',
      content: <UpdateChecker onCheckNow={onCheckForUpdate} onInstall={onInstallUpdate} />,
    },
    {
      key: 'erscheinungsbild',
      label: 'Erscheinungsbild',
      content: <AppearanceSetting theme={theme} onChangeTheme={onChangeTheme} palette={palette} onChangePalette={onChangePalette} />,
    },
    { key: 'ki', label: 'KI-Anbindung', content: <AiSettings /> },
    { key: 'benachrichtigungen', label: 'Benachrichtigungen', content: <NotificationsPanel onCheckNow={onCheckNotifications} /> },
    {
      key: 'daten',
      label: 'Daten',
      content: (
        <>
          <CalendarExport studyBlocks={studyBlocks} topics={topics} now={() => new Date().toISOString()} />
          <CourseExportImport
            courses={courses}
            topics={topics}
            topicSections={topicSections}
            assessments={assessments}
            studyBlocks={studyBlocks}
            onImport={onImportCourse}
            now={() => new Date().toISOString()}
          />
        </>
      ),
    },
  ]

  return (
    <section aria-label="Einstellungen">
      <TabbedPanel tablistLabel="Einstellungs-Bereiche" tabs={tabs} />
    </section>
  )
}
