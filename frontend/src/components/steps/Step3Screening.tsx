"use client";

import React, { useState, useMemo } from "react";
import {
  ReviewSnapshot,
  PaperItem,
  ScreeningDecisionInput,
  BiasDecisionInput,
} from "@/types";
import { submitScreeningDecision, submitBiasDecision } from "@/lib/api";
import { useLabStore } from "@/store/useLabStore";
import {
  CheckCircle2,
  XCircle,
  ExternalLink,
  FileText,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  Search,
  Sparkles,
  Send,
  Loader2,
  Filter,
  Check,
} from "lucide-react";

interface Step3ScreeningProps {
  onDecisionsSubmitted?: () => void;
}

const COMMON_EXCLUSION_REASONS = [
  "População não aderente ao PICO",
  "Intervenção diferente da definida no protocolo",
  "Sem grupo comparador adequado",
  "Desfechos não reportados quantitativamente",
  "Desenho de estudo não elegível (ex: carta/comentário)",
  "Artigo duplicado ou sobreposto",
  "Texto completo inacessível após busca avançada",
];

export const Step3Screening: React.FC<Step3ScreeningProps> = ({
  onDecisionsSubmitted,
}) => {
  const { reviewId, snapshot, setSnapshot, byok, setWizardStep } = useLabStore();

  const hitl = snapshot?.hitl;
  const isBiasCheckpoint = hitl?.checkpoint === "bias_arbitration";

  // --- State for Screening Checkpoint ---
  const rawPapers = useMemo(() => snapshot?.raw_papers || [], [snapshot?.raw_papers]);
  
  // Local screening decisions: paper_id -> { decision: 'include' | 'exclude', reason?: string }
  const [decisions, setDecisions] = useState<Record<string, { decision: "include" | "exclude"; reason?: string }>>({});
  const [activeExclusionModalPaperId, setActiveExclusionModalPaperId] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState("");
  const [expandedAbstracts, setExpandedAbstracts] = useState<Record<string, boolean>>({});
  const [filterMode, setFilterMode] = useState<"all" | "pending" | "included" | "excluded">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // --- State for Bias Arbitration Checkpoint ---
  const flaggedPapers = useMemo(() => hitl?.flagged || [], [hitl?.flagged]);
  const [biasDecisions, setBiasDecisions] = useState<
    Record<string, { risk_of_bias: "LOW" | "SOME_CONCERNS" | "HIGH"; justification: string }>
  >({});

  // Submitting state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Initialize or reconcile decisions with any existing screening_log
  React.useEffect(() => {
    if (snapshot?.screening_log && snapshot.screening_log.length > 0) {
      const initial: Record<string, { decision: "include" | "exclude"; reason?: string }> = {};
      snapshot.screening_log.forEach((item) => {
        initial[item.paper_id] = {
          decision: item.decision === "include" ? "include" : "exclude",
          reason: item.reason,
        };
      });
      setDecisions((prev) => ({ ...initial, ...prev }));
    }
  }, [snapshot?.screening_log]);

  // Statistics for Screening
  const totalPapers = rawPapers.length;
  const includedCount = Object.values(decisions).filter((d) => d.decision === "include").length;
  const excludedCount = Object.values(decisions).filter((d) => d.decision === "exclude").length;
  const decidedCount = includedCount + excludedCount;
  const pendingCount = Math.max(0, totalPapers - decidedCount);
  const isScreeningComplete = totalPapers > 0 && decidedCount === totalPapers;

  // Statistics for Bias Arbitration
  const totalFlagged = flaggedPapers.length;
  const biasDecidedCount = Object.keys(biasDecisions).filter(
    (k) => biasDecisions[k].justification.trim().length >= 5
  ).length;
  const isBiasComplete = totalFlagged > 0 && biasDecidedCount === totalFlagged;

  const handleIncludePaper = (paperId: string) => {
    setDecisions((prev) => ({
      ...prev,
      [paperId]: { decision: "include" },
    }));
    if (activeExclusionModalPaperId === paperId) {
      setActiveExclusionModalPaperId(null);
    }
  };

  const handleOpenExcludeModal = (paperId: string) => {
    setActiveExclusionModalPaperId(paperId);
    setCustomReason(decisions[paperId]?.reason || "");
  };

  const handleConfirmExclude = (paperId: string, reason: string) => {
    if (!reason.trim()) return;
    setDecisions((prev) => ({
      ...prev,
      [paperId]: { decision: "exclude", reason: reason.trim() },
    }));
    setActiveExclusionModalPaperId(null);
    setCustomReason("");
  };

  const handleBatchIncludeRemaining = () => {
    const next = { ...decisions };
    rawPapers.forEach((p) => {
      if (!next[p.id]) {
        next[p.id] = { decision: "include" };
      }
    });
    setDecisions(next);
  };

  const toggleAbstract = (paperId: string) => {
    setExpandedAbstracts((prev) => ({
      ...prev,
      [paperId]: !prev[paperId],
    }));
  };

  const filteredPapers = useMemo(() => {
    return rawPapers.filter((paper) => {
      const decision = decisions[paper.id]?.decision;
      if (filterMode === "pending" && decision) return false;
      if (filterMode === "included" && decision !== "include") return false;
      if (filterMode === "excluded" && decision !== "exclude") return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = paper.title.toLowerCase().includes(q);
        const authorMatch = paper.authors.some((a) => a.toLowerCase().includes(q));
        const doiMatch = paper.doi?.toLowerCase().includes(q);
        return titleMatch || authorMatch || doiMatch;
      }
      return true;
    });
  }, [rawPapers, decisions, filterMode, searchQuery]);

  // Submit Screening to Backend
  const handleSubmitScreening = async () => {
    if (!reviewId || !isScreeningComplete) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const payload: ScreeningDecisionInput[] = rawPapers.map((p) => ({
      paper_id: p.id,
      decision: decisions[p.id].decision,
      reason: decisions[p.id].reason,
    }));

    try {
      await submitScreeningDecision(reviewId, payload, {
        byokGeminiKey: byok.geminiApiKey || undefined,
        byokGroqKey: byok.groqApiKey || undefined,
      });

      // Update local snapshot status to running
      if (snapshot) {
        setSnapshot({
          ...snapshot,
          status: "RUNNING",
          hitl: null,
        });
      }

      // Automatically return to Telemetry (Step 2) to watch the Methodologist and Synthesizer agents run
      setWizardStep(2);
      if (onDecisionsSubmitted) onDecisionsSubmitted();
    } catch (err: any) {
      setSubmitError(err.message || "Erro ao enviar decisões de triagem.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Bias Decisions to Backend
  const handleSubmitBias = async () => {
    if (!reviewId || !isBiasComplete) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const payload: BiasDecisionInput[] = flaggedPapers.map((fp) => ({
      paper_id: fp.paper_id,
      risk_of_bias: biasDecisions[fp.paper_id]?.risk_of_bias || "SOME_CONCERNS",
      justification: biasDecisions[fp.paper_id]?.justification || "Avaliação metodológica humana.",
    }));

    try {
      await submitBiasDecision(reviewId, payload, {
        byokGeminiKey: byok.geminiApiKey || undefined,
        byokGroqKey: byok.groqApiKey || undefined,
      });

      if (snapshot) {
        setSnapshot({
          ...snapshot,
          status: "RUNNING",
          hitl: null,
        });
      }

      setWizardStep(2);
      if (onDecisionsSubmitted) onDecisionsSubmitted();
    } catch (err: any) {
      setSubmitError(err.message || "Erro ao registrar decisões de viés.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDoiStatusBadge = (status: PaperItem["doi_status"]) => {
    switch (status) {
      case "verified":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShieldCheck size={11} className="text-emerald-600" /> Crossref Validado
          </span>
        );
      case "title_mismatch":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
            <ShieldAlert size={11} className="text-amber-600" /> Título Divergente
          </span>
        );
      case "not_found":
      case "invalid":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
            DOI Não Encontrado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
            DOI Não Verificado
          </span>
        );
    }
  };

  // =========================================================================
  // VIEW: BIAS ARBITRATION CHECKPOINT (Cochrane RoB 2)
  // =========================================================================
  if (isBiasCheckpoint) {
    return (
      <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
        {/* Header Banner */}
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-100 rounded-xl text-amber-800 shrink-0">
              <AlertTriangle size={24} />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                Ponto de Controle Cochrane RoB 2 • Arbitragem Humana Soberana
              </span>
              <h2 className="font-serif text-2xl font-bold text-slate-900">
                Auditoria de Risco Metodológico
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">
                A Dra. Cochrane e o Dr. Fitz identificaram indícios metodológicos que exigem o julgamento crítico do pesquisador antes da síntese final (ex.: cegamento não informado, N amostral reduzido ou potencial viés de atrito).
              </p>
            </div>
          </div>
        </div>

        {/* Flagged Papers List */}
        <div className="space-y-6">
          {flaggedPapers.map((item, index) => {
            const currentDecision = biasDecisions[item.paper_id] || {
              risk_of_bias: "SOME_CONCERNS",
              justification: "",
            };

            return (
              <div
                key={item.paper_id}
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-mono font-semibold text-slate-400">
                      Estudo Flagged #{index + 1}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 leading-snug">
                      {item.title}
                    </h3>
                    {item.doi && (
                      <a
                        href={`https://doi.org/${item.doi}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-mono text-blue-600 hover:underline"
                      >
                        doi:{item.doi} <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                </div>

                {/* Attention Cues Detected by Agent */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Sinais de Alerta Metodológico Detectados pelos Agentes:
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-xs text-slate-700">
                    {item.attention_cues?.map((cue, cIdx) => (
                      <li key={cIdx} className="font-medium">
                        {cue}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* RoB 2 Judgment Selector */}
                <div className="space-y-3 pt-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                    Seu Julgamento Soberano de Risco de Viés (Cochrane RoB 2):
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      {
                        value: "LOW",
                        label: "Baixo Risco",
                        desc: "Limitações não comprometem a validade dos achados.",
                        color: "border-emerald-300 bg-emerald-50/50 text-emerald-900",
                        activeColor: "border-emerald-500 bg-emerald-100 ring-2 ring-emerald-500",
                      },
                      {
                        value: "SOME_CONCERNS",
                        label: "Algumas Preocupações",
                        desc: "Possíveis vieses com impacto moderado ou omissão de detalhes.",
                        color: "border-amber-300 bg-amber-50/50 text-amber-900",
                        activeColor: "border-amber-500 bg-amber-100 ring-2 ring-amber-500",
                      },
                      {
                        value: "HIGH",
                        label: "Alto Risco de Viés",
                        desc: "Falhas graves de desenho ou ausência crítica de controle.",
                        color: "border-rose-300 bg-rose-50/50 text-rose-900",
                        activeColor: "border-rose-500 bg-rose-100 ring-2 ring-rose-500",
                      },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setBiasDecisions((prev) => ({
                            ...prev,
                            [item.paper_id]: {
                              ...currentDecision,
                              risk_of_bias: opt.value as any,
                            },
                          }))
                        }
                        className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                          currentDecision.risk_of_bias === opt.value
                            ? opt.activeColor
                            : `${opt.color} hover:bg-slate-100/60`
                        }`}
                      >
                        <div className="font-bold text-sm flex items-center justify-between">
                          <span>{opt.label}</span>
                          {currentDecision.risk_of_bias === opt.value && <Check size={16} />}
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                          {opt.desc}
                        </p>
                      </button>
                    ))}
                  </div>

                  {/* Justification input */}
                  <div className="space-y-1.5 pt-2">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Justificativa Científica (obrigatória para o registro PRISMA/Cochrane):
                    </label>
                    <textarea
                      value={currentDecision.justification}
                      onChange={(e) =>
                        setBiasDecisions((prev) => ({
                          ...prev,
                          [item.paper_id]: {
                            ...currentDecision,
                            justification: e.target.value,
                          },
                        }))
                      }
                      rows={2}
                      placeholder="Ex: O ensaio não relata claramente se a alocação foi mascarada, contudo os desfechos primários são objetivos (dosagens laboratoriais) reduzindo o viés de detecção."
                      className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Submit Actions */}
        {submitError && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {submitError}
          </div>
        )}

        <div className="flex items-center justify-between p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="text-xs text-slate-500">
            Estudos avaliados:{" "}
            <span className="font-bold text-slate-800">
              {biasDecidedCount} de {totalFlagged}
            </span>
          </div>

          <button
            type="button"
            disabled={!isBiasComplete || isSubmitting}
            onClick={handleSubmitBias}
            className={`px-6 py-3 rounded-xl font-semibold text-sm flex items-center gap-2 transition shadow-sm ${
              isBiasComplete && !isSubmitting
                ? "bg-slate-900 hover:bg-slate-800 text-white cursor-pointer active:scale-95"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Registrando Julgamento...</span>
              </>
            ) : (
              <>
                <Send size={16} />
                <span>Confirmar Avaliações e Sintetizar PRISMA</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW: PRIMARY SCREENING CHECKPOINT (Inclusão / Exclusão de Títulos e Abstracts)
  // =========================================================================
  return (
    <div className="space-y-6 animate-fadeIn max-w-6xl mx-auto">
      {/* Sticky Top Status / Progress Bar */}
      <div className="sticky top-20 z-20 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="space-y-0.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Triagem Soberana PRISMA 2020
            </span>
            <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Progresso: {decidedCount} de {totalPapers} artigos avaliados</span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {Math.round((decidedCount / Math.max(1, totalPapers)) * 100)}%
              </span>
            </div>
          </div>

          {/* Quick counts */}
          <div className="hidden sm:flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
              {includedCount} incluídos
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 font-semibold border border-rose-200">
              {excludedCount} excluídos
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold border border-slate-200">
              {pendingCount} pendentes
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <button
              type="button"
              onClick={handleBatchIncludeRemaining}
              className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              title="Marca todos os artigos pendentes como incluídos para revisão detalhada"
            >
              Incluir Pendentes
            </button>
          )}

          <button
            type="button"
            disabled={!isScreeningComplete || isSubmitting}
            onClick={handleSubmitScreening}
            className={`px-5 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-2 transition shadow-sm ${
              isScreeningComplete && !isSubmitting
                ? "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Enviando Decisões...</span>
              </>
            ) : (
              <>
                <Send size={14} />
                <span>Prosseguir para Auditoria Metodológica</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Protocol Banner & Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-serif text-lg font-bold text-slate-900">
              Estação de Triagem Metodológica
            </h3>
            <p className="text-xs text-slate-500">
              Avalie título, abstract e metadados. Exclusões exigem justificativa rastreável no relatório PRISMA.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar título, autor ou DOI..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 bg-slate-50/50"
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 mr-2">
            <Filter size={13} /> Filtrar visualização:
          </span>
          {[
            { id: "all", label: `Todos (${rawPapers.length})` },
            { id: "pending", label: `Pendentes (${pendingCount})` },
            { id: "included", label: `Incluídos (${includedCount})` },
            { id: "excluded", label: `Excluídos (${excludedCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterMode(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                filterMode === tab.id
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {submitError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
          {submitError}
        </div>
      )}

      {/* Papers Feed */}
      {filteredPapers.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl p-8 space-y-3">
          <FileText size={36} className="mx-auto text-slate-300" />
          <h4 className="font-bold text-slate-800 text-sm">Nenhum estudo encontrado neste filtro</h4>
          <p className="text-xs text-slate-500">Ajuste o filtro acima ou pesquise outro termo.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPapers.map((paper, idx) => {
            const decision = decisions[paper.id]?.decision;
            const reason = decisions[paper.id]?.reason;
            const isExpanded = !!expandedAbstracts[paper.id];
            const isExcludeModalOpen = activeExclusionModalPaperId === paper.id;

            return (
              <div
                key={paper.id}
                className={`bg-white border rounded-2xl p-5 shadow-sm transition space-y-4 ${
                  decision === "include"
                    ? "border-emerald-300 ring-1 ring-emerald-200/50 bg-emerald-50/20"
                    : decision === "exclude"
                    ? "border-rose-300 ring-1 ring-rose-200/50 bg-rose-50/20 opacity-80"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                {/* Header: DOIs, badges, actions */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-400">
                      #{idx + 1}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      {paper.source_api}
                    </span>
                    {getDoiStatusBadge(paper.doi_status)}
                    {paper.citation_count > 0 && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {paper.citation_count} citações
                      </span>
                    )}
                  </div>

                  {/* Decision Action Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleIncludePaper(paper.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                        decision === "include"
                          ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500"
                          : "bg-white border border-slate-300 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300"
                      }`}
                    >
                      <CheckCircle2 size={14} className={decision === "include" ? "text-white" : "text-emerald-600"} />
                      <span>{decision === "include" ? "Incluído" : "Incluir"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenExcludeModal(paper.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                        decision === "exclude"
                          ? "bg-rose-600 text-white shadow-sm ring-2 ring-rose-500"
                          : "bg-white border border-slate-300 text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300"
                      }`}
                    >
                      <XCircle size={14} className={decision === "exclude" ? "text-white" : "text-rose-600"} />
                      <span>{decision === "exclude" ? "Excluído" : "Excluir"}</span>
                    </button>
                  </div>
                </div>

                {/* Title & Metadata */}
                <div className="space-y-1">
                  <h4 className="font-serif text-base font-bold text-slate-900 leading-snug">
                    {paper.title}
                  </h4>
                  <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500 font-medium">
                    <span>{paper.authors?.slice(0, 4).join(", ") || "Autores não listados"}</span>
                    {paper.year && <span>• ({paper.year})</span>}
                    {paper.journal && <span>• <span className="text-slate-700">{paper.journal}</span></span>}
                  </div>
                </div>

                {/* Links: DOI and Open Access PDF */}
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  {paper.doi ? (
                    <a
                      href={`https://doi.org/${paper.doi}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      doi:{paper.doi} <ExternalLink size={11} />
                    </a>
                  ) : (
                    <span className="font-mono text-slate-400">Sem DOI registrado</span>
                  )}

                  {paper.open_access_pdf_url && (
                    <a
                      href={paper.open_access_pdf_url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-0.5 rounded-md border border-emerald-200 inline-flex items-center gap-1 transition"
                    >
                      <FileText size={11} />
                      <span>PDF Open Access</span>
                      <ExternalLink size={10} />
                    </a>
                  )}
                </div>

                {/* Abstract Preview / Accordion */}
                {paper.abstract ? (
                  <div className="space-y-1 pt-1">
                    <p
                      className={`text-xs text-slate-600 leading-relaxed ${
                        isExpanded ? "" : "line-clamp-3"
                      }`}
                    >
                      {paper.abstract}
                    </p>
                    <button
                      type="button"
                      onClick={() => toggleAbstract(paper.id)}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-0.5 cursor-pointer pt-0.5"
                    >
                      {isExpanded ? (
                        <>
                          <span>Recolher resumo</span>
                          <ChevronUp size={12} />
                        </>
                      ) : (
                        <>
                          <span>Ler resumo completo</span>
                          <ChevronDown size={12} />
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic">
                    Resumo textual não fornecido pela API de origem.
                  </div>
                )}

                {/* Exclusion Reason Display if already marked */}
                {decision === "exclude" && reason && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium flex items-center gap-2">
                    <span className="font-bold">Motivo de Exclusão PRISMA:</span>
                    <span>{reason}</span>
                  </div>
                )}

                {/* Inline Exclusion Reason Selector Modal/Drawer */}
                {isExcludeModalOpen && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-rose-200 space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-rose-800">
                        Selecione a Justificativa Científica de Exclusão
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveExclusionModalPaperId(null)}
                        className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {COMMON_EXCLUSION_REASONS.map((commReason) => (
                        <button
                          key={commReason}
                          type="button"
                          onClick={() => handleConfirmExclude(paper.id, commReason)}
                          className="p-2 text-left text-xs rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-300 text-slate-700 transition cursor-pointer"
                        >
                          {commReason}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={customReason}
                        onChange={(e) => setCustomReason(e.target.value)}
                        placeholder="Ou digite uma justificativa personalizada..."
                        className="flex-1 text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-rose-400"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && customReason.trim()) {
                            handleConfirmExclude(paper.id, customReason);
                          }
                        }}
                      />
                      <button
                        type="button"
                        disabled={!customReason.trim()}
                        onClick={() => handleConfirmExclude(paper.id, customReason)}
                        className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-semibold cursor-pointer transition"
                      >
                        Confirmar Exclusão
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
