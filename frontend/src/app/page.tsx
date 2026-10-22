"use client";

import React, { useEffect, useCallback, useMemo, useState } from "react";
import { useLabStore } from "@/store/useLabStore";
import { useReviewStream } from "@/hooks/useReviewStream";
import { getReview } from "@/lib/api";
import { PicoData, ScientistCardInfo, ScientistId } from "@/types";
import { PixelLabRoom } from "@/components/spatial/PixelLabRoom";
import { Step1PicoDefinition } from "@/components/steps/Step1PicoDefinition";
import { AgentWorkflowTelemetry } from "@/components/steps/AgentWorkflowTelemetry";
import { Step3Screening } from "@/components/steps/Step3Screening";
import { Step4PrismaMatrix } from "@/components/steps/Step4PrismaMatrix";
import { ByokConfigModal } from "@/components/settings/ByokConfigModal";
import {
  Key,
  ShieldCheck,
  CheckCircle2,
  RotateCcw,
  Type,
  Contrast,
  PauseCircle,
  PlayCircle,
} from "lucide-react";

export default function CortexLabHomePage() {
  const {
    hasHydrated,
    hydrateFromStorage,
    reviewId,
    setReviewId,
    snapshot,
    setSnapshot,
    wizardStep,
    setWizardStep,
    byok,
    setByokModalOpen,
    a11y,
    updateA11y,
    resetAll,
  } = useLabStore();

  // Preview state from Step 1 while the user is filling out PICO
  const [step1Preview, setStep1Preview] = useState<{
    pico: PicoData;
    queries: string[];
    busy: boolean;
  }>({
    pico: { population: "", intervention: "", comparator: "", outcome: "" },
    queries: [],
    busy: false,
  });

  // 1. Hydrate localStorage after mount to avoid React SSR Hydration Mismatch
  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  // 2. Apply Accessibility Attributes to <html> element
  useEffect(() => {
    if (typeof document === "undefined") return;
    const html = document.documentElement;
    html.dataset.fontScale = a11y.fontScale;
    html.dataset.highContrast = String(a11y.highContrast);
    html.dataset.reducedMotion = String(a11y.reducedMotion);
  }, [a11y]);

  const hasByokKeys = hasHydrated && Boolean(byok.geminiApiKey || byok.groqApiKey);

  // Fetch snapshot from backend WITHOUT forcing abrupt screen cuts!
  // Screen transitions are paced by the PixelLabRoom choreography milestone (or manual click).
  const refreshSnapshot = useCallback(
    async (id: string) => {
      try {
        const data = await getReview(id);
        setSnapshot(data);
      } catch (err) {
        console.warn("[page] Failed to refresh snapshot:", err);
      }
    },
    [setSnapshot]
  );

  // Connect SSE Stream for real-time telemetry events
  const { events, isConnected, resetEvents } = useReviewStream(reviewId, {
    onStatusChange: () => {
      if (reviewId) {
        refreshSnapshot(reviewId);
      }
    },
    onEvent: (event) => {
      if (
        event.kind === "run_paused" ||
        event.kind === "screening_checkpoint" ||
        event.kind === "bias_checkpoint" ||
        event.kind === "run_completed"
      ) {
        if (reviewId) {
          refreshSnapshot(reviewId);
        }
      }
    },
  });

  // Initial load of review snapshot when reviewId is mounted
  useEffect(() => {
    if (reviewId && !snapshot) {
      refreshSnapshot(reviewId);
    }
  }, [reviewId, snapshot, refreshSnapshot]);

  // Background poll if review is active
  useEffect(() => {
    if (!reviewId || snapshot?.status === "COMPLETED") return;
    const interval = setInterval(() => {
      refreshSnapshot(reviewId);
    }, 3000);
    return () => clearInterval(interval);
  }, [reviewId, snapshot?.status, refreshSnapshot]);

  const handleReviewCreated = (newReviewId: string) => {
    resetEvents();
    setReviewId(newReviewId);
    setWizardStep(2);
    refreshSnapshot(newReviewId);
  };

  // Smooth milestone callback from PixelLabRoom: transitions only AFTER the visual act completes!
  const handleRoomMilestone = useCallback(
    (milestone: "screening_ready" | "bias_ready" | "prisma_ready") => {
      if (milestone === "screening_ready" || milestone === "bias_ready") {
        setWizardStep(3);
      } else if (milestone === "prisma_ready") {
        setWizardStep(4);
      }
    },
    [setWizardStep]
  );

  // Compute unified Scientist statuses for the persistent PixelLabRoom
  const unifiedScientists = useMemo<Record<ScientistId, ScientistCardInfo>>(() => {
    const filledPico = [
      step1Preview.pico.population,
      step1Preview.pico.intervention,
      step1Preview.pico.comparator,
      step1Preview.pico.outcome,
    ].filter((s) => s.trim().length > 0).length;

    const base: Record<ScientistId, ScientistCardInfo> = {
      turing: {
        id: "turing",
        agentKey: "coordinator",
        name: "Dr. Turing",
        role: "PI Coordinator",
        affiliation: "Protocolo & PICO",
        avatarInitials: "AT",
        status: !reviewId
          ? step1Preview.busy
            ? "WORKING"
            : filledPico === 4
            ? "COMPLETED"
            : "IDLE"
          : "WORKING",
        lastAction: !reviewId
          ? "Estruturando protocolo PICO..."
          : "Protocolo PICO validado.",
        metricLabel: "PICO",
        metricValue: !reviewId
          ? `${filledPico}/4`
          : snapshot?.boolean_queries?.length || 1,
      },
      ada: {
        id: "ada",
        agentKey: "searcher",
        name: "Dra. Ada",
        role: "Literature Searcher",
        affiliation: "OpenAlex & Europe PMC",
        avatarInitials: "AL",
        status: "IDLE",
        lastAction: "Pronta para busca federada...",
        metricLabel: "Artigos",
        metricValue: snapshot?.raw_papers?.length || 0,
      },
      cross: {
        id: "cross",
        agentKey: "validator",
        name: "Dr. Cross",
        role: "DOI Validator",
        affiliation: "Crossref REST API",
        avatarInitials: "CR",
        status: "IDLE",
        lastAction: "Aguardando checagem de DOIs...",
        metricLabel: "DOIs",
        metricValue:
          snapshot?.raw_papers?.filter((p) => p.doi_verified).length || 0,
      },
      fitz: {
        id: "fitz",
        agentKey: "extractor",
        name: "Dr. Fitz",
        role: "Statistical Extractor",
        affiliation: "Amostra N & p-valores",
        avatarInitials: "PF",
        status: "IDLE",
        lastAction: "Aguardando aprovação na triagem...",
        metricLabel: "Extraídos",
        metricValue: snapshot?.audited_papers?.length || 0,
      },
      cochrane: {
        id: "cochrane",
        agentKey: "bias_auditor",
        name: "Dra. Cochrane",
        role: "RoB 2 Auditor",
        affiliation: "Cochrane RoB 2",
        avatarInitials: "AC",
        status: "IDLE",
        lastAction: "Aguardando extração metodológica...",
        metricLabel: "RoB 2",
        metricValue:
          snapshot?.hitl?.checkpoint === "bias_arbitration"
            ? snapshot?.hitl?.flagged?.length || 1
            : snapshot?.audited_papers?.length || 0,
      },
      rosalind: {
        id: "rosalind",
        agentKey: "synthesizer",
        name: "Dra. Rosalind",
        role: "PRISMA Synthesizer",
        affiliation: "Matriz PRISMA 2020",
        avatarInitials: "RF",
        status: "IDLE",
        lastAction: "Aguardando síntese final...",
        metricLabel: "PRISMA",
        metricValue: snapshot?.prisma_matrix?.length || 0,
      },
    };

    if (!reviewId) return base;

    for (const ev of events) {
      if (ev.agent === "coordinator") {
        base.turing.lastAction = ev.message;
        if (ev.kind === "node_started") base.turing.status = "WORKING";
        if (ev.kind === "protocol_registered" || ev.status === "COMPLETED")
          base.turing.status = "COMPLETED";
      }
      if (ev.agent === "searcher") {
        base.ada.lastAction = ev.message;
        if (ev.kind === "node_started" || ev.kind === "api_call_started")
          base.ada.status = "WORKING";
        if (ev.data?.papers_total !== undefined)
          base.ada.metricValue = ev.data.papers_total;
        if (ev.kind === "node_finished" || ev.status === "COMPLETED")
          base.ada.status = "COMPLETED";
      }
      if (ev.agent === "validator") {
        base.cross.lastAction = ev.message;
        if (ev.kind === "node_started" || ev.kind === "doi_check")
          base.cross.status = "WORKING";
        if (ev.data?.verified !== undefined)
          base.cross.metricValue = ev.data.verified;
        if (ev.kind === "node_finished" || ev.status === "COMPLETED")
          base.cross.status = "COMPLETED";
      }
      if (ev.agent === "extractor") {
        base.fitz.lastAction = ev.message;
        if (ev.kind === "node_started" || ev.kind === "paper_extracted")
          base.fitz.status = "WORKING";
        if (ev.data?.processed !== undefined)
          base.fitz.metricValue = ev.data.processed;
        if (ev.kind === "node_finished" || ev.status === "COMPLETED")
          base.fitz.status = "COMPLETED";
      }
      if (ev.agent === "bias_auditor") {
        base.cochrane.lastAction = ev.message;
        if (ev.kind === "node_started" || ev.kind === "bias_signal")
          base.cochrane.status = "WORKING";
        if (ev.status === "WAITING_HUMAN")
          base.cochrane.status = "WAITING_HUMAN";
        if (ev.kind === "node_finished" && ev.status !== "WAITING_HUMAN")
          base.cochrane.status = "COMPLETED";
      }
      if (ev.agent === "synthesizer") {
        base.rosalind.lastAction = ev.message;
        if (ev.kind === "node_started") base.rosalind.status = "WORKING";
        if (ev.kind === "node_finished" || ev.status === "COMPLETED")
          base.rosalind.status = "COMPLETED";
        if (ev.data?.matrix_rows !== undefined)
          base.rosalind.metricValue = ev.data.matrix_rows;
      }
    }

    if (snapshot) {
      if (snapshot.status === "AWAITING_HUMAN") {
        if (snapshot.hitl?.checkpoint === "screening") {
          base.turing.status = "COMPLETED";
          base.ada.status = "COMPLETED";
          base.cross.status = "COMPLETED";
        } else if (snapshot.hitl?.checkpoint === "bias_arbitration") {
          base.turing.status = "COMPLETED";
          base.ada.status = "COMPLETED";
          base.cross.status = "COMPLETED";
          base.fitz.status = "COMPLETED";
          base.cochrane.status = "WAITING_HUMAN";
        }
      }
      if (snapshot.status === "COMPLETED") {
        base.turing.status = "COMPLETED";
        base.ada.status = "COMPLETED";
        base.cross.status = "COMPLETED";
        base.fitz.status = "COMPLETED";
        base.cochrane.status = "COMPLETED";
        base.rosalind.status = "COMPLETED";
      }
    }

    return base;
  }, [reviewId, step1Preview, events, snapshot]);

  const isStep2Unlocked = Boolean(reviewId);
  const isStep3Unlocked = Boolean(
    snapshot?.raw_papers && snapshot.raw_papers.length > 0
  );
  const isStep4Unlocked = Boolean(
    snapshot?.status === "COMPLETED" ||
      (snapshot?.prisma_matrix && snapshot.prisma_matrix.length > 0)
  );

  const cycleFontScale = () => {
    const order: Array<"normal" | "large" | "xlarge"> = [
      "normal",
      "large",
      "xlarge",
    ];
    const next =
      order[(order.indexOf(a11y.fontScale) + 1) % order.length];
    updateA11y({ fontScale: next });
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Skip to content link for keyboard accessibility */}
      <a
        href="#bancada-principal"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:rounded-xl focus:bg-blue-700 focus:text-white focus:font-bold"
      >
        Pular para a bancada principal
      </a>

      {/* Editorial Header + Accessibility Controls */}
      <header className="sticky top-0 z-40 bg-[#FAF9F6]/95 backdrop-blur-md border-b border-slate-200/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white font-serif font-black flex items-center justify-center text-lg shadow-sm">
              C
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-base tracking-tight text-slate-900">
                  CortexLab
                </span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                  PRISMA 2020
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden md:block">
                Revisão Sistemática Assistida por Agentes • OpenAlex, PubMed & Crossref
              </p>
            </div>
          </div>

          {/* Right Header Actions: Accessibility Toolbar + AI Key + Reset */}
          <div className="flex items-center gap-2">
            {/* Accessibility Bar (WCAG AA) */}
            <div
              role="group"
              aria-label="Controles de Acessibilidade"
              className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-sm"
            >
              <button
                type="button"
                onClick={cycleFontScale}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer flex items-center gap-1"
                title="Alterar tamanho da fonte para leitura de artigos (Normal / Grande / Extra Grande)"
                aria-label={`Tamanho da fonte: ${a11y.fontScale}`}
              >
                <Type size={13} aria-hidden="true" />
                <span>
                  {a11y.fontScale === "normal"
                    ? "A"
                    : a11y.fontScale === "large"
                    ? "A+"
                    : "A++"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => updateA11y({ highContrast: !a11y.highContrast })}
                aria-pressed={a11y.highContrast}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                  a11y.highContrast
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
                title="Alternar modo de Alto Contraste Acadêmico"
              >
                <Contrast size={13} aria-hidden="true" />
                <span className="hidden lg:inline">Contraste</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  updateA11y({ reducedMotion: !a11y.reducedMotion })
                }
                aria-pressed={a11y.reducedMotion}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                  a11y.reducedMotion
                    ? "bg-amber-100 text-amber-900"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
                title={
                  a11y.reducedMotion
                    ? "Reativar animações da sala"
                    : "Pausar animações para leitura focada"
                }
              >
                {a11y.reducedMotion ? (
                  <PlayCircle size={13} aria-hidden="true" />
                ) : (
                  <PauseCircle size={13} aria-hidden="true" />
                )}
                <span className="hidden lg:inline">
                  {a11y.reducedMotion ? "Animações Pausadas" : "Pausar Animações"}
                </span>
              </button>
            </div>

            {/* AI Key Configuration Button (SSR-safe via hasHydrated) */}
            <button
              type="button"
              onClick={() => setByokModalOpen(true)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border shadow-sm ${
                hasByokKeys
                  ? "bg-white border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                  : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Key
                size={13}
                className={hasByokKeys ? "text-emerald-600" : "text-slate-400"}
                aria-hidden="true"
              />
              <span className="hidden sm:inline">Configurar IA</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  hasByokKeys ? "bg-emerald-500" : "bg-slate-300"
                }`}
              />
            </button>

            {/* Reset Review Button if Active */}
            {reviewId && (
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      "Deseja iniciar uma nova revisão sistemática?"
                    )
                  ) {
                    resetEvents();
                    resetAll();
                  }
                }}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition cursor-pointer flex items-center gap-1"
                title="Reiniciar revisão"
              >
                <RotateCcw size={13} aria-hidden="true" />
                <span className="hidden sm:inline">Nova Pesquisa</span>
              </button>
            )}
          </div>
        </div>

        {/* 4-Step Editorial Stepper Bar */}
        <div className="border-t border-slate-200/60 bg-white/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav
              aria-label="Etapas da Revisão Sistemática"
              className="flex items-center justify-between sm:justify-start sm:gap-6 overflow-x-auto py-2 text-xs font-medium no-scrollbar"
            >
              {/* Step 1 */}
              <button
                type="button"
                aria-current={wizardStep === 1 ? "step" : undefined}
                onClick={() => setWizardStep(1)}
                className={`flex items-center gap-2 py-1.5 px-3 rounded-xl transition whitespace-nowrap cursor-pointer ${
                  wizardStep === 1
                    ? "bg-slate-900 text-white font-bold shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono ${
                    wizardStep === 1
                      ? "bg-white text-slate-900 font-bold"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  1
                </span>
                <span>Pergunta PICO</span>
              </button>

              {/* Step 2 */}
              <button
                type="button"
                disabled={!isStep2Unlocked}
                aria-current={wizardStep === 2 ? "step" : undefined}
                onClick={() => isStep2Unlocked && setWizardStep(2)}
                className={`flex items-center gap-2 py-1.5 px-3 rounded-xl transition whitespace-nowrap ${
                  wizardStep === 2
                    ? "bg-slate-900 text-white font-bold shadow-sm"
                    : isStep2Unlocked
                    ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                    : "text-slate-400 cursor-not-allowed opacity-60"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono ${
                    wizardStep === 2
                      ? "bg-white text-slate-900 font-bold"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  2
                </span>
                <span>Busca & DOIs</span>
              </button>

              {/* Step 3 */}
              <button
                type="button"
                disabled={!isStep3Unlocked}
                aria-current={wizardStep === 3 ? "step" : undefined}
                onClick={() => isStep3Unlocked && setWizardStep(3)}
                className={`flex items-center gap-2 py-1.5 px-3 rounded-xl transition whitespace-nowrap ${
                  wizardStep === 3
                    ? "bg-slate-900 text-white font-bold shadow-sm"
                    : isStep3Unlocked
                    ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                    : "text-slate-400 cursor-not-allowed opacity-60"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono ${
                    wizardStep === 3
                      ? "bg-white text-slate-900 font-bold"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  3
                </span>
                <span>Avaliação de Artigos</span>
                {isStep3Unlocked && snapshot?.status === "AWAITING_HUMAN" && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-slate-900">
                    {snapshot.raw_papers?.length || 0}
                  </span>
                )}
              </button>

              {/* Step 4 */}
              <button
                type="button"
                disabled={!isStep4Unlocked}
                aria-current={wizardStep === 4 ? "step" : undefined}
                onClick={() => isStep4Unlocked && setWizardStep(4)}
                className={`flex items-center gap-2 py-1.5 px-3 rounded-xl transition whitespace-nowrap ${
                  wizardStep === 4
                    ? "bg-slate-900 text-white font-bold shadow-sm"
                    : isStep4Unlocked
                    ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                    : "text-slate-400 cursor-not-allowed opacity-60"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono ${
                    wizardStep === 4
                      ? "bg-white text-slate-900 font-bold"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  4
                </span>
                <span>Matriz PRISMA 2020</span>
                {snapshot?.status === "COMPLETED" && (
                  <CheckCircle2
                    size={13}
                    className="text-emerald-500"
                    aria-hidden="true"
                  />
                )}
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Continuous Workbench */}
      <main
        id="bancada-principal"
        className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6"
      >
        {/* Persistent Pixel Art Operations Room (Never unmounts or cuts across steps!) */}
        <div className="max-w-5xl mx-auto">
          <PixelLabRoom
            scientists={unifiedScientists}
            snapshot={snapshot}
            onMilestoneReached={handleRoomMilestone}
            reducedMotion={a11y.reducedMotion}
          />
        </div>

        {/* Active Workbench Stage */}
        {wizardStep === 1 && (
          <Step1PicoDefinition
            onReviewCreated={handleReviewCreated}
            onPicoPreviewChange={(pico, queries, busy) =>
              setStep1Preview({ pico, queries, busy })
            }
          />
        )}

        {wizardStep === 2 && (
          <AgentWorkflowTelemetry
            reviewId={reviewId}
            snapshot={snapshot}
            events={events}
            isConnected={isConnected}
            onAdvanceToScreening={() => setWizardStep(3)}
            onAdvanceToPrisma={() => setWizardStep(4)}
          />
        )}

        {wizardStep === 3 && (
          <Step3Screening
            onDecisionsSubmitted={() => {
              if (reviewId) refreshSnapshot(reviewId);
            }}
          />
        )}

        {wizardStep === 4 && (
          <Step4PrismaMatrix
            onStartNewReview={() => {
              resetEvents();
              resetAll();
              setWizardStep(1);
            }}
          />
        )}
      </main>

      {/* Editorial Footer */}
      <footer className="border-t border-slate-200/80 bg-white/60 py-5 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={15} className="text-blue-700" aria-hidden="true" />
            <span>
              CortexLab • Padrão Internacional PRISMA 2020 & Cochrane RoB 2 • Dados 100% Verificados (OpenAlex, Europe PMC & Crossref)
            </span>
          </div>

          <div className="text-[11px] font-mono text-slate-400">
            Residência ResIA • Grupo 1
          </div>
        </div>
      </footer>

      {/* BYOK Settings Modal */}
      <ByokConfigModal />
    </div>
  );
}
