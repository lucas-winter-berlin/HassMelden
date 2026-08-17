import { describe, expect, it } from "vitest";
import {
  formatEvidenceTimestamp,
  guessProfileUrl,
  sha256Hex,
} from "@/lib/evidence";
import { TINY_PNG_BUFFER } from "../helpers";

describe("evidence", () => {
  it("berechnet stabile SHA-256-Hashes", () => {
    const a = sha256Hex(TINY_PNG_BUFFER);
    const b = sha256Hex(TINY_PNG_BUFFER);
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rät Profil-URLs aus Plattform + Handle", () => {
    expect(guessProfileUrl("X", "@demo_user")).toBe("https://x.com/demo_user");
    expect(guessProfileUrl("INSTAGRAM", "demo_user")).toBe(
      "https://www.instagram.com/demo_user/"
    );
    expect(guessProfileUrl("TIKTOK", "@x")).toBe("https://www.tiktok.com/@x");
    expect(guessProfileUrl("OTHER", "irgendwas")).toBeUndefined();
    expect(guessProfileUrl("X", "Unbekannt")).toBeUndefined();
  });

  it("formatiert Erfassungszeitstempel auf Deutsch", () => {
    const label = formatEvidenceTimestamp(new Date("2026-08-12T10:00:00Z"));
    expect(label.length).toBeGreaterThan(5);
    expect(label).toMatch(/\d/);
  });
});
