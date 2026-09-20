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
| `npm run test:ui` | walk + interact, the usual check before deploying | yes, locally |
| `npm run test:ui:walk` | opens all 35 routes, reports blank pages / JS errors / failed requests | no |
| `npm run test:ui:interact` | Excel export, planning forms, cycle no, every print page | yes, locally |

Locally you are signed in automatically with a token minted from
`backend/.env` — no password needed.

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
