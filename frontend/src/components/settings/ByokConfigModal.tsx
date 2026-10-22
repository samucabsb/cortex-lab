'use client';

import React, { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, CheckCircle2, Shield, ExternalLink, X, Cpu, Sparkles } from 'lucide-react';
import { useLabStore } from '@/store/useLabStore';

export const ByokConfigModal: React.FC = () => {
  const { byok, byokModalOpen, setByokModalOpen, saveByokSettings } = useLabStore();

  const [geminiKey, setGeminiKey] = useState(byok.geminiApiKey || '');
  const [groqKey, setGroqKey] = useState(byok.groqApiKey || '');
  const [provider, setProvider] = useState<'gemini' | 'groq' | 'backend'>(byok.preferredProvider || 'backend');

  useEffect(() => {
    if (byokModalOpen) {
      setGeminiKey(byok.geminiApiKey || '');
      setGroqKey(byok.groqApiKey || '');
      setProvider(byok.preferredProvider || 'backend');
    }
  }, [byokModalOpen, byok.geminiApiKey, byok.groqApiKey, byok.preferredProvider]);

  const [showGemini, setShowGemini] = useState(false);
  const [showGroq, setShowGroq] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!byokModalOpen) return null;

  const handleSave = () => {
    saveByokSettings({
      geminiApiKey: geminiKey.trim(),
      groqApiKey: groqKey.trim(),
      preferredProvider: provider,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      setByokModalOpen(false);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg p-6 bg-white border border-slate-200 rounded-2xl shadow-2xl text-slate-800 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-600">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-slate-900">
                  Configuração de Chaves de IA (BYOK)
                </h3>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  100% Gratuito
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Execute suas extrações com cotas gratuitas das APIs oficiais sem custos.
              </p>
            </div>
          </div>
          <button
            onClick={() => setByokModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security badge */}
        <div className="my-4 p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5 text-xs text-slate-600">
          <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-800">Privacidade Acadêmica:</span> Suas credenciais são mantidas exclusivamente no armazenamento local do seu navegador (localStorage).
          </div>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Provider Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Provedor de Modelos de Linguagem:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setProvider('backend')}
                className={`py-2 px-3 rounded-xl text-xs font-medium border text-center transition ${
                  provider === 'backend'
                    ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Servidor CortexLab
              </button>
              <button
                type="button"
                onClick={() => setProvider('gemini')}
                className={`py-2 px-3 rounded-xl text-xs font-medium border text-center transition flex items-center justify-center gap-1 ${
                  provider === 'gemini'
                    ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Gemini 1.5 Flash
              </button>
              <button
                type="button"
                onClick={() => setProvider('groq')}
                className={`py-2 px-3 rounded-xl text-xs font-medium border text-center transition flex items-center justify-center gap-1 ${
                  provider === 'groq'
                    ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Cpu className="w-3.5 h-3.5 text-amber-600" />
                Groq (Llama 3.3)
              </button>
            </div>
          </div>

          {/* Google Gemini Key */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
                Google Gemini API Key (15 RPM Grátis)
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline"
              >
                Obter no Google AI Studio <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="relative">
              <input
                type={showGemini ? 'text' : 'password'}
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-3.5 py-2 pr-10 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white font-mono"
              />
              <button
                type="button"
                onClick={() => setShowGemini(!showGemini)}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showGemini ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Groq Cloud Key */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-600 inline-block" />
                Groq Cloud API Key (30 RPM Grátis)
              </label>
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-amber-700 hover:text-amber-800 flex items-center gap-1 hover:underline"
              >
                Obter no Groq Console <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="relative">
              <input
                type={showGroq ? 'text' : 'password'}
                value={groqKey}
                onChange={(e) => setGroqKey(e.target.value)}
                placeholder="gsk_..."
                className="w-full px-3.5 py-2 pr-10 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white font-mono"
              />
              <button
                type="button"
                onClick={() => setShowGroq(!showGroq)}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showGroq ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
          <div className="text-[11px] text-slate-500">
            {savedSuccess ? (
              <span className="text-emerald-600 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Chaves salvas com sucesso!
              </span>
            ) : (
              'Suas chaves são usadas para auditoria em tempo real.'
            )}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setByokModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition active:scale-95"
            >
              Salvar Chaves
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
