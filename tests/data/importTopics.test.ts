import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  importExtractedDocument,
  topicsFromExtractedDocument,
  type SqlExecutor,
} from '../../src/data/importTopics'
import type { Chapter, ExtractedDocument, Slide } from '../../src/ingest/types'

/**
 * `better-sqlite3` ist reine Testinfrastruktur (siehe schema.test.ts) — die
 * eigentliche Laufzeit-Anbindung ist `tauri-plugin-sql`. Der Adapter zeigt,
 * dass `SqlExecutor` (in `importTopics.ts`) mit einer echten, synchronen
 * Datenbank funktioniert; die async Signatur passt später ebenso zu
 * `tauri-plugin-sql`s Promise-basierter API.
 */
function sqliteExecutor(db: Database.Database): SqlExecutor {
  return {
    run(sql, params) {
      const result = db.prepare(sql).run(...(params as (string | number | null)[]))
      return Promise.resolve(Number(result.lastInsertRowid))
    },
  }
}

const MIGRATION_0001 = readFileSync(
  resolve(__dirname, '../../src/data/migrations/0001_init.sql'),
  'utf-8',
)

function freshDb(): Database.Database {
  const db = new Database(':memory:')
  db.pragma('foreign_keys = ON')
  db.exec(MIGRATION_0001)
  return db
}

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

describe('importExtractedDocument', () => {
  let db: Database.Database
  let courseId: number

  beforeEach(() => {
    db = freshDb()
    db.prepare(
      `INSERT INTO courses (name, semester, color, priority, difficulty) VALUES (?, ?, ?, ?, ?)`,
    ).run('Microeconomics', 'WS25', '#000', 3, 3)
    courseId = 1
  })

  it('legt ein document mit den Umfangsmaßen aus ExtractedDocument an', async () => {
    const extracted = extractedFixture()
    const exec = sqliteExecutor(db)

    const result = await importExtractedDocument(exec, courseId, extracted, {
      storedPath: '/x/02 Consumer Theory 01.pdf',
      sha256: 'abc123',
      docType: 'folien',
    })

    const row = db.prepare('SELECT * FROM documents WHERE id = ?').get(result.documentId) as {
      filename: string
      pdf_pages: number
      slide_count: number
      unique_chars: number
    }
    expect(row.filename).toBe(extracted.filename)
    expect(row.pdf_pages).toBe(5)
    expect(row.slide_count).toBe(3)
    expect(row.unique_chars).toBe(extracted.uniqueChars)
  })

  it('legt für jedes Kapitel ein Thema an, in Dokumentreihenfolge', async () => {
    const extracted = extractedFixture()
    const exec = sqliteExecutor(db)

    const result = await importExtractedDocument(exec, courseId, extracted, {
      storedPath: '/x/a.pdf',
      sha256: 'abc123',
      docType: 'folien',
    })

    expect(result.topicIds).toHaveLength(2)
    const rows = db
      .prepare('SELECT name, sort_order, parent_id, manual_override FROM topics ORDER BY sort_order')
      .all() as { name: string; sort_order: number; parent_id: number | null; manual_override: number }[]
    expect(rows.map((r) => r.name)).toEqual(['Consumer Theory', 'Producer Theory'])
    expect(rows.map((r) => r.sort_order)).toEqual([0, 1])
    expect(rows.every((r) => r.parent_id === null)).toBe(true)
    expect(rows.every((r) => r.manual_override === 0)).toBe(true)
  })

  it('legt eine topic_section je Kapitel mit korrektem Seitenbereich und Umfang an', async () => {
    const extracted = extractedFixture()
    const exec = sqliteExecutor(db)

    const result = await importExtractedDocument(exec, courseId, extracted, {
      storedPath: '/x/a.pdf',
      sha256: 'abc123',
      docType: 'folien',
    })

    const firstChapterTopicId = result.topicIds[0]!
    const section = db
      .prepare('SELECT * FROM topic_sections WHERE topic_id = ?')
      .get(firstChapterTopicId) as {
      page_start: number
      page_end: number
      slide_count: number
      unique_chars: number
      document_id: number
    }
    // Consumer Theory: Folien auf Seiten [1] und [2,3] -> Bereich 1..3
    expect(section.page_start).toBe(1)
    expect(section.page_end).toBe(3)
    expect(section.slide_count).toBe(2)
    expect(section.unique_chars).toBe(
      extracted.chapters[0]!.slides.reduce((sum, s) => sum + s.chars, 0),
    )
    expect(section.document_id).toBe(result.documentId)
  })

  it('legt kein Dokument ohne zugehörigen Kurs an (Fremdschlüssel greift)', async () => {
    const extracted = extractedFixture()
    const exec = sqliteExecutor(db)

    await expect(
      importExtractedDocument(exec, 999, extracted, {
        storedPath: '/x/a.pdf',
        sha256: 'abc123',
        docType: 'folien',
      }),
    ).rejects.toThrow(/FOREIGN KEY constraint failed/)
  })

  it('legt ein Dokument ohne Kapitel an, ohne dass Themen entstehen', async () => {
    const extracted: ExtractedDocument = {
      filename: 'leer.pdf',
      pdfPages: 0,
      slideCount: 0,
      uniqueChars: 0,
      chapters: [],
      slides: [],
      diagnostics: { titleCoverage: 0, buildGroups: 0, inflation: 0, dividers: 0, sparsePages: 0 },
    }
    const exec = sqliteExecutor(db)

    const result = await importExtractedDocument(exec, courseId, extracted, {
      storedPath: '/x/leer.pdf',
      sha256: 'abc123',
      docType: 'folien',
    })

    expect(result.topicIds).toEqual([])
    const count = db.prepare('SELECT COUNT(*) AS n FROM topics').get() as { n: number }
    expect(count.n).toBe(0)
  })
})

describe('topicsFromExtractedDocument', () => {
  it('erzeugt dieselben Kapitel-Themen wie importExtractedDocument, ohne Datenbank', () => {
    const extracted = extractedFixture()
    const { topics, topicSections } = topicsFromExtractedDocument(extracted, 1, 1, [], [])

    expect(topics.map((t) => t.name)).toEqual(['Consumer Theory', 'Producer Theory'])
    expect(topics.every((t) => t.course_id === 1 && t.parent_id === null && t.manual_override === 0)).toBe(true)
    expect(topicSections).toHaveLength(2)
    expect(topicSections[0]).toMatchObject({ topic_id: topics[0]!.id, document_id: 1, page_start: 1, page_end: 3 })
  })

  it('vergibt fortlaufende IDs über mehrere Importe hinweg', () => {
    const extracted = extractedFixture()
    const first = topicsFromExtractedDocument(extracted, 1, 1, [], [])
    const second = topicsFromExtractedDocument(extracted, 1, 2, first.topics, first.topicSections)

    expect(second.topics.map((t) => t.id)).toEqual([1, 2, 3, 4])
    expect(second.topicSections.map((s) => s.id)).toEqual([1, 2, 3, 4])
  })

  it('legt kein topic_section für ein kapitel ohne folien an', () => {
    const extracted: ExtractedDocument = {
      filename: 'leer.pdf',
      pdfPages: 0,
      slideCount: 0,
      uniqueChars: 0,
      chapters: [chapter('Leeres Kapitel', [])],
      slides: [],
      diagnostics: { titleCoverage: 0, buildGroups: 0, inflation: 0, dividers: 0, sparsePages: 0 },
    }
    const { topics, topicSections } = topicsFromExtractedDocument(extracted, 1, 1, [], [])
    expect(topics).toHaveLength(1)
    expect(topicSections).toEqual([])
  })
})
