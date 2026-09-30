# Summit Tel Aviv 2026 — Watchlist
<img width="1158" height="814" alt="image" src="https://github.com/user-attachments/assets/0d2bd3c7-6e2f-4ff5-a5ef-d2596d801218" />

A local tracker for the [Summit Tel Aviv](https://summittelaviv.awslivestream.com/) session recordings. It lists the summit catalog, plays the videos in the browser, and remembers how far you got.

Progress never leaves the machine. The app keeps a real SQLite database in this browser’s IndexedDB.

## What it does

The catalog is 48 sessions grouped into tracks (keynote, developers, agentic apps, containers, data, databases, architecture, security, and demos). Each session has a status:

- **Not started**
- **In progress** — set automatically once playback position is past zero
- **Watched** — set automatically once position reaches 95% of the duration

You can also set the status by hand.

For each session you can:

- **Watch or resume** in a built-in HLS player. It starts from the saved position and writes position and duration back while you watch.
- **Search** by title or session id, and filter by track or status.
- **Take notes** on a session.
- **Type a timestamp** (`12:30` or a number of seconds) if you want to set the position yourself.
- **Capture progress from the official site** with the “Track this session” bookmarklet. On a playing session page it reads the video’s current time and opens this app with that session updated.
- **Download a `.sqlite` backup** and move it to another browser.

The sidebar shows how many sessions are watched, in progress, and not started. Opening the app lands on In progress when anything is already underway, otherwise on Not started.

## How progress is stored

[`src/db.ts`](src/db.ts) runs SQLite in the browser with [sql.js](https://github.com/sql-js/sql.js). The database file is saved in IndexedDB under `summit-watchlist.sqlite`.

On startup the app seeds every session from [`src/catalog.ts`](src/catalog.ts). Existing status, position, duration, and notes are left alone; title and track are refreshed from the catalog.

Playback URLs live in [`src/videoSources.ts`](src/videoSources.ts). The player ([`src/Player.tsx`](src/Player.tsx)) uses hls.js, or Safari’s native HLS, and saves progress about every five seconds plus on pause and when the video ends.

## Run it

```bash
npm install
npm run dev
```

Other scripts:

```bash
npm run build    # typecheck and production build
npm run preview  # serve the production build
npm run lint
```

`VITE_ARTIFACT_BUILD=true` is only for the hosted preview sandbox, where the in-page player cannot reach the streaming host. In that build, Watch opens the session on the official site instead.
image.png
