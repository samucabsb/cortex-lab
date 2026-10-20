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
  HelpCircle,
} from "lucide-react";

interface Step1Props {
  onReviewCreated: (reviewId: string) => void;
}

export const Step1PicoDefinition: React.FC<Step1Props> = ({ onReviewCreated }) => {
  const { byok, setByokModalOpen } = useLabStore();

  const [topic, setTopic] = useState("");
  const [pico, setPico] = useState<PicoData>({
    population: "",
    intervention: "",
    comparator: "",
    outcome: "",
  });
  const [booleanQueries, setBooleanQueries] = useState<string[]>([
    "",
  ]);
  const [aiAssisted, setAiAssisted] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const hasByokKeys = Boolean(byok.geminiApiKey || byok.groqApiKey);

  const handlePicoChange = (field: keyof PicoData, val: string) => {
    setPico((prev) => {
      const updated = { ...prev, [field]: val };
      // Auto-update first query if empty or default
      if (booleanQueries.length === 1 && !booleanQueries[0]) {
        const parts = [updated.population, updated.intervention, updated.comparator]
          .filter((s) => s.trim().length > 3)
          .map((s) => `"${s.trim().slice(0, 30)}"`);
        if (parts.length >= 2) {
          setBooleanQueries([parts.join(" AND ")]);
        }
      }
      return updated;
    });
  };

  const handleAddQuery = () => {
    setBooleanQueries((prev) => [...prev, ""]);
  };

  const handleUpdateQuery = (idx: number, val: string) => {
    setBooleanQueries((prev) => {
      const copy = [...prev];
      copy[idx] = val;
      return copy;
    });
  };

  const handleRemoveQuery = (idx: number) => {
    if (booleanQueries.length <= 1) return;
    setBooleanQueries((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSuggestWithAi = async () => {
    if (!topic.trim()) {
      setErrorMsg("Digite um tema ou pergunta de pesquisa para receber sugestões da IA.");
      return;
    }

    if (!hasByokKeys) {
      setErrorMsg("A sugestão por IA exige sua chave de API gratuita (Gemini ou Groq). Clique em 'Chave IA' acima.");
      setByokModalOpen(true);
      return;
    }

    setIsSuggesting(true);
    setErrorMsg(null);

    try {
      const res = await suggestProtocol(topic.trim(), {
        byokGeminiKey: byok.geminiApiKey,
        byokGroqKey: byok.groqApiKey,
      });

      if (res.pico) {
        setPico(res.pico);
      }
      if (res.boolean_queries?.length) {
        setBooleanQueries(res.boolean_queries);
      }
      setAiAssisted(true);
    } catch (err: any) {
      console.error("[Step1] Erro na sugestão por IA:", err);
      setErrorMsg(err.message || "Falha ao gerar sugestão. Verifique sua chave de IA.");
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
  };

  const handleStartReview = async () => {
    setErrorMsg(null);

    if (!topic.trim()) {
      setErrorMsg("Preencha a pergunta ou tema de pesquisa.");
      return;
    }
    if (
      !pico.population.trim() ||
      !pico.intervention.trim() ||
      !pico.comparator.trim() ||
      !pico.outcome.trim()
    ) {
      setErrorMsg("Preencha todos os 4 campos do quadro PICO (População, Intervenção, Comparador e Desfecho).");
      return;
    }

    const cleanQueries = booleanQueries.map((q) => q.trim()).filter((q) => q.length > 0);
    if (cleanQueries.length === 0) {
      setErrorMsg("Informe ao menos uma query booleana válida para busca nas bases OpenAlex e PubMed.");
      return;
    }

    setIsStarting(true);
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
    <div className="space-y-10">
      {/* Intro Editorial Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto pt-2">
        <span className="inline-block px-4 py-1.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200/80 font-semibold text-xs uppercase tracking-wider">
          Etapa 1 de 4 • Protocolo Metodológico & Estratégia de Busca
        </span>
        <h1 className="serif-title text-4xl md:text-5xl font-bold text-slate-900 leading-tight">
          Definição da Pergunta Científica
        </h1>
        <p className="text-base md:text-lg text-slate-600 leading-relaxed font-sans">
          Estruture o protocolo rigoroso <strong>PICO</strong> e a query booleana.
          O CortexLab conecta-se diretamente a <strong>OpenAlex, PubMed/Europe PMC e Crossref</strong>{" "}
          sem dados inventados.
        </p>
      </div>

      {/* Error notification */}
      {errorMsg && (
        <div className="max-w-4xl mx-auto p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3 shadow-sm">
          <AlertCircle size={20} className="text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">{errorMsg}</div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-xs font-semibold text-rose-700 hover:text-rose-900"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Main Form Container */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/90 shadow-sm max-w-4xl mx-auto space-y-8">
        {/* Research Topic */}
        <div className="space-y-2.5">
          <label className="block text-sm font-bold text-slate-900 uppercase tracking-wider">
            Pergunta Principal de Pesquisa
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ex: Eficácia e toxicidade de células CAR-T em tumores sólidos refratários"
              className="flex-1 px-5 py-3.5 text-base text-slate-900 bg-slate-50/70 rounded-2xl border border-slate-200 focus:outline-none focus:border-blue-600 focus:bg-white transition"
            />
            <button
              type="button"
              onClick={handleSuggestWithAi}
              disabled={isSuggesting}
              className="px-5 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm flex items-center justify-center gap-2 shrink-0 cursor-pointer transition disabled:opacity-50"
              title={
                hasByokKeys
                  ? "Sugerir PICO e Queries com IA (Gemini/Groq)"
                  : "Configure sua Chave de IA para usar este recurso"
              }
            >
              <Sparkles size={16} className="text-amber-400" />
              <span>{isSuggesting ? "Analisando..." : "Sugerir com IA"}</span>
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-1">
            <span>Seja específico quanto à intervenção e condição clínica investigada.</span>
            {!hasByokKeys && (
              <button
                onClick={() => setByokModalOpen(true)}
                className="text-blue-600 hover:underline inline-flex items-center gap-1 font-medium cursor-pointer"
              >
                <Key size={12} />
                <span>Ativar Chave IA para preenchimento assistido</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Scientific Presets */}
        <div className="space-y-2 border-t border-slate-100 pt-5">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Ou comece com um protocolo pré-configurado:
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                handleApplyPreset(
                  "Eficácia e toxicidade de células CAR-T em tumores sólidos",
                  {
                    population: "Pacientes adultos com neoplasias sólidas avançadas ou refratárias",
                    intervention: "Terapia celular adotiva CAR-T de 2ª ou 3ª geração",
                    comparator: "Quimioterapia padrão, inibidores de checkpoint ou placebo",
                    outcome: "Taxa de resposta objetiva (ORR), sobrevida global (OS) e incidência de CRS",
                  },
                  '("CAR-T" OR "Chimeric Antigen Receptor") AND ("solid tumors" OR "neoplasms") AND (randomized OR trial)'
                )
              }
              className="px-3.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium transition cursor-pointer"
            >
              Células CAR-T em Tumores Sólidos
            </button>

            <button
              type="button"
              onClick={() =>
                handleApplyPreset(
                  "Edição gênica CRISPR-Cas9 em modelos de Distrofia Muscular de Duchenne",
                  {
                    population: "Modelos pré-clínicos in-vivo ou pacientes portadores de mutações na distrofina",
                    intervention: "Edição gênica via sistema CRISPR-Cas9 mediado por vetor AAV",
                    comparator: "Animais controle não tratados ou terapia com oligonucleotídeos antisense",
                    outcome: "Restauração da expressão de distrofina e força contrátil muscular",
                  },
                  '("CRISPR-Cas9" OR "gene editing") AND ("Duchenne muscular dystrophy" OR "DMD")'
                )
              }
              className="px-3.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium transition cursor-pointer"
            >
              CRISPR em Distrofia de Duchenne
            </button>

            <button
              type="button"
              onClick={() =>
                handleApplyPreset(
                  "Modelos de Deep Learning na detecção precoce de nódulos pulmonares em Tomografia",
                  {
                    population: "Pacientes adultos submetidos a rastreamento por Tomografia Computadorizada (TC)",
                    intervention: "Algoritmos de Redes Neurais Convolucionais (CNN / Vision Transformers)",
                    comparator: "Leitura radiológica convencional independente por especialista",
                    outcome: "Sensibilidade, especificidade e área sob a curva ROC (AUC)",
                  },
                  '("Deep Learning" OR "Convolutional Neural Network") AND ("lung cancer screening" OR "pulmonary nodules") AND ("computed tomography")'
                )
              }
              className="px-3.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium transition cursor-pointer"
            >
              Deep Learning em Oncologia
            </button>
          </div>
        </div>

        {/* 2x2 PICO Interactive Grid */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Quadro PICO Metodológico</span>
              {aiAssisted && (
                <span className="px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold">
                  Assistido por IA (Revisável)
                </span>
              )}
            </h2>
            <span className="text-xs text-slate-500">Todos os 4 quadrantes são obrigatórios</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Population */}
            <div className="p-5 rounded-2xl bg-[#FCFBF9] border border-slate-200 space-y-2 focus-within:border-blue-600 focus-within:bg-white transition">
              <div className="flex items-center gap-2 text-emerald-800">
                <Users size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">
                  População / Pacientes (P)
                </span>
              </div>
              <textarea
                rows={3}
                value={pico.population}
                onChange={(e) => handlePicoChange("population", e.target.value)}
                placeholder="Descreva a coorte clínica, faixa etária, patologia ou modelo experimental..."
                className="w-full text-sm text-slate-800 bg-transparent resize-none focus:outline-none placeholder-slate-400 leading-relaxed font-sans"
              />
            </div>

            {/* Intervention */}
            <div className="p-5 rounded-2xl bg-[#FCFBF9] border border-slate-200 space-y-2 focus-within:border-blue-600 focus-within:bg-white transition">
              <div className="flex items-center gap-2 text-blue-800">
                <Syringe size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Intervenção / Tecnologia (I)
                </span>
              </div>
              <textarea
                rows={3}
                value={pico.intervention}
                onChange={(e) => handlePicoChange("intervention", e.target.value)}
                placeholder="Protocolo terapêutico, fármaco, algoritmo, dose ou procedimento avaliado..."
                className="w-full text-sm text-slate-800 bg-transparent resize-none focus:outline-none placeholder-slate-400 leading-relaxed font-sans"
              />
            </div>

            {/* Comparator */}
            <div className="p-5 rounded-2xl bg-[#FCFBF9] border border-slate-200 space-y-2 focus-within:border-blue-600 focus-within:bg-white transition">
              <div className="flex items-center gap-2 text-amber-800">
                <Scale size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Comparador / Controle (C)
                </span>
              </div>
              <textarea
                rows={3}
                value={pico.comparator}
                onChange={(e) => handlePicoChange("comparator", e.target.value)}
                placeholder="Padrão-ouro clínico, placebo, grupo controle ativo ou baseline..."
                className="w-full text-sm text-slate-800 bg-transparent resize-none focus:outline-none placeholder-slate-400 leading-relaxed font-sans"
              />
            </div>

            {/* Outcome */}
            <div className="p-5 rounded-2xl bg-[#FCFBF9] border border-slate-200 space-y-2 focus-within:border-blue-600 focus-within:bg-white transition">
              <div className="flex items-center gap-2 text-purple-800">
                <Activity size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Desfechos Mensuráveis (O)
                </span>
              </div>
              <textarea
                rows={3}
                value={pico.outcome}
                onChange={(e) => handlePicoChange("outcome", e.target.value)}
                placeholder="Endpoints primários e secundários, biomarcadores, toxicidade, p-valores..."
                className="w-full text-sm text-slate-800 bg-transparent resize-none focus:outline-none placeholder-slate-400 leading-relaxed font-sans"
              />
            </div>
          </div>
        </div>

        {/* Boolean Queries Editor */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Estratégia de Busca Booleana (OpenAlex & PubMed)
            </label>
            <button
              type="button"
              onClick={handleAddQuery}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
            >
              <Plus size={14} />
              <span>Adicionar Query Alternativa</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {booleanQueries.map((q, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400 w-6 text-right">
                  Q{idx + 1}
                </span>
                <input
                  type="text"
                  value={q}
                  onChange={(e) => handleUpdateQuery(idx, e.target.value)}
                  placeholder='Ex: ("CAR-T" OR "Chimeric Antigen Receptor") AND ("solid tumors")'
                  className="flex-1 px-4 py-2.5 bg-slate-900 text-slate-100 font-mono text-xs rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500"
                />
                {booleanQueries.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveQuery(idx)}
                    className="p-2 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                    title="Remover query"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            A primeira query booleana será executada prioritariamente na busca federada de artigos.
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <HelpCircle size={14} className="text-slate-400" />
            <span>O grafo de agentes será disparado em segundo plano com persistência SQLite.</span>
          </div>

          <button
            type="button"
            onClick={handleStartReview}
            disabled={isStarting}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
          >
            <span>{isStarting ? "Iniciando Agentes..." : "Iniciar Pesquisa Multiagente"}</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
