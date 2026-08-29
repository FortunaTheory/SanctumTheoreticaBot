# Sanctum Theoretica

Ein deutschsprachiger, dekorativer Schattenbot für den Communityserver. Die Slash-Command-Namen bleiben bewusst englisch.

## Setup

1. Erstelle eine Discord-Anwendung und einen Bot im Discord Developer Portal.
2. Kopiere `.env.example` nach `.env`.
3. Setze `DISCORD_TOKEN` und `DISCORD_CLIENT_ID` in `.env`.
4. Setze `DISCORD_GUILD_ID` für die schnelle Registrierung in deiner Test-Guild.
5. Setze `DISCORD_MOD_ROLE_IDS` als kommaseparierte Liste der erlaubten Mod-Rollen. Administratoren haben immer Zugriff.
6. Optional: Setze `DISCORD_WHISPER_CHANNEL_ID` als Fallback-Kanal sowie `WHISPER_MIN_HOURS` und `WHISPER_MAX_HOURS` für das fuzzy Zeitfenster.
7. Installiere Abhängigkeiten und baue das Projekt:

```bash
npm install
npm run build
npm start
```

Für die Entwicklung mit automatischem TypeScript-Neuladen:

```bash
npm run dev
```

Der aktuelle Umfang enthält `/ping`, `/oracle`, `/fragment` und `/profile`. Alle Commands sind zunächst nur für das Mod- und Admin-Team verfügbar. Begrüßungen, automatische Ankündigungen und öffentliche Community-Funktionen sind nicht aktiviert.

Das Whisper-System wird ausschließlich von Administratoren gesteuert: `/whisper enable`, `/whisper disable` und `/whisper status`. Mit `/whispers force` kann der nächste Whisper sofort ausgelöst werden. `enable` speichert den aktuellen Kanal dauerhaft; alternativ wird `DISCORD_WHISPER_CHANNEL_ID` verwendet. Die Zielpersonen stehen ausschließlich in `data/whisper-targets.json`, die Texte oder Bild-Whispers in `data/whispers.json`. Ein Bild-Whisper kann mit `{ "image": "name.png" }` konfiguriert werden; die Datei wird aus `decals/whispers-art/` geladen. Mit `{ "text": "...", "image": "name.png" }` sind auch Kombinationen möglich. Der Whisper-Pool verwendet jeden Eintrag genau einmal, bevor er sich zurücksetzt. Der Laufzeitstatus liegt in `data/whisper-state.json` und wird nicht versioniert.

Oracle-Einträge liegen in `data/oracle.json`, Fragment-Einträge in `data/fragments.json` und Profilkarten in `data/profiles.json`. Oracle-Einträge enthalten `aspect`, `text` und optional `image`; Fragment-Einträge enthalten `title`, `text` und optional `image`. Profilkarten können nach Rollen-ID mit `author`, `title`, `status`, `note`, `footer`, `color`, `priority` und optional `image` angepasst werden. Mehrere Karten mit derselben Rollen-ID und Priorität werden zufällig gewechselt; höhere Prioritäten gewinnen. Verknüpfte Bilder werden aus `decals/` geladen und vor dem Versand einheitlich auf eine dunkle 16:9-Fläche normalisiert. Bei Deployment müssen deshalb `data/` und `decals/` neben dem Projekt mit ausgeliefert werden.

Die Activity-Texte liegen in `data/activities.json`. Jeder Eintrag enthält `type` (`watching` oder `listening`), `name` und `mood` (`analytical` oder `obsessed`). Die Activity wechselt zufällig alle 15 bis 45 Minuten; direkte Wiederholungen werden vermieden.

Lade den Bot mit den Scopes `bot` und `applications.commands` ein. Für `/profile` wird zunächst nur ein Teammitglied aus dem internen Archiv akzeptiert.
