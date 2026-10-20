import {
  Actor,
  ActorActionState,
  CharacterAppearance,
  Direction,
  Point2D,
  StageHandoff,
} from "./types";
import { LAB_NAV_NODES, findPathBetweenNodes } from "./NavGraph";
import { renderOcclusionElements } from "./OcclusionLayer";
import { drawPixelScientistCharacter } from "./PixelCharacterRenderer";

// 7 Scientist Initial Appearances & Starting Nodes
export const INITIAL_SCIENTISTS: CharacterAppearance[] = [
  {
    id: "turing",
    name: "Dr. Turing",
    role: "PI Coordinator (PICO)",
    roomId: "coordinator",
    hairColor: "#64748b",
    hairStyle: "short_parted",
    skinColor: "#fcd34d",
    badgeColor: "#0ea5e9",
    glasses: true,
    tieOrLanyard: "tie",
    facing: "left",
  },
  {
    id: "ada",
    name: "Dra. Ada",
    role: "Buscadora OpenAlex/PubMed",
    roomId: "mining",
    hairColor: "#9a3412",
    hairStyle: "ponytail",
    skinColor: "#fde68a",
    badgeColor: "#3b82f6",
    glasses: false,
    tieOrLanyard: "lanyard",
    facing: "right",
  },
  {
    id: "cross",
    name: "Dr. Cross",
    role: "Validador DOI (Crossref)",
    roomId: "mining",
    hairColor: "#0f172a",
    hairStyle: "crop",
    skinColor: "#d97706",
    badgeColor: "#2563eb",
    glasses: true,
    tieOrLanyard: "lanyard",
    facing: "left",
  },
  {
    id: "human",
    name: "Você (PI Humano)",
    role: "Triagem Soberana (HITL)",
    roomId: "hitl",
    hairColor: "#3f271d",
    hairStyle: "curly",
    skinColor: "#fde68a",
    badgeColor: "#f59e0b",
    glasses: true,
    tieOrLanyard: "lanyard",
    facing: "left",
  },
  {
    id: "fitz",
    name: "Dr. Fitz",
    role: "Extrator Amostra N & Métodos",
    roomId: "auditing",
    hairColor: "#78350f",
    hairStyle: "short_parted",
    skinColor: "#fcd34d",
    badgeColor: "#f43f5e",
    glasses: true,
    tieOrLanyard: "tie",
    facing: "left",
  },
  {
    id: "cochrane",
    name: "Dra. Cochrane",
    role: "Auditora de Viés RoB 2",
    roomId: "auditing",
    hairColor: "#4c1d95",
    hairStyle: "ponytail",
    skinColor: "#fde68a",
    badgeColor: "#e11d48",
    glasses: false,
    tieOrLanyard: "lanyard",
    facing: "right",
  },
  {
    id: "rosalind",
    name: "Dra. Rosalind",
    role: "Sintetizadora PRISMA 2020",
    roomId: "synthesis",
    hairColor: "#c2410c",
    hairStyle: "bun",
    skinColor: "#fde68a",
    badgeColor: "#10b981",
    glasses: true,
    tieOrLanyard: "tie",
    facing: "right",
  },
];

// Workflow Handoff Stages mapped directly to the Navigation Graph
export const STAGE_HANDOFFS: StageHandoff[] = [
  {
    phaseId: 0,
    title: "Sala 01: Definição PICO",
    fromActorId: "turing",
    roomId: "coordinator",
    item: { id: "pico", label: "PICO", color: "#38bdf8", glowColor: "rgba(56, 189, 248, 0.4)" },
    pathNodeIds: ["room1_desk"],
    banner: "Sala 01: Dr. Turing estrutura o protocolo PICO 2x2 e queries booleanas no quadro digital.",
    durationMs: 3400,
  },
  {
    phaseId: 1,
    title: "Handoff Sala 1 → 2",
    fromActorId: "turing",
    toActorId: "ada",
    roomId: "coordinator",
    item: { id: "pico", label: "PICO", color: "#38bdf8", glowColor: "rgba(56, 189, 248, 0.4)" },
    pathNodeIds: ["room1_desk", "room1_center", "room1_door", "corridor_west_upper", "corridor_west_mid", "corridor_west_lower", "room2_door", "room2_center", "room2_ada_desk"],
    banner: "Corredor Oeste: Dr. Turing caminha pela porta até a Sala 02 para entregar o protocolo à Dra. Ada.",
    durationMs: 4200,
  },
  {
    phaseId: 2,
    title: "Sala 02: Mineração OpenAlex / PubMed",
    fromActorId: "ada",
    roomId: "mining",
    item: { id: "raw_papers", label: "Papers", color: "#60a5fa", glowColor: "rgba(96, 165, 250, 0.4)" },
    pathNodeIds: ["room2_ada_desk"],
    banner: "Sala 02: Dra. Ada minera artigos científicos nas bases abertas OpenAlex e PubMed.",
    durationMs: 3200,
  },
  {
    phaseId: 3,
    title: "Handoff Interno Sala 2 (Ada → Cross)",
    fromActorId: "ada",
    toActorId: "cross",
    roomId: "mining",
    item: { id: "raw_papers", label: "Papers", color: "#60a5fa", glowColor: "rgba(96, 165, 250, 0.4)" },
    pathNodeIds: ["room2_ada_desk", "room2_center", "room2_cross_rack"],
    banner: "Sala 02 (Passagem Interna): Dra. Ada entrega os artigos brutos para o Dr. Cross no rack de servidores.",
    durationMs: 2500,
  },
  {
    phaseId: 4,
    title: "Sala 02: Validação DOI Crossref",
    fromActorId: "cross",
    roomId: "mining",
    item: { id: "verified_dois", label: "DOIs", color: "#2563eb", glowColor: "rgba(37, 99, 235, 0.4)" },
    pathNodeIds: ["room2_cross_rack"],
    banner: "Sala 02: Dr. Cross valida os DOIs via chamada oficial na API Crossref e remove duplicatas.",
    durationMs: 3200,
  },
  {
    phaseId: 5,
    title: "Handoff Sala 2 → Sala 3 Central (HITL)",
    fromActorId: "cross",
    toActorId: "human",
    roomId: "hitl",
    item: { id: "verified_dois", label: "DOIs", color: "#f59e0b", glowColor: "rgba(245, 158, 11, 0.4)" },
    pathNodeIds: ["room2_cross_rack", "room2_center", "room2_door", "corridor_west_lower", "corridor_west_mid", "room3_center_desk"],
    banner: "Corredor Central: Dr. Cross leva os artigos validados para a sua mesa na Sala de Supervisão Humana.",
    durationMs: 4000,
  },
  {
    phaseId: 6,
    title: "Sala 03 Central: Triagem Soberana",
    fromActorId: "human",
    roomId: "hitl",
    item: { id: "approved_papers", label: "Aprovados", color: "#10b981", glowColor: "rgba(16, 185, 129, 0.4)" },
    pathNodeIds: ["room3_center_desk"],
    banner: "Sala 03: Você exerce controle soberano (HITL), carimbando os estudos que avançam para a auditoria.",
    durationMs: 3500,
  },
  {
    phaseId: 7,
    title: "Handoff Sala 3 → Sala 4 (Auditoria)",
    fromActorId: "human",
    toActorId: "fitz",
    roomId: "auditing",
    item: { id: "approved_papers", label: "Aprovados", color: "#10b981", glowColor: "rgba(16, 185, 129, 0.4)" },
    pathNodeIds: ["room3_center_desk", "corridor_east_mid", "corridor_east_upper", "room4_door", "room4_center", "room4_fitz_desk"],
    banner: "Corredor Leste: Seu avatar caminha até a Sala 04 para entregar os artigos aprovados ao Dr. Fitz.",
    durationMs: 4200,
  },
  {
    phaseId: 8,
    title: "Sala 04: Extração Amostra N & p-valor",
    fromActorId: "fitz",
    roomId: "auditing",
    item: { id: "stats", label: "Stats N", color: "#f43f5e", glowColor: "rgba(244, 63, 94, 0.4)" },
    pathNodeIds: ["room4_fitz_desk"],
    banner: "Sala 04: Dr. Fitz extrai tamanho amostral (N), grupo controle e p-valores no microscópio.",
    durationMs: 3200,
  },
  {
    phaseId: 9,
    title: "Handoff Interno Sala 4 (Fitz → Cochrane)",
    fromActorId: "fitz",
    toActorId: "cochrane",
    roomId: "auditing",
    item: { id: "stats", label: "Stats N", color: "#f43f5e", glowColor: "rgba(244, 63, 94, 0.4)" },
    pathNodeIds: ["room4_fitz_desk", "room4_center", "room4_cochrane_desk"],
    banner: "Sala 04 (Passagem Interna): Dr. Fitz entrega os dados de amostra para a Dra. Cochrane auditar o risco de viés.",
    durationMs: 2200,
  },
  {
    phaseId: 10,
    title: "Sala 04: Auditoria Cochrane RoB 2",
    fromActorId: "cochrane",
    roomId: "auditing",
    item: { id: "rob2_audit", label: "RoB 2", color: "#e11d48", glowColor: "rgba(225, 29, 72, 0.4)" },
    pathNodeIds: ["room4_cochrane_desk"],
    banner: "Sala 04: Dra. Cochrane classifica os domínios de aleatorização e viés segundo o padrão Cochrane RoB 2.",
    durationMs: 3200,
  },
  {
    phaseId: 11,
    title: "Handoff Sala 4 → Sala 5 (Biblioteca PRISMA)",
    fromActorId: "cochrane",
    toActorId: "rosalind",
    roomId: "synthesis",
    item: { id: "rob2_audit", label: "RoB 2", color: "#e11d48", glowColor: "rgba(225, 29, 72, 0.4)" },
    pathNodeIds: ["room4_cochrane_desk", "room4_center", "room4_door", "corridor_east_upper", "corridor_east_mid", "corridor_east_lower", "room5_door", "room5_center", "room5_rosalind_desk"],
    banner: "Corredor Sudeste: Dra. Cochrane leva os laudos metodológicos para a Dra. Rosalind na Biblioteca.",
    durationMs: 4400,
  },
  {
    phaseId: 12,
    title: "Sala 05: Síntese PRISMA 2020 & Gaps",
    fromActorId: "rosalind",
    roomId: "synthesis",
    item: { id: "prisma_matrix", label: "PRISMA", color: "#10b981", glowColor: "rgba(16, 185, 129, 0.4)" },
    pathNodeIds: ["room5_rosalind_desk"],
    banner: "Sala 05 (Biblioteca): Dra. Rosalind consolida a Matriz PRISMA 2020, Knowledge Gaps e arquivos CSV/BibTeX!",
    durationMs: 4000,
  },
];

export class PixelLabEngine {
  private actors: Map<string, Actor> = new Map();
  private homeNodes: Map<string, string> = new Map([
    ["turing", "room1_desk"],
    ["ada", "room2_ada_desk"],
    ["cross", "room2_cross_rack"],
    ["human", "room3_center_desk"],
    ["fitz", "room4_fitz_desk"],
    ["cochrane", "room4_cochrane_desk"],
    ["rosalind", "room5_rosalind_desk"],
  ]);

  private activePhaseIdx: number = 0;
  private phaseStartTime: number = performance.now();
  private isAutoPlaying: boolean = true;
  private debugMode: boolean = false;
  private hoveredActorId: string | null = null;

  constructor() {
    this.initActors();
  }

  private initActors() {
    this.actors.clear();
    for (const appearance of INITIAL_SCIENTISTS) {
      const homeNodeId = this.homeNodes.get(appearance.id) || "room3_center_desk";
      const navNode = LAB_NAV_NODES[homeNodeId];
      const pos: Point2D = navNode ? { x: navNode.x, y: navNode.y } : { x: 50, y: 50 };

      this.actors.set(appearance.id, {
        id: appearance.id,
        appearance,
        state: "IDLE",
        position: { ...pos },
        path: [],
        facing: appearance.facing,
        animationTick: 0,
        speed: 12.0, // Percentage units per second
      });
    }
  }

  public setPhase(phaseIdx: number) {
    this.activePhaseIdx = Math.max(0, Math.min(phaseIdx, STAGE_HANDOFFS.length - 1));
    this.phaseStartTime = performance.now();
    this.applyPhase(STAGE_HANDOFFS[this.activePhaseIdx]);
  }

  public nextPhase() {
    this.setPhase((this.activePhaseIdx + 1) % STAGE_HANDOFFS.length);
  }

  public prevPhase() {
    this.setPhase((this.activePhaseIdx - 1 + STAGE_HANDOFFS.length) % STAGE_HANDOFFS.length);
  }

  public setAutoPlay(enabled: boolean) {
    this.isAutoPlaying = enabled;
  }

  public getAutoPlay(): boolean {
    return this.isAutoPlaying;
  }

  public setDebug(enabled: boolean) {
    this.debugMode = enabled;
  }

  public getDebug(): boolean {
    return this.debugMode;
  }

  public getCurrentPhase(): StageHandoff {
    return STAGE_HANDOFFS[this.activePhaseIdx] || STAGE_HANDOFFS[0];
  }

  public setHoveredActor(actorId: string | null) {
    this.hoveredActorId = actorId;
  }

  private applyPhase(phase: StageHandoff) {
    // Reset idle states for all actors at their home desks
    for (const [id, actor] of this.actors) {
      const homeNodeId = this.homeNodes.get(id);
      const homeNode = homeNodeId ? LAB_NAV_NODES[homeNodeId] : null;

      if (id === phase.fromActorId) {
        if (phase.pathNodeIds.length > 1) {
          // Actor is executing a walking handoff along the corridor
          actor.state = "WALKING";
          actor.carryingItem = phase.item;
          actor.path = phase.pathNodeIds.map((nodeId) => {
            const n = LAB_NAV_NODES[nodeId];
            return { x: n.x, y: n.y };
          });
          if (actor.path.length > 0) {
            actor.position = { ...actor.path[0] };
          }
        } else {
          // Actor is working at bench
          actor.state = "WORKING";
          actor.carryingItem = undefined;
          actor.path = [];
          if (homeNode) actor.position = { x: homeNode.x, y: homeNode.y };
        }
      } else if (id === phase.toActorId && phase.pathNodeIds.length > 1) {
        // Receiver anticipates arrival
        actor.state = "IDLE";
        actor.carryingItem = undefined;
        actor.path = [];
        if (homeNode) actor.position = { x: homeNode.x, y: homeNode.y };
      } else {
        // Other actors work or idle peacefully
        actor.state = "IDLE";
        actor.carryingItem = undefined;
        actor.path = [];
        if (homeNode) actor.position = { x: homeNode.x, y: homeNode.y };
      }
    }
  }

  public update(now: number) {
    const phase = this.getCurrentPhase();
    const elapsed = now - this.phaseStartTime;
    const progress = Math.min(1.0, elapsed / phase.durationMs);

    // Auto-advance if enabled
    if (this.isAutoPlaying && elapsed >= phase.durationMs) {
      this.nextPhase();
      return;
    }

    // Update active walking actor along path
    const activeActor = this.actors.get(phase.fromActorId);
    if (activeActor && activeActor.state === "WALKING" && activeActor.path.length > 1) {
      const totalSegments = activeActor.path.length - 1;
      const scaled = progress * totalSegments;
      const segIdx = Math.min(Math.floor(scaled), totalSegments - 1);
      const segT = scaled - segIdx;

      const p0 = activeActor.path[segIdx];
      const p1 = activeActor.path[segIdx + 1];

      activeActor.position = {
        x: p0.x + (p1.x - p0.x) * segT,
        y: p0.y + (p1.y - p0.y) * segT,
      };

      // Set facing direction
      const dx = p1.x - p0.x;
      activeActor.facing = dx >= 0 ? "right" : "left";
    }

    // Tick all actors
    for (const actor of this.actors.values()) {
      actor.animationTick++;
    }
  }

  public render(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    bgImage: HTMLImageElement | null
  ) {
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // 1. Draw Empty HD-2D Lab Background (Floor + Back Walls)
    if (bgImage) {
      ctx.drawImage(bgImage, 0, 0, canvasWidth, canvasHeight);
    } else {
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    const pixelScale = Math.max(2, Math.round(canvasWidth / 380));

    // 2. Debug: Draw NavGraph nodes and corridors if debugMode is on
    if (this.debugMode) {
      ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
      ctx.lineWidth = 2;
      for (const node of Object.values(LAB_NAV_NODES)) {
        const nx = (node.x / 100) * canvasWidth;
        const ny = (node.y / 100) * canvasHeight;
        ctx.fillStyle = node.roomId === "corridor" ? "#facc15" : "#38bdf8";
        ctx.beginPath();
        ctx.arc(nx, ny, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 3. Sort actors by Y (Depth Sorting so lower actors render over upper actors)
    const sortedActors = Array.from(this.actors.values()).sort(
      (a, b) => a.position.y - b.position.y
    );

    // 4. Render Actors and Dynamic Occlusion Layer
    // We render actors, and any actor behind an occlusion threshold gets occluded by foreground elements
    for (const actor of sortedActors) {
      const cx = (actor.position.x / 100) * canvasWidth;
      const cy = (actor.position.y / 100) * canvasHeight;

      let bubbleText: string | undefined;
      if (actor.id === this.getCurrentPhase().fromActorId) {
        if (actor.state === "WORKING") {
          bubbleText = "Trabalhando...";
        } else if (actor.state === "WALKING") {
          bubbleText = `Levando ${actor.carryingItem?.label || "Dossiê"} →`;
        }
      }

      drawPixelScientistCharacter({
        ctx,
        cx,
        cy,
        pixelScale,
        appearance: actor.appearance,
        state: actor.state,
        facing: actor.facing,
        frameTick: actor.animationTick,
        carryingItem: actor.carryingItem,
        speechBubble: bubbleText,
        isHovered: actor.id === this.hoveredActorId,
      });
    }

    // 5. Render Foreground Occlusion Elements (Door Arches and Front Desk Lips)
    renderOcclusionElements(ctx, canvasWidth, canvasHeight, pixelScale, this.debugMode);
  }
}
