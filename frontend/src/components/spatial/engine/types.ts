import { AgentBenchId } from "@/types";

export type Direction = "NW" | "NE" | "SE" | "SW" | "left" | "right";

export type ActorActionState = 
  | "IDLE" 
  | "WALKING" 
  | "WORKING" 
  | "HANDOFF" 
  | "WAITING_HITL"
  | "SUCCESS"
  | "ERROR";

export interface Point2D {
  x: number;
  y: number;
}

export interface NavNode {
  id: string;
  roomId: AgentBenchId | "corridor";
  x: number; // Percentage of canvas width (0..100)
  y: number; // Percentage of canvas height (0..100)
  label: string;
}

export interface NavEdge {
  from: string;
  to: string;
  distance: number;
}

export interface CharacterAppearance {
  id: string;
  name: string;
  role: string;
  roomId: AgentBenchId;
  hairColor: string;
  hairStyle: "short_parted" | "ponytail" | "bun" | "curly" | "crop";
  skinColor: string;
  badgeColor: string;
  glasses: boolean;
  tieOrLanyard: "lanyard" | "tie";
  facing: Direction;
}

export interface ActorItem {
  id: string;
  label: string;
  color: string;
  glowColor: string;
}

export interface Actor {
  id: string;
  appearance: CharacterAppearance;
  state: ActorActionState;
  position: Point2D;
  targetPosition?: Point2D;
  path: Point2D[];
  facing: Direction;
  carryingItem?: ActorItem;
  currentWorkLabel?: string;
  animationTick: number;
  speed: number; // percentage units per second
}

export interface OcclusionZone {
  id: string;
  label: string;
  // Normalized bounding polygon or rect (percentage 0..100)
  x: number;
  y: number;
  w: number;
  h: number;
  depthThresholdY: number; // Only occlude if actor.y < depthThresholdY
  type: "door_arch" | "pillar" | "front_desk";
}

export type EmoteType =
  | "bulb"
  | "search"
  | "shield"
  | "stamp"
  | "scales"
  | "micro"
  | "book";

export interface StageHandoff {
  phaseId: number;
  title: string;
  fromActorId: string;
  toActorId?: string;
  roomId: AgentBenchId;
  item: ActorItem;
  pathNodeIds: string[];
  banner: string;
  durationMs: number;
  emote?: EmoteType;
}

