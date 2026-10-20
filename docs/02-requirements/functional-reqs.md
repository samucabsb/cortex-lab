# 📑 Especificação de Requisitos de Software: SciLab Agents / CortexLab
## Engenharia de Requisitos para Human Augmentation na Pesquisa Científica

> **Documento:** SRS-001 (Software Requirements Specification)  
> **Versão:** 1.0.0-DRAFT  
> **Autor:** Staff Software Architect & AI Product Manager  
> **Status:** Aprovado para Fase 1 (Discovery & Architecture Scaffolding)  
> **Diretrizes Centrais:** Confiabilidade Científica Inegociável, Zero Alucinação de DOIs/Citações, Rastreabilidade Parágrafo a Parágrafo e Governança Humana (Human-in-the-Loop).

---

## 1. Visão Geral e Princípios Fundamentais

O **CortexLab** é projetado para atuar como um amplificador cognitivo do pesquisador (Human Augmentation), e **não** como um gerador autônomo e cego de texto. Para garantir a aceitação por periódicos de alto impacto (Nature, Science, Elsevier, Springer) e comitês de ética, o sistema obedece aos seguintes princípios arquiteturais:

1. **Invariante da Verdade Rastreada (Traceability Invariant):** Nenhuma afirmação ou métrica pode constar na matriz de síntese sem apontar o DOI válido, o número da página e o trecho literal (*verbatim quote*) do artigo original.
2. **Invariante do DOI Criptograficamente Válido:** É terminantemente proibido sintetizar artigos cujos identificadores não tenham sido resolvidos e confirmados via API oficial (OpenAlex, Crossref, Europe PMC ou arXiv).
3. **Soberania do Pesquisador (Human-in-the-Loop Gateways):** Decisões de inclusão/exclusão em massa e validação de risco de viés exigem checkpoints de aprovação humana no grafo de execução.
4. **Viabilidade Econômica 100% Zero-Cost:** Operação integral sobre cotas gratuitas (Free Tiers do Google Gemini, Groq Cloud, Supabase e Hugging Face Spaces) com suporte opcional a BYOK (Bring Your Own Key).

---

## 2. Requisitos Funcionais (RF)

### Módulo 1: Mineração Federada e Ingestão de Literatura Aberta

| ID | Nome do Requisito | Descrição Detalhada | Prioridade (MoSCoW) |
| :--- | :--- | :--- | :--- |
| **RF-01** | **Busca Federada em APIs Abertas** | O sistema deve consultar de forma paralela e assíncrona as bases: OpenAlex, Europe PMC, Semantic Scholar e arXiv API, unificando os resultados via query booleana normalizada. | **Must Have** |
| **RF-02** | **Deduplicação de Literatura por DOI e Hash de Título** | O sistema deve consolidar registros duplicados utilizando correspondência exata de DOI normalizado e similaridade de Jaccard/Levenshtein no título normalizado. | **Must Have** |
| **RF-03** | **Validação Criptográfica de DOI via Crossref/OpenAlex** | Cada artigo recuperado deve ter seu DOI consultado contra a API da Crossref/OpenAlex. Se a API retornar 404, o artigo deve ser marcado como `INVALID_IDENTIFIER` e excluído da triagem. | **Must Have** |
| **RF-04** | **Filtros Paramétricos Avançados** | O usuário deve poder filtrar a busca por: intervalo de anos (ex: 2018-2024), tipo de publicação (ensaio clínico, meta-análise, preprint, revisão), acesso aberto (Open Access status) e fator de impacto/quartil da revista (via OpenAlex). | **Should Have** |
| **RF-05** | **Download Assíncrono de PDFs de Acesso Aberto** | O sistema deve resolver links diretos para PDFs de acesso aberto (Unpaywall / Europe PMC / arXiv) e enfileirar o download com controle de concorrência e respeito ao `robots.txt`. | **Must Have** |

---

### Módulo 2: Parsing Estruturado de PDFs Científicos por Seções

| ID | Nome do Requisito | Descrição Detalhada | Prioridade (MoSCoW) |
| :--- | :--- | :--- | :--- |
| **RF-06** | **Segmentação Heurística de Seções Científicas** | O parser deve identificar e separar o documento em blocos semânticos: *Abstract*, *Introduction*, *Methods / Materials and Methods*, *Results*, *Discussion*, *Limitations* e *References*. | **Must Have** |
| **RF-07** | **Preservação de Offset e Coordenadas de Texto** | Durante o parsing do PDF, o sistema deve registrar para cada parágrafo: número da página (`page_number`), índice do parágrafo (`paragraph_index`) e hash de conteúdo (`content_sha256`). | **Must Have** |
| **RF-08** | **Extração de Tabelas de Metodologia e Amostra** | O sistema deve detectar tabelas metodológicas (ex: "Table 1: Baseline Characteristics") e convertê-las em formato estruturado (Markdown Table ou JSON) preservando os valores numéricos. | **Should Have** |
| **RF-09** | **Tratamento de PDFs Escaneados ou Corrompidos** | Quando um PDF não contiver camada de texto digitalizável, o sistema deve sinalizar status `OCR_REQUIRED` e notificar o usuário, sem travar a fila de processamento. | **Must Have** |

---

### Módulo 3: Auditoria Metodológica e Estatística

| ID | Nome do Requisito | Descrição Detalhada | Prioridade (MoSCoW) |
| :--- | :--- | :--- | :--- |
| **RF-10** | **Detecção de Riscos Metodológicos (Risk of Bias)** | O agente auditor deve avaliar o texto de métodos segundo critérios adaptados de RoB 2 / STROBE: aleatorização, cegamento, perdas de seguimento e viés de relato seletivo. | **Must Have** |
| **RF-11** | **Auditoria de Consistência Estatística e p-hacking** | O agente deve extrair valores de teste estatístico (p-valores, intervalos de confiança de 95%, tamanhos de amostra $N$) e sinalizar anomalias (ex: $p = 0.049$ sem cálculo de poder estatístico a priori). | **Should Have** |
| **RF-12** | **Extração de População, Intervenção, Controle e Desfecho (PICO)** | Para estudos em saúde e biociências, o sistema deve estruturar a tupla PICO com trechos literais comprovando cada campo. | **Must Have** |
| **RF-13** | **Sinalização de Conflito de Interesses e Financiamento** | O agente deve inspecionar a seção de declarações de financiamento e conflitos de interesse, classificando o estudo como `INDEPENDENT`, `INDUSTRY_FUNDED` ou `UNDECLARED`. | **Should Have** |

---

### Módulo 4: Síntese PRISMA e Descoberta de Lacunas (Knowledge Gaps)

| ID | Nome do Requisito | Descrição Detalhada | Prioridade (MoSCoW) |
| :--- | :--- | :--- | :--- |
| **RF-14** | **Construção da Matriz de Síntese Sistemática PRISMA** | O sistema deve gerar uma tabela comparativa com colunas configuráveis (DOI, Autores, Ano, Amostra $N$, Métodos, Desfecho, Risco de Viés, Trecho Original). | **Must Have** |
| **RF-15** | **Geração Automática do Fluxograma PRISMA 2020** | O sistema deve contabilizar e exportar as contagens das etapas do fluxograma PRISMA: Identificação ($N$), Triagem ($N$), Elegibilidade ($N$) e Inclusão ($N$), com justificativas estruturadas de exclusão. | **Must Have** |
| **RF-16** | **Mapeamento de Lacunas de Conhecimento (Knowledge Gaps)** | O agente sintetizador deve cruzar as seções de limitações dos artigos incluídos e gerar um relatório de "Lacunas Críticas Não Respondidas" para orientar novos projetos de pesquisa. | **Should Have** |

---

### Módulo 5: Orquestração Multi-Agente & Human-in-the-Loop (HITL)

| ID | Nome do Requisito | Descrição Detalhada | Prioridade (MoSCoW) |
| :--- | :--- | :--- | :--- |
| **RF-17** | **Máquina de Estados Finita via LangGraph** | Os agentes (Minerador, Auditor, Sintetizador) devem ser orquestrados por um grafo de estados LangGraph que persiste o progresso no PostgreSQL via checkpointing. | **Must Have** |
| **RF-18** | **Ponto de Interrupção Humana: Aprovação de Triagem** | O grafo deve pausar a execução (`interrupt_before=["auditor_node"]`) após a mineração inicial, aguardando que o pesquisador valide os artigos aprovados/rejeitados na interface. | **Must Have** |
| **RF-19** | **Ponto de Interrupção Humana: Arbitragem de Viés Controverso** | Quando o agente auditor atribuir nota de `Alto Risco de Viés` a um artigo com divergência de confiança ($\text{confidence} < 0.70$), o fluxo deve exigir a confirmação do pesquisador. | **Must Have** |
| **RF-20** | **Retomada de Grafo com Injeção de Contexto (Resume with State)** | O pesquisador deve poder ajustar parâmetros ou anotações na interface e emitir o comando de "Aprovar & Retomar", fazendo o LangGraph prosseguir de onde parou. | **Must Have** |

---

### Módulo 6: Interface Espacial HD-2D e Dashboard Científico

| ID | Nome do Requisito | Descrição Detalhada | Prioridade (MoSCoW) |
| :--- | :--- | :--- | :--- |
| **RF-21** | **Visualização Espacial do Laboratório em Pixel Art HD-2D Isométrico** | O frontend deve renderizar um laboratório virtual isométrico em HTML5 Canvas 2D (60 FPS) composto por 5 salas interconectadas (Coordenação PICO, Mineração/Crossref, Supervisão HITL, Auditoria RoB 2 e Biblioteca PRISMA) com 7 cientistas com funções reais no código e animações de handoff físico de documentos pelas portas e corredores. | **Must Have** |
| **RF-22** | **Badges de Status em Tempo Real (`AgentStatusBadge`)** | Cada agente no laboratório virtual deve exibir uma etiqueta luminosa flutuante indicando seu estado operacional (`OCIOSO`, `MINERANDO ARTIGOS`, `AUDITANDO METODOLOGIA`, `AGUARDANDO APROVAÇÃO`). | **Must Have** |
| **RF-23** | **Condutos de Dados Animados (`DataConduitLines`)** | O chão do laboratório deve apresentar linhas condutoras que se iluminam com pulsos de partículas/luz quando um agente conclui uma etapa e transfere o pacote de dados ao próximo. | **Must Have** |
| **RF-24** | **Painel de Controle em Vidro (`ControlBoardHUD`)** | O canto inferior direito da tela deve manter um HUD em glassmorphism exibindo: Agentes Ativos, Artigos Processados, Viés Médio Detectado e Botão de Ação Imediata de HITL. | **Must Have** |
| **RF-25** | **Inspetor de Evidência com Visualização Lado a Lado** | Ao clicar em uma linha da matriz científica, o usuário deve ver o modal do artigo com o PDF ou texto da seção destacando visualmente o parágrafo exato que embasa a extração. | **Must Have** |

---

### Módulo 7: Exportação de Evidências

| ID | Nome do Requisito | Descrição Detalhada | Prioridade (MoSCoW) |
| :--- | :--- | :--- | :--- |
| **RF-26** | **Exportação para CSV / TSV Padronizado** | O usuário deve poder exportar a matriz completa em formato CSV/TSV compatível com Excel, SPSS e R. | **Must Have** |
| **RF-27** | **Exportação de Referências em BibTeX e RIS** | O sistema deve gerar um arquivo `.bib` e `.ris` contendo todas as referências incluídas, com chaves de citação padronizadas (`SobrenomeAno`) para importação no Zotero/Mendeley. | **Must Have** |
| **RF-28** | **Exportação do Pacote de Auditoria em Markdown / PDF** | O sistema deve gerar um relatório acadêmico compilado em Markdown com o resumo executivo, tabela PRISMA e transcrição dos trechos auditados. | **Should Have** |

---

## 3. Requisitos Não-Funcionais (RNF)

| ID | Categoria | Descrição do Requisito | Métrica de Aceitação |
| :--- | :--- | :--- | :--- |
| **RNF-01** | **Confiabilidade Científica** | **Zero Alucinação de DOIs:** 100% dos DOIs exibidos devem ser validados via chamada HTTP com retorno 200/OK na API da Crossref/OpenAlex. | **0% de alucinação de identificadores** |
| **RNF-02** | **Rastreabilidade** | **Precisão de Citação de Origem:** Todo dado sintetizado deve conter `source_quote`, `page_number` e link direto para o PDF ou registro OpenAlex. | **100% dos campos de síntese com parágrafo fonte** |
| **RNF-03** | **Custo Operacional** | **Arquitetura 100% Zero-Cost:** O sistema deve operar integralmente em tiers gratuitos (Gemini Free, Groq Free, Supabase Free, Hugging Face Spaces). Suporte a BYOK para usuários avançados. | **Custo de infraestrutura = R$ 0,00** |
| **RNF-04** | **Resiliência a Quotas** | **Estratégia de Rate Limit & Fallback:** Se a quota do Gemini (15 RPM / 1M TPM) for atingida (HTTP 429), o sistema deve alternar instantaneamente para Groq Cloud (`llama-3.3-70b-versatile`) e enfileirar chamadas com backoff exponencial. | **Zero interrupções de execução por HTTP 429** |
| **RNF-05** | **Desempenho Visual** | **Taxa de Quadros da Interface Espacial:** A renderização do laboratório HD-2D isométrico em HTML5 Canvas 2D deve manter 60 FPS estáveis em navegadores modernos, sem dependências de bibliotecas 3D pesadas (WebGL/Three.js) e sem travamento da thread principal. | **>= 55 FPS em resoluções 1080p** |
| **RNF-06** | **Conformidade Metodológica** | **Aderência ao Padrão PRISMA 2020:** A matriz gerada deve conter todos os itens essenciais da checklist PRISMA para revisões sistemáticas. | **Checklist PRISMA 2020 validado por pesquisadores** |
| **RNF-07** | **Segurança & BYOK** | **Armazenamento Seguro de Chaves:** As chaves de API fornecidas pelo usuário (BYOK) devem ser mantidas exclusivamente no `localStorage` do cliente ou criptografadas em trânsito com AES-256 no backend em memória volátil. | **Nenhuma chave privada gravada em texto plano no banco** |
| **RNF-08** | **Deploy do Backend** | **Compatibilidade com Hugging Face Spaces:** O backend deve ser conteinerizado via Docker, exposto estritamente na porta `7860`, com permissões de usuário não-root (UID 1000). | **Build e execução bem-sucedidos no HF Spaces** |
| **RNF-09** | **Tempo de Resposta do HUD** | **Latência de Telemetria de Agentes:** A comunicação do estado dos agentes para os badges e HUD deve ocorrer via Server-Sent Events (SSE) ou WebSockets com latência inferior a 300ms. | **Latência de atualização <= 300ms** |
| **RNF-10** | **Portabilidade do Frontend** | **Compatibilidade Cross-Browser:** O frontend deve rodar sem erros nos principais navegadores (Chrome >= 115, Firefox >= 115, Safari >= 16, Edge >= 115). | **Zero erros de console em navegadores modernos** |

---

## 4. Matriz de Rastreabilidade: Requisitos vs Agentes LangGraph

| Requisito Funcional | Agente Responsável | Nó do Grafo LangGraph | Tipo de Ação |
| :--- | :--- | :--- | :--- |
| **RF-01, RF-02, RF-03, RF-05** | Agente Minerador (`MinerAgent`) | `node_mine_literature` | Assíncrona / I/O Bound |
| **RF-06, RF-07, RF-08, RF-09** | Agente de Parsing (`ParserAgent`) | `node_parse_sections` | CPU Bound / Heurística |
| **RF-18** | Pesquisador (HITL) | `checkpoint_screening_approval` | Interrupção Humana |
| **RF-10, RF-11, RF-12, RF-13** | Agente Auditor (`AuditorAgent`) | `node_audit_methodology` | LLM Bound (Gemini/Groq) |
| **RF-19, RF-20** | Pesquisador (HITL) | `checkpoint_bias_arbitration` | Interrupção Humana |
| **RF-14, RF-15, RF-16** | Agente Sintetizador (`SynthesizerAgent`) | `node_synthesize_prisma` | LLM Bound + Estruturação |
| **RF-26, RF-27, RF-28** | Motor de Exportação (`ExportService`) | `node_export_artifacts` | Geração de Arquivos |
| **RF-21, RF-22, RF-23, RF-24** | Frontend Espacial | `SpatialHUD / Canvas` | Telemetria em Tempo Real |
