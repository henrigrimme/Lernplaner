import { describe, expect, it } from 'vitest'
import { groupIntoSlides, isBuildStep } from '../../src/ingest/slides'
import type { BodyLine, Page } from '../../src/ingest/types'

function line(text: string, x: number, y: number): BodyLine {
  return { text, x, y, size: 18 }
}

describe('isBuildStep', () => {
  it('behandelt eine leere Vorgängerseite als Startpunkt eines Aufbaus', () => {
    expect(isBuildStep([], [line('Erster Punkt', 70, 300)])).toBe(true)
  })

  it('erkennt einen echten Animationsschritt: bestehende Zeile bleibt an ihrer Position, eine neue kommt hinzu', () => {
    const earlier: BodyLine[] = [
      line('New-to-World innovation New-to-Firm innovation', 145, 378),
    ]
    const later: BodyLine[] = [
      line('New-to-World innovation New-to-Firm innovation', 145, 378),
      line('Bildbeschreibung eines neu eingeblendeten Fotos', 111, 288),
    ]
    expect(isBuildStep(earlier, later)).toBe(true)
  })

  it('erkennt einen Aufbauschritt trotz geändertem Zeilenumbruch, solange die Position stabil bleibt', () => {
    // PowerPoint kann beim Nachrendern eine bestehende Zeile anders umbrechen
    // (z. B. weil eine neue Zeile darunter Platz beansprucht) — der reine
    // Textvergleich verpasst das, der Positionsvergleich nicht.
    const earlier: BodyLine[] = [
      line('Established firms are aware of new technologies but', 68, 324),
    ]
    const later: BodyLine[] = [
      line('Established firms are aware of new technologies', 68, 323),
      line('but underestimate the disruptive potential', 68, 288),
    ]
    expect(isBuildStep(earlier, later)).toBe(true)
  })

  it('fasst NICHT zusammen, wenn zwei Folien nur zufällig denselben Titel teilen (Money & Banking-Fall)', () => {
    // Drei inhaltlich verschiedene Folien zu "Types of Financial
    // Intermediaries" nutzen dasselbe Layout-Template — die erste Zeile
    // beginnt jeweils an derselben Position, der Text ist aber jedes Mal ein
    // anderer Subtyp von Finanzintermediär. Position allein darf hier nicht
    // reichen.
    const depository: BodyLine[] = [
      line('Depository institutions', 70, 400),
      line('Banks, savings and loan associations, credit unions', 70, 360),
    ]
    const contractualSavings: BodyLine[] = [
      line('Contractual savings institutions', 70, 400),
      line('Insurance companies and pension funds', 70, 360),
    ]
    expect(isBuildStep(depository, contractualSavings)).toBe(false)
  })

  it('fasst nicht zusammen, wenn der Inhalt komplett ersetzt statt ergänzt wurde', () => {
    const earlier: BodyLine[] = [
      line('Erster inhaltlicher Punkt zur Folie', 70, 300),
      line('Zweiter inhaltlicher Punkt zur Folie', 70, 260),
    ]
    const later: BodyLine[] = [line('Völlig anderer Text an anderer Stelle', 300, 100)]
    expect(isBuildStep(earlier, later)).toBe(false)
  })
})

describe('groupIntoSlides', () => {
  function page(overrides: Partial<Page> & { number: number; title: string }): Page {
    return {
      lines: [],
      bodyLines: [],
      width: 720,
      height: 540,
      ...overrides,
    }
  }

  it('fasst zwei PDF-Seiten eines Animationsaufbaus zu einer Folie zusammen', () => {
    const pages: Page[] = [
      page({ number: 1, title: 'Novelty of innovations' }),
      page({ number: 2, title: 'Novelty of innovations' }),
    ]
    const bodyLinesByPage = new Map<number, BodyLine[]>([
      [1, [line('New-to-World innovation New-to-Firm innovation', 145, 378)]],
      [
        2,
        [
          line('New-to-World innovation New-to-Firm innovation', 145, 378),
          line('Bildbeschreibung eines neu eingeblendeten Fotos', 111, 288),
        ],
      ],
    ])

    const slides = groupIntoSlides(pages, bodyLinesByPage)

    expect(slides).toHaveLength(1)
    expect(slides[0]!.pageNumbers).toEqual([1, 2])
  })

  it('hält drei titelgleiche, inhaltlich verschiedene Folien auseinander', () => {
    const pages: Page[] = [
      page({ number: 20, title: 'Types of Financial Intermediaries' }),
      page({ number: 21, title: 'Types of Financial Intermediaries' }),
      page({ number: 22, title: 'Types of Financial Intermediaries' }),
    ]
    const bodyLinesByPage = new Map<number, BodyLine[]>([
      [
        20,
        [
          line('Depository institutions', 70, 400),
          line('Banks, savings and loan associations, credit unions', 70, 360),
        ],
      ],
      [
        21,
        [
          line('Contractual savings institutions', 70, 400),
          line('Insurance companies and pension funds', 70, 360),
        ],
      ],
      [
        22,
        [
          line('Investment intermediaries and brokers', 70, 400),
          line('Finance companies and mutual funds', 70, 360),
        ],
      ],
    ])

    const slides = groupIntoSlides(pages, bodyLinesByPage)

    expect(slides).toHaveLength(3)
    expect(slides.every((s) => s.pageNumbers.length === 1)).toBe(true)
  })
})
