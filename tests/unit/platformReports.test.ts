import { describe, expect, it } from "vitest";
import {
  PLATFORM_REPORTS,
  getPlatformReportConfig,
} from "@/config/platformReports";
import { resolvePlatformReport } from "@/lib/platformReports";
import { PLATFORMS } from "@/lib/types";

describe("platformReports config", () => {
  it("deckt alle Plattformen ab", () => {
    for (const platform of PLATFORMS) {
      expect(PLATFORM_REPORTS[platform]).toBeDefined();
      expect(PLATFORM_REPORTS[platform].label.length).toBeGreaterThan(0);
      expect(PLATFORM_REPORTS[platform].note.length).toBeGreaterThan(0);
    }
  });

  it("liefert https-URLs für bekannte Plattformen", () => {
    for (const platform of ["X", "INSTAGRAM", "FACEBOOK", "TIKTOK"] as const) {
      const url = getPlatformReportConfig(platform).url;
      expect(url).toMatch(/^https:\/\//);
    }
  });

  it("hat keinen Direktlink für OTHER", () => {
    expect(getPlatformReportConfig("OTHER").url).toBeNull();
  });
});

describe("resolvePlatformReport", () => {
  it("löst X mit Melde-URL auf", () => {
    const entry = resolvePlatformReport("X");
    expect(entry?.hasReportUrl).toBe(true);
    expect(entry?.url).toBe(PLATFORM_REPORTS.X.url);
    expect(entry?.label).toContain("X");
  });

  it("markiert OTHER ohne klickbaren Link", () => {
    const entry = resolvePlatformReport("OTHER");
    expect(entry?.hasReportUrl).toBe(false);
    expect(entry?.url).toBeNull();
  });

  it("gibt null bei leerer Auswahl zurück", () => {
    expect(resolvePlatformReport("")).toBeNull();
    expect(resolvePlatformReport(null)).toBeNull();
    expect(resolvePlatformReport(undefined)).toBeNull();
  });
});
