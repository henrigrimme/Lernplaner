-- Migration 0006: Wiederkehrende Tages-Blocker (Nutzerwunsch 22.07.2026,
-- zurückgestellt zugunsten des Import-Bugs, jetzt nachgeholt, siehe
-- CONTEXT.md/ROADMAP.md "Später/offen").
--
-- Bisher deckt `blockers` nur einzelne, absolut datierte Termine ab
-- (Vorlesungen, Kalendereinträge) — für ein wiederkehrendes Zeitfenster
-- wie "täglich 12:00-13:00 Mittagspause" müsste sonst jede einzelne Woche
-- über die gesamte Vorbereitungszeit (bis zu 4 Wochen, CONTEXT.md
-- "Nutzer") von Hand als eigener `blockers`-Eintrag angelegt werden.
-- Eigene Tabelle statt Wiederverwendung von `blockers`: die
-- Wiederkehr-Semantik (Wochentag + Uhrzeit statt absolutem Datum) ist ein
-- grundlegend anderes Datenmodell, kein Sonderfall von `blockers`.
--
-- `starts_at`/`ends_at` sind reine Uhrzeiten ("HH:MM"), keine Datumswerte
-- (anders als `blockers.starts_at`/`ends_at`, die volle Zeitstempel sind).
-- SQLite kennt keinen nativen Zeit-Typ; ein einfaches GLOB-Muster
-- (`[0-2][0-9]:[0-5][0-9]`) würde ungültige Stunden wie "25" durchlassen
-- (jede Ziffer 0-2 gefolgt von jeder Ziffer 0-9 passt), deshalb echte
-- Wertebereichsprüfung über die einzeln ausgeschnittenen Stunden-/
-- Minutenanteile.
CREATE TABLE recurring_blockers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  starts_at TEXT NOT NULL CHECK (
    length(starts_at) = 5 AND substr(starts_at, 3, 1) = ':'
    AND CAST(substr(starts_at, 1, 2) AS INTEGER) BETWEEN 0 AND 23
    AND CAST(substr(starts_at, 4, 2) AS INTEGER) BETWEEN 0 AND 59
  ),
  ends_at TEXT NOT NULL CHECK (
    length(ends_at) = 5 AND substr(ends_at, 3, 1) = ':'
    AND CAST(substr(ends_at, 1, 2) AS INTEGER) BETWEEN 0 AND 23
    AND CAST(substr(ends_at, 4, 2) AS INTEGER) BETWEEN 0 AND 59
  ),
  label TEXT NOT NULL
);

CREATE INDEX idx_recurring_blockers_weekday ON recurring_blockers (weekday);
