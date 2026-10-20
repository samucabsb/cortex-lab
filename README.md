# 🔬 CortexLab / SciLab Agents
### Human Augmentation in Scientific Research & Systematic Reviews
> **Uma plataforma multi-agente de rigor acadêmico e nível comercial para amplificação cognitiva do pesquisador científico.**

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11+-cyan.svg)](https://www.python.org/)
[![Next.js 14](https://img.shields.io/badge/Next.js-14.2-white.svg)](https://nextjs.org/)
[![LangGraph](https://img.shields.io/badge/Engine-LangGraph-purple.svg)](https://github.com/langchain-ai/langgraph)
[![Stack](https://img.shields.io/badge/Cost-100%25%20Zero--Cost-brightgreen.svg)](#-arquitetura-100-zero-cost)
[![Standard](https://img.shields.io/badge/Compliance-PRISMA%202020-blue.svg)](http://www.prisma-statement.org/)
[![Residência em IA](https://img.shields.io/badge/Project-Residência%20em%20IA-orange.svg)](#-roadmap-de-12-semanas-residência-em-ia)

---

## 🌟 O que é o CortexLab?

O **CortexLab** é uma plataforma de **Human Augmentation** projetada para transformar a maneira como pesquisadores, pós-graduandos e laboratórios conduzem **Revisões Sistemáticas de Literatura** e **Auditorias Metodológicas**.

Diferente de chatbots genéricos que resumem textos superficialmente e inventam citações, o CortexLab combina:
1. **Motor Multi-Agente Científico (Python, FastAPI, LangGraph):** Minera APIs públicas abertas (OpenAlex, Europe PMC, PubMed/NCBI, SciELO, arXiv), valida DOIs criptograficamente na Crossref, disseca seções de métodos/resultados e audita rigor estatístico ($p$-hacking, $N$ amostral, risco de viés RoB 2).
2. **Interface Split-View "Clean Academic Daylight" (Next.js, Tailwind CSS, Framer Motion):** Inspirada em ferramentas como **Elicit.com, Notion e Linear**, une em tela dividida uma maquete arquitetônica iluminada do laboratório de pesquisa (Diorama HD-2D) a um Caderno de Extração Científica completo com a Matriz PRISMA 2020.
3. **Supervisão Humana Soberana (Human-in-the-Loop):** Portões de validação no grafo onde os assistentes de IA pausam a execução e aguardam o crivo do pesquisador em etapas críticas de triagem de elegibilidade e arbitragem de risco de viés.
4. **Arquitetura 100% Gratuita (Zero-Cost):** Projetada para rodar integralmente nas cotas gratuitas do Google Gemini, Groq Cloud, Supabase, Hugging Face Spaces e Vercel, com suporte a BYOK (*Bring Your Own Key*) direto no navegador.

---

## ⚖️ Por que Human Augmentation e não "IA Autônoma"?

| Critério Científico | Processo Manual Tradicional | Chatbots Genéricos (ChatGPT / Claude) | **CortexLab (Human Augmentation)** |
| :--- | :--- | :--- | :--- |
| **Tempo de Triagem** | Semanas ou meses de leitura | Minutos (mas não confiável) | **Redução de ~65% com rigor metodológico mantido** |
| **Alucinação de DOIs** | 0% (leitura direta) | **Alta (inventa artigos e fontes)** | **0.00% (Validação Crossref mandatória)** |
| **Rastreabilidade** | Notas em planilhas / papel | Afirmações soltas sem parágrafo | **Link direto com citação literal (*verbatim*)** |
| **Auditoria Metodológica** | Exaustiva (cálculo de poder, RoB 2) | Ignorada ou superficial | **Agente Auditor com checklists formais** |
| **Governança Humana** | 100% manual | Nenhuma (caixa preta) | **LangGraph HITL Checkpoints programáticos** |
| **Padrão de Saída** | Preenchimento manual no Excel | Texto solto não estruturado | **Matriz PRISMA 2020 + BibTeX exportável para Zotero** |

---

## 🏛️ Arquitetura Multi-Agente (LangGraph Engine)

O fluxo de raciocínio é orquestrado por um grafo cíclico de estados com nós modulares e persistência de checkpoints:

```mermaid
graph LR
    User([Pesquisador]) --> PI[PI Coordinator<br/>PICO & Boolean Queries]
    PI --> Miner[MinerAgent<br/>OpenAlex / PubMed / SciELO]
    Miner --> Crossref[Crossref DOI<br/>Deduplication Check]
    Crossref --> HITL1{🛑 Validação Humana 1<br/>Triagem de Artigos}
    HITL1 -->|Aprovado| Methodologist[MethodologistAgent<br/>Rigor Amostral & RoB 2]
    Methodologist --> BiasDecision{Risco Alto?}
    BiasDecision -->|Sim| HITL2{🛑 Validação Humana 2<br/>Arbitragem de Viés}
    BiasDecision -->|Não| Synthesizer[SynthesizerAgent<br/>PRISMA & Gaps]
    HITL2 -->|Ratificado| Synthesizer
    Synthesizer --> Export[CSV / BibTeX<br/>Export Engine]
```

### Bancadas Especializadas no Laboratório Virtual
- 🧭 **Bancada de Coordenação (`pi_coordinator_node`):** Enquadra a pergunta do pesquisador no formato PICO (*Population, Intervention, Comparator, Outcome*) e elabora estratégias de busca booleana com descritores controlados (MeSH/DeCS).
- 🔍 **Bancada de Mineração (`miner_node`):** Executa buscas federadas em OpenAlex, PubMed e SciELO, elimina duplicatas e valida o DOI na Crossref.
- 🛑 **Mesa de Supervisão Científica (`human_screening_node`):** Onde o pesquisador humano exerce controle soberano sobre quais artigos serão admitidos para a leitura aprofundada.
- 📊 **Bancada de Rigor Metodológico (`methodologist_node`):** Avalia o risco de viés de acordo com o padrão RoB 2 / STROBE, extrai tamanho amostral $N$, checa grupos controle e sinaliza $p$-valores limítrofes.
- 📑 **Mesa de Síntese PRISMA (`synthesizer_node`):** Consolida as colunas da Matriz PRISMA 2020 (incluindo estratificação Qualis CAPES e Quartil SJR) e mapeia **Knowledge Gaps** com hipóteses científicas testáveis.

---

## 🎨 Identidade Visual & UX: Design System "Clean Academic Daylight"

Inspirado nas melhores práticas de interfaces acadêmicas modernas (**Elicit.com, Notion e Linear**):
- **Superfície Clara e Iluminada:** Fundo em `bg-slate-50` (`#F8FAFC`), cartões em branco puro (`bg-white`) com bordas suaves (`border-slate-200`) e tipografia editorial **Inter / Plus Jakarta Sans**.
- **Layout Split-View (Tela Dividida):**
  - **Lado Esquerdo:** Maquete arquitetônica iluminada do laboratório (Diorama Isométrico HD-2D) com bancadas identificadas e balões de fala dos agentes.
  - **Lado Direito:** Caderno de Pesquisa Científico contendo o formulário de busca, pílulas de temas acadêmicos, cartões de Knowledge Gaps e a Matriz PRISMA interativa com busca instantânea.
- **Stepper Horizontal:** Guia o pesquisador pelas 4 etapas da revisão (`1. Estruturação PICO` ➔ `2. Mineração de Artigos` ➔ `3. Auditoria Metodológica` ➔ `4. Síntese PRISMA`).

---

## 💰 Arquitetura 100% Zero-Cost

O projeto foi intencionalmente arquitetado para permitir que qualquer pesquisador, laboratório universitário ou bolsista opere sem custos de infraestrutura:

| Componente | Provedor Gratuito | Cota / Benefício | Suporte a BYOK |
| :--- | :--- | :--- | :--- |
| **LLM Primário** | **Google Gemini Free Tier** | 15 RPM / 1M TPM (`gemini-1.5-flash`) | Sim (chave no browser) |
| **LLM Secundário** | **Groq Cloud Free Tier** | 30 RPM (`llama-3.3-70b-versatile`) | Sim |
| **Backend API** | **Hugging Face Spaces** | Docker Container gratuito (Porta 7860) | Deploy contínuo |
| **Frontend Web** | **Vercel Free Tier** | Hospedagem global Edge Next.js | Sim |
| **Banco de Dados** | **Supabase Free Tier** | PostgreSQL + `pgvector` (500MB gratuitos) | Sim |
| **APIs Científicas** | **OpenAlex, PubMed, SciELO, arXiv** | 100% públicas, abertas e gratuitas | N/A |

---

## 🚀 Como Executar Localmente (Passo a Passo)

> 💡 **Dica Importante:** Para rodar a aplicação completa, abra **dois terminais separados**, ambos a partir da pasta raiz `cortex-lab/`.

### Pré-requisitos
- **Node.js** >= 18.0 ([Download](https://nodejs.org/))
- **Python** >= 3.11 ([Download](https://www.python.org/))
- Git

---

### Terminal 1: Servidor Backend (FastAPI + LangGraph)

Partindo da pasta raiz do projeto (`cortex-lab`):

#### No Windows (PowerShell):
```powershell
# 1. Entrar na pasta do backend
cd backend

# 2. Copiar o arquivo de ambiente (se ainda não existir)
Copy-Item .env.example .env

# 3. Criar e ativar o ambiente virtual Python
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# 4. Instalar as dependências
pip install -r requirements.txt

# 5. Iniciar o servidor FastAPI (Porta 7860 padrão HF Spaces)
uvicorn app.main:app --reload --host 0.0.0.0 --port 7860
```

#### No Linux / macOS (Bash):
```bash
# 1. Entrar na pasta do backend
cd backend

# 2. Copiar o arquivo de ambiente
cp .env.example .env

# 3. Criar e ativar o ambiente virtual Python
python3 -m venv .venv
source .venv/bin/activate

# 4. Instalar as dependências
pip install -r requirements.txt

# 5. Iniciar o servidor FastAPI
uvicorn app.main:app --reload --host 0.0.0.0 --port 7860
```

> ✅ O backend estará rodando em `http://localhost:7860` com documentação interativa OpenAPI em `http://localhost:7860/docs`.

---

### Terminal 2: Interface Frontend (Next.js 14)

Abra um **segundo terminal** também a partir da pasta raiz do projeto (`cortex-lab`):

#### No Windows (PowerShell):
```powershell
# 1. Entrar na pasta do frontend
cd frontend

# 2. Copiar as variáveis de ambiente (se ainda não existir)
Copy-Item .env.example .env.local

# 3. Instalar as dependências Node.js
npm install

# 4. Iniciar o servidor de desenvolvimento
npm run dev
```

#### No Linux / macOS (Bash):
```bash
# 1. Entrar na pasta do frontend
cd frontend

# 2. Copiar as variáveis de ambiente
cp .env.example .env.local

# 3. Instalar as dependências Node.js
npm install

# 4. Iniciar o servidor de desenvolvimento
npm run dev
```

> ✅ A interface visual estará acessível no navegador em `http://localhost:3000`.

---

### 🧪 Executando os Testes Automatizados

Para validar o motor de extração, nós modulares e regras de negócio:

```powershell
# A partir da pasta backend/ com a venv ativada:
python -m pytest -v tests/
```

Para validar a integridade de tipos TypeScript e compilação de produção:

```powershell
# A partir da pasta frontend/:
npm run build
```

---

## 📂 Estrutura do Monorepo

```
cortex-lab/
├── .github/
│   └── workflows/
│       ├── ci.yml                     # Pipeline CI (Lint, Pytest, Next.js Build)
│       └── deploy-hf-space.yml        # Deploy automático no Hugging Face Spaces
├── docs/
│   ├── 01-discovery/
│   │   └── desk-research-benchmark.md # Fundamentação científica (PRISMA 2020, RoB 2 & Benchmark de IA)
│   ├── 02-requirements/
│   │   └── functional-reqs.md         # Requisitos Funcionais e Não-Funcionais (SRS)
│   ├── 03-architecture/
│   │   └── c4-diagrams.md             # Diagramas C4 e Máquina de Estados LangGraph
│   └── 04-validation/
│       └── empirical-metrics.md       # Métricas empíricas e protocolo de validação
├── backend/
│   ├── app/
│   │   ├── agents/
│   │   │   ├── state.py               # LabGraphState tipado com telemetria e HITL
│   │   │   ├── graph.py               # Grafo LangGraph compilado com roteamento
│   │   │   └── nodes/                 # Nós modulares dos agentes
│   │   │       ├── pi_coordinator.py  # PI: PICO e queries booleanas
│   │   │       ├── miner_node.py      # Minerador: OpenAlex, PubMed e SciELO
│   │   │       ├── methodologist_node.py # Auditor: Tamanho N, p-valores e RoB 2
│   │   │       └── synthesizer_node.py   # Sintetizador: PRISMA e Knowledge Gaps
│   │   ├── prompts/                   # Prompts do sistema isolados em Markdown (.md)
│   │   ├── db/
│   │   │   ├── supabase.py            # Persistência PostgreSQL com fallback em memória
│   │   │   └── migrations/            # Schema SQL com extensão pgvector
│   │   ├── services/
│   │   │   ├── exporter.py            # Exportação de Matriz CSV e BibTeX (.bib)
│   │   │   ├── open_apis.py           # Clientes HTTP assíncronos das bases abertas
│   │   │   └── pdf_parser.py          # Segmentação canônica de PDFs
│   │   ├── api/v1/
│   │   │   └── router.py              # Endpoints REST e streaming SSE
│   │   ├── core/
│   │   │   ├── config.py              # Configurações Pydantic Settings
│   │   │   └── llm_provider.py        # Provedores Gemini e Groq com tolerância a falhas
│   │   └── main.py                    # Entrypoint da aplicação FastAPI
│   ├── tests/
│   │   └── test_api.py                # Bateria completa de testes automatizados
│   ├── Dockerfile                     # Imagem de contêiner para Hugging Face Spaces
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── globals.css            # Tema Editorial Daylight (#FAF9F6) e fontes
│   │   │   ├── layout.tsx             # Metadados e estrutura raiz
│   │   │   └── page.tsx               # Fluxo Guiado de 4 Etapas + Caderno Editorial
│   │   ├── store/
│   │   │   └── useLabStore.ts         # Estado reativo Zustand com suporte a BYOK
│   │   ├── hooks/
│   │   │   └── useAgentStream.ts      # Consumo em tempo real de eventos SSE
│   │   ├── components/
│   │   │   ├── spatial/
│   │   │   │   └── IsometricLabCanvas.tsx  # Laboratório 3D WebGL (Three.js) interativo
│   │   │   ├── dashboard/
│   │   │   │   ├── PrismaMatrixTable.tsx   # Tabela comparativa limpa estilo Elicit/Notion
│   │   │   │   ├── KnowledgeGapsCard.tsx   # Cards editoriais de lacunas científicas
│   │   │   │   └── ExportToolbar.tsx       # Exportação para CSV e BibTeX
│   │   │   └── settings/
│   │   │       └── ByokConfigModal.tsx     # Modal para chaves gratuitas Gemini / Groq
│   │   ├── lib/
│   │   │   └── api.ts                 # Cliente HTTP com integração FastAPI e fallback
│   │   └── types/
│   │       └── index.ts               # Tipagens TypeScript estritas
│   ├── package.json
│   └── tailwind.config.ts
├── .gitignore
├── LICENSE
└── README.md
```

---

## 📜 Citação Científica & Licença

Se você utilizar o CortexLab em sua pesquisa ou projeto acadêmico, por favor cite:

```bibtex
@software{cortexlab2026,
  author = {Oliveira, Samuel and Colaboradores da Residência em IA},
  title = {CortexLab: Human Augmentation in Scientific Research via Specialized Multi-Agent Networks},
  year = {2026},
  url = {https://github.com/samucabsb/cortex-lab}
}
```

Distribuído sob a licença **MIT**. Veja [`LICENSE`](LICENSE) para mais informações.
