<div align="center">

# ✦ Sanctum Theoretica Bot ✦

*Das Archiv flüstert. Der Bot lauscht. Die Wahrheit ist katalogisiert.*

---

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Discord.js](https://img.shields.io/badge/discord.js-14.x-5865F2?logo=discord&logoColor=white)](https://discord.js.org/)
[![SvelteKit](https://img.shields.io/badge/Dashboard-SvelteKit-FF3E00?logo=svelte&logoColor=white)](https://kit.svelte.dev/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)

</div>

---

Ein **Discord-Bot** für den Sanctum-Theoretica-Communityserver. Er verwaltet das interne Wissensarchiv: Orakel-Einträge, lore-basierte Fragmente, rollenspezifische Profilkarten und ein autonomes Whisper-System, das kryptische Botschaften in festgelegten Zeitfenstern verschickt. Alle Slash-Command-Namen sind bewusst englisch gehalten; die UI-Texte und Inhalte sind deutsch.

Das Projekt besteht aus zwei Teilen:

| Komponente | Technologie | Zweck |
|---|---|---|
| **Bot** (`/src`) | TypeScript · discord.js 14 · Node.js ≥ 20 | Slash-Commands, Whisper-Scheduler, Activity-Rotation |
| **Dashboard** (`/dashboard`) | SvelteKit · Tailwind CSS 4 · PostgreSQL | Web-UI für Content-Verwaltung und Admin-Einstellungen |

---

## Inhaltsverzeichnis

- [Features](#features)
- [Architektur](#architektur)
- [Voraussetzungen](#voraussetzungen)
- [Schnellstart](#schnellstart)
- [Umgebungsvariablen](#umgebungsvariablen)
- [Slash-Commands](#slash-commands)
- [Whisper-System](#whisper-system)
- [Content-Datenformat](#content-datenformat)
- [Dashboard](#dashboard)
- [Deployment](#deployment)

---

## Features

- **`/oracle`** — Zeigt einen zufälligen Orakel-Eintrag mit Aspekt, Text und optionalem Bild.
- **`/fragment`** — Liefert ein archiviertes Lore-Fragment.
- **`/profile`** — Rollenbasierte Profilkarte mit Prioritätssystem und zufälligem Wechsel bei Gleichstand.
- **`/curator`** — Kuratierter Archiveintrag für Mod- und Admin-Team.
- **`/whisper`** / **`/whisper-admin`** — Autonomes Flüster-System mit fuzzy Zeitfenstern, Zufallspool ohne Wiederholung und persistentem State.
- **`/ping`** — Systemstatus-Check (Mod/Admin only).
- **Activity-Rotation** — Bot-Status wechselt zufällig alle 15–45 Minuten zwischen `watching`- und `listening`-Typen; direkte Wiederholung wird unterdrückt.
- **Runtime-Config-Refresh** — Der Bot lädt Konfiguration alle 30 Sekunden aus der Datenbank — kein Neustart nötig für Rollen- und Channel-Änderungen.
- **Bild-Normalisierung** — Alle Decals aus `decals/` werden via `sharp` einheitlich auf eine dunkle 16:9-Fläche skaliert.

---

## Architektur

```
SanctumTheoreticaBot/
├── src/                        # Bot (Node.js · TypeScript)
│   ├── commands/               # Slash-Command-Handler
│   │   ├── oracle.ts
│   │   ├── fragment.ts
│   │   ├── profile.ts
│   │   ├── curator.ts
│   │   ├── whisper.ts
│   │   ├── whisper-admin.ts
│   │   └── ping.ts
│   ├── activity.ts             # Activity-Rotation
│   ├── config.ts               # Env-Parsing
│   ├── content-database.ts     # PostgreSQL / JSON-Fallback
│   ├── design.ts               # Embed-Styling
│   ├── easter-eggs.ts
│   ├── lore.ts
│   ├── permissions.ts          # Mod/Admin-Prüfung
│   ├── runtime-config.ts       # Live-Config aus DB
│   ├── whisper-scheduler.ts    # Fuzzy-Timer-Logik
│   ├── whisper-state.ts        # Persistenter Pool-State
│   └── index.ts                # Einstiegspunkt
├── dashboard/                  # Web-Dashboard (SvelteKit)
│   ├── db/                     # Migrations & Schema
│   ├── scripts/                # Migrate / Seed-Skripte
│   └── src/                    # SvelteKit-App
├── data/                       # JSON-Inhalte (Fallback / Seed-Basis)
│   ├── oracle.json
│   ├── fragments.json
│   ├── profiles.json
│   ├── activities.json
│   ├── whispers.json
│   └── whisper-targets.json
├── decals/                     # Bilder für Embeds
├── .env.example
└── tsconfig.json
```

---

## Voraussetzungen

- **Node.js ≥ 20**
- **npm ≥ 10**
- Eine [Discord-Anwendung](https://discord.com/developers/applications) mit aktiviertem Bot und den Scopes `bot` + `applications.commands`
- Optional: **PostgreSQL**-Instanz für das Dashboard und den DB-Modus des Bots

---

## Schnellstart

```bash
# 1. Repository klonen
git clone https://github.com/FortunaTheory/SanctumTheoreticaBot.git
cd SanctumTheoreticaBot

# 2. Umgebungsvariablen anlegen
cp .env.example .env
# → .env mit echten Werten befüllen (siehe Abschnitt unten)

# 3. Abhängigkeiten installieren & bauen
npm install
npm run build

# 4. Bot starten
npm start
```

Für die Entwicklung mit Hot-Reload:

```bash
npm run dev
```

---

## Umgebungsvariablen

Alle Variablen werden in `.env` (nie ins Repository committen) gepflegt. `.env.example` dient als Vorlage.

| Variable | Pflicht | Beschreibung |
|---|---|---|
| `DISCORD_TOKEN` | ✅ | Bot-Token aus dem Developer Portal |
| `DISCORD_CLIENT_ID` | ✅ | Application-ID der Discord-App |
| `DISCORD_GUILD_ID` | ⬜ | Guild-ID für guild-scope Command-Registrierung (schneller für Tests) |
| `DISCORD_MOD_ROLE_IDS` | ✅ | Kommaseparierte Rollen-IDs mit Bot-Zugriff; Admins haben immer Zugriff |
| `DISCORD_WHISPER_CHANNEL_ID` | ⬜ | Fallback-Kanal für Whisper-Nachrichten |
| `WHISPER_MIN_HOURS` | ⬜ | Minimales Zeitfenster zwischen Whispers (Standard: `24`) |
| `WHISPER_MAX_HOURS` | ⬜ | Maximales Zeitfenster zwischen Whispers (Standard: `32`) |
| `WHISPER_STATE_PATH` | ⬜ | Pfad zur State-Datei (Standard: `data/whisper-state.json`) |
| `DATABASE_URL` | ⬜ | PostgreSQL-Connection-String; ohne DB werden JSON-Fallbacks verwendet |
| `AWS_ENDPOINT_URL` | ⬜ | S3-kompatibler Endpoint (z. B. Railway Bucket) |
| `AWS_ACCESS_KEY_ID` | ⬜ | S3-Access-Key |
| `AWS_SECRET_ACCESS_KEY` | ⬜ | S3-Secret |
| `AWS_S3_BUCKET_NAME` | ⬜ | Bucket-Name für Decals |
| `AWS_DEFAULT_REGION` | ⬜ | Region (Standard: `auto`) |

---

## Slash-Commands

Alle Commands sind ausschließlich für das **Mod- und Admin-Team** zugänglich.

| Command | Beschreibung |
|---|---|
| `/ping` | Latenz und Systemstatus |
| `/oracle` | Zufälliger Orakel-Eintrag aus dem Archiv |
| `/fragment` | Zufälliges Lore-Fragment |
| `/profile` | Rollenbasierte Profilkarte eines Teammitglieds |
| `/curator` | Kuratierter Archiveintrag |
| `/whisper` | Sofortige Whisper-Nachricht manuell auslösen |
| `/whisper-admin enable\|disable\|status\|force` | Whisper-Scheduler steuern |

---

## Whisper-System

Das Whisper-System versendet autonom kryptische Nachrichten an definierte Zielpersonen.

- **Steuerung** ausschließlich via `/whisper-admin`:
  - `enable` — aktiviert den Scheduler und speichert den aktuellen Kanal dauerhaft
  - `disable` — pausiert den Scheduler
  - `status` — zeigt aktuellen State inkl. nächster geplanter Sendung
  - `force` — löst sofort einen Whisper aus (ignoriert Timer)
- **Fuzzy-Zeitfenster** zwischen `WHISPER_MIN_HOURS` und `WHISPER_MAX_HOURS`
- **Pool-Logik**: Jede Whisper-UUID wird genau einmal verwendet; nach Erschöpfung des Pools automatischer Reset
- **State-Persistenz**: `data/whisper-state.json` (nicht versioniert) — Neustart-sicher
- **Datenquelle**: Mit `DATABASE_URL` aus PostgreSQL; ohne DB aus `data/whispers.json` und `data/whisper-targets.json`

---

## Content-Datenformat

### `data/oracle.json`
```json
[
  {
    "aspect": "Der Schleier",
    "text": "Was verborgen liegt, wartet geduldig auf den richtigen Blick.",
    "image": "optional-decal-filename.png"
  }
]
```

### `data/fragments.json`
```json
[
  {
    "title": "Archivfragment VII",
    "text": "Der Katalog enthält Lücken. Absichtlich.",
    "image": "optional-decal-filename.png"
  }
]
```

### `data/profiles.json`
Profilkarten werden nach Rollen-ID zugewiesen. Mehrere Karten mit gleicher `priority` werden zufällig rotiert; höhere Werte gewinnen.
```json
[
  {
    "roleId": "123456789012345678",
    "author": "Das Archiv",
    "title": "Hüterin der Fragmente",
    "status": "aktiv",
    "note": "Spezialisiert auf verlorene Einträge.",
    "footer": "Sanctum Theoretica — intern",
    "color": "#2b2b3d",
    "priority": 1,
    "image": "optional-decal-filename.png"
  }
]
```

### `data/activities.json`
```json
[
  { "type": "watching", "name": "das Archiv", "mood": "analytical" },
  { "type": "listening", "name": "den Flüstern", "mood": "obsessed" }
]
```

> Bilder werden aus `decals/` geladen und via `sharp` auf eine einheitliche dunkle 16:9-Fläche normalisiert.

---

## Dashboard

Das Dashboard (SvelteKit + Tailwind CSS) verwaltet alle Inhalte und Konfigurationen über eine Web-UI.

```bash
cd dashboard
cp .env.example .env     # DATABASE_URL und weitere Variablen setzen

npm install

# Datenbankschema anlegen
npm run migrate

# Initiale JSON-Inhalte importieren (einmalig)
npm run seed

# Whisper-Daten aus JSON importieren (einmalig, schützt vor Duplikaten)
npm run seed:whispers

# Entwicklung
npm run dev

# Produktion
npm run build
npm start
```

### Admin-Bereich (`/admin`)

Nur für `OWNER_DISCORD_ID` zugänglich. Verwaltet:

- Community-Guild-ID
- Team-Rollen
- Dashboard-Nutzer
- Whisper-Fallback-Kanal und Zeitfenster

> Rollen- und Whisper-Änderungen werden vom Bot innerhalb von **30 Sekunden** übernommen. Eine geänderte Guild-ID erfordert einen Bot-Redeploy für die Command-Registrierung.

---

## Deployment

Bei jedem Deployment müssen die Verzeichnisse **`data/`** und **`decals/`** neben dem Projektverzeichnis vorhanden sein.

**Empfohlener Stack:** [Railway](https://railway.app/) mit separaten Services für Bot, Dashboard und PostgreSQL sowie einem Railway-Bucket für Decal-Assets.

Minimale Schritte für ein frisches Deployment:

```bash
# Bot-Service
npm install && npm run build && npm start

# Dashboard-Service (einmalig nach erstem Deploy)
npm run migrate
npm run seed
npm run seed:whispers
```

---

<div align="center">

*„Das Archiv vergisst nie. Der Bot auch nicht."*

</div>
