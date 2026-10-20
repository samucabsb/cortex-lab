"use client";

import React from "react";
import { KnowledgeGapItem } from "@/types";
import { Sparkles, HelpCircle, Compass, ExternalLink } from "lucide-react";

interface KnowledgeGapsCardProps {
  gaps: KnowledgeGapItem[];
}

export const KnowledgeGapsCard: React.FC<KnowledgeGapsCardProps> = ({
  gaps,
}) => {
  if (!gaps || gaps.length === 0) return null;

  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm space-y-5">
      <div className="flex items-center gap-3.5 border-b border-slate-100 pb-4">
        <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 border border-purple-200">
          <Sparkles size={20} />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Lacunas de Conhecimento Científico (Knowledge Gaps)
          </h3>
          <p className="text-sm text-slate-500">
            Perguntas abertas na literatura e hipóteses testáveis derivadas das limitações dos artigos incluídos
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {gaps.map((gap) => (
          <div
            key={gap.gap_id}
            className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-4 transition hover:border-slate-300 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                  {gap.gap_id} • {gap.domain}
                </span>
              </div>

              <h4 className="text-base font-bold text-slate-900 leading-snug">
                {gap.title}
              </h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                {gap.description}
              </p>
            </div>

            <div className="space-y-3 pt-2">
              {/* Unanswered Research Question */}
              <div className="p-4 rounded-xl bg-amber-50/90 border border-amber-200/90 space-y-1">
                <div className="flex items-start gap-2.5 text-sm">
                  <HelpCircle
                    size={17}
                    className="text-amber-600 shrink-0 mt-0.5"
                  />
                  <div>
                    <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">
                      Pergunta Não Respondida na Literatura:
                    </span>
                    <span className="text-amber-950 font-semibold italic leading-snug block mt-1">
                      &ldquo;{gap.unanswered_question}&rdquo;
                    </span>
                  </div>
                </div>
              </div>

              {/* Generated Hypothesis */}
              <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200/80 flex items-start gap-2.5 text-sm">
                <Compass size={17} className="text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold text-blue-800 uppercase tracking-wider block">
                    Hipótese Experimental Sugerida:
                  </span>
                  <span className="text-blue-950 leading-snug block mt-1">
                    {gap.suggested_hypothesis}
                  </span>
                </div>
              </div>

              {/* Supporting DOIs */}
              {gap.supporting_dois && gap.supporting_dois.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs font-medium text-slate-400">
                    DOIs de suporte:
                  </span>
                  {gap.supporting_dois.map((d) => (
                    <a
                      key={d}
                      href={`https://doi.org/${d}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-mono px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600 hover:text-blue-600 inline-flex items-center gap-1"
                    >
                      <span>{d}</span>
                      <ExternalLink size={10} />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
