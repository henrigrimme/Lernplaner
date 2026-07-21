import { useState } from 'react'
import {
  deserializeCourseExport,
  exportCourse,
  importCourse,
  serializeCourseExport,
  type ExistingState,
  type ImportedCourseResult,
} from '../data/courseExport'
import type { Course } from '../data/schema'

/**
 * Kurs-Export/Import (ROADMAP.md Phase 3) — Browser-Download/-Upload einer
 * JSON-Datei, kein `tauri-plugin-fs` vor dem echten Rahmen (wie der
 * PDF-Import in `App.tsx`). Reine Präsentation nach außen (ARCHITECTURE.md
 * „ui/") — Bündeln/Umschreiben der IDs lebt vollständig in
 * `data/courseExport.ts`.
 */

export interface CourseExportImportProps extends ExistingState {
  onImport: (result: ImportedCourseResult) => void
  /** ISO-Zeitstempel für `exportedAt` — vom Aufrufer, keine Systemuhr in der Komponente. */
  now: () => string
}

function triggerDownload(filename: string, content: string) {
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function filenameFor(course: Course): string {
  return `${course.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.lernplaner.json`
}

export function CourseExportImport({
  courses,
  topics,
  topicSections,
  assessments,
  studyBlocks,
  onImport,
  now,
}: CourseExportImportProps) {
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleExport = () => {
    if (selectedCourseId === null) return
    const course = courses.find((c) => c.id === selectedCourseId)
    if (!course) return
    const bundle = exportCourse(selectedCourseId, courses, topics, topicSections, assessments, studyBlocks, now())
    triggerDownload(filenameFor(course), serializeCourseExport(bundle))
  }

  const handleImportFile = async (file: File) => {
    setError(null)
    try {
      const text = await file.text()
      const bundle = deserializeCourseExport(text)
      onImport(importCourse(bundle, { courses, topics, topicSections, assessments, studyBlocks }))
    } catch {
      setError('Datei konnte nicht importiert werden — kein gültiger Kurs-Export.')
    }
  }

  return (
    <section aria-label="Kurs-Export/Import">
      <h2>Kurs-Export/Import</h2>

      {courses.length > 0 && (
        <div>
          <label>
            Fach exportieren
            <select
              value={selectedCourseId ?? ''}
              onChange={(e) => setSelectedCourseId(e.target.value === '' ? null : Number(e.target.value))}
            >
              <option value="">— wählen —</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={handleExport} disabled={selectedCourseId === null}>
            Exportieren
          </button>
        </div>
      )}

      <label>
        Kurs-Export importieren
        <input
          type="file"
          accept="application/json"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleImportFile(file)
            e.target.value = ''
          }}
        />
      </label>

      {error && <p role="alert">{error}</p>}
    </section>
  )
}
