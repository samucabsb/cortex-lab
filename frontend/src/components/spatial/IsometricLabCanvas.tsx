"use client";

import React, { useEffect, useRef, useState } from "react";
import { AgentBenchId } from "@/types";
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
} from "lucide-react";
import { PixelLabEngine, STAGE_HANDOFFS } from "./engine/PixelLabEngine";
import { LAB_NAV_NODES } from "./engine/NavGraph";

interface IsometricLabCanvasProps {
  currentStep: string;
  hitlPending: boolean;
  onSelectBench: (benchId: AgentBenchId) => void;
  selectedBenchId?: AgentBenchId | null;
  onOpenHitl?: () => void;
}

export const IsometricLabCanvas: React.FC<IsometricLabCanvasProps> = ({
  currentStep,
  hitlPending,
  onSelectBench,
  selectedBenchId,
  onOpenHitl,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const engineRef = useRef<PixelLabEngine | null>(null);

  // Local state for UI re-rendering
  const [activePhaseId, setActivePhaseId] = useState<number>(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(true);
  const [debugMode, setDebugMode] = useState<boolean>(false);

  // Initialize engine once
  if (!engineRef.current) {
    engineRef.current = new PixelLabEngine();
  }

  // Preload background map
  useEffect(() => {
    const img = new Image();
    img.src = "/assets/hd2d-empty-lab.jpg";
    img.onload = () => {
      bgImageRef.current = img;
    };
  }, []);

  // Sync phase with backend currentStep changes
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    if (currentStep === "PLANNING") {
      engine.setPhase(0);
      setActivePhaseId(0);
    } else if (currentStep === "MINING") {
      engine.setPhase(2);
      setActivePhaseId(2);
    } else if (currentStep === "SCREENING_CHECKPOINT") {
      engine.setPhase(5);
      setActivePhaseId(5);
    } else if (currentStep === "AUDITING") {
      engine.setPhase(8);
      setActivePhaseId(8);
    } else if (currentStep === "SYNTHESIS" || currentStep === "COMPLETED") {
      engine.setPhase(11);
      setActivePhaseId(11);
    }
  }, [currentStep]);

  // Main 60 FPS Pixel Art Engine Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const engine = engineRef.current;
    if (!canvas || !engine) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const renderLoop = (now: number) => {
      animId = requestAnimationFrame(renderLoop);

      // Handle HiDPI & Retina crispness
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const targetW = Math.round(rect.width * dpr);
      const targetH = Math.round(rect.height * dpr);

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      // Update engine physics and actors
      engine.update(now);

      // Keep local state in sync with auto-play advances
      const currPhase = engine.getCurrentPhase();
      if (currPhase.phaseId !== activePhaseId) {
        setActivePhaseId(currPhase.phaseId);
      }

      // Render entire scene with depth sorting and foreground occlusion
      engine.render(ctx, canvas.width, canvas.height, bgImageRef.current);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [activePhaseId]);

  const currentPhaseObj =
    STAGE_HANDOFFS[activePhaseId] || STAGE_HANDOFFS[0];

  const handleToggleAutoPlay = () => {
    if (!engineRef.current) return;
    const next = !isAutoPlaying;
    engineRef.current.setAutoPlay(next);
    setIsAutoPlaying(next);
  };

  const handleNextPhase = () => {
    if (!engineRef.current) return;
    engineRef.current.nextPhase();
    setActivePhaseId(engineRef.current.getCurrentPhase().phaseId);
  };

  const handlePrevPhase = () => {
    if (!engineRef.current) return;
    engineRef.current.prevPhase();
    setActivePhaseId(engineRef.current.getCurrentPhase().phaseId);
  };

  const handleToggleDebug = () => {
    if (!engineRef.current) return;
    const next = !debugMode;
    engineRef.current.setDebug(next);
    setDebugMode(next);
  };

  const jumpToRoomPhase = (roomId: AgentBenchId, targetPhaseId: number) => {
    onSelectBench(roomId);
    if (!engineRef.current) return;
    engineRef.current.setPhase(targetPhaseId);
    setActivePhaseId(targetPhaseId);
  };

  return (
    <div className="space-y-4 select-none">
      {/* Main Pixel Art HD-2D Interactive Viewport */}
      <div className="relative w-full aspect-[16/9] min-h-[480px] rounded-3xl overflow-hidden border-2 border-slate-800 bg-slate-950 shadow-2xl">
        <canvas
          ref={canvasRef}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = ((e.clientX - rect.left) / rect.width) * 100;
            const clickY = ((e.clientY - rect.top) / rect.height) * 100;

            // Find closest scientist/room clicked
            let closestRoom: AgentBenchId = "hitl";
            let minDist = 999;
            for (const node of Object.values(LAB_NAV_NODES)) {
              if (node.roomId === "corridor") continue;
              const d = Math.hypot(clickX - node.x, clickY - node.y);
              if (d < minDist) {
                minDist = d;
                closestRoom = node.roomId as AgentBenchId;
              }
            }
            onSelectBench(closestRoom);
          }}
          className="w-full h-full block cursor-pointer"
        />

        {/* Top Left Live Status Banner */}
        <div className="absolute top-4 left-4 z-20 max-w-lg flex items-center gap-2.5 bg-slate-900/95 backdrop-blur-md text-white px-4 py-2.5 rounded-2xl border border-slate-700 shadow-xl">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
          <span className="text-xs font-semibold tracking-wide leading-snug">
            {currentPhaseObj.banner}
          </span>
        </div>

        {/* Top Right Controls: Debug, Play/Pause, Step & HITL */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          {hitlPending && (
            <button
              onClick={onOpenHitl}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold shadow-lg flex items-center gap-1.5 transition cursor-pointer"
            >
              <Sparkles size={14} />
              <span>Aprovar Artigos (HITL)</span>
            </button>
          )}

          {/* Debug Mesh Toggle */}
          <button
            onClick={handleToggleDebug}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 shadow-md cursor-pointer ${
              debugMode
                ? "bg-rose-600 text-white border-rose-400"
                : "bg-slate-900/90 text-slate-300 border-slate-700 hover:bg-slate-800"
            }`}
            title="Alternar visualização da malha de navegação e colisões"
          >
            {debugMode ? <Eye size={13} /> : <EyeOff size={13} />}
            <span>Debug</span>
          </button>

          {/* Prev Step */}
          <button
            onClick={handlePrevPhase}
            className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 shadow-lg cursor-pointer"
            title="Etapa anterior"
          >
            <ChevronLeft size={15} />
          </button>

          {/* Play/Pause */}
          <button
            onClick={handleToggleAutoPlay}
            className="px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white text-xs font-bold border border-slate-700 flex items-center gap-1.5 shadow-lg cursor-pointer"
          >
            {isAutoPlaying ? (
              <Pause size={13} className="text-amber-400" />
            ) : (
              <Play size={13} className="text-emerald-400" />
            )}
            <span>{isAutoPlaying ? "Ao Vivo" : "Pausado"}</span>
          </button>

          {/* Next Step */}
          <button
            onClick={handleNextPhase}
            className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 shadow-lg cursor-pointer"
            title="Próxima etapa"
          >
            <ChevronRight size={15} />
          </button>

          {/* Restart */}
          <button
            onClick={() => {
              if (engineRef.current) {
                engineRef.current.setPhase(0);
                setActivePhaseId(0);
                engineRef.current.setAutoPlay(true);
                setIsAutoPlaying(true);
              }
            }}
            className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 shadow-lg cursor-pointer"
            title="Reiniciar Jornada Completa desde a Sala 01"
          >
            <RotateCcw size={15} />
          </button>
        </div>

        {/* Bottom Interactive Room Selector Bar */}
        <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-wrap items-center justify-center gap-2">
          {[
            {
              room: "coordinator" as AgentBenchId,
              phase: 0,
              label: "Sala 1: PICO",
            },
            {
              room: "mining" as AgentBenchId,
              phase: 2,
              label: "Sala 2: Mineração & DOI",
            },
            {
              room: "hitl" as AgentBenchId,
              phase: 5,
              label: "Sala 3: Supervisão HITL (Você)",
            },
            {
              room: "auditing" as AgentBenchId,
              phase: 8,
              label: "Sala 4: Auditoria RoB 2",
            },
            {
              room: "synthesis" as AgentBenchId,
              phase: 11,
              label: "Sala 5: Biblioteca PRISMA",
            },
          ].map((btn) => {
            const isRoomActive =
              currentPhaseObj.roomId === btn.room ||
              selectedBenchId === btn.room;
            return (
              <button
                key={btn.room}
                onClick={() => jumpToRoomPhase(btn.room, btn.phase)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-2 shadow-md ${
                  isRoomActive
                    ? "bg-white text-slate-950 border-white scale-105"
                    : "bg-slate-900/85 text-slate-200 border-slate-700 hover:bg-slate-800"
                }`}
              >
                <CheckCircle2
                  size={13}
                  className={
                    isRoomActive ? "text-blue-600" : "text-emerald-400"
                  }
                />
                <span>{btn.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
