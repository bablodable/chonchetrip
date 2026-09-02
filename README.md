# Chonchetrip

Chonchetrip started as a travel app I built for my wife for our trip to Japan. I wanted something warmer than a spreadsheet or a long list of saved places: every day should feel like a small chapter, with its own route, discoveries and memories.

The repository contains the working Japan prototype and the beginning of a reusable travel engine. It is mobile-first and designed around the phone we will actually use during the trip: an iPhone 17 Pro Max.

## What it does

- presents the itinerary as a day-by-day story with times, tickets and important notes;
- shows interactive daily maps with completed stops, the current destination and the road ahead;
- keeps shared progress for the traveler and a read-only viewer mode;
- unlocks the prologue by Serbia time, switches to Japan time at the planned DXB departure, and keeps every later chapter on JST;
- adds puzzles, hidden fox fires, letters and collectible achievements;
- saves daily photos, ratings, step counts and small trip statistics;
- brings everything together in a final travel recap.

The current trip covers 15 days, 121 scenes, 13 daily maps and 37 achievements.

## Why I built it

Most trip planners are good at storing bookings and lists. Chonchetrip is more interested in what the trip feels like while it is happening.

A completed stop changes the map. A finished day opens a puzzle. Small discoveries become achievements, and photos gradually turn the itinerary into a personal journal. The practical information is still there, but it lives inside the story instead of replacing it.

## How it works

The frontend is built with React, TypeScript and Vite. A Cloudflare Worker provides the API, while Cloudflare D1 stores shared progress. An installable offline pack caches the application, illustrations and all daily routes. Progress stays on the device during weak or missing connectivity and synchronizes automatically when the app is opened online again; pending photos are kept separately in IndexedDB until their upload succeeds.

The Japan content currently lives alongside the engine. The next major step is to separate them cleanly, so a new journey can be created without rebuilding the application itself.

## Run locally

```bash
npm ci
npm run dev -- --host 0.0.0.0
```

Vite will print the local and network addresses. A development-only preview can open the trip on a specific date without changing real progress:

```text
http://localhost:5173/?preview=2026-10-05
```

For the complete local version with the Worker and D1, copy `.dev.vars.example` to `.dev.vars`, replace the example values and run:

```bash
npm run cloudflare:migrate:local
npm run cloudflare:dev
```

The Worker version will be available at `http://localhost:8788`.

The built-in personal editor code is `до`, so the app works immediately after deployment without additional Cloudflare setup. A private deployment can optionally override the editor code and session key:

```bash
npx wrangler secret put EDITOR_CODE
npx wrangler secret put SESSION_SECRET
```

## Use offline

Offline mode requires the deployed HTTPS version. On iPhone, first use **Share → Add to Home Screen**, keep **Open as Web App** enabled, and launch Chonchetrip from its new icon while still online. Sign in there once, open the download button in the application header and choose **Download over Wi-Fi**. Installing first matters because iOS can keep a Home Screen web app's storage separate from its ordinary Safari tab.

The full offline pack is about 8 MB and includes every chapter, illustration and daily route. Previously viewed OpenStreetMap tiles are cached opportunistically; without them the route line, stops and practical notes still remain available. Changes and photos made offline are uploaded the next time the editor opens the application with a connection.

## Check the project

```bash
npm run check
```

This runs linting, TypeScript checks, content validation, all map progress scenarios and the production build.

## Project structure

- `src/tripData.ts` — days, scenes, riddles and achievements;
- `src/sceneGuides.ts` — practical notes attached to individual scenes;
- `src/kitsuMagic.ts` — fox fires, discoveries and private letters;
- `src/App.tsx` — application state and interaction logic;
- `src/App.css` and `src/index.css` — the visual system and animations;
- `public/japan_daily_maps_mobile` — interactive maps and their shared runtime;
- `worker` and `server` — Cloudflare Worker, API and synchronization;
- `scripts` — automated content and map audits.

## Project status

Chonchetrip is an active prototype built for a real journey. The Japan version comes first because it is the best way to find out which ideas are genuinely useful on the road.

The longer-term direction is a reusable, self-hostable travel platform where people can bring their own route and turn it into an interactive journey without losing the personal details that made this project worth building in the first place.

Eventually, I want to add an AI-assisted journey builder. A traveler would describe the destination, interests, pace, budget and the kind of experience they enjoy, and Chonchetrip would turn that into a personal game-like trip: a practical route wrapped in chapters, discoveries, challenges, achievements and memories. The goal is not to generate another generic itinerary, but to make each journey feel as though it was created for the person taking it.
