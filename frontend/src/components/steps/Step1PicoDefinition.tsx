"use client";

import React, { useState } from "react";
import { PicoData } from "@/types";
import { useLabStore } from "@/store/useLabStore";
import { suggestProtocol, createReview } from "@/lib/api";
import {
  Sparkles,
  ArrowRight,
  Plus,
  Trash2,
  Users,
  Syringe,
  Scale,
  Activity,
  Key,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  BookOpen,
  SlidersHorizontal,
} from "lucide-react";

interface Step1Props {
  onReviewCreated: (reviewId: string) => void;
  onPicoPreviewChange?: (pico: PicoData, queries: string[], busy: boolean) => void;
}

export const Step1PicoDefinition: React.FC<Step1Props> = ({
  onReviewCreated,
  onPicoPreviewChange,
}) => {
  const { byok, hasHydrated, setByokModalOpen } = useLabStore();

  const [topic, setTopic] = useState("");
  const [pico, setPico] = useState<PicoData>({
    population: "",
    intervention: "",
    comparator: "",
    outcome: "",
  });
  const [booleanQueries, setBooleanQueries] = useState<string[]>([""]);
  const [showAdvancedBoolean, setShowAdvancedBoolean] = useState(false);
  const [aiAssisted, setAiAssisted] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const hasByokKeys = hasHydrated && Boolean(byok.geminiApiKey || byok.groqApiKey);

  const notifyParent = (
    nextPico: PicoData,
    nextQueries: string[],
    busy = isSuggesting || isStarting
  ) => {
    onPicoPreviewChange?.(nextPico, nextQueries, busy);
  };

  const handlePicoChange = (field: keyof PicoData, val: string) => {
    setPico((prev) => {
      const updated = { ...prev, [field]: val };
      let nextQueries = booleanQueries;
      // Auto-build boolean query if user hasn't customized multiple queries
      if (booleanQueries.length === 1) {
        const parts = [updated.population, updated.intervention, updated.comparator]
          .filter((s) => s.trim().length > 3)
          .map((s) => `"${s.trim().slice(0, 35)}"`);
        if (parts.length >= 2) {
          nextQueries = [parts.join(" AND ")];
          setBooleanQueries(nextQueries);
        }
      }
      notifyParent(updated, nextQueries);
      return updated;
    });
  };

  const handleAddQuery = () => {
    setBooleanQueries((prev) => {
      const next = [...prev, ""];
      notifyParent(pico, next);
      return next;
    });
  };

  const handleUpdateQuery = (idx: number, val: string) => {
    setBooleanQueries((prev) => {
      const copy = [...prev];
      copy[idx] = val;
      notifyParent(pico, copy);
      return copy;
    });
  };

  const handleRemoveQuery = (idx: number) => {
    if (booleanQueries.length <= 1) return;
    setBooleanQueries((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      notifyParent(pico, next);
      return next;
    });
  };

  const handleSuggestWithAi = async () => {
    if (!topic.trim()) {
      setErrorMsg("Digite um tema ou pergunta de pesquisa para receber sugestões da IA.");
      return;
    }

    if (!hasByokKeys) {
      setErrorMsg(
        "A sugestão por IA utiliza sua chave gratuita (Gemini ou Groq). Configure-a na janela aberta."
      );
      setByokModalOpen(true);
      return;
    }

    setIsSuggesting(true);
    setErrorMsg(null);
    notifyParent(pico, booleanQueries, true);

    try {
      const res = await suggestProtocol(topic.trim(), {
        byokGeminiKey: byok.geminiApiKey,
        byokGroqKey: byok.groqApiKey,
      });

      const nextPico = res.pico || pico;
      const nextQueries = res.boolean_queries?.length
        ? res.boolean_queries
        : booleanQueries;

      setPico(nextPico);
      setBooleanQueries(nextQueries);
      setAiAssisted(true);
      notifyParent(nextPico, nextQueries, false);
    } catch (err: any) {
      console.error("[Step1] Erro na sugestão por IA:", err);
      setErrorMsg(err.message || "Falha ao gerar sugestão. Verifique sua chave de IA.");
      notifyParent(pico, booleanQueries, false);
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleApplyPreset = (
    presetTopic: string,
    presetPico: PicoData,
    presetQuery: string
  ) => {
    setTopic(presetTopic);
    setPico(presetPico);
    setBooleanQueries([presetQuery]);
    setAiAssisted(false);
    setErrorMsg(null);
    notifyParent(presetPico, [presetQuery], false);
  };

  const handleStartReview = async () => {
    setErrorMsg(null);

    if (!topic.trim()) {
      setErrorMsg("Preencha a pergunta ou tema central da pesquisa.");
      return;
    }
    if (
      !pico.population.trim() ||
      !pico.intervention.trim() ||
      !pico.comparator.trim() ||
      !pico.outcome.trim()
    ) {
      setErrorMsg(
        "Preencha todos os 4 campos do protocolo PICO (População, Intervenção, Comparador e Desfecho)."
      );
      return;
    }

    let cleanQueries = booleanQueries.map((q) => q.trim()).filter((q) => q.length > 0);
    if (cleanQueries.length === 0) {
      cleanQueries = [`"${pico.intervention.trim()}" AND "${pico.population.trim()}"`];
    }

    setIsStarting(true);
    notifyParent(pico, cleanQueries, true);

    try {
      const res = await createReview({
        topic: topic.trim(),
        pico: {
          population: pico.population.trim(),
          intervention: pico.intervention.trim(),
          comparator: pico.comparator.trim(),
          outcome: pico.outcome.trim(),
        },
        boolean_queries: cleanQueries,
        ai_assisted: aiAssisted,
        byok_gemini_key: byok.geminiApiKey || undefined,
        byok_groq_key: byok.groqApiKey || undefined,
      });

      if (res && res.review_id) {
        onReviewCreated(res.review_id);
      }
    } catch (err: any) {
      console.error("[Step1] Erro ao iniciar revisão:", err);
      setErrorMsg(err.message || "Erro de comunicação ao iniciar a revisão no servidor.");
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <section
      aria-labelledby="step1-heading"
      className="stage-enter space-y-6 max-w-5xl mx-auto"
    >
      {/* Error notification */}
      {errorMsg && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3 shadow-sm"
        >
          <AlertCircle size={20} className="text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">{errorMsg}</div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-xs font-semibold text-rose-700 hover:text-rose-900 cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Main Academic Protocol Card */}
      <div className="bg-white a11y-card rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-7">
        {/* Card Header + Quick Presets */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen size={13} />
              Etapa 1 • Protocolo de Revisão Sistemática (PRISMA 2020)
            </span>
            <h1
              id="step1-heading"
              className="serif-title text-2xl sm:text-3xl font-bold text-slate-900"
            >
              Definição da Pergunta Científica (PICO)
            </h1>
          </div>

          {/* Academic Examples */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 mr-1">
              Exemplos rápidos:
            </span>
            <button
              type="button"
              onClick={() =>
                handleApplyPreset(
                  "Eficácia e toxicidade de células CAR-T em tumores sólidos",
                  {
                    population:
                      "Pacientes adultos com neoplasias sólidas avançadas ou refratárias",
                    intervention: "Terapia celular adotiva CAR-T de 2ª ou 3ª geração",
                    comparator:
                      "Quimioterapia padrão, inibidores de checkpoint ou placebo",
                    outcome:
                      "Taxa de resposta objetiva (ORR), sobrevida global (OS) e incidência de CRS",
                  },
                  '("CAR-T" OR "Chimeric Antigen Receptor") AND ("solid tumors" OR "neoplasms") AND (randomized OR trial)'
                )
              }
              className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-800 border border-slate-200 text-slate-700 text-xs font-medium transition cursor-pointer"
            >
              CAR-T em Tumores Sólidos
            </button>

            <button
              type="button"
              onClick={() =>
                handleApplyPreset(
                  "Edição gênica CRISPR-Cas9 em modelos de Distrofia Muscular de Duchenne",
                  {
                    population:
                      "Modelos pré-clínicos in-vivo ou pacientes portadores de mutações na distrofina",
                    intervention:
                      "Edição gênica via sistema CRISPR-Cas9 mediado por vetor AAV",
                    comparator:
                      "Animais controle não tratados ou terapia com oligonucleotídeos antisense",
                    outcome:
                      "Restauração da expressão de distrofina e força contrátil muscular",
                  },
                  '("CRISPR-Cas9" OR "gene editing") AND ("Duchenne muscular dystrophy" OR "DMD")'
                )
              }
              className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-800 border border-slate-200 text-slate-700 text-xs font-medium transition cursor-pointer"
            >
              CRISPR em Distrofia
            </button>

            <button
              type="button"
              onClick={() =>
                handleApplyPreset(
                  "Modelos de Deep Learning na detecção precoce de nódulos pulmonares em Tomografia",
                  {
                    population:
                      "Pacientes adultos submetidos a rastreamento por Tomografia Computadorizada (TC)",
                    intervention:
                      "Algoritmos de Redes Neurais Convolucionais (CNN / Vision Transformers)",
                    comparator:
                      "Leitura radiológica convencional independente por especialista",
                    outcome:
                      "Sensibilidade, especificidade e área sob a curva ROC (AUC)",
                  },
                  '("Deep Learning" OR "Convolutional Neural Network") AND ("lung cancer screening" OR "pulmonary nodules") AND ("computed tomography")'
                )
              }
              className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-800 border border-slate-200 text-slate-700 text-xs font-medium transition cursor-pointer"
            >
              IA em Oncologia
            </button>
          </div>
        </div>

        {/* Research Topic */}
        <div className="space-y-2">
          <label
            htmlFor="research-topic-input"
            className="block text-xs font-bold text-slate-800 uppercase tracking-wider"
          >
            Tema ou Pergunta Central da Pesquisa
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              id="research-topic-input"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ex: Eficácia clínica de células CAR-T em pacientes com tumores sólidos"
              className="flex-1 px-4 py-3 text-base text-slate-900 bg-slate-50/80 rounded-2xl border border-slate-200 focus:outline-none focus:border-blue-600 focus:bg-white transition"
            />
            <button
              type="button"
              onClick={handleSuggestWithAi}
              disabled={isSuggesting}
              className="px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shrink-0 cursor-pointer transition disabled:opacity-50"
              title="Preencher automaticamente o quadro PICO usando Inteligência Artificial"
            >
              <Sparkles size={15} className="text-amber-400" aria-hidden="true" />
              <span>{isSuggesting ? "Estruturando..." : "Preencher PICO com IA"}</span>
            </button>
          </div>
          {!hasByokKeys && hasHydrated && (
            <div className="text-xs text-slate-500 flex items-center justify-between pt-0.5">
              <span>
                Você pode preencher manualmente abaixo, clicar num exemplo acima ou usar IA.
              </span>
              <button
                type="button"
                onClick={() => setByokModalOpen(true)}
                className="text-blue-700 hover:underline inline-flex items-center gap-1 font-medium cursor-pointer"
              >
                <Key size={12} />
                <span>Configurar chave gratuita do Gemini/Groq</span>
              </button>
            </div>
          )}
        </div>

        {/* 2x2 PICO Interactive Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Estrutura Metodológica PICO</span>
              {aiAssisted && (
                <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-semibold">
                  Sugerido por IA • Revisável
                </span>
              )}
            </h2>
            <span className="text-xs text-slate-500">
              Base para busca nas bases OpenAlex e PubMed
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Population */}
            <div className="p-4 rounded-2xl bg-[#FCFBF9] border border-slate-200 space-y-1.5 focus-within:border-blue-600 focus-within:bg-white transition">
              <label
                htmlFor="pico-p"
                className="flex items-center justify-between text-emerald-800 cursor-pointer"
              >
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                  <Users size={15} aria-hidden="true" />
                  População / Condição (P)
                </span>
                <span className="text-[11px] text-slate-400 font-normal">
                  Quem é estudado?
                </span>
              </label>
              <textarea
                id="pico-p"
                rows={2}
                value={pico.population}
                onChange={(e) => handlePicoChange("population", e.target.value)}
                placeholder="Ex: Pacientes adultos com tumores sólidos avançados..."
                className="w-full text-sm text-slate-800 bg-transparent resize-none focus:outline-none placeholder-slate-400 leading-relaxed font-sans"
              />
            </div>

            {/* Intervention */}
            <div className="p-4 rounded-2xl bg-[#FCFBF9] border border-slate-200 space-y-1.5 focus-within:border-blue-600 focus-within:bg-white transition">
              <label
                htmlFor="pico-i"
                className="flex items-center justify-between text-blue-800 cursor-pointer"
              >
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                  <Syringe size={15} aria-hidden="true" />
                  Intervenção / Exposição (I)
                </span>
                <span className="text-[11px] text-slate-400 font-normal">
                  Qual tratamento/método?
                </span>
              </label>
              <textarea
                id="pico-i"
                rows={2}
                value={pico.intervention}
                onChange={(e) => handlePicoChange("intervention", e.target.value)}
                placeholder="Ex: Terapia celular adotiva com células CAR-T..."
                className="w-full text-sm text-slate-800 bg-transparent resize-none focus:outline-none placeholder-slate-400 leading-relaxed font-sans"
              />
            </div>

            {/* Comparator */}
            <div className="p-4 rounded-2xl bg-[#FCFBF9] border border-slate-200 space-y-1.5 focus-within:border-blue-600 focus-within:bg-white transition">
              <label
                htmlFor="pico-c"
                className="flex items-center justify-between text-amber-800 cursor-pointer"
              >
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                  <Scale size={15} aria-hidden="true" />
                  Comparador / Controle (C)
                </span>
                <span className="text-[11px] text-slate-400 font-normal">
                  Comparado com o quê?
                </span>
              </label>
              <textarea
                id="pico-c"
                rows={2}
                value={pico.comparator}
                onChange={(e) => handlePicoChange("comparator", e.target.value)}
                placeholder="Ex: Quimioterapia padrão ou placebo..."
                className="w-full text-sm text-slate-800 bg-transparent resize-none focus:outline-none placeholder-slate-400 leading-relaxed font-sans"
              />
            </div>

            {/* Outcome */}
            <div className="p-4 rounded-2xl bg-[#FCFBF9] border border-slate-200 space-y-1.5 focus-within:border-blue-600 focus-within:bg-white transition">
              <label
                htmlFor="pico-o"
                className="flex items-center justify-between text-purple-800 cursor-pointer"
              >
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                  <Activity size={15} aria-hidden="true" />
                  Desfechos Mensuráveis (O)
                </span>
                <span className="text-[11px] text-slate-400 font-normal">
                  O que é medido?
                </span>
              </label>
              <textarea
                id="pico-o"
                rows={2}
                value={pico.outcome}
                onChange={(e) => handlePicoChange("outcome", e.target.value)}
                placeholder="Ex: Taxa de resposta objetiva (ORR) e sobrevida global..."
                className="w-full text-sm text-slate-800 bg-transparent resize-none focus:outline-none placeholder-slate-400 leading-relaxed font-sans"
              />
            </div>
          </div>
        </div>

        {/* Collapsible Advanced Boolean Query Section */}
        <div className="border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={() => setShowAdvancedBoolean(!showAdvancedBoolean)}
            aria-expanded={showAdvancedBoolean}
            className="w-full flex items-center justify-between text-xs font-semibold text-slate-600 hover:text-slate-900 py-1 cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <SlidersHorizontal size={14} className="text-slate-400" />
              <span>
                Equação Booleana de Busca (OpenAlex & Europe PMC):{" "}
                <code className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-800">
                  {booleanQueries[0] || "Gerada automaticamente a partir do PICO"}
                </code>
              </span>
            </span>
            <span className="flex items-center gap-1 text-blue-700">
              {showAdvancedBoolean ? (
                <>
                  <span>Ocultar avançado</span>
                  <ChevronUp size={14} />
                </>
              ) : (
                <>
                  <span>Personalizar equação</span>
                  <ChevronDown size={14} />
                </>
              )}
            </span>
          </button>

          {showAdvancedBoolean && (
            <div className="mt-3 space-y-2.5 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 stage-enter">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  Queries Booleanas Customizadas (AND / OR)
                </span>
                <button
                  type="button"
                  onClick={handleAddQuery}
                  className="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Adicionar variação</span>
                </button>
              </div>
              {booleanQueries.map((q, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-500 w-6 text-right">
                    Q{idx + 1}
                  </span>
                  <input
                    type="text"
                    value={q}
                    aria-label={`Equação booleana ${idx + 1}`}
                    onChange={(e) => handleUpdateQuery(idx, e.target.value)}
                    placeholder='Ex: ("CAR-T" OR "Chimeric Antigen Receptor") AND ("solid tumors")'
                    className="flex-1 px-3.5 py-2 bg-white text-slate-900 font-mono text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600"
                  />
                  {booleanQueries.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveQuery(idx)}
                      className="p-2 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                      aria-label={`Remover equação ${idx + 1}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            Ao iniciar, observe acima o <strong>Dr. Turing</strong>, a{" "}
            <strong>Dra. Ada</strong> e o <strong>Dr. Cross</strong> buscando e
            validando os artigos em tempo real.
          </p>

          <button
            type="button"
            onClick={handleStartReview}
            disabled={isStarting}
            className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm sm:text-base shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span>
              {isStarting
                ? "Acionando Equipe Científica..."
                : "Iniciar Busca Científica nas Bases"}
            </span>
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
};
