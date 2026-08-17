/**
 * Heuristik: KI-Einordnung ohne strafrechtlich relevanten Befund.
 * Bei Treffer wird keine Strafanzeige-PDF erzeugt.
 */

const NO_OFFENSE_PATTERNS: RegExp[] = [
  /kein\s+anhaltspunkt/i,
  /keine\s+anhaltspunkte/i,
  /kein\s+tatverdacht/i,
  /kein\s+verdacht\s+auf/i,
  /nicht\s+strafrechtlich\s+relevant/i,
  /inhaltlich\s+nicht\s+strafrechtlich/i,
  /kein(?:e|en)?\s+strafbare[rn]?\s+(?:aussage|inhalt|handlung|tat)/i,
  /keine\s+beleidigung/i,
  /kein\s+delikt/i,
  /nicht\s+strafbar/i,
  /ohne\s+strafrechtliche[rn]?\s+bezug/i,
  /kein\s+straftatbestand/i,
  /fällt\s+nicht\s+unter/i,
  /nicht\s+als\s+straftat/i,
  /no\s+(criminal\s+)?offense/i,
  /not\s+criminally\s+relevant/i,
];

/** Positiver Verdacht auf einschlägige StGB-Normen */
const POSITIVE_OFFENSE_PATTERNS: RegExp[] = [
  /verdacht\s+auf\s+§\s*185/i,
  /verdacht\s+auf\s+§\s*192a/i,
  /verdacht\s+auf\s+§\s*130/i,
  /verdacht\s+auf\s+§\s*241/i,
  /§\s*185\s*StGB/i,
  /§\s*192a\s*StGB/i,
  /§\s*130\s*StGB/i,
  /§\s*241\s*StGB/i,
];

export function isNoCriminalFinding(legalCategorization: string): boolean {
  const text = legalCategorization.trim();
  if (!text) return false;

  const hasExplicitNo = NO_OFFENSE_PATTERNS.some((re) => re.test(text));
  if (hasExplicitNo) return true;

  // „Kein … §§ 185, 192a …“ zählt als Negativ, auch wenn Paragrafen genannt werden
  if (
    /kein\b/i.test(text) &&
    /(beleidigung|verhetzung|bedrohung|volksverhetzung|§\s*185|§\s*192a|§\s*130|§\s*241)/i.test(
      text
    )
  ) {
    return true;
  }

  return false;
}

export function hasPositiveOffenseFinding(legalCategorization: string): boolean {
  if (isNoCriminalFinding(legalCategorization)) return false;
  return POSITIVE_OFFENSE_PATTERNS.some((re) =>
    re.test(legalCategorization.trim())
  );
}

export const NO_OFFENSE_USER_MESSAGE =
  "In den hochgeladenen Screenshots wurden keine strafbaren Aussagen erkannt (kein Anhaltspunkt für Beleidigung, Verhetzung oder Bedrohung). Es wurde daher keine Strafanzeige als PDF erstellt. Du kannst andere Beweise hochladen oder Angaben prüfen und erneut versuchen.";
