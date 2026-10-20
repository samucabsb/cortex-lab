# 🔬 CortexLab — Levantamento de Requisitos via Desk Research & Benchmarking Científico
## Fundamentação Metodológica Baseada em Literatura (PRISMA 2020, Cochrane RoB 2 & Ferramentas de IA Acadêmica)

> **Documento:** DISC-001 (Desk Research & Competitive Benchmarking)  
> **Método de Descoberta:** Revisão de Literatura Metodológica, Análise Documental de Diretrizes Internacionais e Benchmarking Funcional de Ferramentas do Estado da Arte.  
> **Justificativa Metodológica:** Na engenharia de sistemas voltados à revisão sistemática de literatura, os requisitos de qualidade e conformidade não são subjetivos — eles são estritamente normatizados por consórcios científicos internacionais (**PRISMA Statement**, **Cochrane Collaboration** e **EQUATOR Network**). Por isso, o levantamento de requisitos do CortexLab fundamenta-se diretamente nos padrões ouro publicados e na análise empírica das limitações das ferramentas atuais de IA.

---

## 1. Fundamentação na Literatura Científica (Por que o Problema Existe?)

A condução de uma Revisão Sistemática da Literatura (RSL) é reconhecida como um dos processos mais custosos e propensos a erro humano na ciência moderna:

1. **Custo Temporal e Sobrecarga de Triagem:**
   - Estudos clássicos de metaciência (*Borah et al., BMJ Open, 2017*; *Michelson & Reuter, 2019*) demonstram que uma revisão sistemática completa leva em média **67 semanas (mais de 1 ano)** do registro do protocolo à publicação, exigindo a triagem manual de milhares de *abstracts*.
2. **Alucinação Bibliográfica em LLMs Genéricos:**
   - Avaliações recentes sobre o uso de modelos como GPT-4 e Claude em sínteses médicas (*Walters & Wilder, Scientific Reports, 2023*; *Alkaissi & McFarlane, Cureus, 2023*) revelaram que chatbots conversacionais genéricos inventam entre **18% e 55% das referências e DOIs** quando solicitados a fundamentar afirmações sem ancoragem determinística em APIs oficiais.
3. **Subjetividade e Fadiga na Auditoria de Risco de Viés:**
   - Segundo o manual oficial da **Cochrane Collaboration (RoB 2 — *Sterne et al., BMJ, 2019*)**, avaliar os 5 domínios de viés (randomização, desvios de intervenção, dados ausentes, mensuração de desfecho e relato seletivo / *p-hacking*) exige leitura exaustiva da seção de *Methods* e *Results*, onde a fadiga do revisor humano frequentemente reduz a concordância inter-avaliador ($\kappa$ de Cohen).

---

## 2. Benchmarking Competitivo: Limitações das Ferramentas Atuais

Analisamos as 6 principais ferramentas utilizadas por pesquisadores acadêmicos hoje para identificar as lacunas tecnológicas que o **CortexLab** preenche:

| Ferramenta | Categoria | Pontos Fortes | Limitações Críticas Identificadas (Gaps) | Como o **CortexLab** Resolve |
| :--- | :--- | :--- | :--- | :--- |
| **Rayyan / Covidence** | Triagem Manual Colaborativa | Padrão aceito para votação cega (*blind screening*) de títulos e resumos. | **100% manual na extração:** Não lê métodos, não audita $p$-valores/amostra $N$, não gera matriz PRISMA automaticamente e possui licenças comerciais caras (Covidence). | Agentes extraem PICO, amostra $N$, $p$-valores e preenchem a matriz PRISMA automaticamente após a triagem humana. |
| **Elicit.com** | Extração Tabular por IA | Excelente interface em tabela comparativa de artigos. | **Sistema fechado e pago por créditos:** Não audita formalmente o protocolo **RoB 2**, não possui visualização explícita da máquina de estados dos agentes nem integração nativa com estratos **Qualis CAPES / SciELO**. | Arquitetura **100% Zero-Cost (BYOK)**, auditoria formal RoB 2 e estratificação Qualis/SJR integrada. |
| **Consensus / SciSpace** | Busca Semântica e Q&A | Respostas rápidas baseadas em trechos de artigos (*Semantic Scholar*). | Focados em perguntas rápidas (*"X causa Y?"*), não estruturam revisões sistemáticas completas no padrão **PRISMA 2020** nem possuem portões *Human-in-the-Loop* (HITL). | Fluxo completo de 4 bancadas com checkpoints obrigatórios de aprovação humana (HITL 1 e HITL 2). |
| **ChatGPT / Claude Web** | Chatbots Genéricos | Alta capacidade de síntese textual e tradução. | **Alto risco de alucinação de DOIs**, perda de contexto em múltiplos artigos e ausência de rastreabilidade exata de parágrafo/página. | Validação HTTP obrigatória do DOI na **Crossref/OpenAlex** + citação literal (*verbatim quote*) por artigo. |

---

## 3. Diretrizes Normativas Traduzidas em Requisitos do Sistema

Em vez de depender de opiniões informais, cada bancada de agente do CortexLab foi desenhada para cumprir um padrão metodológico internacional publicado:

### 3.1 Bancada 1: PI Coordinator $\leftarrow$ *Padrão PICO & PRESS Guideline*
- **Base Científica:** *McGowan et al. (2016) — PRESS Peer Review of Electronic Search Strategies*.
- **O que exige:** Toda revisão sistemática deve decompor a pergunta em **População (P), Intervenção (I), Comparador (C) e Desfecho (O)**, gerando strings booleanas (`AND`, `OR`, `NOT`) com descritores controlados (MeSH / DeCS) e critérios explícitos de inclusão e exclusão antes de iniciar a busca.

### 3.2 Bancada 2: Miner Agent $\leftarrow$ *Open Science & Crossref DOI Resolution*
- **Base Científica:** *Priem et al. (2022) — OpenAlex: A fully-open index of scholarly works*; Diretrizes de deduplicação PRISMA.
- **O que exige:** Busca federada em múltiplas bases abertas (**OpenAlex, Europe PMC / PubMed**), remoção determinística de duplicatas por DOI normalizado (`10.xxxx/yyyy`) e título, e verificação de existência do registro via **Crossref API**.

### 3.3 Portões HITL (Human-in-the-Loop) $\leftarrow$ *Soberania Científica do Pesquisador*
- **Base Científica:** Recomendações da *Cochrane* e *ICMJE (International Committee of Medical Journal Editors)* sobre uso ético de IA na ciência: **a IA não pode ser autora nem tomar decisões finais de elegibilidade sem supervisão humana**.
- **O que exige:** Dois pontos de parada programáticos no grafo LangGraph:
  1. **HITL 1 (Triagem de Elegibilidade):** O pesquisador revisa os artigos minerados e decide quais entram na revisão.
  2. **HITL 2 (Arbitragem de Alto Viés):** Quando o agente detecta alto risco metodológico (`HIGH`), o pesquisador ratifica ou ajusta a classificação.

### 3.4 Bancada 3: Methodologist Agent $\leftarrow$ *Cochrane RoB 2 & CONSORT / STROBE*
- **Base Científica:** *Sterne et al. (BMJ, 2019) — RoB 2: a revised tool for assessing risk of bias in randomised trials*; *von Elm et al. (2007) — STROBE Statement*.
- **O que exige:** Extração estruturada do tamanho amostral ($N$), identificação do grupo controle/comparador, verificação de significância estatística ($p$-valores / poder amostral), citação literal do texto (*verbatim quote*) e classificação fundamentada em `LOW`, `SOME_CONCERNS` ou `HIGH`.

### 3.5 Bancada 4: Synthesizer Agent $\leftarrow$ *PRISMA 2020 Statement*
- **Base Científica:** *Page et al. (BMJ, 2021) — The PRISMA 2020 statement: an updated guideline for reporting systematic reviews*.
- **O que exige:** Consolidação da Matriz de Síntese com todas as variáveis PICO + Risco de Viés + Métricas de Impacto (Quartil SJR e Qualis CAPES), contabilização das etapas de filtragem e mapeamento estruturado de **Lacunas de Conhecimento (*Knowledge Gaps*)** com hipóteses testáveis para pesquisas futuras.

---

## 4. Síntese das Dores e Requisitos Validados na Literatura

| ID da Dor | Problema Documentado na Literatura | Requisito Gerado no CortexLab |
| :--- | :--- | :--- |
| **DOR-01** | Pesquisadores gastam meses copiando dados de PDFs/Abstracts para planilhas de Excel. | **RF-12 & RF-14:** Extração automatizada de PICO, $N$ amostral e montagem da Matriz PRISMA exportável em `.csv`. |
| **DOR-02** | Ferramentas de IA inventam referências e DOIs inexistentes, destruindo a credibilidade acadêmica. | **RF-03 & RNF-01:** Busca exclusiva em bases oficiais (OpenAlex/Europe PMC) com validação de DOI na Crossref. |
| **DOR-03** | Dificuldade em identificar rapidamente estudos com amostras minúsculas ou sem grupo controle adequado. | **RF-10 & RF-11:** Agente Metodologista focado em auditar tamanho amostral $N$, controle e risco de viés RoB 2. |
| **DOR-04** | Caixas-pretas de IA onde o pesquisador não entende o que está acontecendo nem tem poder de veto. | **RF-18, RF-19 & RF-21:** Laboratório 3D transparente com visualização em tempo real das bancadas e portões HITL soberanos. |
| **DOR-05** | Alto custo de assinaturas em dólar (Covidence, Elicit Pro, Rayyan pago) para estudantes e laboratórios brasileiros. | **RNF-03 & RNF-04:** Operação 100% gratuita com chave própria (BYOK) nas cotas gratuitas do Google Gemini e Groq. |
