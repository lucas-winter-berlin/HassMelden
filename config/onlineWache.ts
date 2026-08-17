/**
 * Konfiguration der Online-Wachen-Links (Bundesländer).
 *
 * Hier anpassen, wenn Portale umziehen oder neue Direktlinks verfügbar sind.
 * Die meisten Länder teilen sich das gemeinsame Portal; BY/BE/NW/ST haben
 * eigene Einstiege.
 */

export type BundeslandId =
  | "BW"
  | "BY"
  | "BE"
  | "BB"
  | "HB"
  | "HH"
  | "HE"
  | "MV"
  | "NI"
  | "NW"
  | "RP"
  | "SL"
  | "SN"
  | "ST"
  | "SH"
  | "TH";

/** Gemeinsames Portal der Länder-Onlinewachen */
export const ONLINE_WACHE_SHARED_PORTAL =
  "https://portal.onlinewache.polizei.de/de/";

/**
 * Spezielle Direktlinks (eigene Portale / Formulare).
 * Alle nicht hier gelisteten Länder nutzen ONLINE_WACHE_SHARED_PORTAL.
 */
export const ONLINE_WACHE_SPECIAL_URLS: Partial<
  Record<BundeslandId, string>
> = {
  /**
   * Bayern – Anzeigeerstattung (Formularserver).
   * Hinweis: jsessionid/state/cc in Deep-Links können ablaufen;
   * ggf. auf den stabilen Dialog-Einstieg ohne Session-Parameter aktualisieren.
   */
  BY: "https://anzeige.polizei.bayern.de/",

  /** Berlin – Internetwache */
  BE: "https://www.internetwache-polizei-berlin.de/index_start.html",

  /** Nordrhein-Westfalen – Internetwache */
  NW: "https://internetwache.polizei.nrw/ich-moechte-eine-anzeige-erstatten/delikt-auswaehlen-online-anzeige-starten",

  /** Sachsen-Anhalt – E-Revier */
  ST: "https://polizei.sachsen-anhalt.de/das-sind-wir/polizei-interaktiv/e-revier/anzeige-erstatten",
};

/** Anzeigenamen der Bundesländer */
export const BUNDESLAND_NAMES: Record<BundeslandId, string> = {
  BW: "Baden-Württemberg",
  BY: "Bayern",
  BE: "Berlin",
  BB: "Brandenburg",
  HB: "Bremen",
  HH: "Hamburg",
  HE: "Hessen",
  MV: "Mecklenburg-Vorpommern",
  NI: "Niedersachsen",
  NW: "Nordrhein-Westfalen",
  RP: "Rheinland-Pfalz",
  SL: "Saarland",
  SN: "Sachsen",
  ST: "Sachsen-Anhalt",
  SH: "Schleswig-Holstein",
  TH: "Thüringen",
};

export function resolveOnlineWacheUrl(id: BundeslandId): string {
  return ONLINE_WACHE_SPECIAL_URLS[id] ?? ONLINE_WACHE_SHARED_PORTAL;
}
