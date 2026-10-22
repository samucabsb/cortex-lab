"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { ScientistCardInfo, ScientistId, ReviewSnapshot } from "@/types";
import {
  RotateCcw,
  Sparkles,
  BookOpen,
  Info,
  X,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";

const SVG_NS = "http://www.w3.org/2000/svg";
const LARGURA = 276;
const ALTURA = 120;
const TRABALHO_MINIMO_MS = 1150;
const VELOCIDADE = 50; // unidades da cena por segundo
const VOO_MS = 780;
const CORREDOR = 86;
const PASTA = { x: 226, y: 95 };

const CONTORNO = "#2B2024";
const COMUM: Record<string, string> = {
  k: CONTORNO,
  e: CONTORNO,
  m: "#B5574B",
};

// Corpo base 12 x 20; linhas 0 e 1 reservadas para chapéus/penteados
const CORPO = [
  "............",
  "............",
  "...kkkkkk...",
  "..khhhhhhk..",
  "..khsssshk..",
  "..ksessesk..",
  "..kssssssk..",
  "..ksssmssk..",
  "...kssssk...",
  "..kccwwcck..",
  ".kcccccccck.",
  "kccCccccCcck",
  "kccCccccCcck",
  "kscCccccCcsk",
  ".kkppppppkk.",
  "..kppkkppk..",
  "..kppkkppk..",
  "..kppkkppk..",
  ".kbbbkkbbbk.",
  ".kkkk..kkkk.",
];

const DIGITAR_A: Record<number, string> = { 13: "kccsccccscck" };
const DIGITAR_B: Record<number, string> = {
  12: "kcsCccccCsck",
  13: "kccCccccCcck",
};
const PASSO: Record<number, string> = {
  16: ".kppk..kppk.",
  17: ".kppk..kppk.",
  18: "kbbbk..kbbbk",
  19: "kkkk....kkkk",
};
const OLHOS_FECHADOS: Record<number, string> = { 5: "....s..s...." };

interface PersonagemDef {
  nome: string;
  tituloCompleto: string;
  papel: string;
  explicacao: string;
  cor: string;
  paleta: Record<string, string>;
  extras: Record<number, string>;
  icone: string[];
}

const PERSONAGENS: Record<ScientistId, PersonagemDef> = {
  turing: {
    nome: "Dr. Turing",
    tituloCompleto: "Dr. Alan Turing — Coordenador de Protocolo (PI)",
    papel: "Protocolo PICO",
    explicacao:
      "Estrutura a pergunta científica no modelo PICO (População, Intervenção, Comparador e Desfecho) e monta as equações booleanas que guiam a busca.",
    cor: "#3B6EA5",
    paleta: {
      h: "#4A3426",
      s: "#E8B98E",
      c: "#8B6D4C",
      C: "#6E5338",
      w: "#F4EFE6",
      p: "#3D404D",
      b: "#262324",
      a: "#5B4A3D",
      r: "#9E2A2B",
    },
    extras: {
      1: "...kkkkkk...",
      2: "..kaaaaaak..",
      9: "..kccrrcck..",
    },
    icone: ["ggg.ggg", "g.g.g.g", "ggg.ggg", ".......", "ggggggg"],
  },
  ada: {
    nome: "Dra. Ada",
    tituloCompleto: "Dra. Ada Lovelace — Mineradora de Literatura",
    papel: "Busca OpenAlex & PMC",
    explicacao:
      "Executa buscas federadas simultâneas no OpenAlex (250M+ artigos) e no Europe PMC / PubMed, removendo duplicatas automaticamente.",
    cor: "#2A7B6F",
    paleta: {
      h: "#261C1A",
      s: "#F0C49E",
      c: "#2A7B6F",
      C: "#1E5B52",
      w: "#FFFDF8",
      p: "#2E353B",
      b: "#1F1A1C",
      a: "#3A2B28",
    },
    extras: {
      0: "....kkkk....",
      1: "...kaaaak...",
      2: "..khhhhhhk..",
      10: ".kcwwwwwwck.",
    },
    icone: [".kkk...", "k...k..", ".kkk...", "....k..", ".....k."],
  },
  cross: {
    nome: "Dr. Cross",
    tituloCompleto: "Dr. Cross — Auditor de Proveniência & DOIs",
    papel: "Validação Crossref",
    explicacao:
      "Consulta a API oficial da Crossref para cada artigo encontrado, garantindo que o DOI existe de verdade e que o título confere (zero alucinação).",
    cor: "#4A558F",
    paleta: {
      h: "#2A2D34",
      s: "#D69F76",
      c: "#F2EFEA",
      C: "#D8D1C6",
      w: "#FFFFFF",
      p: "#2F3A4A",
      b: "#241F20",
      g: "#4A558F",
      r: "#2B5B84",
    },
    extras: {
      5: ".khgeggeghk.",
      10: ".....rr.....",
      11: ".....rr.....",
      12: ".....rr.....",
    },
    icone: ["......k", ".....k.", "k...k..", ".k.k...", "..k...."],
  },
  fitz: {
    nome: "Dr. Fitz",
    tituloCompleto: "Dr. Fitz — Extrator de Dados Metodológicos",
    papel: "Extração N & p-valor",
    explicacao:
      "Lê o texto dos artigos aprovados na triagem para extrair tamanho da amostra (N), resultados estatísticos (p-valores) e citações literais (verbatim).",
    cor: "#B87333",
    paleta: {
      h: "#8C4A27",
      s: "#EBC19D",
      c: "#4E6E58",
      C: "#3B5443",
      w: "#F4EFE6",
      p: "#4A3E36",
      b: "#2B2024",
      y: "#D9B45A",
    },
    extras: {
      1: "...kkkkkk...",
      2: "..khhhhhhk..",
      11: "....kyyk....",
    },
    icone: ["k...k..", "kk..k..", "k.k.k..", "k..kk..", "k...k.."],
  },
  cochrane: {
    nome: "Dra. Cochrane",
    tituloCompleto: "Dra. Cochrane — Auditora de Risco de Viés (RoB 2)",
    papel: "Auditoria RoB 2",
    explicacao:
      "Inspeciona falhas metodológicas (falta de cegamento, amostra reduzida, viés de seleção) segundo a ferramenta Cochrane Risk of Bias 2.",
    cor: "#9E2A3B",
    paleta: {
      h: "#D8CFC2",
      s: "#DFAA82",
      c: "#9E2A3B",
      C: "#781E2B",
      w: "#FFFDF8",
      p: "#3A3238",
      b: "#241F20",
      y: "#D9B45A",
    },
    extras: {
      2: "..khhhhhhk..",
      3: ".khhhhhhhhk.",
      4: ".khsssshk...",
      10: "...ky..yk...",
    },
    icone: ["..kkk..", ".k...k.", ".k.k.k.", ".k...k.", "..kkk.."],
  },
  rosalind: {
    nome: "Dra. Rosalind",
    tituloCompleto: "Dra. Rosalind Franklin — Sintetizadora PRISMA 2020",
    papel: "Síntese PRISMA 2020",
    explicacao:
      "Consolida todas as evidências auditadas na Matriz Comparativa PRISMA 2020, mapeia Lacunas de Conhecimento (Knowledge Gaps) e gera os arquivos CSV e BibTeX.",
    cor: "#6B3FA0",
    paleta: {
      h: "#3A231E",
      s: "#F2C9A0",
      c: "#5B3256",
      C: "#42223E",
      w: "#F4EFE6",
      p: "#2E2930",
      b: "#1F1A1C",
      y: "#D9B45A",
    },
    extras: {
      0: ".....kk.....",
      1: "....khhk....",
      11: ".....y......",
    },
    icone: [".kk....", "kkkkkkk", "kyyyyyk", "kyyyyyk", "kkkkkkk"],
  },
};

const ORDEM_AGENTES: ScientistId[] = [
  "turing",
  "ada",
  "cross",
  "fitz",
  "cochrane",
  "rosalind",
];

const MADEIRA: Record<string, string> = {
  k: "#4A3426",
  t: "#C79A66",
  T: "#A97B4B",
  f: "#8E6440",
  D: "#6B4A2E",
};

const BRANCO: Record<string, string> = {
  k: CONTORNO,
  w: "#FFFDF8",
  g: "#C9C2B8",
  r: "#B0303A",
  y: "#D9B45A",
  a: "#E2C98F",
  A: "#C9AE70",
};

function gerarMesa(w: number): string[] {
  const linhas = [
    "k".repeat(w),
    "k" + "t".repeat(w - 2) + "k",
    "k" + "T".repeat(w - 2) + "k",
  ];
  for (let i = 3; i < 8; i++) {
    const meio = Math.floor((w - 2) / 2) - 1;
    const puxador =
      i === 5
        ? "f".repeat(meio) + "DD" + "f".repeat(w - 4 - meio)
        : "f".repeat(w - 2);
    linhas.push("k" + puxador + "k");
  }
  linhas.push("k".repeat(w));
  return linhas;
}

const PULPITO = [
  "kkkkkkkkkkkkkk",
  "kttttttttttttk",
  "kTTTTTTTTTTTTk",
  "...kffffffk...",
  "...kfDDDDfk...",
  "...kffffffk...",
  "...kffffffk...",
  "...kffffffk...",
  "..kffffffffk..",
  ".kkkkkkkkkkkk.",
];

const PAPEL = ["kkkkk", "kwwwk", "kgggk", "kwwwk", "kgggk", "kkkkk"];
const PASTA_ABERTA = ["kkkkkkkkkkkkkk", "kaaaaaakaaaaak", "kAAAAAAkAAAAAk"];
const PASTA_FECHADA = [
  ".kkkkkkkkkkkk.",
  "krrrrrrrrrrrrk",
  "krrrwwwwwwrrrk",
  "krrrrrryrrrrrk",
  "kkkkkkkkkkkkkk",
];
const BALAO = [
  ".kkkkkkkkk.",
  "kwwwwwwwwwk",
  "kwwwwwwwwwk",
  "kwwwwwwwwwk",
  "kwwwwwwwwwk",
  "kwwwwwwwwwk",
  ".kkwkkkkkk.",
  "..kk.......",
];
const SELO_OK = [
  ".kkkkk.",
  "kgggggk",
  "kggggwk",
  "kwggwgk",
  "kgwwggk",
  "kgggggk",
  ".kkkkk.",
];
const SELO_ALERTA = [
  ".kkkkk.",
  "kaawaak",
  "kaawaak",
  "kaawaak",
  "kaaaaak",
  "kaawaak",
  ".kkkkk.",
];

interface PosCena {
  x: number;
  y: number;
  mesa?: { x: number; y: number; w: number };
  pulpito?: { x: number; y: number };
  saida?: number;
  chegada?: { x: number; y: number };
}

const CENA: Record<ScientistId, PosCena> = {
  turing: { x: 16, y: 85, mesa: { x: 8, y: 98, w: 28 } },
  ada: { x: 58, y: 64, mesa: { x: 50, y: 77, w: 28 } },
  cross: {
    x: 98,
    y: 64,
    mesa: { x: 90, y: 77, w: 28 },
    saida: 120,
    chegada: { x: 204, y: 85 },
  },
  fitz: {
    x: 140,
    y: 64,
    mesa: { x: 132, y: 77, w: 28 },
    saida: 162,
    chegada: { x: 207, y: 86 },
  },
  cochrane: {
    x: 181,
    y: 64,
    pulpito: { x: 180, y: 77 },
    saida: 196,
    chegada: { x: 210, y: 87 },
  },
  rosalind: { x: 241, y: 85, mesa: { x: 222, y: 98, w: 42 } },
};

// Utilitários DOM / SVG
function el(
  nome: string,
  atributos: Record<string, string | number> = {},
  classe?: string
): SVGElement {
  const e = document.createElementNS(SVG_NS, nome);
  for (const [k, v] of Object.entries(atributos)) e.setAttribute(k, String(v));
  if (classe) e.setAttribute("class", classe);
  return e;
}

function bloco(
  g: SVGElement,
  x: number,
  y: number,
  w: number,
  h: number,
  cor: string
) {
  g.appendChild(el("rect", { x, y, width: w, height: h, fill: cor }));
}

function pixels(
  linhas: string[],
  paleta: Record<string, string>,
  dx = 0,
  dy = 0,
  classe?: string
): SVGElement {
  const g = el("g", {}, classe);
  const porCor = new Map<string, string>();
  linhas.forEach((linha, y) => {
    let x = 0;
    while (x < linha.length) {
      const cor = paleta[linha[x]];
      if (!cor) {
        x++;
        continue;
      }
      let fim = x;
      while (fim < linha.length && paleta[linha[fim]] === cor) fim++;
      porCor.set(
        cor,
        (porCor.get(cor) || "") + `M${x + dx} ${y + dy}h${fim - x}v1h${x - fim}z`
      );
      x = fim;
    }
  });
  for (const [cor, d] of porCor) {
    g.appendChild(el("path", { d, fill: cor }));
  }
  return g;
}

function compor(
  base: string[],
  ...camadas: Array<Record<number, string>>
): string[] {
  const linhas = [...base];
  for (const camada of camadas) {
    for (const [iStr, linha] of Object.entries(camada)) {
      const i = Number(iStr);
      const antes = linhas[i];
      if (!antes) continue;
      linhas[i] = [...linha].map((c, x) => (c === "." ? antes[x] : c)).join("");
    }
  }
  return linhas;
}

function gerarQuadros(def: PersonagemDef) {
  const paleta = { ...COMUM, ...def.paleta };
  const vestir = (...poses: Array<Record<number, string>>) =>
    compor(CORPO, ...poses, def.extras);
  return {
    parado: pixels(vestir(), paleta, 0, 0, "q q-parado"),
    digitarA: pixels(vestir(DIGITAR_A), paleta, 0, 0, "q q-digitarA"),
    digitarB: pixels(vestir(DIGITAR_B), paleta, 0, 0, "q q-digitarB"),
    andar: pixels(vestir(PASSO), paleta, 0, 0, "q q-andar"),
    piscar: pixels(
      compor(vestir(), OLHOS_FECHADOS).map((l, i) => (i === 5 ? l : "")),
      paleta,
      0,
      0,
      "piscar"
    ),
  };
}

type FaseAgente =
  | "aguardando"
  | "trabalhando"
  | "entregando"
  | "concluido"
  | "interrompido";

interface AgenteInstancia {
  id: ScientistId;
  def: PersonagemDef;
  g: SVGElement;
  corpo: SVGElement;
  x: number;
  y: number;
  olhandoEsquerda: boolean;
  fase: FaseAgente;
  desde: number;
  alvo: FaseAgente;
  comAviso: boolean;
  recebeu: boolean;
  entregou: boolean;
  rota: { pontos: Array<{ x: number; y: number }>; aoChegar: () => void } | null;
}

interface VooPapel {
  g: SVGElement;
  de: { x: number; y: number };
  para: { x: number; y: number };
  inicio: number;
  duracao: number;
  aoPousar: () => void;
}

class SalaEngine {
  raiz: HTMLElement;
  svg: SVGElement;
  camada!: SVGElement;
  ceu!: SVGElement;
  pilha!: SVGElement;
  agentes: Record<string, AgenteInstancia> = {};
  objetos: Array<{ g: SVGElement; profundidade: () => number }> = [];
  voos: VooPapel[] = [];
  paginas = 0;
  reduzido = false;
  checkpointAlvo: "screening" | "bias_arbitration" | null = null;
  notificouScreening = false;
  notificouBias = false;
  notificouPrisma = false;
  raf: number | null = null;
  espera: ReturnType<typeof setTimeout> | null = null;
  ultimo: number | null = null;
  onPhaseChange?: (phases: Record<ScientistId, FaseAgente>) => void;
  onSelectScientist?: (id: ScientistId) => void;
  onMilestoneReached?: (
    milestone: "screening_ready" | "bias_ready" | "prisma_ready"
  ) => void;

  constructor(
    container: HTMLElement,
    svgElement: SVGElement,
    onPhaseChange?: (phases: Record<ScientistId, FaseAgente>) => void,
    onSelectScientist?: (id: ScientistId) => void,
    onMilestoneReached?: (
      milestone: "screening_ready" | "bias_ready" | "prisma_ready"
    ) => void
  ) {
    this.raiz = container;
    this.svg = svgElement;
    this.onPhaseChange = onPhaseChange;
    this.onSelectScientist = onSelectScientist;
    this.onMilestoneReached = onMilestoneReached;
    this.reduzido =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.montar();
  }

  montar() {
    this.svg.innerHTML = "";
    this.desenharFundo();
    this.camada = el("g");
    this.ceu = el("g");
    this.svg.append(this.camada, this.ceu);
    this.objetos = [];
    this.desenharMoveis();
    for (const id of ORDEM_AGENTES) {
      this.criarAgente(id);
    }
    this.ordenar(true);
  }

  desenharFundo() {
    const g = el("g");
    bloco(g, 0, 0, LARGURA, 60, "#F3ECE2"); // parede creme editorial
    bloco(g, 0, 0, LARGURA, 3, "#E2D5C3"); // sanca superior
    bloco(g, 0, 44, LARGURA, 14, "#ECE2D4"); // lambri clássico
    for (let x = 6; x < LARGURA; x += 24) {
      bloco(g, x, 46, 18, 10, "#E4D8C7");
    }
    bloco(g, 0, 58, LARGURA, 3, "#B89F82"); // rodapé de madeira
    bloco(g, 0, 61, LARGURA, ALTURA - 61, "#E8D9C3"); // assoalho
    for (let y = 67, i = 0; y < ALTURA; y += 7, i++) {
      bloco(g, 0, y, LARGURA, 1, "#DCC9AE");
      for (let x = (i % 2) * 19; x < LARGURA; x += 38) {
        bloco(g, x, y - 6, 1, 6, "#DFCDB3");
      }
    }

    // Tapete Persa / Editorial no Corredor Central do Laboratório
    bloco(g, 52, 83, 162, 26, "#8C3B3B");
    bloco(g, 54, 85, 158, 22, "#A64B4B");
    bloco(g, 56, 87, 154, 18, "#C99A49");
    bloco(g, 58, 89, 150, 14, "#9E3E3E");
    for (let rx = 62; rx < 204; rx += 16) {
      bloco(g, rx, 93, 6, 6, "#E2C98F");
      bloco(g, rx + 2, 95, 2, 2, "#3F5E7A");
    }

    // Luminárias Pendentes no Teto
    for (const lx of [64, 146, 228]) {
      bloco(g, lx, 0, 1, 7, "#6B4A2E");
      bloco(g, lx - 4, 7, 9, 3, "#4A3426");
      bloco(g, lx - 3, 10, 7, 2, "#F6E27F");
    }

    // Janela Panorâmica com Nuvens Animadas
    bloco(g, 10, 8, 36, 28, "#B89F82");
    bloco(g, 12, 10, 32, 24, "#CFE4F2");
    bloco(g, 12, 26, 32, 8, "#E3F0F7");
    const nuvem1 = pixels(
      ["..wwww..", ".wwwwww.", "wwwwwwww"],
      { w: "#FFFFFF" },
      14,
      13,
      "nuvem-animada"
    );
    const nuvem2 = pixels(
      [".wwww.", "wwwwww"],
      { w: "#F8FCFF" },
      28,
      19,
      "nuvem-animada"
    );
    g.append(nuvem1, nuvem2);
    bloco(g, 27, 10, 2, 24, "#B89F82");
    bloco(g, 12, 21, 32, 2, "#B89F82");
    bloco(g, 8, 36, 40, 2, "#A68A6C");

    // Prateleira Química com Erlenmeyers Borbulhantes (entre Janela e Quadro)
    bloco(g, 54, 18, 28, 2, "#8E6440");
    // Frasco verde
    g.append(
      pixels(
        ["..kk..", "..kk..", ".kggk.", "kggggk", "kkkkkk"],
        { k: "#2B2024", g: "#2E9E6B" },
        57,
        13
      )
    );
    g.append(
      pixels(
        [".b.", "b.."],
        { b: "#6EE7B7" },
        59,
        10,
        "bolha-quimica"
      )
    );
    // Frasco azul
    g.append(
      pixels(
        [".kk.", ".kk.", "kbbk", "kkkk"],
        { k: "#2B2024", b: "#3B82F6" },
        67,
        14
      )
    );
    // Frasco âmbar
    g.append(
      pixels(
        [".kk.", "kaak", "kkkk"],
        { k: "#2B2024", a: "#F59E0B" },
        74,
        15
      )
    );

    // Quadro PRISMA & Grafo de Evidências no centro
    bloco(g, 92, 6, 76, 34, "#8E6440");
    bloco(g, 94, 8, 72, 30, "#C99C6A");
    const notas: Array<[number, number, string]> = [
      [98, 11, "#FFFDF8"],
      [115, 21, "#F2E3A0"],
      [131, 10, "#F3C7C2"],
      [148, 22, "#DCE8EF"],
      [156, 11, "#FFFDF8"],
      [105, 27, "#F3C7C2"],
    ];
    const fio = el("polyline", {
      points: notas.map(([x, y]) => `${x + 4},${y + 1}`).join(" "),
      fill: "none",
      stroke: "#7C2128",
      "stroke-width": 0.65,
    });
    g.append(fio);
    for (const [x, y, cor] of notas) {
      bloco(g, x, y, 8, 7, cor);
      bloco(g, x + 1, y + 3, 6, 1, "#C9C2B8");
      bloco(g, x + 1, y + 5, 4, 1, "#C9C2B8");
      bloco(g, x + 3, y, 2, 2, "#7C2128");
    }

    // Pôster Dupla-Hélice DNA & Relógio de Parede
    bloco(g, 174, 10, 14, 22, "#FFFDF8");
    bloco(g, 174, 10, 14, 2, "#4A558F");
    g.append(
      pixels(
        [
          "b..r",
          ".br.",
          ".rb.",
          "r..b",
          ".rb.",
          ".br.",
          "b..r",
        ],
        { b: "#3B6EA5", r: "#9E2A3B" },
        179,
        15
      )
    );

    g.append(
      pixels(
        [
          "..kkkk..",
          ".kwwwwk.",
          "kwwkwwwk",
          "kwwkwwwk",
          "kwwkkkwk",
          "kwwwwwwk",
          ".kwwwwk.",
          "..kkkk..",
        ],
        { k: "#6B4A2E", w: "#FFFDF8" },
        196,
        14
      )
    );

    // Estante de Periódicos Científicos à direita
    bloco(g, 232, 8, 34, 52, "#8E6440");
    const coresLivros = [
      "#7C2128",
      "#3F5E7A",
      "#C99A3B",
      "#4E6E58",
      "#6B3FA0",
      "#5B4A3D",
      "#E2C98F",
    ];
    for (let p = 0, y = 10; p < 4; p++, y += 12) {
      bloco(g, 234, y, 30, 10, "#6B4A2E");
      for (let x = 235, i = p; x < 261; i++) {
        const largura = 2 + (i % 3 === 0 ? 1 : 0);
        const altura = 6 + ((i * 7) % 4);
        bloco(
          g,
          x,
          y + 10 - altura,
          largura,
          altura,
          coresLivros[i % coresLivros.length]
        );
        x += largura + (i % 5 === 0 ? 2 : 0);
      }
      bloco(g, 232, y + 10, 34, 2, "#A97B4B");
    }

    this.svg.append(g);
  }

  adicionarObjeto(g: SVGElement, profundidade: number) {
    const obj = { g, profundidade: () => profundidade };
    this.objetos.push(obj);
    return obj;
  }

  desenharMoveis() {
    // Supercomputador / Rack de Servidores OpenAlex & PubMed com LEDs Piscantes
    const servidor = el("g");
    bloco(servidor, 34, 46, 14, 30, "#262930");
    bloco(servidor, 35, 47, 12, 28, "#353A45");
    for (let y = 49; y < 72; y += 6) {
      bloco(servidor, 36, y, 10, 4, "#1F2229");
      bloco(servidor, 41, y + 1, 4, 1, "#64748B");
    }
    const ledVerde = el(
      "rect",
      { x: 37, y: 50, width: 2, height: 2, fill: "#10B981" },
      "led-piscante"
    );
    const ledAzul = el(
      "rect",
      { x: 37, y: 56, width: 2, height: 2, fill: "#38BDF8" },
      "led-piscante-2"
    );
    const ledAmbar = el(
      "rect",
      { x: 37, y: 62, width: 2, height: 2, fill: "#F59E0B" },
      "led-piscante"
    );
    const ledVerde2 = el(
      "rect",
      { x: 37, y: 68, width: 2, height: 2, fill: "#10B981" },
      "led-piscante-2"
    );
    servidor.append(ledVerde, ledAzul, ledAmbar, ledVerde2);
    this.adicionarObjeto(servidor, 76);

    for (const id of ORDEM_AGENTES) {
      const pos = CENA[id];
      const g = el("g");
      if (pos.mesa) {
        g.append(pixels(gerarMesa(pos.mesa.w), MADEIRA, pos.mesa.x, pos.mesa.y));
      }
      if (pos.pulpito) {
        g.append(pixels(PULPITO, MADEIRA, pos.pulpito.x, pos.pulpito.y));
        g.append(
          pixels(["ywwwwwwy"], BRANCO, pos.pulpito.x + 3, pos.pulpito.y - 1)
        );
      }
      const ref = pos.mesa || pos.pulpito!;
      const { x, y } = ref;

      if (id === "turing") {
        // Caderno PICO, Caneca de Café e Vapor Animado
        g.append(
          pixels(
            ["kkkkkkkk", "kwgwggwk", "kkkkkkkk", "kwwgwgwk"],
            BRANCO,
            x + 2,
            y - 4
          )
        );
        g.append(
          pixels(
            ["kkkk..", "krrkkk", "krrk.k", "krrkkk", "kkkk.."],
            BRANCO,
            x + 21,
            y - 5
          )
        );
        g.append(
          pixels([".w.", "w.."], { w: "#FFFFFF" }, x + 22, y - 8, "vapor-1"),
          pixels(["..w", ".w."], { w: "#E2E8F0" }, x + 22, y - 9, "vapor-2")
        );
      }
      if (id === "ada") {
        // Monitor Widescreen OpenAlex
        g.append(
          pixels(
            ["kkkkkkkk", "kggggggk", "kggwwggk", "kkkkkkkk", "..kkkk.."],
            { ...BRANCO, g: "#2A7B6F" },
            x + 18,
            y - 5
          )
        );
      }
      if (id === "cross") {
        // Carimbo Crossref e laudas
        g.append(pixels(["wwwwwww", "wrrwwgw"], BRANCO, x + 2, y - 1));
        g.append(
          pixels(["..kk..", ".krrk.", "kkkkkk"], BRANCO, x + 20, y - 3)
        );
      }
      if (id === "fitz") {
        // Microscópio óptico dourado na bancada
        g.append(
          pixels(
            ["...kk.", "..kyyk", "..kyk.", ".kwwwk", "kkkkkk"],
            BRANCO,
            x + 19,
            y - 5
          )
        );
      }
      if (id === "rosalind") {
        // Pasta PRISMA 2020 aberta e fechada + brilhos
        const pastaAberta = pixels(
          PASTA_ABERTA,
          BRANCO,
          PASTA.x,
          PASTA.y,
          "pasta-aberta"
        );
        this.pilha = el("g", {}, "pilha");
        const pastaFechada = pixels(
          PASTA_FECHADA,
          { ...BRANCO, r: "#5B3256" },
          PASTA.x,
          PASTA.y - 2,
          "pasta-fechada"
        );
        const brilhos = el("g", {}, "brilhos");
        for (const [bx, by, atraso] of [
          [222, 87, 0],
          [241, 85, 0.4],
          [235, 91, 0.8],
          [228, 83, 1.2],
        ]) {
          const b = pixels(
            [".w.", "www", ".w."],
            { w: "#D9B45A" },
            bx,
            by,
            "brilho"
          );
          b.style.animationDelay = `${atraso}s`;
          brilhos.append(b);
        }
        g.append(pastaAberta, this.pilha, pastaFechada, brilhos);
        g.append(
          pixels(["kkkkkk", "kwwwwk", "kkkkkk"], BRANCO, x + 33, y - 3)
        );
      }

      this.adicionarObjeto(g, y + 9);
    }

    // Planta botânica no canto direito
    this.adicionarObjeto(
      pixels(
        [
          "..g.g...",
          ".gggg.g.",
          "gGggGgg.",
          ".gGggG..",
          "..gggg..",
          ".kkkkkk.",
          ".kttttk.",
          "..kttk..",
          "..kkkk..",
        ],
        { g: "#5E8C5A", G: "#4A7348", k: "#6B3B2E", t: "#B5574B" },
        265,
        102
      ),
      111
    );
  }

  criarAgente(id: ScientistId) {
    const def = PERSONAGENS[id];
    const pos = CENA[id];
    const g = el("g", { "data-id": id }, "pessoa");
    const corpo = el("g", {}, "corpo");
    const q = gerarQuadros(def);
    const indice = Object.keys(this.agentes).length;

    corpo.append(
      pixels(["..kkkkkkkk.."], { k: "rgba(43,32,36,.18)" }, 0, 20, "sombra"),
      q.parado,
      q.digitarA,
      q.digitarB,
      q.andar,
      q.piscar
    );
    corpo.style.animationDelay = `${(indice * 0.45) % 2.5}s`;
    q.piscar.style.animationDelay = `${(indice * 1.1) % 4}s`;

    const papel = pixels(PAPEL, BRANCO, 9, 11, "papel-na-mao");
    corpo.append(papel);

    const balao = el("g", {}, "balao");
    balao.append(
      pixels(BALAO, BRANCO, 7, -9),
      pixels(
        def.icone,
        { ...BRANCO, k: CONTORNO, g: "#5B4A3D", y: "#D9B45A" },
        9,
        -8
      )
    );
    const seloOk = pixels(
      SELO_OK,
      { k: CONTORNO, g: "#2E7D32", w: "#FFFDF8" },
      9,
      -6,
      "selo selo-ok"
    );
    const seloAviso = pixels(
      SELO_ALERTA,
      { k: CONTORNO, a: "#D97706", w: "#FFFDF8" },
      9,
      -6,
      "selo selo-aviso"
    );
    const seloErro = pixels(
      SELO_ALERTA,
      { k: CONTORNO, a: "#9E2A2B", w: "#FFFDF8" },
      9,
      -6,
      "selo selo-erro"
    );
    g.append(corpo, balao, seloOk, seloAviso, seloErro);

    // Clique e Teclado acessíveis no cientista dentro do SVG (WCAG 2.1.1)
    g.setAttribute("tabindex", "0");
    g.setAttribute("role", "button");
    g.setAttribute("aria-label", `${def.nome} (${def.papel})`);
    g.addEventListener("click", () => {
      if (this.onSelectScientist) {
        this.onSelectScientist(id);
      }
    });
    g.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (this.onSelectScientist) {
          this.onSelectScientist(id);
        }
      }
    });

    const ag: AgenteInstancia = {
      id,
      def,
      g,
      corpo,
      x: pos.x,
      y: pos.y,
      olhandoEsquerda: false,
      fase: "aguardando",
      desde: 0,
      alvo: "aguardando",
      comAviso: false,
      recebeu: false,
      entregou: false,
      rota: null,
    };
    this.agentes[id] = ag;
    this.objetos.push({ g, profundidade: () => ag.y + 19 });
    this.posicionar(ag);
    this.pose(ag, "parado");
    this.mostrarFase(ag);
  }

  setReducedMotion(reduced: boolean) {
    this.reduzido = reduced;
  }

  sincronizarEstados(
    scientists: Record<ScientistId, ScientistCardInfo>,
    checkpoint?: "screening" | "bias_arbitration" | null
  ) {
    const mapStatus = (s: ScientistCardInfo["status"]): FaseAgente => {
      if (s === "WORKING") return "trabalhando";
      if (s === "COMPLETED") return "concluido";
      if (s === "WAITING_HUMAN") return "interrompido";
      if (s === "ERROR") return "interrompido";
      return "aguardando";
    };

    this.checkpointAlvo = checkpoint || null;

    for (const id of ORDEM_AGENTES) {
      const ag = this.agentes[id];
      const info = scientists[id];
      if (!ag || !info) continue;
      ag.alvo = mapStatus(info.status);
      ag.comAviso = info.status === "WAITING_HUMAN";
    }

    if (checkpoint !== "screening" && this.raiz.dataset.alerta === "screening") {
      delete this.raiz.dataset.alerta;
      if (this.agentes.cross) {
        this.agentes.cross.comAviso = false;
        this.mostrarFase(this.agentes.cross);
      }
    }
    if (checkpoint !== "bias_arbitration" && this.raiz.dataset.alerta === "bias") {
      delete this.raiz.dataset.alerta;
    }

    this.acordar();
  }

  reiniciarCoreografia() {
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this.espera) clearTimeout(this.espera);
    this.raf = null;
    this.espera = null;
    this.ultimo = null;
    this.notificouScreening = false;
    this.notificouBias = false;
    this.notificouPrisma = false;
    for (const v of this.voos) v.g.remove();
    this.voos = [];
    this.paginas = 0;
    this.desenharPilha();
    delete this.raiz.dataset.dossie;
    delete this.raiz.dataset.alerta;

    for (const id of ORDEM_AGENTES) {
      const ag = this.agentes[id];
      const pos = CENA[id];
      ag.x = pos.x;
      ag.y = pos.y;
      ag.olhandoEsquerda = false;
      ag.corpo.classList.remove("carregando");
      ag.fase = "aguardando";
      ag.desde = 0;
      ag.recebeu = false;
      ag.entregou = false;
      ag.rota = null;
      this.posicionar(ag);
      this.pose(ag, "parado");
      this.mostrarFase(ag);
    }
    this.ordenar(true);
    this.notificarFases();
    this.acordar();
  }

  acordar() {
    if (this.raf || this.espera) return;
    this.raf = requestAnimationFrame((t) => this.quadro(t));
  }

  quadro(agora: number) {
    this.raf = null;
    this.espera = null;
    if (!this.raiz.isConnected) return;
    const dt = this.ultimo ? Math.min(agora - this.ultimo, 100) : 0;
    this.ultimo = agora;

    this.avancar(agora);
    const mexeu = this.mover(agora, dt);

    const crossProntoParaAto2 =
      this.agentes.cross?.fase === "concluido" &&
      !this.agentes.cross?.entregou &&
      this.agentes.fitz?.alvo !== "aguardando";

    const pendente =
      crossProntoParaAto2 ||
      Object.values(this.agentes).some(
        (ag) => ["trabalhando", "entregando"].includes(ag.fase) || ag.rota
      ) ||
      Object.values(this.agentes).some(
        (ag) => ag.fase === "aguardando" && ag.alvo !== "aguardando"
      );

    if (mexeu || this.voos.length > 0) {
      this.raf = requestAnimationFrame((t) => this.quadro(t));
    } else if (pendente) {
      this.ultimo = null;
      this.espera = setTimeout(() => {
        this.espera = null;
        this.acordar();
      }, 150);
    } else {
      this.ultimo = null;
    }
  }

  avancar(agora: number) {
    const A = this.agentes;
    const tempoMinimo = this.reduzido ? 40 : TRABALHO_MINIMO_MS;
    const cumpriu = (ag: AgenteInstancia) => agora - ag.desde >= tempoMinimo;

    // 1. Dr. Turing (PI Coordinator)
    const turing = A.turing;
    if (turing.fase === "aguardando" && turing.alvo !== "aguardando") {
      this.mudar(turing, "trabalhando", agora);
    }
    if (turing.fase === "trabalhando") {
      if (turing.alvo === "concluido" && cumpriu(turing)) {
        this.mudar(turing, "entregando", agora);
        this.enviarPapel("turing", ["ada"], agora, () => {
          A.ada.recebeu = true;
          this.mudar(turing, "concluido", performance.now());
        });
      } else if (turing.alvo === "interrompido") {
        this.mudar(turing, "interrompido", agora);
      }
    }

    // 2. Dra. Ada (Searcher)
    const ada = A.ada;
    if (
      ada.fase === "aguardando" &&
      (ada.recebeu || turing.fase === "concluido") &&
      ada.alvo !== "aguardando"
    ) {
      this.mudar(ada, "trabalhando", agora);
    }
    if (ada.fase === "trabalhando") {
      if (ada.alvo === "concluido" && cumpriu(ada)) {
        this.mudar(ada, "entregando", agora);
        this.enviarPapel("ada", ["cross"], agora, () => {
          A.cross.recebeu = true;
          this.mudar(ada, "concluido", performance.now());
        });
      } else if (ada.alvo === "interrompido") {
        this.mudar(ada, "interrompido", agora);
      }
    }

    // 3. Dr. Cross (DOI Validator) — Fim do Ato 1 (Triagem) e Início do Ato 2
    const cross = A.cross;
    if (
      cross.fase === "aguardando" &&
      (cross.recebeu || ada.fase === "concluido") &&
      cross.alvo !== "aguardando"
    ) {
      this.mudar(cross, "trabalhando", agora);
    }
    if (cross.fase === "trabalhando") {
      if (cross.alvo === "concluido" && cumpriu(cross)) {
        if (A.fitz.alvo === "aguardando") {
          // Pausa visual na Triagem Humana (Ato 1 concluído)
          cross.comAviso = true;
          this.raiz.dataset.alerta = "screening";
          this.mudar(cross, "concluido", agora);
          if (!this.notificouScreening) {
            this.notificouScreening = true;
            this.onMilestoneReached?.("screening_ready");
          }
        } else {
          // Segue direto para o Ato 2
          cross.comAviso = false;
          delete this.raiz.dataset.alerta;
          cross.entregou = true;
          this.mudar(cross, "entregando", agora);
          this.enviarPapel("cross", ["fitz", "cochrane"], agora, () => {
            A.fitz.recebeu = true;
            A.cochrane.recebeu = true;
            this.mudar(cross, "concluido", performance.now());
          });
        }
      } else if (cross.alvo === "interrompido") {
        this.mudar(cross, "interrompido", agora);
      }
    } else if (
      cross.fase === "concluido" &&
      !cross.entregou &&
      A.fitz.alvo !== "aguardando"
    ) {
      // O pesquisador concluiu a Triagem Humana: dispara os papéis aprovados para Fitz e Cochrane!
      cross.comAviso = false;
      delete this.raiz.dataset.alerta;
      cross.entregou = true;
      this.mudar(cross, "entregando", agora);
      this.enviarPapel("cross", ["fitz", "cochrane"], agora, () => {
        A.fitz.recebeu = true;
        A.cochrane.recebeu = true;
        this.mudar(cross, "concluido", performance.now());
      });
    }

    // 4. Dr. Fitz & Dra. Cochrane (Extractor & RoB 2 Auditor)
    for (const id of ["fitz", "cochrane"] as ScientistId[]) {
      const r = A[id];
      if (
        r.fase === "aguardando" &&
        (r.recebeu || (cross.fase === "concluido" && cross.entregou)) &&
        r.alvo !== "aguardando"
      ) {
        this.mudar(r, "trabalhando", agora);
      }
      if (r.fase === "trabalhando") {
        if (r.alvo === "concluido" && cumpriu(r)) {
          this.mudar(r, "entregando", agora);
          this.levarAteRosalind(r);
        } else if (r.alvo === "interrompido" && cumpriu(r)) {
          r.comAviso = true;
          if (id === "cochrane") {
            this.raiz.dataset.alerta = "bias";
          }
          this.mudar(r, "interrompido", agora);
          if (id === "cochrane" && !this.notificouBias) {
            this.notificouBias = true;
            this.onMilestoneReached?.("bias_ready");
          }
        }
      }
      if (r.fase === "interrompido" && r.alvo === "concluido") {
        r.comAviso = false;
        delete this.raiz.dataset.alerta;
        this.mudar(r, "trabalhando", agora);
      }
    }

    // 5. Dra. Rosalind (PRISMA Synthesizer)
    const rosalind = A.rosalind;
    if (
      rosalind.fase === "aguardando" &&
      rosalind.alvo !== "aguardando" &&
      A.fitz.entregou &&
      A.cochrane.entregou
    ) {
      this.mudar(rosalind, "trabalhando", agora);
    }
    if (rosalind.fase === "trabalhando") {
      if (rosalind.alvo === "concluido" && cumpriu(rosalind)) {
        this.mudar(rosalind, "concluido", agora);
        this.raiz.dataset.dossie = "fechado";
        if (!this.notificouPrisma) {
          this.notificouPrisma = true;
          this.onMilestoneReached?.("prisma_ready");
        }
      } else if (rosalind.alvo === "interrompido") {
        this.mudar(rosalind, "interrompido", agora);
      }
    }
  }

  mudar(ag: AgenteInstancia, fase: FaseAgente, agora: number) {
    ag.fase = fase;
    ag.desde = agora;
    if (fase === "trabalhando") this.pose(ag, "digitando");
    else if (!ag.rota) this.pose(ag, "parado");
    this.mostrarFase(ag);
    this.notificarFases();
  }

  notificarFases() {
    if (!this.onPhaseChange) return;
    const map: Record<ScientistId, FaseAgente> = {
      turing: this.agentes.turing?.fase || "aguardando",
      ada: this.agentes.ada?.fase || "aguardando",
      cross: this.agentes.cross?.fase || "aguardando",
      fitz: this.agentes.fitz?.fase || "aguardando",
      cochrane: this.agentes.cochrane?.fase || "aguardando",
      rosalind: this.agentes.rosalind?.fase || "aguardando",
    };
    this.onPhaseChange(map);
  }

  enviarPapel(
    origemId: ScientistId,
    destinos: ScientistId[],
    agora: number,
    aoTerminarTodos: () => void
  ) {
    const posOrigem = CENA[origemId];
    const refOrigem = posOrigem.mesa || posOrigem.pulpito!;
    const de = { x: refOrigem.x + 10, y: refOrigem.y - 6 };
    let faltam = destinos.length;
    destinos.forEach((destId, idx) => {
      const posDest = CENA[destId];
      const refDest = posDest.mesa || posDest.pulpito!;
      this.voar(
        de,
        { x: refDest.x + 8, y: refDest.y - 5 },
        agora + idx * 160,
        () => {
          if (--faltam === 0) aoTerminarTodos();
        }
      );
    });
  }

  levarAteRosalind(ag: AgenteInstancia) {
    const pos = CENA[ag.id];
    const saidaX = pos.saida || pos.x + 12;
    const chegada = pos.chegada || { x: 208, y: 85 };
    const ida = [
      { x: saidaX, y: pos.y },
      { x: saidaX, y: CORREDOR },
      { x: chegada.x, y: CORREDOR },
      chegada,
    ];
    const volta = [...ida]
      .reverse()
      .slice(1)
      .concat([{ x: pos.x, y: pos.y }]);

    ag.corpo.classList.add("carregando");
    this.andar(ag, ida, () => {
      ag.corpo.classList.remove("carregando");
      ag.olhandoEsquerda = false;
      this.posicionar(ag);
      const agora = performance.now();
      this.voar(
        { x: ag.x + 9, y: ag.y + 11 },
        { x: PASTA.x + 8, y: PASTA.y - 5 },
        agora,
        () => {
          this.paginas += 1;
          this.desenharPilha();
        }
      );
      ag.entregou = true;
      this.mudar(ag, "concluido", agora);
      this.andar(ag, volta, () => {
        ag.olhandoEsquerda = false;
        this.posicionar(ag);
      });
    });
  }

  desenharPilha() {
    if (!this.pilha) return;
    this.pilha.replaceChildren();
    for (let i = 0; i < Math.min(this.paginas, 3); i++) {
      this.pilha.append(
        pixels(["kkkkk", "kwwwk"], BRANCO, PASTA.x + 8, PASTA.y - 2 - i * 2)
      );
    }
  }

  andar(
    ag: AgenteInstancia,
    pontos: Array<{ x: number; y: number }>,
    aoChegar: () => void
  ) {
    if (this.reduzido) {
      const fim = pontos[pontos.length - 1];
      ag.x = fim.x;
      ag.y = fim.y;
      ag.rota = null;
      this.posicionar(ag);
      this.ordenar();
      aoChegar();
      return;
    }
    ag.rota = { pontos: [...pontos], aoChegar };
    this.pose(ag, "andando");
  }

  voar(
    de: { x: number; y: number },
    para: { x: number; y: number },
    inicio: number,
    aoPousar: () => void
  ) {
    const g = pixels(
      [".y...", "kkkkk", "kwwwk", "kgggk", "kwwwk", "kkkkk"],
      { ...BRANCO, y: "#D9B45A" },
      0,
      0,
      "papel-voando"
    );
    g.style.display = "none";
    this.ceu.append(g);
    this.voos.push({
      g,
      de,
      para,
      inicio,
      duracao: this.reduzido ? 0 : VOO_MS,
      aoPousar,
    });
  }

  mover(agora: number, dt: number): boolean {
    let mexeu = false;
    for (const ag of Object.values(this.agentes)) {
      if (!ag.rota) continue;
      mexeu = true;
      let passo = (VELOCIDADE * dt) / 1000;
      while (passo > 0 && ag.rota.pontos.length > 0) {
        const alvo = ag.rota.pontos[0];
        const dx = alvo.x - ag.x;
        const dy = alvo.y - ag.y;
        const dist = Math.hypot(dx, dy);
        if (dx !== 0) ag.olhandoEsquerda = dx < 0;
        if (dist <= passo) {
          ag.x = alvo.x;
          ag.y = alvo.y;
          passo -= dist;
          ag.rota.pontos.shift();
        } else {
          ag.x += (dx / dist) * passo;
          ag.y += (dy / dist) * passo;
          passo = 0;
        }
      }
      this.posicionar(ag);
      if (ag.rota.pontos.length === 0) {
        const { aoChegar } = ag.rota;
        ag.rota = null;
        this.pose(ag, ag.fase === "trabalhando" ? "digitando" : "parado");
        aoChegar();
      }
    }
    if (mexeu) this.ordenar();

    this.voos = this.voos.filter((v) => {
      if (agora < v.inicio) return true;
      const t = v.duracao ? Math.min((agora - v.inicio) / v.duracao, 1) : 1;
      const x = v.de.x + (v.para.x - v.de.x) * t;
      const y =
        v.de.y + (v.para.y - v.de.y) * t - Math.sin(Math.PI * t) * 15;
      v.g.style.display = "";
      v.g.setAttribute("transform", `translate(${Math.round(x)} ${Math.round(y)})`);
      if (t < 1) return true;
      v.g.remove();
      v.aoPousar();
      return false;
    });
    return mexeu;
  }

  posicionar(ag: AgenteInstancia) {
    ag.g.setAttribute(
      "transform",
      `translate(${Math.round(ag.x)} ${Math.round(ag.y)})`
    );
    ag.corpo.setAttribute(
      "transform",
      ag.olhandoEsquerda ? "matrix(-1 0 0 1 12 0)" : ""
    );
  }

  pose(ag: AgenteInstancia, pose: string) {
    ag.g.dataset.pose = pose;
  }

  ordenar(forcar = false) {
    const ordem = [...this.objetos].sort(
      (a, b) => a.profundidade() - b.profundidade()
    );
    const atual = Array.from(this.camada.children);
    if (!forcar && ordem.every((o, i) => o.g === atual[i])) return;
    for (const o of ordem) this.camada.append(o.g);
  }

  mostrarFase(ag: AgenteInstancia) {
    const elG = ag.g;
    elG.dataset.fase = ag.fase;
    elG.dataset.selo =
      ag.fase === "interrompido"
        ? "aviso"
        : ag.fase === "concluido"
        ? ag.comAviso
          ? "aviso"
          : "ok"
        : "";
  }

  destruir() {
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this.espera) clearTimeout(this.espera);
  }
}

interface PixelLabRoomProps {
  scientists: Record<ScientistId, ScientistCardInfo>;
  snapshot: ReviewSnapshot | null;
  onMilestoneReached?: (
    milestone: "screening_ready" | "bias_ready" | "prisma_ready"
  ) => void;
  reducedMotion?: boolean;
  defaultCompact?: boolean;
}

export const PixelLabRoom: React.FC<PixelLabRoomProps> = ({
  scientists,
  snapshot,
  onMilestoneReached,
  reducedMotion = false,
  defaultCompact = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const engineRef = useRef<SalaEngine | null>(null);
  const milestoneCallbackRef = useRef(onMilestoneReached);
  milestoneCallbackRef.current = onMilestoneReached;

  const [visualPhases, setVisualPhases] = useState<
    Record<ScientistId, FaseAgente>
  >({
    turing: "aguardando",
    ada: "aguardando",
    cross: "aguardando",
    fitz: "aguardando",
    cochrane: "aguardando",
    rosalind: "aguardando",
  });

  const [selectedScientist, setSelectedScientist] =
    useState<ScientistId | null>(null);
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [isCompact, setIsCompact] = useState(defaultCompact);
  const prevReviewIdRef = useRef<string | null>(null);

  // Inicializa a engine SVG uma vez (persistente durante toda a sessão)
  useEffect(() => {
    if (!containerRef.current || !svgRef.current) return;
    const engine = new SalaEngine(
      containerRef.current,
      svgRef.current,
      (phases) => setVisualPhases({ ...phases }),
      (id) => setSelectedScientist((prev) => (prev === id ? null : id)),
      (milestone) => milestoneCallbackRef.current?.(milestone)
    );
    engineRef.current = engine;

    return () => {
      engine.destruir();
      engineRef.current = null;
    };
  }, []);

  // Atualiza preferência de movimento reduzido (acessibilidade)
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setReducedMotion(reducedMotion);
    }
  }, [reducedMotion]);

  // Reinicia coreografia caso uma nova revisão seja criada
  useEffect(() => {
    const currentId = snapshot?.review_id || null;
    if (prevReviewIdRef.current && currentId !== prevReviewIdRef.current) {
      engineRef.current?.reiniciarCoreografia();
    }
    prevReviewIdRef.current = currentId;
  }, [snapshot?.review_id]);

  // Sincroniza sempre que os estados dos cientistas ou o snapshot mudarem
  useEffect(() => {
    if (!engineRef.current) return;
    engineRef.current.sincronizarEstados(
      scientists,
      snapshot?.status === "AWAITING_HUMAN" ? snapshot.hitl?.checkpoint : null
    );
  }, [scientists, snapshot]);

  // Função para simular/replay completo da coreografia sob demanda
  const handleReplayChoreography = useCallback(() => {
    if (!engineRef.current) return;
    setIsCompact(false);
    engineRef.current.reiniciarCoreografia();

    const simulated: Record<ScientistId, ScientistCardInfo> = {
      turing: { ...scientists.turing, status: "COMPLETED" },
      ada: { ...scientists.ada, status: "COMPLETED" },
      cross: { ...scientists.cross, status: "COMPLETED" },
      fitz: { ...scientists.fitz, status: "COMPLETED" },
      cochrane: { ...scientists.cochrane, status: "COMPLETED" },
      rosalind: { ...scientists.rosalind, status: "COMPLETED" },
    };
    engineRef.current.sincronizarEstados(simulated, null);
  }, [scientists]);

  const getPhaseLabel = (id: ScientistId, fase: FaseAgente) => {
    const realStatus = scientists[id]?.status;
    if (realStatus === "WAITING_HUMAN") return "Sua Revisão";
    switch (fase) {
      case "trabalhando":
        return "Analisando...";
      case "entregando":
        return id === "turing"
          ? "Enviando PICO"
          : id === "ada"
          ? "Enviando Artigos"
          : id === "cross"
          ? "DOIs Validados"
          : "Levando à Síntese";
      case "concluido":
        return id === "rosalind" ? "Dossiê Pronto" : "Concluído";
      case "interrompido":
        return "Sua Revisão";
      default:
        return "Pronto";
    }
  };

  const statusGeral =
    visualPhases.rosalind === "concluido" || snapshot?.status === "COMPLETED"
      ? "Matriz PRISMA 2020 Pronta"
      : visualPhases.cross === "concluido" &&
        snapshot?.status === "AWAITING_HUMAN" &&
        snapshot?.hitl?.checkpoint === "screening"
      ? "Artigos prontos para sua avaliação"
      : snapshot?.status === "AWAITING_HUMAN" &&
        snapshot?.hitl?.checkpoint === "bias_arbitration"
      ? "Arbitragem de Viés solicitada"
      : Object.values(visualPhases).some(
          (f) => f === "trabalhando" || f === "entregando"
        )
      ? "Agentes trabalhando no laboratório..."
      : "Bancada Científica Pronta";

  return (
    <section
      ref={containerRef}
      aria-label="Sala de Operações dos Agentes Científicos"
      className="cortex-sala a11y-card space-y-3.5"
    >
      {/* Barra de Topo da Sala */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-extrabold uppercase tracking-widest text-slate-800 flex items-center gap-1.5">
            <Sparkles size={14} className="text-amber-600" aria-hidden="true" />
            LABORATÓRIO DE REVISÃO • EQUIPE DE AGENTES
          </span>
          <span
            role="status"
            aria-live="polite"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                statusGeral.includes("Pronta") && !statusGeral.includes("Bancada")
                  ? "bg-emerald-500"
                  : statusGeral.includes("avaliação") ||
                    statusGeral.includes("Arbitragem")
                  ? "bg-amber-500"
                  : statusGeral.includes("trabalhando")
                  ? "bg-blue-600 animate-pulse"
                  : "bg-slate-400"
              }`}
            />
            {statusGeral}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCompact((prev) => !prev)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition cursor-pointer"
            aria-expanded={!isCompact}
          >
            {isCompact ? "Mostrar Cenário Pixel Art" : "Modo Compacto"}
          </button>

          <button
            type="button"
            onClick={() => setShowDocsModal(!showDocsModal)}
            aria-expanded={showDocsModal}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border ${
              showDocsModal
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-200"
            }`}
          >
            <BookOpen size={12} aria-hidden="true" />
            <span>Como Funciona? (Guia)</span>
          </button>

          <button
            type="button"
            onClick={handleReplayChoreography}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-sm active:scale-95"
            title="Reproduzir a coreografia completa de entrega de artigos entre os 6 cientistas"
          >
            <RotateCcw size={12} aria-hidden="true" />
            <span>Animar Equipe</span>
          </button>
        </div>
      </div>

      {/* Documentação / Manual Rápido Embutido */}
      {showDocsModal && (
        <div className="p-4 rounded-2xl bg-slate-50 border border-blue-200 space-y-3 text-xs stage-enter">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <HelpCircle size={16} className="text-blue-600" />
              <span>Manual Rápido: Como usar o CortexLab em 4 Etapas</span>
            </div>
            <button
              type="button"
              onClick={() => setShowDocsModal(false)}
              aria-label="Fechar guia rápido"
              className="text-slate-400 hover:text-slate-700 cursor-pointer p-1"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
              <span className="font-bold text-blue-700 block">
                1. Pergunta PICO
              </span>
              <p className="text-slate-600 leading-relaxed">
                Defina o tema da pesquisa (ou escolha um exemplo pronto). O{" "}
                <strong>Dr. Turing</strong> organiza a População, Intervenção,
                Comparador e Desfecho.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
              <span className="font-bold text-emerald-700 block">
                2. Busca Oficial & DOI
              </span>
              <p className="text-slate-600 leading-relaxed">
                A <strong>Dra. Ada</strong> busca artigos reais na OpenAlex e
                PubMed, e o <strong>Dr. Cross</strong> valida cada DOI na
                Crossref para evitar citações falsas.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
              <span className="font-bold text-amber-700 block">
                3. Sua Avaliação (PT-BR)
              </span>
              <p className="text-slate-600 leading-relaxed">
                Os artigos começam como <em>Pendentes</em> para você decidir.
                Traduza os resumos para <strong>Português</strong> e aprove os
                relevantes (ou use <em>Aprovar Todos os Restantes</em>).
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
              <span className="font-bold text-purple-700 block">
                4. Matriz PRISMA 2020
              </span>
              <p className="text-slate-600 leading-relaxed">
                <strong>Dr. Fitz</strong> extrai a amostra (N),{" "}
                <strong>Dra. Cochrane</strong> audita o viés e{" "}
                <strong>Dra. Rosalind</strong> monta a tabela final pronta para
                Excel (.CSV) e BibTeX!
              </p>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            Dica: Clique ou pressione <kbd className="px-1.5 py-0.5 bg-white border rounded">Enter</kbd> em qualquer cientista para abrir sua ficha técnica.
          </p>
        </div>
      )}

      {/* Cena SVG Pixel Art Vetorial (Mantida no DOM para não perder estado de animação, ocultada suavemente se compacto) */}
      <div
        className={`cortex-sala-cena transition-all duration-300 ${
          isCompact ? "hidden" : "block"
        }`}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${LARGURA} ${ALTURA}`}
          role="group"
          aria-label="Ilustração interativa do laboratório com 6 cientistas"
        />

        {/* Balão HTML da Dra. Rosalind no fim */}
        <div
          className="fala-balao-html"
          data-tipo="concluido"
          style={
            {
              "--x": `${((CENA.rosalind.x + 6) / LARGURA) * 100}%`,
              "--y": `${((ALTURA - CENA.rosalind.y + 2) / ALTURA) * 100}%`,
            } as React.CSSProperties
          }
        >
          Matriz PRISMA Pronta!
        </div>

        {/* Balão HTML do Dr. Cross na Triagem */}
        <div
          className="fala-balao-html"
          data-tipo="screening"
          style={
            {
              "--x": `${((CENA.cross.x + 6) / LARGURA) * 100}%`,
              "--y": `${((ALTURA - CENA.cross.y + 2) / ALTURA) * 100}%`,
            } as React.CSSProperties
          }
        >
          Triagem Humana!
        </div>

        {/* Balão HTML da Dra. Cochrane no Viés */}
        <div
          className="fala-balao-html"
          data-tipo="bias"
          style={
            {
              "--x": `${((CENA.cochrane.x + 6) / LARGURA) * 100}%`,
              "--y": `${((ALTURA - CENA.cochrane.y + 2) / ALTURA) * 100}%`,
            } as React.CSSProperties
          }
        >
          Arbitrar Viés RoB 2!
        </div>
      </div>

      {/* Ficha Interativa do Cientista Selecionado */}
      {selectedScientist && (
        <div
          role="region"
          aria-label="Ficha do cientista selecionado"
          className="p-3.5 rounded-xl bg-slate-900 text-white flex items-start justify-between gap-4 stage-enter"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-sm shrink-0"
                style={{
                  backgroundColor: PERSONAGENS[selectedScientist].cor,
                }}
              />
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                {PERSONAGENS[selectedScientist].tituloCompleto}
              </span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed">
              {PERSONAGENS[selectedScientist].explicacao}
            </p>
            {scientists[selectedScientist]?.lastAction && (
              <p className="text-[11px] font-mono text-emerald-400 pt-0.5">
                Atividade atual: {scientists[selectedScientist].lastAction}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSelectedScientist(null)}
            aria-label="Fechar ficha do cientista"
            className="text-slate-400 hover:text-white p-1 cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Legenda Sincronizada dos 6 Agentes (Acessível via Clique e Teclado) */}
      <ol className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1 list-none m-0 p-0">
        {ORDEM_AGENTES.map((id, idx) => {
          const def = PERSONAGENS[id];
          const info = scientists[id];
          const fase = visualPhases[id];
          const ativo = fase === "trabalhando" || fase === "entregando";
          const concluido = fase === "concluido";
          const pausado =
            fase === "interrompido" || info?.status === "WAITING_HUMAN";
          const isSelected = selectedScientist === id;

          return (
            <li key={id} className="m-0 p-0">
              <button
                type="button"
                onClick={() =>
                  setSelectedScientist((prev) => (prev === id ? null : id))
                }
                aria-pressed={isSelected}
                className={`w-full text-left flex flex-col justify-between gap-1 p-2.5 rounded-xl border transition cursor-pointer ${
                  isSelected
                    ? "ring-2 ring-blue-600 bg-blue-50/40 border-blue-400"
                    : ativo
                    ? "bg-blue-50/50 border-blue-400 shadow-sm"
                    : pausado
                    ? "bg-amber-50/60 border-amber-400 shadow-sm"
                    : concluido
                    ? "bg-white border-emerald-200"
                    : "bg-slate-50/70 border-slate-200/80 hover:border-slate-300"
                }`}
                title="Clique para inspecionar a função deste cientista"
              >
                <div className="w-full">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: def.cor }}
                      />
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {idx + 1}. {def.nome}
                      </span>
                    </div>
                    {info && (
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-200/70 text-slate-700">
                        {info.metricValue}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {def.papel}
                  </p>
                </div>

                <div
                  className={`w-full text-[11px] font-semibold pt-1 border-t border-slate-100 flex items-center justify-between ${
                    ativo
                      ? "text-blue-700"
                      : pausado
                      ? "text-amber-700"
                      : concluido
                      ? "text-emerald-700"
                      : "text-slate-500"
                  }`}
                >
                  <span>{getPhaseLabel(id, fase)}</span>
                  <Info size={10} className="text-slate-400" aria-hidden="true" />
                </div>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
};
