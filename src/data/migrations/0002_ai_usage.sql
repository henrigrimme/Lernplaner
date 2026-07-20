-- Migration 0002: KI-Nutzung protokollieren (ADR-007).
--
-- Grundlage für die Budget-Benachrichtigung: Jeder Nutzer setzt sein
-- eigenes monatliches Limit selbst (in `settings`, Schlüssel
-- `ai_budget_limit_eur`). Beim Überschreiten wird benachrichtigt, nie
-- gesperrt — die Monatssumme wird aus dieser Tabelle abgeleitet, nicht
-- separat gespeichert (siehe DATA_MODEL.md "Abgeleitete Werte").

CREATE TABLE ai_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  occurred_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  provider TEXT NOT NULL,
  -- z. B. 'refine_topics', 'estimate_difficulty' (siehe ARCHITECTURE.md AIProvider)
  operation TEXT NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  cost_eur REAL NOT NULL
);

CREATE INDEX idx_ai_usage_occurred_at ON ai_usage (occurred_at);
