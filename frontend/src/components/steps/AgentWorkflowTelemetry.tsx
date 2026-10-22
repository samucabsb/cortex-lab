"use client";

import React, { useState } from "react";
import { AgentEvent, ReviewSnapshot } from "@/types";
import {
  ArrowRight,
  Terminal,
  Activity,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  BookOpen,
  ShieldCheck,
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
  snapshot,
  events,
  isConnected,
  onAdvanceToScreening,
  onAdvanceToPrisma,
}) => {
  const [showRawLogs, setShowRawLogs] = useState(false);

  const isAwaitingScreening =
    snapshot?.status === "AWAITING_HUMAN" &&
    snapshot?.hitl?.checkpoint === "screening";

  const isAwaitingBias =
    snapshot?.status === "AWAITING_HUMAN" &&
    snapshot?.hitl?.checkpoint === "bias_arbitration";

  const isCompleted = snapshot?.status === "COMPLETED";

  const totalPapersFound = snapshot?.raw_papers?.length || 0;
  const verifiedDoisCount =
    snapshot?.raw_papers?.filter((p) => p.doi_verified).length || 0;

  return (
    <section
      aria-labelledby="telemetry-heading"
      className="stage-enter space-y-6 max-w-5xl mx-auto"
    >
      {/* Card Principal de Progresso Metodológico */}
      <div className="bg-white a11y-card rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                Etapa 2 • Busca Federada & Validação Crossref
              </span>
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                  isConnected
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                <Activity size={11} aria-hidden="true" />
                {isConnected ? "Conexão ao Vivo" : "Sincronizando..."}
              </span>
            </div>

            <h2
              id="telemetry-heading"
              className="serif-title text-2xl sm:text-3xl font-bold text-slate-900"
            >
              {isCompleted
                ? "Síntese Metodológica Concluída"
                : isAwaitingScreening
                ? `${totalPapersFound} Artigos Encontrados e Validados`
                : isAwaitingBias
                ? "Auditoria Cochrane RoB 2 Aguardando Arbitragem"
                : "Executando Busca nas Bases Científicas..."}
            </h2>

            <p className="text-sm text-slate-600 leading-relaxed">
              {isAwaitingScreening
                ? "Observe na Sala acima o Dr. Turing, a Dra. Ada e o Dr. Cross concluindo a entrega dos artigos validados. O painel de Triagem se abrirá suavemente em instantes (ou clique no botão ao lado para abrir agora)."
                : isCompleted
                ? "O Dr. Fitz, a Dra. Cochrane e a Dra. Rosalind finalizaram a extração de amostras (N), p-valores e a Matriz PRISMA 2020."
                : "Os agentes estão consultando a API oficial da OpenAlex, Europe PMC (PubMed) e Crossref em tempo real."}
            </p>
          </div>

          {/* Botão de avanço imediato (caso o usuário não queira aguardar o fim da animação) */}
          <div className="flex flex-wrap items-center gap-3">
            {isAwaitingScreening && (
              <button
                type="button"
                onClick={onAdvanceToScreening}
                className="px-6 py-3.5 rounded-2xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm shadow-md transition flex items-center gap-2 cursor-pointer"
              >
                <span>
                  Avaliar {totalPapersFound} Artigos Encontrados
                </span>
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            )}

            {isAwaitingBias && (
              <button
                type="button"
                onClick={onAdvanceToScreening}
                className="px-6 py-3.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md transition flex items-center gap-2 cursor-pointer"
              >
                <span>Abrir Arbitragem de Viés RoB 2</span>
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            )}

            {isCompleted && (
              <button
                type="button"
                onClick={onAdvanceToPrisma}
                className="px-6 py-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-md transition flex items-center gap-2 cursor-pointer"
              >
                <span>Abrir Matriz PRISMA 2020</span>
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* Resumo Acadêmico em 3 Indicadores Claros */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen size={13} className="text-blue-700" />
              1. Protocolo PICO (Dr. Turing)
            </span>
            <p className="text-sm font-semibold text-slate-900 truncate">
              {snapshot?.topic || "Protocolo estruturado"}
            </p>
            <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
              <CheckCircle2 size={12} /> Equação booleana registrada
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Activity size={13} className="text-emerald-700" />
              2. Busca Federada (Dra. Ada)
            </span>
            <p className="text-xl font-bold font-mono text-slate-900">
              {totalPapersFound} artigos únicos
            </p>
            <span className="text-xs text-slate-500 block">
              OpenAlex + Europe PMC (sem duplicatas)
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-indigo-700" />
              3. Auditoria de DOI (Dr. Cross)
            </span>
            <p className="text-xl font-bold font-mono text-slate-900">
              {verifiedDoisCount} / {totalPapersFound} verificados
            </p>
            <span className="text-xs text-slate-500 block">
              Checagem anti-alucinação na Crossref
            </span>
          </div>
        </div>

        {/* Diário de Eventos Recolhível (Para Auditoria Metodológica) */}
        <div className="border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={() => setShowRawLogs(!showRawLogs)}
            aria-expanded={showRawLogs}
            className="w-full flex items-center justify-between text-xs font-semibold text-slate-600 hover:text-slate-900 py-1 cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Terminal size={14} className="text-slate-400" />
              <span>
                Registro de Auditoria das APIs ({events.length} eventos
                registrados)
              </span>
            </span>
            <span className="flex items-center gap-1 text-blue-700">
              {showRawLogs ? (
                <>
                  <span>Ocultar detalhes técnicos</span>
                  <ChevronUp size={14} />
                </>
              ) : (
                <>
                  <span>Ver registro passo a passo</span>
                  <ChevronDown size={14} />
                </>
              )}
            </span>
          </button>

          {showRawLogs && (
            <div className="mt-3 rounded-2xl bg-slate-950 text-slate-100 p-4 border border-slate-800 max-h-56 overflow-y-auto space-y-1.5 font-mono text-xs stage-enter">
              {events.length === 0 ? (
                <div className="text-slate-400 py-3 text-center flex items-center justify-center gap-2">
                  <Clock size={13} />
                  <span>Aguardando eventos do servidor...</span>
                </div>
              ) : (
                events.map((ev) => (
                  <div
                    key={ev.seq}
                    className="flex items-start gap-2.5 py-1 px-2 rounded hover:bg-slate-900/60"
                  >
                    <span className="text-slate-500 shrink-0">#{ev.seq}</span>
                    <span className="text-blue-400 font-semibold shrink-0 uppercase text-[11px] w-24 truncate">
                      [{ev.agent}]
                    </span>
                    <span className="text-slate-200 flex-1 leading-relaxed">
                      {ev.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
