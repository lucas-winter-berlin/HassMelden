/**
 * Auflösung der Plattform-Meldelinks für den Ergebnis-Schritt.
 * Links/Texte: siehe `config/platformReports.ts`.
 */

import {
  PLATFORM_REPORTS,
  getPlatformReportConfig,
  type PlatformReportConfig,
} from "@/config/platformReports";
import type { Platform } from "@/lib/types";

export type { PlatformReportConfig };
export { PLATFORM_REPORTS, getPlatformReportConfig };

export type PlatformReportEntry = PlatformReportConfig & {
  platform: Platform;
  /** True, wenn ein klickbarer Melde-Link verfügbar ist */
  hasReportUrl: boolean;
};

/**
 * Liefert Melde-Einstieg für die gewählte Plattform.
 * Bei leerer/ungültiger Auswahl: null (kein CTA).
 */
export function resolvePlatformReport(
  platform: Platform | "" | null | undefined
): PlatformReportEntry | null {
  if (!platform) return null;
  if (!(platform in PLATFORM_REPORTS)) return null;

  const config = getPlatformReportConfig(platform);
  return {
    platform,
    ...config,
    hasReportUrl: Boolean(config.url),
  };
}
