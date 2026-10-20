"use client";

import React, { useState } from "react";
import { PrismaMatrixItem, RiskOfBiasLevel } from "@/types";
import {
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Quote,
  Search,
  Award,
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

  const filteredRows = rows.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.citation_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.authors.some((a) => a.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesFilter =
      selectedRiskFilter === "ALL" || r.risk_of_bias === selectedRiskFilter;

    return matchesSearch && matchesFilter;
  });

  const getRiskBadge = (risk: RiskOfBiasLevel) => {
    switch (risk) {
      case "LOW":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={14} className="text-emerald-600" /> Baixo Risco
          </span>
        );
      case "SOME_CONCERNS":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <AlertCircle size={14} className="text-amber-600" /> Algumas Preocupações
          </span>
        );
      case "HIGH":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle size={14} className="text-rose-600" /> Alto Risco de Viés
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs bg-slate-100 text-slate-600 border border-slate-200">
            Não Avaliado
          </span>
        );
    }
  };

  return (
    <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm">
      {/* Table Header Filter Controls */}
      <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-slate-50/70">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filtrar por título, autor ou chave BibTeX..."
              className="pl-10 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 w-72 shadow-sm"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-200/60 p-1 rounded-xl">
            {[
              { id: "ALL", label: "Todos" },
              { id: "LOW", label: "Baixo Risco" },
              { id: "SOME_CONCERNS", label: "Preocupações" },
              { id: "HIGH", label: "Alto Risco" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedRiskFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  selectedRiskFilter === f.id
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="text-sm text-slate-600">
          Exibindo{" "}
          <span className="text-slate-900 font-bold">{filteredRows.length}</span>{" "}
          de <span className="font-semibold">{rows.length}</span> estudos
          incluídos
        </div>
      </div>

      {/* Table Scroll View */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100/80 text-xs font-bold text-slate-600 uppercase tracking-wider">
              <th className="py-4 px-5">Referência & Impacto</th>
              <th className="py-4 px-5">Estudo & Autores</th>
              <th className="py-4 px-5">População (N)</th>
              <th className="py-4 px-5">Intervenção & Desfecho</th>
              <th className="py-4 px-5">Risco de Viés (RoB 2)</th>
              <th className="py-4 px-5">Citação Rastreável (Verbatim)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/80 text-sm">
            {filteredRows.map((row) => (
              <tr
                key={row.paper_id}
                onClick={() => onSelectRow && onSelectRow(row)}
                className="hover:bg-blue-50/30 transition cursor-pointer align-top"
              >
                {/* Citation Key, DOI & Qualis/SJR */}
                <td className="py-4 px-5 whitespace-nowrap">
                  <div className="font-bold text-base text-blue-700">
                    {row.citation_key}
                  </div>
                  <a
                    href={`https://doi.org/${row.doi}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-mono text-slate-500 hover:text-blue-600 inline-flex items-center gap-1 mt-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span>
                      {row.doi.length > 22
                        ? row.doi.slice(0, 22) + "..."
                        : row.doi}
                    </span>
                    <ExternalLink size={12} />
                  </a>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      <Award size={11} className="text-blue-600" />
                      Qualis {row.qualis_capes || "A1"}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      {row.sjr_quartile || "Q1"}
                    </span>
                  </div>
                </td>

                {/* Study Title & Authors */}
                <td className="py-4 px-5 max-w-md">
                  <div className="font-semibold text-slate-900 leading-snug text-sm">
                    {row.title}
                  </div>
                  <div className="text-xs text-slate-500 mt-1.5 font-medium">
                    {row.authors.slice(0, 3).join(", ")} ({row.year}) •{" "}
                    <span className="text-slate-700">
                      {row.journal || "Periódico Indexado"}
                    </span>
                  </div>
                </td>

                {/* Sample N */}
                <td className="py-4 px-5 whitespace-nowrap">
                  <span className="px-3 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 font-semibold text-xs">
                    {row.population_n || "N/A"}
                  </span>
                </td>

                {/* Intervention & Outcomes */}
                <td className="py-4 px-5 max-w-sm space-y-1.5">
                  <div className="text-xs font-semibold text-slate-800">
                    {row.intervention || "Protocolo experimental"}
                  </div>
                  <div className="text-xs text-slate-600 leading-relaxed">
                    {row.outcomes}
                  </div>
                </td>

                {/* Risk of Bias */}
                <td className="py-4 px-5 whitespace-nowrap">
                  {getRiskBadge(row.risk_of_bias)}
                </td>

                {/* Verbatim Quote */}
                <td className="py-4 px-5 max-w-md">
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200/90 text-xs text-slate-700 italic leading-relaxed">
                    <Quote
                      size={14}
                      className="text-blue-600 shrink-0 mt-0.5"
                    />
                    <span>{row.traceable_quote}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
