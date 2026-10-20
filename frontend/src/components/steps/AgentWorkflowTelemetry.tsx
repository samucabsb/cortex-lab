"use client";

import React, { useMemo } from "react";
import { AgentEvent, ReviewSnapshot, ScientistCardInfo, ScientistId } from "@/types";
import {
  Brain,
  Database,
  CheckCircle,
  FileSearch,
  ShieldAlert,
  BookMarked,
  ArrowRight,
  Terminal,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
} from "lucide-react";

interface TelemetryProps {
  reviewId: string | null;
  snapshot: ReviewSnapshot | null;
  events: AgentEvent[];
  isConnected: boolean;
  onAdvanceToScreening: () => void;
  onAdvanceToPrisma: () => void;
}

export const AgentWorkflowTelemetry: React.FC<TelemetryProps> = ({
  reviewId,
  snapshot,
  events,
  isConnected,
  onAdvanceToScreening,
  onAdvanceToPrisma,
}) => {
  // Aggregate real events to compute live scientist states
  const scientists = useMemo<Record<ScientistId, ScientistCardInfo>>(() => {
    const base: Record<ScientistId, ScientistCardInfo> = {
      turing: {
        id: "turing",
        agentKey: "coordinator",
        name: "Dr. Turing",
        role: "PI Coordinator",
        affiliation: "Protocolo & PICO",
        avatarInitials: "AT",
        status: "IDLE",
        lastAction: "Aguardando definição metodológica...",
        metricLabel: "Queries",
        metricValue: snapshot?.boolean_queries?.length || 0,
      },
      ada: {
        id: "ada",
        agentKey: "searcher",
        name: "Dra. Ada",
        role: "Literature Searcher",
        affiliation: "OpenAlex & Europe PMC",
        avatarInitials: "AL",
        status: "IDLE",
        lastAction: "Aguardando disparo da busca federada...",
        metricLabel: "Artigos Brutos",
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
        lastAction: "Aguardando deduplicação e checagem...",
        metricLabel: "DOIs Validados",
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
        lastAction: "Aguardando triagem humana dos artigos...",
        metricLabel: "Artigos Auditados",
        metricValue: snapshot?.audited_papers?.length || 0,
      },
      cochrane: {
        id: "cochrane",
        agentKey: "bias_auditor",
        name: "Dra. Cochrane",
        role: "Methodologist Auditor",
        affiliation: "Cochrane RoB 2",
        avatarInitials: "AC",
        status: "IDLE",
        lastAction: "Aguardando extração metodológica...",
        metricLabel: "Alertas de Viés",
        metricValue:
          snapshot?.hitl?.checkpoint === "bias_arbitration"
            ? snapshot?.hitl?.flagged?.length || 1
            : 0,
      },
      rosalind: {
        id: "rosalind",
        agentKey: "synthesizer",
        name: "Dra. Rosalind",
        role: "PRISMA Synthesizer",
        affiliation: "Matriz PRISMA 2020",
        avatarInitials: "RF",
        status: "IDLE",
        lastAction: "Aguardando resolução de laudos...",
        metricLabel: "Linhas PRISMA",
        metricValue: snapshot?.prisma_matrix?.length || 0,
      },
    };

    // Replay chronological events to update live state
    for (const ev of events) {
      if (ev.agent === "coordinator") {
        base.turing.lastAction = ev.message;
        if (ev.kind === "node_started") base.turing.status = "WORKING";
        if (ev.kind === "protocol_registered" || ev.status === "COMPLETED")
          base.turing.status = "COMPLETED";
        if (ev.data?.boolean_queries)
          base.turing.metricValue = ev.data.boolean_queries.length;
      }

      if (ev.agent === "searcher") {
        base.ada.lastAction = ev.message;
        if (ev.kind === "node_started" || ev.kind === "api_call_started")
          base.ada.status = "WORKING";
        if (ev.data?.papers_total !== undefined) {
          base.ada.metricValue = ev.data.papers_total;
        }
        if (ev.kind === "node_finished" || ev.status === "COMPLETED")
          base.ada.status = "COMPLETED";
      }

      if (ev.agent === "validator") {
        base.cross.lastAction = ev.message;
        if (ev.kind === "node_started" || ev.kind === "doi_check")
          base.cross.status = "WORKING";
        if (ev.data?.verified !== undefined) {
          base.cross.metricValue = ev.data.verified;
        }
        if (ev.kind === "node_finished" || ev.status === "COMPLETED")
          base.cross.status = "COMPLETED";
      }

      if (ev.agent === "extractor") {
        base.fitz.lastAction = ev.message;
        if (ev.kind === "node_started" || ev.kind === "paper_extracted")
          base.fitz.status = "WORKING";
        if (ev.data?.processed !== undefined) {
          base.fitz.metricValue = ev.data.processed;
        }
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
        if (ev.data?.flagged !== undefined) {
          base.cochrane.metricValue = ev.data.flagged;
        }
      }

      if (ev.agent === "synthesizer") {
        base.rosalind.lastAction = ev.message;
        if (ev.kind === "node_started") base.rosalind.status = "WORKING";
        if (ev.kind === "node_finished" || ev.status === "COMPLETED")
          base.rosalind.status = "COMPLETED";
        if (ev.data?.matrix_rows !== undefined) {
          base.rosalind.metricValue = ev.data.matrix_rows;
        }
      }
    }

    // Override based on snapshot status
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
  }, [events, snapshot]);

  const isAwaitingScreening =
    snapshot?.status === "AWAITING_HUMAN" &&
    snapshot?.hitl?.checkpoint === "screening";

  const isAwaitingBias =
    snapshot?.status === "AWAITING_HUMAN" &&
    snapshot?.hitl?.checkpoint === "bias_arbitration";

  const isCompleted = snapshot?.status === "COMPLETED";

  const getStatusBadge = (status: ScientistCardInfo["status"]) => {
    switch (status) {
      case "WORKING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
            Executando
          </span>
        );
      case "WAITING_HUMAN":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <AlertTriangle size={12} className="text-amber-600" />
            Aguardando HITL
          </span>
        );
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 size={12} className="text-emerald-600" />
            Concluído
          </span>
        );
      case "ERROR":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
            Erro
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
            <Clock size={11} />
            Na Fila
          </span>
        );
    }
  };

  const getScientistIcon = (id: ScientistId) => {
    switch (id) {
      case "turing":
        return <Brain className="w-5 h-5 text-blue-600" />;
      case "ada":
        return <Database className="w-5 h-5 text-emerald-600" />;
      case "cross":
        return <CheckCircle className="w-5 h-5 text-indigo-600" />;
      case "fitz":
        return <FileSearch className="w-5 h-5 text-amber-600" />;
      case "cochrane":
        return <ShieldAlert className="w-5 h-5 text-rose-600" />;
      case "rosalind":
        return <BookMarked className="w-5 h-5 text-purple-600" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner with Action CTA */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
              Etapa 2 de 4 • Telemetria Multiagente em Tempo Real
            </span>
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                isConnected
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              <Activity size={11} />
              {isConnected ? "Stream SSE Ativo" : "Conectando ao Stream..."}
            </span>
          </div>
          <h2 className="serif-title text-3xl font-bold text-slate-900 mt-1">
            Bancada Científica Digital
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            6 agentes especializados executam chamadas concorrentes sem mocks ou dados simulados.
          </p>
        </div>

        {/* Action button if checkpoint reached */}
        {isAwaitingScreening && (
          <button
            onClick={onAdvanceToScreening}
            className="px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md transition flex items-center gap-2 cursor-pointer active:scale-95 animate-bounce"
          >
            <span>
              Avançar para Triagem Humana ({snapshot?.raw_papers?.length || 0} Artigos)
            </span>
            <ArrowRight size={18} />
          </button>
        )}

        {isAwaitingBias && (
          <button
            onClick={onAdvanceToScreening}
            className="px-6 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md transition flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <span>Arbitrar Risco de Viés Humano →</span>
            <ArrowRight size={18} />
          </button>
        )}

        {isCompleted && (
          <button
            onClick={onAdvanceToPrisma}
            className="px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <span>Ver Matriz PRISMA 2020 Concluída →</span>
            <ArrowRight size={18} />
          </button>
        )}
      </div>

      {/* 6 Scientist Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.values(scientists).map((s) => (
          <div
            key={s.id}
            className={`p-5 rounded-2xl bg-white border transition shadow-sm flex flex-col justify-between ${
              s.status === "WORKING"
                ? "border-blue-500 shadow-md ring-1 ring-blue-500/20"
                : s.status === "WAITING_HUMAN"
                ? "border-amber-400 bg-amber-50/20 shadow-sm"
                : s.status === "COMPLETED"
                ? "border-slate-200/90"
                : "border-slate-200/70 opacity-75"
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200/80 shrink-0">
                    {getScientistIcon(s.id)}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {s.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {s.role} • {s.affiliation}
                    </p>
                  </div>
                </div>
                {getStatusBadge(s.status)}
              </div>

              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 text-xs text-slate-700 leading-relaxed font-sans min-h-[50px] flex items-center">
                {s.lastAction}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-500">{s.metricLabel}:</span>
              <span className="font-mono font-bold text-slate-900 text-sm px-2 py-0.5 rounded bg-slate-100">
                {s.metricValue}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Live Event Stream Terminal */}
      <div className="rounded-2xl bg-slate-950 text-slate-100 p-5 shadow-lg border border-slate-800 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <Terminal size={17} className="text-blue-400" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
              Terminal de Telemetria Auditável (SSE Stream)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">
              {events.length} evento(s) recebidos
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        </div>

        <div className="max-h-60 overflow-y-auto space-y-1.5 font-mono text-xs pr-2">
          {events.length === 0 ? (
            <div className="text-slate-500 italic py-4 text-center">
              Aguardando os primeiros eventos dos agentes...
            </div>
          ) : (
            events.map((ev) => (
              <div
                key={ev.seq}
                className="flex items-start gap-2.5 py-1 px-2 rounded hover:bg-slate-900/60 transition"
              >
                <span className="text-slate-500 shrink-0">#{ev.seq}</span>
                <span className="text-blue-400 font-semibold shrink-0 uppercase text-[11px] w-24 truncate">
                  [{ev.agent}]
                </span>
                <span className="text-slate-300 flex-1 leading-relaxed">
                  {ev.message}
                </span>
                {ev.source && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 shrink-0">
                    {ev.source}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
