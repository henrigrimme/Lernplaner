import { useState } from 'react'
import { TopicTree } from './ui/TopicTree'
import type { Topic } from './data/schema'

/**
 * Provisorischer App-Rahmen — beweist, dass Tauri-Fenster, Vite-Build und
 * die `ui/`-Schicht zusammenspielen (ROADMAP.md Phase 1 „Tauri-Projekt,
 * Build, Tests, CI"). Noch **keine** echte Funktionalität: kein Fach-Setup,
 * kein PDF-Import, keine `tauri-plugin-sql`-Anbindung — `topics` ist lokaler
 * React-Zustand statt aus der Datenbank geladen. Das kommt mit der
 * eigentlichen Datenanbindung, siehe CONTEXT.md Abschnitt 8.
 */
export function App() {
  const [topics, setTopics] = useState<Topic[]>([])

  return (
    <main>
      <h1>Lernplaner</h1>
      <TopicTree topics={topics} onChange={setTopics} />
    </main>
  )
}
