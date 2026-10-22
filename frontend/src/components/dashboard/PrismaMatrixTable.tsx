"use client";

import React, { useState } from "react";
import { PrismaMatrixItem, Evidence } from "@/types";
import {
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Quote,
  Search,
  Award,
  FileText,
  X,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";

interface PrismaMatrixTableProps {
  rows: PrismaMatrixItem[];
  onSelectRow?: (row: PrismaMatrixItem) => void;
}

export const PrismaMatrixTable: React.FC<PrismaMatrixTableProps> = ({
  rows,
  onSelectRow,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<string>("ALL");
  const [selectedPaperForAudit, setSelectedPaperForAudit] = useState<PrismaMatrixItem | null>(null);

  const filteredRows = rows.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.citation_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.authors.some((a) => a.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesFilter =
      selectedRiskFilter === "ALL" || r.risk_of_bias === selectedRiskFilter;

    return matchesSearch && matchesFilter;
  });

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case "LOW":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={13} className="text-emerald-600" /> Baixo Risco
          </span>
        );
      case "SOME_CONCERNS":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <AlertCircle size={13} className="text-amber-600" /> Algumas Preocupações
          </span>
        );
      case "HIGH":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle size={13} className="text-rose-600" /> Alto Risco de Viés
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-md text-xs bg-slate-100 text-slate-600 border border-slate-200">
            Não Avaliado
          </span>
        );
    }
  };

  const renderEvidenceCell = (evidence?: Evidence, fallbackValue?: string) => {
    const status = evidence?.status;
    const value = evidence?.value || fallbackValue || "";
    const quote = evidence?.quote;

    if (status === "not_found" || value === "not_found" || !value) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 text-slate-400 border border-slate-200" title="Não reportado no texto do artigo">
          not_found
        </span>
      );
    }

    if (status === "needs_human_review" || value === "needs_human_review") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200" title="Necessita revisão humana">
          <HelpCircle size={11} className="text-amber-600" /> needs_review
        </span>
      );
    }

    return (
      <div className="space-y-0.5">
        <span className="font-semibold text-xs text-slate-900">{value}</span>
        {quote && (
          <div className="text-[10px] text-slate-500 italic line-clamp-1 flex items-center gap-1" title={quote}>
            <Quote size={10} className="shrink-0 text-blue-500" />
            <span>&ldquo;{quote}&rdquo;</span>
          </div>
        )}
      </div>
    );
  };

  const handleRowClick = (row: PrismaMatrixItem) => {
    setSelectedPaperForAudit(row);
    if (onSelectRow) onSelectRow(row);
  };

  return (
    <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm space-y-0">
      {/* Table Header Filter Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-slate-50/70">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 text-slate-400" size={14} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filtrar por título, autor ou chave BibTeX..."
              className="pl-9 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 w-64 sm:w-80 shadow-sm"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-xl">
            {[
              { id: "ALL", label: "Todos" },
              { id: "LOW", label: "Baixo Risco" },
              { id: "SOME_CONCERNS", label: "Preocupações" },
              { id: "HIGH", label: "Alto Risco" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedRiskFilter(f.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  selectedRiskFilter === f.id
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-500">
          Exibindo{" "}
          <span className="text-slate-900 font-bold">{filteredRows.length}</span> de{" "}
          <span className="font-semibold text-slate-700">{rows.length}</span> estudos incluídos
        </div>
      </div>

      {/* Table Scroll View */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100/70 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <th className="py-3.5 px-4">Chave & DOI</th>
              <th className="py-3.5 px-4">Estudo & Publicação</th>
              <th className="py-3.5 px-4">População (N)</th>
              <th className="py-3.5 px-4">Intervenção / Comparador</th>
              <th className="py-3.5 px-4">Desfecho</th>
              <th className="py-3.5 px-4">Cochrane RoB 2</th>
              <th className="py-3.5 px-4">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/80 text-xs">
            {filteredRows.map((row) => (
              <tr
                key={row.paper_id}
                onClick={() => handleRowClick(row)}
                className="hover:bg-blue-50/40 transition cursor-pointer align-top group"
              >
                {/* Citation Key, DOI & Metrics */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <div className="font-mono font-bold text-xs text-blue-700">
                    {row.citation_key}
                  </div>
                  {row.doi && (
                    <a
                      href={`https://doi.org/${row.doi}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-mono text-slate-500 hover:text-blue-600 inline-flex items-center gap-1 mt-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span>
                        {row.doi.length > 20 ? row.doi.slice(0, 20) + "..." : row.doi}
                      </span>
                      <ExternalLink size={10} />
                    </a>
                  )}
                  <div className="flex items-center gap-1 mt-1.5">
                    {row.doi_status === "verified" ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <ShieldCheck size={10} className="text-emerald-600" />
                        Crossref Validado
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                        DOI: {row.doi_status || "unchecked"}
                      </span>
                    )}
                  </div>
                </td>

                {/* Study Title & Authors */}
                <td className="py-3.5 px-4 max-w-sm">
                  <div className="font-serif font-bold text-slate-900 leading-snug text-xs group-hover:text-blue-900">
                    {row.title}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 font-medium">
                    {row.authors?.slice(0, 2).join(", ")}
                    {row.authors?.length > 2 ? " et al." : ""} ({row.year || "S/D"})
                    {row.journal && <span> • <span className="text-slate-700">{row.journal}</span></span>}
                  </div>
                </td>

                {/* Sample Size N */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  {renderEvidenceCell(row.evidence?.population_n, row.population_n)}
                </td>

                {/* Intervention & Comparator */}
                <td className="py-3.5 px-4 max-w-xs space-y-1">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Intervenção:</span>
                    {renderEvidenceCell(row.evidence?.intervention, row.intervention)}
                  </div>
                  {row.comparator && (
                    <div className="pt-0.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Comparador:</span>
                      {renderEvidenceCell(row.evidence?.comparator, row.comparator)}
                    </div>
                  )}
                </td>

                {/* Outcome */}
                <td className="py-3.5 px-4 max-w-xs">
                  {renderEvidenceCell(row.evidence?.outcomes, row.outcomes)}
                </td>

                {/* Cochrane RoB 2 Badge */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  {getRiskBadge(row.risk_of_bias)}
                </td>

                {/* Action button */}
                <td className="py-3.5 px-4 whitespace-nowrap text-right">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 group-hover:text-blue-800">
                    Auditar <ChevronRight size={12} />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Audit Detail Modal / Drawer */}
      {selectedPaperForAudit && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-xl p-6 space-y-6 animate-scaleIn">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                    {selectedPaperForAudit.citation_key}
                  </span>
                  {selectedPaperForAudit.doi && (
                    <a
                      href={`https://doi.org/${selectedPaperForAudit.doi}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-xs text-slate-500 hover:text-blue-600 inline-flex items-center gap-1"
                    >
                      doi:{selectedPaperForAudit.doi} <ExternalLink size={11} />
                    </a>
                  )}
                </div>
                <h3 className="font-serif text-lg font-bold text-slate-900 leading-snug">
                  {selectedPaperForAudit.title}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedPaperForAudit.authors.join(", ")} ({selectedPaperForAudit.year}) • {selectedPaperForAudit.journal}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPaperForAudit(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Cochrane RoB 2 Details */}
            <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Auditoria Cochrane RoB 2
                </span>
                {getRiskBadge(selectedPaperForAudit.risk_of_bias)}
              </div>

              {selectedPaperForAudit.evidence?.risk_of_bias?.justification && (
                <div className="text-xs text-slate-700 space-y-1">
                  <span className="font-semibold block text-slate-800">Justificativa do Avaliador:</span>
                  <p className="p-3 bg-white rounded-lg border border-slate-200 italic">
                    &ldquo;{selectedPaperForAudit.evidence.risk_of_bias.justification}&rdquo;
                  </p>
                </div>
              )}
            </div>

            {/* Extracted Datapoints with Verbatim Quotes */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Proveniência de Extração com Citações Verbatim:
              </h4>

              <div className="grid grid-cols-1 gap-3">
                {/* Population N */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Tamanho Amostral (N)</span>
                    <span className="font-mono text-xs font-bold text-blue-700">
                      {selectedPaperForAudit.evidence?.population_n?.value || selectedPaperForAudit.population_n || "not_found"}
                    </span>
                  </div>
                  {selectedPaperForAudit.evidence?.population_n?.quote && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic">
                      &ldquo;{selectedPaperForAudit.evidence.population_n.quote}&rdquo;
                    </p>
                  )}
                </div>

                {/* Intervention */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Intervenção</span>
                    <span className="text-xs font-semibold text-slate-900">
                      {selectedPaperForAudit.evidence?.intervention?.value || selectedPaperForAudit.intervention || "not_found"}
                    </span>
                  </div>
                  {selectedPaperForAudit.evidence?.intervention?.quote && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic">
                      &ldquo;{selectedPaperForAudit.evidence.intervention.quote}&rdquo;
                    </p>
                  )}
                </div>

                {/* Outcomes */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Desfechos Reportados</span>
                    <span className="text-xs font-semibold text-slate-900">
                      {selectedPaperForAudit.evidence?.outcomes?.value || selectedPaperForAudit.outcomes || "not_found"}
                    </span>
                  </div>
                  {selectedPaperForAudit.evidence?.outcomes?.quote && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic">
                      &ldquo;{selectedPaperForAudit.evidence.outcomes.quote}&rdquo;
                    </p>
                  )}
                </div>

                {/* Traceable Quote */}
                {selectedPaperForAudit.traceable_quote && (
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-blue-50/40 space-y-1">
                    <span className="text-xs font-bold text-blue-900 block">Trecho Textual de Validação Rastreável:</span>
                    <p className="text-xs text-blue-950 italic">
                      &ldquo;{selectedPaperForAudit.traceable_quote}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedPaperForAudit(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer transition"
              >
                Fechar Auditoria
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
