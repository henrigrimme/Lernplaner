/**
 * Löst einen Browser-Datei-Download aus (`Blob` + `URL.createObjectURL` +
 * programmatischer Klick auf ein `<a download>`) — kein `tauri-plugin-fs`
 * vor dem echten Rahmen. Geteilt zwischen `CourseExportImport.tsx` und
 * `CalendarExport.tsx`, beide brauchen exakt denselben Ablauf.
 */
export function triggerDownload(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
