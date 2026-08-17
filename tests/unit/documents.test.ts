import { describe, expect, it } from "vitest";
import { buildRawCopyText } from "@/lib/complaintText";
import { buildComplaintPdf } from "@/lib/pdf";
import { offenseAnalysis, TINY_PNG_BUFFER, baseComplainant } from "../helpers";

describe("document builders", () => {
  it("baut Anzeigentext mit Strafantrag und Hashes", () => {
    const text = buildRawCopyText({
      complainant: baseComplainant() as never,
      platform: "X",
      incidentDate: "2026-08-12T12:00",
      analysis: offenseAnalysis() as never,
      screenshotCount: 1,
      screenshotHashes: ["abc123"],
      capturedAtLabel: "12.08.2026, 12:00:00",
    });

    expect(text).toMatch(/STRAFANZEIGE/);
    expect(text).toMatch(/Strafantrag/i);
    expect(text).toContain("@demo_hetzer_x");
    expect(text).toContain("§ 185");
    expect(text).toContain("abc123");
  });

  it("erzeugt ein PDF-Buffer mit Inhalt", async () => {
    const pdf = await buildComplaintPdf({
      complainant: baseComplainant() as never,
      platform: "X",
      incidentDate: "2026-08-12T12:00",
      analysis: offenseAnalysis() as never,
      screenshots: [{ buffer: TINY_PNG_BUFFER, mimeType: "image/png" }],
      screenshotHashes: ["deadbeef"],
      capturedAtLabel: "12.08.2026, 12:00:00",
    });

    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.byteLength).toBeGreaterThan(500);
    expect(pdf.subarray(0, 4).toString("utf8")).toBe("%PDF");
  });
});
