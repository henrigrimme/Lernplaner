#!/bin/bash
# Entfernt das macOS-Quarantäne-Flag von "lernplaner.app" (muss im selben
# Ordner wie dieses Skript liegen — beide zusammen im Release-Zip, siehe
# CONTRIBUTING.md "Releases") und öffnet die App danach.
#
# Warum das nötig ist: die App ist ad-hoc-signiert, aber nicht bei Apple
# notarisiert (ADR-008/ADR-009 — eine echte Apple-Developer-ID kostet
# 99 $/Jahr, für zwei Nutzer bisher nicht angeschafft). macOS markiert jede
# per Browser/Mail/AirDrop heruntergeladene App als "aus dem Internet"
# (Quarantäne) und verweigert bei nicht notarisierten Apps das Öffnen mit
# "kann nicht geöffnet werden" — ohne Terminal-Kenntnisse ein Sackgassen-
# Fehler ohne erkennbaren Ausweg. Doppelklick auf dieses Skript statt auf
# die App selbst behebt das automatisch.
#
# Nur beim ALLERERSTEN Installieren nötig: der eingebaute Auto-Updater
# (tauri-plugin-updater) lädt künftige Versionen über eine normale
# HTTP-Anfrage herunter, nicht über den Browser-Downloadpfad, der das
# Quarantäne-Flag setzt — spätere Updates sollten ohne dieses Skript
# funktionieren.

set -euo pipefail
cd "$(dirname "$0")"

if [ ! -d "lernplaner.app" ]; then
  echo "Fehler: \"lernplaner.app\" wurde nicht im selben Ordner wie dieses Skript gefunden."
  echo "Bitte entpacke das Release-Zip vollständig, bevor du dieses Skript ausführst."
  read -r -p "Zum Schließen Enter drücken..."
  exit 1
fi

echo "Entferne die macOS-Quarantänemarkierung von lernplaner.app …"
xattr -cr lernplaner.app

echo "Öffne lernplaner.app …"
open lernplaner.app

echo "Fertig — dieses Fenster kann geschlossen werden."
sleep 2
