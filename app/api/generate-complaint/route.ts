import { NextRequest, NextResponse } from "next/server";
import { buildRawCopyText } from "@/lib/complaintText";
import {
  formatEvidenceTimestamp,
  guessProfileUrl,
  sha256Hex,
} from "@/lib/evidence";
import {
  AiUnavailableError,
  analyzeScreenshotsWithVision,
} from "@/lib/gemini";
import {
  isNoCriminalFinding,
  NO_OFFENSE_USER_MESSAGE,
} from "@/lib/legalAssessment";
import { buildComplaintPdf, pdfBufferToDataUrl } from "@/lib/pdf";
import {
  GenerateComplaintErrorResponse,
  GenerateComplaintSuccessResponse,
  VisionAnalysis,
} from "@/lib/types";
import { ValidationError, validateGenerateRequest } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(
  status: number,
  error: string,
  code: GenerateComplaintErrorResponse["code"],
  assessment?: GenerateComplaintErrorResponse["assessment"]
) {
  const body: GenerateComplaintErrorResponse = {
    success: false,
    error,
    code,
    ...(assessment ? { assessment } : {}),
  };
  return NextResponse.json(body, { status });
}

function mergeAccusedIds(
  analysis: VisionAnalysis,
  platform: Parameters<typeof guessProfileUrl>[0],
  profileUrl?: string,
  accountId?: string
): VisionAnalysis {
  const resolvedProfile =
    profileUrl ||
    analysis.profileUrl ||
    guessProfileUrl(platform, analysis.accusedHandle);

  return {
    ...analysis,
    profileUrl: resolvedProfile,
    accountId: accountId || analysis.accountId,
  };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const validated = await validateGenerateRequest(formData);

    let analysis: VisionAnalysis;
    try {
      analysis = await analyzeScreenshotsWithVision({
        screenshots: validated.screenshots,
        userContext: validated.userContext,
      });
    } catch (error) {
      if (error instanceof AiUnavailableError) {
        console.error("[generate-complaint] AI_UNAVAILABLE:", error.message);
        const detail =
          process.env.NODE_ENV === "development"
            ? `KI-Analyse fehlgeschlagen: ${error.message}`
            : "KI-Analyse derzeit nicht erreichbar. Bitte erneut versuchen.";
        return errorResponse(503, detail, "AI_UNAVAILABLE");
      }
      throw error;
    }

    analysis = mergeAccusedIds(
      analysis,
      validated.platform,
      validated.profileUrl,
      validated.accountId
    );

    if (isNoCriminalFinding(analysis.legalCategorization)) {
      return errorResponse(422, NO_OFFENSE_USER_MESSAGE, "NO_OFFENSE", {
        accusedHandle: analysis.accusedHandle,
        extractedText: analysis.extractedText,
        legalCategorization: analysis.legalCategorization,
        incidentDescription: analysis.incidentDescription,
      });
    }

    const screenshotHashes = validated.screenshots.map((s) =>
      sha256Hex(s.buffer)
    );
    const capturedAtLabel = formatEvidenceTimestamp();

    const rawCopyText = buildRawCopyText({
      complainant: validated.complainant,
      platform: validated.platform,
      sourceUrl: validated.sourceUrl,
      incidentDate: validated.incidentDate,
      analysis,
      userContext: validated.userContext,
      screenshotCount: validated.screenshots.length,
      screenshotHashes,
      capturedAtLabel,
    });

    const pdfBuffer = await buildComplaintPdf({
      complainant: validated.complainant,
      platform: validated.platform,
      sourceUrl: validated.sourceUrl,
      incidentDate: validated.incidentDate,
      analysis,
      screenshots: validated.screenshots,
      userContext: validated.userContext,
      screenshotHashes,
      capturedAtLabel,
    });

    const body: GenerateComplaintSuccessResponse = {
      success: true,
      data: {
        pdfBase64: pdfBufferToDataUrl(pdfBuffer),
        accusedHandle: analysis.accusedHandle,
        profileUrl: analysis.profileUrl,
        accountId: analysis.accountId,
        extractedText: analysis.extractedText,
        legalCategorization: analysis.legalCategorization,
        incidentDescription: analysis.incidentDescription,
        rawCopyText,
        screenshotHashes,
      },
    };

    return NextResponse.json(body, { status: 200 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return errorResponse(400, error.message, "VALIDATION_ERROR");
    }

    console.error("[generate-complaint] INTERNAL_ERROR:", error);
    return errorResponse(
      500,
      "Interner Fehler bei der Anzeigenerstellung.",
      "INTERNAL_ERROR"
    );
  }
}
