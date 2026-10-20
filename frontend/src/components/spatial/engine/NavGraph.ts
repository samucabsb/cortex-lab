import { NavNode, Point2D } from "./types";

/**
 * 2D Panoramic Laboratory Navigation Mesh (mapped to lab_2d_panoramic.jpg)
 * Top Floor (Rooms 1-5): Y ~ 54% (Workstations) to Y ~ 72% (Room Doors)
 * Bottom Corridor Floor: Y ~ 84% (Main Walkway between Doors 1, 2, 3, 4, 5)
 */
export const LAB_NAV_NODES: Record<string, NavNode> = {
  // Sala 01: Protocol Room (Dr. Turing)
  room1_desk: { id: "room1_desk", roomId: "coordinator", x: 10.0, y: 54.0, label: "Quadro & Terminal Dr. Turing" },
  room1_door: { id: "room1_door", roomId: "coordinator", x: 10.0, y: 72.0, label: "Porta 1 (Sala 01)" },

  // Sala 02: Server & Mining Room (Dra. Ada & Dr. Cross)
  room2_cross_rack: { id: "room2_cross_rack", roomId: "mining", x: 25.0, y: 54.0, label: "Rack Validação Dr. Cross" },
  room2_ada_desk: { id: "room2_ada_desk", roomId: "mining", x: 34.0, y: 54.0, label: "Bancada Mineração Dra. Ada" },
  room2_door: { id: "room2_door", roomId: "mining", x: 30.0, y: 72.0, label: "Porta 2 (Sala 02)" },

  // Sala 03: Central Command HITL (Você / PI Humano)
  room3_center_desk: { id: "room3_center_desk", roomId: "hitl", x: 50.0, y: 54.0, label: "Mesa Comando Central HITL" },
  room3_door: { id: "room3_door", roomId: "hitl", x: 50.0, y: 72.0, label: "Porta 3 (Sala 03)" },

  // Sala 04: Auditing & Biostatistics (Dr. Fitz & Dra. Cochrane)
  room4_fitz_desk: { id: "room4_fitz_desk", roomId: "auditing", x: 66.0, y: 54.0, label: "Microscópio Dr. Fitz" },
  room4_cochrane_desk: { id: "room4_cochrane_desk", roomId: "auditing", x: 74.0, y: 54.0, label: "Mesa RoB 2 Dra. Cochrane" },
  room4_door: { id: "room4_door", roomId: "auditing", x: 70.0, y: 72.0, label: "Porta 4 (Sala 04)" },

  // Sala 05: Research Library (Dra. Rosalind)
  room5_rosalind_desk: { id: "room5_rosalind_desk", roomId: "synthesis", x: 88.0, y: 54.0, label: "Mesa Biblioteca Dra. Rosalind" },
  room5_door: { id: "room5_door", roomId: "synthesis", x: 89.0, y: 72.0, label: "Porta 5 (Sala 05)" },

  // Corredor Horizontal Inferior (Caminhada física entre portas 1, 2, 3, 4, 5)
  corridor_door1: { id: "corridor_door1", roomId: "corridor", x: 10.0, y: 84.0, label: "Corredor Porta 1" },
  corridor_mid_1_2: { id: "corridor_mid_1_2", roomId: "corridor", x: 20.0, y: 84.0, label: "Corredor Salas 1-2" },
  corridor_door2: { id: "corridor_door2", roomId: "corridor", x: 30.0, y: 84.0, label: "Corredor Porta 2" },
  corridor_mid_2_3: { id: "corridor_mid_2_3", roomId: "corridor", x: 40.0, y: 84.0, label: "Corredor Salas 2-3" },
  corridor_door3: { id: "corridor_door3", roomId: "corridor", x: 50.0, y: 84.0, label: "Corredor Porta 3" },
  corridor_mid_3_4: { id: "corridor_mid_3_4", roomId: "corridor", x: 60.0, y: 84.0, label: "Corredor Salas 3-4" },
  corridor_door4: { id: "corridor_door4", roomId: "corridor", x: 70.0, y: 84.0, label: "Corredor Porta 4" },
  corridor_mid_4_5: { id: "corridor_mid_4_5", roomId: "corridor", x: 80.0, y: 84.0, label: "Corredor Salas 4-5" },
  corridor_door5: { id: "corridor_door5", roomId: "corridor", x: 89.0, y: 84.0, label: "Corredor Porta 5" },
};

// Topological Adjacency Graph connecting 2D rooms through corridor doorways
export const LAB_ADJACENCY: Record<string, string[]> = {
  // Sala 1
  room1_desk: ["room1_door"],
  room1_door: ["room1_desk", "corridor_door1"],

  // Corredor Door 1
  corridor_door1: ["room1_door", "corridor_mid_1_2"],
  corridor_mid_1_2: ["corridor_door1", "corridor_door2"],

  // Sala 2
  corridor_door2: ["corridor_mid_1_2", "corridor_mid_2_3", "room2_door"],
  room2_door: ["corridor_door2", "room2_cross_rack", "room2_ada_desk"],
  room2_cross_rack: ["room2_door", "room2_ada_desk"],
  room2_ada_desk: ["room2_door", "room2_cross_rack"],

  // Corredor Salas 2-3
  corridor_mid_2_3: ["corridor_door2", "corridor_door3"],

  // Sala 3
  corridor_door3: ["corridor_mid_2_3", "corridor_mid_3_4", "room3_door"],
  room3_door: ["corridor_door3", "room3_center_desk"],
  room3_center_desk: ["room3_door"],

  // Corredor Salas 3-4
  corridor_mid_3_4: ["corridor_door3", "corridor_door4"],

  // Sala 4
  corridor_door4: ["corridor_mid_3_4", "corridor_mid_4_5", "room4_door"],
  room4_door: ["corridor_door4", "room4_fitz_desk", "room4_cochrane_desk"],
  room4_fitz_desk: ["room4_door", "room4_cochrane_desk"],
  room4_cochrane_desk: ["room4_door", "room4_fitz_desk"],

  // Corredor Salas 4-5
  corridor_mid_4_5: ["corridor_door4", "corridor_door5"],

  // Sala 5
  corridor_door5: ["corridor_mid_4_5", "room5_door"],
  room5_door: ["corridor_door5", "room5_rosalind_desk"],
  room5_rosalind_desk: ["room5_door"],
};

function dist(p1: Point2D, p2: Point2D): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * A* / Dijkstra pathfinding over the 2D Panoramic NavGraph.
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

  if (!cameFrom[targetNodeId]) {
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
