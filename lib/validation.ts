import {
  AddressDisclosure,
  Complainant,
  ImageMimeType,
  MAX_FILE_BYTES,
  MAX_SCREENSHOTS,
  MAX_USER_CONTEXT_CHARS,
  PLATFORMS,
  Platform,
  ScreenshotAsset,
  ValidatedGenerateRequest,
} from "@/lib/types";
import {
  sanitizeDocumentField,
  sanitizeForAiPrompt,
  sanitizePlainText,
} from "@/lib/sanitize";

const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);
const INCIDENT_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseOptionalUrl(
  raw: FormDataEntryValue | null,
  fieldName: string
): string | undefined {
  if (raw === null || raw === undefined || raw === "") {
    return undefined;
  }
  if (typeof raw !== "string") {
    throw new ValidationError(`${fieldName} must be a string.`);
  }
  const cleaned = sanitizePlainText(raw, {
    maxLength: 2048,
    allowNewlines: false,
  });
  let url: URL;
  try {
    url = new URL(cleaned);
  } catch {
    throw new ValidationError(`${fieldName} must be a valid URL.`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ValidationError(`${fieldName} must use http:// or https://.`);
  }
  if (url.username || url.password) {
    throw new ValidationError(`${fieldName} must not contain credentials.`);
  }
  return url.toString();
}

function parseOptionalString(
  raw: FormDataEntryValue | null,
  fieldName: string,
  maxLen = 200
): string | undefined {
  if (raw === null || raw === undefined || raw === "") {
    return undefined;
  }
  if (typeof raw !== "string") {
    throw new ValidationError(`${fieldName} must be a string.`);
  }
  const trimmed = sanitizeDocumentField(raw, maxLen);
  if (!trimmed) return undefined;
  return trimmed;
}

function parseComplainant(raw: FormDataEntryValue | null): Complainant {
  if (typeof raw !== "string" || !raw.trim()) {
    throw new ValidationError("Absenderdaten fehlen oder sind ungültig.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ValidationError("Absenderdaten sind ungültig.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new ValidationError("Absenderdaten sind ungültig.");
  }

  const obj = parsed as Record<string, unknown>;
  const required = ["fullName", "street", "zip", "city", "email"] as const;

  for (const key of required) {
    if (!isNonEmptyString(obj[key])) {
      throw new ValidationError(
        "Bitte alle Pflichtfelder zum Absender ausfüllen (Name, Straße, PLZ, Ort, E-Mail)."
      );
    }
  }

  const zip = sanitizePlainText(obj.zip as string, {
    maxLength: 5,
    allowNewlines: false,
  });
  if (!/^\d{5}$/.test(zip)) {
    throw new ValidationError("Bitte eine gültige 5-stellige PLZ angeben.");
  }

  const disclosureRaw = obj.addressDisclosure;
  const addressDisclosure: AddressDisclosure =
    disclosureRaw === "protected" ? "protected" : "full";

  if (addressDisclosure === "protected" && !isNonEmptyString(obj.deliveryNote)) {
    throw new ValidationError(
      "Bei Adressschutz bitte eine ladungsfähige Zustelladresse angeben."
    );
  }

  const email = sanitizePlainText(obj.email as string, {
    maxLength: 254,
    allowNewlines: false,
  });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ValidationError("Bitte eine gültige E-Mail-Adresse angeben.");
  }

  const complainant: Complainant = {
    fullName: sanitizeDocumentField(obj.fullName as string, 200),
    street: sanitizeDocumentField(obj.street as string, 200),
    zip,
    city: sanitizeDocumentField(obj.city as string, 120),
    email,
    addressDisclosure,
  };

  if (!complainant.fullName || !complainant.street || !complainant.city) {
    throw new ValidationError("complainant fields contain invalid content.");
  }

  if (obj.phone !== undefined && obj.phone !== null && obj.phone !== "") {
    if (!isNonEmptyString(obj.phone)) {
      throw new ValidationError(
        "complainant.phone must be a string when provided."
      );
    }
    complainant.phone = sanitizeDocumentField(obj.phone, 40);
  }

  if (isNonEmptyString(obj.deliveryNote)) {
    complainant.deliveryNote = sanitizeDocumentField(obj.deliveryNote, 1000);
  }

  return complainant;
}

function parsePlatform(raw: FormDataEntryValue | null): Platform {
  if (typeof raw !== "string" || !PLATFORMS.includes(raw as Platform)) {
    throw new ValidationError(
      `Plattform ungültig. Erlaubt: ${PLATFORMS.join(", ")}.`
    );
  }
  return raw as Platform;
}

function parseIncidentDate(raw: FormDataEntryValue | null): string {
  if (typeof raw !== "string" || !INCIDENT_DATE_RE.test(raw)) {
    throw new ValidationError(
      "Tatzeit ungültig. Bitte Format TT.MM.JJJJ, HH:mm prüfen."
    );
  }
  return raw;
}

function parseUserContext(
  raw: FormDataEntryValue | null
): string | undefined {
  if (raw === null || raw === undefined || raw === "") {
    return undefined;
  }
  if (typeof raw !== "string") {
    throw new ValidationError("userContext must be a string.");
  }
  if (raw.length > MAX_USER_CONTEXT_CHARS * 2) {
    throw new ValidationError(
      `userContext must be at most ${MAX_USER_CONTEXT_CHARS} characters.`
    );
  }
  const sanitized = sanitizeForAiPrompt(raw, MAX_USER_CONTEXT_CHARS);
  if (!sanitized) {
    return undefined;
  }
  return sanitized;
}

async function parseScreenshotFile(
  raw: FormDataEntryValue
): Promise<ScreenshotAsset> {
  if (!(raw instanceof File)) {
    throw new ValidationError("screenshot must be a file.");
  }

  const mimeType = raw.type;
  if (!ALLOWED_MIME.has(mimeType)) {
    throw new ValidationError(
      "Jeder Screenshot muss PNG, JPEG oder WEBP sein (max. 10 MB)."
    );
  }

  if (raw.size > MAX_FILE_BYTES) {
    throw new ValidationError("Ein Screenshot ist größer als 10 MB.");
  }

  const arrayBuffer = await raw.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (buffer.byteLength > MAX_FILE_BYTES) {
    throw new ValidationError("Ein Screenshot ist größer als 10 MB.");
  }

  return {
    buffer,
    mimeType: mimeType as ImageMimeType,
  };
}

async function parseScreenshots(formData: FormData): Promise<ScreenshotAsset[]> {
  const multi = formData
    .getAll("screenshots")
    .filter((entry) => entry instanceof File && entry.size > 0);
  const single = formData.get("screenshot");
  const files: FormDataEntryValue[] =
    multi.length > 0
      ? multi
      : single instanceof File && single.size > 0
        ? [single]
        : [];

  if (files.length === 0) {
    throw new ValidationError(
      "Mindestens ein Screenshot ist erforderlich."
    );
  }
  if (files.length > MAX_SCREENSHOTS) {
    throw new ValidationError(
      `Maximal ${MAX_SCREENSHOTS} Screenshots erlaubt.`
    );
  }

  const screenshots: ScreenshotAsset[] = [];
  for (const file of files) {
    screenshots.push(await parseScreenshotFile(file));
  }
  return screenshots;
}

export async function validateGenerateRequest(
  formData: FormData
): Promise<ValidatedGenerateRequest> {
  const screenshots = await parseScreenshots(formData);
  const platform = parsePlatform(formData.get("platform"));
  const sourceUrl = parseOptionalUrl(formData.get("sourceUrl"), "sourceUrl");
  const profileUrl = parseOptionalUrl(formData.get("profileUrl"), "profileUrl");
  const accountId = parseOptionalString(formData.get("accountId"), "accountId");
  const incidentDate = parseIncidentDate(formData.get("incidentDate"));
  const complainant = parseComplainant(formData.get("complainant"));
  const userContext = parseUserContext(formData.get("userContext"));

  return {
    screenshots,
    platform,
    sourceUrl,
    profileUrl,
    accountId,
    incidentDate,
    complainant,
    userContext,
  };
}
