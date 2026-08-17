/** Minimal gültiges 1×1 PNG (für multipart / Validation). */
export const TINY_PNG_BUFFER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

export function makePngFile(
  name = "screenshot.png",
  buffer: Buffer = TINY_PNG_BUFFER
): File {
  return new File([buffer], name, { type: "image/png" });
}

export function baseComplainant(overrides: Record<string, unknown> = {}) {
  return {
    fullName: "Alex Muster",
    street: "Demostraße 12",
    zip: "10115",
    city: "Berlin",
    email: "alex.muster@example.com",
    addressDisclosure: "full",
    ...overrides,
  };
}

export function buildGenerateFormData(input?: {
  screenshots?: File[];
  platform?: string;
  incidentDate?: string;
  complainant?: Record<string, unknown>;
  sourceUrl?: string;
  profileUrl?: string;
  accountId?: string;
  userContext?: string;
  omitScreenshots?: boolean;
}): FormData {
  const form = new FormData();
  if (!input?.omitScreenshots) {
    const shots = input?.screenshots ?? [makePngFile()];
    for (const shot of shots) {
      form.append("screenshots", shot);
    }
  }
  form.append("platform", input?.platform ?? "X");
  form.append(
    "incidentDate",
    input?.incidentDate ?? "2026-08-12T12:00"
  );
  form.append(
    "complainant",
    JSON.stringify(baseComplainant(input?.complainant))
  );
  if (input?.sourceUrl) form.append("sourceUrl", input.sourceUrl);
  if (input?.profileUrl) form.append("profileUrl", input.profileUrl);
  if (input?.accountId) form.append("accountId", input.accountId);
  if (input?.userContext) form.append("userContext", input.userContext);
  return form;
}

export function offenseAnalysis(overrides: Record<string, unknown> = {}) {
  return {
    accusedHandle: "@demo_hetzer_x",
    profileUrl: "https://x.com/demo_hetzer_x",
    accountId: "demo-uid-10001",
    extractedText: "Leute wie du gehören nicht in den öffentlichen Raum.",
    legalCategorization: "Verdacht auf § 185 StGB (Beleidigung)",
    incidentDescription:
      "Queerfeindliche Beleidigung in einem öffentlichen Post.",
    ...overrides,
  };
}

export function noOffenseAnalysis(overrides: Record<string, unknown> = {}) {
  return {
    accusedHandle: "@demo_ally_x",
    profileUrl: "https://x.com/demo_ally_x",
    accountId: "demo-uid-90001",
    extractedText: "Danke fürs Teilen – du bist mutig. Solidarität!",
    legalCategorization:
      "Kein Anhaltspunkt für Beleidigung, Verhetzung oder Bedrohung (§§ 185, 192a, 130, 241 StGB) – inhaltlich nicht strafrechtlich relevant.",
    incidentDescription:
      "Unterstützungskommentar ohne herabwürdigenden oder bedrohenden Gehalt.",
    ...overrides,
  };
}
