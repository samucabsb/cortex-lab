"use client";

import React, { useEffect, useCallback } from "react";
import { useLabStore } from "@/store/useLabStore";
import { useReviewStream } from "@/hooks/useReviewStream";
import { getReview } from "@/lib/api";
import { Step1PicoDefinition } from "@/components/steps/Step1PicoDefinition";
import { AgentWorkflowTelemetry } from "@/components/steps/AgentWorkflowTelemetry";
import { Step3Screening } from "@/components/steps/Step3Screening";
import { Step4PrismaMatrix } from "@/components/steps/Step4PrismaMatrix";
import { ByokConfigModal } from "@/components/settings/ByokConfigModal";
import {
  Sparkles,
  Key,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  BookOpen,
  ArrowRight,
  Database,
  Activity,
} from "lucide-react";

export default function CortexLabHomePage() {
  const {
    reviewId,
    setReviewId,
    snapshot,
    setSnapshot,
    wizardStep,
    setWizardStep,
    byok,
    setByokModalOpen,
    resetAll,
  } = useLabStore();

  const hasByokKeys = Boolean(byok.geminiApiKey || byok.groqApiKey);

  // Poll snapshot periodically if running or fetch on status change
  const refreshSnapshot = useCallback(async (id: string) => {
    try {
      const data = await getReview(id);
      setSnapshot(data);

      // Auto-step logic based on snapshot state
      if (data.status === "AWAITING_HUMAN" && (data.hitl?.checkpoint === "screening" || data.hitl?.checkpoint === "bias_arbitration")) {
        setWizardStep(3);
      } else if (data.status === "COMPLETED" && data.prisma_matrix && data.prisma_matrix.length > 0) {
        setWizardStep(4);
      }
    } catch (err) {
      console.warn("[page] Failed to refresh snapshot:", err);
    }
  }, [setSnapshot, setWizardStep]);

  // Connect SSE Stream for real-time telemetry events
  const { events, isConnected } = useReviewStream(reviewId, {
    onStatusChange: (event) => {
      if (reviewId) {
        refreshSnapshot(reviewId);
      }
    },
    onEvent: (event) => {
      // If run paused or hitl reached, eagerly fetch snapshot
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

  // Initial load of review snapshot when reviewId is mounted or restored
  useEffect(() => {
    if (reviewId && !snapshot) {
      refreshSnapshot(reviewId);
    }
  }, [reviewId, snapshot, refreshSnapshot]);

  // Background poll if review is active and SSE is disconnected
  useEffect(() => {
    if (!reviewId || isConnected || snapshot?.status === "COMPLETED") return;
    const interval = setInterval(() => {
      refreshSnapshot(reviewId);
    }, 5000);
    return () => clearInterval(interval);
  }, [reviewId, isConnected, snapshot?.status, refreshSnapshot]);

  const handleReviewCreated = (newReviewId: string) => {
    setReviewId(newReviewId);
    setWizardStep(2);
    refreshSnapshot(newReviewId);
  };

  const isStep2Unlocked = Boolean(reviewId);
  const isStep3Unlocked = Boolean(
    snapshot?.raw_papers && snapshot.raw_papers.length > 0
  );
  const isStep4Unlocked = Boolean(
    snapshot?.status === "COMPLETED" || (snapshot?.prisma_matrix && snapshot.prisma_matrix.length > 0)
  );

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Editorial Header */}
      <header className="sticky top-0 z-40 bg-[#FAF9F6]/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
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
                  v2.0 SciLab
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Human Augmentation para Revisões Sistemáticas • PRISMA 2020 & Cochrane RoB 2
              </p>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2.5">
            {/* BYOK Configuration Button */}
            <button
              type="button"
              onClick={() => setByokModalOpen(true)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border shadow-sm ${
                hasByokKeys
                  ? "bg-white border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                  : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Key size={13} className={hasByokKeys ? "text-emerald-600" : "text-slate-400"} />
              <span>Chaves de IA (BYOK)</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  hasByokKeys ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
                }`}
              />
            </button>

            {/* Reset Review Button if Active */}
            {reviewId && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Deseja iniciar uma nova revisão sistemática?")) {
                    resetAll();
                  }
                }}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition cursor-pointer flex items-center gap-1"
                title="Reiniciar revisão"
              >
                <RotateCcw size={13} />
                <span className="hidden sm:inline">Nova Sessão</span>
              </button>
            )}
          </div>
        </div>

        {/* 4-Step Editorial Stepper Bar */}
        <div className="border-t border-slate-200/60 bg-white/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex items-center justify-between sm:justify-start sm:gap-8 overflow-x-auto py-2.5 text-xs font-medium no-scrollbar">
              {/* Step 1 */}
              <button
                type="button"
                onClick={() => setWizardStep(1)}
                className={`flex items-center gap-2 py-1 px-2.5 rounded-lg transition whitespace-nowrap cursor-pointer ${
                  wizardStep === 1
                    ? "bg-slate-900 text-white font-bold shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono ${
                    wizardStep === 1 ? "bg-white text-slate-900 font-bold" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  1
                </span>
                <span>Definição PICO</span>
              </button>

              {/* Step 2 */}
              <button
                type="button"
                disabled={!isStep2Unlocked}
                onClick={() => isStep2Unlocked && setWizardStep(2)}
                className={`flex items-center gap-2 py-1 px-2.5 rounded-lg transition whitespace-nowrap ${
                  wizardStep === 2
                    ? "bg-slate-900 text-white font-bold shadow-sm"
                    : isStep2Unlocked
                    ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                    : "text-slate-400 cursor-not-allowed opacity-60"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono ${
                    wizardStep === 2 ? "bg-white text-slate-900 font-bold" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  2
                </span>
                <span>Telemetria dos Agentes</span>
                {snapshot?.status === "RUNNING" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                )}
              </button>

              {/* Step 3 */}
              <button
                type="button"
                disabled={!isStep3Unlocked}
                onClick={() => isStep3Unlocked && setWizardStep(3)}
                className={`flex items-center gap-2 py-1 px-2.5 rounded-lg transition whitespace-nowrap ${
                  wizardStep === 3
                    ? "bg-slate-900 text-white font-bold shadow-sm"
                    : isStep3Unlocked
                    ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                    : "text-slate-400 cursor-not-allowed opacity-60"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono ${
                    wizardStep === 3 ? "bg-white text-slate-900 font-bold" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  3
                </span>
                <span>Triagem Soberana (HITL)</span>
                {snapshot?.status === "AWAITING_HUMAN" && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-400 text-slate-900 uppercase tracking-wider animate-pulse">
                    Ação Requerida
                  </span>
                )}
              </button>

              {/* Step 4 */}
              <button
                type="button"
                disabled={!isStep4Unlocked}
                onClick={() => isStep4Unlocked && setWizardStep(4)}
                className={`flex items-center gap-2 py-1 px-2.5 rounded-lg transition whitespace-nowrap ${
                  wizardStep === 4
                    ? "bg-slate-900 text-white font-bold shadow-sm"
                    : isStep4Unlocked
                    ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                    : "text-slate-400 cursor-not-allowed opacity-60"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono ${
                    wizardStep === 4 ? "bg-white text-slate-900 font-bold" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  4
                </span>
                <span>Matriz PRISMA 2020</span>
                {snapshot?.status === "COMPLETED" && (
                  <CheckCircle2 size={13} className="text-emerald-500" />
                )}
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Render Only the Active Step */}
        {wizardStep === 1 && (
          <Step1PicoDefinition onReviewCreated={handleReviewCreated} />
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
              resetAll();
              setWizardStep(1);
            }}
          />
        )}
      </main>

      {/* Editorial Footer */}
      <footer className="border-t border-slate-200/80 bg-white/60 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={15} className="text-blue-700" />
            <span>
              CortexLab • Padrão PRISMA 2020 & Cochrane RoB 2 • Zero-Cost Architecture (OpenAlex + Europe PMC + Crossref)
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
