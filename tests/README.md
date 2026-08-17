# Backend-Tests (Vitest)

## Befehle

```bash
npm test              # einmaliger Lauf
npm run test:watch    # Watch-Mode
npm run test:coverage # Coverage-Report
```

## Abdeckung

| Bereich | Dateien |
|---------|---------|
| Legal Assessment | Positiv-/Negativ-Heuristik (`NO_OFFENSE` vs. § 185 ff.) |
| Sanitize | Prompt-Injection, HTML, dangerous URIs |
| Evidence | SHA-256, Profil-URL-Guess, Zeitstempel |
| Online-Wache | Config-URLs, PLZ→Bundesland, Demo-Szenarien |
| Plattform-Meldung | Config-URLs je Plattform, Resolver (`resolvePlatformReport`) |
| Validation | multipart/FormData, PLZ, Plattform, Limits |
| Documents | `rawCopyText` + PDF-Buffer |
| API | `POST /api/generate-complaint` mit gemocktem Gemini |

Gemini wird in den API-Tests **gemockt** (kein Live-Key nötig). Live-KI weiterhin manuell über die UI / Demo-Szenarien.

Weitere Projektdoku: [README](../README.md), [Technische Dokumentation](../docs/TECHNISCHE-DOKUMENTATION.md).
