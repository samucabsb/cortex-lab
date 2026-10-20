"use client";

import React from "react";
import { FileSpreadsheet, BookOpen } from "lucide-react";

interface ExportToolbarProps {
  reviewId?: string;
  onExportCsv?: () => void;
  onExportBibtex?: () => void;
}

export const ExportToolbar: React.FC<ExportToolbarProps> = ({
  reviewId,
  onExportCsv,
  onExportBibtex,
}) => {
  const getApiBase = () => {
    const raw = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:7860/api").replace(/\/+$/, "");
    return raw.endsWith("/api") ? raw : `${raw}`;
  };

  const handleCsvDownload = () => {
    if (onExportCsv) return onExportCsv();
    window.open(`${getApiBase()}/v1/reviews/${reviewId || "current"}/export/csv`, "_blank");
  };

  const handleBibtexDownload = () => {
    if (onExportBibtex) return onExportBibtex();
    window.open(`${getApiBase()}/v1/reviews/${reviewId || "current"}/export/bibtex`, "_blank");
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={handleCsvDownload}
        className="px-4 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-sm font-semibold flex items-center gap-2 shadow-sm transition active:scale-95 cursor-pointer"
      >
        <FileSpreadsheet size={16} className="text-emerald-700" />
        <span>Baixar Planilha Excel (.CSV)</span>
      </button>

      <button
        onClick={handleBibtexDownload}
        className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold flex items-center gap-2 shadow-sm transition active:scale-95 cursor-pointer"
      >
        <BookOpen size={16} />
        <span>Exportar BibTeX (.bib)</span>
      </button>
    </div>
  );
};
