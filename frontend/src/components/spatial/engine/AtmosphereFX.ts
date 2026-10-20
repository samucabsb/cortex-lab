import { AgentBenchId } from "@/types";

export interface ServerRackPos {
  x: number;
  y: number;
}

export interface MonitorGlowPos {
  roomId: AgentBenchId;
  x: number;
  y: number;
  color: string;
}

// Fixed positions of laboratory computer screens and server racks (in percentage coordinates)
export const LAB_MONITORS: MonitorGlowPos[] = [
  // Room 1 (Coordinator PICO digital board)
  { roomId: "coordinator", x: 19.5, y: 28.0, color: "#38bdf8" },
  // Room 2 (Dual monitors for Dra. Ada)
  { roomId: "mining", x: 25.0, y: 65.0, color: "#60a5fa" },
  // Room 2 (Server Rack Dr. Cross)
  { roomId: "mining", x: 13.0, y: 61.5, color: "#2563eb" },
  // Room 3 (Human Central Executive Screen)
  { roomId: "hitl", x: 53.0, y: 44.5, color: "#f59e0b" },
  // Room 4 (Microscope & Stats Terminal Dr. Fitz)
  { roomId: "auditing", x: 79.5, y: 32.5, color: "#f43f5e" },
  // Room 4 (RoB 2 Assessment Station Dra. Cochrane)
  { roomId: "auditing", x: 86.5, y: 23.0, color: "#e11d48" },
  // Room 5 (PRISMA Compilation Workstation Dra. Rosalind)
  { roomId: "synthesis", x: 84.5, y: 75.0, color: "#10b981" },
];

/**
 * Renders live atmospheric FX:
 * 1. Soft isometric ambient spotlight on the active room
 * 2. Flickering terminal screens
 * 3. Blinking server rack LEDs (green/amber/cyan)
 * 4. Rising data spark particles above active workstations
 */
export function renderAtmosphereFX(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  pixelScale: number,
  activeRoomId: AgentBenchId,
  frameTick: number
) {
  const p = Math.max(1, pixelScale);

  // 1. Blinking LEDs on Sala 02 Server Rack (Dr. Cross)
  const rackX = (13.5 / 100) * canvasW;
  const rackY = (60.5 / 100) * canvasH;

  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 3; col++) {
      const isLit = (frameTick + row * 7 + col * 13) % 20 < 12;
      const ledX = rackX + (col - 1) * 3 * p;
      const ledY = rackY - (row * 3 * p);

      if (isLit) {
        ctx.fillStyle = col === 0 ? "#10b981" : col === 1 ? "#38bdf8" : "#f59e0b";
        ctx.fillRect(ledX, ledY, 1.5 * p, 1.5 * p);
      } else {
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(ledX, ledY, 1.5 * p, 1.5 * p);
      }
    }
  }

  // 2. Terminal Screen Glows for each room
  for (const monitor of LAB_MONITORS) {
    const mx = (monitor.x / 100) * canvasW;
    const my = (monitor.y / 100) * canvasH;
    const isRoomActive = monitor.roomId === activeRoomId;

    // Gentle monitor flicker
    const flickerAlpha = isRoomActive
      ? 0.25 + 0.12 * Math.sin(frameTick * 0.15 + mx)
      : 0.12 + 0.05 * Math.sin(frameTick * 0.08 + my);

    ctx.save();
    const grad = ctx.createRadialGradient(mx, my, 2 * p, mx, my, 18 * p);
    grad.addColorStop(0, monitor.color);
    grad.addColorStop(1, "transparent");
    ctx.globalAlpha = flickerAlpha;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(mx, my, 18 * p, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 3. If room is actively working, draw rising data particles
    if (isRoomActive) {
      for (let i = 0; i < 3; i++) {
        const sparkAge = ((frameTick * 1.8 + i * 22) % 60) / 60; // 0..1
        const sparkX = mx + ((i - 1) * 7 * p) + Math.sin(frameTick * 0.1 + i) * (2 * p);
        const sparkY = my - (sparkAge * 28 * p);
        const alpha = 1.0 - sparkAge;

        ctx.fillStyle = monitor.color;
        ctx.globalAlpha = alpha * 0.85;
        ctx.fillRect(sparkX, sparkY, 2 * p, 2 * p);
        ctx.globalAlpha = 1.0;
      }
    }
  }
}
