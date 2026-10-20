import { CharacterAppearance, Direction, ActorActionState, ActorItem } from "./types";

export interface RenderScientistParams {
  ctx: CanvasRenderingContext2D;
  cx: number;
  cy: number;
  pixelScale: number;
  appearance: CharacterAppearance;
  state: ActorActionState;
  facing: Direction;
  frameTick: number;
  carryingItem?: ActorItem;
  speechBubble?: string;
  isHovered?: boolean;
}

/**
 * High-fidelity 32-bit Chibi Pixel Art Character Engine.
 * Features frame-by-frame animation, 2-tone cel shading on lab coats,
 * animated walking legs, distinct hair silhouettes, and glowing deliverables.
 */
export function drawPixelScientistCharacter({
  ctx,
  cx,
  cy,
  pixelScale,
  appearance,
  state,
  facing,
  frameTick,
  carryingItem,
  speechBubble,
  isHovered,
}: RenderScientistParams) {
  const p = Math.max(1, Math.round(pixelScale));
  const isLeft = facing === "left" || facing === "NW" || facing === "SW";

  // 1. Frame-based animation timing calculations
  // Walk cycle (6 frames)
  const walkFrame = Math.floor((frameTick * 0.22) % 6);
  // Idle breathing cycle (4 frames)
  const idleFrame = Math.floor((frameTick * 0.08) % 4);
  // Work typing cycle (4 frames)
  const workFrame = Math.floor((frameTick * 0.28) % 4);

  // Bobbing offset
  let bodyBob = 0;
  let legLeftOffset = 0;
  let legRightOffset = 0;
  let armLeftOffset = 0;
  let armRightOffset = 0;
  let isBlinking = false;

  if (state === "WALKING") {
    // 6-frame authentic leg cycle
    switch (walkFrame) {
      case 0:
        legLeftOffset = -2 * p;
        legRightOffset = 2 * p;
        bodyBob = 0;
        break;
      case 1:
        legLeftOffset = -1 * p;
        legRightOffset = 1 * p;
        bodyBob = -1 * p; // rise during pass
        break;
      case 2:
        legLeftOffset = 0;
        legRightOffset = 0;
        bodyBob = 0;
        break;
      case 3:
        legLeftOffset = 2 * p;
        legRightOffset = -2 * p;
        bodyBob = 0;
        break;
      case 4:
        legLeftOffset = 1 * p;
        legRightOffset = -1 * p;
        bodyBob = -1 * p;
        break;
      case 5:
        legLeftOffset = 0;
        legRightOffset = 0;
        bodyBob = 0;
        break;
    }
    armLeftOffset = -legLeftOffset;
    armRightOffset = -legRightOffset;
  } else if (state === "WORKING") {
    // Typing cycle
    bodyBob = workFrame % 2 === 0 ? 0 : -1 * p;
    armLeftOffset = workFrame === 0 || workFrame === 2 ? -2 * p : 0;
    armRightOffset = workFrame === 1 || workFrame === 3 ? -2 * p : 0;
  } else {
    // IDLE breathing
    bodyBob = idleFrame === 1 ? -1 * p : 0;
    isBlinking = idleFrame === 2; // subtle 1-frame blink every few seconds
  }

  const x0 = Math.round(cx);
  const y0 = Math.round(cy + bodyBob);

  // ---------------------------------------------------------------------------
  // A. Floor Drop Shadow (Soft pixel oval pinned strictly to cy)
  // ---------------------------------------------------------------------------
  ctx.fillStyle = "rgba(15, 23, 42, 0.38)";
  ctx.fillRect(x0 - 6 * p, Math.round(cy) - 1 * p, 12 * p, 3 * p);
  ctx.fillRect(x0 - 5 * p, Math.round(cy) - 2 * p, 10 * p, 5 * p);

  // If hovered, draw subtle selection ring on the floor
  if (isHovered) {
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1 * p;
    ctx.strokeRect(x0 - 7 * p, Math.round(cy) - 3 * p, 14 * p, 7 * p);
  }

  // ---------------------------------------------------------------------------
  // B. Legs & Shoes (Dark slacks with shaded shoes)
  // ---------------------------------------------------------------------------
  const legW = 3 * p;
  const legH = 5 * p;

  // Dark outline for legs
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(x0 - 4 * p, y0 - 7 * p + legLeftOffset, legW + 1 * p, legH + 2 * p);
  ctx.fillRect(x0 + 1 * p, y0 - 7 * p + legRightOffset, legW + 1 * p, legH + 2 * p);

  // Slacks fabric (#334155 slate)
  ctx.fillStyle = "#334155";
  ctx.fillRect(x0 - 3 * p, y0 - 6 * p + legLeftOffset, legW - 1 * p, legH - 1 * p);
  ctx.fillRect(x0 + 2 * p, y0 - 6 * p + legRightOffset, legW - 1 * p, legH - 1 * p);

  // Oxford Shoes (#1e293b dark charcoal)
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(x0 - 4 * p, y0 - 2 * p + legLeftOffset, legW + 1 * p, 2 * p);
  ctx.fillRect(x0 + 1 * p, y0 - 2 * p + legRightOffset, legW + 1 * p, 2 * p);

  // ---------------------------------------------------------------------------
  // C. Lab Coat Body (White coat with cool slate shadow & room-colored lanyard)
  // ---------------------------------------------------------------------------
  // Outline
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(x0 - 6 * p, y0 - 16 * p, 12 * p, 10 * p);

  // Lab coat main white (#ffffff)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x0 - 5 * p, y0 - 15 * p, 10 * p, 8 * p);

  // Coat lower hem shadow (#cbd5e1)
  ctx.fillStyle = "#cbd5e1";
  ctx.fillRect(x0 - 5 * p, y0 - 8 * p, 10 * p, 1 * p);

  // Left/Right directional shading on coat
  if (isLeft) {
    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(x0 + 1 * p, y0 - 15 * p, 4 * p, 7 * p);
  } else {
    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(x0 - 5 * p, y0 - 15 * p, 4 * p, 7 * p);
  }

  // Inner shirt & lanyard badge
  ctx.fillStyle = appearance.badgeColor;
  ctx.fillRect(x0 - 1 * p, y0 - 14 * p, 2 * p, 5 * p);

  // ---------------------------------------------------------------------------
  // D. Articulated Pixel Arms & Hands
  // ---------------------------------------------------------------------------
  const armW = 2 * p;
  const armH = 6 * p;

  if (carryingItem) {
    // Both arms held forward carrying the glowing folder!
    const folderHoldY = y0 - 11 * p;
    ctx.fillStyle = "#0f172a"; // arm outlines
    ctx.fillRect(x0 - 5 * p, folderHoldY, 10 * p, 3 * p);

    ctx.fillStyle = "#ffffff"; // sleeves
    ctx.fillRect(x0 - 4 * p, folderHoldY + 1 * p, 8 * p, 2 * p);

    // Hands holding document
    ctx.fillStyle = appearance.skinColor;
    ctx.fillRect(x0 - 2 * p, folderHoldY + 1 * p, 4 * p, 2 * p);
  } else {
    // Natural swinging or typing arms
    ctx.fillStyle = "#0f172a"; // outline
    ctx.fillRect(x0 - 8 * p, y0 - 15 * p + armLeftOffset, armW + 2 * p, armH + 2 * p);
    ctx.fillRect(x0 + 6 * p, y0 - 15 * p + armRightOffset, armW + 2 * p, armH + 2 * p);

    ctx.fillStyle = "#ffffff"; // white sleeve
    ctx.fillRect(x0 - 7 * p, y0 - 14 * p + armLeftOffset, armW, armH);
    ctx.fillRect(x0 + 7 * p, y0 - 14 * p + armRightOffset, armW, armH);

    // Hands (skin tone)
    ctx.fillStyle = appearance.skinColor;
    ctx.fillRect(x0 - 7 * p, y0 - 9 * p + armLeftOffset, armW, 2 * p);
    ctx.fillRect(x0 + 7 * p, y0 - 9 * p + armRightOffset, armW, 2 * p);
  }

  // ---------------------------------------------------------------------------
  // E. Chibi Head, Face & Features
  // ---------------------------------------------------------------------------
  // Head outline
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(x0 - 6 * p, y0 - 26 * p, 12 * p, 11 * p);

  // Skin tone face
  ctx.fillStyle = appearance.skinColor;
  ctx.fillRect(x0 - 5 * p, y0 - 24 * p, 10 * p, 8 * p);

  // Eyes (or blinking line)
  ctx.fillStyle = "#0f172a";
  if (isBlinking) {
    // Closed eye line
    ctx.fillRect(x0 - 3 * p, y0 - 20 * p, 2 * p, 1 * p);
    ctx.fillRect(x0 + 1 * p, y0 - 20 * p, 2 * p, 1 * p);
  } else {
    // Open 2x2 expressive pixel eyes
    ctx.fillRect(x0 - 3 * p, y0 - 21 * p, 2 * p, 2 * p);
    ctx.fillRect(x0 + 1 * p, y0 - 21 * p, 2 * p, 2 * p);

    // Eye glint
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(isLeft ? x0 - 3 * p : x0 - 2 * p, y0 - 21 * p, 1 * p, 1 * p);
    ctx.fillRect(isLeft ? x0 + 1 * p : x0 + 2 * p, y0 - 21 * p, 1 * p, 1 * p);
  }

  // Glasses frames
  if (appearance.glasses) {
    ctx.strokeStyle = "#38bdf8"; // cyan scholar frames
    ctx.lineWidth = 1 * p;
    ctx.strokeRect(x0 - 4 * p, y0 - 22 * p, 3 * p, 3 * p);
    ctx.strokeRect(x0 + 1 * p, y0 - 22 * p, 3 * p, 3 * p);
    // Bridge
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(x0 - 1 * p, y0 - 21 * p, 2 * p, 1 * p);
  }

  // ---------------------------------------------------------------------------
  // F. Hair Styles with Shading & Silhouettes
  // ---------------------------------------------------------------------------
  ctx.fillStyle = appearance.hairColor;
  // Hair top crown
  ctx.fillRect(x0 - 6 * p, y0 - 27 * p, 12 * p, 4 * p);

  if (appearance.hairStyle === "ponytail") {
    // High ponytail bouncing on side
    const ponyDir = isLeft ? 1 : -1;
    const ponyBob = state === "WALKING" ? Math.sin(frameTick * 0.3) * p : 0;
    ctx.fillRect(x0 + ponyDir * 6 * p, y0 - 25 * p + ponyBob, 3 * p, 6 * p);
    ctx.fillRect(x0 + ponyDir * 8 * p, y0 - 22 * p + ponyBob, 2 * p, 5 * p);
  } else if (appearance.hairStyle === "bun") {
    // Scholar bun on top
    ctx.fillRect(x0 - 2 * p, y0 - 29 * p, 4 * p, 3 * p);
  } else {
    // Sideburns
    ctx.fillRect(x0 - 6 * p, y0 - 24 * p, 2 * p, 4 * p);
    ctx.fillRect(x0 + 4 * p, y0 - 24 * p, 2 * p, 4 * p);
  }

  // Hair specular highlight
  ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
  ctx.fillRect(x0 - 4 * p, y0 - 27 * p, 5 * p, 1 * p);

  // ---------------------------------------------------------------------------
  // G. Glowing Deliverable Folder (when HANDOFF)
  // ---------------------------------------------------------------------------
  if (carryingItem) {
    const docX = isLeft ? x0 - 9 * p : x0 + 2 * p;
    const docY = y0 - 12 * p;

    // Glowing aura
    ctx.fillStyle = carryingItem.glowColor;
    ctx.fillRect(docX - 1 * p, docY - 1 * p, 8 * p, 7 * p);

    // Folder outline
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(docX, docY, 6 * p, 5 * p);

    // Folder color
    ctx.fillStyle = carryingItem.color;
    ctx.fillRect(docX + 1 * p, docY + 1 * p, 4 * p, 3 * p);

    // White paper document edge inside folder
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(docX + 2 * p, docY, 2 * p, 1 * p);
  }

  // ---------------------------------------------------------------------------
  // H. Speech / Action Bubble (Above Head)
  // ---------------------------------------------------------------------------
  if (speechBubble) {
    const bubbleY = y0 - 32 * p;
    ctx.font = `bold ${Math.max(10, 3 * p)}px 'Plus Jakarta Sans', monospace`;
    const textMetrics = ctx.measureText(speechBubble);
    const boxW = textMetrics.width + 10 * p;
    const boxH = 6 * p;
    const boxX = x0 - boxW / 2;

    // Bubble border & fill
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(boxX - 1 * p, bubbleY - boxH - 1 * p, boxW + 2 * p, boxH + 2 * p);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(boxX, bubbleY - boxH, boxW, boxH);

    // Speech arrow
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(x0 - 1 * p, bubbleY, 2 * p, 2 * p);

    // Text
    ctx.fillStyle = "#0f172a";
    ctx.fillText(speechBubble, boxX + 5 * p, bubbleY - 2 * p);
  }
}
