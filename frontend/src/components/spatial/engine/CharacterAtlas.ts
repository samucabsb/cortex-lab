"use client";

export interface SpriteFrame {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

export interface CharacterSpriteAtlas {
  id: string;
  name: string;
  sheetUrl: string;
  idleFront: SpriteFrame;
  idleSide: SpriteFrame;
  walkFrames: SpriteFrame[];
  workDesk: SpriteFrame;
}

export const SCIENTIST_ATLAS: Record<string, CharacterSpriteAtlas> = {
  turing: {
    id: "turing",
    name: "Dr. Turing",
    sheetUrl: "/assets/characters/turing_spritesheet.jpg",
    idleFront: { sx: 60, sy: 35, sw: 120, sh: 215 },
    idleSide: { sx: 320, sy: 35, sw: 100, sh: 215 },
    walkFrames: [
      { sx: 35, sy: 300, sw: 95, sh: 195 },
      { sx: 150, sy: 300, sw: 95, sh: 195 },
      { sx: 265, sy: 300, sw: 95, sh: 195 },
      { sx: 380, sy: 300, sw: 95, sh: 195 },
    ],
    workDesk: { sx: 35, sy: 555, sw: 210, sh: 200 },
  },
  ada: {
    id: "ada",
    name: "Dra. Ada",
    sheetUrl: "/assets/characters/ada_spritesheet.jpg",
    idleFront: { sx: 35, sy: 20, sw: 110, sh: 235 },
    idleSide: { sx: 360, sy: 25, sw: 110, sh: 230 },
    walkFrames: [
      { sx: 30, sy: 280, sw: 115, sh: 225 },
      { sx: 190, sy: 280, sw: 115, sh: 225 },
      { sx: 520, sy: 280, sw: 115, sh: 225 },
      { sx: 680, sy: 280, sw: 115, sh: 225 },
    ],
    workDesk: { sx: 25, sy: 675, sw: 305, sh: 305 },
  },
  cross: {
    id: "cross",
    name: "Dr. Cross",
    sheetUrl: "/assets/characters/cross_spritesheet.jpg",
    idleFront: { sx: 40, sy: 40, sw: 90, sh: 165 },
    idleSide: { sx: 270, sy: 40, sw: 80, sh: 165 },
    walkFrames: [
      { sx: 35, sy: 250, sw: 85, sh: 155 },
      { sx: 150, sy: 250, sw: 85, sh: 155 },
      { sx: 265, sy: 250, sw: 85, sh: 155 },
      { sx: 380, sy: 250, sw: 85, sh: 155 },
    ],
    workDesk: { sx: 560, sy: 605, sw: 410, sh: 380 },
  },
  human: {
    id: "human",
    name: "Você (PI Humano)",
    sheetUrl: "/assets/characters/human_pi_spritesheet.jpg",
    idleFront: { sx: 90, sy: 60, sw: 120, sh: 245 },
    idleSide: { sx: 575, sy: 60, sw: 110, sh: 245 },
    walkFrames: [
      { sx: 65, sy: 530, sw: 95, sh: 160 },
      { sx: 220, sy: 530, sw: 95, sh: 160 },
      { sx: 570, sy: 530, sw: 95, sh: 160 },
      { sx: 715, sy: 530, sw: 95, sh: 160 },
    ],
    workDesk: { sx: 630, sy: 750, sw: 200, sh: 205 },
  },
  fitz: {
    id: "fitz",
    name: "Dr. Fitz",
    sheetUrl: "/assets/characters/fitz_spritesheet.jpg",
    idleFront: { sx: 70, sy: 25, sw: 100, sh: 225 },
    idleSide: { sx: 450, sy: 25, sw: 95, sh: 225 },
    walkFrames: [
      { sx: 295, sy: 275, sw: 95, sh: 220 },
      { sx: 405, sy: 275, sw: 95, sh: 220 },
      { sx: 515, sy: 275, sw: 95, sh: 220 },
      { sx: 655, sy: 275, sw: 95, sh: 220 },
    ],
    workDesk: { sx: 35, sy: 530, sw: 235, sh: 245 },
  },
  cochrane: {
    id: "cochrane",
    name: "Dra. Cochrane",
    sheetUrl: "/assets/characters/cochrane_spritesheet.jpg",
    idleFront: { sx: 40, sy: 20, sw: 90, sh: 180 },
    idleSide: { sx: 715, sy: 25, sw: 95, sh: 175 },
    walkFrames: [
      { sx: 35, sy: 515, sw: 95, sh: 180 },
      { sx: 150, sy: 515, sw: 95, sh: 180 },
      { sx: 265, sy: 515, sw: 95, sh: 180 },
      { sx: 375, sy: 515, sw: 95, sh: 180 },
    ],
    workDesk: { sx: 365, sy: 715, sw: 270, sh: 270 },
  },
  rosalind: {
    id: "rosalind",
    name: "Dra. Rosalind",
    sheetUrl: "/assets/characters/rosalind_spritesheet.jpg",
    idleFront: { sx: 65, sy: 80, sw: 85, sh: 200 },
    idleSide: { sx: 350, sy: 80, sw: 80, sh: 200 },
    walkFrames: [
      { sx: 55, sy: 315, sw: 90, sh: 190 },
      { sx: 165, sy: 315, sw: 90, sh: 190 },
      { sx: 275, sy: 315, sw: 90, sh: 190 },
      { sx: 385, sy: 315, sw: 90, sh: 190 },
    ],
    workDesk: { sx: 525, sy: 575, sw: 450, sh: 395 },
  },
};

// Global Image Cache for Spritesheets
const imageCache: Map<string, HTMLImageElement> = new Map();

export function preloadCharacterSprites(): Promise<void[]> {
  if (typeof window === "undefined") return Promise.resolve([]);

  const promises = Object.values(SCIENTIST_ATLAS).map((atlas) => {
    return new Promise<void>((resolve) => {
      if (imageCache.has(atlas.id)) {
        resolve();
        return;
      }
      const img = new Image();
      img.src = atlas.sheetUrl;
      img.onload = () => {
        imageCache.set(atlas.id, img);
        resolve();
      };
      img.onerror = () => {
        resolve();
      };
    });
  });

  return Promise.all(promises);
}

export function getCharacterSpriteImage(scientistId: string): HTMLImageElement | null {
  return imageCache.get(scientistId) || null;
}

import { ActorActionState, Direction } from "./types";

export interface DrawRealSpriteParams {
  ctx: CanvasRenderingContext2D;
  scientistId: string;
  state: ActorActionState;
  facing: Direction;
  x: number;
  y: number;
  targetHeight: number;
  frameTick: number;
  speechBubble?: string;
  isHovered?: boolean;
}

/**
 * Draws a real 16-bit retro pixel art character sprite from the loaded atlas.
 */
export function drawRealPixelSprite({
  ctx,
  scientistId,
  state,
  facing,
  x,
  y,
  targetHeight,
  frameTick,
  speechBubble,
  isHovered,
}: DrawRealSpriteParams) {
  const atlas = SCIENTIST_ATLAS[scientistId];
  if (!atlas) return;

  const img = imageCache.get(scientistId);
  if (!img) return;

  ctx.imageSmoothingEnabled = false;

  let frame: SpriteFrame;
  let isWorkStation = false;

  if (state === "WORKING") {
    frame = atlas.workDesk;
    isWorkStation = true;
  } else if (state === "WALKING") {
    const cycleIdx = Math.floor((frameTick * 0.16) % atlas.walkFrames.length);
    frame = atlas.walkFrames[cycleIdx] || atlas.walkFrames[0];
  } else {
    // Idle front or subtle breathing
    frame = atlas.idleFront;
  }

  const aspectRatio = frame.sw / frame.sh;
  const renderH = isWorkStation ? targetHeight * 1.35 : targetHeight;
  const renderW = renderH * aspectRatio;

  // Soft shadow ellipse under feet
  ctx.save();
  ctx.fillStyle = "rgba(15, 23, 42, 0.4)";
  ctx.beginPath();
  ctx.ellipse(x, y - 2, renderW * 0.35, Math.max(3, renderH * 0.08), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Hover aura glow if hovered
  if (isHovered) {
    ctx.save();
    ctx.fillStyle = "rgba(56, 189, 248, 0.35)";
    ctx.beginPath();
    ctx.arc(x, y - renderH / 2, renderH * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Draw character frame (handling horizontal flip when facing left)
  ctx.save();
  const isFacingLeft = facing === "left" || facing === "NW" || facing === "SW";
  if (isFacingLeft && !isWorkStation) {
    ctx.translate(x, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(
      img,
      frame.sx,
      frame.sy,
      frame.sw,
      frame.sh,
      -renderW / 2,
      y - renderH,
      renderW,
      renderH
    );
  } else {
    ctx.drawImage(
      img,
      frame.sx,
      frame.sy,
      frame.sw,
      frame.sh,
      x - renderW / 2,
      y - renderH,
      renderW,
      renderH
    );
  }
  ctx.restore();

  // Speech bubble if present
  if (speechBubble) {
    ctx.save();
    const bubbleY = y - renderH - 8;
    ctx.font = "bold 11px 'Plus Jakarta Sans', monospace";
    const metrics = ctx.measureText(speechBubble);
    const bw = metrics.width + 12;
    const bh = 20;
    const bx = x - bw / 2;

    ctx.fillStyle = "#0f172a";
    ctx.fillRect(bx - 1, bubbleY - bh - 1, bw + 2, bh + 2);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(bx, bubbleY - bh, bw, bh);

    // Arrow
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(x - 2, bubbleY, 4, 3);

    ctx.fillStyle = "#0f172a";
    ctx.fillText(speechBubble, bx + 6, bubbleY - 6);
    ctx.restore();
  }
}
