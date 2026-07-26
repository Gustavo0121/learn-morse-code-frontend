---
name: run-learn-morse-code-frontend
description: Build, run, and drive the Learn Morse Code Angular SPA in a headless browser. Use when asked to start the app, take a screenshot of a screen, verify a UI change works, or click through a flow (login, lessons, practice, translate, settings).
---

Angular 22 SPA served by `ng serve` (`npm start`, port 4200, proxies `/api`
to a Django backend on :8000 per `proxy.conf.json` — the backend does not
need to be running for public/anonymous flows). For agent use, drive it
headless with the Playwright script at `driver.mjs` in this skill directory
— no `chromium-cli` available in this environment, so this script fills
that role, one command per stdin line.

All paths below are relative to the repo root (`learn-morse-code-frontend/`).

## Prerequisites (once)

```bash
cd .claude/skills/run-learn-morse-code-frontend && npm install
npx playwright install chromium
```

This installs Playwright **only inside the skill directory** — it is not
a dependency of the app itself (`package.json` at the repo root is
untouched).

## Run (agent path)

```bash
npm start &                                                    # from repo root
timeout 40 bash -c 'until curl -sf http://localhost:4200 >/dev/null; do sleep 1; done'

node .claude/skills/run-learn-morse-code-frontend/driver.mjs <<'EOF'
nav /translate
wait-for text=Translate
screenshot 01-landing
fill #translate-text SOS
value #translate-morse
click text=Copiar
wait-for text=Copiado!
console --errors
EOF
```

Stop the server afterwards: `kill %1` (or find/kill the `ng serve` /
`node .../ng.js serve` processes — `npm start` on this stack spawns both a
wrapper `cmd`/shell and a child `node` process).

Screenshots land in `.claude/skills/run-learn-morse-code-frontend/screenshots/`
(override with `SCREENSHOT_DIR`). `BASE_URL` overrides the default
`http://localhost:4200`.

### Commands

| command                        | what it does                                                                                             |
| ------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `nav <path-or-url>`            | navigate (relative paths resolve against `BASE_URL`), waits for network idle                             |
| `wait-for <selector>`          | wait up to 10s for a Playwright selector (`css`, `#id`, `text=One Word` — **no spaces**, see Gotchas)    |
| `screenshot [name]`            | full-page screenshot → `screenshots/<name>.png`                                                          |
| `click <selector>`             | click; catches and prints errors instead of throwing (e.g. strict-mode violations)                       |
| `fill <selector> <value...>`   | set an input/textarea value (fires Angular's `(input)` binding)                                          |
| `press <key>`                  | keyboard press (e.g. `Enter`, `Escape`) on whatever has focus                                            |
| `text [selector]`              | print `innerText` of the selector (or `<body>`) — use for multi-word content instead of `wait-for text=` |
| `value <selector>`             | print an input/textarea's current value                                                                  |
| `eval <js-expr>`               | evaluate JS in the page, print JSON result                                                               |
| `console` / `console --errors` | print collected console messages (all, or just `error`/`pageerror`)                                      |

## Run (human path)

```bash
npm start   # opens on http://localhost:4200; Ctrl-C to stop
```

## Gotchas

- **`wait-for`/`click` selectors are whitespace-split** — a value like
  `text=... --- ...` or `text=Sem código Morse` gets truncated at the first
  space, since the driver splits each stdin line on whitespace to separate
  command from arguments. Stick to single-token selectors (`#id`, `.class`,
  `text=OneWord`) with `wait-for`/`click`; for multi-word content, `fill`
  the input then read it back with `text <selector>` or `value <selector>`
  instead of waiting on it directly.
- **`getByLabel`-style lookups are ambiguous in this app** — Playwright's
  `page.getByLabel('Morse')` matches _both_ the `#translate-morse` textarea
  (via its `<label for>`) and the "Listen" button (`aria-label="Ouvir a
sequência Morse"`), throwing a strict-mode violation. The driver
  intentionally only exposes plain CSS/`text=` selectors (`page.click`/
  `page.fill`), not `getByLabel`/`getByRole` — use `#translate-text` /
  `#translate-morse` ids for the translator fields.
- **`navigator.clipboard.writeText` needs an explicit permission grant** —
  the app's copy buttons (`/translate`) call it; Playwright denies
  clipboard-write by default and it fails silently (`NotAllowedError` only
  visible via `console --errors`), which looks like a dead button. The
  driver's context already calls `grantPermissions(['clipboard-read',
'clipboard-write'], { origin: BASE_URL })` — keep that if you extend it.
- **Expected console noise, not real errors**: a `401` on
  `/api/auth/refresh` (the app's silent session-bootstrap on every page
  load, expected when anonymous and no backend is running) and a CORS
  failure hitting `cloudflareinsights.com` (the Cloudflare Web Analytics
  beacon, blocked in local dev because the origin isn't allow-listed).
  Both appear on _every_ page, unrelated to whatever you're testing —
  don't mistake them for a regression.
- **Backend-dependent routes** (`/login`, `/dashboard`, `/lessons`,
  `/practice`, `/settings` — anything behind `authGuard` or that calls the
  API) need the Django backend running on :8000 too (see
  `learn-morse-code-backend`); the public routes (`/`, `/login` shell,
  `/translate`) render fine without it.

## Troubleshooting

- **`curl` polling never succeeds**: check `npm start`'s output — Angular
  rebuilds on file changes and the first build takes ~5s; a stale
  `EADDRINUSE` from a previous run means an old `ng serve`/`node .../ng.js`
  process is still bound to :4200 — find and kill it before retrying.
- **`npx playwright install chromium` re-downloads every time**: it caches
  under `%LOCALAPPDATA%\ms-playwright` (Windows) — if it's re-downloading,
  something is clearing that cache between runs, not a driver bug.
