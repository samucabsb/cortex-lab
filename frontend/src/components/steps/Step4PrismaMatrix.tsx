"use client";

import React, { useState } from "react";
import { useLabStore } from "@/store/useLabStore";
import { PrismaMatrixTable } from "@/components/dashboard/PrismaMatrixTable";
import { KnowledgeGapsCard } from "@/components/dashboard/KnowledgeGapsCard";
import { ExportToolbar } from "@/components/dashboard/ExportToolbar";
import {
  FileSpreadsheet,
  BookOpen,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Layers,
  ShieldCheck,
  Compass,
} from "lucide-react";

interface Step4PrismaMatrixProps {
  onStartNewReview?: () => void;
}

export const Step4PrismaMatrix: React.FC<Step4PrismaMatrixProps> = ({
  onStartNewReview,
}) => {
  const { reviewId, snapshot, resetAll } = useLabStore();
  const [activeTab, setActiveTab] = useState<"matrix" | "gaps">("matrix");

  const matrixRows = snapshot?.prisma_matrix || [];
  const gaps = snapshot?.knowledge_gaps || [];

  const totalStudies = matrixRows.length;
  const lowRiskCount = matrixRows.filter((r) => r.risk_of_bias === "LOW").length;
  const someConcernsCount = matrixRows.filter((r) => r.risk_of_bias === "SOME_CONCERNS").length;
  const highRiskCount = matrixRows.filter((r) => r.risk_of_bias === "HIGH").length;

  const handleReset = () => {
    if (window.confirm("Deseja iniciar uma nova revisão sistemática? A revisão atual permanecerá salva no histórico.")) {
      if (onStartNewReview) {
        onStartNewReview();
      } else {
        resetAll();
      }
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto">
      {/* Editorial Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 size={13} className="text-emerald-600" />
                Síntese Concluída
              </span>
              <span className="text-xs font-mono text-slate-400">
                ID: {reviewId?.slice(0, 8)}...
              </span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {snapshot?.topic || "Revisão Sistemática da Literatura"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Matriz comparativa de evidências segundo o padrão internacional PRISMA 2020 e auditoria de risco de viés Cochrane RoB 2, com proveniência linha por linha.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <ExportToolbar reviewId={reviewId || undefined} />
            <button
              type="button"
              onClick={handleReset}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <RotateCcw size={14} />
              <span>Nova Revisão</span>
            </button>
          </div>
        </div>

        {/* Metric Cards Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-slate-100">
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Estudos Sintetizados
            </span>
            <div className="text-2xl font-bold text-slate-900 font-mono">
              {totalStudies}
            </div>
            <span className="text-[11px] text-slate-500">
              Passaram na triagem humana
            </span>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/70 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block">
              Baixo Risco (RoB 2)
            </span>
            <div className="text-2xl font-bold text-emerald-700 font-mono">
              {lowRiskCount}
            </div>
            <span className="text-[11px] text-emerald-600">
              Alta confiabilidade metodológica
            </span>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/70 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 block">
              Preocupações / Alto Risco
            </span>
            <div className="text-2xl font-bold text-amber-700 font-mono">
              {someConcernsCount + highRiskCount}
            </div>
            <span className="text-[11px] text-amber-600">
              Auditados com justificativa
            </span>
          </div>

          <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200/70 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800 block">
              Knowledge Gaps
            </span>
            <div className="text-2xl font-bold text-purple-700 font-mono">
              {gaps.length}
            </div>
            <span className="text-[11px] text-purple-600">
              Hipóteses ancoradas na literatura
            </span>
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("matrix")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === "matrix"
              ? "bg-slate-900 text-white shadow-sm"
              : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900"
          }`}
        >
          <Layers size={14} />
          <span>Matriz de Síntese PRISMA 2020 ({matrixRows.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("gaps")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === "gaps"
              ? "bg-purple-900 text-white shadow-sm"
              : "bg-white border border-slate-200 text-slate-600 hover:text-purple-700"
          }`}
        >
          <Sparkles size={14} />
          <span>Lacunas Científicas & Hipóteses ({gaps.length})</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "matrix" ? (
        <div className="space-y-6">
          <PrismaMatrixTable rows={matrixRows} />

          {/* Scientific Integrity Notice */}
          <div className="p-4 rounded-2xl bg-slate-100/70 border border-slate-200 flex items-start gap-3 text-xs text-slate-600">
            <ShieldCheck size={18} className="text-blue-700 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-slate-800">
                Garantia de Proveniência Científica (Zero-Fake Policy):
              </span>
              <p>
                Todos os dados apresentados nesta matriz foram extraídos dos resumos e textos completos indexados via OpenAlex e Europe PMC. Cada célula possui vínculo com citação literal (verbatim quote) e DOI verificado na Crossref REST API v1. Nenhum dado foi inferido ou sintetizado sem ancoragem textual.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <KnowledgeGapsCard gaps={gaps} />
        </div>
      )}
    </div>
  );
};
