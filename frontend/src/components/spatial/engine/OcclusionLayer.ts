import { OcclusionZone, Point2D } from "./types";

export const LAB_OCCLUSION_ZONES: OcclusionZone[] = [
  {
    id: "door_arch_room1",
    label: "Portal da Sala 01 (PICO)",
    x: 25.5,
    y: 31.0,
    w: 4.5,
    h: 5.0,
    depthThresholdY: 36.5,
    type: "door_arch",
  },
  {
    id: "desk_front_room1",
    label: "Bancada Frontal Sala 01",
    x: 15.0,
    y: 30.5,
    w: 7.5,
    h: 3.0,
    depthThresholdY: 30.2,
    type: "front_desk",
  },
  {
    id: "door_arch_room2",
    label: "Portal da Sala 02 (Mineração)",
    x: 27.5,
    y: 58.5,
    w: 4.5,
    h: 5.0,
    depthThresholdY: 64.0,
    type: "door_arch",
  },
  {
    id: "central_desk_front",
    label: "Mesa Frontal Sala 03 (HITL)",
    x: 47.0,
    y: 48.0,
    w: 9.5,
    h: 3.5,
    depthThresholdY: 47.5,
    type: "front_desk",
  },
  {
    id: "door_arch_room4",
    label: "Portal da Sala 04 (Auditoria)",
    x: 70.0,
    y: 30.5,
    w: 4.5,
    h: 5.0,
    depthThresholdY: 36.0,
    type: "door_arch",
  },
  {
    id: "door_arch_room5",
    label: "Portal da Sala 05 (Biblioteca)",
    x: 69.0,
    y: 61.5,
    w: 4.5,
    h: 5.0,
    depthThresholdY: 67.0,
    type: "door_arch",
  },
];

/**
 * Draws crisp architectural pixel art foreground occlusion elements.
 * When an actor's feet (position.y) are less than depthThresholdY,
 * these elements are rendered over the actor's head/body, creating genuine depth!
 */
export function renderOcclusionElements(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  pixelScale: number,
  debugShowZones: boolean = false
) {
  const p = Math.max(1, pixelScale);

  for (const zone of LAB_OCCLUSION_ZONES) {
    const screenX = (zone.x / 100) * canvasWidth;
    const screenY = (zone.y / 100) * canvasHeight;
    const w = (zone.w / 100) * canvasWidth;
    const h = (zone.h / 100) * canvasHeight;

    if (debugShowZones) {
      // Semi-transparent debug box
      ctx.fillStyle = "rgba(244, 63, 94, 0.25)";
      ctx.fillRect(screenX, screenY, w, h);
      ctx.strokeStyle = "#f43f5e";
      ctx.lineWidth = 1;
      ctx.strokeRect(screenX, screenY, w, h);
      continue;
    }

    if (zone.type === "door_arch") {
      // Architectural Doorframe Lintel (Dark wood beam with top specular highlight)
      ctx.fillStyle = "#1e293b"; // Dark outline
      ctx.fillRect(screenX, screenY, w, 4 * p);

      ctx.fillStyle = "#475569"; // Wooden frame tone
      ctx.fillRect(screenX + 1 * p, screenY + 1 * p, w - 2 * p, 2 * p);

      // Warm directional wall shadow beneath the doorframe
      ctx.fillStyle = "rgba(15, 23, 42, 0.4)";
      ctx.fillRect(screenX, screenY + 4 * p, w, 3 * p);
    } else if (zone.type === "front_desk") {
      // Front desk lip (solid wood / metallic trim)
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(screenX, screenY, w, 3 * p);

      ctx.fillStyle = "#334155";
      ctx.fillRect(screenX, screenY + 1 * p, w, 2 * p);
    }
  }
}
