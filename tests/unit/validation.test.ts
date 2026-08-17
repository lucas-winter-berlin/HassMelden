import { describe, expect, it } from "vitest";
import { validateGenerateRequest, ValidationError } from "@/lib/validation";
import { buildGenerateFormData, makePngFile } from "../helpers";

describe("validateGenerateRequest", () => {
  it("akzeptiert gültige Demo-ähnliche Requests", async () => {
    const validated = await validateGenerateRequest(
      buildGenerateFormData({
        profileUrl: "https://x.com/demo_hetzer_x",
        userContext: "[DEMO] Kurzer Kontext.",
      })
    );
    expect(validated.platform).toBe("X");
    expect(validated.screenshots).toHaveLength(1);
    expect(validated.screenshots[0].mimeType).toBe("image/png");
    expect(validated.complainant.zip).toBe("10115");
    expect(validated.profileUrl).toContain("x.com");
    expect(validated.userContext).toContain("DEMO");
  });

  it("lehnt fehlende Screenshots ab", async () => {
    await expect(
      validateGenerateRequest(buildGenerateFormData({ omitScreenshots: true }))
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("lehnt ungültige PLZ ab", async () => {
    await expect(
      validateGenerateRequest(
        buildGenerateFormData({ complainant: { zip: "12" } })
      )
    ).rejects.toThrow(/PLZ/i);
  });

  it("lehnt ungültige Plattform ab", async () => {
    await expect(
      validateGenerateRequest(buildGenerateFormData({ platform: "MYSPACE" }))
    ).rejects.toThrow(/Plattform/i);
  });

  it("lehnt javascript:-URLs ab", async () => {
    await expect(
      validateGenerateRequest(
        buildGenerateFormData({ profileUrl: "javascript:alert(1)" })
      )
    ).rejects.toThrow(/URL|http/i);
  });

  it("begrenzt die Screenshot-Anzahl", async () => {
    const shots = Array.from({ length: 6 }, (_, i) =>
      makePngFile(`shot-${i}.png`)
    );
    await expect(
      validateGenerateRequest(buildGenerateFormData({ screenshots: shots }))
    ).rejects.toThrow(/Maximal/i);
  });

  it("fordert Zustelladresse bei Adressschutz", async () => {
    await expect(
      validateGenerateRequest(
        buildGenerateFormData({
          complainant: {
            addressDisclosure: "protected",
            deliveryNote: "",
          },
        })
      )
    ).rejects.toThrow(/Zustelladresse|Adressschutz/i);
  });
});
