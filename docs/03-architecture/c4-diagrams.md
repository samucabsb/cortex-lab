# 📐 Arquitetura de Software: CortexLab / SciLab Agents
## Diagramas C4 e Máquina de Estados LangGraph com Human-in-the-Loop (HITL)

> **Documento:** ARCH-001  
> **Versão:** 1.0.0  
> **Padrão:** C4 Model (Contexto, Contêineres, Componentes) + Mermaid.js State & Sequence Diagrams  
> **Premissa:** Arquitetura 100% Zero-Cost, desacoplada, reativa e auditável por humanos.

---

## 1. Nível 1: Diagrama de Contexto do Sistema (C4 System Context)

O diagrama abaixo ilustra como o pesquisador humano interage com o **CortexLab** e como o ecossistema se conecta aos serviços externos e APIs abertas gratuitas.

```mermaid
C4Context
    title Diagrama de Contexto de Sistema - CortexLab / SciLab Agents

    Person(researcher, "Pesquisador / PI", "Pesquisador acadêmico ou pós-graduando realizando revisão sistemática ou auditoria de métodos.")

    System(cortexlab, "CortexLab Platform", "Plataforma de Human Augmentation com interface espacial HD-2D e motor multi-agente LangGraph.")

    System_Ext(openalex, "OpenAlex API", "Catálogo aberto de metadados científicos, citações e conceitos.")
    System_Ext(europepmc, "Europe PMC / PubMed", "Repositório biomédico de acesso aberto com textos completos de artigos.")
    System_Ext(semanticscholar, "Semantic Scholar API", "Grafo de literatura científica e influência de citações.")
    System_Ext(arxiv, "arXiv API", "Repositório aberto de preprints em computação, matemática e física.")
    System_Ext(crossref, "Crossref API", "Validador criptográfico de integridade e metadados de DOI.")
    System_Ext(gemini, "Google Gemini API (Free)", "LLM multimodal de alta janela de contexto (1M tokens) para parsing e síntese.")
    System_Ext(groq, "Groq Cloud (Free Tier)", "LLM ultra-rápido Llama 3.3 70B para auditoria estatística e fallback.")
    System_Ext(supabase, "Supabase Cloud (Free)", "PostgreSQL com pgvector para armazenamento de vetores e checkpoints do grafo.")

    Rel(researcher, cortexlab, "Define escopo, inspeciona bancadas e aprova etapas críticas (HITL)", "HTTPS / WSS")
    Rel(cortexlab, openalex, "Minera artigos e metadados", "REST HTTPS")
    Rel(cortexlab, europepmc, "Recupera artigos biomédicos e PDFs", "REST HTTPS")
    Rel(cortexlab, semanticscholar, "Analisa citações e grafos de influência", "REST HTTPS")
    Rel(cortexlab, arxiv, "Recupera preprints", "REST HTTPS / Atom")
    Rel(cortexlab, crossref, "Valida unicidade e existência de DOI", "REST HTTPS")
    Rel(cortexlab, gemini, "Processa seções longas de métodos e síntese PRISMA", "gRPC / HTTPS")
    Rel(cortexlab, groq, "Audita consistência estatística com baixa latência", "REST HTTPS")
    Rel(cortexlab, supabase, "Persiste estado dos agentes, embeddings e matrizes", "PostgreSQL / pgvector")
```

---

## 2. Nível 2: Diagrama de Contêineres (C4 Container Diagram)

Mostra a divisão de responsabilidades entre o frontend, backend, microsserviços e persistência, operando dentro das limitações de custo zero.

```mermaid
C4Container
    title Diagrama de Contêineres - CortexLab Monorepo

    Person(researcher, "Pesquisador", "Usuário final da plataforma")

    Container_Boundary(frontend_app, "Frontend (Vercel Free Tier)") {
        Container(spatial_ui, "Spatial Canvas (HD-2D)", "React / HTML5 Canvas 2D (60 FPS)", "Renderiza o laboratório virtual isométrico com 5 salas, cientistas animados e handoffs físicos.")
        Container(glass_hud, "Glassmorphic HUD & Dashboard", "Next.js 14, Tailwind CSS, Framer Motion", "Exibe status dos agentes, matriz PRISMA, modais de auditoria e botões de aprovação.")
        Container(state_client, "Client State & BYOK Store", "Zustand / LocalStorage", "Gerencia chaves de API locais (BYOK) e estado do laboratório.")
    }

    Container_Boundary(backend_app, "Backend (Hugging Face Spaces - Docker Port 7860)") {
        Container(fastapi, "FastAPI Gateway", "Python 3.11+, Uvicorn", "Roteia requisições REST, emite telemetria Server-Sent Events (SSE) e gerencia auth.")
        Container(langgraph_engine, "LangGraph Engine", "LangGraph, LangChain", "Executa a máquina de estados cíclica, gerencia checkpoints e pontos de parada HITL.")
        Container(pdf_parser, "Scientific PDF Parser", "PyMuPDF (fitz), pdfplumber", "Extrai texto puro segmentado por cabeçalhos (Methods, Results, Limitations).")
        Container(rate_limiter, "Adaptive Rate Limiter & Fallback", "Tenacity, Token Bucket", "Evita HTTP 429 alternando dinamicamente entre Gemini e Groq.")
    }

    ContainerDb(database, "Supabase PostgreSQL", "Postgres 15 + pgvector", "Armazena checkpoints do LangGraph, metadados de artigos, matrizes PRISMA e embeddings de parágrafos.")

    Rel(researcher, glass_hud, "Interage e aprova checkpoints", "HTTPS")
    Rel(researcher, spatial_ui, "Visualiza agentes trabalhando nas salas", "Canvas 2D / 60 FPS")
    Rel(glass_hud, fastapi, "Dispara pipelines e envia decisões de HITL", "JSON / HTTPS")
    Rel(fastapi, glass_hud, "Transmite eventos dos agentes em tempo real", "Server-Sent Events (SSE)")
    Rel(fastapi, langgraph_engine, "Dispara nós de execução e comandos de retomada", "Async Python")
    Rel(langgraph_engine, pdf_parser, "Envia PDFs baixados para extração de seções", "Internal Call")
    Rel(langgraph_engine, rate_limiter, "Solicita inferência com controle de quota", "Internal Call")
    Rel(langgraph_engine, database, "Lê e grava checkpoints do estado", "Asyncpg / SQLAlchemy")
```

---

## 3. Nível 3: Diagrama de Componentes do Motor Multi-Agente (LangGraph)

Detalhamento dos nós especialistas que compõem o fluxo de trabalho cognitivo.

```mermaid
graph TD
    subgraph "LangGraph State Machine Architecture"
        Start([Início: Query do Pesquisador]) --> NodeMiner["1. MinerAgent<br/>(Busca federada OpenAlex, EuropePMC, arXiv)"]
        
        NodeMiner --> NodeCrossref["2. DOIValidator<br/>(Validação criptográfica Crossref)"]
        
        NodeCrossref --> CheckpointScreening{"🛑 HITL Checkpoint 1:<br/>Aprovação da Triagem Inicial"}
        
        CheckpointScreening -->|Pesquisador Rejeita/Ajusta| NodeMiner
        CheckpointScreening -->|Pesquisador Aprova| NodeDownloader["3. PDFDownloader<br/>(Download Open Access assíncrono)"]
        
        NodeDownloader --> NodeParser["4. SectionParserAgent<br/>(Segmentação: Methods, Results, Limitations)"]
        
        NodeParser --> NodeAuditor["5. AuditorAgent<br/>(Análise de Viés RoB 2, P-hacking, Poder N)"]
        
        NodeAuditor --> DecisionBias{"Risco de Viés Alto<br/>ou Inconclusivo?"}
        
        DecisionBias -->|Sim (Score < 0.70)| CheckpointBias{"🛑 HITL Checkpoint 2:<br/>Arbitragem Humana de Viés"}
        DecisionBias -->|Não (Confiável)| NodeSynthesizer["6. SynthesizerAgent<br/>(Matriz PRISMA e Knowledge Gaps)"]
        
        CheckpointBias -->|Pesquisador Valida ou Descarta| NodeSynthesizer
        
        NodeSynthesizer --> NodeExporter["7. ExportAgent<br/>(Gera CSV, BibTeX e PRISMA Flowchart)"]
        
        NodeExporter --> End([Fim: Matriz Pronta no HUD])
    end

    style CheckpointScreening fill:#f59e0b,stroke:#d97706,stroke-width:2px,color:#000
    style CheckpointBias fill:#f43f5e,stroke:#e11d48,stroke-width:2px,color:#fff
    style NodeMiner fill:#0284c7,stroke:#0369a1,stroke-width:2px,color:#fff
    style NodeAuditor fill:#7c3aed,stroke:#6d28d9,stroke-width:2px,color:#fff
    style NodeSynthesizer fill:#059669,stroke:#047857,stroke-width:2px,color:#fff
```

---

## 4. Diagrama de Sequência: Ciclo de Vida do Human-in-the-Loop (HITL)

O diagrama abaixo detalha a coreografia de parada e retomada de execução com persistência de estado.

```mermaid
sequenceDiagram
    autonumber
    actor Pesquisador as 🔬 Pesquisador (Usuário)
    participant HUD as 💻 Frontend (HUD & Spatial Lab)
    participant API as 🚀 FastAPI Gateway (HF Spaces)
    participant LG as 🧠 LangGraph State Machine
    participant DB as 🗄️ Supabase (Checkpoints)
    participant LLM as ⚡ Gemini / Groq LLMs

    Pesquisador->>HUD: Digita Tópico de Pesquisa & Critérios de Inclusão
    HUD->>API: POST /api/v1/reviews (payload da query)
    API->>LG: graph.ainvoke(initial_state)
    Note over LG: MinerAgent executa buscas paralelas<br/>e valida DOIs na Crossref
    LG->>DB: Salva checkpoint pós-mineração (State ID: #chk-101)
    LG-->>API: Yield: interrupt_before=['human_screening_node']
    API-->>HUD: SSE Event: 'HITL_REQUIRED' (tipo: screening, 42 artigos minerados)
    
    HUD->>Pesquisador: Ativa alarme visual no HUD + Destaca Bancada de Mineração
    HUD->>Pesquisador: Apresenta Modal de Triagem (Inclusão / Exclusão manual)
    Pesquisador->>HUD: Exclui papers fora de escopo e clica "Confirmar Artigos e Gerar Matriz"
    
    HUD->>API: POST /api/v1/reviews/{id}/hitl (artigos aprovados e rejeitados)
    API->>LG: Executa human_screening_node e avança para methodologist_node
    
    Note over LG: ParserAgent segmenta Methods/Results<br/>AuditorAgent analisa rigor estatístico
    LG->>LLM: Prompt estruturado de auditoria RoB 2
    LLM-->>LG: Retorna JSON com score de viés e trechos fonte
    
    Note over LG: SynthesizerAgent consolida Matriz PRISMA<br/>e gera hipóteses de Knowledge Gaps
    LG->>DB: Salva estado final consolidado
    LG-->>API: Pipeline concluído com sucesso
    API-->>HUD: SSE Event: 'WORKFLOW_COMPLETED'
    HUD->>Pesquisador: Acende Bancada de Síntese em Emerald-400 + Habilita Exportação CSV/BibTeX
```

---

## 5. Mapeamento dos Estados e Transições do Grafo (State Machine Specification)

| Estado Atual | Gatilho / Evento | Próximo Estado | Comportamento de Persistência |
| :--- | :--- | :--- | :--- |
| `IDLE` | Usuário submete query | `MINING` | Cria nova `thread_id` no Supabase |
| `MINING` | Busca concluída com sucesso | `VALIDATING_DOIS` | Atualiza lista bruta de papers |
| `VALIDATING_DOIS` | Todos os DOIs validados | `AWAITING_SCREENING_APPROVAL` | Grava checkpoint e **pausa** (`interrupt`) |
| `AWAITING_SCREENING_APPROVAL` | Usuário aprova triagem | `PARSING_PDFS` | Retoma execução com a lista de aprovados |
| `AWAITING_SCREENING_APPROVAL` | Usuário cancela | `CANCELLED` | Finaliza thread e libera memória |
| `PARSING_PDFS` | Seções segmentadas | `AUDITING_METHODS` | Armazena seções estruturadas |
| `AUDITING_METHODS` | Risco detectado $\ge$ Limiar | `AWAITING_BIAS_ARBITRATION` | Grava checkpoint e **pausa** (`interrupt`) |
| `AUDITING_METHODS` | Risco normal/baixo | `SYNTHESIZING_PRISMA` | Segue direto sem parada |
| `AWAITING_BIAS_ARBITRATION` | Usuário arbitra viés | `SYNTHESIZING_PRISMA` | Injeta nota humana no relatório de viés |
| `SYNTHESIZING_PRISMA` | Matriz e Gaps gerados | `EXPORT_READY` | Gera links de download para CSV e BibTeX |
| `EXPORT_READY` | Usuário fecha revisão | `COMPLETED` | Arquiva resultado |
