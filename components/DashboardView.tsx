"use client";

import {
  AI_REVIEW_LABELS,
  CATEGORY_LABELS,
  DEFAULT_FILTERS,
  EXPORT_LABELS,
  PERIOD_LABELS,
  PLATFORM_LABELS,
  STATUS_LABELS,
  getFilteredDashboard,
  type DashboardFilters,
  type PeriodFilter,
  type ReportCategory,
  type ReportPlatform,
  type ReportStatus,
  type SeriesPoint,
} from "@/lib/demoDashboardData";
import { Filter, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";

const SECTIONS = [
  { id: "overview", label: "Überblick" },
  { id: "cases", label: "Vorfälle & Kanäle" },
  { id: "ops", label: "Betrieb" },
  { id: "quality", label: "Qualität" },
  { id: "timeline", label: "Zeitverlauf" },
  { id: "records", label: "Meldungen" },
] as const;

function statusTone(status: ReportStatus) {
  switch (status) {
    case "success":
      return "bg-emerald-100 text-emerald-900";
    case "failed":
      return "bg-rose-100 text-rose-900";
    case "invalid":
      return "bg-amber-100 text-amber-950";
  }
}

function formatDateTime(iso: string) {
  try {
    return new Intl.DateTimeFormat("de-DE", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function BarList({
  items,
  accentClass = "bg-[var(--accent)]",
}: {
  items: Array<{ key: string; label: string; count: number; share: number }>;
  accentClass?: string;
}) {
  const max = Math.max(...items.map((i) => i.count), 1);
  if (items.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">Keine Daten für diesen Filter.</p>
    );
  }
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.key}>
          <div className="mb-1 flex justify-between gap-3 text-sm">
            <span className="font-medium text-[var(--ink)]">{item.label}</span>
            <span className="tabular-nums text-[var(--muted)]">
              {item.count} · {item.share}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--line)]/50">
            <div
              className={`h-full rounded-full ${accentClass}`}
              style={{ width: `${(item.count / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 space-y-4">
      <div className="border-b border-[var(--line)] pb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          {eyebrow}
        </p>
        <h2 className="font-display text-2xl font-semibold text-[var(--ink)]">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
      <h3 className="font-display text-base font-semibold text-[var(--ink)]">
        {title}
      </h3>
      {subtitle ? (
        <p className="mb-4 mt-1 text-sm text-[var(--muted)]">{subtitle}</p>
      ) : (
        <div className="mb-4" />
      )}
      {children}
    </div>
  );
}

function SeriesChart({ points }: { points: SeriesPoint[] }) {
  const max = Math.max(...points.map((d) => d.total), 1);
  return (
    <div>
      <div className="flex h-44 items-end gap-1.5 overflow-x-auto pb-2">
        {points.map((point) => {
          const h = (point.total / max) * 100;
          const s = point.total ? (point.success / point.total) * 100 : 0;
          const f = point.total ? (point.failed / point.total) * 100 : 0;
          const i = point.total ? (point.invalid / point.total) * 100 : 0;
          return (
            <div
              key={point.key}
              className="flex min-w-[18px] flex-1 flex-col items-center gap-1"
              title={`${point.label}: ${point.total}`}
            >
              <div
                className="flex w-full max-w-[40px] flex-col justify-end overflow-hidden rounded-sm"
                style={{ height: `${Math.max(h, 6)}%` }}
              >
                <div className="w-full bg-amber-400" style={{ height: `${i}%` }} />
                <div className="w-full bg-rose-400" style={{ height: `${f}%` }} />
                <div
                  className="w-full bg-emerald-500"
                  style={{ height: `${s}%` }}
                />
              </div>
              <span className="max-w-[48px] truncate text-[10px] text-[var(--muted)]">
                {point.label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-[var(--muted)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Erfolgreich
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-rose-400" /> Nicht erfolgreich
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-amber-400" /> Ungültig
        </span>
      </div>
    </div>
  );
}

function selectClass() {
  return "field !py-2 text-sm";
}

export default function DashboardView() {
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS);
  const data = useMemo(() => getFilteredDashboard(filters), [filters]);

  const success = data.byStatus.find((s) => s.status === "success");
  const failed = data.byStatus.find((s) => s.status === "failed");
  const invalid = data.byStatus.find((s) => s.status === "invalid");

  const filtersActive =
    filters.period !== DEFAULT_FILTERS.period ||
    filters.platform !== "ALL" ||
    filters.category !== "ALL" ||
    filters.status !== "ALL";

  function patch(partial: Partial<DashboardFilters>) {
    setFilters((prev) => ({ ...prev, ...partial }));
  }

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <p className="inline-flex rounded-full border border-amber-500/60 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-950">
          Dummy-Daten · Prototyp · nicht Produktion
        </p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-[var(--ink)] sm:text-5xl">
          Auswertungs-Dashboard
        </h1>
        <p className="max-w-2xl text-[var(--muted)] leading-relaxed">
          Kennzahlen nach Zeitraum und Dimensionen filtern. Aktuell:{" "}
          <strong className="font-medium text-[var(--ink)]">
            {data.periodLabel}
          </strong>
          .
        </p>
      </header>

      {/* Filters */}
      <div className="sticky top-0 z-20 -mx-1 rounded-2xl border border-[var(--line)] bg-white/90 p-4 shadow-sm backdrop-blur">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
            <Filter className="h-4 w-4 text-[var(--accent)]" aria-hidden />
            Filter
          </p>
          {filtersActive && (
            <button
              type="button"
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--ink)]"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Zurücksetzen
            </button>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-[var(--muted)]">
              Zeitraum
            </span>
            <select
              className={selectClass()}
              value={filters.period}
              onChange={(e) =>
                patch({ period: e.target.value as PeriodFilter })
              }
            >
              {(Object.keys(PERIOD_LABELS) as PeriodFilter[]).map((key) => (
                <option key={key} value={key}>
                  {PERIOD_LABELS[key]}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-[var(--muted)]">
              Plattform
            </span>
            <select
              className={selectClass()}
              value={filters.platform}
              onChange={(e) =>
                patch({
                  platform: e.target.value as DashboardFilters["platform"],
                })
              }
            >
              <option value="ALL">Alle Plattformen</option>
              {(Object.keys(PLATFORM_LABELS) as ReportPlatform[]).map((key) => (
                <option key={key} value={key}>
                  {PLATFORM_LABELS[key]}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-[var(--muted)]">
              Kategorie
            </span>
            <select
              className={selectClass()}
              value={filters.category}
              onChange={(e) =>
                patch({
                  category: e.target.value as DashboardFilters["category"],
                })
              }
            >
              <option value="ALL">Alle Kategorien</option>
              {(Object.keys(CATEGORY_LABELS) as ReportCategory[]).map((key) => (
                <option key={key} value={key}>
                  {CATEGORY_LABELS[key]}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-[var(--muted)]">
              Status
            </span>
            <select
              className={selectClass()}
              value={filters.status}
              onChange={(e) =>
                patch({ status: e.target.value as DashboardFilters["status"] })
              }
            >
              <option value="ALL">Alle Status</option>
              {(Object.keys(STATUS_LABELS) as ReportStatus[]).map((key) => (
                <option key={key} value={key}>
                  {STATUS_LABELS[key]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <nav
          className="mt-4 flex gap-2 overflow-x-auto pb-1"
          aria-label="Dashboard-Abschnitte"
        >
          {SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="shrink-0 rounded-full border border-[var(--line)] bg-white/70 px-3 py-1 text-xs font-medium text-[var(--ink)] hover:border-[var(--accent)]"
            >
              {section.label}
            </a>
          ))}
        </nav>
      </div>

      {/* 1 Overview */}
      <Section id="overview" eyebrow="01" title="Überblick">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Meldungen", value: String(data.totals.reports) },
            { label: "Erfolgsquote", value: `${data.totals.successRate}%` },
            {
              label: "Screenshots",
              value: String(data.totals.screenshots),
            },
            {
              label: "Exports",
              value: String(data.totals.exportsTotal),
            },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-4"
            >
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
                {kpi.label}
              </p>
              <p className="mt-2 font-display text-3xl font-semibold text-[var(--ink)]">
                {kpi.value}
              </p>
            </div>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-4">
            <p className="text-xs uppercase tracking-wide text-emerald-900/70">
              Erfolgreich
            </p>
            <p className="mt-1 font-display text-3xl font-semibold text-emerald-950">
              {success?.count ?? 0}
            </p>
          </div>
          <div className="rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-4">
            <p className="text-xs uppercase tracking-wide text-rose-900/70">
              Nicht erfolgreich
            </p>
            <p className="mt-1 font-display text-3xl font-semibold text-rose-950">
              {failed?.count ?? 0}
            </p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-4">
            <p className="text-xs uppercase tracking-wide text-amber-950/70">
              Ungültig
            </p>
            <p className="mt-1 font-display text-3xl font-semibold text-amber-950">
              {invalid?.count ?? 0}
            </p>
          </div>
        </div>
      </Section>

      {/* 2 Cases */}
      <Section id="cases" eyebrow="02" title="Vorfälle & Kanäle">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card
            title="Kategorie / Rechtsbereich"
            subtitle="Art der gemeldeten Inhalte"
          >
            <BarList
              items={data.byCategory.map((c) => ({
                key: c.category,
                label: CATEGORY_LABELS[c.category],
                count: c.count,
                share: c.share,
              }))}
            />
          </Card>
          <Card title="Plattform" subtitle="Herkunft der Screenshots">
            <BarList
              items={data.byPlatform.map((p) => ({
                key: p.platform,
                label: PLATFORM_LABELS[p.platform],
                count: p.count,
                share: p.share,
              }))}
            />
          </Card>
        </div>
      </Section>

      {/* 3 Ops */}
      <Section id="ops" eyebrow="03" title="Betrieb & Beweise">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card
            title="Screenshots pro Fall"
            subtitle={`Ø ${data.totals.avgScreenshotsPerReport} je Meldung`}
          >
            <BarList
              accentClass="bg-teal-700"
              items={data.byScreenshots.map((b) => ({
                key: b.bucket,
                label: b.label,
                count: b.count,
                share: b.share,
              }))}
            />
          </Card>
          <Card
            title="Verarbeitungszeit"
            subtitle={`Ø ${data.totals.avgProcessingSeconds} s Analyse + PDF`}
          >
            <BarList
              accentClass="bg-slate-700"
              items={data.byProcessingTime.map((b) => ({
                key: b.bucket,
                label: `${b.label} (Ø ${b.avgSeconds}s)`,
                count: b.count,
                share: b.share,
              }))}
            />
          </Card>
          <Card
            title="Region / PLZ (aggregiert)"
            subtitle="Nur Präfixe - keine Adressen"
          >
            <BarList
              accentClass="bg-emerald-700"
              items={data.byRegion.map((r) => ({
                key: r.region,
                label: `${r.region} (${r.postalPrefix})`,
                count: r.count,
                share: r.share,
              }))}
            />
          </Card>
          <Card title="Exportkanal" subtitle="Wie Ergebnisse weitergegeben wurden">
            <BarList
              accentClass="bg-cyan-800"
              items={data.byExport.map((e) => ({
                key: e.channel,
                label: EXPORT_LABELS[e.channel],
                count: e.count,
                share: e.share,
              }))}
            />
          </Card>
        </div>
      </Section>

      {/* 4 Quality */}
      <Section id="quality" eyebrow="04" title="Qualität & Wiederholungstäter">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card
            title="KI-Einordnung vs. Korrektur"
            subtitle="Qualität der automatischen Kategorie"
          >
            <BarList
              accentClass="bg-stone-700"
              items={data.byAiReview.map((a) => ({
                key: a.outcome,
                label: AI_REVIEW_LABELS[a.outcome],
                count: a.count,
                share: a.share,
              }))}
            />
          </Card>
          <Card
            title="Pseudonymisierte Handles"
            subtitle={`${data.totals.uniquePseudonymHandles} eindeutige IDs im Zeitraum`}
          >
            {data.topHandles.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                Keine Handles für diesen Filter.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {data.topHandles.map((h) => (
                  <li
                    key={h.pseudonym}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--line)]/70 bg-white/50 px-3 py-2"
                  >
                    <span className="font-mono font-medium">{h.pseudonym}</span>
                    <span className="text-[var(--muted)]">
                      {h.reports}× · {CATEGORY_LABELS[h.topCategory]} ·{" "}
                      {PLATFORM_LABELS[h.topPlatform]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </Section>

      {/* 5 Timeline */}
      <Section id="timeline" eyebrow="05" title="Zeitverlauf">
        <Card
          title={data.seriesTitle}
          subtitle="Gestapelt nach Status - reagiert auf Zeitraum-Filter"
        >
          <SeriesChart points={data.series} />
        </Card>
      </Section>

      {/* 6 Records */}
      <Section id="records" eyebrow="06" title="Einzelmeldungen">
        <Card
          title={`${data.recent.length} Treffer`}
          subtitle="Gefiltert nach den aktuellen Einstellungen"
        >
          {data.recent.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              Keine Meldungen für diese Filterkombination.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--line)] text-[var(--muted)]">
                    <th className="py-2 pr-3 font-medium">ID</th>
                    <th className="py-2 pr-3 font-medium">Zeit</th>
                    <th className="py-2 pr-3 font-medium">Plattform</th>
                    <th className="py-2 pr-3 font-medium">Kategorie</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 pr-3 font-medium">Pseudo</th>
                    <th className="py-2 pr-3 font-medium">Region</th>
                    <th className="py-2 pr-3 font-medium">Shots</th>
                    <th className="py-2 pr-3 font-medium">Dauer</th>
                    <th className="py-2 font-medium">Export</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-[var(--line)]/60"
                    >
                      <td className="py-2.5 pr-3 font-medium tabular-nums">
                        {row.id}
                      </td>
                      <td className="py-2.5 pr-3 text-[var(--muted)]">
                        {formatDateTime(row.createdAt)}
                      </td>
                      <td className="py-2.5 pr-3">
                        {PLATFORM_LABELS[row.platform]}
                      </td>
                      <td className="py-2.5 pr-3">
                        {CATEGORY_LABELS[row.category]}
                      </td>
                      <td className="py-2.5 pr-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusTone(row.status)}`}
                        >
                          {STATUS_LABELS[row.status]}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-xs">
                        {row.accusedPseudonym}
                      </td>
                      <td className="py-2.5 pr-3">
                        {row.region}{" "}
                        <span className="text-[var(--muted)]">
                          ({row.postalPrefix})
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 tabular-nums">
                        {row.screenshotCount}
                      </td>
                      <td className="py-2.5 pr-3 tabular-nums">
                        {row.processingSeconds.toFixed(1)}s
                      </td>
                      <td className="py-2.5">
                        {row.exportChannel
                          ? EXPORT_LABELS[row.exportChannel]
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </Section>
    </div>
  );
}
