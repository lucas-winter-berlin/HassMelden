/**
 * Offizielle Melde-/Kontakt-Einstiege der Plattformen.
 *
 * Hier anpassen, wenn Help-Center-URLs umziehen.
 * HassMelden sendet keine Meldungen selbst - nur Deep-Links.
 */

import type { Platform } from "@/lib/types";

export type PlatformReportConfig = {
  /** Anzeigename der Plattform */
  label: string;
  /**
   * Offizieller Einstieg zum Melden (Hilfe-Center / Formular).
   * `null` = kein stabiler Direktlink (z. B. Sonstige).
   */
  url: string | null;
  /** Kurzer Hinweis unter dem Button */
  note: string;
};

export const PLATFORM_REPORTS: Record<Platform, PlatformReportConfig> = {
  X: {
    label: "X (Twitter)",
    url: "https://help.x.com/forms/report",
    note: "Öffnet das offizielle Meldeformular von X. Halte Profil-URL und Screenshots bereit.",
  },
  INSTAGRAM: {
    label: "Instagram",
    url: "https://help.instagram.com/192435014247952",
    note: "Öffnet die Instagram-Hilfe zum Melden von Beiträgen und Profilen. Am wirksamsten ist oft die Meldung direkt am Inhalt in der App.",
  },
  FACEBOOK: {
    label: "Facebook",
    url: "https://www.facebook.com/help/181495968648557",
    note: "Öffnet die Facebook-Hilfe zum Melden von Inhalten. Am wirksamsten ist oft die Meldung direkt am Beitrag oder Profil.",
  },
  TIKTOK: {
    label: "TikTok",
    url: "https://support.tiktok.com/de/safety-hc/report-a-problem",
    note: "Öffnet den TikTok-Support zum Melden. Am wirksamsten ist oft die Meldung direkt am Video oder Kommentar in der App.",
  },
  OTHER: {
    label: "Sonstige Plattform",
    url: null,
    note: "Für diese Plattform gibt es keinen hinterlegten Direktlink. Bitte den Meldeweg in der App oder auf der Website der Plattform nutzen.",
  },
};

export function getPlatformReportConfig(
  platform: Platform
): PlatformReportConfig {
  return PLATFORM_REPORTS[platform];
}
