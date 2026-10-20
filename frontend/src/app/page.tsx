"use client";

import React, { useState } from "react";
import { IsometricLabCanvas } from "@/components/spatial/IsometricLabCanvas";
import { PrismaMatrixTable } from "@/components/dashboard/PrismaMatrixTable";
import { KnowledgeGapsCard } from "@/components/dashboard/KnowledgeGapsCard";
import { ExportToolbar } from "@/components/dashboard/ExportToolbar";
import { ByokConfigModal } from "@/components/settings/ByokConfigModal";
import {
  MOCK_PAPERS,
  MOCK_PRISMA_ROWS,
  MOCK_GAPS,
  MOCK_PICO,
  MOCK_BOOLEAN_QUERIES,
  createReview,
  submitHitlDecision,
} from "@/lib/api";
import {
  AgentBenchId,
  PaperItem,
  PrismaMatrixItem,
  KnowledgeGapItem,
  PicoData,
} from "@/types";
import { useLabStore } from "@/store/useLabStore";
import { useAgentStream } from "@/hooks/useAgentStream";
import {
  BookOpen,
  Github,
  Key,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  AlertCircle,
  Quote,
  LayoutGrid,
  Table2,
  Sparkles,
} from "lucide-react";

type WizardStep = 1 | 2 | 3 | 4;

export default function CortexLabHomePage() {
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [resultViewMode, setResultViewMode] = useState<"cards" | "table">("cards");

  const [topic, setTopic] = useState(
    "Eficácia e toxicidade de células CAR-T em tumores sólidos"
  );
  const [currentStep, setCurrentStep] = useState<string>("SCREENING_CHECKPOINT");
  const [hitlPending, setHitlPending] = useState<boolean>(true);
  const [selectedBenchId, setSelectedBenchId] = useState<AgentBenchId>("hitl");

  // Scientific State
  const [pico, setPico] = useState<PicoData>(MOCK_PICO);
  const [booleanQueries, setBooleanQueries] = useState<string[]>(
    MOCK_BOOLEAN_QUERIES
  );
  const [papers, setPapers] = useState<PaperItem[]>(MOCK_PAPERS);
  const [selectedPaperIds, setSelectedPaperIds] = useState<Set<string>>(
    new Set(MOCK_PAPERS.map((p) => p.id))
  );
  const [prismaRows, setPrismaRows] =
    useState<PrismaMatrixItem[]>(MOCK_PRISMA_ROWS);
  const [knowledgeGaps, setKnowledgeGaps] =
    useState<KnowledgeGapItem[]>(MOCK_GAPS);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [reviewId, setReviewId] = useState<string>("rev-01");

  const { byok, setByokModalOpen, setReviewSession } = useLabStore();
  useAgentStream(reviewId);

  const quickExamples = [
    "Eficácia da terapia celular CAR-T em tumores sólidos",
    "Edição gênica CRISPR-Cas9 em Distrofia Muscular de Duchenne",
    "Aprendizado Profundo no diagnóstico precoce de oncologia",
  ];

  const handleStartResearch = async (customQuery?: string) => {
    const queryToUse = customQuery || topic;
    setIsLoading(true);
    setCurrentStep("MINING");
    setHitlPending(false);
    setSelectedBenchId("mining");

    try {
      const res = await createReview(queryToUse, {
        byokGeminiKey: byok.geminiApiKey,
        byokGroqKey: byok.groqApiKey,
      });

      if (res) {
        const newRevId = res.review_id || "rev-01";
        setReviewId(newRevId);
        setCurrentStep(res.status || "SCREENING_CHECKPOINT");
        setHitlPending(Boolean(res.hitl_pending));

        if (res.pico) setPico(res.pico);
        if (res.boolean_queries?.length) setBooleanQueries(res.boolean_queries);
        if (res.papers?.length) {
          setPapers(res.papers);
          setSelectedPaperIds(new Set(res.papers.map((p: PaperItem) => p.id)));
        }

        setSelectedBenchId("hitl");
        setReviewSession({
          review_id: newRevId,
          query: queryToUse,
          current_step: res.status || "SCREENING_CHECKPOINT",
          hitl_pending: Boolean(res.hitl_pending),
          raw_papers: res.papers || [],
        });
      }
      setWizardStep(2);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePaperSelection = (id: string) => {
    const next = new Set(selectedPaperIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedPaperIds(next);
  };

  const handleApproveScreening = async () => {
    const approvedIds = Array.from(selectedPaperIds);
    const rejectedIds = papers
      .map((p) => p.id)
      .filter((id) => !selectedPaperIds.has(id));

    setIsLoading(true);
    setCurrentStep("AUDITING");
    setSelectedBenchId("auditing");

    try {
      const res = await submitHitlDecision(
        reviewId,
        "screening",
        approvedIds,
        rejectedIds
      );

      if (res) {
        setCurrentStep(res.status || "COMPLETED");
        setHitlPending(false);
        if (res.prisma_matrix?.length) setPrismaRows(res.prisma_matrix);
        if (res.knowledge_gaps?.length) setKnowledgeGaps(res.knowledge_gaps);
        setSelectedBenchId("synthesis");
      }
      setWizardStep(4);
    } finally {
      setIsLoading(false);
    }
  };

  const hasByokKeys = Boolean(byok.geminiApiKey || byok.groqApiKey);

  const navSteps: Array<{ num: WizardStep; label: string }> = [
    { num: 1, label: "1. Sua Pergunta & PICO" },
    { num: 2, label: "2. Laboratório Pixel Art" },
    { num: 3, label: `3. Aprovar Artigos (${selectedPaperIds.size})` },
    { num: 4, label: "4. Resultado PRISMA" },
  ];

  // Didactic explanation for the currently clicked room in Step 2
  const getBenchDidacticSummary = (bench: AgentBenchId) => {
    switch (bench) {
      case "coordinator":
        return {
          badge: "Sala 01 (1 Pesquisador) • Dr. Turing — PI Coordinator",
          title: "Estrutura o protocolo PICO no quadro digital e entrega à Sala 02",
          description: `População: ${pico.population} | Intervenção: ${pico.intervention}. Ao concluir, Dr. Turing caminha pelo corredor até a Sala 02 para entregar o protocolo à Dra. Ada.`,
        };
      case "mining":
        return {
          badge: "Sala 02 (2 Pesquisadores) • Dra. Ada (Busca) + Dr. Cross (Validação DOI)",
          title: `Dupla divide a mineração (${papers.length} artigos) e a validação no servidor Crossref`,
          description:
            "Dra. Ada consulta OpenAlex e PubMed nos monitores duplos e passa os artigos brutos para o Dr. Cross ao lado do rack de servidores, que remove duplicatas, valida os DOIs e leva a pasta até a Sala 03 Central.",
        };
      case "auditing":
        return {
          badge: "Sala 04 (2 Pesquisadores) • Dr. Fitz (Extrator N) + Dra. Cochrane (RoB 2)",
          title: "Dupla divide a extração estatística e o julgamento de Risco de Viés",
          description:
            "Dr. Fitz extrai tamanho amostral (N), grupo controle e p-valores na bancada frontal e entrega para a Dra. Cochrane na bancada superior, que classifica o estudo segundo o Cochrane RoB 2 e leva os laudos à Biblioteca.",
        };
      case "synthesis":
        return {
          badge: "Sala 05 (1 Pesquisadora) • Dra. Rosalind — Biblioteca & Síntese PRISMA",
          title: `Consolida a Matriz PRISMA 2020 (${prismaRows.length} estudos) e ${knowledgeGaps.length} Knowledge Gaps`,
          description:
            "Recebe os laudos auditados da Dra. Cochrane, cruza referências Qualis/SJR nas estantes e gera as fichas comparativas e arquivos .CSV / .BibTeX.",
        };
      default:
        return {
          badge: "Sala 03 Central (1 Pesquisador) • Você — Supervisão Humana (HITL)",
          title: `Recebe a pasta do Dr. Cross e decide quais dos ${papers.length} artigos seguem adiante`,
          description:
            "Após aprovar os estudos elegíveis, seu avatar leva a pasta aprovada até o Dr. Fitz no Laboratório de Auditoria (Sala 04).",
        };
    }
  };

  const activeBenchInfo = getBenchDidacticSummary(selectedBenchId);

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 flex flex-col">
      {/* Clean Minimalist Header with Stepper */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 lg:px-10 py-4">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Logo */}
          <button
            onClick={() => setWizardStep(1)}
            className="flex items-center gap-3 text-left cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
              <BookOpen size={20} />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-slate-900 block leading-none">
                CortexLab
              </span>
              <span className="text-xs font-medium text-slate-500">
                Revisão Sistemática PRISMA 2020
              </span>
            </div>
          </button>

          {/* 4-Step Guided Navigation Pills */}
          <nav className="flex flex-wrap items-center gap-2">
            {navSteps.map((st, idx) => {
              const isActive = wizardStep === st.num;
              const isDone = wizardStep > st.num;
              return (
                <React.Fragment key={st.num}>
                  <button
                    onClick={() => setWizardStep(st.num)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                      isActive
                        ? "bg-slate-900 text-white shadow-sm"
                        : isDone
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {isDone && (
                      <CheckCircle2 size={15} className="text-emerald-600" />
                    )}
                    <span>{st.label}</span>
                  </button>
                  {idx < navSteps.length - 1 && (
                    <span className="text-slate-300 hidden md:inline">→</span>
                  )}
                </React.Fragment>
              );
            })}
          </nav>

          {/* Right Utilities */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setByokModalOpen(true)}
              className={`px-4 py-2 rounded-xl border text-sm font-semibold flex items-center gap-2 transition cursor-pointer ${
                hasByokKeys
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Key size={15} />
              <span>{hasByokKeys ? "Chave IA Ativa" : "Chave IA"}</span>
            </button>

            <a
              href="https://github.com/samucabsb/cortex-lab"
              target="_blank"
              rel="noreferrer"
              className="p-2.5 rounded-xl bg-white border border-slate-300 text-slate-600 hover:text-slate-900 transition"
              title="Repositório no GitHub"
            >
              <Github size={18} />
            </a>
          </div>
        </div>
      </header>

      {/* Single Focused Workspace Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-10">
        {/* =========================================================
            STEP 1: SUA PERGUNTA & PROTOCOLO EDITORIAL PICO
           ========================================================= */}
        {wizardStep === 1 && (
          <section className="space-y-10">
            <div className="text-center space-y-4 max-w-3xl mx-auto pt-2">
              <span className="inline-block px-4 py-1.5 rounded-full bg-blue-100 text-blue-800 font-semibold text-sm">
                Etapa 1 de 4 • Definição da Pesquisa Científica
              </span>
              <h1 className="serif-title text-4xl md:text-5xl font-bold text-slate-900 leading-tight">
                O que você quer investigar hoje?
              </h1>
              <p className="text-lg text-slate-600 leading-relaxed">
                Digite seu tema de pesquisa. Os agentes estruturam o protocolo{" "}
                <strong>PICO</strong>, buscam artigos reais na{" "}
                <strong>OpenAlex e PubMed</strong> e auditam o risco de viés.
              </p>
            </div>

            {/* Large Search Box */}
            <div className="bg-white p-4 rounded-3xl shadow-md border border-slate-200 max-w-3xl mx-auto flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleStartResearch()}
                placeholder="Ex: Eficácia da terapia celular CAR-T em tumores sólidos..."
                className="flex-1 px-5 py-4 text-lg text-slate-900 bg-slate-50 rounded-2xl border border-slate-200 focus:outline-none focus:border-blue-600 focus:bg-white transition"
              />
              <button
                onClick={() => handleStartResearch()}
                disabled={isLoading}
                className="px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg shadow-sm transition flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
              >
                <Sparkles size={18} />
                <span>
                  {isLoading ? "Consultando Bases..." : "Iniciar Pesquisa →"}
                </span>
              </button>
            </div>

            {/* Quick Example Pills */}
            <div className="text-center space-y-2.5">
              <p className="text-sm text-slate-500 font-medium">
                Ou teste imediatamente com um exemplo:
              </p>
              <div className="flex flex-wrap justify-center gap-2.5">
                {quickExamples.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => {
                      setTopic(ex);
                      handleStartResearch(ex);
                    }}
                    className="px-4 py-2 rounded-full bg-white border border-slate-200 hover:border-slate-400 text-slate-700 text-sm font-medium transition cursor-pointer shadow-sm"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>

            {/* Editorial PICO Summary Card (From Proposal 2) */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                    Protocolo Metodológico Atual
                  </span>
                  <h2 className="serif-title text-2xl font-bold text-slate-900 mt-0.5">
                    Decomposição PICO & Estratégia de Busca
                  </h2>
                </div>
                <button
                  onClick={() => setWizardStep(2)}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm flex items-center gap-2 cursor-pointer transition"
                >
                  <span>Ver Laboratório Pixel Art HD-2D</span>
                  <ArrowRight size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                    População (P)
                  </div>
                  <div className="text-base text-slate-900 font-medium mt-1 leading-snug">
                    {pico.population}
                  </div>
                </div>
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                    Intervenção (I)
                  </div>
                  <div className="text-base text-slate-900 font-medium mt-1 leading-snug">
                    {pico.intervention}
                  </div>
                </div>
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                    Comparador (C)
                  </div>
                  <div className="text-base text-slate-900 font-medium mt-1 leading-snug">
                    {pico.comparator}
                  </div>
                </div>
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                    Desfechos (O)
                  </div>
                  <div className="text-base text-slate-900 font-medium mt-1 leading-snug">
                    {pico.outcome}
                  </div>
                </div>
              </div>

              <div className="pt-1 space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Query Booleana Principal (OpenAlex / PubMed)
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-sm overflow-x-auto">
                  {booleanQueries[0]}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* =========================================================
            STEP 2: LABORATÓRIO PIXEL ART HD-2D AMPLO & DIDÁTICO
           ========================================================= */}
        {wizardStep === 2 && (
          <section className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-sm font-bold text-blue-600 uppercase">
                  Etapa 2 de 4 • O Trabalho dos Agentes em Tempo Real
                </span>
                <h2 className="serif-title text-3xl font-bold text-slate-900 mt-0.5">
                  Laboratório Científico Pixel Art HD-2D
                </h2>
              </div>

              <button
                onClick={() => setWizardStep(3)}
                className="px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-base shadow-md transition flex items-center gap-2 cursor-pointer"
              >
                <span>
                  Avançar para Aprovar Artigos ({papers.length} encontrados)
                </span>
                <ArrowRight size={18} />
              </button>
            </div>

            {/* Full-Width WebGL 3D Scene */}
            <IsometricLabCanvas
              currentStep={currentStep}
              hitlPending={hitlPending}
              selectedBenchId={selectedBenchId}
              onSelectBench={(benchId) => setSelectedBenchId(benchId)}
              onOpenHitl={() => setWizardStep(3)}
            />

            {/* Single Clean Didactic Explanation Banner Below the 3D Scene */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
                  {activeBenchInfo.badge}
                </span>
                <h3 className="text-xl font-bold text-slate-900">
                  {activeBenchInfo.title}
                </h3>
                <p className="text-base text-slate-600 leading-relaxed">
                  {activeBenchInfo.description}
                </p>
              </div>

              <button
                onClick={() => setWizardStep(3)}
                className="px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-base shrink-0 cursor-pointer transition"
              >
                Revisar os {papers.length} Artigos →
              </button>
            </div>
          </section>
        )}

        {/* =========================================================
            STEP 3: TRIAGEM HUMANA (HITL) — CARDS GRANDES E CLAROS
           ========================================================= */}
        {wizardStep === 3 && (
          <section className="space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
              <div>
                <span className="text-sm font-bold text-amber-600 uppercase">
                  Etapa 3 de 4 • Sua Decisão Soberana (Human-in-the-Loop)
                </span>
                <h2 className="serif-title text-3xl font-bold text-slate-900 mt-1">
                  Quais artigos devem entrar na sua revisão?
                </h2>
                <p className="text-base text-slate-600 mt-1">
                  Desmarque qualquer artigo fora do escopo antes de o Agente Metodologista auditar o risco de viés.
                </p>
              </div>

              <button
                onClick={handleApproveScreening}
                disabled={isLoading || selectedPaperIds.size === 0}
                className="px-7 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 size={18} />
                <span>
                  {isLoading
                    ? "Auditando Artigos..."
                    : `Confirmar ${selectedPaperIds.size} Artigos e Gerar Matriz →`}
                </span>
              </button>
            </div>

            {/* Selection Controls */}
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span className="font-semibold">
                {selectedPaperIds.size} de {papers.length} estudos selecionados para inclusão
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() =>
                    setSelectedPaperIds(new Set(papers.map((p) => p.id)))
                  }
                  className="text-blue-600 hover:underline font-semibold cursor-pointer"
                >
                  Marcar Todos
                </button>
                <span>•</span>
                <button
                  onClick={() => setSelectedPaperIds(new Set())}
                  className="text-slate-500 hover:underline font-medium cursor-pointer"
                >
                  Desmarcar Todos
                </button>
              </div>
            </div>

            {/* Large Selectable Article Cards */}
            <div className="space-y-4">
              {papers.map((paper) => {
                const isSelected = selectedPaperIds.has(paper.id);
                return (
                  <div
                    key={paper.id}
                    onClick={() => togglePaperSelection(paper.id)}
                    className={`p-6 rounded-2xl bg-white border-2 transition cursor-pointer ${
                      isSelected
                        ? "border-blue-600 shadow-sm"
                        : "border-slate-200 opacity-60 hover:opacity-90"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-5 h-5 mt-1.5 accent-blue-600 cursor-pointer shrink-0"
                      />
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="px-3 py-1 rounded-lg bg-blue-50 text-blue-800 font-semibold text-xs border border-blue-200">
                              {paper.journal || "Periódico Científico"} •{" "}
                              {paper.year || 2024}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium">
                              Fonte: {paper.source_api}
                            </span>
                          </div>

                          {paper.doi && (
                            <a
                              href={`https://doi.org/${paper.doi}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs font-mono text-blue-600 hover:underline inline-flex items-center gap-1"
                            >
                              <span>DOI: {paper.doi}</span>
                              <ExternalLink size={12} />
                            </a>
                          )}
                        </div>

                        <h3 className="text-xl font-bold text-slate-900 leading-snug">
                          {paper.title}
                        </h3>

                        <div className="text-sm text-slate-500 font-medium">
                          Autores: {paper.authors.join(", ")}
                        </div>

                        {paper.abstract && (
                          <p className="text-base text-slate-600 leading-relaxed pt-1">
                            {paper.abstract}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* =========================================================
            STEP 4: RESULTADO FINAL (CADERNO PRISMA 2020 & LACUNAS)
           ========================================================= */}
        {wizardStep === 4 && (
          <section className="space-y-12">
            {/* Top Editorial Header & Export Bar */}
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-6">
              <div>
                <span className="text-sm font-bold text-emerald-700 uppercase">
                  Etapa 4 de 4 • Revisão Sistemática Concluída
                </span>
                <h2 className="serif-title text-3xl md:text-4xl font-bold text-slate-900 mt-1">
                  Caderno de Síntese PRISMA 2020 & RoB 2
                </h2>
                <p className="text-base text-slate-600 mt-1">
                  {prismaRows.length} estudos auditados com extração de amostra (N), desfechos e citações literais rastreáveis.
                </p>
              </div>

              <ExportToolbar reviewId={reviewId} />
            </div>

            {/* View Mode Toggle: Detailed Study Cards (Proposal 1) vs Clean Editorial Table (Proposal 2) */}
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="serif-title text-2xl font-bold text-slate-900">
                  Estudos Incluídos e Auditados
                </h3>

                <div className="inline-flex items-center bg-slate-200/70 p-1 rounded-xl">
                  <button
                    onClick={() => setResultViewMode("cards")}
                    className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition cursor-pointer ${
                      resultViewMode === "cards"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <LayoutGrid size={15} />
                    <span>Fichas Detalhadas</span>
                  </button>
                  <button
                    onClick={() => setResultViewMode("table")}
                    className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition cursor-pointer ${
                      resultViewMode === "table"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Table2 size={15} />
                    <span>Tabela Comparativa</span>
                  </button>
                </div>
              </div>

              {resultViewMode === "cards" ? (
                <div className="space-y-5">
                  {prismaRows.map((row) => (
                    <div
                      key={row.paper_id}
                      className="bg-white p-7 rounded-3xl border border-slate-200 shadow-sm space-y-5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-xl font-extrabold text-blue-700">
                            {row.citation_key}
                          </span>
                          <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200">
                            {row.journal || "Periódico"} • Qualis{" "}
                            {row.qualis_capes || "A1"} ({row.sjr_quartile || "Q1"})
                          </span>
                          <a
                            href={`https://doi.org/${row.doi}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-mono text-slate-500 hover:text-blue-600 inline-flex items-center gap-1"
                          >
                            <span>DOI: {row.doi}</span>
                            <ExternalLink size={12} />
                          </a>
                        </div>

                        {row.risk_of_bias === "LOW" ? (
                          <span className="px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-xs inline-flex items-center gap-1.5">
                            <CheckCircle2 size={14} className="text-emerald-600" />
                            Baixo Risco de Viés (RoB 2)
                          </span>
                        ) : row.risk_of_bias === "HIGH" ? (
                          <span className="px-4 py-1.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 font-bold text-xs inline-flex items-center gap-1.5">
                            <AlertCircle size={14} className="text-rose-600" />
                            Alto Risco de Viés (RoB 2)
                          </span>
                        ) : (
                          <span className="px-4 py-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold text-xs inline-flex items-center gap-1.5">
                            <AlertCircle size={14} className="text-amber-600" />
                            Algumas Preocupações (RoB 2)
                          </span>
                        )}
                      </div>

                      <h4 className="text-xl font-bold text-slate-900 leading-snug">
                        {row.title}
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
                          <div className="text-xs font-bold uppercase text-slate-500">
                            Amostra (População)
                          </div>
                          <div className="text-lg font-bold text-slate-900 mt-1">
                            {row.population_n || "N/A"}
                          </div>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
                          <div className="text-xs font-bold uppercase text-slate-500">
                            Intervenção & Controle
                          </div>
                          <div className="text-sm font-semibold text-slate-900 mt-1 leading-snug">
                            {row.intervention} vs. {row.comparator}
                          </div>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
                          <div className="text-xs font-bold uppercase text-slate-500">
                            Desfecho Estatístico
                          </div>
                          <div className="text-sm font-semibold text-emerald-800 mt-1 leading-snug">
                            {row.outcomes}
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 flex items-start gap-3 text-sm text-slate-700 italic">
                        <Quote
                          size={16}
                          className="text-blue-600 shrink-0 mt-0.5"
                        />
                        <div>
                          <strong className="not-italic text-slate-900">
                            Trecho Original Rastreado (p. {row.page_reference || 1}):{" "}
                          </strong>
                          {row.traceable_quote}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <PrismaMatrixTable rows={prismaRows} />
              )}
            </div>

            {/* Knowledge Gaps Section */}
            <KnowledgeGapsCard gaps={knowledgeGaps} />
          </section>
        )}
      </main>

      {/* BYOK Free API Keys Configuration Modal */}
      <ByokConfigModal />
    </div>
  );
}
