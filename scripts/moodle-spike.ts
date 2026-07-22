/**
 * Wegwerf-Diagnoseskript (Phase 0 der Moodle-Anbindung, siehe DECISIONS.md
 * ADR-010) — kein Teil der App, nirgends importiert. Prüft an echten Daten,
 * bevor irgendein Datenmodell dafür festgelegt wird:
 *
 *   - Welche Web-Service-Funktionen hat WHU für den Mobile-App-Dienst
 *     tatsächlich freigeschaltet? (nicht jede Moodle-Instanz erlaubt alle)
 *   - Ist Raum ein eigenes strukturiertes Feld oder nur Freitext?
 *   - Wie sieht ein Klausur-/Abgabe-Link in der Rohantwort aus?
 *   - Liefert der Kalender eine eigene Event-Id (Dedup-Schlüssel)?
 *   - Zeitstempel-Format?
 *
 * Fragt Basis-URL/Nutzername/Passwort interaktiv ab (readline, damit nichts
 * in der Shell-History landet), schreibt die komplette Rohantwort in eine
 * lokale Datei — der Token selbst wird nie in die Konsole geschrieben.
 *
 *   npx tsx scripts/moodle-spike.ts
 */
import { createInterface } from 'node:readline/promises'
import { writeFileSync } from 'node:fs'

const DEFAULT_BASE_URL = 'https://moodle.whu.edu/moodle'
const OUTPUT_PATH = '/tmp/moodle-spike-output.json'

async function ask(rl: ReturnType<typeof createInterface>, question: string, fallback?: string): Promise<string> {
  const answer = await rl.question(fallback ? `${question} [${fallback}]: ` : `${question}: `)
  return answer.trim() || fallback || ''
}

async function askHidden(rl: ReturnType<typeof createInterface>, question: string): Promise<string> {
  // Node's readline hat kein eingebautes "kein Echo" — für ein reines
  // Wegwerf-Lokalskript ausreichend, Passwort wird nirgends geloggt/gespeichert.
  return rl.question(`${question}: `)
}

async function callWebService(baseUrl: string, token: string, wsfunction: string, params: Record<string, string>) {
  const url = new URL(`${baseUrl}/webservice/rest/server.php`)
  url.searchParams.set('wstoken', token)
  url.searchParams.set('wsfunction', wsfunction)
  url.searchParams.set('moodlewsrestformat', 'json')
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)

  const response = await fetch(url, { method: 'POST' })
  return response.json()
}

async function main() {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const baseUrl = (await ask(rl, 'Moodle-Basis-URL', DEFAULT_BASE_URL)).replace(/\/$/, '')
  const username = await ask(rl, 'Nutzername')
  const password = await askHidden(rl, 'Passwort')
  rl.close()

  console.log('\n1) Token anfragen …')
  const tokenUrl = new URL(`${baseUrl}/login/token.php`)
  tokenUrl.searchParams.set('username', username)
  tokenUrl.searchParams.set('password', password)
  tokenUrl.searchParams.set('service', 'moodle_mobile_app')
  const tokenResponse = (await (await fetch(tokenUrl, { method: 'POST' })).json()) as {
    token?: string
    error?: string
    errorcode?: string
  }

  if (!tokenResponse.token) {
    console.error('Kein Token erhalten:', tokenResponse.error ?? tokenResponse.errorcode ?? tokenResponse)
    process.exit(1)
  }
  console.log('   Token erhalten (wird nicht angezeigt).')
  const token = tokenResponse.token

  console.log('2) core_webservice_get_site_info …')
  const siteInfo = await callWebService(baseUrl, token, 'core_webservice_get_site_info', {})
  const siteInfoObj = siteInfo as { userid?: number; functions?: { name: string }[] }
  console.log(`   userid=${siteInfoObj.userid}, freigeschaltete Funktionen: ${siteInfoObj.functions?.length ?? 0}`)

  console.log('3) core_enrol_get_users_courses …')
  const courses = await callWebService(baseUrl, token, 'core_enrol_get_users_courses', {
    userid: String(siteInfoObj.userid ?? ''),
  })
  const coursesArr = courses as { id: number; fullname: string }[]
  console.log(`   ${Array.isArray(coursesArr) ? coursesArr.length : 0} Kurse gefunden.`)
  if (Array.isArray(coursesArr)) {
    coursesArr.slice(0, 5).forEach((c) => console.log(`   - [${c.id}] ${c.fullname}`))
  }

  const firstCourseId = Array.isArray(coursesArr) && coursesArr[0] ? coursesArr[0].id : null
  let assignments: unknown = null
  let calendarEvents: unknown = null

  if (firstCourseId !== null) {
    console.log(`4) mod_assign_get_assignments für Kurs ${firstCourseId} …`)
    assignments = await callWebService(baseUrl, token, 'mod_assign_get_assignments', {
      'courseids[0]': String(firstCourseId),
    })

    console.log(`5) core_calendar_get_calendar_events für Kurs ${firstCourseId} …`)
    calendarEvents = await callWebService(baseUrl, token, 'core_calendar_get_calendar_events', {
      'events[courseids][0]': String(firstCourseId),
    })
  } else {
    console.log('4)/5) Übersprungen — kein Kurs gefunden.')
  }

  writeFileSync(
    OUTPUT_PATH,
    JSON.stringify({ siteInfo, courses, assignments, calendarEvents }, null, 2),
  )
  console.log(`\nFertig. Rohantworten (ohne Token) geschrieben nach: ${OUTPUT_PATH}`)
  console.log('Bitte darin nachschauen: Raum als eigenes Feld? Klausur-Link sichtbar? Event-Id vorhanden?')
}

main().catch((error) => {
  console.error('Fehler:', error)
  process.exit(1)
})
