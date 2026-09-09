import { describe, expect, it } from 'vitest'
import { splitExercises, type ExercisePage } from '../../src/ingest/exerciseSplit'

/**
 * Die Zeilenformen stammen aus echtem Material (`Beispiel pdfs/Money
 * Banking and Financial Markets/Problem Set 1.pdf` / `Online Questions
 * 1.pdf`), auf die wesentlichen Fälle eingedampft — siehe CONTEXT.md
 * „Plausibilitätscheck" für den Lauf gegen die vollständigen PDFs.
 */
function pages(...perPage: string[][]): ExercisePage[] {
  return perPage.map((lines, i) => ({ pageNumber: i + 1, lines }))
}

describe('splitExercises', () => {
  it('trennt „1)"-nummerierte Aufgaben und zieht den Kurztitel aus der Markerzeile', () => {
    const { exercises } = splitExercises(
      pages([
        'Problem Set 1',
        '1) Leverage',
        'Janet and Mike purchase identical houses for $400,000.',
        'Who is more highly leveraged?',
        '2) Risk',
        'Assume that the economy can experience high growth or recession.',
      ]),
    )
    expect(exercises).toHaveLength(2)
    expect(exercises[0]).toMatchObject({
      number: '1',
      label: 'Leverage',
      text: 'Janet and Mike purchase identical houses for $400,000.\nWho is more highly leveraged?',
      pageStart: 1,
      pageEnd: 1,
    })
    expect(exercises[1]).toMatchObject({ number: '2', label: 'Risk' })
  })

  it('behandelt „1."-Aufgaben ohne Titel (Markerzeile ist bereits die Frage)', () => {
    const { exercises } = splitExercises(
      pages([
        'Online Questions 1',
        '1. Which of the following would be more valuable to you: a portfolio of stocks',
        'that rises when your income rises or one that rises when it falls? Why?',
        '2. Has the distinction between direct and indirect finance become more important?',
      ]),
    )
    expect(exercises).toHaveLength(2)
    expect(exercises[0]!.label).toBe('')
    expect(exercises[0]!.text).toBe(
      'Which of the following would be more valuable to you: a portfolio of stocks\nthat rises when your income rises or one that rises when it falls? Why?',
    )
  })

  it('hält Teilaufgaben a./b. innerhalb der Elternaufgabe', () => {
    const { exercises } = splitExercises(
      pages([
        '3. You are the founder of IGRO, an Internet firm that delivers groceries.',
        'a. Give an example of an idiosyncratic risk and a systematic risk.',
        'b. What are the risks you face, and how should you reduce them?',
        '4. Explain how liquidity problems can be a source of systemic risk.',
      ]),
    )
    expect(exercises).toHaveLength(2)
    expect(exercises[0]!.text).toContain('a. Give an example')
    expect(exercises[0]!.text).toContain('b. What are the risks')
    expect(exercises[1]!.number).toBe('4')
  })

  it('erkennt keine neue Aufgabe an einer Zahl mitten im Text (kein Punkt/Klammer, nicht die nächste Nummer)', () => {
    const { exercises } = splitExercises(
      pages([
        '5) Bond Pricing',
        'A 10-year zero-coupon bond has a yield of 6 percent.',
        'b. Suppose that expected inflation is still 2 percent, but the probability that it will move to',
        '3 percent has risen. Describe the consequences for the price of the bond.',
        '6) Bond yield',
        'Calculate the yield to maturity for each of the following one-year coupon bonds.',
      ]),
    )
    expect(exercises.map((e) => e.number)).toEqual(['5', '6'])
    expect(exercises[0]!.text).toContain('3 percent has risen')
    expect(exercises[0]!.text).toContain('10-year zero-coupon bond')
  })

  it('verfolgt mehrseitige Aufgaben und entfernt die wiederkehrende Titel-Kopfzeile', () => {
    const { exercises, preamble } = splitExercises(
      pages(
        ['Money, Banking and Financial Markets', 'Problem Set 1', '1) Leverage', 'Janet and Mike buy houses.'],
        ['Money, Banking and Financial Markets', 'Assuming everything else equal, who is more leveraged?', '2) Risk', 'Assume high or low growth.', '1'],
      ),
    )
    expect(preamble).toEqual(['Problem Set 1'])
    expect(exercises[0]).toMatchObject({ number: '1', pageStart: 1, pageEnd: 2 })
    expect(exercises[0]!.text).toBe('Janet and Mike buy houses.\nAssuming everything else equal, who is more leveraged?')
    // „Money, Banking and Financial Markets" darf nicht im Aufgabentext stehen,
    // die reine Seitenzahl-Fußzeile „1" ebenso wenig.
    expect(exercises[0]!.text).not.toContain('Money, Banking')
    expect(exercises[1]!.text).toBe('Assume high or low growth.')
  })

  it('lässt die erste Aufgabe mit beliebiger Nummer beginnen, danach lückenlos', () => {
    const { exercises } = splitExercises(
      pages([
        '0. Vorbemerkung: alle Angaben ohne Gewähr, dennoch bitte sorgfältig rechnen.',
        '1. Erste echte Aufgabe mit genügend Text, damit sie zählt.',
      ]),
    )
    expect(exercises.map((e) => e.number)).toEqual(['0', '1'])
  })

  it('markiert eine Agenda-Folie nicht als Übungsblatt (kurze Stichpunkte)', () => {
    const { looksLikeExerciseSheet, exercises } = splitExercises(
      pages([
        'Agenda',
        '1. Overview and Types',
        '2. Return on bonds',
        '3. Bond market',
        '4. Yield curve',
      ]),
    )
    expect(exercises.length).toBeGreaterThanOrEqual(3)
    expect(looksLikeExerciseSheet).toBe(false)
  })

  it('markiert ein echtes Blatt mit genügend Aufgabentext als Übungsblatt', () => {
    const { looksLikeExerciseSheet } = splitExercises(
      pages([
        '1. Which of the following would be more valuable to you and why? Explain in detail.',
        '2. Has the distinction between direct and indirect forms of finance become more important?',
        '3. Explain how liquidity problems can be an important source of systemic risk in finance.',
      ]),
    )
    expect(looksLikeExerciseSheet).toBe(true)
  })

  it('kommt mit einem leeren Dokument klar', () => {
    expect(splitExercises([])).toEqual({ exercises: [], preamble: [], looksLikeExerciseSheet: false })
  })
})
