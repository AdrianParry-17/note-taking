# Journey Map Note Taking (MVP)

Journey Map Note Taking is an offline-first learning workspace built around the **Journey–Map Based Learning Framework**.

Instead of linear note dumping, this app models learning as exploration:

- learning domain → **World**
- topics/subtopics → **Areas / Sub-areas / Structures**
- prerequisite barriers → **Gates**
- recommended sequences → **Roads**
- reflective notes → **Journal**
- reusable assets/snippets → **Backpack**

This MVP focuses on orientation, structured exploration, and practical note workflows.

## Why this app exists

The framework is designed to reduce:

- tutorial hell (path-following without world understanding)
- orientation problems (not knowing where you are)
- overwhelm (large topic sets with no structure)
- fear of going off-track

Core mindset:

> Learn like an adventurer navigating a world, not like a passenger dragged down one road.

## MVP features

- **Map Workspace**
   - recursive area tree (`area` / `structure` + isolated flag)
   - inspector-based editing for area details, marks, and gates
   - gate prerequisites/outcomes editing
   - road authoring with ordered area steps
   - best-effort map focusing (jump to area from linked contexts)
- **Journal Workspace**
   - area-linked or general journals
   - markdown editing + preview
- **Backpack Workspace**
   - reusable snippets/assets with tags
   - area-linked or general items
   - markdown editing + preview
- **Utility Workspace**
   - skill management
   - skill usage views (`Prerequisite For`, `Outcome From`)
   - keyboard shortcut reference
   - world save/close controls
- **World lifecycle**
   - open existing world folder
   - create world with template selection (`Blank World` / `Tutorial World`)
   - save world state back to local files

## Local data architecture

The app uses user-selected local folders (privacy-first, offline-capable):

- `world.json` → map tree, journals metadata, skills, roads, marks
- `data/journals/<journal_id>.md` → journal contents
- `data/backpack.json` → backpack data
- `data/marking/<area_id>/<gate_id>_note.md` → gate save notes

Best-effort handling is used for missing references (for example deleted IDs): the UI preserves usable state and shows placeholders instead of crashing.

## Getting started

### Requirements

- Node.js LTS
- npm
- modern Chromium-based browser (for File System Access API flow)

### Install

```bash
npm install
```

### Run (web)

```bash
npm run web
```

Or with Expo menu:

```bash
npx expo start
```

## Scripts

- `npm run web` → start web target
- `npm run lint` → run lint checks
- `npx tsc --noEmit` → TypeScript typecheck

## Project notes

- Built with Expo + React Native.
- This project was **AI-assisted** during development as an experiment in collaborative building.
- The experiment worked well and shipped as a focused MVP.

## Status

MVP complete. Current focus is polish, stability, and iterative improvements on UX and learning flow.
