/**
 * Dummy analytics + client-side filter helpers for the prototype dashboard.
 */

export type ReportCategory =
  | "queer_hate"
  | "political_insult"
  | "death_threat"
  | "violence"
  | "incitement"
  | "other";

export type ReportStatus = "success" | "failed" | "invalid";

export type ReportPlatform =
  | "X"
  | "INSTAGRAM"
  | "FACEBOOK"
  | "TIKTOK"
  | "OTHER";

export type ExportChannel = "pdf" | "clipboard" | "eml";

export type AiReviewOutcome =
  | "ai_confirmed"
  | "manually_corrected"
  | "pending_review"
  | "rejected_as_invalid";

export type PeriodFilter = "7d" | "30d" | "90d" | "12m";

export const CATEGORY_LABELS: Record<ReportCategory, string> = {
  queer_hate: "Queere Hassrede",
  political_insult: "Politische Beleidigung",
  death_threat: "Morddrohung",
  violence: "Gewaltaufruf / Gewalt",
  incitement: "Volksverhetzung / Aufstachelung",
  other: "Sonstige",
};

export const STATUS_LABELS: Record<ReportStatus, string> = {
  success: "Erfolgreich",
  failed: "Nicht erfolgreich",
  invalid: "Ungültig",
};

export const PLATFORM_LABELS: Record<ReportPlatform, string> = {
  X: "X",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  TIKTOK: "TikTok",
  OTHER: "Sonstige",
};

export const EXPORT_LABELS: Record<ExportChannel, string> = {
  pdf: "PDF-Download",
  clipboard: "Zwischenablage",
  eml: "E-Mail (.eml)",
};

export const AI_REVIEW_LABELS: Record<AiReviewOutcome, string> = {
  ai_confirmed: "KI bestätigt",
  manually_corrected: "Manuell korrigiert",
  pending_review: "Review ausstehend",
  rejected_as_invalid: "Als ungültig verworfen",
};

export const PERIOD_LABELS: Record<PeriodFilter, string> = {
  "7d": "7 Tage",
  "30d": "30 Tage",
  "90d": "90 Tage",
  "12m": "12 Monate",
};

export type ShareStat = { count: number; share: number };
export type CategoryStat = ShareStat & { category: ReportCategory };
export type PlatformStat = ShareStat & { platform: ReportPlatform };
export type StatusStat = ShareStat & { status: ReportStatus };
export type ExportStat = ShareStat & { channel: ExportChannel };
export type AiReviewStat = ShareStat & { outcome: AiReviewOutcome };
export type ScreenshotBucket = ShareStat & {
  bucket: "1" | "2" | "3" | "4" | "5";
  label: string;
};
export type ProcessingBucket = ShareStat & {
  bucket: string;
  label: string;
  avgSeconds: number;
};
export type RegionStat = ShareStat & {
  region: string;
  postalPrefix: string;
};

export type SeriesPoint = {
  key: string;
  label: string;
  total: number;
  success: number;
  failed: number;
  invalid: number;
};

export type PseudonymHandle = {
  pseudonym: string;
  reports: number;
  topCategory: ReportCategory;
  topPlatform: ReportPlatform;
};

export type RecentReport = {
  id: string;
  createdAt: string;
  platform: ReportPlatform;
  category: ReportCategory;
  status: ReportStatus;
  accusedHandle: string;
  accusedPseudonym: string;
  region: string;
  postalPrefix: string;
  screenshotCount: number;
  processingSeconds: number;
  exportChannel: ExportChannel | null;
  aiReview: AiReviewOutcome;
};

export type DashboardFilters = {
  period: PeriodFilter;
  platform: "ALL" | ReportPlatform;
  category: "ALL" | ReportCategory;
  status: "ALL" | ReportStatus;
};

export const DEFAULT_FILTERS: DashboardFilters = {
  period: "30d",
  platform: "ALL",
  category: "ALL",
  status: "ALL",
};

type RawDashboard = {
  generatedAt: string;
  basePeriodLabel: string;
  totals30d: {
    reports: number;
    screenshots: number;
    uniquePlatforms: number;
    avgProcessingSeconds: number;
    avgScreenshotsPerReport: number;
    uniquePseudonymHandles: number;
    exportsTotal: number;
  };
  byCategory: Array<{ category: ReportCategory; count: number }>;
  byPlatform: Array<{ platform: ReportPlatform; count: number }>;
  byStatus: Array<{ status: ReportStatus; count: number }>;
  byScreenshots: Array<{
    bucket: "1" | "2" | "3" | "4" | "5";
    label: string;
    count: number;
  }>;
  byProcessingTime: Array<{
    bucket: string;
    label: string;
    count: number;
    avgSeconds: number;
  }>;
  byRegion: Array<{ region: string; postalPrefix: string; count: number }>;
  byExport: Array<{ channel: ExportChannel; count: number }>;
  byAiReview: Array<{ outcome: AiReviewOutcome; count: number }>;
  daily: SeriesPoint[];
  weekly: SeriesPoint[];
  monthly: SeriesPoint[];
  topHandles: PseudonymHandle[];
  recent: RecentReport[];
};

const RAW: RawDashboard = {
  generatedAt: "2026-08-11T14:30:00+02:00",
  basePeriodLabel: "30-Tage-Basis (Demo)",
  totals30d: {
    reports: 184,
    screenshots: 312,
    uniquePlatforms: 5,
    avgProcessingSeconds: 7.4,
    avgScreenshotsPerReport: 1.7,
    uniquePseudonymHandles: 96,
    exportsTotal: 268,
  },
  byCategory: [
    { category: "queer_hate", count: 68 },
    { category: "political_insult", count: 41 },
    { category: "death_threat", count: 22 },
    { category: "violence", count: 19 },
    { category: "incitement", count: 18 },
    { category: "other", count: 16 },
  ],
  byPlatform: [
    { platform: "X", count: 61 },
    { platform: "INSTAGRAM", count: 48 },
    { platform: "FACEBOOK", count: 36 },
    { platform: "TIKTOK", count: 27 },
    { platform: "OTHER", count: 12 },
  ],
  byStatus: [
    { status: "success", count: 142 },
    { status: "failed", count: 27 },
    { status: "invalid", count: 15 },
  ],
  byScreenshots: [
    { bucket: "1", label: "1 Screenshot", count: 98 },
    { bucket: "2", label: "2 Screenshots", count: 52 },
    { bucket: "3", label: "3 Screenshots", count: 21 },
    { bucket: "4", label: "4 Screenshots", count: 9 },
    { bucket: "5", label: "5 Screenshots", count: 4 },
  ],
  byProcessingTime: [
    { bucket: "0-4", label: "0-4 s", count: 28, avgSeconds: 3.1 },
    { bucket: "4-7", label: "4-7 s", count: 71, avgSeconds: 5.6 },
    { bucket: "7-10", label: "7-10 s", count: 54, avgSeconds: 8.4 },
    { bucket: "10-15", label: "10-15 s", count: 22, avgSeconds: 12.1 },
    { bucket: "15+", label: "15 s+", count: 9, avgSeconds: 18.7 },
  ],
  byRegion: [
    { region: "Berlin", postalPrefix: "10x", count: 34 },
    { region: "München", postalPrefix: "80x", count: 22 },
    { region: "Hamburg", postalPrefix: "20x", count: 19 },
    { region: "Köln", postalPrefix: "50x", count: 16 },
    { region: "Frankfurt", postalPrefix: "60x", count: 14 },
    { region: "Leipzig", postalPrefix: "04x", count: 12 },
    { region: "Stuttgart", postalPrefix: "70x", count: 11 },
    { region: "Sonstige", postalPrefix: "**x", count: 56 },
  ],
  byExport: [
    { channel: "pdf", count: 142 },
    { channel: "clipboard", count: 78 },
    { channel: "eml", count: 48 },
  ],
  byAiReview: [
    { outcome: "ai_confirmed", count: 101 },
    { outcome: "manually_corrected", count: 29 },
    { outcome: "pending_review", count: 39 },
    { outcome: "rejected_as_invalid", count: 15 },
  ],
  daily: [
    { key: "2026-07-13", label: "13.07", total: 4, success: 3, failed: 1, invalid: 0 },
    { key: "2026-07-14", label: "14.07", total: 6, success: 5, failed: 0, invalid: 1 },
    { key: "2026-07-15", label: "15.07", total: 3, success: 2, failed: 1, invalid: 0 },
    { key: "2026-07-16", label: "16.07", total: 8, success: 6, failed: 1, invalid: 1 },
    { key: "2026-07-17", label: "17.07", total: 5, success: 4, failed: 1, invalid: 0 },
    { key: "2026-07-18", label: "18.07", total: 7, success: 5, failed: 2, invalid: 0 },
    { key: "2026-07-19", label: "19.07", total: 9, success: 7, failed: 1, invalid: 1 },
    { key: "2026-07-20", label: "20.07", total: 4, success: 3, failed: 0, invalid: 1 },
    { key: "2026-07-21", label: "21.07", total: 6, success: 5, failed: 1, invalid: 0 },
    { key: "2026-07-22", label: "22.07", total: 11, success: 8, failed: 2, invalid: 1 },
    { key: "2026-07-23", label: "23.07", total: 5, success: 4, failed: 1, invalid: 0 },
    { key: "2026-07-24", label: "24.07", total: 7, success: 6, failed: 0, invalid: 1 },
    { key: "2026-07-25", label: "25.07", total: 8, success: 6, failed: 2, invalid: 0 },
    { key: "2026-07-26", label: "26.07", total: 3, success: 2, failed: 1, invalid: 0 },
    { key: "2026-07-27", label: "27.07", total: 10, success: 8, failed: 1, invalid: 1 },
    { key: "2026-07-28", label: "28.07", total: 6, success: 5, failed: 1, invalid: 0 },
    { key: "2026-07-29", label: "29.07", total: 4, success: 3, failed: 0, invalid: 1 },
    { key: "2026-07-30", label: "30.07", total: 7, success: 5, failed: 2, invalid: 0 },
    { key: "2026-07-31", label: "31.07", total: 5, success: 4, failed: 1, invalid: 0 },
    { key: "2026-08-01", label: "01.08", total: 9, success: 7, failed: 1, invalid: 1 },
    { key: "2026-08-02", label: "02.08", total: 6, success: 5, failed: 1, invalid: 0 },
    { key: "2026-08-03", label: "03.08", total: 8, success: 6, failed: 1, invalid: 1 },
    { key: "2026-08-04", label: "04.08", total: 4, success: 3, failed: 1, invalid: 0 },
    { key: "2026-08-05", label: "05.08", total: 7, success: 6, failed: 0, invalid: 1 },
    { key: "2026-08-06", label: "06.08", total: 5, success: 4, failed: 1, invalid: 0 },
    { key: "2026-08-07", label: "07.08", total: 6, success: 4, failed: 2, invalid: 0 },
    { key: "2026-08-08", label: "08.08", total: 8, success: 7, failed: 0, invalid: 1 },
    { key: "2026-08-09", label: "09.08", total: 5, success: 4, failed: 1, invalid: 0 },
    { key: "2026-08-10", label: "10.08", total: 7, success: 5, failed: 1, invalid: 1 },
    { key: "2026-08-11", label: "11.08", total: 4, success: 3, failed: 1, invalid: 0 },
  ],
  weekly: [
    { key: "kw29", label: "KW 29", total: 33, success: 25, failed: 5, invalid: 3 },
    { key: "kw30", label: "KW 30", total: 42, success: 32, failed: 6, invalid: 4 },
    { key: "kw31", label: "KW 31", total: 45, success: 34, failed: 7, invalid: 4 },
    { key: "kw32", label: "KW 32", total: 40, success: 32, failed: 5, invalid: 3 },
    { key: "kw33", label: "KW 33", total: 24, success: 19, failed: 4, invalid: 1 },
    { key: "kw34", label: "KW 34", total: 28, success: 22, failed: 4, invalid: 2 },
    { key: "kw35", label: "KW 35", total: 31, success: 24, failed: 5, invalid: 2 },
    { key: "kw36", label: "KW 36", total: 26, success: 20, failed: 4, invalid: 2 },
    { key: "kw37", label: "KW 37", total: 29, success: 23, failed: 4, invalid: 2 },
    { key: "kw38", label: "KW 38", total: 35, success: 27, failed: 5, invalid: 3 },
    { key: "kw39", label: "KW 39", total: 33, success: 25, failed: 5, invalid: 3 },
    { key: "kw40", label: "KW 40", total: 30, success: 23, failed: 5, invalid: 2 },
  ],
  monthly: [
    { key: "2025-09", label: "Sep 25", total: 98, success: 74, failed: 15, invalid: 9 },
    { key: "2025-10", label: "Okt 25", total: 112, success: 86, failed: 16, invalid: 10 },
    { key: "2025-11", label: "Nov 25", total: 105, success: 81, failed: 15, invalid: 9 },
    { key: "2025-12", label: "Dez 25", total: 119, success: 91, failed: 18, invalid: 10 },
    { key: "2026-01", label: "Jan 26", total: 131, success: 101, failed: 19, invalid: 11 },
    { key: "2026-02", label: "Feb 26", total: 124, success: 96, failed: 18, invalid: 10 },
    { key: "2026-03", label: "Mär 26", total: 138, success: 107, failed: 20, invalid: 11 },
    { key: "2026-04", label: "Apr 26", total: 142, success: 110, failed: 20, invalid: 12 },
    { key: "2026-05", label: "Mai 26", total: 121, success: 94, failed: 17, invalid: 10 },
    { key: "2026-06", label: "Jun 26", total: 148, success: 112, failed: 22, invalid: 14 },
    { key: "2026-07", label: "Jul 26", total: 167, success: 128, failed: 24, invalid: 15 },
    { key: "2026-08", label: "Aug 26", total: 69, success: 54, failed: 10, invalid: 5 },
  ],
  topHandles: [
    { pseudonym: "hdl_7a3c", reports: 8, topCategory: "queer_hate", topPlatform: "X" },
    { pseudonym: "hdl_91be", reports: 6, topCategory: "death_threat", topPlatform: "INSTAGRAM" },
    { pseudonym: "hdl_2f0d", reports: 5, topCategory: "political_insult", topPlatform: "FACEBOOK" },
    { pseudonym: "hdl_c441", reports: 4, topCategory: "incitement", topPlatform: "X" },
    { pseudonym: "hdl_55aa", reports: 4, topCategory: "violence", topPlatform: "TIKTOK" },
    { pseudonym: "hdl_unkn", reports: 11, topCategory: "other", topPlatform: "OTHER" },
  ],
  recent: [
    {
      id: "QS-1842",
      createdAt: "2026-08-11T11:12:00+02:00",
      platform: "X",
      category: "queer_hate",
      status: "success",
      accusedHandle: "@demo_hetzer_x",
      accusedPseudonym: "hdl_7a3c",
      region: "Berlin",
      postalPrefix: "101",
      screenshotCount: 1,
      processingSeconds: 6.2,
      exportChannel: "pdf",
      aiReview: "ai_confirmed",
    },
    {
      id: "QS-1841",
      createdAt: "2026-08-11T09:40:00+02:00",
      platform: "INSTAGRAM",
      category: "death_threat",
      status: "success",
      accusedHandle: "@demo_threat_ig",
      accusedPseudonym: "hdl_91be",
      region: "München",
      postalPrefix: "803",
      screenshotCount: 2,
      processingSeconds: 8.9,
      exportChannel: "eml",
      aiReview: "manually_corrected",
    },
    {
      id: "QS-1840",
      createdAt: "2026-08-10T21:05:00+02:00",
      platform: "FACEBOOK",
      category: "political_insult",
      status: "invalid",
      accusedHandle: "Demo Nutzer FB",
      accusedPseudonym: "hdl_2f0d",
      region: "Hamburg",
      postalPrefix: "200",
      screenshotCount: 1,
      processingSeconds: 4.1,
      exportChannel: null,
      aiReview: "rejected_as_invalid",
    },
    {
      id: "QS-1839",
      createdAt: "2026-08-10T18:22:00+02:00",
      platform: "TIKTOK",
      category: "violence",
      status: "failed",
      accusedHandle: "@demo_violence_tt",
      accusedPseudonym: "hdl_55aa",
      region: "Köln",
      postalPrefix: "506",
      screenshotCount: 3,
      processingSeconds: 14.2,
      exportChannel: null,
      aiReview: "pending_review",
    },
    {
      id: "QS-1838",
      createdAt: "2026-08-10T14:11:00+02:00",
      platform: "X",
      category: "incitement",
      status: "success",
      accusedHandle: "@demo_hetze",
      accusedPseudonym: "hdl_c441",
      region: "Leipzig",
      postalPrefix: "041",
      screenshotCount: 2,
      processingSeconds: 7.0,
      exportChannel: "clipboard",
      aiReview: "ai_confirmed",
    },
    {
      id: "QS-1837",
      createdAt: "2026-08-09T16:48:00+02:00",
      platform: "INSTAGRAM",
      category: "queer_hate",
      status: "success",
      accusedHandle: "@demo_kommentar_ig",
      accusedPseudonym: "hdl_7a3c",
      region: "Frankfurt",
      postalPrefix: "603",
      screenshotCount: 2,
      processingSeconds: 9.4,
      exportChannel: "pdf",
      aiReview: "manually_corrected",
    },
    {
      id: "QS-1836",
      createdAt: "2026-08-09T10:03:00+02:00",
      platform: "OTHER",
      category: "other",
      status: "failed",
      accusedHandle: "Unbekannt",
      accusedPseudonym: "hdl_unkn",
      region: "—",
      postalPrefix: "***",
      screenshotCount: 1,
      processingSeconds: 11.8,
      exportChannel: null,
      aiReview: "pending_review",
    },
    {
      id: "QS-1835",
      createdAt: "2026-08-08T19:30:00+02:00",
      platform: "FACEBOOK",
      category: "queer_hate",
      status: "success",
      accusedHandle: "Demo Hetzer",
      accusedPseudonym: "hdl_2f0d",
      region: "Stuttgart",
      postalPrefix: "701",
      screenshotCount: 1,
      processingSeconds: 5.5,
      exportChannel: "pdf",
      aiReview: "ai_confirmed",
    },
  ],
};

function withShares<T extends { count: number }>(
  rows: T[]
): Array<T & { share: number }> {
  const sum = rows.reduce((acc, r) => acc + r.count, 0) || 1;
  return rows.map((r) => ({
    ...r,
    share: Math.round((r.count / sum) * 1000) / 10,
  }));
}

function scaleCount(n: number, factor: number) {
  return Math.max(0, Math.round(n * factor));
}

function periodConfig(period: PeriodFilter) {
  switch (period) {
    case "7d":
      return {
        label: "Letzte 7 Tage (Demo)",
        factor: 7 / 30,
        series: RAW.daily.slice(-7),
        seriesTitle: "Tagesverlauf",
      };
    case "30d":
      return {
        label: "Letzte 30 Tage (Demo)",
        factor: 1,
        series: RAW.daily,
        seriesTitle: "Tagesverlauf",
      };
    case "90d":
      return {
        label: "Letzte 90 Tage (Demo)",
        factor: 3,
        series: RAW.weekly.slice(-13),
        seriesTitle: "Wochenverlauf",
      };
    case "12m":
      return {
        label: "Letzte 12 Monate (Demo)",
        factor: 12,
        series: RAW.monthly,
        seriesTitle: "Monatsverlauf",
      };
  }
}

export type FilteredDashboard = {
  generatedAt: string;
  periodLabel: string;
  seriesTitle: string;
  filters: DashboardFilters;
  totals: RawDashboard["totals30d"] & {
    reports: number;
    successRate: number;
  };
  byCategory: CategoryStat[];
  byPlatform: PlatformStat[];
  byStatus: StatusStat[];
  byScreenshots: ScreenshotBucket[];
  byProcessingTime: ProcessingBucket[];
  byRegion: RegionStat[];
  byExport: ExportStat[];
  byAiReview: AiReviewStat[];
  series: SeriesPoint[];
  topHandles: PseudonymHandle[];
  recent: RecentReport[];
};

function dimFactor(
  filters: DashboardFilters,
  kind: "platform" | "category" | "status"
): number {
  if (kind === "platform" && filters.platform !== "ALL") {
    const row = RAW.byPlatform.find((p) => p.platform === filters.platform);
    const total = RAW.totals30d.reports || 1;
    return (row?.count ?? 0) / total;
  }
  if (kind === "category" && filters.category !== "ALL") {
    const row = RAW.byCategory.find((c) => c.category === filters.category);
    const total = RAW.totals30d.reports || 1;
    return (row?.count ?? 0) / total;
  }
  if (kind === "status" && filters.status !== "ALL") {
    const row = RAW.byStatus.find((s) => s.status === filters.status);
    const total = RAW.totals30d.reports || 1;
    return (row?.count ?? 0) / total;
  }
  return 1;
}

export function getFilteredDashboard(
  filters: DashboardFilters
): FilteredDashboard {
  const period = periodConfig(filters.period);
  const f =
    period.factor *
    dimFactor(filters, "platform") *
    dimFactor(filters, "category") *
    dimFactor(filters, "status");

  let byCategory = RAW.byCategory.map((r) => ({
    ...r,
    count: scaleCount(r.count, f),
  }));
  let byPlatform = RAW.byPlatform.map((r) => ({
    ...r,
    count: scaleCount(r.count, f),
  }));
  let byStatus = RAW.byStatus.map((r) => ({
    ...r,
    count: scaleCount(r.count, f),
  }));

  if (filters.platform !== "ALL") {
    byPlatform = byPlatform.filter((p) => p.platform === filters.platform);
  }
  if (filters.category !== "ALL") {
    byCategory = byCategory.filter((c) => c.category === filters.category);
  }
  if (filters.status !== "ALL") {
    byStatus = byStatus.filter((s) => s.status === filters.status);
  }

  const seriesFactor =
    dimFactor(filters, "platform") *
    dimFactor(filters, "category") *
    dimFactor(filters, "status");

  const scaledSeries = period.series.map((p) => ({
    ...p,
    total: scaleCount(p.total, seriesFactor),
    success: scaleCount(p.success, seriesFactor),
    failed: scaleCount(p.failed, seriesFactor),
    invalid: scaleCount(p.invalid, seriesFactor),
  }));

  const reports = byStatus.reduce((a, r) => a + r.count, 0);
  const successCount =
    byStatus.find((s) => s.status === "success")?.count ?? 0;

  const recent = RAW.recent.filter((row) => {
    if (filters.platform !== "ALL" && row.platform !== filters.platform) {
      return false;
    }
    if (filters.category !== "ALL" && row.category !== filters.category) {
      return false;
    }
    if (filters.status !== "ALL" && row.status !== filters.status) {
      return false;
    }
    if (filters.period === "7d") {
      return row.createdAt >= "2026-08-05";
    }
    return true;
  });

  const topHandles = RAW.topHandles.filter((h) => {
    if (filters.platform !== "ALL" && h.topPlatform !== filters.platform) {
      return false;
    }
    if (filters.category !== "ALL" && h.topCategory !== filters.category) {
      return false;
    }
    return true;
  });

  return {
    generatedAt: RAW.generatedAt,
    periodLabel: period.label,
    seriesTitle: period.seriesTitle,
    filters,
    totals: {
      reports,
      screenshots: scaleCount(RAW.totals30d.screenshots, f),
      uniquePlatforms:
        filters.platform === "ALL" ? RAW.totals30d.uniquePlatforms : 1,
      avgProcessingSeconds: RAW.totals30d.avgProcessingSeconds,
      avgScreenshotsPerReport: RAW.totals30d.avgScreenshotsPerReport,
      uniquePseudonymHandles: scaleCount(
        RAW.totals30d.uniquePseudonymHandles,
        Math.min(f, 1.2)
      ),
      exportsTotal: scaleCount(RAW.totals30d.exportsTotal, f),
      successRate: reports ? Math.round((successCount / reports) * 1000) / 10 : 0,
    },
    byCategory: withShares(byCategory),
    byPlatform: withShares(byPlatform),
    byStatus: withShares(byStatus),
    byScreenshots: withShares(
      RAW.byScreenshots.map((r) => ({ ...r, count: scaleCount(r.count, f) }))
    ),
    byProcessingTime: withShares(
      RAW.byProcessingTime.map((r) => ({ ...r, count: scaleCount(r.count, f) }))
    ),
    byRegion: withShares(
      RAW.byRegion.map((r) => ({ ...r, count: scaleCount(r.count, f) }))
    ),
    byExport: withShares(
      RAW.byExport.map((r) => ({ ...r, count: scaleCount(r.count, f) }))
    ),
    byAiReview: withShares(
      RAW.byAiReview.map((r) => ({ ...r, count: scaleCount(r.count, f) }))
    ),
    series: scaledSeries,
    topHandles,
    recent,
  };
}

/** @deprecated use getFilteredDashboard */
export const DUMMY_DASHBOARD = getFilteredDashboard(DEFAULT_FILTERS);
