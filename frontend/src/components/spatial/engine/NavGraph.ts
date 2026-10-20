import { NavNode, Point2D } from "./types";

export const LAB_NAV_NODES: Record<string, NavNode> = {
  // Sala 01 (PICO & Protocolo)
  room1_desk: { id: "room1_desk", roomId: "coordinator", x: 18.5, y: 29.5, label: "Bancada Dr. Turing" },
  room1_center: { id: "room1_center", roomId: "coordinator", x: 22.5, y: 32.5, label: "Centro Sala 01" },
  room1_door: { id: "room1_door", roomId: "coordinator", x: 27.5, y: 36.0, label: "Porta Sala 01" },

  // Corredor Oeste
  corridor_west_upper: { id: "corridor_west_upper", roomId: "corridor", x: 31.5, y: 40.5, label: "Corredor Noroeste" },
  corridor_west_mid: { id: "corridor_west_mid", roomId: "corridor", x: 36.0, y: 48.0, label: "Entrada Oeste Sala Central" },
  corridor_west_lower: { id: "corridor_west_lower", roomId: "corridor", x: 32.5, y: 57.0, label: "Corredor Sudoeste" },

  // Sala 02 (Mineração & Validação DOI)
  room2_door: { id: "room2_door", roomId: "mining", x: 29.5, y: 63.5, label: "Porta Sala 02" },
  room2_center: { id: "room2_center", roomId: "mining", x: 20.5, y: 64.5, label: "Centro Sala 02" },
  room2_ada_desk: { id: "room2_ada_desk", roomId: "mining", x: 24.0, y: 66.5, label: "Bancada Dra. Ada" },
  room2_cross_rack: { id: "room2_cross_rack", roomId: "mining", x: 14.5, y: 63.0, label: "Servidor Crossref Dr. Cross" },

  // Sala 03 (Central HITL - Supervisão Humana)
  room3_center_desk: { id: "room3_center_desk", roomId: "hitl", x: 51.5, y: 46.5, label: "Mesa Pesquisador Líder" },

  // Corredor Leste
  corridor_east_upper: { id: "corridor_east_upper", roomId: "corridor", x: 67.5, y: 41.5, label: "Corredor Nordeste" },
  corridor_east_mid: { id: "corridor_east_mid", roomId: "corridor", x: 62.0, y: 48.0, label: "Entrada Leste Sala Central" },
  corridor_east_lower: { id: "corridor_east_lower", roomId: "corridor", x: 66.5, y: 58.5, label: "Corredor Sudeste" },

  // Sala 04 (Auditoria RoB 2 & Métodos)
  room4_door: { id: "room4_door", roomId: "auditing", x: 72.0, y: 35.5, label: "Porta Sala 04" },
  room4_center: { id: "room4_center", roomId: "auditing", x: 77.0, y: 31.5, label: "Centro Sala 04" },
  room4_fitz_desk: { id: "room4_fitz_desk", roomId: "auditing", x: 78.5, y: 34.0, label: "Bancada Dr. Fitz" },
  room4_cochrane_desk: { id: "room4_cochrane_desk", roomId: "auditing", x: 85.5, y: 24.5, label: "Bancada Dra. Cochrane" },

  // Sala 05 (Biblioteca PRISMA)
  room5_door: { id: "room5_door", roomId: "synthesis", x: 71.0, y: 66.5, label: "Porta Sala 05" },
  room5_center: { id: "room5_center", roomId: "synthesis", x: 76.5, y: 72.0, label: "Centro Sala 05" },
  room5_rosalind_desk: { id: "room5_rosalind_desk", roomId: "synthesis", x: 83.0, y: 76.5, label: "Mesa Dra. Rosalind" },
};

// Adjacency graph representing physical corridors and doors
export const LAB_ADJACENCY: Record<string, string[]> = {
  room1_desk: ["room1_center"],
  room1_center: ["room1_desk", "room1_door"],
  room1_door: ["room1_center", "corridor_west_upper"],

  corridor_west_upper: ["room1_door", "corridor_west_mid"],
  corridor_west_mid: ["corridor_west_upper", "corridor_west_lower", "room3_center_desk"],
  corridor_west_lower: ["corridor_west_mid", "room2_door"],

  room2_door: ["corridor_west_lower", "room2_center"],
  room2_center: ["room2_door", "room2_ada_desk", "room2_cross_rack"],
  room2_ada_desk: ["room2_center", "room2_cross_rack"],
  room2_cross_rack: ["room2_center", "room2_ada_desk"],

  room3_center_desk: ["corridor_west_mid", "corridor_east_mid"],

  corridor_east_mid: ["room3_center_desk", "corridor_east_upper", "corridor_east_lower"],
  corridor_east_upper: ["corridor_east_mid", "room4_door"],
  corridor_east_lower: ["corridor_east_mid", "room5_door"],

  room4_door: ["corridor_east_upper", "room4_center"],
  room4_center: ["room4_door", "room4_fitz_desk", "room4_cochrane_desk"],
  room4_fitz_desk: ["room4_center", "room4_cochrane_desk"],
  room4_cochrane_desk: ["room4_center", "room4_fitz_desk"],

  room5_door: ["corridor_east_lower", "room5_center"],
  room5_center: ["room5_door", "room5_rosalind_desk"],
  room5_rosalind_desk: ["room5_center"],
};

/**
 * Calculates Euclidean distance between two points in percentage units.
 */
function dist(p1: Point2D, p2: Point2D): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * A* / Dijkstra pathfinding over the Lab Navigation Graph.
 * Returns the sequence of Point2D coordinates that respects corridors, doors, and walls.
 */
export function findPathBetweenNodes(startNodeId: string, targetNodeId: string): Point2D[] {
  if (startNodeId === targetNodeId) {
    const node = LAB_NAV_NODES[startNodeId];
    return node ? [{ x: node.x, y: node.y }] : [];
  }

  const queue: string[] = [startNodeId];
  const cameFrom: Record<string, string> = {};
  const costSoFar: Record<string, number> = { [startNodeId]: 0 };

  while (queue.length > 0) {
    // Pick node with lowest cost
    queue.sort((a, b) => (costSoFar[a] || 0) - (costSoFar[b] || 0));
    const current = queue.shift()!;

    if (current === targetNodeId) {
      break;
    }

    const neighbors = LAB_ADJACENCY[current] || [];
    for (const next of neighbors) {
      const nodeA = LAB_NAV_NODES[current];
      const nodeB = LAB_NAV_NODES[next];
      if (!nodeA || !nodeB) continue;

      const newCost = (costSoFar[current] || 0) + dist(nodeA, nodeB);
      if (costSoFar[next] === undefined || newCost < costSoFar[next]) {
        costSoFar[next] = newCost;
        cameFrom[next] = current;
        if (!queue.includes(next)) {
          queue.push(next);
        }
      }
    }
  }

  // Reconstruct path
  if (!cameFrom[targetNodeId]) {
    // Fallback: direct segment if disconnected
    const s = LAB_NAV_NODES[startNodeId];
    const t = LAB_NAV_NODES[targetNodeId];
    return [s ? { x: s.x, y: s.y } : { x: 50, y: 50 }, t ? { x: t.x, y: t.y } : { x: 50, y: 50 }];
  }

  const pathNodes: string[] = [];
  let curr: string | undefined = targetNodeId;
  while (curr) {
    pathNodes.unshift(curr);
    curr = cameFrom[curr];
  }

  return pathNodes.map((id) => {
    const n = LAB_NAV_NODES[id];
    return { x: n.x, y: n.y };
  });
}
