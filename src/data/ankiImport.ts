import type { SqlConnection } from './db'
import type { Card, Review, Topic } from './schema'
import { insertCard } from './cardsRepo'
import { insertReview } from './reviewsRepo'
import { ensureFolderTopicPath } from './importTopics'
import type { AnkiDeck } from '../ingest/anki'

/**
 * Persistiert ein geparstes Anki-Deck (`ingest/anki.ts` `extractApkg`) in
 * die App-Datenbank (Nutzerwunsch 2026-09-08). Jedes Anki-(Unter-)Deck
 * wird zu einem Thema unter dem gewählten Fach — Ankis `::`-Unterdecks
 * werden dabei zu verschachtelten Themen (`ensureFolderTopicPath`, wie
 * beim Ordner-Import von Dokumenten). Jede Anki-Karte wird eine
 * Karteikarte (`cards`); hat sie in Anki bereits eine Lerngeschichte,
 * wird **eine** synthetische Wiederholung (`reviews`) mit grob
 * geschätztem FSRS-Startzustand angelegt, damit lange bekannte Karten
 * nicht sofort wieder fällig sind (siehe `ingest/anki.ts` `seedSchedule`).
 *
 * Wie `persistExtractedDocument` gibt die Funktion die neu angelegten
 * Zeilen zurück, damit `App.tsx` den lokalen Zustand ohne kompletten
 * Neuladen nachziehen kann.
 */

export interface PersistedAnkiDeck {
  topics: Topic[]
  cards: Card[]
  reviews: Review[]
}

export async function persistAnkiDeck(
  conn: SqlConnection,
  courseId: number,
  deck: AnkiDeck,
  existingTopics: Topic[],
  now: string,
): Promise<PersistedAnkiDeck> {
  const byDeck = new Map<string, AnkiDeck['cards']>()
  for (const card of deck.cards) {
    const key = card.deckName.trim().length > 0 ? card.deckName : 'Anki-Import'
    if (!byDeck.has(key)) byDeck.set(key, [])
    byDeck.get(key)!.push(card)
  }

  const createdTopics: Topic[] = []
  const createdCards: Card[] = []
  const createdReviews: Review[] = []
  let knownTopics = existingTopics
  const nowMs = Date.parse(now)

  for (const [deckName, cards] of byDeck) {
    const segments = deckName.split('::').map((s) => s.trim()).filter((s) => s.length > 0)
    const path = segments.length > 0 ? segments : ['Anki-Import']
    const resolved = await ensureFolderTopicPath(conn, courseId, knownTopics, path)
    if (resolved.createdTopics.length > 0) {
      knownTopics = [...knownTopics, ...resolved.createdTopics]
      createdTopics.push(...resolved.createdTopics)
    }

    for (const ankiCard of cards) {
      const card = await insertCard(
        conn,
        {
          topic_id: resolved.topicId,
          document_id: null,
          page: null,
          front: ankiCard.front,
          back: ankiCard.back,
          source_quote: null,
        },
        now,
      )
      createdCards.push(card)

      if (ankiCard.schedule) {
        const dueAt = new Date(nowMs + ankiCard.schedule.dueInDays * 24 * 60 * 60 * 1000).toISOString()
        const review = await insertReview(conn, {
          card_id: card.id,
          reviewed_at: now,
          // Rating 3 (= „Good"): neutral, die eigentliche Steuerung übernimmt
          // der geschätzte stability/difficulty-Startwert, nicht dieses Rating.
          rating: 3,
          stability: ankiCard.schedule.stabilityDays,
          difficulty: ankiCard.schedule.difficulty,
          due_at: dueAt,
        })
        createdReviews.push(review)
      }
    }
  }

  return { topics: createdTopics, cards: createdCards, reviews: createdReviews }
}
