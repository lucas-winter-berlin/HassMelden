# app-hass-melden

Public. License: MIT.

Build a German criminal complaint PDF from screenshots of online hate. The app does not store incident data on a server and does not send anything to the police.

German UI. German README: [README.de.md](README.de.md).

GitHub folder name is still `HassMelden`. Intended Forgejo name is `app-hass-melden`.

## Start

```
npm install
copy .env.example .env.local
npm run dev
```

Set `GEMINI_API_KEY` in `.env.local`. Open http://localhost:3000

## Commands

```
npm run build
npm start
npm test
npm run lint
```

## Secrets

`GEMINI_API_KEY` in `.env.local` only. Template: `.env.example`. Server-side, no `NEXT_PUBLIC_`.

## Docs

| Doc | Content |
|-----|---------|
| [docs/README.md](docs/README.md) | Index |
| [docs/TECHNISCHE-DOKUMENTATION.md](docs/TECHNISCHE-DOKUMENTATION.md) | Technical notes (German) |
| [tests/README.md](tests/README.md) | Tests (German) |
| [README.de.md](README.de.md) | German product README |
