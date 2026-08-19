"use client";

import { useComplainantData } from "@/hooks/useComplainantData";
import {
  DEMO_SCENARIOS,
  DemoScenario,
  incidentDateHoursAgo,
} from "@/lib/demoScenarios";
import {
  ONLINE_FORM_ONELINER,
  resolveOnlineWacheFromPlzCode,
} from "@/lib/onlineWache";
import { resolvePlatformReport } from "@/lib/platformReports";
import {
  GenerateComplaintErrorResponse,
  GenerateComplaintNoOffenseAssessment,
  GenerateComplaintSuccessData,
  GenerateComplaintSuccessResponse,
  MAX_SCREENSHOTS,
  MAX_USER_CONTEXT_CHARS,
  PLATFORMS,
  Platform,
} from "@/lib/types";
import { createDemoScreenshotFile } from "@/utils/demoScreenshot";
import { buildComplaintEml, downloadBlob } from "@/utils/emailExport";
import {
  ImageHandlerError,
  prepareImageUpload,
} from "@/utils/imageHandler";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCopy,
  Download,
  ExternalLink,
  FileImage,
  FileText,
  FlaskConical,
  Info,
  Loader2,
  Lock,
  Mail,
  Pencil,
  Shield,
  Sparkles,
  Trash2,
  Upload,
  X,
  ZoomIn,
} from "lucide-react";
import { DragEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";

type CopiedKind = "full" | "oneliner" | null;

const PLATFORM_LABELS: Record<Platform, string> = {
  X: "X (Twitter)",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  TIKTOK: "TikTok",
  OTHER: "Sonstige",
};

const STEP_LABELS = [
  "Start",
  "Beweise",
  "Vorfall",
  "Absender",
  "Prüfen",
  "Ergebnis",
] as const;

type PreparedShot = {
  id: string;
  file: File;
  previewUrl: string;
  convertedFromHeic: boolean;
};

function defaultIncidentDate(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function downloadPdfFromDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function isAcceptedScreenshotFile(file: File): boolean {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  if (
    type === "image/png" ||
    type === "image/jpeg" ||
    type === "image/webp" ||
    type === "image/heic" ||
    type === "image/heif"
  ) {
    return true;
  }
  return (
    name.endsWith(".png") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".webp") ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  );
}

function looksIncompleteOcr(text: string): boolean {
  return /nicht vollständig gelesen|nicht vollständig beschrieben/i.test(text);
}

function newShotId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatIncidentDateDisplay(value: string): string {
  if (!value) return "—";
  const [datePart, timePart] = value.split("T");
  if (datePart && timePart) {
    const [year, month, day] = datePart.split("-");
    const [hour, minute] = timePart.split(":");
    if (year && month && day && hour !== undefined && minute !== undefined) {
      return `${day}.${month}.${year}, ${hour}:${minute} Uhr`;
    }
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return (
    d.toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }) + " Uhr"
  );
}

/** Internes Format YYYY-MM-DDTHH:mm → Eingabefeld DD.MM.YYYY, HH:mm */
function toGermanDateTimeField(value: string): string {
  if (!value) return "";
  const [datePart, timePart] = value.split("T");
  if (!datePart || !timePart) return "";
  const [year, month, day] = datePart.split("-");
  const [hour, minute] = timePart.split(":");
  if (!year || !month || !day || hour === undefined || minute === undefined) {
    return "";
  }
  return `${day}.${month}.${year}, ${hour}:${minute}`;
}

/** Eingabe DD.MM.YYYY, HH:mm (Komma optional) → YYYY-MM-DDTHH:mm */
function parseGermanDateTimeField(raw: string): string | null {
  const trimmed = raw.trim();
  const match = trimmed.match(
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})[,\s]+(\d{1,2}):(\d{2})$/
  );
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour > 23 ||
    minute > 59
  ) {
    return null;
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  const iso = `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;
  const probe = new Date(`${iso}:00`);
  if (Number.isNaN(probe.getTime())) return null;
  if (
    probe.getFullYear() !== year ||
    probe.getMonth() + 1 !== month ||
    probe.getDate() !== day
  ) {
    return null;
  }
  return iso;
}

function profileUrlInputWarning(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "Bitte eine URL mit https:// oder http:// angeben.";
    }
    return null;
  } catch {
    if (!/^https?:\/\//i.test(trimmed)) {
      return "Bitte eine vollständige URL angeben (z. B. https://instagram.com/nutzername) - nicht nur den Benutzernamen.";
    }
    return "Die eingegebene Profil-URL scheint ungültig zu sein.";
  }
}

function guessPlatformFromUrl(url: string): Platform | null {
  try {
    const host = new URL(url.trim()).hostname.toLowerCase();
    if (host.includes("instagram.")) return "INSTAGRAM";
    if (host.includes("facebook.") || host.includes("fb.")) return "FACEBOOK";
    if (host.includes("tiktok.")) return "TIKTOK";
    if (
      host === "x.com" ||
      host.endsWith(".x.com") ||
      host.includes("twitter.")
    ) {
      return "X";
    }
    return null;
  } catch {
    return null;
  }
}

type DemoPanelProps = {
  loadingDemoId: string | null;
  activeDemoId: string | null;
  disabled: boolean;
  onLoad: (scenario: DemoScenario) => void;
  onClearAll: () => void;
};

function DemoPanel({
  loadingDemoId,
  activeDemoId,
  disabled,
  onLoad,
  onClearAll,
}: DemoPanelProps) {
  return (
    <aside
      className="rounded-2xl border-2 border-dashed border-amber-500/70 bg-amber-50 px-3 py-4 lg:sticky lg:top-6"
      aria-labelledby="demo-heading"
    >
      <div className="space-y-3">
        <div className="flex items-start gap-2">
          <FlaskConical
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-800"
            aria-hidden
          />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-900">
              Nur Test - nicht Produktion
            </p>
            <h2
              id="demo-heading"
              className="font-display text-base font-semibold text-amber-950"
            >
              Demo-Szenarien
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-amber-900/90">
              Seitenleiste nur für Prototyp-Demos. Fiktive Daten, keine echten
              Vorfälle.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {DEMO_SCENARIOS.map((scenario) => {
            const loading = loadingDemoId === scenario.id;
            const active = activeDemoId === scenario.id;
            return (
              <button
                key={scenario.id}
                type="button"
                disabled={disabled}
                onClick={() => onLoad(scenario)}
                className={`rounded-xl border px-3 py-2.5 text-left transition disabled:opacity-60 ${
                  active
                    ? "border-amber-700 bg-amber-100"
                    : "border-amber-300/80 bg-white/70 hover:border-amber-600"
                }`}
              >
                <span className="flex items-center gap-2 font-display text-sm font-semibold text-amber-950">
                  {loading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  {scenario.title}
                </span>
                <span className="mt-0.5 block text-[11px] text-amber-900/80">
                  {scenario.blurb}
                </span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={onClearAll}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-amber-700/40 bg-white/80 px-3 py-2.5 text-sm font-semibold text-amber-950 transition hover:bg-amber-100 disabled:opacity-60"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          Alles löschen / Seite bereinigen
        </button>
      </div>
    </aside>
  );
}

export default function ComplaintForm() {
  const {
    complainant,
    updateField,
    replaceComplainant,
    persistLocally,
    setPersist,
    clearData,
  } = useComplainantData();

  const [step, setStep] = useState(0);
  const [maxReachedStep, setMaxReachedStep] = useState(0);
  const [platform, setPlatform] = useState<Platform | "">("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [profileUrl, setProfileUrl] = useState("");
  const [accountId, setAccountId] = useState("");
  const [incidentDate, setIncidentDate] = useState(defaultIncidentDate);
  const [incidentDateText, setIncidentDateText] = useState(() =>
    toGermanDateTimeField(defaultIncidentDate())
  );
  const [userContext, setUserContext] = useState("");
  const [shots, setShots] = useState<PreparedShot[]>([]);
  const [fileWarning, setFileWarning] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const [loadingDemoId, setLoadingDemoId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateComplaintSuccessData | null>(
    null
  );
  const [noOffense, setNoOffense] = useState<{
    message: string;
    assessment?: GenerateComplaintNoOffenseAssessment;
  } | null>(null);
  const [emailExportOpen, setEmailExportOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [copied, setCopied] = useState<CopiedKind>(null);
  const activeStepBtnRef = useRef<HTMLButtonElement>(null);
  const [activeDemoId, setActiveDemoId] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);
  const resultRef = useRef<HTMLElement>(null);
  const formColumnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      shots.forEach((s) => URL.revokeObjectURL(s.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revoke only on unmount
  }, []);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIndex(null);
      if (e.key === "ArrowRight" && lightboxIndex < shots.length - 1) {
        setLightboxIndex(lightboxIndex + 1);
      }
      if (e.key === "ArrowLeft" && lightboxIndex > 0) {
        setLightboxIndex(lightboxIndex - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [lightboxIndex, shots.length]);

  const incompleteBanner = useMemo(() => {
    if (!result) return false;
    return (
      looksIncompleteOcr(result.extractedText) ||
      looksIncompleteOcr(result.incidentDescription)
    );
  }, [result]);

  const anyHeicConverted = shots.some((s) => s.convertedFromHeic);

  const showResultStep = result !== null || step === 5;

  const onlineWache = useMemo(
    () => resolveOnlineWacheFromPlzCode(complainant.zip),
    [complainant.zip]
  );

  const platformReport = useMemo(
    () => resolvePlatformReport(platform),
    [platform]
  );

  const profileUrlWarning = useMemo(
    () => profileUrlInputWarning(profileUrl),
    [profileUrl]
  );

  /** KI-Metadaten aus einer bereits gelaufenen Analyse (Ergebnis / erneutes Bearbeiten) */
  useEffect(() => {
    if (!result) return;
    if (!profileUrl.trim() && result.profileUrl) {
      setProfileUrl(result.profileUrl);
    }
    if (!accountId.trim() && result.accountId) {
      setAccountId(result.accountId);
    }
    if (!platform && result.profileUrl) {
      const guessed = guessPlatformFromUrl(result.profileUrl);
      if (guessed) setPlatform(guessed);
    }
    // Nur bei neuem result anwenden - Felder nicht überschreiben, wenn Nutzer:in editiert
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional one-way sync from result
  }, [result]);

  useEffect(() => {
    activeStepBtnRef.current?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [step, showResultStep]);

  function goToStep(next: number) {
    setStep(next);
    setMaxReachedStep((prev) => Math.max(prev, next));
    formColumnRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function validateStep(fromStep: number): boolean {
    setAlert(null);
    setFileWarning(null);

    if (fromStep === 0) {
      return true;
    }

    if (fromStep === 1) {
      if (shots.length < 1) {
        setFileWarning("Bitte mindestens einen Screenshot hochladen.");
        return false;
      }
      return true;
    }

    if (fromStep === 2) {
      if (!platform) {
        setAlert("Bitte eine Plattform auswählen.");
        return false;
      }
      const parsed =
        parseGermanDateTimeField(incidentDateText) ||
        (incidentDate ? parseGermanDateTimeField(toGermanDateTimeField(incidentDate)) : null);
      if (!parsed) {
        setAlert(
          "Bitte eine gültige Tatzeit im Format TT.MM.JJJJ, HH:mm angeben."
        );
        return false;
      }
      setIncidentDateValue(parsed);
      return true;
    }

    if (fromStep === 3) {
      if (!complainant.fullName.trim()) {
        setAlert("Bitte den vollständigen Namen angeben.");
        return false;
      }
      if (!complainant.street.trim()) {
        setAlert("Bitte Straße und Hausnummer angeben.");
        return false;
      }
      if (!complainant.zip.trim() || !/^\d{5}$/.test(complainant.zip.trim())) {
        setAlert("Bitte eine gültige 5-stellige PLZ angeben.");
        return false;
      }
      if (!complainant.city.trim()) {
        setAlert("Bitte den Ort angeben.");
        return false;
      }
      if (!complainant.email.trim()) {
        setAlert("Bitte eine E-Mail-Adresse angeben.");
        return false;
      }
      if (
        complainant.addressDisclosure === "protected" &&
        !complainant.deliveryNote?.trim()
      ) {
        setAlert(
          "Bitte eine ladungsfähige Zustelladresse angeben (z. B. Anwalt, Verein, Postfach)."
        );
        return false;
      }
      return true;
    }

    return true;
  }

  function setIncidentDateValue(isoLocal: string) {
    setIncidentDate(isoLocal);
    setIncidentDateText(toGermanDateTimeField(isoLocal));
  }

  function handleIncidentDateTextChange(raw: string) {
    setIncidentDateText(raw);
    const parsed = parseGermanDateTimeField(raw);
    if (parsed) {
      setIncidentDate(parsed);
    }
  }

  function handleIncidentDateTextBlur() {
    const parsed = parseGermanDateTimeField(incidentDateText);
    if (parsed) {
      setIncidentDateValue(parsed);
      return;
    }
    // Ungültig: Anzeige wieder an letzten gültigen Wert anbinden
    setIncidentDateText(toGermanDateTimeField(incidentDate));
  }

  function handleNext() {
    if (!validateStep(step)) return;
    goToStep(step + 1);
  }

  function handleBack() {
    setAlert(null);
    setFileWarning(null);
    goToStep(Math.max(0, step - 1));
  }

  function clearShots() {
    setShots((prev) => {
      prev.forEach((s) => URL.revokeObjectURL(s.previewUrl));
      return [];
    });
  }

  function clearEntirePage() {
    clearShots();
    clearData();
    setPlatform("");
    setSourceUrl("");
    setProfileUrl("");
    setAccountId("");
    setIncidentDateValue(defaultIncidentDate());
    setUserContext("");
    setFileWarning(null);
    setAlert(null);
    setResult(null);
    setNoOffense(null);
    setEmailExportOpen(false);
    setDetailsOpen(false);
    setCopied(null);
    setActiveDemoId(null);
    setLoadingDemoId(null);
    setLightboxIndex(null);
    setIsDragging(false);
    dragDepthRef.current = 0;
    setStep(0);
    setMaxReachedStep(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function loadDemoScenario(scenario: DemoScenario) {
    setFileWarning(null);
    setAlert(null);
    setResult(null);
    setNoOffense(null);
    setLoadingDemoId(scenario.id);
    setConverting(true);

    try {
      clearShots();
      replaceComplainant(scenario.complainant);
      setPlatform(scenario.platform);
      setSourceUrl(scenario.sourceUrl);
      setProfileUrl(scenario.profileUrl);
      setAccountId(scenario.accountId ?? "");
      setIncidentDateValue(incidentDateHoursAgo(scenario.hoursAgo));
      setUserContext(scenario.userContext);

      const prepared: PreparedShot[] = [];
      for (let i = 0; i < scenario.screenshots.length; i++) {
        const shot = scenario.screenshots[i];
        const file = await createDemoScreenshotFile({
          ...shot,
          filename: `demo-${scenario.id}-${i + 1}.png`,
        });
        const ready = await prepareImageUpload(file);
        prepared.push({
          id: newShotId(),
          file: ready.file,
          previewUrl: ready.previewUrl,
          convertedFromHeic: ready.convertedFromHeic,
        });
      }
      setShots(prepared);
      setActiveDemoId(scenario.id);
      setStep(4);
      setMaxReachedStep(4);
    } catch {
      setFileWarning("Demo-Szenario konnte nicht geladen werden.");
      setActiveDemoId(null);
    } finally {
      setConverting(false);
      setLoadingDemoId(null);
    }
  }

  async function onFilesSelected(fileList: FileList | null) {
    setFileWarning(null);
    setAlert(null);
    setResult(null);
    setNoOffense(null);
    setActiveDemoId(null);
    setIsDragging(false);
    dragDepthRef.current = 0;

    if (!fileList || fileList.length === 0) {
      return;
    }

    const remaining = MAX_SCREENSHOTS - shots.length;
    if (remaining <= 0) {
      setFileWarning(`Maximal ${MAX_SCREENSHOTS} Screenshots erlaubt.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const all = Array.from(fileList);
    const accepted = all.filter(isAcceptedScreenshotFile);
    if (accepted.length === 0) {
      setFileWarning(
        "Nur PNG, JPEG, WEBP oder HEIC/HEIF werden unterstützt."
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const rejectedCount = all.length - accepted.length;
    const incoming = accepted.slice(0, remaining);
    const warnings: string[] = [];
    if (rejectedCount > 0) {
      warnings.push(
        `${rejectedCount} Datei(en) übersprungen (ungültiges Format).`
      );
    }
    if (accepted.length > remaining) {
      warnings.push(
        `Nur ${remaining} weitere Datei(en) hinzugefügt (Limit ${MAX_SCREENSHOTS}).`
      );
    }
    if (warnings.length > 0) {
      setFileWarning(warnings.join(" "));
    }

    setConverting(true);
    const added: PreparedShot[] = [];
    try {
      for (const file of incoming) {
        try {
          const prepared = await prepareImageUpload(file);
          added.push({
            id: newShotId(),
            file: prepared.file,
            previewUrl: prepared.previewUrl,
            convertedFromHeic: prepared.convertedFromHeic,
          });
        } catch (error) {
          const message =
            error instanceof ImageHandlerError
              ? error.message
              : "Datei konnte nicht verarbeitet werden.";
          setFileWarning(message);
        }
      }
      if (added.length > 0) {
        setShots((prev) => [...prev, ...added]);
      }
    } finally {
      setConverting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleDragEnter(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (converting || shots.length >= MAX_SCREENSHOTS) return;
    dragDepthRef.current += 1;
    if (event.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  }

  function handleDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (converting || shots.length >= MAX_SCREENSHOTS) return;
    event.dataTransfer.dropEffect = "copy";
  }

  function handleDragLeave(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDragging(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = 0;
    setIsDragging(false);
    if (converting || shots.length >= MAX_SCREENSHOTS) return;
    void onFilesSelected(event.dataTransfer.files);
  }

  function removeShot(id: string) {
    setShots((prev) => {
      const target = prev.find((s) => s.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((s) => s.id !== id);
    });
    setResult(null);
    setNoOffense(null);
    setActiveDemoId(null);
    setLightboxIndex(null);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setAlert(null);
    setCopied(null);

    for (const checkStep of [1, 2, 3] as const) {
      if (!validateStep(checkStep)) {
        goToStep(checkStep);
        return;
      }
    }

    setSubmitting(true);
    setNoOffense(null);
    setResult(null);
    try {
      const formData = new FormData();
      for (const shot of shots) {
        formData.append("screenshots", shot.file);
      }
      formData.append("platform", platform);
      formData.append("incidentDate", incidentDate);
      if (sourceUrl.trim()) {
        formData.append("sourceUrl", sourceUrl.trim());
      }
      if (profileUrl.trim()) {
        formData.append("profileUrl", profileUrl.trim());
      }
      if (accountId.trim()) {
        formData.append("accountId", accountId.trim());
      }
      if (userContext.trim()) {
        formData.append("userContext", userContext.trim());
      }
      formData.append(
        "complainant",
        JSON.stringify({
          fullName: complainant.fullName.trim(),
          street: complainant.street.trim(),
          zip: complainant.zip.trim(),
          city: complainant.city.trim(),
          email: complainant.email.trim(),
          addressDisclosure: complainant.addressDisclosure ?? "full",
          ...(complainant.phone?.trim()
            ? { phone: complainant.phone.trim() }
            : {}),
          ...(complainant.deliveryNote?.trim()
            ? { deliveryNote: complainant.deliveryNote.trim() }
            : {}),
        })
      );

      const response = await fetch("/api/generate-complaint", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as
        | GenerateComplaintSuccessResponse
        | GenerateComplaintErrorResponse;

      if (!response.ok || !payload.success) {
        const err = payload as GenerateComplaintErrorResponse;
        setResult(null);

        if (err.code === "NO_OFFENSE") {
          setNoOffense({
            message: err.error,
            assessment: err.assessment,
          });
          setAlert(null);
          goToStep(4);
          window.setTimeout(() => {
            formColumnRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }, 50);
          return;
        }

        setNoOffense(null);
        if (response.status === 503 || err.code === "AI_UNAVAILABLE") {
          setAlert(
            err.error ||
              "KI-Analyse derzeit nicht erreichbar. Bitte erneut versuchen."
          );
        } else if (err.code === "VALIDATION_ERROR") {
          setAlert(
            err.error ||
              "Eingaben ungültig. Bitte Angaben prüfen und erneut versuchen."
          );
        } else {
          setAlert(err.error || "Anfrage fehlgeschlagen.");
        }
        return;
      }

      setNoOffense(null);
      setResult(payload.data);
      setEmailExportOpen(false);
      setDetailsOpen(false);
      setStep(5);
      setMaxReachedStep(5);
      window.setTimeout(() => {
        formColumnRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 50);
    } catch {
      setAlert("Netzwerkfehler. Bitte Verbindung prüfen und erneut versuchen.");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyText() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.rawCopyText);
      setCopied("full");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setAlert("Zwischenablage nicht verfügbar.");
    }
  }

  async function copyOneliner() {
    try {
      await navigator.clipboard.writeText(ONLINE_FORM_ONELINER);
      setCopied("oneliner");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setAlert("Zwischenablage nicht verfügbar.");
    }
  }

  function exportEmail() {
    if (!result) return;
    try {
      const eml = buildComplaintEml({
        fromName: complainant.fullName.trim() || "HassMelden",
        fromEmail: complainant.email.trim() || "anzeige@example.com",
        subject: `Strafanzeige - ${result.accusedHandle}`,
        bodyText: result.rawCopyText,
        pdfBase64DataUrl: result.pdfBase64,
      });
      downloadBlob(eml, "strafanzeige-HassMelden.eml");
    } catch {
      setAlert("E-Mail-Datei konnte nicht erzeugt werden.");
    }
  }

  function startOverKeepingData() {
    setResult(null);
    setNoOffense(null);
    setEmailExportOpen(false);
    setDetailsOpen(false);
    setCopied(null);
    setAlert(null);
    setStep(0);
    formColumnRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const demoPanel = (
    <DemoPanel
      loadingDemoId={loadingDemoId}
      activeDemoId={activeDemoId}
      disabled={converting || submitting}
      onLoad={loadDemoScenario}
      onClearAll={clearEntirePage}
    />
  );

  const stepperSteps = STEP_LABELS.length;

  return (
    <div className="mx-auto w-full max-w-6xl">
      {submitting && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ink)]/55 px-6 backdrop-blur-[2px]"
          role="alertdialog"
          aria-busy="true"
          aria-labelledby="waiting-title"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white px-6 py-8 text-center shadow-xl">
            <Loader2
              className="mx-auto h-10 w-10 animate-spin text-[var(--accent)]"
              aria-hidden
            />
            <p
              id="waiting-title"
              className="mt-4 font-display text-xl font-semibold text-[var(--ink)]"
            >
              Strafanzeige wird erstellt…
            </p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Screenshots werden analysiert und PDF sowie Anzeigentext
              generiert. Bitte kurz warten.
            </p>
          </div>
        </div>
      )}

      {lightboxIndex !== null && shots[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Screenshot ${lightboxIndex + 1} vergrößert`}
          onClick={() => setLightboxIndex(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/15 p-2 text-white hover:bg-white/25"
            aria-label="Schließen"
            onClick={() => setLightboxIndex(null)}
          >
            <X className="h-6 w-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={shots[lightboxIndex].previewUrl}
            alt={`Screenshot ${lightboxIndex + 1} groß`}
            className="max-h-[90vh] max-w-full rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-sm text-white">
            {lightboxIndex + 1} / {shots.length} · Klick außerhalb oder Esc zum
            Schließen
          </p>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-start">
        <div ref={formColumnRef} className="min-w-0 space-y-6 scroll-mt-4">
          <header className="space-y-2 sm:space-y-3">
            <h1 className="font-display text-2xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-[var(--ink)]">
              Strafanzeige aus Screenshot
            </h1>
            <p className="max-w-2xl text-[var(--muted)] text-sm sm:text-base lg:text-lg leading-relaxed">
              In wenigen Schritten erstellst du aus Screenshots eine
              rechtssichere Strafanzeige. Alle Daten werden ausschließlich lokal
              in deinem Browser verarbeitet.
            </p>
          </header>

          <nav
            className="sticky top-0 z-20 -mx-1 overflow-x-auto bg-[var(--bg)]/95 px-1 py-3 backdrop-blur-sm"
            aria-label="Formularschritte"
          >
            <ol className="flex min-w-max items-center gap-2">
              {STEP_LABELS.slice(0, stepperSteps).map((label, index) => {
                const isResultStep = index === 5;
                const current =
                  step === index || (isResultStep && !!result && step === 5);
                const completed =
                  (!current && index < step) ||
                  (!current && index < maxReachedStep);
                const clickable =
                  index <= maxReachedStep &&
                  index !== step &&
                  !(isResultStep && !result);
                return (
                  <li key={label} className="flex items-center gap-2">
                    {index > 0 && (
                      <span
                        className="hidden h-px w-3 bg-[var(--line)] sm:block"
                        aria-hidden
                      />
                    )}
                    <button
                      type="button"
                      ref={current ? activeStepBtnRef : undefined}
                      disabled={!clickable}
                      onClick={() => {
                        if (!clickable) return;
                        setAlert(null);
                        setFileWarning(null);
                        goToStep(index);
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${
                        current
                          ? "bg-[var(--accent)] text-white"
                          : completed || index <= maxReachedStep
                            ? "bg-[var(--surface)] text-[var(--ink)] ring-1 ring-[var(--line)] hover:ring-[var(--accent)] disabled:hover:ring-[var(--line)]"
                            : "bg-[var(--surface)]/60 text-[var(--muted)] ring-1 ring-[var(--line)]/60"
                      } disabled:cursor-default`}
                      aria-current={current ? "step" : undefined}
                    >
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                          current
                            ? "bg-white/20 text-white"
                            : "bg-[var(--ink)]/8 text-[var(--ink)]"
                        }`}
                      >
                        {index + 1}
                      </span>
                      {label}
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          <form onSubmit={onSubmit} noValidate className="space-y-6">
            {step === 0 && (
              <section
                className="space-y-5 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-6"
                aria-labelledby="intro-heading"
              >
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                    Bevor es losgeht
                  </p>
                  <h2
                    id="intro-heading"
                    className="font-display text-xl font-semibold text-[var(--ink)] sm:text-2xl"
                  >
                    Was HassMelden für dich macht
                  </h2>
                  <p className="max-w-2xl text-sm leading-relaxed text-[var(--muted)] sm:text-base">
                    HassMelden hilft dir, aus Screenshots von Online-Hass eine
                    fertige{" "}
                    <strong className="font-semibold text-[var(--ink)]">
                      Strafanzeige &amp; Strafantrag
                    </strong>{" "}
                    zu erstellen - als PDF, Kopiertext und E-Mail-Datei. Du
                    prüfst alles selbst und reichst ein, wenn du bereit bist.
                  </p>
                </div>

                <div className="space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                    In folgenden 3 Schritten zur Anzeige
                  </p>
                  <ul className="grid gap-3 sm:grid-cols-3">
                    <li className="rounded-xl bg-white/70 p-4 ring-1 ring-[var(--line)]">
                      <Upload
                        className="mb-2 h-5 w-5 text-[var(--accent)]"
                        aria-hidden
                      />
                      <p className="font-display text-sm font-semibold text-[var(--ink)]">
                        1. Beweise
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
                        Bis zu {MAX_SCREENSHOTS} Screenshots hochladen (z. B.
                        Chat- oder Kommentarverlauf).
                      </p>
                    </li>
                    <li className="rounded-xl bg-white/70 p-4 ring-1 ring-[var(--line)]">
                      <FileText
                        className="mb-2 h-5 w-5 text-[var(--accent)]"
                        aria-hidden
                      />
                      <p className="font-display text-sm font-semibold text-[var(--ink)]">
                        2. Vorfall &amp; Absender
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
                        Plattform, Tatzeit sowie deine Kontaktdaten angeben
                        (inklusive Option für Adressschutz).
                      </p>
                    </li>
                    <li className="rounded-xl bg-white/70 p-4 ring-1 ring-[var(--line)]">
                      <Shield
                        className="mb-2 h-5 w-5 text-[var(--accent)]"
                        aria-hidden
                      />
                      <p className="font-display text-sm font-semibold text-[var(--ink)]">
                        3. Ergebnis
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
                        Die KI analysiert die Beweise. Du prüfst den Entwurf und
                        lädst PDF, Text oder E-Mail herunter.
                      </p>
                    </li>
                  </ul>
                </div>

                <div className="flex gap-3 rounded-xl bg-[var(--ink)]/[0.04] px-4 py-3 ring-1 ring-[var(--line)]">
                  <Lock
                    className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]"
                    aria-hidden
                  />
                  <p className="text-xs leading-relaxed text-[var(--muted)] sm:text-sm">
                    <span className="font-semibold text-[var(--ink)]">
                      Keine Speicherung auf dem Server.
                    </span>{" "}
                    Deine Screenshots und Angaben werden nur für die Erstellung
                    verarbeitet - HassMelden speichert sie nicht und versendet
                    nichts an Behörden.
                  </p>
                </div>

                <p className="text-[11px] leading-relaxed text-[var(--muted)]/80">
                  Kein Ersatz für Rechtsberatung. Du bleibst verantwortlich für
                  Inhalt und Einreichung der Anzeige.
                </p>
              </section>
            )}

            {step === 1 && (
              <section
                className="space-y-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-6"
                aria-labelledby="upload-heading"
              >
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <h2
                    id="upload-heading"
                    className="font-display text-xl font-semibold text-[var(--ink)]"
                  >
                    Beweise
                  </h2>
                  <span className="text-sm text-[var(--muted)]">
                    {shots.length}/{MAX_SCREENSHOTS}
                  </span>
                </div>

                {shots.length > 0 && (
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {shots.map((shot, index) => (
                      <li
                        key={shot.id}
                        className="relative overflow-hidden rounded-xl border border-[var(--line)] bg-white/70"
                      >
                        <button
                          type="button"
                          className="group block w-full text-left"
                          onClick={() => setLightboxIndex(index)}
                          aria-label={`Screenshot ${index + 1} vergrößern`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={shot.previewUrl}
                            alt={`Screenshot ${index + 1}`}
                            className="h-36 w-full object-cover transition group-hover:opacity-90"
                          />
                          <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/25 group-hover:opacity-100">
                            <ZoomIn className="h-7 w-7 text-white drop-shadow" />
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeShot(shot.id)}
                          className="absolute right-2 top-2 z-10 rounded-full bg-[var(--ink)]/85 p-1 text-white"
                          aria-label={`Screenshot ${index + 1} entfernen`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <span className="pointer-events-none absolute bottom-2 left-2 rounded bg-[var(--ink)]/80 px-2 py-0.5 text-xs text-white">
                          {index + 1}
                          {shot.convertedFromHeic ? " · HEIC→JPEG" : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {shots.length < MAX_SCREENSHOTS && (
                  <label
                    htmlFor="screenshots"
                    onDragEnter={handleDragEnter}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`group relative flex min-h-[160px] cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border-2 border-dashed px-6 py-8 text-center transition ${
                      isDragging
                        ? "scale-[1.01] border-teal-600 bg-teal-50/50"
                        : "border-[var(--line)] bg-white/60 hover:border-[var(--accent)]"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      id="screenshots"
                      type="file"
                      multiple
                      accept="image/png,image/jpeg,image/webp,image/heic,image/heif,.heic,.heif"
                      className="sr-only"
                      onChange={(e) => onFilesSelected(e.target.files)}
                    />
                    <Upload
                      className={`h-8 w-8 text-[var(--accent)] transition ${
                        isDragging ? "scale-110" : ""
                      }`}
                      aria-hidden
                    />
                    <span
                      className={`font-medium text-[var(--ink)] transition ${
                        isDragging ? "scale-105" : ""
                      }`}
                    >
                      {isDragging
                        ? "Screenshots hier loslassen"
                        : shots.length === 0
                          ? "Screenshots wählen oder hierher ziehen"
                          : "Weitere Screenshots hinzufügen oder hierher ziehen"}
                    </span>
                    <span className="text-sm text-[var(--muted)]">
                      Chat-/Kommentarverlauf als Bildfolge - PNG, JPEG, WEBP, HEIC
                      - je max. 10 MB
                    </span>
                    {(converting || anyHeicConverted) && (
                      <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--ink)] px-3 py-1 text-xs text-white">
                        {converting ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Wird verarbeitet…
                          </>
                        ) : (
                          <>
                            <FileImage className="h-3.5 w-3.5" />
                            HEIC → JPEG
                          </>
                        )}
                      </span>
                    )}
                  </label>
                )}

                {fileWarning && (
                  <p
                    role="status"
                    className="inline-flex items-center gap-2 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-950"
                  >
                    <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                    {fileWarning}
                  </p>
                )}
              </section>
            )}

            {step === 2 && (
              <section
                className="space-y-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-6"
                aria-labelledby="meta-heading"
              >
                <h2
                  id="meta-heading"
                  className="font-display text-xl font-semibold text-[var(--ink)]"
                >
                  Vorfall
                </h2>

                {result && (result.profileUrl || result.accountId) && (
                  <p
                    role="status"
                    className="rounded-lg bg-teal-50 px-3 py-2 text-xs text-teal-950 ring-1 ring-teal-600/20"
                  >
                    Felder wurden soweit möglich aus der KI-Analyse
                    vorausgefüllt - bitte prüfen und bei Bedarf anpassen.
                  </p>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-1.5 sm:col-span-1">
                    <span className="text-sm font-medium text-[var(--ink)]">
                      Plattform <span className="text-rose-700">*</span>
                    </span>
                    <select
                      value={platform}
                      onChange={(e) =>
                        setPlatform((e.target.value || "") as Platform | "")
                      }
                      className="field"
                    >
                      <option value="" disabled>
                        Bitte wählen
                      </option>
                      {PLATFORMS.map((p) => (
                        <option key={p} value={p}>
                          {PLATFORM_LABELS[p]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="block space-y-1.5 sm:col-span-1">
                    <label
                      htmlFor="incident-date"
                      className="text-sm font-medium text-[var(--ink)]"
                    >
                      Tatzeit <span className="text-rose-700">*</span>
                    </label>
                    <input
                      id="incident-date"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="TT.MM.JJJJ, HH:mm"
                      value={incidentDateText}
                      onChange={(e) =>
                        handleIncidentDateTextChange(e.target.value)
                      }
                      onBlur={handleIncidentDateTextBlur}
                      className="field"
                      title="Datum und Uhrzeit im Format TT.MM.JJJJ, HH:mm (24 Stunden)"
                      aria-describedby="incident-date-hint"
                    />
                    <p
                      id="incident-date-hint"
                      className="text-[11px] leading-relaxed text-[var(--muted)]"
                    >
                      Ungefährer Zeitpunkt reicht aus, falls nicht exakt bekannt.
                    </p>
                  </div>
                  <label className="block space-y-1.5 sm:col-span-2">
                    <span className="text-sm font-medium text-[var(--ink)]">
                      Quellen-URL (Post/Kommentar){" "}
                      <span className="font-normal text-[var(--muted)]">
                        (optional)
                      </span>
                    </span>
                    <input
                      type="url"
                      inputMode="url"
                      placeholder="https://"
                      value={sourceUrl}
                      onChange={(e) => setSourceUrl(e.target.value)}
                      className="field"
                    />
                  </label>
                  <div className="block space-y-1.5 sm:col-span-2">
                    <label
                      htmlFor="profile-url"
                      className="text-sm font-medium text-[var(--ink)]"
                    >
                      Profil-URL der beschuldigten Person{" "}
                      <span className="font-normal text-[var(--muted)]">
                        (empfohlen)
                      </span>
                    </label>
                    <input
                      id="profile-url"
                      type="url"
                      inputMode="url"
                      placeholder="https://instagram.com/…"
                      value={profileUrl}
                      onChange={(e) => {
                        const next = e.target.value;
                        setProfileUrl(next);
                        if (!platform) {
                          const guessed = guessPlatformFromUrl(next);
                          if (guessed) setPlatform(guessed);
                        }
                      }}
                      className={`field ${
                        profileUrlWarning
                          ? "border-amber-500 focus:border-amber-600 focus:ring-amber-600/20"
                          : ""
                      }`}
                      aria-invalid={profileUrlWarning ? true : undefined}
                      aria-describedby={
                        profileUrlWarning ? "profile-url-warning" : undefined
                      }
                    />
                    {profileUrlWarning && (
                      <p
                        id="profile-url-warning"
                        role="status"
                        className="inline-flex items-start gap-1.5 text-xs text-amber-800"
                      >
                        <AlertTriangle
                          className="mt-0.5 h-3.5 w-3.5 shrink-0"
                          aria-hidden
                        />
                        {profileUrlWarning}
                      </p>
                    )}
                  </div>
                  <div className="block space-y-1.5 sm:col-span-2">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <label
                        htmlFor="account-id"
                        className="text-sm font-medium text-[var(--ink)]"
                      >
                        Interne Account-ID{" "}
                        <span className="font-normal text-[var(--muted)]">
                          (optional)
                        </span>
                      </label>
                      <details className="relative">
                        <summary className="cursor-pointer list-none text-xs font-medium text-[var(--accent)] underline decoration-[var(--accent)]/40 underline-offset-2 marker:content-none [&::-webkit-details-marker]:hidden">
                          (Was ist das?)
                        </summary>
                        <p className="mt-1.5 max-w-md rounded-lg bg-[var(--ink)]/[0.04] px-3 py-2 text-xs leading-relaxed text-[var(--muted)] ring-1 ring-[var(--line)]">
                          Eine unveränderliche ID der Plattform (z. B. User-ID).
                          Wenn du sie nicht weißt, lass das Feld einfach leer.
                        </p>
                      </details>
                    </div>
                    <input
                      id="account-id"
                      type="text"
                      placeholder="Unveränderliche Plattform-ID, falls bekannt"
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      className="field"
                      title="Eine unveränderliche ID der Plattform (z. B. User-ID). Wenn du sie nicht weißt, lass das Feld einfach leer."
                    />
                  </div>
                  <label className="block space-y-1.5 sm:col-span-2">
                    <span className="text-sm font-medium text-[var(--ink)]">
                      Eigener Kontext / Verlauf{" "}
                      <span className="font-normal text-[var(--muted)]">
                        (optional)
                      </span>
                    </span>
                    <textarea
                      className="field min-h-[120px] resize-y"
                      maxLength={MAX_USER_CONTEXT_CHARS}
                      placeholder="z. B. was vorher passiert ist, wer beteiligt war, weiterer Kommentarverlauf …"
                      value={userContext}
                      onChange={(e) => setUserContext(e.target.value)}
                    />
                    <span className="block text-right text-xs text-[var(--muted)]">
                      {userContext.length}/{MAX_USER_CONTEXT_CHARS}
                    </span>
                  </label>
                </div>
              </section>
            )}

            {step === 3 && (
              <section
                className="space-y-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-6"
                aria-labelledby="sender-heading"
              >
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <h2
                    id="sender-heading"
                    className="font-display text-xl font-semibold text-[var(--ink)]"
                  >
                    Absender
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        !window.confirm(
                          "Gespeicherte Absenderdaten wirklich löschen?"
                        )
                      ) {
                        return;
                      }
                      clearData();
                    }}
                    className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] transition hover:text-[var(--ink)]"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                    Daten löschen
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-1.5 sm:col-span-2">
                    <span className="text-sm font-medium">
                      Vollständiger Name <span className="text-rose-700">*</span>
                    </span>
                    <input
                      className="field"
                      autoComplete="name"
                      value={complainant.fullName}
                      onChange={(e) => updateField("fullName", e.target.value)}
                    />
                  </label>
                  <label className="block space-y-1.5 sm:col-span-2">
                    <span className="text-sm font-medium">
                      Straße und Hausnummer{" "}
                      <span className="text-rose-700">*</span>
                    </span>
                    <input
                      className="field"
                      autoComplete="street-address"
                      value={complainant.street}
                      onChange={(e) => updateField("street", e.target.value)}
                    />
                  </label>
                  <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 sm:col-span-2">
                    <label className="block space-y-1.5">
                      <span className="text-sm font-medium">
                        PLZ <span className="text-rose-700">*</span>
                      </span>
                      <input
                        className="field w-full"
                        inputMode="numeric"
                        autoComplete="postal-code"
                        maxLength={5}
                        pattern="\d{5}"
                        placeholder="80331"
                        value={complainant.zip}
                        onChange={(e) =>
                          updateField(
                            "zip",
                            e.target.value.replace(/\D/g, "").slice(0, 5)
                          )
                        }
                      />
                    </label>
                    <label className="block space-y-1.5">
                      <span className="text-sm font-medium">
                        Ort <span className="text-rose-700">*</span>
                      </span>
                      <input
                        className="field"
                        autoComplete="address-level2"
                        placeholder="München"
                        value={complainant.city}
                        onChange={(e) => updateField("city", e.target.value)}
                      />
                    </label>
                  </div>
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium">
                      E-Mail <span className="text-rose-700">*</span>
                    </span>
                    <input
                      type="email"
                      className="field"
                      autoComplete="email"
                      value={complainant.email}
                      onChange={(e) => updateField("email", e.target.value)}
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium">
                      Telefon{" "}
                      <span className="font-normal text-[var(--muted)]">
                        (optional)
                      </span>
                    </span>
                    <input
                      type="tel"
                      className="field"
                      autoComplete="tel"
                      value={complainant.phone ?? ""}
                      onChange={(e) => updateField("phone", e.target.value)}
                    />
                  </label>
                </div>

                <fieldset className="space-y-3 rounded-xl border border-[var(--line)] bg-white/50 px-4 py-4">
                  <legend className="px-1 text-sm font-semibold text-[var(--ink)]">
                    Adressschutz
                  </legend>
                  <p className="text-sm text-[var(--muted)]">
                    Bei Antragsdelikten braucht die Behörde eine ladungsfähige
                    Anschrift - die muss nicht deine Privatadresse sein. Über
                    Akteneinsicht könnte der Beschuldigte sonst deine Adresse sehen.
                  </p>
                  <label className="flex items-start gap-3 text-sm">
                    <input
                      type="radio"
                      name="addressDisclosure"
                      className="mt-1 accent-[var(--accent)]"
                      checked={(complainant.addressDisclosure ?? "full") === "full"}
                      onChange={() => updateField("addressDisclosure", "full")}
                    />
                    <span>Privatadresse im Dokument ausweisen</span>
                  </label>
                  <label className="flex items-start gap-3 text-sm">
                    <input
                      type="radio"
                      name="addressDisclosure"
                      className="mt-1 accent-[var(--accent)]"
                      checked={complainant.addressDisclosure === "protected"}
                      onChange={() => updateField("addressDisclosure", "protected")}
                    />
                    <span>
                      Geschützt: Zustellung über Anwalt / Verein / Postfach /
                      Zeugenschutz
                    </span>
                  </label>
                  {complainant.addressDisclosure === "protected" && (
                    <div className="space-y-2 rounded-xl border border-emerald-500/40 bg-emerald-50/20 px-3 py-3">
                      <p className="inline-flex items-start gap-2 text-xs leading-relaxed text-emerald-900 sm:text-sm">
                        <Shield
                          className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"
                          aria-hidden
                        />
                        Diese Anschrift erscheint auf der offiziellen Anzeige
                        statt deiner Privatadresse.
                      </p>
                      <label className="block space-y-1.5">
                        <span className="text-sm font-medium">
                          Ladungsfähige Zustelladresse{" "}
                          <span className="text-rose-700">*</span>
                        </span>
                        <textarea
                          className="field min-h-[88px] resize-y border-emerald-500/30 bg-white/80"
                          placeholder="z. B. Zustellung erbeten über Rechtsanwältin …, Kanzlei …, PLZ Ort"
                          value={complainant.deliveryNote ?? ""}
                          onChange={(e) =>
                            updateField("deliveryNote", e.target.value)
                          }
                        />
                      </label>
                    </div>
                  )}
                </fieldset>

                <label className="flex items-start gap-3 text-sm text-[var(--ink)]">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-[var(--accent)]"
                    checked={persistLocally}
                    onChange={(e) => setPersist(e.target.checked)}
                  />
                  <span>
                    Meine Absenderdaten lokal im Browser für nächste Mal speichern
                  </span>
                </label>
              </section>
            )}

            {step === 4 && (
              <section
                className="space-y-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-6"
                aria-labelledby="review-heading"
              >
                <div>
                  <h2
                    id="review-heading"
                    className="font-display text-xl font-semibold text-[var(--ink)]"
                  >
                    Prüfen
                  </h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Kurzüberblick - mit „Bearbeiten“ springst du direkt zum
                    jeweiligen Abschnitt.
                  </p>
                </div>

                {/* 1. Beweise */}
                <div className="space-y-3 rounded-xl border border-[var(--line)] bg-white/70 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-display text-sm font-semibold text-[var(--ink)]">
                      1. Beweise
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setAlert(null);
                        goToStep(1);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)] transition hover:text-[var(--accent-strong)]"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                      Bearbeiten
                    </button>
                  </div>
                  <ul className="flex flex-wrap gap-2">
                    {shots.map((shot, index) => (
                      <li key={shot.id}>
                        <button
                          type="button"
                          onClick={() => setLightboxIndex(index)}
                          className="block overflow-hidden rounded-lg border border-[var(--line)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                          aria-label={`Screenshot ${index + 1} vergrößern`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={shot.previewUrl}
                            alt={`Screenshot ${index + 1}`}
                            className="h-12 w-12 object-cover"
                          />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-[var(--muted)]">
                    {shots.length} Datei{shots.length === 1 ? "" : "en"}
                    {anyHeicConverted ? " · inkl. HEIC→JPEG" : ""}
                  </p>
                </div>

                {/* 2. Vorfall */}
                <div className="space-y-3 rounded-xl border border-[var(--line)] bg-white/70 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-display text-sm font-semibold text-[var(--ink)]">
                      2. Vorfall
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setAlert(null);
                        goToStep(2);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)] transition hover:text-[var(--accent-strong)]"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                      Bearbeiten
                    </button>
                  </div>
                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-[var(--muted)]">Plattform</dt>
                      <dd className="font-medium text-[var(--ink)]">
                        {platform ? PLATFORM_LABELS[platform] : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[var(--muted)]">Tatzeit</dt>
                      <dd className="font-medium text-[var(--ink)]">
                        {formatIncidentDateDisplay(incidentDate)}
                      </dd>
                    </div>
                    {sourceUrl.trim() && (
                      <div className="sm:col-span-2">
                        <dt className="text-[var(--muted)]">Quellen-URL</dt>
                        <dd className="break-all font-medium text-[var(--ink)]">
                          {sourceUrl.trim()}
                        </dd>
                      </div>
                    )}
                    {profileUrl.trim() && (
                      <div className="sm:col-span-2">
                        <dt className="text-[var(--muted)]">Profil-URL</dt>
                        <dd className="break-all font-medium text-[var(--ink)]">
                          {profileUrl.trim()}
                        </dd>
                      </div>
                    )}
                    {accountId.trim() && (
                      <div className="sm:col-span-2">
                        <dt className="text-[var(--muted)]">Account-ID</dt>
                        <dd className="font-mono text-[var(--ink)]">
                          {accountId.trim()}
                        </dd>
                      </div>
                    )}
                    {userContext.trim() && (
                      <div className="sm:col-span-2">
                        <dt className="text-[var(--muted)]">Kontext</dt>
                        <dd className="whitespace-pre-wrap font-medium text-[var(--ink)]">
                          {userContext.trim()}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>

                {/* 3. Absender */}
                <div className="space-y-3 rounded-xl border border-[var(--line)] bg-white/70 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-display text-sm font-semibold text-[var(--ink)]">
                      3. Absender
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setAlert(null);
                        goToStep(3);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)] transition hover:text-[var(--accent-strong)]"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                      Bearbeiten
                    </button>
                  </div>
                  <div className="space-y-0.5 text-sm font-medium text-[var(--ink)]">
                    <div>{complainant.fullName.trim() || "—"}</div>
                    <div>{complainant.street.trim() || "—"}</div>
                    <div>
                      {[complainant.zip.trim(), complainant.city.trim()]
                        .filter(Boolean)
                        .join(" ") || "—"}
                    </div>
                    <div>{complainant.email.trim() || "—"}</div>
                    {complainant.phone?.trim() && (
                      <div>{complainant.phone.trim()}</div>
                    )}
                  </div>
                  {(complainant.addressDisclosure ?? "full") === "protected" ? (
                    <div className="space-y-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-600/25">
                        <Shield className="h-3.5 w-3.5" aria-hidden />
                        Geschützt (Postfach/Beratungsstelle)
                      </span>
                      {complainant.deliveryNote?.trim() && (
                        <p className="whitespace-pre-wrap text-sm text-[var(--ink)]">
                          {complainant.deliveryNote.trim()}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--muted)]">
                      Privatadresse im Dokument ausgewiesen
                    </p>
                  )}
                </div>

                {noOffense && (
                  <div
                    role="status"
                    className="space-y-3 rounded-xl border border-sky-300/70 bg-sky-50 px-4 py-4 text-sky-950"
                  >
                    <div className="flex items-start gap-2.5">
                      <Info
                        className="mt-0.5 h-5 w-5 shrink-0 text-sky-700"
                        aria-hidden
                      />
                      <div className="space-y-1">
                        <p className="font-display text-sm font-semibold">
                          Keine strafbaren Aussagen erkannt
                        </p>
                        <p className="text-sm leading-relaxed">
                          {noOffense.message}
                        </p>
                      </div>
                    </div>
                    {noOffense.assessment && (
                      <dl className="space-y-2 border-t border-sky-200/80 pt-3 text-sm">
                        <div>
                          <dt className="text-sky-800/80">KI-Einordnung</dt>
                          <dd className="font-medium">
                            {noOffense.assessment.legalCategorization}
                          </dd>
                        </div>
                        {noOffense.assessment.incidentDescription && (
                          <div>
                            <dt className="text-sky-800/80">Zusammenfassung</dt>
                            <dd className="leading-relaxed">
                              {noOffense.assessment.incidentDescription}
                            </dd>
                          </div>
                        )}
                      </dl>
                    )}
                    <p className="text-xs text-sky-900/70">
                      Es wurde kein PDF erzeugt. Nutze „Bearbeiten“, um Beweise
                      oder Angaben anzupassen, und starte die Prüfung erneut.
                    </p>
                  </div>
                )}

                {alert && (
                  <p
                    role="alert"
                    className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"
                  >
                    {alert}
                  </p>
                )}
              </section>
            )}

            {step < 4 && alert && (
              <p
                role="alert"
                className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"
              >
                {alert}
              </p>
            )}

            {step < 4 && (
              <div
                className={`flex flex-col-reverse gap-3 sm:flex-row sm:items-center ${
                  step === 0 ? "sm:justify-end" : "sm:justify-between"
                }`}
              >
                {step > 0 && (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--line)] bg-white/80 px-4 py-3 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--accent)]"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                    Zurück
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={converting}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--accent)] px-5 py-3.5 font-display text-base font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {step === 0 ? "Zu den Beweisen" : "Weiter"}
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            )}

            {step === 4 && (
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={handleBack}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--line)] bg-white/80 px-4 py-3 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--accent)]"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                  Zurück
                </button>
                <button
                  type="submit"
                  disabled={submitting || converting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3.5 font-display text-base font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  <Sparkles className="h-4 w-4" aria-hidden />
                  Strafanzeige jetzt generieren
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            )}
          </form>

          {step === 5 && result && (
            <div className="scroll-mt-6 space-y-4" ref={resultRef} tabIndex={-1}>
              <div
                className="flex items-center gap-2.5 rounded-xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-600/20"
                role="status"
              >
                <CheckCircle2
                  className="h-5 w-5 shrink-0 text-emerald-700"
                  aria-hidden
                />
                <h2
                  id="result-heading"
                  className="font-display text-base font-semibold text-[var(--ink)] sm:text-lg"
                >
                  Deine Strafanzeige ist bereit.
                </h2>
              </div>

              {incompleteBanner && (
                <p
                  role="status"
                  className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950"
                >
                  Text konnte nicht vollständig gelesen werden. Bitte im PDF
                  manuell prüfen.
                </p>
              )}

              <section
                className="rounded-2xl border border-[var(--line)] bg-white p-5 sm:p-6"
                aria-labelledby="result-heading"
              >
                {/* 1. PDF */}
                <div className="space-y-3 pb-5">
                  <h3 className="flex items-center gap-2.5 font-display text-sm font-semibold text-[var(--ink)] sm:text-base">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-900">
                      1
                    </span>
                    PDF-Strafanzeige sichern
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      downloadPdfFromDataUrl(
                        result.pdfBase64,
                        "strafanzeige-HassMelden.pdf"
                      )
                    }
                    className="inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-[var(--ink)] px-5 py-4 font-display text-base font-semibold text-white transition hover:opacity-90 sm:text-lg"
                  >
                    <Download className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
                    PDF-Strafanzeige herunterladen
                  </button>
                  <p className="text-sm leading-relaxed text-[var(--muted)]">
                    Lade das Dokument herunter - du musst es gleich im Formular
                    der Polizei als Anhang hochladen.
                  </p>
                </div>

                {/* 2. Copy texts */}
                <div className="space-y-4 border-t border-[var(--line)] py-5">
                  <div>
                    <h3 className="flex items-center gap-2.5 font-display text-sm font-semibold text-[var(--ink)] sm:text-base">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-900">
                        2
                      </span>
                      Texte kopieren
                    </h3>
                    <p className="mt-1.5 pl-9 text-sm text-[var(--muted)]">
                      Online-Wachen verlangen oft diese zwei Angaben:
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="copy-oneliner"
                      className="text-xs font-medium text-[var(--muted)]"
                    >
                      Kurze Schilderung
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={copyOneliner}
                        title="Kurze Schilderung kopieren"
                        className="absolute right-2 top-2 z-10 inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-white/95 px-2.5 py-1.5 text-xs font-semibold text-[var(--ink)] shadow-sm backdrop-blur-sm transition hover:border-[var(--accent)]"
                      >
                        {copied === "oneliner" ? (
                          "✅ Kopiert!"
                        ) : (
                          <>
                            <ClipboardCopy className="h-3.5 w-3.5" aria-hidden />
                            Kopieren
                          </>
                        )}
                      </button>
                      <textarea
                        id="copy-oneliner"
                        readOnly
                        rows={3}
                        value={ONLINE_FORM_ONELINER}
                        className="w-full resize-none overflow-y-auto rounded-xl border border-[var(--line)] bg-slate-50 px-3.5 py-2.5 pr-4 pt-10 font-mono text-sm leading-relaxed text-slate-700 outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-teal-700/20 [scrollbar-width:thin]"
                        onFocus={(e) => e.currentTarget.select()}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="copy-fulltext"
                      className="text-xs font-medium text-[var(--muted)]"
                    >
                      Vollständiger Sachverhalt
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={copyText}
                        title="Vollständigen Sachverhalt kopieren"
                        className="absolute right-2 top-2 z-10 inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-white/95 px-2.5 py-1.5 text-xs font-semibold text-[var(--ink)] shadow-sm backdrop-blur-sm transition hover:border-[var(--accent)]"
                      >
                        {copied === "full" ? (
                          "✅ Kopiert!"
                        ) : (
                          <>
                            <ClipboardCopy className="h-3.5 w-3.5" aria-hidden />
                            Kopieren
                          </>
                        )}
                      </button>
                      <textarea
                        id="copy-fulltext"
                        readOnly
                        rows={8}
                        value={result.rawCopyText}
                        className="min-h-[160px] max-h-[280px] w-full resize-none overflow-y-auto rounded-xl border border-[var(--line)] bg-slate-50 px-3.5 py-2.5 pr-4 pt-10 font-mono text-sm leading-relaxed text-slate-700 outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-teal-700/20 [scrollbar-width:thin]"
                        onFocus={(e) => e.currentTarget.select()}
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Police portal */}
                <div className="space-y-3 border-t border-[var(--line)] pt-5">
                  <h3 className="flex items-center gap-2.5 font-display text-sm font-semibold text-[var(--ink)] sm:text-base">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-900">
                      3
                    </span>
                    Zur Polizei weiterleiten
                  </h3>
                  <a
                    href={onlineWache.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={
                      onlineWache.entry
                        ? `Öffnet die Online-Wache ${onlineWache.entry.name}`
                        : "Öffnet das zentrale Online-Wache-Portal"
                    }
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[var(--accent)] bg-white px-5 py-3.5 font-display text-base font-semibold text-[var(--accent)] transition hover:bg-teal-50"
                  >
                    {onlineWache.entry
                      ? `Zur Online-Wache ${onlineWache.entry.name}`
                      : "Zur Online-Wache"}
                    <ExternalLink className="h-5 w-5 shrink-0" aria-hidden />
                  </a>
                  <p className="text-center text-xs leading-relaxed text-[var(--muted)]">
                    {onlineWache.entry
                      ? `Öffnet das offizielle Portal der Polizei ${onlineWache.entry.name} in einem neuen Tab`
                      : "Öffnet das offizielle Online-Wache-Portal der Polizei in einem neuen Tab - bitte Bundesland dort wählen"}
                  </p>
                </div>

                {/* 4. Platform report */}
                {platformReport && (
                  <div className="space-y-3 border-t border-[var(--line)] pt-5">
                    <h3 className="flex items-center gap-2.5 font-display text-sm font-semibold text-[var(--ink)] sm:text-base">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-900">
                        4
                      </span>
                      Bei der Plattform melden
                    </h3>
                    {platformReport.hasReportUrl && platformReport.url ? (
                      <>
                        <a
                          href={platformReport.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={`Öffnet den Meldeeinstieg von ${platformReport.label}`}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[var(--ink)] bg-white px-5 py-3.5 font-display text-base font-semibold text-[var(--ink)] transition hover:bg-slate-50"
                        >
                          Bei {platformReport.label} melden
                          <ExternalLink
                            className="h-5 w-5 shrink-0"
                            aria-hidden
                          />
                        </a>
                        {result.profileUrl && (
                          <a
                            href={result.profileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Öffnet das gemeldete Profil"
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--accent)]"
                          >
                            Profil öffnen
                            <ExternalLink
                              className="h-4 w-4 shrink-0"
                              aria-hidden
                            />
                          </a>
                        )}
                        <p className="text-center text-xs leading-relaxed text-[var(--muted)]">
                          {platformReport.note} HassMelden sendet nichts an die
                          Plattform.
                        </p>
                      </>
                    ) : (
                      <p className="rounded-xl border border-[var(--line)] bg-slate-50 px-4 py-3 text-sm leading-relaxed text-[var(--muted)]">
                        {platformReport.note}
                      </p>
                    )}
                  </div>
                )}
              </section>

              {/* Advanced - below main card */}
              <div className="space-y-2">
                <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-white/60">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-[var(--muted)]"
                    onClick={() => setEmailExportOpen((o) => !o)}
                    aria-expanded={emailExportOpen}
                  >
                    Als E-Mail (.eml) exportieren
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 transition ${
                        emailExportOpen ? "rotate-180" : ""
                      }`}
                      aria-hidden
                    />
                  </button>
                  {emailExportOpen && (
                    <div className="space-y-2 border-t border-[var(--line)] px-4 py-3">
                      <button
                        type="button"
                        onClick={exportEmail}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--accent)]"
                      >
                        <Mail className="h-4 w-4" aria-hidden />
                        .eml herunterladen
                      </button>
                      <p className="text-xs text-[var(--muted)]">
                        Öffnet sich im lokalen Mailprogramm (Text + PDF-Anhang).
                        HassMelden versendet nichts.
                      </p>
                    </div>
                  )}
                </div>

                <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-white/60">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-[var(--muted)]"
                    onClick={() => setDetailsOpen((o) => !o)}
                    aria-expanded={detailsOpen}
                  >
                    Zusammenfassung &amp; SHA-256 Hashes anzeigen
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 transition ${
                        detailsOpen ? "rotate-180" : ""
                      }`}
                      aria-hidden
                    />
                  </button>
                  {detailsOpen && (
                    <div className="space-y-4 border-t border-[var(--line)] px-4 py-3">
                      <dl className="grid gap-3 text-sm sm:grid-cols-2">
                        <div>
                          <dt className="text-[var(--muted)]">Beschuldigte:r</dt>
                          <dd className="font-medium text-[var(--ink)]">
                            {result.accusedHandle}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[var(--muted)]">Einordnung</dt>
                          <dd className="font-medium text-[var(--ink)]">
                            {result.legalCategorization}
                          </dd>
                        </div>
                        {result.profileUrl && (
                          <div className="sm:col-span-2">
                            <dt className="text-[var(--muted)]">Profil-URL</dt>
                            <dd className="break-all font-medium text-[var(--ink)]">
                              {result.profileUrl}
                            </dd>
                          </div>
                        )}
                        {result.accountId && (
                          <div>
                            <dt className="text-[var(--muted)]">Account-ID</dt>
                            <dd className="font-mono text-sm text-[var(--ink)]">
                              {result.accountId}
                            </dd>
                          </div>
                        )}
                        {result.screenshotHashes?.length > 0 && (
                          <div className="sm:col-span-2">
                            <dt className="text-[var(--muted)]">
                              SHA-256 der Screenshots
                            </dt>
                            <dd className="mt-1 space-y-1 font-mono text-xs text-[var(--ink)]">
                              {result.screenshotHashes.map((hash, i) => (
                                <div key={hash} className="break-all">
                                  #{i + 1}: {hash}
                                </div>
                              ))}
                            </dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={startOverKeepingData}
                className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] transition hover:text-[var(--ink)]"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
                Neue Anzeige / Angaben ändern
              </button>
            </div>
          )}
        </div>

        {/* Desktop: sticky side rail; Mobile: below main flow */}
        <div className="order-last lg:order-none">{demoPanel}</div>
      </div>
    </div>
  );
}
