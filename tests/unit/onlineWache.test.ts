import { describe, expect, it } from "vitest";
import {
  ONLINE_WACHE_SHARED_PORTAL,
  ONLINE_WACHE_SPECIAL_URLS,
  resolveOnlineWacheUrl,
} from "@/config/onlineWache";
import {
  extractPlz,
  resolveOnlineWacheFromPlzCode,
} from "@/lib/onlineWache";
import { DEMO_SCENARIOS } from "@/lib/demoScenarios";

describe("onlineWache config + PLZ-Lookup", () => {
  it("nutzt Spezial-URLs für BY/BE/NW/ST", () => {
    expect(resolveOnlineWacheUrl("BY")).toBe(ONLINE_WACHE_SPECIAL_URLS.BY);
    expect(resolveOnlineWacheUrl("BE")).toBe(ONLINE_WACHE_SPECIAL_URLS.BE);
    expect(resolveOnlineWacheUrl("NW")).toBe(ONLINE_WACHE_SPECIAL_URLS.NW);
    expect(resolveOnlineWacheUrl("ST")).toBe(ONLINE_WACHE_SPECIAL_URLS.ST);
  });

  it("fällt für andere Länder auf das gemeinsame Portal zurück", () => {
    expect(resolveOnlineWacheUrl("HH")).toBe(ONLINE_WACHE_SHARED_PORTAL);
    expect(resolveOnlineWacheUrl("HE")).toBe(ONLINE_WACHE_SHARED_PORTAL);
  });

  it("mappt Demo-PLZs auf die erwarteten Länder", () => {
    expect(resolveOnlineWacheFromPlzCode("10115").entry?.id).toBe("BE");
    expect(resolveOnlineWacheFromPlzCode("80331").entry?.id).toBe("BY");
    expect(resolveOnlineWacheFromPlzCode("20095").entry?.id).toBe("HH");
    expect(resolveOnlineWacheFromPlzCode("50667").entry?.id).toBe("NW");
  });

  it("extrahiert PLZ aus kombiniertem Text", () => {
    expect(extractPlz("80331 München")).toBe("80331");
    expect(extractPlz("keine plz")).toBeNull();
  });
});

describe("demoScenarios", () => {
  it("enthält Positiv- und Delikt-Beispiele", () => {
    const ids = DEMO_SCENARIOS.map((s) => s.id);
    expect(ids).toContain("x-positive");
    expect(ids).toContain("x-insult");
    expect(ids).toContain("tt-threat");
  });

  it("markiert Positivbeispiel klar im Kontext", () => {
    const positive = DEMO_SCENARIOS.find((s) => s.id === "x-positive");
    expect(positive).toBeTruthy();
    expect(positive!.userContext).toMatch(/POSITIV/i);
    expect(positive!.screenshots[0].lines.join(" ")).toMatch(/Solidarität|mutig/i);
  });

  it("liefert vollständige Absenderdaten je Szenario", () => {
    for (const scenario of DEMO_SCENARIOS) {
      expect(scenario.complainant.fullName.length).toBeGreaterThan(0);
      expect(scenario.complainant.zip).toMatch(/^\d{5}$/);
      expect(scenario.complainant.city.length).toBeGreaterThan(0);
      expect(scenario.complainant.email).toContain("@");
      expect(scenario.screenshots.length).toBeGreaterThan(0);
    }
  });
});
