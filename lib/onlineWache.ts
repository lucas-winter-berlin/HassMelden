/**
 * Clientseitige Zuordnung PLZ → Bundesland und Auflösung der Online-Wache-URL.
 * Links/Namen: siehe `config/onlineWache.ts`.
 */

import {
  BUNDESLAND_NAMES,
  ONLINE_WACHE_SHARED_PORTAL,
  resolveOnlineWacheUrl,
  type BundeslandId,
} from "@/config/onlineWache";

export type { BundeslandId };

export type OnlineWacheEntry = {
  id: BundeslandId;
  name: string;
  /** Offizieller Einstieg zur Online-/Internetwache des Landes */
  url: string;
};

const BUNDESLAND_IDS = Object.keys(BUNDESLAND_NAMES) as BundeslandId[];

/** Abgeleitete Map aus der Config (Namen + URLs) */
export const ONLINE_WACHE_BY_LAND: Record<BundeslandId, OnlineWacheEntry> =
  Object.fromEntries(
    BUNDESLAND_IDS.map((id) => [
      id,
      {
        id,
        name: BUNDESLAND_NAMES[id],
        url: resolveOnlineWacheUrl(id),
      } satisfies OnlineWacheEntry,
    ])
  ) as Record<BundeslandId, OnlineWacheEntry>;

/** Fallback, wenn PLZ nicht zuordenbar ist */
export const ONLINE_WACHE_PORTAL_FALLBACK = ONLINE_WACHE_SHARED_PORTAL;

/**
 * Grobe Zuordnung über die ersten zwei PLZ-Ziffern (Postleitregion).
 * Reicht für Wohnsitz→Online-Wache; Grenz-PLZ können abweichen.
 */
const PLZ_PREFIX2_TO_LAND: Record<string, BundeslandId> = {
  "01": "SN",
  "02": "SN",
  "03": "BB",
  "04": "SN",
  "06": "ST",
  "07": "TH",
  "08": "SN",
  "09": "SN",
  "10": "BE",
  "11": "BE",
  "12": "BE",
  "13": "BE",
  "14": "BE",
  "15": "BB",
  "16": "BB",
  "17": "MV",
  "18": "MV",
  "19": "MV",
  "20": "HH",
  "21": "HH",
  "22": "HH",
  "23": "SH",
  "24": "SH",
  "25": "SH",
  "26": "NI",
  "27": "NI",
  "28": "HB",
  "29": "NI",
  "30": "NI",
  "31": "NI",
  "32": "NW",
  "33": "NW",
  "34": "HE",
  "35": "HE",
  "36": "HE",
  "37": "NI",
  "38": "NI",
  "39": "ST",
  "40": "NW",
  "41": "NW",
  "42": "NW",
  "44": "NW",
  "45": "NW",
  "46": "NW",
  "47": "NW",
  "48": "NW",
  "49": "NI",
  "50": "NW",
  "51": "NW",
  "52": "NW",
  "53": "NW",
  "54": "RP",
  "55": "RP",
  "56": "RP",
  "57": "NW",
  "58": "NW",
  "59": "NW",
  "60": "HE",
  "61": "HE",
  "63": "HE",
  "64": "HE",
  "65": "HE",
  "66": "SL",
  "67": "RP",
  "68": "BW",
  "69": "BW",
  "70": "BW",
  "71": "BW",
  "72": "BW",
  "73": "BW",
  "74": "BW",
  "75": "BW",
  "76": "BW",
  "77": "BW",
  "78": "BW",
  "79": "BW",
  "80": "BY",
  "81": "BY",
  "82": "BY",
  "83": "BY",
  "84": "BY",
  "85": "BY",
  "86": "BY",
  "87": "BY",
  "88": "BW",
  "89": "BW",
  "90": "BY",
  "91": "BY",
  "92": "BY",
  "93": "BY",
  "94": "BY",
  "95": "BY",
  "96": "BY",
  "97": "BY",
  "98": "TH",
  "99": "TH",
};

/** Feinere Overrides für bekannte Abweichungen vom 2-Stellen-Prefix */
const PLZ_EXACT_OVERRIDES: Record<string, BundeslandId> = {
  "28790": "NI",
  "22844": "SH",
  "22846": "SH",
  "22848": "SH",
  "22850": "SH",
  "22851": "SH",
  "11011": "BE",
};

/** Kurzer Einzeiler für Pflichtfelder wie „Kurze Schilderung“ in Online-Formularen */
export const ONLINE_FORM_ONELINER =
  "Hiermit erstatte ich Strafanzeige und Strafantrag. Der detaillierte Tathergang, rechtliche Einordnung, Beweise sowie SHA-256-Hashes sind in der beigefügten PDF-Datei enthalten.";

export function extractPlz(zipCity: string): string | null {
  const match = zipCity.trim().match(/\b(\d{5})\b/);
  return match?.[1] ?? null;
}

export function resolveBundeslandFromPlz(
  plz: string
): OnlineWacheEntry | null {
  if (!/^\d{5}$/.test(plz)) return null;

  const exact = PLZ_EXACT_OVERRIDES[plz];
  if (exact) return ONLINE_WACHE_BY_LAND[exact];

  const n = Number.parseInt(plz, 10);
  if (n >= 10115 && n <= 14199) {
    return ONLINE_WACHE_BY_LAND.BE;
  }

  const prefix = plz.slice(0, 2);
  const id = PLZ_PREFIX2_TO_LAND[prefix];
  return id ? ONLINE_WACHE_BY_LAND[id] : null;
}

/**
 * Ermittelt Online-Wache aus PLZ (5-stellig) oder aus „PLZ Ort“-String.
 * Bei unklarer PLZ: Fallback auf zentrales Portal ohne Bundesland-Namen.
 */
export function resolveOnlineWacheFromZipCity(zipCity: string): {
  entry: OnlineWacheEntry | null;
  url: string;
  plz: string | null;
} {
  const plz = extractPlz(zipCity);
  if (!plz) {
    return {
      entry: null,
      url: ONLINE_WACHE_PORTAL_FALLBACK,
      plz: null,
    };
  }
  return resolveOnlineWacheFromPlzCode(plz);
}

export function resolveOnlineWacheFromPlzCode(plz: string): {
  entry: OnlineWacheEntry | null;
  url: string;
  plz: string | null;
} {
  const normalized = plz.trim();
  if (!/^\d{5}$/.test(normalized)) {
    return {
      entry: null,
      url: ONLINE_WACHE_PORTAL_FALLBACK,
      plz: null,
    };
  }
  const entry = resolveBundeslandFromPlz(normalized);
  return {
    entry,
    url: entry?.url ?? ONLINE_WACHE_PORTAL_FALLBACK,
    plz: normalized,
  };
}
