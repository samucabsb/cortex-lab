"use client";

import React, { useEffect, useRef, useState } from "react";
import { AgentBenchId } from "@/types";
import { Play, RotateCcw, Sparkles, CheckCircle2 } from "lucide-react";

interface IsometricLabCanvasProps {
  currentStep: string;
  hitlPending: boolean;
  onSelectBench: (benchId: AgentBenchId) => void;
  selectedBenchId?: AgentBenchId | null;
  onOpenHitl?: () => void;
}

interface PointPct {
  x: number;
  y: number;
}

interface ScientistDef {
  id: string;
  roomId: AgentBenchId;
  name: string;
  role: string;
  home: PointPct;
  facing: "left" | "right";
  hairColor: string;
  skinColor: string;
  badgeColor: string;
  glasses: boolean;
  ponytail?: boolean;
  workLabel: string;
}

/**
 * 7 Scientists mapped 1-to-1 to the real Python Backend tasks:
 * - Room 1 (PICO): 1 person (Dr. Turing)
 * - Room 2 (Mining & DOI): 2 people (Dra. Ada searches OpenAlex/PubMed -> passes to Dr. Cross at Crossref Server Rack)
 * - Room 3 (HITL): 1 person (Pesquisador Líder at central desk)
 * - Room 4 (Auditing RoB 2): 2 people (Dr. Fitz extracts Sample N & p-values -> passes to Dra. Cochrane for RoB 2)
 * - Room 5 (PRISMA Library): 1 person (Dra. Rosalind synthesizes PRISMA matrix & BibTeX)
 */
const SCIENTISTS: ScientistDef[] = [
  {
    id: "turing",
    roomId: "coordinator",
    name: "Dr. Turing",
    role: "PI Coordinator (PICO)",
    home: { x: 18.5, y: 29.5 },
    facing: "left",
    hairColor: "#475569",
    skinColor: "#fcd34d",
    badgeColor: "#0ea5e9",
    glasses: true,
    workLabel: "Estruturando PICO & Queries...",
  },
  {
    id: "ada",
    roomId: "mining",
    name: "Dra. Ada",
    role: "Buscadora OpenAlex/PubMed",
    home: { x: 24.0, y: 66.5 },
    facing: "right",
    hairColor: "#7c2d12",
    skinColor: "#fde68a",
    badgeColor: "#3b82f6",
    glasses: false,
    ponytail: true,
    workLabel: "Buscando na OpenAlex & PubMed...",
  },
  {
    id: "cross",
    roomId: "mining",
    name: "Dr. Cross",
    role: "Validador DOI (Crossref)",
    home: { x: 13.5, y: 63.0 },
    facing: "left",
    hairColor: "#1e293b",
    skinColor: "#d97706",
    badgeColor: "#2563eb",
    glasses: true,
    workLabel: "Validando DOIs no Servidor...",
  },
  {
    id: "human",
    roomId: "hitl",
    name: "Você (PI Humano)",
    role: "Triagem Soberana (HITL)",
    home: { x: 51.5, y: 46.5 },
    facing: "left",
    hairColor: "#3f271d",
    skinColor: "#fde68a",
    badgeColor: "#f59e0b",
    glasses: true,
    workLabel: "Revisando elegibilidade...",
  },
  {
    id: "fitz",
    roomId: "auditing",
    name: "Dr. Fitz",
    role: "Extrator Amostra N & Métodos",
    home: { x: 78.5, y: 34.0 },
    facing: "left",
    hairColor: "#92400e",
    skinColor: "#fcd34d",
    badgeColor: "#f43f5e",
    glasses: true,
    workLabel: "Extraindo Amostra N e p-valor...",
  },
  {
    id: "cochrane",
    roomId: "auditing",
    name: "Dra. Cochrane",
    role: "Auditora de Viés RoB 2",
    home: { x: 85.5, y: 24.5 },
    facing: "right",
    hairColor: "#581c87",
    skinColor: "#fde68a",
    badgeColor: "#e11d48",
    glasses: false,
    ponytail: true,
    workLabel: "Classificando Risco RoB 2...",
  },
  {
    id: "rosalind",
    roomId: "synthesis",
    name: "Dra. Rosalind",
    role: "Sintetizadora PRISMA 2020",
    home: { x: 83.0, y: 76.5 },
    facing: "right",
    hairColor: "#9a3412",
    skinColor: "#fde68a",
    badgeColor: "#10b981",
    glasses: true,
    ponytail: true,
    workLabel: "Montando Matriz PRISMA & Gaps...",
  },
];

/**
 * Sequential Workflow Phases showing real work + physical document handoffs:
 * Phase 0: Dr. Turing works on PICO board (Room 1)
 * Phase 1: Dr. Turing walks through doorway to Room 2 & hands PICO Scroll to Dra. Ada
 * Phase 2: Dra. Ada mines OpenAlex/PubMed on dual monitors (Room 2)
 * Phase 3: Dra. Ada walks over to Dr. Cross inside Room 2 & hands raw papers
 * Phase 4: Dr. Cross validates DOIs at the black Server Rack (Room 2)
 * Phase 5: Dr. Cross walks out of Room 2 to Central Office (Room 3) & delivers Verified Papers to Human Supervisor
 * Phase 6: Human Supervisor inspects & stamps papers at Central Desk (Room 3)
 * Phase 7: Human Supervisor walks to Room 4 & hands Approved Stack to Dr. Fitz
 * Phase 8: Dr. Fitz extracts Sample N & p-values at microscope bench (Room 4)
 * Phase 9: Dr. Fitz hands extracted methods to Dra. Cochrane at upper bench (Room 4)
 * Phase 10: Dra. Cochrane audits Cochrane RoB 2 risk of bias (Room 4)
 * Phase 11: Dra. Cochrane walks to Library (Room 5) & hands Audited RoB 2 Dossiers to Dra. Rosalind
 * Phase 12: Dra. Rosalind checks bookshelf & compiles PRISMA 2020 Matrix (Room 5)
 */
interface WorkflowPhase {
  id: number;
  roomId: AgentBenchId;
  activeScientistId: string;
  receiverScientistId?: string;
  mode: "WORK" | "HANDOFF";
  itemLabel?: string;
  itemColor?: string;
  statusBanner: string;
  waypoints?: PointPct[];
  durationMs: number;
}

const WORKFLOW_PHASES: WorkflowPhase[] = [
  {
    id: 0,
    roomId: "coordinator",
    activeScientistId: "turing",
    mode: "WORK",
    statusBanner:
      "Sala 01: Dr. Turing está estruturando o protocolo PICO e as 3 queries booleanas no quadro digital.",
    durationMs: 3200,
  },
  {
    id: 1,
    roomId: "coordinator",
    activeScientistId: "turing",
    receiverScientistId: "ada",
    mode: "HANDOFF",
    itemLabel: "Protocolo PICO",
    itemColor: "#38bdf8",
    statusBanner:
      "Entrega 1 → 2: Dr. Turing leva o Protocolo PICO e queries booleanas para a Dra. Ada na Sala de Mineração.",
    waypoints: [
      { x: 18.5, y: 29.5 },
      { x: 27.5, y: 35.0 }, // Doorway Room 1
      { x: 34.0, y: 52.0 }, // Left Wooden Corridor
      { x: 30.0, y: 73.0 }, // Doorway Room 2
      { x: 24.0, y: 66.5 }, // Dra. Ada's Desk
    ],
    durationMs: 3600,
  },
  {
    id: 2,
    roomId: "mining",
    activeScientistId: "ada",
    mode: "WORK",
    statusBanner:
      "Sala 02 (Parte 1/2): Dra. Ada executa buscas federadas na OpenAlex e Europe PMC nos monitores duplos.",
    durationMs: 3000,
  },
  {
    id: 3,
    roomId: "mining",
    activeScientistId: "ada",
    receiverScientistId: "cross",
    mode: "HANDOFF",
    itemLabel: "Artigos Brutos",
    itemColor: "#60a5fa",
    statusBanner:
      "Sala 02 (Passagem Interna): Dra. Ada entrega os artigos recuperados para o Dr. Cross validar os DOIs no rack.",
    waypoints: [
      { x: 24.0, y: 66.5 },
      { x: 18.5, y: 65.0 },
      { x: 15.0, y: 63.5 },
    ],
    durationMs: 2200,
  },
  {
    id: 4,
    roomId: "mining",
    activeScientistId: "cross",
    mode: "WORK",
    statusBanner:
      "Sala 02 (Parte 2/2): Dr. Cross remove duplicatas e valida criptograficamente cada DOI no servidor Crossref.",
    durationMs: 3000,
  },
  {
    id: 5,
    roomId: "hitl",
    activeScientistId: "cross",
    receiverScientistId: "human",
    mode: "HANDOFF",
    itemLabel: "DOIs Validados",
    itemColor: "#f59e0b",
    statusBanner:
      "Entrega 2 → 3: Dr. Cross leva a pasta de artigos com DOI validado até a mesa do Supervisor Humano (HITL).",
    waypoints: [
      { x: 13.5, y: 63.0 },
      { x: 30.0, y: 73.0 }, // Doorway Room 2
      { x: 38.0, y: 60.0 }, // Corridor
      { x: 42.0, y: 53.5 }, // Left Doorway Central Room
      { x: 49.0, y: 47.5 }, // Supervisor Desk
    ],
    durationMs: 3600,
  },
  {
    id: 6,
    roomId: "hitl",
    activeScientistId: "human",
    mode: "WORK",
    statusBanner:
      "Sala 03 (Gabinete Central HITL): O Pesquisador Líder revisa os títulos/resumos e aprova os estudos elegíveis.",
    durationMs: 3200,
  },
  {
    id: 7,
    roomId: "auditing",
    activeScientistId: "human",
    receiverScientistId: "fitz",
    mode: "HANDOFF",
    itemLabel: "Estudos Aprovados",
    itemColor: "#10b981",
    statusBanner:
      "Entrega 3 → 4: O Pesquisador Líder entrega os artigos aprovados na triagem para o Dr. Fitz no Laboratório RoB 2.",
    waypoints: [
      { x: 51.5, y: 46.5 },
      { x: 58.0, y: 54.5 }, // Right Doorway Central Room
      { x: 66.0, y: 44.0 }, // Right Corridor
      { x: 72.0, y: 35.0 }, // Doorway Room 4
      { x: 77.0, y: 34.0 }, // Dr. Fitz Bench
    ],
    durationMs: 3600,
  },
  {
    id: 8,
    roomId: "auditing",
    activeScientistId: "fitz",
    mode: "WORK",
    statusBanner:
      "Sala 04 (Parte 1/2): Dr. Fitz disseca a seção de Métodos, extraindo tamanho amostral (N), controle e p-valores.",
    durationMs: 3000,
  },
  {
    id: 9,
    roomId: "auditing",
    activeScientistId: "fitz",
    receiverScientistId: "cochrane",
    mode: "HANDOFF",
    itemLabel: "Dados Amostrais N",
    itemColor: "#fb7185",
    statusBanner:
      "Sala 04 (Passagem Interna): Dr. Fitz passa as métricas extraídas para a Dra. Cochrane julgar o Risco de Viés.",
    waypoints: [
      { x: 78.5, y: 34.0 },
      { x: 82.5, y: 29.0 },
      { x: 84.5, y: 25.5 },
    ],
    durationMs: 2200,
  },
  {
    id: 10,
    roomId: "auditing",
    activeScientistId: "cochrane",
    mode: "WORK",
    statusBanner:
      "Sala 04 (Parte 2/2): Dra. Cochrane audita os 5 domínios Cochrane RoB 2 (Baixo Risco, Preocupações ou Alto Risco).",
    durationMs: 3000,
  },
  {
    id: 11,
    roomId: "synthesis",
    activeScientistId: "cochrane",
    receiverScientistId: "rosalind",
    mode: "HANDOFF",
    itemLabel: "Laudos RoB 2",
    itemColor: "#a855f7",
    statusBanner:
      "Entrega 4 → 5: Dra. Cochrane caminha até a Biblioteca e entrega os laudos RoB 2 para a Dra. Rosalind.",
    waypoints: [
      { x: 85.5, y: 24.5 },
      { x: 72.0, y: 35.0 }, // Doorway Room 4
      { x: 66.0, y: 55.0 }, // Lower Right Corridor
      { x: 70.5, y: 73.5 }, // Doorway Room 5
      { x: 80.5, y: 75.5 }, // Dra. Rosalind Desk
    ],
    durationMs: 3800,
  },
  {
    id: 12,
    roomId: "synthesis",
    activeScientistId: "rosalind",
    mode: "WORK",
    statusBanner:
      "Sala 05 (Biblioteca PRISMA): Dra. Rosalind consolida a Matriz PRISMA 2020, Knowledge Gaps e arquivos CSV/BibTeX!",
    durationMs: 4000,
  },
];

/**
 * Helper to interpolate position along a multi-point path (0.0 -> 1.0)
 */
function interpolateWaypoints(
  points: PointPct[],
  t: number
): { pos: PointPct; facing: "left" | "right" } {
  if (!points || points.length === 0) {
    return { pos: { x: 50, y: 50 }, facing: "right" };
  }
  if (points.length === 1 || t <= 0) {
    return { pos: points[0], facing: "right" };
  }
  if (t >= 1) {
    const last = points[points.length - 1];
    const prev = points[points.length - 2];
    return {
      pos: last,
      facing: last.x >= prev.x ? "right" : "left",
    };
  }

  const totalSegments = points.length - 1;
  const scaled = t * totalSegments;
  const segIdx = Math.min(Math.floor(scaled), totalSegments - 1);
  const segT = scaled - segIdx;

  const p0 = points[segIdx];
  const p1 = points[segIdx + 1];

  return {
    pos: {
      x: p0.x + (p1.x - p0.x) * segT,
      y: p0.y + (p1.y - p0.y) * segT,
    },
    facing: p1.x >= p0.x ? "right" : "left",
  };
}

/**
 * Draws a crisp 32-bit Chibi Pixel Art Scientist onto a 2D Canvas.
 */
function drawPixelScientist(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  sci: ScientistDef,
  state: "IDLE" | "WORKING" | "WALKING",
  frameTick: number,
  carryingItem?: { label: string; color: string }
) {
  const p = Math.max(2, Math.round(scale)); // size of 1 pixel block
  const bob =
    state === "WALKING"
      ? Math.abs(Math.sin(frameTick * 0.35)) * (p * 1.6)
      : state === "WORKING"
      ? Math.abs(Math.sin(frameTick * 0.25)) * (p * 0.8)
      : Math.sin(frameTick * 0.08) * (p * 0.5);

  const x0 = Math.round(cx);
  const y0 = Math.round(cy - bob);

  // 1. Floor Drop Shadow (Pixelated Oval)
  ctx.fillStyle = "rgba(15, 23, 42, 0.42)";
  ctx.fillRect(x0 - 5 * p, Math.round(cy) + 6 * p, 10 * p, 2 * p);
  ctx.fillRect(x0 - 4 * p, Math.round(cy) + 5 * p, 8 * p, 4 * p);

  // 2. Legs & Shoes (Animated when WALKING)
  const leftLegOffset =
    state === "WALKING" ? Math.round(Math.sin(frameTick * 0.4) * 2) * p : 0;
  const rightLegOffset =
    state === "WALKING" ? Math.round(-Math.sin(frameTick * 0.4) * 2) * p : 0;

  // Dark outline for legs
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(x0 - 4 * p, y0 + 2 * p + leftLegOffset, 3 * p, 5 * p);
  ctx.fillRect(x0 + 1 * p, y0 + 2 * p + rightLegOffset, 3 * p, 5 * p);

  // Slacks
  ctx.fillStyle = "#334155";
  ctx.fillRect(x0 - 3 * p, y0 + 2 * p + leftLegOffset, 2 * p, 3 * p);
  ctx.fillRect(x0 + 1 * p, y0 + 2 * p + rightLegOffset, 2 * p, 3 * p);

  // Shoes
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(x0 - 3 * p, y0 + 5 * p + leftLegOffset, 2 * p, 2 * p);
  ctx.fillRect(x0 + 1 * p, y0 + 5 * p + rightLegOffset, 2 * p, 2 * p);

  // 3. White Lab Coat Torso (with dark pixel border & colored lanyard badge)
  ctx.fillStyle = "#0f172a"; // Outline
  ctx.fillRect(x0 - 5 * p, y0 - 5 * p, 10 * p, 8 * p);

  ctx.fillStyle = "#ffffff"; // White Coat
  ctx.fillRect(x0 - 4 * p, y0 - 4 * p, 8 * p, 6 * p);

  ctx.fillStyle = "#e2e8f0"; // Coat shading & hem
  ctx.fillRect(x0 - 4 * p, y0 + 1 * p, 8 * p, 1 * p);

  // Inner Shirt & Tie / Lanyard Badge
  ctx.fillStyle = sci.badgeColor;
  ctx.fillRect(x0 - 1 * p, y0 - 4 * p, 2 * p, 4 * p);

  // 4. Articulated Pixel Arms (Typing rapidly when WORKING, holding folder when WALKING)
  const armWave =
    state === "WORKING" ? Math.round(Math.sin(frameTick * 0.65) * 1.5) * p : 0;

  ctx.fillStyle = "#0f172a";
  ctx.fillRect(x0 - 7 * p, y0 - 4 * p + armWave, 2 * p, 5 * p);
  ctx.fillRect(x0 + 5 * p, y0 - 4 * p - armWave, 2 * p, 5 * p);

  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(x0 - 6 * p, y0 - 3 * p + armWave, 1 * p, 3 * p);
  ctx.fillRect(x0 + 5 * p, y0 - 3 * p - armWave, 1 * p, 3 * p);

  // Hands
  ctx.fillStyle = sci.skinColor;
  ctx.fillRect(x0 - 6 * p, y0 + armWave, 1 * p, 1 * p);
  ctx.fillRect(x0 + 5 * p, y0 - armWave, 1 * p, 1 * p);

  // 5. Chibi Head & Hair (32-bit RPG style)
  ctx.fillStyle = "#0f172a"; // Head outline
  ctx.fillRect(x0 - 6 * p, y0 - 14 * p, 12 * p, 9 * p);

  ctx.fillStyle = sci.skinColor; // Face
  ctx.fillRect(x0 - 5 * p, y0 - 12 * p, 10 * p, 6 * p);

  // Hair top & sideburns
  ctx.fillStyle = sci.hairColor;
  ctx.fillRect(x0 - 6 * p, y0 - 15 * p, 12 * p, 4 * p);
  ctx.fillRect(x0 - 6 * p, y0 - 12 * p, 2 * p, 3 * p);
  ctx.fillRect(x0 + 4 * p, y0 - 12 * p, 2 * p, 3 * p);

  if (sci.ponytail) {
    ctx.fillRect(x0 + 6 * p, y0 - 12 * p, 2 * p, 5 * p);
  }

  // Eyes & Glasses
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(x0 - 3 * p, y0 - 9 * p, 2 * p, 2 * p);
  ctx.fillRect(x0 + 1 * p, y0 - 9 * p, 2 * p, 2 * p);

  if (sci.glasses) {
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(x0 - 3 * p, y0 - 9 * p, 1 * p, 1 * p);
    ctx.fillRect(x0 + 2 * p, y0 - 9 * p, 1 * p, 1 * p);
  }

  // 6. If carrying a Deliverable Folder during Handoff, draw glowing Pixel Document in hands!
  if (carryingItem) {
    const docX = x0 + 4 * p;
    const docY = y0 - 4 * p;

    // Glowing aura around document
    ctx.fillStyle = "rgba(250, 204, 21, 0.35)";
    ctx.fillRect(docX - 1 * p, docY - 1 * p, 7 * p, 6 * p);

    // Pixel folder border
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(docX, docY, 5 * p, 4 * p);

    // Folder fill
    ctx.fillStyle = carryingItem.color;
    ctx.fillRect(docX + 1 * p, docY + 1 * p, 3 * p, 2 * p);
  }
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

  // Active phase in the 13-step choreography (0..12)
  const [phaseIdx, setPhaseIdx] = useState<number>(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(true);
  const phaseStartRef = useRef<number>(performance.now());

  // Sync starting phase when parent currentStep changes
  useEffect(() => {
    if (currentStep === "PLANNING") {
      setPhaseIdx(0);
    } else if (currentStep === "MINING") {
      setPhaseIdx(2);
    } else if (currentStep === "SCREENING_CHECKPOINT") {
      setPhaseIdx(5);
    } else if (currentStep === "AUDITING") {
      setPhaseIdx(8);
    } else if (currentStep === "SYNTHESIS" || currentStep === "COMPLETED") {
      setPhaseIdx(11);
    }
    phaseStartRef.current = performance.now();
  }, [currentStep]);

  // Preload the empty HD-2D Pixel Art Laboratory architectural map
  useEffect(() => {
    const img = new Image();
    img.src = "/assets/hd2d-empty-lab.jpg";
    img.onload = () => {
      bgImageRef.current = img;
    };
  }, []);

  // Main 60 FPS Pixel Art Render & Handoff Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let frameTick = 0;

    const renderLoop = (now: number) => {
      animId = requestAnimationFrame(renderLoop);
      frameTick++;

      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const targetW = Math.round(rect.width * dpr);
      const targetH = Math.round(rect.height * dpr);

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Draw the Empty HD-2D Pixel Art Office Map (Aspect cover/fit)
      if (bgImageRef.current) {
        ctx.drawImage(bgImageRef.current, 0, 0, canvas.width, canvas.height);
      } else {
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Calculate phase progress (0.0 -> 1.0)
      const currentPhase = WORKFLOW_PHASES[phaseIdx] || WORKFLOW_PHASES[0];
      const elapsed = now - phaseStartRef.current;
      const progress = Math.min(1, elapsed / currentPhase.durationMs);

      if (isAutoPlaying && elapsed >= currentPhase.durationMs) {
        phaseStartRef.current = now;
        setPhaseIdx((prev) => (prev + 1) % WORKFLOW_PHASES.length);
      }

      const pixelScale = Math.max(2, Math.round(canvas.width / 380));

      // 2. Draw Live Equipment Glows / Particles in the Active Room
      const activeRoomPos = SCIENTISTS.find(
        (s) => s.id === currentPhase.activeScientistId
      )?.home;

      if (activeRoomPos && currentPhase.mode === "WORK") {
        const gx = (activeRoomPos.x / 100) * canvas.width;
        const gy = (activeRoomPos.y / 100) * canvas.height;

        // Rising pixel data sparks above the active workstation
        for (let i = 0; i < 4; i++) {
          const sparkOffset = ((frameTick * 1.5 + i * 18) % 45) * (pixelScale * 0.4);
          const sx = gx + (i - 1.5) * 9 * pixelScale;
          const sy = gy - 14 * pixelScale - sparkOffset;
          ctx.fillStyle = i % 2 === 0 ? "#38bdf8" : "#facc15";
          ctx.fillRect(sx, sy, 2 * pixelScale, 2 * pixelScale);
        }
      }

      // 3. Depth-Sort and Draw all 7 Pixel Art Scientists
      const renderList = SCIENTISTS.map((sci) => {
        let pos = { ...sci.home };
        let state: "IDLE" | "WORKING" | "WALKING" = "IDLE";
        let carrying: { label: string; color: string } | undefined;

        if (sci.id === currentPhase.activeScientistId) {
          if (currentPhase.mode === "WORK") {
            state = "WORKING";
          } else if (
            currentPhase.mode === "HANDOFF" &&
            currentPhase.waypoints
          ) {
            state = "WALKING";
            const interp = interpolateWaypoints(
              currentPhase.waypoints,
              progress
            );
            pos = interp.pos;
            carrying = {
              label: currentPhase.itemLabel || "Dados",
              color: currentPhase.itemColor || "#facc15",
            };
          }
        } else if (
          sci.id === currentPhase.receiverScientistId &&
          currentPhase.mode === "HANDOFF" &&
          progress > 0.75
        ) {
          // Receiver reacts excitedly as the colleague arrives with the folder
          state = "WORKING";
        }

        return { sci, pos, state, carrying };
      }).sort((a, b) => a.pos.y - b.pos.y);

      renderList.forEach(({ sci, pos, state, carrying }) => {
        const cx = (pos.x / 100) * canvas.width;
        const cy = (pos.y / 100) * canvas.height;

        drawPixelScientist(
          ctx,
          cx,
          cy,
          pixelScale,
          sci,
          state,
          frameTick,
          carrying
        );

        // Compact Pixel Nameplate below feet
        const fontSize = Math.max(11, Math.round(pixelScale * 3.8));
        ctx.font = `bold ${fontSize}px "Plus Jakarta Sans", sans-serif`;
        const textWidth = ctx.measureText(sci.name).width;
        const padX = 6 * (pixelScale * 0.4);
        const boxW = textWidth + padX * 2;
        const boxH = fontSize + 6;
        const boxX = cx - boxW / 2;
        const boxY = cy + 8 * pixelScale;

        ctx.fillStyle =
          state !== "IDLE"
            ? "rgba(15, 23, 42, 0.92)"
            : "rgba(15, 23, 42, 0.72)";
        ctx.fillRect(boxX, boxY, boxW, boxH);

        ctx.strokeStyle = state !== "IDLE" ? sci.badgeColor : "#475569";
        ctx.lineWidth = Math.max(1.5, pixelScale * 0.5);
        ctx.strokeRect(boxX, boxY, boxW, boxH);

        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(sci.name, cx, boxY + boxH / 2);

        // Active Action or Handoff Bubble ABOVE ONLY the currently active scientist
        if (sci.id === currentPhase.activeScientistId) {
          const actionText =
            state === "WALKING" && carrying
              ? `Entregando: ${carrying.label} →`
              : sci.workLabel;

          const bFont = Math.max(12, Math.round(pixelScale * 4.0));
          ctx.font = `bold ${bFont}px "Plus Jakarta Sans", sans-serif`;
          const bTw = ctx.measureText(actionText).width;
          const bW = bTw + 20;
          const bH = bFont + 12;
          const bX = Math.max(
            12,
            Math.min(canvas.width - bW - 12, cx - bW / 2)
          );
          const bY = cy - 18 * pixelScale - bH;

          // Speech bubble background
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(bX, bY, bW, bH);
          ctx.strokeStyle = sci.badgeColor;
          ctx.lineWidth = Math.max(2, pixelScale * 0.75);
          ctx.strokeRect(bX, bY, bW, bH);

          // Text
          ctx.fillStyle = "#0f172a";
          ctx.fillText(actionText, bX + bW / 2, bY + bH / 2);
        }
      });
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [phaseIdx, isAutoPlaying]);

  const currentPhaseObj = WORKFLOW_PHASES[phaseIdx] || WORKFLOW_PHASES[0];

  const jumpToRoomPhase = (roomId: AgentBenchId, startPhaseId: number) => {
    onSelectBench(roomId);
    setPhaseIdx(startPhaseId);
    phaseStartRef.current = performance.now();
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
            SCIENTISTS.forEach((s) => {
              const d = Math.hypot(clickX - s.home.x, clickY - s.home.y);
              if (d < minDist) {
                minDist = d;
                closestRoom = s.roomId;
              }
            });
            onSelectBench(closestRoom);
          }}
          className="w-full h-full block cursor-pointer"
        />

        {/* Top Left Live Phase Pill */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2.5 bg-slate-900/90 backdrop-blur-md text-white px-4 py-2 rounded-xl border border-slate-700 shadow-lg">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs font-bold tracking-wide">
            {currentPhaseObj.statusBanner}
          </span>
        </div>

        {/* Top Right Controls: Replay / Pause Choreography & HITL Action */}
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

          <button
            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            className="px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white text-xs font-bold border border-slate-700 flex items-center gap-1.5 shadow-lg cursor-pointer"
          >
            <Play size={13} className={isAutoPlaying ? "text-emerald-400" : "text-slate-400"} />
            <span>{isAutoPlaying ? "Fluxo Ao Vivo: ON" : "Pausado"}</span>
          </button>

          <button
            onClick={() => {
              setPhaseIdx(0);
              setIsAutoPlaying(true);
              phaseStartRef.current = performance.now();
            }}
            className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 shadow-lg cursor-pointer"
            title="Reiniciar Jornada Completa desde a Sala 01"
          >
            <RotateCcw size={15} />
          </button>
        </div>

        {/* Bottom Interactive Room & Handoff Selector Bar */}
        <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-wrap items-center justify-center gap-2">
          {[
            {
              room: "coordinator" as AgentBenchId,
              phase: 0,
              label: "Sala 1: PICO (1 Agente)",
            },
            {
              room: "mining" as AgentBenchId,
              phase: 2,
              label: "Sala 2: Mineração & DOI (2 Agentes)",
            },
            {
              room: "hitl" as AgentBenchId,
              phase: 5,
              label: "Sala 3: Supervisão HITL (Você)",
            },
            {
              room: "auditing" as AgentBenchId,
              phase: 8,
              label: "Sala 4: Auditoria RoB 2 (2 Agentes)",
            },
            {
              room: "synthesis" as AgentBenchId,
              phase: 11,
              label: "Sala 5: Biblioteca PRISMA (1 Agente)",
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
