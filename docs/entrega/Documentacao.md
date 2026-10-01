---
title: "PersonalOS - Documentação de Entrega"
author: "João Henrique Benatti Coimbra"
institution: "UniFECAF"
ra: "188635"
course: "Graduação Tecnológica em Inteligência Artificial e Automação Digital"
module: "Produtividade e Gestão do Tempo"
date: "1 de outubro de 2026"
version: "1.5"
repo: "https://github.com/joao-coimbra/personal-os"
branch: "main"
---

<div class="sumario-page" markdown="1">

## Sumário

1. Introdução e missão do trabalho
2. Parte teórica: análise e discussão
   - 2.1 Diagnóstico da rotina atual
   - 2.2 Principais desafios de produtividade
   - 2.3 Métodos utilizados
   - 2.4 Ferramentas escolhidas e justificativa
   - 2.5 Como a IA apoia a organização
   - 2.6 Comunicação, procrastinação e saúde mental
3. Parte prática: o sistema PersonalOS
   - 3.1 Visão geral
   - 3.2 Mapeamento requisito prático e feature
   - 3.3 Fluxo principal de uso
   - 3.4 Arquitetura
   - 3.5 Integrações entregues no MVP
   - 3.6 Operador de IA: tools
   - 3.7 Navegação e shell
4. Limitações e trabalho futuro
5. Checklist da rubrica (autoavaliação)
6. Referências
7. Metadados de regeneração

</div>

<div class="section-break" markdown="1">

## 1. Introdução e missão do trabalho

O enunciado da disciplina aponta um problema comum entre profissionais de tecnologia: o conhecimento técnico existe, porém falta rotina consistente para organizar demandas, priorizar o que importa, comunicar com clareza e preservar equilíbrio entre produtividade e bem-estar.

A missão proposta é montar um Sistema Operacional Pessoal (Personal Operating System, POS). Esse sistema deve reunir métodos de produtividade, planejamento, comunicação e acompanhamento, apoiado por ferramentas digitais (Notion, Trello, Google Agenda e afins) e por Inteligência Artificial para automatizar etapas, organizar informações e sugerir decisões.

O **PersonalOS** é a resposta prática a esse enunciado. É um monorepo web (com shell desktop Tauri opcional) que integra Trello, Google Calendar, Notion e um operador de IA autenticado. Na interface há dashboard com matriz de Eisenhower, tarefas em Kanban/Gantt a partir do Trello ao vivo, time blocking com limites de carga e ferramentas de comunicação profissional.

Este documento cobre a parte teórica (1,5 pts) e registra a parte prática (3,5 pts). Instruções de execução local, variáveis de ambiente e checklist de prints ficam no `README.md` do repositório. O vídeo pitch (até 4 minutos, 2,0 pts) é entregue à parte, em YouTube, Loom ou Google Drive.

</div>

<div class="section-break" markdown="1">

## 2. Parte teórica: análise e discussão

### 2.1 Diagnóstico da rotina atual

A rotina típica considerada neste sistema (profissional de tecnologia em contexto remoto ou híbrido) apresenta o seguinte quadro:

| Dimensão | Situação observada |
|----------|-------------------|
| Tarefas | Cartões espalhados em boards Trello; prioridades implícitas (labels e due) pouco revisadas |
| Agenda | Compromissos no Google Calendar sem blocos explícitos de foco profundo |
| Comunicação | Rascunhos e atualizações de time escritos sob pressão, com risco de ambiguidade |
| Conhecimento | Notas em Notion desconectadas do fluxo diário de execução |
| Carga cognitiva | Troca constante entre ferramentas; falta de uma visão única do dia |

Não faltam aplicativos na rotina descrita. O que falta é orquestração: Eisenhower e o planejamento do dia existem como método, mas não entram de forma contínua na stack já adotada.

### 2.2 Principais desafios de produtividade

Os pontos abaixo alinham-se ao material da disciplina (*Gestão de Tempo: Tarefas, Compromissos e Produtividade*, Paulo Lisboa / Rocketseat) e ao enunciado:

1. **Priorização frágil:** misturar urgente com importante concentra esforço no Quadrante I e abandona o Quadrante II (importante e não urgente).
2. **Compromissos sem proteção de foco:** a agenda enche de reuniões; tarefas profundas competem pelo tempo restante.
3. **Procrastinação por sobrecarga:** lista longa sem corte realista aumenta estresse e adiamento (módulo sobre impactos da procrastinação).
4. **Fragmentação de ferramentas:** Trello, Calendar e Notion sem um painel único elevam o custo de troca de contexto.
5. **Comunicação assíncrona ambígua:** texto sem tom e contexto suficientes (módulo *Comunicação eficaz em times de tecnologia*, Jorge Dalfovo) gera retrabalho.
6. **Bem-estar:** gestão do tempo mal feita correlaciona-se com estresse, burnout e perda de equilíbrio entre vida e trabalho (módulo *Saúde Mental e performance na carreira*).

### 2.3 Métodos utilizados

| Método | Origem no módulo | Uso no PersonalOS |
|--------|------------------|-------------------|
| **Matriz de Eisenhower** | Gestão de Tempo: 4 quadrantes (Fazer, Agendar, Delegar, Eliminar) | Matriz na Home `/`; classificação via tool `tasks_classify`; badges e rating no Kanban |
| **Time blocking** | Bloquear tempo para tarefas importantes (compromissos e foco) | `planning_propose_day` e `planning_create_focus_blocks` no Google Calendar (com confirmação) |
| **Kanban** | Visualização de fluxo (A fazer, Em andamento, Concluído) | Vista Kanban em `/tasks` (`TasksKanbanBoard`) com DnD e rating Eisenhower |
| **GTD (referência)** | Capturar, Clarificar, Organizar, Refletir, Engajar | Captura em Trello; clarificação e priorização via Eisenhower e IA; reflexão no dashboard |
| **Pomodoro** | Ciclos 25+5 (módulo) | Não implementado como timer no MVP; citado na teoria e compatível com `focusMinutes` e `breakMinutes` das preferências |
| **Planejamento sustentável** | Bem-estar e redução de sobrecarga | Planner respeita horário de trabalho, pausas, eventos existentes e limite de tarefas por dia |

### 2.4 Ferramentas escolhidas e justificativa

| Ferramenta | Papel | Justificativa |
|------------|-------|---------------|
| **Trello** | Fonte de tarefas | Já adotado por muitos times; OAuth Power-Up; boards, listas e cards; alinhado ao Trello Guide citado no enunciado |
| **Google Calendar** | Compromissos e blocos de foco | Agenda real do profissional; time blocking vira eventos concretos |
| **Notion** | Conhecimento e notas | Busca, leitura e criação via operador; alinhado a Notion Guides do enunciado |
| **Operador de IA (Vercel AI SDK)** | Classificar, planejar, reescrever, resumir | Cumpre o requisito de IA para automatizar, organizar e planejar, com confirmação em ações de alto impacto |
| **PersonalOS (este app)** | Shell ReUI, dashboard e orquestração | Une as ferramentas acima em um POS único, com autenticação e preferências |

**Gmail** não faz parte do MVP entregue. Há scaffolding de OAuth no backend, mas a UI de Integrações e o onboarding **não** expõem Conectar Gmail. O uso de e-mail como contexto de comunicação fica para trabalho futuro (seção 4).

**Stack técnica (alto nível):** React 19, TanStack Router/Query, Tailwind 4, shadcn/ReUI, Fastify, oRPC, Better Auth, PostgreSQL, Drizzle, Bun, Turborepo, Tauri 2 (workspace local opcional), Vercel AI SDK.

### 2.5 Como a IA apoia a organização

No produto, a IA funciona como apoio à decisão (conceito de copiloto no módulo de comunicação), e não como agente autônomo sem restrições:

- Classificação Eisenhower sugerida (`tasks_classify`): não altera o board em silêncio.
- Proposta de dia (`planning_propose_day`): respeita preferências (timezone, janela de trabalho, foco e pausas).
- Criação de blocos de foco somente após confirmação; a partir de 3 blocos, gera `pending_ai_action` e exige `ai.confirmAction`.
- Comunicação: reescrita profissional, resumo para o time, notas de reunião convertidas em rascunho de tarefas.
- Notion: busca (`knowledge_search`), leitura (`knowledge_read_page`) e criação de página (`knowledge_create_note`).
- Trello: listar, criar card e classificar.
- Calendar: listar eventos e gravar blocos de foco (`planning_create_focus_blocks`).
- Roteamento de modelo: prioriza Gemini (tier gratuito via `GOOGLE_GENERATIVE_AI_API_KEY`) quando a demo/pitch está ativa ou quando chaves OpenAI/Anthropic estão esgotadas; fallback em cadeia e stream de demonstração se todos os modelos falharem por cota.

Limites éticos aplicados: o system prompt exige proposta antes de ações em massa; respostas no idioma do usuário (padrão pt-BR); não afirmar sucesso sem confirmação da tool.

### 2.6 Comunicação, procrastinação e saúde mental

**Comunicação.** O módulo enfatiza clareza, redução de ruído e uso consciente de prompting. PersonalOS oferece as tools `comm_rewrite_message`, `comm_summarize_for_team` e `comm_meeting_notes_to_tasks` para melhorar textos assíncronos e transformar reuniões em ações, sem substituir o julgamento humano.

**Procrastinação.** Estratégias do material (identificar causas, priorizar, fatiar, planejar) aparecem na matriz Eisenhower da Home, no filtro “Hoje/Agendadas”, na proposta de dia com teto de tarefas e rejeição do excedente, e no dashboard com contagem de atrasadas.

**Saúde mental e bem-estar.** Preferências de horário de trabalho e pausas; planner que evita carga irrealista; analytics sem score punitivo de horas. A narrativa do produto (“Foque no que importa”) prioriza equilíbrio e sustentabilidade, em vez de hiperprodutividade.

</div>

<div class="section-break" markdown="1">

## 3. Parte prática: o sistema PersonalOS

### 3.1 Visão geral

PersonalOS é um POS web (com shell Tauri opcional) que:

1. Autentica o usuário (Better Auth: e-mail/senha, Google, GitHub, magic link Resend).
2. Conecta integrações via OAuth em **Conectar** (`/integrations`): Trello, Google Calendar e Notion; além de chaves Claude/ChatGPT (BYOK).
3. Agrega tarefas e eventos na Home `/`, com matriz Eisenhower alimentada pelo Trello.
4. Expõe tarefas em boards Kanban e Gantt em `/tasks` (dados ao vivo do Trello).
5. Mostra agenda em `/calendar`.
6. Oferece operador de IA (Cmd/Ctrl+K, dock/sheet lateral) com shell ReUI.
7. Permite upload de PDF com extração de texto (`unpdf`) em `/files`.
8. Expõe analytics básicos em `/analytics` e preferências em `/settings`.
9. Mantém `/notes` como ponte textual para uso do Notion via operador (UI ainda stub).

### 3.2 Mapeamento requisito prático e feature

Mapeamento verificado em relação ao código atual em `main` (apps `web`/`server`, packages `capabilities`, `api`, `integrations`).

| Requisito do enunciado (prática) | Implementação no PersonalOS (código atual) |
|----------------------------------|--------------------------------------------|
| Organização de tarefas e prioridades | Trello via oRPC `tasks`; matriz Eisenhower na Home `/`; Kanban/Gantt em `/tasks`; filtros `today` e `scheduled` |
| Planejamento semanal ou mensal | `planning_propose_day` e `planning_create_focus_blocks`; visão `/calendar`; KPIs em `/` e `/analytics` |
| Gestão de compromissos | Google Calendar (login Google sincroniza Calendar; Connect explícito também); `calendar_list_events`; escrita via blocos de foco |
| Pelo menos 1 técnica de produtividade | Eisenhower (Home + `tasks_classify`) e time blocking (também Kanban/Gantt em `/tasks`) |
| Pelo menos 1 ferramenta digital | Trello (fluxo principal); Calendar; Notion (tools e Connect) |
| IA para automatizar, organizar ou planejar | `POST /api/ai` e `buildOperatorTools` em `@personal-os/capabilities`; Gemini free-tier para demo |
| Dashboard de acompanhamento | Home `/` (`dashboard.getOverview`: pendentes, atrasadas, prioritárias, eventos, matriz) |
| README | `README.md` do repositório (como executar, stack, previews) e este PDF |

**Rotas autenticadas (`/_app`):** `/`, `/tasks`, `/calendar`, `/notes`, `/files`, `/analytics`, `/integrations`, `/settings`.

### 3.3 Fluxo principal de uso

1. **Login / cadastro** em `/login`.
2. **Onboarding** (`/onboarding`): conectar Trello, Calendar e Notion (ou pular), timezone e horário de trabalho, intro do operador. Após OAuth, o passo de integrações é restaurado.
3. **Home `/`:** saudação, KPIs, matriz Eisenhower (Trello ao vivo), próximos eventos, atalho ao operador.
4. **Tarefas `/tasks`:** boards Kanban e Gantt sincronizados com o Trello; nav com filtros Hoje e Agendadas.
5. **Calendário `/calendar`:** eventos Google.
6. **Operador:** classificar com Eisenhower, propor o dia, criar blocos após confirmação, criar notas Notion e cards Trello.
7. **Arquivos `/files`:** PDF para texto; no desktop Tauri, pasta autorizada.
8. **Integrações `/integrations`:** status Trello/Calendar/Notion; Claude/ChatGPT via API key; seletor Gemini (gratuito) para demo quando a cota OpenAI esgota.
9. **Notes `/notes`:** ponte para uso do Notion via operador (UI stub).
10. **Analytics `/analytics`:** pendentes, atrasadas e prioritárias (sem score de horas).

### 3.4 Arquitetura

Visão de alto nível (sem procedimento de instalação):

```
apps/web (React + TanStack Router) ──oRPC──► apps/server (Fastify)
         │                                      │
         │ Cmd+K / Operator dock                ├── /api/auth (Better Auth)
         │                                      ├── /api/rpc  (oRPC routers)
         └──────── POST /api/ai ───────────────►├── /api/ai   (Vercel AI SDK + tools)
                                                ├── /api/files/extract-pdf
                                                └── OAuth (Trello, Calendar, Notion)

packages/
  api            routers: dashboard, tasks, integrations, preferences, ai, files
  capabilities   Eisenhower, planning, services, operator tools
  integrations   OAuth + adapters Trello/Calendar/Notion + tokens
  auth / db / ui Better Auth, Drizzle schema, shadcn/ReUI
```

**Confirmação de alto impacto:** criação de 3 ou mais blocos de calendário persiste `pending_ai_action`; o cliente confirma via oRPC `ai.confirmAction`.

**Roteamento de modelos:** em modo pitch/demo (`OPERATOR_PITCH_DEMO`) ou com chave Gemini no ambiente, o operador prioriza Gemini free-tier; depois chaves Anthropic/OpenAI conectadas pelo usuário; se todos falharem por cota, há stream de demonstração para a gravação do vídeo.

### 3.5 Integrações entregues no MVP

| Provedor | Estado no MVP | Observação |
|----------|---------------|------------|
| Trello | Entregue (leitura e escrita) | Power-Up; listar, criar card, classificar Eisenhower |
| Google Calendar | Entregue (leitura + blocos de foco) | Login Google sincroniza Calendar; Connect explícito; escrita via `planning_create_focus_blocks` |
| Notion | Entregue (leitura + criar página) | Busca, leitura e `knowledge_create_note`; UI `/notes` ainda é ponte para o operador |
| Anthropic / OpenAI | Entregue (BYOK) | Preferência do usuário; failover para Gemini |
| Gemini | Entregue (env, free-tier) | Preferido na demo/pitch quando OpenAI esgota |
| Gmail | Não entregue no MVP | UI oculta; previsto como melhoria futura |

### 3.6 Operador de IA: tools

Tools exportadas por `buildOperatorTools` em `packages/capabilities/src/tools.ts` (estado em `main`):

| Tool | Função | Leitura / escrita |
|------|--------|-------------------|
| `tasks_list` | Listar cards abertos do Trello | Leitura |
| `tasks_create` | Criar card em uma lista | Escrita |
| `tasks_classify` | Classificar (Eisenhower) | Leitura / sugestão |
| `calendar_list_events` | Listar eventos | Leitura |
| `planning_propose_day` | Propor plano sustentável | Leitura (não grava) |
| `planning_create_focus_blocks` | Criar blocos de foco no Calendar | Escrita (com confirmação) |
| `knowledge_search` / `knowledge_read_page` | Buscar e ler Notion | Leitura |
| `knowledge_create_note` | Criar página Notion (título) | Escrita |
| `comm_rewrite_message` / `comm_summarize_for_team` / `comm_meeting_notes_to_tasks` | Comunicação | Draft (sem envio externo) |

**Planejado (não tratado como entregue neste PDF):** tools de append de blocos no corpo Notion e create/update/delete genéricos de evento no Calendar, além da passagem explícita de `content` em `knowledge_create_note` pelo operador. A camada de integração já tolera `content` opcional; a exposição completa no operador segue em evolução.

### 3.7 Navegação e shell

AppShell ReUI: Home `/` (matriz Eisenhower), Tasks (Kanban/Gantt e filtros), Calendar, Notes, Files, Analytics, Integrations, Settings; menu de avatar; operador redimensionável (dock/sheet); command palette; contagens Eisenhower na sidebar.

</div>

<div class="section-break" markdown="1">

## 4. Limitações e trabalho futuro

Esta seção separa o que já está pronto do que ainda é parcial ou em evolução. Não se listam recursos que o código não implementa como se fossem entregues.

| Item | Status |
|------|--------|
| **Gmail (readonly / triagem)** | Melhoria futura: OAuth existe no backend, mas UI de Integrações e onboarding não expõem Conectar Gmail no MVP |
| Timer Pomodoro dedicado | Não implementado |
| MCP server HTTP externo | Não entregue como produto |
| UI rica de Notion em `/notes` | Stub: orienta uso via operador |
| Corpo rico Notion (append de blocos) | Planejado: criar página com título já existe; append/body no operador em evolução |
| Eventos Calendar genéricos (create/update/delete) | Planejado: blocos de foco já gravam; CRUD genérico em evolução |
| Analytics | KPIs básicos (`pendingCount`, `overdueCount`, `priorityTasks`); sem séries históricas avançadas |
| Filtro “Completas” | `listTasks` retorna apenas cards abertos; filtro `completed` resulta em lista vazia |
| Boards Gantt/Kanban | Presentes em `/tasks` com Trello ao vivo; refinamentos de sync e drag ainda em evolução |
| Operador multi-agente | Em evolução; não tratar como feature estável de entrega |
| Vídeo pitch | Entregável separado (fora deste PDF) |
| Prints no README | Checklist e pasta `docs/previews/` no repositório |

</div>

<div class="section-break" markdown="1">

## 5. Checklist da rubrica (autoavaliação)

### 5.1 Parte teórica (1,5)

- [x] Diagnóstico da rotina atual
- [x] Principais desafios de produtividade
- [x] Métodos (Pomodoro citado; Eisenhower e Kanban aplicados; GTD referenciado)
- [x] Ferramentas escolhidas e justificativa
- [x] Como a IA apoia a organização
- [x] Estratégias de comunicação, procrastinação e saúde mental

### 5.2 Parte prática (3,5)

- [x] Organização de tarefas e prioridades
- [x] Planejamento (dia / blocos; agenda)
- [x] Gestão de compromissos (Google Calendar)
- [x] Técnica de produtividade (Eisenhower e time blocking)
- [x] Ferramenta digital (Trello, Calendar e Notion)
- [x] Uso de IA (operador, tools, Gemini free-tier e confirmação)
- [x] Dashboard (`/`)
- [x] README (`README.md` e este PDF)

### 5.3 Vídeo (2,0), fora deste PDF

- [ ] Gravado e link acessível (YouTube, Loom ou Drive)

### 5.4 Prints sugeridos

Ver `README.md` (seção Previews) e `docs/previews/`.

</div>

<div class="section-break" markdown="1">

## 6. Referências

### 6.1 Materiais da disciplina

ASSOCIAÇÃO BRASILEIRA DE NORMAS TÉCNICAS. **NBR 14724**: informação e documentação: trabalhos acadêmicos: apresentação. Rio de Janeiro: ABNT, 2011. (referência de formatação simplificada deste documento).

Enunciado da disciplina. **Meu Sistema Operacional Pessoal: Utilizando IA para Gerenciar Tempo, Comunicação e Produtividade**. Módulo Produtividade e Gestão do Tempo, UniFECAF, 2026.

LISBOA, Paulo. **Gestão de Tempo: Tarefas, Compromissos e Produtividade**. Rocketseat Boosting People, [s.d.]. Material didático: Eisenhower, GTD, Kanban, Pomodoro, bem-estar, procrastinação, organização e planejamento.

DALFOVO, Jorge. **Comunicação eficaz em times de tecnologia**. Rocketseat Boosting People, [s.d.]. Material didático: comunicação estratégica, assertividade, meios síncrono e assíncrono, IA como copiloto e limites éticos.

ROCKETSEAT. **Saúde Mental e performance na carreira**. Boosting People, [s.d.]. Material didático: autoconhecimento, burnout/ansiedade, propósito e mad skills.

### 6.2 Guias citados no enunciado

TRELLO. **Trello Guide**. Disponível em: https://trello.com/guide. Acesso em: 1 out. 2026.

ASANA. **Asana Academy**. Disponível em: https://academy.asana.com. Acesso em: 1 out. 2026.

NOTION. **Notion Guides**. Disponível em: https://www.notion.so/help. Acesso em: 1 out. 2026.

### 6.3 Referências conceituais

ALLEN, David. **Getting Things Done**: the art of stress-free productivity. New York: Penguin, 2015.

WATZLAWICK, Paul; BEAVIN, Janet Helmick; JACKSON, Don D. **Pragmática da Comunicação Humana**. São Paulo: Cultrix, [s.d.].

EISENHOWER, Dwight D. Matriz de urgência × importância. *In*: LISBOA, Paulo. **Gestão de Tempo**. Rocketseat Boosting People, [s.d.].

CIRILLO, Francesco. Técnica Pomodoro. *In*: LISBOA, Paulo. **Gestão de Tempo**. Rocketseat Boosting People, [s.d.].

### 6.4 Stack e documentação de produto

COIMBRA, João Henrique Benatti. **PersonalOS**. Repositório: https://github.com/joao-coimbra/personal-os. Branch `main`, 2026.

VERCEL. **AI SDK**. Documentação oficial. Disponível em: https://sdk.vercel.ai. Acesso em: 1 out. 2026.

BETTER AUTH. Documentação. Disponível em: https://www.better-auth.com. Acesso em: 1 out. 2026.

</div>

<div class="section-break" markdown="1">

## 7. Metadados de regeneração

| Campo | Valor |
|-------|-------|
| Instituição | UniFECAF |
| Nome | João Henrique Benatti Coimbra |
| RA | 188635 |
| Curso | Graduação Tecnológica em Inteligência Artificial e Automação Digital |
| Módulo | Produtividade e Gestão do Tempo |
| Fonte regenerável | `docs/entrega/Documentacao.md` |
| Script | `scripts/build-entrega-pdf.sh` |
| PDF gerado | `docs/entrega/Documentacao.pdf` |
| Artefato cloud | `/opt/cursor/artifacts/Documentacao.pdf` |
| Data | 1 de outubro de 2026 |
| Branch | `main` |
| Versão do documento | 1.5 |

Para regenerar após mudanças no produto: `bun run docs:entrega-pdf` (ou `bash scripts/build-entrega-pdf.sh`).

Atualizar a seção 3.2 se rotas, tools ou boards evoluirem antes do envio final. Detalhes de execução local permanecem apenas no `README.md`.

</div>
