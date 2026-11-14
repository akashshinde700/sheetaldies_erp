# Browser tests

These drive a real Chrome through Playwright, so they catch what `npm run build`
and API calls cannot: a page that renders blank, an uncaught exception, a
download that never arrives, a form that does not compute what it should.

Chrome already on the machine is used (`channel: 'chrome'`) — no extra browser
download is needed.

## Running them

Start the stack first, in two terminals:

```bash
cd backend  && npm start     # http://localhost:5000
cd frontend && npm run dev   # http://localhost:5173
```

Then, from `frontend/`:

| Command | What it does | Writes data? |
|---|---|---|
| `npm run test:ui` | walk + interact, requires the write opt-in below | **yes, destructive** |
| `npm run test:ui:walk` | opens routes, reports blank/error pages, unexpected redirects / JS errors / failed requests | no |
| `npm run test:ui:interact` | Excel export, planning forms, cycle no, selected print pages | **yes, destructive** |

**Important:** `test:ui:interact` can create, delete and clear records; its cleanup is not guaranteed if setup or the process fails. Run it **only** with a disposable local database that does not contain real data. Both UI_BASE and DATABASE_URL must use an exact localhost/loopback hostname, and you must explicitly set `UI_TEST_ALLOW_WRITES=1` after verifying the database. Localhost may still be a tunnel to a remote database: the opt-in is not a safety guarantee. Never use production or valuable local data.

The mocked `e2e/tests/screen-smoke.spec.js` suite instead blocks writes and needs a development Vite server. Run `npm run e2e -- screen-smoke` after installing Playwright Chromium. It checks rendering of static routes and a small number of UI actions, but does not validate real API/database workflows or populated print output.

Locally you are signed in automatically with a token minted from
`backend/.env` — no password needed.

## PWA

`npm run test:pwa` checks the app is installable and — the part that matters —
that the service worker never caches `/api`. A cached billing status or
furnace cycle no is a wrong invoice.

It needs a **production** build served the way the server serves it, because
the worker only registers in prod and the MIME types come from
`express.static`:

```bash
cd frontend && npm run build
rm -rf ../backend/public && cp -r dist ../backend/public
cd ../backend && npm start          # http://localhost:5000
cd ../frontend && npm run test:pwa
```

`backend/public` is gitignored — it is build output, and deploy.py writes the
same thing on the server.

## Checking a deployed site

`live-check.js` only navigates and reads. It never saves, deletes or creates
anything, so it is safe against production:

```bash
UI_BASE=https://www.codeprana.com UI_EMAIL=you@example.com UI_PASSWORD=... npm run test:ui:live
```

Never hardcode the password — pass it in the environment.

## Keeping them useful

- Added a route to `App.jsx`? Add it to the list in `ui-walk.js`.
- Changed the furnaces used for tempering? Update `TEMPERING_FURNACES` in
  `live-check.js` and the filter in `TemperingPlan.jsx` together.
- `ui-interact.js` creates a scratch furnace, item and inward and removes them
  in its `finally` block. It refuses to run against a non-local URL.
