import { describe, expect, it } from "vitest";
import {
  hasPositiveOffenseFinding,
  isNoCriminalFinding,
  NO_OFFENSE_USER_MESSAGE,
} from "@/lib/legalAssessment";

describe("legalAssessment", () => {
  describe("isNoCriminalFinding (Positivbeispiel / kein Delikt)", () => {
    it("erkennt explizite Negativ-Formulierungen", () => {
      expect(
        isNoCriminalFinding(
          "Kein Anhaltspunkt für Beleidigung, Verhetzung oder Bedrohung (§§ 185, 192a, 130, 241 StGB) - inhaltlich nicht strafrechtlich relevant."
        )
      ).toBe(true);
      expect(isNoCriminalFinding("Keine Beleidigung erkennbar.")).toBe(true);
      expect(isNoCriminalFinding("Nicht strafbar / kein Delikt.")).toBe(true);
      expect(isNoCriminalFinding("Kein Tatverdacht.")).toBe(true);
    });

    it("erkennt englische Negativ-Formulierungen", () => {
      expect(isNoCriminalFinding("Not criminally relevant.")).toBe(true);
      expect(isNoCriminalFinding("No criminal offense found.")).toBe(true);
    });
  });

  describe("hasPositiveOffenseFinding (Negativbeispiel / Delikt)", () => {
    it("erkennt StGB-Verdacht", () => {
      expect(
        hasPositiveOffenseFinding("Verdacht auf § 185 StGB (Beleidigung)")
      ).toBe(true);
      expect(
        hasPositiveOffenseFinding(
          "Verdacht auf § 185 StGB; ggf. § 241 StGB (Bedrohung)"
        )
      ).toBe(true);
      expect(hasPositiveOffenseFinding("§ 130 StGB Volksverhetzung")).toBe(
        true
      );
    });

    it("wertet Negativ-Befund nicht als Delikt", () => {
      expect(
        hasPositiveOffenseFinding(
          "Kein Anhaltspunkt für Beleidigung (§§ 185, 192a, 130, 241 StGB)"
        )
      ).toBe(false);
      expect(isNoCriminalFinding("")).toBe(false);
      expect(hasPositiveOffenseFinding("Einordnung unklar")).toBe(false);
    });
  });

  it("stellt eine nutzerverständliche NO_OFFENSE-Meldung bereit", () => {
    expect(NO_OFFENSE_USER_MESSAGE).toMatch(/keine strafbaren Aussagen/i);
    expect(NO_OFFENSE_USER_MESSAGE).toMatch(/PDF/i);
  });
});
