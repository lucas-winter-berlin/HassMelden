import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  buildGenerateFormData,
  noOffenseAnalysis,
  offenseAnalysis,
} from "../helpers";

vi.mock("@/lib/gemini", async () => {
  class AiUnavailableError extends Error {
    constructor(message = "Gemini Vision API unavailable") {
      super(message);
      this.name = "AiUnavailableError";
    }
  }

  return {
    AiUnavailableError,
    analyzeScreenshotsWithVision: vi.fn(),
  };
});

import { analyzeScreenshotsWithVision, AiUnavailableError } from "@/lib/gemini";
import { POST } from "@/app/api/generate-complaint/route";
import { NO_OFFENSE_USER_MESSAGE } from "@/lib/legalAssessment";

const mockedAnalyze = vi.mocked(analyzeScreenshotsWithVision);

function makeRequest(form: FormData) {
  return new NextRequest("http://localhost/api/generate-complaint", {
    method: "POST",
    body: form,
  });
}

describe("POST /api/generate-complaint", () => {
  beforeEach(() => {
    mockedAnalyze.mockReset();
  });

  it("Negativbeispiel (Delikt): liefert PDF + Analysefelder", async () => {
    mockedAnalyze.mockResolvedValue(offenseAnalysis() as never);

    const response = await POST(
      makeRequest(
        buildGenerateFormData({
          profileUrl: "https://x.com/demo_hetzer_x",
          userContext: "[DEMO] Beleidigung gesehen.",
        })
      )
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.pdfBase64).toMatch(/^data:application\/pdf;base64,/);
    expect(body.data.legalCategorization).toMatch(/§\s*185/);
    expect(body.data.rawCopyText).toMatch(/STRAFANZEIGE/);
    expect(body.data.screenshotHashes).toHaveLength(1);
    expect(mockedAnalyze).toHaveBeenCalledOnce();
  });

  it("Positivbeispiel (kein Delikt): kein PDF, Code NO_OFFENSE", async () => {
    mockedAnalyze.mockResolvedValue(noOffenseAnalysis() as never);

    const response = await POST(
      makeRequest(
        buildGenerateFormData({
          profileUrl: "https://x.com/demo_ally_x",
          userContext:
            "[DEMO · POSITIVBEISPIEL] Bitte prüfen, ob strafrechtlich relevant.",
        })
      )
    );
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.success).toBe(false);
    expect(body.code).toBe("NO_OFFENSE");
    expect(body.error).toBe(NO_OFFENSE_USER_MESSAGE);
    expect(body.assessment.legalCategorization).toMatch(/kein anhaltspunkt/i);
    expect(body.data?.pdfBase64).toBeUndefined();
    expect(mockedAnalyze).toHaveBeenCalledOnce();
  });

  it("Validierungsfehler: 400 ohne KI-Aufruf", async () => {
    const response = await POST(
      makeRequest(buildGenerateFormData({ omitScreenshots: true }))
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.code).toBe("VALIDATION_ERROR");
    expect(mockedAnalyze).not.toHaveBeenCalled();
  });

  it("KI-Ausfall: 503 AI_UNAVAILABLE", async () => {
    mockedAnalyze.mockRejectedValue(
      new AiUnavailableError("Gemini blocked the request")
    );

    const response = await POST(makeRequest(buildGenerateFormData()));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.success).toBe(false);
    expect(body.code).toBe("AI_UNAVAILABLE");
  });
});
