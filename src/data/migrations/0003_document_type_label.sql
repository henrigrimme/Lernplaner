-- Migration 0003: eigene Dokumentkategorien (Nutzerwunsch 2026-07-22).
--
-- `documents.doc_type` bleibt auf die sieben vordefinierten Werte
-- beschränkt (CHECK-Constraint in 0001_init.sql, absichtlich nicht per
-- Tabellen-Neuanlage aufgeweicht — das Risiko, bei laufenden
-- Fremdschlüsseln aus topic_sections/questions etwas kaputt zu machen,
-- steht in keinem Verhältnis zum Nutzen). Für 'sonstiges' trägt
-- `doc_type_label` stattdessen die vom Nutzer frei eingegebene
-- Bezeichnung (z. B. "Formelsammlung") — rein additiv, keine
-- Fremdschlüssel betroffen.

ALTER TABLE documents ADD COLUMN doc_type_label TEXT;
