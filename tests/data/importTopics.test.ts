import { describe, expect, it } from 'vitest'
import { createTestConnection } from './testConnection'
import { ensureFolderTopicPath, persistAiDetectedDocument, persistExtractedDocument } from '../../src/data/importTopics'
import { insertCourse } from '../../src/data/coursesRepo'
import { loadDocuments } from '../../src/data/documentsRepo'
import { loadTopics } from '../../src/data/topicsRepo'
import type { Chapter, ExtractedDocument, Slide } from '../../src/ingest/types'

const COURSE_INPUT = { name: 'Microeconomics', semester: 'WS26', color: '#000', priority: 3 as const, difficulty: 3 as const }
const META = { storedPath: 'documents/abc123.pdf', sha256: 'abc123', docType: 'folien' as const, docTypeLabel: null }

function slide(title: string, pageNumbers: number[], bodyText: string): Slide {
  return {
    pageNumbers,
    title,
    bodyLines: bodyText ? [{ text: bodyText, x: 0, y: 0, size: 10 }] : [],
    isDivider: false,
    chars: bodyText.length,
  }
}

function chapter(title: string, slides: Slide[]): Chapter {
  return { title, normalized: title.toLowerCase().replace(/\s+/g, ''), slides, source: 'subtitle' }
}

function extractedFixture(): ExtractedDocument {
  const chapters = [
    chapter('Consumer Theory', [
      slide('Preferences', [1], 'Rational preferences are complete and transitive'),
      slide('Budget Constraint', [2, 3], 'The budget line separates affordable from unaffordable bundles'),
    ]),
    chapter('Producer Theory', [slide('Cost Minimization', [5], 'Isoquants and isocost lines')]),
  ]
  const slides = chapters.flatMap((c) => c.slides)
  return {
    filename: '02 Consumer Theory 01.pdf',
    pdfPages: 5,
    slideCount: slides.length,
    uniqueChars: slides.reduce((sum, s) => sum + s.chars, 0),
    chapters,
    slides,
    diagnostics: { titleCoverage: 1, buildGroups: 1, inflation: 5 / 3, dividers: 0, sparsePages: 0 },
  }
}

describe('persistExtractedDocument', () => {
  it('legt ein document mit den Umfangsmaßen aus ExtractedDocument an', async () => {
    const conn = createTestConnection()
    const course = await insertCourse(conn, COURSE_INPUT, 'x')
    const extracted = extractedFixture()

    const result = await persistExtractedDocument(conn, course.id, extracted, META, '2026-07-21T00:00:00.000Z')

    expect(result.document).toMatchObject({
      filename: extracted.filename,
      pdf_pages: 5,
      slide_count: 3,
      unique_chars: extracted.uniqueChars,
    })
    expect(await loadDocuments(conn)).toEqual([result.document])
  })

  it('legt für jedes Kapitel ein Thema an, in Dokumentreihenfolge', async () => {
    const conn = createTestConnection()
    const course = await insertCourse(conn, COURSE_INPUT, 'x')
    const extracted = extractedFixture()

    const result = await persistExtractedDocument(conn, course.id, extracted, META, 'x')

    expect(result.topics.map((t) => t.name)).toEqual(['Consumer Theory', 'Producer Theory'])
    expect(result.topics.map((t) => t.sort_order)).toEqual([0, 1])
    expect(result.topics.every((t) => t.parent_id === null && t.manual_override === 0)).toBe(true)
  })

  it('legt eine topic_section je Kapitel mit korrektem Seitenbereich und Umfang an', async () => {
    const conn = createTestConnection()
    const course = await insertCourse(conn, COURSE_INPUT, 'x')
    const extracted = extractedFixture()

    const result = await persistExtractedDocument(conn, course.id, extracted, META, 'x')

    const [firstSection] = result.topicSections
    // Consumer Theory: Folien auf Seiten [1] und [2,3] -> Bereich 1..3
    expect(firstSection).toMatchObject({
      topic_id: result.topics[0]!.id,
      document_id: result.document.id,
      page_start: 1,
      page_end: 3,
      slide_count: 2,
    })
    expect(firstSection!.unique_chars).toBe(extracted.chapters[0]!.slides.reduce((sum, s) => sum + s.chars, 0))
  })

  it('legt kein Dokument ohne zugehöriges Fach an (Fremdschlüssel greift)', async () => {
    const conn = createTestConnection()
    const extracted = extractedFixture()
    await expect(persistExtractedDocument(conn, 999, extracted, META, 'x')).rejects.toThrow(
      /FOREIGN KEY constraint failed/,
    )
  })

  it('legt ein Dokument ohne Kapitel an, ohne dass Themen entstehen', async () => {
    const conn = createTestConnection()
    const course = await insertCourse(conn, COURSE_INPUT, 'x')
    const extracted: ExtractedDocument = {
      filename: 'leer.pdf',
      pdfPages: 0,
      slideCount: 0,
      uniqueChars: 0,
      chapters: [],
      slides: [],
      diagnostics: { titleCoverage: 0, buildGroups: 0, inflation: 0, dividers: 0, sparsePages: 0 },
    }

    const result = await persistExtractedDocument(conn, course.id, extracted, META, 'x')

    expect(result.topics).toEqual([])
    expect(result.topicSections).toEqual([])
  })

  it('legt kein topic_section für ein Kapitel ohne Folien an', async () => {
    const conn = createTestConnection()
    const course = await insertCourse(conn, COURSE_INPUT, 'x')
    const extracted: ExtractedDocument = {
      filename: 'leer.pdf',
      pdfPages: 0,
      slideCount: 0,
      uniqueChars: 0,
      chapters: [chapter('Leeres Kapitel', [])],
      slides: [],
      diagnostics: { titleCoverage: 0, buildGroups: 0, inflation: 0, dividers: 0, sparsePages: 0 },
    }

    const result = await persistExtractedDocument(conn, course.id, extracted, META, 'x')

    expect(result.topics).toHaveLength(1)
    expect(result.topicSections).toEqual([])
  })
})

describe('persistAiDetectedDocument', () => {
  it('legt Themen mit dem von der KI erkannten Seitenbereich/Gewicht an, ohne Folien-Umfangsmaße (ADR-015)', async () => {
    const conn = createTestConnection()
    const course = await insertCourse(conn, COURSE_INPUT, 'x')

    const result = await persistAiDetectedDocument(
      conn,
      course.id,
      'Zusammenfassung Money Banking.pdf',
      { storedPath: 'documents/xyz.pdf', sha256: 'xyz', docType: 'zusammenfassung', docTypeLabel: null },
      3,
      [
        { suggestion: { name: 'Bonds', pageStart: 1, pageEnd: 1, weight: 4 }, uniqueChars: 300 },
        { suggestion: { name: 'Financial Intermediaries', pageStart: 2, pageEnd: 3, weight: 2 }, uniqueChars: 500 },
      ],
      'x',
    )

    expect(result.document).toMatchObject({ doc_type: 'zusammenfassung', pdf_pages: 3, slide_count: 0, unique_chars: 800 })
    expect(result.topics.map((t) => ({ name: t.name, weight: t.weight, manual_override: t.manual_override }))).toEqual([
      { name: 'Bonds', weight: 4, manual_override: 0 },
      { name: 'Financial Intermediaries', weight: 2, manual_override: 0 },
    ])
    expect(result.topicSections.map((s) => ({ page_start: s.page_start, page_end: s.page_end, slide_count: s.slide_count }))).toEqual([
      { page_start: 1, page_end: 1, slide_count: 0 },
      { page_start: 2, page_end: 3, slide_count: 0 },
    ])
    expect(await loadDocuments(conn)).toEqual([result.document])
  })
})

describe('persistExtractedDocument mit parentTopicId (Ordner-Import)', () => {
  it('hängt die Kapitel-Themen unter das übergebene Eltern-Thema, statt parent_id = null zu setzen', async () => {
    const conn = createTestConnection()
    const course = await insertCourse(conn, COURSE_INPUT, 'x')
    const { topicId: folderTopicId } = await ensureFolderTopicPath(conn, course.id, [], ['Consumer Theory'])

    const result = await persistExtractedDocument(conn, course.id, extractedFixture(), META, 'x', folderTopicId)

    expect(result.topics.every((t) => t.parent_id === folderTopicId)).toBe(true)
  })
})

describe('ensureFolderTopicPath', () => {
  it('legt für jeden Ordnernamen ein verschachteltes Thema an', async () => {
    const conn = createTestConnection()
    const course = await insertCourse(conn, COURSE_INPUT, 'x')

    const { topicId, createdTopics } = await ensureFolderTopicPath(conn, course.id, [], ['Consumer Theory', 'Budget'])

    expect(createdTopics.map((t) => t.name)).toEqual(['Consumer Theory', 'Budget'])
    expect(createdTopics[0]!.parent_id).toBeNull()
    expect(createdTopics[1]!.parent_id).toBe(createdTopics[0]!.id)
    expect(topicId).toBe(createdTopics[1]!.id)
    expect(await loadTopics(conn)).toHaveLength(2)
  })

  it('legt kein Duplikat an, wenn derselbe Ordnername unter demselben Elternthema schon existiert', async () => {
    const conn = createTestConnection()
    const course = await insertCourse(conn, COURSE_INPUT, 'x')

    const first = await ensureFolderTopicPath(conn, course.id, [], ['Consumer Theory'])
    const second = await ensureFolderTopicPath(conn, course.id, [...first.createdTopics], ['Consumer Theory'])

    expect(second.createdTopics).toEqual([])
    expect(second.topicId).toBe(first.topicId)
    expect(await loadTopics(conn)).toHaveLength(1)
  })

  it('erkennt Namensgleichheit unabhängig von Groß-/Kleinschreibung und Sonderzeichen (normalizeForCompare)', async () => {
    const conn = createTestConnection()
    const course = await insertCourse(conn, COURSE_INPUT, 'x')

    const first = await ensureFolderTopicPath(conn, course.id, [], ['Consumer Theory'])
    const second = await ensureFolderTopicPath(conn, course.id, [...first.createdTopics], ['consumer-theory'])

    expect(second.createdTopics).toEqual([])
    expect(second.topicId).toBe(first.topicId)
  })

  it('behandelt gleichnamige Ordner unter verschiedenen Elternthemen als eigenständige Themen', async () => {
    const conn = createTestConnection()
    const course = await insertCourse(conn, COURSE_INPUT, 'x')

    const a = await ensureFolderTopicPath(conn, course.id, [], ['Microeconomics', 'Übung'])
    const b = await ensureFolderTopicPath(conn, course.id, [...a.createdTopics], ['Money & Banking', 'Übung'])

    expect(a.topicId).not.toBe(b.topicId)
    expect(await loadTopics(conn)).toHaveLength(4)
  })

  it('vergibt fortlaufende sort_order an Geschwister-Themen desselben Elternthemas', async () => {
    const conn = createTestConnection()
    const course = await insertCourse(conn, COURSE_INPUT, 'x')

    const root = await ensureFolderTopicPath(conn, course.id, [], ['Microeconomics'])
    let known = [...root.createdTopics]
    const budget = await ensureFolderTopicPath(conn, course.id, known, ['Microeconomics', 'Budget'])
    known = [...known, ...budget.createdTopics]
    const preferences = await ensureFolderTopicPath(conn, course.id, known, ['Microeconomics', 'Preferences'])

    expect(budget.createdTopics[0]!.sort_order).toBe(0)
    expect(preferences.createdTopics[0]!.sort_order).toBe(1)
  })

  it('wirft, wenn keine Ordnernamen übergeben werden', async () => {
    const conn = createTestConnection()
    const course = await insertCourse(conn, COURSE_INPUT, 'x')
    await expect(ensureFolderTopicPath(conn, course.id, [], [])).rejects.toThrow()
  })
})
