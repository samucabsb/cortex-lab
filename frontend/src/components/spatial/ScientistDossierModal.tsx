"use client";

import React, { useEffect, useRef } from "react";
import { X, CheckCircle2, FileCode2, BookOpen, Sparkles, ExternalLink, Activity } from "lucide-react";
import { AgentBenchId } from "@/types";
import { INITIAL_SCIENTISTS } from "./engine/PixelLabEngine";
import { drawPixelScientistCharacter } from "./engine/PixelCharacterRenderer";



export interface ScientistProfile {
  id: string;
  name: string;
  role: string;
  roomName: string;
  roomId: AgentBenchId;
  standard: string;
  backendModule: string;
  description: string;
  tasks: string[];
  outputDataName: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  phaseId: number;
}

export const SCIENTIST_PROFILES: Record<string, ScientistProfile> = {
  turing: {
    id: "turing",
    name: "Dr. Alan Turing",
    role: "Coordenador Metodológico (PI Coordinator)",
    roomName: "Sala 01 — Protocolo PICO",
    roomId: "coordinator",
    standard: "PRISMA 2020 (Item 5) & Decomposição PICO 2x2",
    backendModule: "backend/app/agents/nodes/coordinator_node.py",
    description:
      "Responsável pela formulação conceitual da pesquisa. Decompõe a pergunta clínica/científica em População, Intervenção, Comparador e Desfecho (PICO) e estrutura a sintaxe booleana com operadores lógicos AND / OR.",
    tasks: [
      "Decomposição semântica em População (P), Intervenção (I), Comparador (C) e Desfechos (O)",
      "Construção de queries booleanas otimizadas para as bases abertas OpenAlex e PubMed",
      "Caminhada até a Sala 02 para entregar fisicamente o protocolo à Dra. Ada",
    ],
    outputDataName: "Protocolo PICO Estruturado & Queries Booleanas",
    color: "#0ea5e9",
    badgeBg: "bg-sky-50 border-sky-200",
    badgeText: "text-sky-800",
    phaseId: 0,
  },
  ada: {
    id: "ada",
    name: "Dra. Ada Lovelace",
    role: "Mineradora de Literatura Aberta",
    roomName: "Sala 02 — Mineração & APIs Abertas",
    roomId: "mining",
    standard: "PRISMA 2020 (Item 6: Fontes de Informação & Item 7: Estratégia de Busca)",
    backendModule: "backend/app/agents/nodes/miner_node.py",
    description:
      "Executa a varredura primária na literatura científica através de chamadas concorrentes e gratuitas às APIs abertas do OpenAlex e PubMed/Europe PMC, recuperando metadados completos de artigos.",
    tasks: [
      "Consultas simultâneas sem custo às bases abertas OpenAlex e Europe PMC/PubMed",
      "Parsing de metadados: títulos, resumos, periódicos, anos de publicação e DOIs",
      "Handoff interno dos artigos brutos para o servidor de validação do Dr. Cross",
    ],
    outputDataName: "Artigos Científicos Brutos (raw_papers)",
    color: "#3b82f6",
    badgeBg: "bg-blue-50 border-blue-200",
    badgeText: "text-blue-800",
    phaseId: 2,
  },
  cross: {
    id: "cross",
    name: "Dr. Cross",
    role: "Validador Categórico de DOIs & Anti-Alucinação",
    roomName: "Sala 02 — Servidor de Validação Crossref",
    roomId: "mining",
    standard: "Crossref REST API v1 & Metaciência Epistemológica",
    backendModule: "backend/app/services/open_apis.py (validate_doi_with_crossref)",
    description:
      "Garante a integridade epistemológica 'Zero-Fake' do laboratório. Valida individualmente a existência de cada identificador DOI diretamente na API oficial da Crossref e elimina duplicatas.",
    tasks: [
      "Consulta concorrente em lote no endpoint oficial api.crossref.org/works/{doi}",
      "Eliminação rigorosa de duplicatas e registros corrompidos",
      "Transporte físico dos artigos autenticados até a Sala 03 (Supervisão Humana)",
    ],
    outputDataName: "DOIs Validados e Artigos Deduplicados",
    color: "#2563eb",
    badgeBg: "bg-indigo-50 border-indigo-200",
    badgeText: "text-indigo-800",
    phaseId: 4,
  },
  human: {
    id: "human",
    name: "Você (Pesquisador Principal - PI)",
    role: "Supervisão Soberana Human-in-the-Loop (HITL)",
    roomName: "Sala 03 — Estação Central de Triagem HITL",
    roomId: "hitl",
    standard: "PRISMA 2020 (Item 8: Processo de Seleção) & Human Augmentation",
    backendModule: "backend/app/agents/nodes/hitl_node.py",
    description:
      "O coração da filosofia Human Augmentation. A IA acelera a triagem, mas você tem o controle soberano inegociável de selecionar quais artigos avançam para a auditoria metodológica profunda.",
    tasks: [
      "Avaliação rápida de relevância temática com cards visuais de títulos e resumos",
      "Aprovação e exclusão seletiva de estudos com registro de auditoria",
      "Handoff presencial dos artigos chancelados para a Sala 04 de Auditoria",
    ],
    outputDataName: "Estudos Aprovados pelo Pesquisador Humano",
    color: "#f59e0b",
    badgeBg: "bg-amber-50 border-amber-200",
    badgeText: "text-amber-800",
    phaseId: 6,
  },
  fitz: {
    id: "fitz",
    name: "Dr. Fitz",
    role: "Extrator Metodológico & Amostra (N)",
    roomName: "Sala 04 — Bancada de Extração Quantitativa",
    roomId: "auditing",
    standard: "PRISMA 2020 (Item 10: Itens de Dados & Extração)",
    backendModule: "backend/app/agents/nodes/methodologist_node.py",
    description:
      "Examina a anatomia experimental dos estudos aprovados. Extrai o tamanho amostral (N total e por grupo), intervenção vs controle, valor de p estatístico e citações literais rastreáveis com página.",
    tasks: [
      "Identificação do tamanho amostral (N de participantes) e desenho experimental",
      "Extração de comparações quantitativas (Intervenção vs Controle e desfechos)",
      "Captura de citações literais rastreáveis (traceable quotes com página)",
    ],
    outputDataName: "Parâmetros Metodológicos & Estatística Amostral",
    color: "#f43f5e",
    badgeBg: "bg-rose-50 border-rose-200",
    badgeText: "text-rose-800",
    phaseId: 8,
  },
  cochrane: {
    id: "cochrane",
    name: "Dra. Archie Cochrane",
    role: "Auditora de Risco de Viés Metodológico RoB 2",
    roomName: "Sala 04 — Estação de Auditoria RoB 2",
    roomId: "auditing",
    standard: "Cochrane Risk of Bias 2.0 (RoB 2) & PRESS Guideline",
    backendModule: "backend/app/agents/nodes/methodologist_node.py",
    description:
      "Aplica a taxonomia Cochrane RoB 2 para auditar riscos de viés nos domínios de aleatorização, desvios da intervenção, dados faltantes e seleção de desfechos relatados.",
    tasks: [
      "Auditoria dos 5 domínios metodológicos oficiais da metodologia Cochrane RoB 2",
      "Classificação estrita: Baixo Risco (Low), Algumas Preocupações ou Alto Risco (High)",
      "Disparo de alerta HITL de arbitragem caso haja risco grave de viés",
    ],
    outputDataName: "Laudo Cochrane RoB 2 & Classificação de Viés",
    color: "#e11d48",
    badgeBg: "bg-pink-50 border-pink-200",
    badgeText: "text-pink-800",
    phaseId: 10,
  },
  rosalind: {
    id: "rosalind",
    name: "Dra. Rosalind Franklin",
    role: "Sintetizadora de Evidências PRISMA 2020 & Lacunas",
    roomName: "Sala 05 — Biblioteca de Síntese PRISMA",
    roomId: "synthesis",
    standard: "PRISMA 2020 (Itens 13 e 23) & Qualis CAPES / SJR",
    backendModule: "backend/app/agents/nodes/synthesizer_node.py & exporter.py",
    description:
      "Consolida o Caderno de Síntese PRISMA 2020 final, mapeia as lacunas de conhecimento (Knowledge Gaps) na literatura e compila os arquivos de exportação em formatos .CSV e .BibTeX seguros contra injeção de fórmulas.",
    tasks: [
      "Construção da Matriz PRISMA 2020 com estratificação de periódicos (Qualis A1-B4 e SJR Q1-Q4)",
      "Formulação de Knowledge Gaps acionáveis para futuras linhas de pesquisa",
      "Geração de arquivos CSV e BibTeX com sanitização estrita de fórmulas",
    ],
    outputDataName: "Matriz PRISMA 2020, Knowledge Gaps & Arquivos .CSV/.BibTeX",
    color: "#10b981",
    badgeBg: "bg-emerald-50 border-emerald-200",
    badgeText: "text-emerald-800",
    phaseId: 12,
  },
};

const ScientistAvatarCanvas: React.FC<{ scientistId: string }> = ({ scientistId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const appearance = INITIAL_SCIENTISTS.find((s) => s.id === scientistId);
    if (!appearance) return;

    let animId: number;
    let tick = 0;

    const loop = () => {
      animId = requestAnimationFrame(loop);
      tick++;

      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dark sci-fi lab background
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle floor ring
      ctx.fillStyle = "#1e293b";
      ctx.beginPath();
      ctx.ellipse(36, 62, 22, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Render breathing scientist at pixelScale = 2.4
      drawPixelScientistCharacter({
        ctx,
        cx: 36,
        cy: 60,
        pixelScale: 2.4,
        appearance: { ...appearance, facing: "right" },
        state: "IDLE",
        facing: "right",
        frameTick: tick,
      });
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [scientistId]);

  return (
    <canvas
      ref={canvasRef}
      width={72}
      height={72}
      className="w-[72px] h-[72px] rounded-2xl border-2 border-slate-300 bg-slate-900 shadow-md shrink-0 block"
    />
  );
};

interface ScientistDossierModalProps {
  scientistId: string | null;
  onClose: () => void;
  onJumpToPhase: (phaseId: number) => void;
}

export const ScientistDossierModal: React.FC<ScientistDossierModalProps> = ({
  scientistId,
  onClose,
  onJumpToPhase,
}) => {
  if (!scientistId) return null;

  const profile = SCIENTIST_PROFILES[scientistId] || SCIENTIST_PROFILES["turing"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header with Scientist Color Bar */}
        <div
          className="h-2 w-full shrink-0"
          style={{ backgroundColor: profile.color }}
        />

        <div className="p-6 md:p-8 overflow-y-auto space-y-6">
          {/* Top Bar: Title, Live Pixel Avatar & Close Button */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <ScientistAvatarCanvas scientistId={profile.id} />
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${profile.badgeBg} ${profile.badgeText}`}
                  >
                    {profile.roomName}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-mono font-medium">
                    ID: {profile.id}
                  </span>
                </div>
                <h2 className="serif-title text-2xl md:text-3xl font-bold text-slate-900">
                  {profile.name}
                </h2>
                <p className="text-sm font-semibold text-slate-600">
                  {profile.role}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer shrink-0"
              title="Fechar dossiê"
            >
              <X size={20} />
            </button>
          </div>


          {/* Description */}
          <p className="text-sm md:text-base text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200/70">
            {profile.description}
          </p>

          {/* Technical Alignment Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1.5 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                <BookOpen size={13} className="text-blue-600" />
                <span>Norma Metodológica</span>
              </div>
              <div className="text-sm font-bold text-slate-900 leading-snug">
                {profile.standard}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1.5 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                <FileCode2 size={13} className="text-emerald-600" />
                <span>Módulo Python Backend</span>
              </div>
              <div className="text-xs font-mono font-semibold text-slate-800 break-all leading-tight">
                {profile.backendModule}
              </div>
            </div>
          </div>

          {/* Specific Agent Tasks */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Activity size={14} className="text-slate-600" />
              <span>Rotinas Científicas no Código</span>
            </h3>
            <ul className="space-y-2">
              {profile.tasks.map((task, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2.5 text-sm text-slate-700"
                >
                  <CheckCircle2
                    size={16}
                    className="shrink-0 mt-0.5 text-emerald-600"
                  />
                  <span>{task}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Deliverable Badge */}
          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-blue-700">
                Artefato / Entrega Física
              </div>
              <div className="text-sm font-bold text-slate-900 mt-0.5">
                {profile.outputDataName}
              </div>
            </div>
            <Sparkles size={18} className="text-blue-600 shrink-0" />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 md:px-8 md:py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-sm font-semibold transition cursor-pointer"
          >
            Fechar
          </button>

          <button
            onClick={() => {
              onJumpToPhase(profile.phaseId);
              onClose();
            }}
            className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold shadow-md transition flex items-center gap-2 cursor-pointer"
          >
            <span>Ver Este Cientista Trabalhando</span>
            <ExternalLink size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
