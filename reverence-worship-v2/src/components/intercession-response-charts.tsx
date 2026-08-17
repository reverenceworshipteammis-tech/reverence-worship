"use client";

import { useRef, useState } from "react";
import { BarChart3, ChevronDown, Copy, Download, FileSpreadsheet, FileText, PieChart as PieChartIcon, Table2, type LucideIcon } from "lucide-react";
import { IntercessionRichText } from "@/components/intercession-rich-text";
import { intercessionRichTextToPlainText } from "@/lib/intercession-rich-text";
import type { IntercessionGridResponseSummary, IntercessionQuestionResponseSummary, IntercessionResponseSeriesItem } from "@/lib/intercession-response-summary";

const CHART_COLORS = ["#3367d6", "#d93025", "#f29900", "#0f9d58", "#a142f4", "#0097a7", "#e8710a", "#7cb342", "#8e24aa", "#5c6bc0"];

export type IntercessionChartSelection = { questionId: string; questionLabel: string; answerLabel: string; rowIndex?: number; rowLabel?: string };

export function IntercessionResponseSummaryCard({ summary, onSeriesSelect, fullExcelHref }: { summary: IntercessionQuestionResponseSummary; onSeriesSelect?: (selection: IntercessionChartSelection) => void; fullExcelHref?: string }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [copyState, setCopyState] = useState<"idle" | "copying" | "copied" | "downloaded" | "error">("idle");
  const [showData, setShowData] = useState(false);
  const [sortMode, setSortMode] = useState<"original" | "highest" | "lowest">("original");
  const [chartMode, setChartMode] = useState<"pie" | "bar">(() => summary.series.length > 5 ? "bar" : "pie");
  const hasChart = summary.kind !== "text" && summary.responseCount > 0;
  const canExport = summary.responseCount > 0 || Boolean(fullExcelHref);
  const canSwitchChart = summary.kind === "pie";
  const canSort = ["pie", "bar"].includes(summary.kind) && summary.series.length > 1;
  const sortedSeries = sortSeries(summary.series, sortMode);

  async function copyChart() {
    const svg = chartRef.current?.querySelector("svg");
    if (!svg) return;
    setCopyState("copying");
    try {
      const blob = await svgToPngBlob(svg);
      if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setCopyState("copied");
      } else {
        downloadBlob(blob, `question-${summary.questionIndex + 1}-chart.png`);
        setCopyState("downloaded");
      }
    } catch {
      try {
        const blob = await svgToPngBlob(svg);
        downloadBlob(blob, `question-${summary.questionIndex + 1}-chart.png`);
        setCopyState("downloaded");
      } catch {
        setCopyState("error");
      }
    }
    window.setTimeout(() => setCopyState("idle"), 2200);
  }

  async function downloadChart() {
    const svg = chartRef.current?.querySelector("svg");
    if (!svg) return;
    setCopyState("copying");
    try {
      downloadBlob(await svgToPngBlob(svg), `question-${summary.questionIndex + 1}-chart.png`);
      setCopyState("downloaded");
    } catch {
      setCopyState("error");
    }
    window.setTimeout(() => setCopyState("idle"), 2200);
  }

  function selectSeries(answerLabel: string, rowIndex?: number, rowLabel?: string) {
    onSeriesSelect?.({ questionId: summary.questionId, questionLabel: plain(summary.label), answerLabel, rowIndex, rowLabel });
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-slate-900 sm:text-lg"><IntercessionRichText value={summary.label} /></h2>
          <p className="mt-1 text-sm text-slate-500">{summary.responseCount} answered · {Math.max(0, summary.totalSubmissions - summary.responseCount)} skipped · {summary.totalSubmissions ? formatPercent(Math.round(summary.responseCount / summary.totalSubmissions * 1000) / 10) : "0%"} response rate</p>
        </div>
        {hasChart || canExport ? (
          <div className="flex flex-wrap gap-1.5">
          {hasChart ? <button type="button" onClick={() => setShowData((current) => !current)} className="inline-flex w-fit shrink-0 items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100" aria-expanded={showData}><Table2 className="size-4" aria-hidden="true" />{showData ? "Hide data" : "View data"}</button> : null}
          {canExport ? <details className="relative">
            <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"><Download className="size-4" aria-hidden="true" />{copyState === "copying" ? "Preparing…" : copyState === "copied" ? "Copied" : copyState === "downloaded" ? "Downloaded" : copyState === "error" ? "Export failed" : "Export"}<ChevronDown className="size-3.5" aria-hidden="true" /></summary>
            <div className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
              {hasChart ? <><ExportAction icon={Copy} label="Copy chart" onClick={() => void copyChart()} disabled={copyState === "copying"} /><ExportAction icon={Download} label="Download PNG" onClick={() => void downloadChart()} disabled={copyState === "copying"} /></> : null}
              {summary.responseCount > 0 ? <ExportAction icon={FileText} label="Download question CSV" onClick={() => downloadQuestionCsv(summary, sortedSeries)} /> : null}
              {fullExcelHref ? <a href={fullExcelHref} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"><FileSpreadsheet className="size-4 text-slate-400" aria-hidden="true" />Download full Excel</a> : null}
            </div>
          </details> : null}
          </div>
        ) : null}
      </header>

      {hasChart && (canSwitchChart || canSort) ? <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">{canSwitchChart ? <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5" aria-label="Chart type"><ChartModeButton active={chartMode === "pie"} icon={PieChartIcon} label="Pie" onClick={() => setChartMode("pie")} /><ChartModeButton active={chartMode === "bar"} icon={BarChart3} label="Bar" onClick={() => setChartMode("bar")} /></div> : null}{canSort ? <label className="ml-auto inline-flex items-center gap-2 text-xs font-semibold text-slate-500">Sort<select value={sortMode} onChange={(event) => setSortMode(event.target.value as typeof sortMode)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700"><option value="original">Original order</option><option value="highest">Highest first</option><option value="lowest">Lowest first</option></select></label> : null}</div> : null}

      <div ref={chartRef} className="mt-3">
        {summary.responseCount === 0 ? (
          <EmptyResponses />
        ) : summary.kind === "pie" && chartMode === "pie" ? (
          <PieChart summary={summary} series={sortedSeries} onSelect={onSeriesSelect ? (answer) => selectSeries(answer) : undefined} />
        ) : summary.kind === "pie" && chartMode === "bar" ? (
          <SeriesBarChart series={sortedSeries} originalSeries={summary.series} label={plain(summary.label)} onSelect={onSeriesSelect ? (answer) => selectSeries(answer) : undefined} />
        ) : summary.kind === "bar" ? (
          <BarChart summary={summary} series={sortedSeries} onSelect={onSeriesSelect ? (answer) => selectSeries(answer) : undefined} />
        ) : summary.kind === "grid" ? (
          <GridChart summary={summary} onSelect={onSeriesSelect ? (answer, rowIndex, rowLabel) => selectSeries(answer, rowIndex, rowLabel) : undefined} />
        ) : (
          <TextResponses responses={summary.textResponses} />
        )}
      </div>
      {showData && hasChart ? <ResponseDataTable summary={summary} series={sortedSeries} /> : null}
    </article>
  );
}

function ChartModeButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: LucideIcon; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} aria-pressed={active} className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${active ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}><Icon className="size-3.5" aria-hidden="true" />{label}</button>;
}

function ExportAction({ icon: Icon, label, onClick, disabled = false }: { icon: LucideIcon; label: string; onClick: () => void; disabled?: boolean }) {
  return <button type="button" disabled={disabled} onClick={onClick} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"><Icon className="size-4 text-slate-400" aria-hidden="true" />{label}</button>;
}

function ChartTooltip({ text }: { text: string }) {
  return <div className="pointer-events-none absolute right-2 top-2 z-10 max-w-72 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-lg" role="status">{text}</div>;
}

function PieChart({ summary, series, onSelect }: { summary: IntercessionQuestionResponseSummary; series: IntercessionResponseSeriesItem[]; onSelect?: (answer: string) => void }) {
  const [tooltip, setTooltip] = useState<string | null>(null);
  const total = series.reduce((sum, item) => sum + item.count, 0);
  const centerY = 130;
  const nonZero = series.filter((item) => item.count > 0);
  const highest = Math.max(0, ...series.map((item) => item.count));

  return (
    <div className="relative grid items-center gap-4 md:grid-cols-[minmax(230px,300px)_minmax(0,1fr)]">
      {tooltip ? <ChartTooltip text={tooltip} /> : null}
      <svg viewBox="0 0 260 260" className="mx-auto w-full max-w-[280px]" role="img" aria-label={`${plain(summary.label)} response chart`} xmlns="http://www.w3.org/2000/svg">
        <rect width="260" height="260" fill="#ffffff" />
        {series.map((item, index) => {
          if (!item.count || !total) return null;
          const sweep = item.count / total * 360;
          const start = -90 + series.slice(0, index).reduce((sum, previous) => sum + previous.count / total * 360, 0);
          const end = start + sweep;
          const labelPoint = polarPoint(130, centerY, 65, start + sweep / 2);
          const color = seriesColor(item.label, summary.series);
          const details = `${item.label}: ${item.count} responses (${formatPercent(item.percentage)})`;
          return <g key={item.label} role={onSelect ? "button" : undefined} tabIndex={onSelect ? 0 : undefined} aria-label={details} className={onSelect ? "cursor-pointer outline-none focus:opacity-80" : undefined} onMouseEnter={() => setTooltip(details)} onMouseLeave={() => setTooltip(null)} onFocus={() => setTooltip(details)} onBlur={() => setTooltip(null)} onClick={() => onSelect?.(item.label)} onKeyDown={(event) => { if (onSelect && ["Enter", " "].includes(event.key)) { event.preventDefault(); onSelect(item.label); } }}>{sweep >= 359.999 ? <circle cx="130" cy={centerY} r="102" fill={color} /> : <path d={pieSlicePath(130, centerY, 102, start, end)} fill={color} stroke="#ffffff" strokeWidth="2" />}{sweep >= 18 ? <text x={labelPoint.x} y={labelPoint.y + 4} textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="700" pointerEvents="none">{formatPercent(item.percentage)}</text> : null}</g>;
        })}
        {nonZero.length === 1 ? <text x="130" y={centerY + 5} textAnchor="middle" fill="#ffffff" fontSize="16" fontWeight="700" pointerEvents="none">100%</text> : null}
      </svg>
      <div className="space-y-1.5" aria-label="Chart legend">{series.map((item) => {
        const clickable = Boolean(onSelect && item.count > 0);
        const content = <><span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: seriesColor(item.label, summary.series) }} aria-hidden="true" /><span className="min-w-0 flex-1 truncate text-left font-medium text-slate-700">{item.label}</span>{item.count === highest && highest > 0 ? <span className="hidden rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 sm:inline">Most selected</span> : null}<span className="shrink-0 font-semibold text-slate-600">{item.count} ({formatPercent(item.percentage)})</span></>;
        return onSelect ? <button key={item.label} type="button" disabled={!clickable} onClick={() => onSelect(item.label)} className="flex w-full items-center gap-2 rounded-lg border border-transparent px-2.5 py-2 text-sm transition enabled:hover:border-blue-200 enabled:hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-default" title={clickable ? `View respondents who selected ${item.label}` : "No respondents selected this answer"}>{content}</button> : <div key={item.label} className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm">{content}</div>;
      })}</div>
    </div>
  );
}

function BarChart({ summary, series, onSelect }: { summary: IntercessionQuestionResponseSummary; series: IntercessionResponseSeriesItem[]; onSelect?: (answer: string) => void }) {
  return (
    <>
      {summary.average !== null ? <p className="mb-2 text-sm font-medium text-slate-600">Average rating: <strong className="text-slate-900">{summary.average}</strong></p> : null}
      <SeriesBarChart series={series} originalSeries={summary.series} label={plain(summary.label)} onSelect={onSelect} />
    </>
  );
}

function SeriesBarChart({ series, originalSeries, label, onSelect }: { series: IntercessionResponseSeriesItem[]; originalSeries: IntercessionResponseSeriesItem[]; label: string; onSelect?: (answer: string) => void }) {
  const [tooltip, setTooltip] = useState<string | null>(null);
  const height = Math.max(104, series.length * 44 + 16);
  const max = Math.max(1, ...series.map((item) => item.count));
  const highest = Math.max(0, ...series.map((item) => item.count));
  return (
    <div className="relative overflow-x-auto">
      {tooltip ? <ChartTooltip text={tooltip} /> : null}
      <svg viewBox={`0 0 820 ${height}`} className="min-w-[700px]" role="img" aria-label={`${label} response chart`} xmlns="http://www.w3.org/2000/svg">
        <rect width="820" height={height} fill="#ffffff" />
        {series.map((item, index) => {
          const y = 8 + index * 44;
          const width = item.count / max * 430;
          const canSelect = Boolean(onSelect && item.count > 0);
          const details = `${item.label}: ${item.count} responses (${formatPercent(item.percentage)})`;
          return (
            <g key={item.label} role={canSelect ? "button" : undefined} tabIndex={canSelect ? 0 : undefined} aria-label={details} className={canSelect ? "cursor-pointer outline-none focus:opacity-80" : undefined} onMouseEnter={() => setTooltip(details)} onMouseLeave={() => setTooltip(null)} onFocus={() => setTooltip(details)} onBlur={() => setTooltip(null)} onClick={() => { if (canSelect) onSelect?.(item.label); }} onKeyDown={(event) => { if (canSelect && ["Enter", " "].includes(event.key)) { event.preventDefault(); onSelect?.(item.label); } }}>
              <text x="194" y={y + 20} textAnchor="end" fill="#475569" fontSize="14">{truncate(item.label, 28)}</text>
              <rect x="210" y={y} width="430" height="28" rx="5" fill="#eef2ff" />
              <rect x="210" y={y} width={width} height="28" rx="5" fill={seriesColor(item.label, originalSeries)} />
              <text x="655" y={y + 19} fill="#475569" fontSize="13" fontWeight="600">{item.count} ({formatPercent(item.percentage)})</text>
              {item.count === highest && highest > 0 ? <text x="790" y={y + 19} textAnchor="end" fill="#047857" fontSize="10" fontWeight="700">MOST SELECTED</text> : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function GridChart({ summary, onSelect }: { summary: IntercessionQuestionResponseSummary; onSelect?: (answer: string, rowIndex: number, rowLabel: string) => void }) {
  const [tooltip, setTooltip] = useState<string | null>(null);
  const rowHeights = summary.gridRows.map((row) => Math.max(86, row.series.length * 40 + 42));
  const height = rowHeights.reduce((sum, value) => sum + value, 0) + 20;
  return (
    <div className="relative overflow-x-auto">
      {tooltip ? <ChartTooltip text={tooltip} /> : null}
      <svg viewBox={`0 0 820 ${height}`} className="min-w-[700px]" role="img" aria-label={`${plain(summary.label)} grid response chart`} xmlns="http://www.w3.org/2000/svg">
        <rect width="820" height={height} fill="#ffffff" />
        {summary.gridRows.map((row, index) => {
          const groupY = 16 + rowHeights.slice(0, index).reduce((sum, value) => sum + value, 0);
          return <GridRow key={row.label} row={row} y={groupY} onSelect={onSelect ? (answer) => onSelect(answer, index, row.label) : undefined} onTooltip={setTooltip} />;
        })}
      </svg>
    </div>
  );
}

function GridRow({ row, y, onSelect, onTooltip }: { row: IntercessionGridResponseSummary; y: number; onSelect?: (answer: string) => void; onTooltip: (text: string | null) => void }) {
  const max = Math.max(1, ...row.series.map((item) => item.count));
  return (
    <g transform={`translate(0 ${y})`}>
      <text x="20" y="15" fill="#0f172a" fontSize="15" fontWeight="700">{truncate(row.label, 70)}</text>
      <text x="800" y="15" textAnchor="end" fill="#64748b" fontSize="12">{row.responseCount} response{row.responseCount === 1 ? "" : "s"}</text>
      {row.series.map((item, index) => {
        const itemY = 29 + index * 40;
        const canSelect = Boolean(onSelect && item.count > 0);
        const details = `${row.label} — ${item.label}: ${item.count} responses (${formatPercent(item.percentage)})`;
        return (
          <g key={item.label} role={canSelect ? "button" : undefined} tabIndex={canSelect ? 0 : undefined} aria-label={details} className={canSelect ? "cursor-pointer outline-none focus:opacity-80" : undefined} onMouseEnter={() => onTooltip(details)} onMouseLeave={() => onTooltip(null)} onFocus={() => onTooltip(details)} onBlur={() => onTooltip(null)} onClick={() => { if (canSelect) onSelect?.(item.label); }} onKeyDown={(event) => { if (canSelect && ["Enter", " "].includes(event.key)) { event.preventDefault(); onSelect?.(item.label); } }}>
            <text x="180" y={itemY + 18} textAnchor="end" fill="#475569" fontSize="13">{truncate(item.label, 26)}</text>
            <rect x="195" y={itemY} width="420" height="25" rx="4" fill="#eef2ff" />
            <rect x="195" y={itemY} width={item.count / max * 420} height="25" rx="4" fill={CHART_COLORS[index % CHART_COLORS.length]} />
            <text x="635" y={itemY + 18} fill="#475569" fontSize="12" fontWeight="600">{item.count} ({formatPercent(item.percentage)})</text>
          </g>
        );
      })}
    </g>
  );
}

function TextResponses({ responses }: { responses: string[] }) {
  const keywords = commonKeywords(responses);
  return (
    <div>
      {keywords.length ? <div className="mb-3 flex flex-wrap gap-2" aria-label="Common response keywords">{keywords.map((keyword) => <span key={keyword.label} className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{keyword.label} · {keyword.count}</span>)}</div> : null}
    <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
      {responses.map((response, index) => (
        <div key={`${response}-${index}`} className="rounded-lg bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">{response}</div>
      ))}
    </div>
    </div>
  );
}

function EmptyResponses() {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center">
      <FileText className="mx-auto size-9 text-slate-300" aria-hidden="true" />
      <p className="mt-2 text-sm font-medium text-slate-500">No responses for this question yet.</p>
    </div>
  );
}

function ResponseDataTable({ summary, series }: { summary: IntercessionQuestionResponseSummary; series: IntercessionResponseSeriesItem[] }) {
  const rows = summary.kind === "grid"
    ? summary.gridRows.flatMap((row) => row.series.map((item) => ({ group: row.label, ...item })))
    : series.map((item) => ({ group: "", ...item }));
  return (
    <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500"><tr>{summary.kind === "grid" ? <th scope="col" className="px-3 py-2">Row</th> : null}<th scope="col" className="px-3 py-2">Answer</th><th scope="col" className="px-3 py-2 text-right">Count</th><th scope="col" className="px-3 py-2 text-right">Percentage</th></tr></thead>
        <tbody className="divide-y divide-slate-100 bg-white">{rows.map((row, index) => <tr key={`${row.group}-${row.label}-${index}`}>{summary.kind === "grid" ? <td className="px-3 py-2 font-medium text-slate-700">{row.group}</td> : null}<td className="px-3 py-2 text-slate-700">{row.label}</td><td className="px-3 py-2 text-right font-semibold text-slate-700">{row.count}</td><td className="px-3 py-2 text-right text-slate-600">{formatPercent(row.percentage)}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

function pieSlicePath(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarPoint(cx, cy, radius, startAngle);
  const end = polarPoint(cx, cy, radius, endAngle);
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${endAngle - startAngle > 180 ? 1 : 0} 1 ${end.x} ${end.y} Z`;
}

function polarPoint(cx: number, cy: number, radius: number, angle: number) {
  const radians = angle * Math.PI / 180;
  return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) };
}

async function svgToPngBlob(svg: SVGSVGElement) {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const viewBox = svg.viewBox.baseVal;
  const width = Math.max(1, Math.round(viewBox.width || 820));
  const height = Math.max(1, Math.round(viewBox.height || 400));
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  const source = new XMLSerializer().serializeToString(clone);
  const sourceUrl = URL.createObjectURL(new Blob([source], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = new Image();
    image.src = sourceUrl;
    await image.decode();
    const scale = Math.min(2, 1600 / width);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is unavailable.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Chart could not be rendered.")), "image/png"));
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadQuestionCsv(summary: IntercessionQuestionResponseSummary, series: IntercessionResponseSeriesItem[]) {
  const rows = summary.kind === "text"
    ? [["Question", "Response"], ...summary.textResponses.map((response) => [plain(summary.label), response])]
    : summary.kind === "grid"
    ? [["Question", "Row", "Answer", "Count", "Percentage"], ...summary.gridRows.flatMap((row) => row.series.map((item) => [plain(summary.label), row.label, item.label, String(item.count), formatPercent(item.percentage)]))]
    : [["Question", "Answer", "Count", "Percentage"], ...series.map((item) => [plain(summary.label), item.label, String(item.count), formatPercent(item.percentage)])];
  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `question-${summary.questionIndex + 1}-responses.csv`);
}

function csvCell(value: string) {
  const safeValue = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safeValue.replace(/"/g, '""')}"`;
}

function sortSeries(series: IntercessionResponseSeriesItem[], mode: "original" | "highest" | "lowest") {
  if (mode === "original") return series;
  return [...series].sort((left, right) => mode === "highest" ? right.count - left.count || left.label.localeCompare(right.label) : left.count - right.count || left.label.localeCompare(right.label));
}

function seriesColor(label: string, originalSeries: IntercessionResponseSeriesItem[]) {
  const index = Math.max(0, originalSeries.findIndex((item) => item.label === label));
  return CHART_COLORS[index % CHART_COLORS.length];
}

function plain(value: string) {
  return intercessionRichTextToPlainText(value).replace(/\s+/g, " ").trim() || "Question";
}

function truncate(value: string, length: number) {
  return value.length > length ? `${value.slice(0, length - 1)}…` : value;
}

function formatPercent(value: number) {
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}

function commonKeywords(responses: string[]) {
  const ignored = new Set(["about", "after", "again", "also", "and", "are", "because", "been", "before", "being", "but", "can", "could", "for", "from", "have", "here", "into", "just", "more", "not", "our", "that", "the", "their", "them", "there", "they", "this", "very", "was", "were", "what", "when", "where", "which", "will", "with", "would", "you", "your"]);
  const counts = new Map<string, number>();
  responses.forEach((response) => {
    const words = new Set((response.toLocaleLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []).filter((word) => !ignored.has(word)));
    words.forEach((word) => counts.set(word, (counts.get(word) ?? 0) + 1));
  });
  return [...counts.entries()].filter(([, count]) => count > 1).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])).slice(0, 8).map(([label, count]) => ({ label, count }));
}
