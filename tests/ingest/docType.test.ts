import { describe, expect, it } from 'vitest'
import { inferDocType } from '../../src/ingest/docType'

/**
 * Fälle stammen aus echten Dateinamen der drei validierten Fächer plus
 * neu gesichteten WHU-Kursen (siehe CONTEXT.md „Analyse: Beispiel-PDFs").
 */
describe('inferDocType', () => {
  it('erkennt Altklausuren an typischen Dateinamen', () => {
    expect(inferDocType('Final exam Nurturing customer relationships Fall 2025.pdf')).toBe('altklausur')
    expect(inferDocType('Exam review Nurturing customer relationships Spring term 2026.pdf')).toBe('altklausur')
  })

  it('erkennt eine Altklausur über den Ordnernamen, wenn der Dateiname allein nichts hergibt', () => {
    expect(inferDocType('Mock.pdf', ['Money Banking and Financial Markets', 'Mock Exam'])).toBe('altklausur')
  })

  it('erkennt Musterlösungen vor Übungen, obwohl "exercise" in beiden Namen vorkommt', () => {
    expect(inferDocType('01_first_queries_exercise_solutions.pdf')).toBe('musterloesung')
    expect(inferDocType('01_first_queries_exercise_tasks.pdf')).toBe('uebung')
  })

  it('erkennt Zusammenfassungen/Cheat Sheets am Dateinamen, auch innerhalb eines Altklausur-Ordners', () => {
    expect(inferDocType('Cheat Sheet.pdf', ['Money Banking and Financial Markets', 'Mock Exam'])).toBe('zusammenfassung')
    expect(inferDocType('Zusammenfassung Money Banking and Financial Markets.pdf')).toBe('zusammenfassung')
  })

  it('erkennt Skripte vor Folien', () => {
    expect(inferDocType('Skript_WHU_12-03-2026.pdf')).toBe('skript')
  })

  it('erkennt Folien am Dateinamen', () => {
    expect(inferDocType('Slides Session 1.pdf')).toBe('folien')
  })

  it('fällt ohne jedes Signal auf "folien" zurück (häufigster Fall bei echtem Material)', () => {
    expect(inferDocType('02 Consumer Theory 01.pdf')).toBe('folien')
    expect(inferDocType('Syllabus.pdf')).toBe('folien')
  })
})
