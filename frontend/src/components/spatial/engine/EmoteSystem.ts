import { EmoteType } from "./types";


/**
 * Draws crisp 12x12 pixel art floating emotes with animated float/bounce.
 */
export function drawPixelEmote(
  ctx: CanvasRenderingContext2D,
  cx: number,
  headY: number,
  pixelScale: number,
  type: EmoteType,
  frameTick: number
) {
  const p = Math.max(1, pixelScale);
  const floatBob = Math.round(Math.sin(frameTick * 0.12) * 2 * p);
  const ex = Math.round(cx);
  const ey = Math.round(headY - 14 * p + floatBob);

  // Background badge pill (white with dark outline)
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(ex - 7 * p, ey - 7 * p, 14 * p, 14 * p);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(ex - 6 * p, ey - 6 * p, 12 * p, 12 * p);

  // Little down arrow pointing to head
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(ex - 1 * p, ey + 7 * p, 2 * p, 2 * p);

  switch (type) {
    case "bulb":
      // Yellow glowing lightbulb (PICO insight)
      ctx.fillStyle = "#facc15";
      ctx.fillRect(ex - 3 * p, ey - 5 * p, 6 * p, 5 * p);
      ctx.fillRect(ex - 2 * p, ey, 4 * p, 2 * p);
      ctx.fillStyle = "#94a3b8"; // screw base
      ctx.fillRect(ex - 1 * p, ey + 2 * p, 2 * p, 2 * p);
      break;

    case "search":
      // Magnifying glass (Mineração)
      ctx.strokeStyle = "#2563eb";
      ctx.lineWidth = 1.5 * p;
      ctx.strokeRect(ex - 4 * p, ey - 4 * p, 5 * p, 5 * p);
      ctx.fillStyle = "#1e293b"; // handle
      ctx.fillRect(ex + 1 * p, ey + 1 * p, 3 * p, 3 * p);
      break;

    case "shield":
      // Green shield with checkmark (Crossref verified)
      ctx.fillStyle = "#10b981";
      ctx.fillRect(ex - 4 * p, ey - 4 * p, 8 * p, 5 * p);
      ctx.fillRect(ex - 2 * p, ey + 1 * p, 4 * p, 3 * p);
      ctx.fillRect(ex - 1 * p, ey + 4 * p, 2 * p, 1 * p);
      ctx.fillStyle = "#ffffff"; // checkmark
      ctx.fillRect(ex - 1 * p, ey - 1 * p, 1 * p, 3 * p);
      ctx.fillRect(ex + 1 * p, ey - 2 * p, 1 * p, 2 * p);
      break;

    case "stamp":
      // Amber approval stamp (HITL)
      ctx.fillStyle = "#f59e0b";
      ctx.fillRect(ex - 4 * p, ey - 3 * p, 8 * p, 4 * p);
      ctx.fillStyle = "#78350f";
      ctx.fillRect(ex - 2 * p, ey - 5 * p, 4 * p, 2 * p);
      ctx.fillRect(ex - 1 * p, ey + 1 * p, 2 * p, 2 * p);
      break;

    case "micro":
      // Microscope / Slide (Dr. Fitz sample extraction)
      ctx.fillStyle = "#f43f5e";
      ctx.fillRect(ex - 3 * p, ey - 4 * p, 2 * p, 6 * p);
      ctx.fillRect(ex - 4 * p, ey + 2 * p, 8 * p, 2 * p);
      ctx.fillStyle = "#cbd5e1";
      ctx.fillRect(ex + 1 * p, ey - 2 * p, 3 * p, 2 * p);
      break;

    case "scales":
      // Scales of Justice / Balance (Cochrane RoB 2)
      ctx.fillStyle = "#e11d48";
      ctx.fillRect(ex - 4 * p, ey - 3 * p, 8 * p, 1 * p);
      ctx.fillRect(ex - 1 * p, ey - 4 * p, 2 * p, 8 * p);
      ctx.fillRect(ex - 4 * p, ey - 2 * p, 1 * p, 3 * p);
      ctx.fillRect(ex + 3 * p, ey - 2 * p, 1 * p, 3 * p);
      break;

    case "book":
      // Emerald Book / Synthesis (PRISMA 2020)
      ctx.fillStyle = "#059669";
      ctx.fillRect(ex - 4 * p, ey - 4 * p, 8 * p, 7 * p);
      ctx.fillStyle = "#ffffff"; // pages
      ctx.fillRect(ex - 3 * p, ey - 3 * p, 6 * p, 5 * p);
      ctx.fillStyle = "#059669"; // spine
      ctx.fillRect(ex - 1 * p, ey - 3 * p, 2 * p, 5 * p);
      break;
  }
}
