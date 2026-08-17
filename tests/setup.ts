/**
 * Globale Test-Defaults (kein echtes Gemini im Unit-Lauf).
 */
process.env.GEMINI_API_KEY =
  process.env.GEMINI_API_KEY || "test-gemini-key-not-used-when-mocked";
