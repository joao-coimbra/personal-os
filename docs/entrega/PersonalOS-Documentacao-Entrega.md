---
title: "PersonalOS — Documentação de Entrega"
subtitle: "Meu Sistema Operacional Pessoal: Utilizando IA para Gerenciar Tempo, Comunicação e Produtividade"
author: "João Henrique Benatti Coimbra"
ra: "188635"
course: "Graduação Tecnológica em Inteligência Artificial e Automação Digital"
module: "Produtividade e Gestão do Tempo"
date: "30 de setembro de 2026"
version: "1.1"
repo: "https://github.com/joao-coimbra/personal-os"
branch: "cursor/personalos-mvp-44d9"
pr: "https://github.com/joao-coimbra/personal-os/pull/2"
---

# PersonalOS — Documentação de Entrega

**Nome:** João Henrique Benatti Coimbra  
**RA:** 188635  
**Curso:** Graduação Tecnológica em Inteligência Artificial e Automação Digital  
**Módulo:** Produtividade e Gestão do Tempo  
**Data:** 30 de setembro de 2026  
**Repositório:** [joao-coimbra/personal-os](https://github.com/joao-coimbra/personal-os) · branch `cursor/personalos-mvp-44d9` · [PR #2](https://github.com/joao-coimbra/personal-os/pull/2)  
**README acadêmico complementar:** `README-ACADEMICO.md`

---

## Sumário

1. [Introdução e missão do trabalho](#1-introdução-e-missão-do-trabalho)
2. [Parte teórica — Análise e discussão](#2-parte-teórica--análise-e-discussão)
   - 2.1 Diagnóstico da rotina atual
   - 2.2 Principais desafios de produtividade
   - 2.3 Métodos utilizados
   - 2.4 Ferramentas escolhidas e justificativa
   - 2.5 Como a IA apoia a organização
   - 2.6 Comunicação, procrastinação e saúde mental
3. [Parte prática — O sistema PersonalOS](#3-parte-prática--o-sistema-personalos)
   - 3.1 Visão geral
   - 3.2 Mapeamento requisito prático → feature
   - 3.3 Fluxo de uso (golden path)
   - 3.4 Arquitetura
   - 3.5 Como executar localmente
   - 3.6 Integrações
   - 3.7 Operador de IA — tools
   - 3.8 Navegação e shell
4. [Limitações e trabalho futuro](#4-limitações-e-trabalho-futuro)
5. [Checklist da rubrica (autoavaliação)](#5-checklist-da-rubrica-autoavaliação)
6. [Referências](#6-referências)
7. [Metadados de regeneração](#7-metadados-de-regeneração)

---

## 1. Introdução e missão do trabalho

O enunciado da disciplina define o desafio central dos profissionais de tecnologia: não a falta de conhecimento técnico, mas a dificuldade em **organizar demandas**, **priorizar atividades**, **comunicar-se com eficiência** e manter **equilíbrio entre produtividade e bem-estar**.

A missão pedida é construir um **Sistema Operacional Pessoal (Personal Operating System — POS)** que integre métodos de produtividade, planejamento, comunicação e acompanhamento, usando ferramentas digitais (Notion, Trello, Google Agenda etc.) e **Inteligência Artificial** para automatizar, organizar e apoiar decisões.

**PersonalOS** é a resposta prática a esse enunciado: um monorepo web/desktop que conecta Trello, Google Calendar, Notion e um operador de IA autenticado, com dashboard, matriz de Eisenhower, time blocking sustentável e tools de comunicação profissional.

Este documento cobre a **parte teórica** (1,5 pts) e documenta a **parte prática** (3,5 pts). O **vídeo pitch** (≤ 4 min, 2,0 pts) é entregável separado (YouTube / Loom / Drive).

---

## 2. Parte teórica — Análise e discussão

### 2.1 Diagnóstico da rotina atual

A rotina típica alvo deste sistema (profissional de tecnologia em contexto remoto/híbrido) apresenta:

| Dimensão | Situação observada |
|----------|-------------------|
| Tarefas | Cartões espalhados em boards Trello; prioridades implícitas (labels/due) pouco revisadas |
| Agenda | Compromissos no Google Calendar sem blocos explícitos de foco profundo |
| Comunicação | Rascunhos e atualizações de time escritos sob pressão, com risco de ambiguidade |
| Conhecimento | Notas em Notion desconectadas do fluxo diário de execução |
| Carga cognitiva | Troca constante entre ferramentas; falta de “fonte única” para o dia |

O diagnóstico não é “falta de apps”, e sim **falta de orquestração**: métodos (Eisenhower, planejamento do dia) existem na teoria, mas não estão aplicados de forma contínua na stack já usada.

### 2.2 Principais desafios de produtividade

Alinhados ao material da disciplina (*Gestão de Tempo — Tarefas, Compromissos e Produtividade*, Paulo Lisboa / Rocketseat) e ao enunciado:

1. **Priorização frágil** — misturar urgente com importante gera foco no Quadrante I e abandono do Quadrante II (importante e não urgente).
2. **Compromissos sem proteção de foco** — a agenda enche de reuniões; tarefas profundas competem por “sobras” de tempo.
3. **Procrastinação por sobrecarga** — lista longa sem corte realista aumenta estresse e adiamento (módulo sobre impactos da procrastinação).
4. **Fragmentação de ferramentas** — Trello + Calendar + Notion sem um painel único elevam custo de troca de contexto.
5. **Comunicação assíncrona ambígua** — texto sem tom/contexto (módulo *Comunicação eficaz em times de tecnologia*, Jorge Dalfovo) gera retrabalho.
6. **Bem-estar** — gestão do tempo mal feita correlaciona-se com estresse, burnout e perda de equilíbrio vida–trabalho (módulo *Saúde Mental e performance na carreira*).

### 2.3 Métodos utilizados

| Método | Origem no módulo | Uso no PersonalOS |
|--------|------------------|-------------------|
| **Matriz de Eisenhower** | Gestão de Tempo — 4 quadrantes (Fazer / Agendar / Delegar / Eliminar) | Classificação de cards Trello na UI (`/tasks`) e tool `tasks_classify` do operador |
| **Time blocking** | Bloquear tempo para tarefas importantes (compromissos + foco) | `planning_propose_day` + `planning_create_focus_blocks` no Google Calendar (com confirmação) |
| **Kanban** | Visualização de fluxo A fazer → Em andamento → Concluído | Vista Kanban em `/tasks` (`TasksKanbanBoard`, ReUI kanban) com DnD e rating Eisenhower |
| **GTD (referência)** | Capturar → Clarificar → Organizar → Refletir → Engajar | Captura em Trello; clarificação/priorização via Eisenhower + IA; reflexão no dashboard |
| **Pomodoro** | Ciclos 25+5 (módulo) | **Não implementado como timer** no MVP; citado na teoria e compatível com `focusMinutes` / `breakMinutes` das preferências de planejamento |
| **Planejamento sustentável** | Bem-estar + redução de sobrecarga | Planner respeita horário de trabalho, pausas, eventos existentes e limite de tarefas/dia |

### 2.4 Ferramentas escolhidas e justificativa

| Ferramenta | Papel | Justificativa |
|------------|-------|---------------|
| **Trello** | Fonte de tarefas | Já adotado por muitos times; OAuth Power-Up; boards/listas/cards; alinhado ao Trello Guide citado no enunciado |
| **Google Calendar** | Compromissos e blocos de foco | Agenda real do profissional; time blocking vira eventos concretos |
| **Notion** | Conhecimento / notas | Busca e criação via operador (P2); alinhado a Notion Guides do enunciado |
| **Gmail (readonly)** | Contexto de comunicação (conexão OAuth) | Separado do Calendar; escopo mínimo `gmail.readonly` |
| **Operador de IA (Vercel AI SDK)** | Classificar, planejar, reescrever, resumir | Cumpre o requisito de IA para automatizar/organizar/planejar, com confirmação em ações de alto impacto |
| **PersonalOS (este app)** | Shell + dashboard + orquestração | Une as ferramentas acima num POS único, com auth e preferências |

**Stack técnica (implementação):** React 19, TanStack Router/Query, Tailwind 4, shadcn/ReUI (preset Luma), Fastify, oRPC, Better Auth, PostgreSQL, Drizzle, Bun, Turborepo, Tauri 2 (workspace local), Vercel AI SDK (`ai`, `@ai-sdk/react`, Google/OpenAI/Anthropic).

### 2.5 Como a IA apoia a organização

No produto, a IA atua como **copiloto cognitivo** (conceito do módulo de comunicação), não como agente autônomo irrestrito:

- **Classificação Eisenhower** sugerida (`tasks_classify`) — não altera o board em silêncio.
- **Proposta de dia** (`planning_propose_day`) — respeita preferências (timezone, janela 09–18, foco/pausas).
- **Criação de blocos de foco** só após confirmação; ≥ 3 blocos gera `pending_ai_action` + `ai.confirmAction`.
- **Comunicação:** reescrita profissional, resumo para o time, notas de reunião → rascunho de tarefas.
- **Notion:** busca/leitura/criação de notas via tools.
- **Failover de modelo:** chaves Anthropic/OpenAI conectadas pelo usuário → preferência → fallback Gemini (env), com tentativas em cadeia se a chave esgota ou falha.

Limites éticos aplicados: o system prompt exige proposta antes de ações em massa; respostas no idioma do usuário (padrão pt-BR); não afirmar sucesso sem confirmação da tool.

### 2.6 Comunicação, procrastinação e saúde mental

**Comunicação.** O módulo enfatiza clareza, redução de ruído e IA como copiloto com prompting consciente. PersonalOS oferece tools `comm_rewrite_message`, `comm_summarize_for_team` e `comm_meeting_notes_to_tasks` para melhorar textos assíncronos e transformar reuniões em ações — sem substituir julgamento humano.

**Procrastinação.** Estratégias do material (identificar causas, priorizar, fatiar, planejar) mapeiam-se para: matriz Eisenhower visível, filtro “Hoje/Agendadas”, proposta de dia com teto de tarefas e rejeição explícita do excedente, e dashboard com contagem de atrasadas.

**Saúde mental / bem-estar.** Preferências de horário de trabalho e pausas; planner que evita encaixar carga irrealista; analytics sem “score” punitivo de horas; narrativa do produto (“Foque no que importa”) alinhada a equilíbrio e sustentabilidade — não a hiperprodutividade.

---

## 3. Parte prática — O sistema PersonalOS

### 3.1 Visão geral

PersonalOS é um **POS web** (com shell Tauri opcional) que:

1. Autentica o usuário (Better Auth: e-mail/senha, Google, GitHub, magic link Resend).
2. Conecta integrações via OAuth (**Conectar** / `/integrations`).
3. Agrega tarefas e eventos no **dashboard** em `/`.
4. Expõe tarefas com Eisenhower, filtros e boards Kanban/Gantt em `/tasks`.
5. Mostra agenda em `/calendar`.
6. Oferece **operador de IA** (Cmd/Ctrl+K, dock/sheet lateral; rota auxiliar `/ai`).
7. Permite upload de PDF acadêmico com extração de texto (`unpdf`) em `/files`.
8. Expõe analytics básicos em `/analytics` e preferências em `/settings`.

### 3.2 Mapeamento requisito prático → feature

Mapeamento verificado em relação ao HEAD da branch `cursor/personalos-mvp-44d9` (código em `apps/web`, `packages/capabilities`, `packages/api`).

| Requisito do enunciado (prática) | Implementação no PersonalOS (código atual) |
|----------------------------------|--------------------------------------------|
| Organização de tarefas e prioridades | Trello via oRPC `tasks`; grade Eisenhower em `/tasks`; sidebar com seção Eisenhower; filtros `today` / `scheduled` / `completed` |
| Planejamento semanal ou mensal | `planning_propose_day` + `planning_create_focus_blocks`; visão `/calendar`; KPIs em `/` e `/analytics` |
| Gestão de compromissos | Google Calendar (login Google sincroniza Calendar; Connect explícito também); `calendar_list_events` |
| ≥ 1 técnica de produtividade | Eisenhower (`tasks_classify` + UI) + time blocking (+ Kanban/Gantt em `/tasks`) |
| ≥ 1 ferramenta digital | Trello (golden path); Calendar; Notion (tools + Connect); Gmail readonly |
| IA para automatizar/organizar/planejar | `POST /api/ai` + `buildOperatorTools` em `@personal-os/capabilities` |
| Dashboard de acompanhamento | Home `/` (`dashboard.getOverview`: pendentes, atrasadas, prioritárias, eventos) |
| README | `README.md` + `README-ACADEMICO.md` + este documento |

**Rotas autenticadas (`/_app`):** `/`, `/tasks`, `/calendar`, `/notes`, `/files`, `/analytics`, `/integrations`, `/settings`.

### 3.3 Fluxo de uso (golden path)

1. **Login / cadastro** em `/login` (UI ReUI auth-16).
2. **Onboarding** (`/onboarding`): conectar Trello e Calendar (ou pular), timezone e horário de trabalho, intro do operador. Após OAuth, o passo de integrações é **restaurado** (`?step=integrations`).
3. **Home `/`**: saudação, KPIs, painel Eisenhower, atalho ao operador.
4. **Tarefas `/tasks`**: grade por quadrante (`do` / `schedule` / `delegate` / `eliminate`); boards Kanban (`TasksKanbanBoard`) e Gantt (`TasksGanttBoard`); nav com filtros Hoje / Agendadas / Completas.
5. **Calendário `/calendar`**: eventos Google.
6. **Operador**: “Classifique com Eisenhower”, “Proponha meu dia 09–18”, “Crie blocos após eu confirmar”.
7. **Arquivos `/files`**: PDF → texto; no desktop Tauri, pasta autorizada.
8. **Integrações `/integrations`**: status conectado/desconectado; Claude/ChatGPT via API key; limpar preferência de modelo para roteamento Gemini.
9. **Notes `/notes`**: ponte para uso do Notion via operador (UI stub).
10. **Analytics `/analytics`**: pendentes, atrasadas e prioritárias (sem score de horas).

### 3.4 Arquitetura

```
apps/web (React + TanStack Router) ──oRPC──► apps/server (Fastify)
         │                                      │
         │ Cmd+K / Operator dock                ├── /api/auth (Better Auth)
         │                                      ├── /api/rpc  (oRPC routers)
         └──────── POST /api/ai ───────────────►├── /api/ai   (Vercel AI SDK + tools)
                                                ├── /api/files/extract-pdf
                                                └── OAuth callbacks (Gmail, Notion, …)

packages/
  api            routers: dashboard, tasks, integrations, preferences, ai, files
  capabilities   Eisenhower, planning, services, operator tools
  integrations   OAuth + Trello/Calendar/Notion/Gmail adapters + tokens
  auth / db / ui Better Auth, Drizzle schema, shadcn/ReUI
```

**Confirmação de alto impacto:** criação de ≥ 3 blocos de calendário persiste `pending_ai_action`; o cliente confirma via oRPC `ai.confirmAction`.

**Roteamento de modelos:** preferência do usuário (Anthropic/OpenAI conectados) → demais chaves → Gemini (`gemini-3-flash-preview`, fallback `gemini-3.8-flash`).

### 3.5 Como executar localmente

Pré-requisitos: Bun 1.3+, Docker (Postgres), variáveis em `.env.example` copiadas para `apps/server/.env` e `apps/web/.env`.

```bash
bun install
bun run db:start    # Postgres via Docker
bun run db:push
bun run dev
```

- Web: http://localhost:3001  
- API: http://localhost:3000  

Redirects OAuth relevantes (resumo):

| Fluxo | Callback |
|-------|----------|
| Google login + Calendar Connect | `{SERVER}/api/auth/callback/google` |
| Gmail Connect | `{SERVER}/api/integrations/oauth/gmail/callback` |
| Notion | `{SERVER}/api/integrations/oauth/notion/callback` |
| Trello | `{WEB}/oauth/trello` |

Detalhes e checklist de prints: `README-ACADEMICO.md`.

### 3.6 Integrações

| Provedor | Estado no MVP | Observação |
|----------|---------------|------------|
| Trello | Implementado | Power-Up hex key; rejeição de client IDs Atlassian inválidos |
| Google Calendar | Implementado | Mesmo `redirect_uri` Better Auth no Connect |
| Gmail | Implementado (readonly) | Conexão explícita separada |
| Notion | Implementado (tools + Connect) | UI `/notes` ainda é ponte para o operador |
| Anthropic / OpenAI | Implementado (BYOK) | Preferência + failover para Gemini |
| Gemini | Implementado (env) | Fallback padrão do operador |

### 3.7 Operador de IA — tools

Tools exportadas por `buildOperatorTools` em `packages/capabilities/src/tools.ts`:

| Tool | Função |
|------|--------|
| `tasks_list` / `tasks_create` / `tasks_classify` | Listar, criar e classificar (Eisenhower) |
| `calendar_list_events` | Listar eventos |
| `planning_propose_day` | Propor plano sustentável |
| `planning_create_focus_blocks` | Criar blocos (com política de confirmação) |
| `knowledge_search` / `knowledge_read_page` / `knowledge_create_note` | Notion |
| `comm_rewrite_message` / `comm_summarize_for_team` / `comm_meeting_notes_to_tasks` | Comunicação |

### 3.8 Navegação e shell

AppShell (ReUI app-shell-18): Home `/`, Tasks (submenu com filtros), Calendar, Notes, Files, Analytics, Integrations, Settings; menu de avatar; operador redimensionável; command palette; seção Eisenhower na sidebar.

---

## 4. Limitações e trabalho futuro

**Não inventar features:** o que segue distingue o que **já existe** do que é **parcial / WIP**.

| Item | Status honesto |
|------|----------------|
| Timer Pomodoro dedicado | Não implementado |
| MCP server HTTP externo (P2 do plano) | Não entregue como produto |
| UI rica de Notion em `/notes` | Stub: orienta uso via operador |
| Analytics | KPIs básicos (`pendingCount`, `overdueCount`, `priorityTasks`); sem séries históricas avançadas |
| Filtro “Completas” | `listTasks` retorna apenas cards abertos; filtro `completed` resulta em lista vazia |
| Boards Gantt/Kanban | Presentes em `/tasks` (`TasksKanbanBoard`, `TasksGanttBoard`); refinamentos de sync/drag ainda em evolução |
| Operador multi-agente / AI chat agents | Em evolução — não tratar como feature estável de entrega |
| Vídeo pitch | Entregável separado (fora deste PDF) |
| Prints oficiais no README | Checklist em `README-ACADEMICO.md` — anexar evidências antes do envio final |

---

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
- [x] Técnica de produtividade (Eisenhower + time blocking)  
- [x] Ferramenta digital (Trello + Calendar + Notion)  
- [x] Uso de IA (operador + tools + confirmação)  
- [x] Dashboard (`/`)  
- [x] README (`README.md`, `README-ACADEMICO.md`, este PDF)  

### 5.3 Vídeo (2,0) — fora deste PDF

- [ ] Gravado e link acessível (YouTube / Loom / Drive)  

### 5.4 Prints sugeridos

Ver seção 6 de `README-ACADEMICO.md` (login, onboarding, dashboard, Eisenhower, operador, integrações, PDF, Tauri opcional).

---

## 6. Referências

### 6.1 Materiais da disciplina

ASSOCIAÇÃO BRASILEIRA DE NORMAS TÉCNICAS. **NBR 14724**: informação e documentação — trabalhos acadêmicos — apresentação. Rio de Janeiro: ABNT, 2011. (referência de formatação simplificada deste documento).

Enunciado da disciplina. **Meu Sistema Operacional Pessoal: Utilizando IA para Gerenciar Tempo, Comunicação e Produtividade**. Módulo Produtividade e Gestão do Tempo, 2026.

LISBOA, Paulo. **Gestão de Tempo: Tarefas, Compromissos e Produtividade**. Rocketseat Boosting People, [s.d.]. Material didático: Eisenhower, GTD, Kanban, Pomodoro, bem-estar, procrastinação, organização e planejamento.

DALFOVO, Jorge. **Comunicação eficaz em times de tecnologia**. Rocketseat Boosting People, [s.d.]. Material didático: comunicação estratégica, assertividade, meios síncrono/assíncrono, IA como copiloto e limites éticos.

ROCKETSEAT. **Saúde Mental e performance na carreira**. Boosting People, [s.d.]. Material didático: autoconhecimento, burnout/ansiedade, propósito e mad skills.

### 6.2 Guias citados no enunciado

TRELLO. **Trello Guide**. Disponível em: https://trello.com/guide. Acesso em: 30 set. 2026.

ASANA. **Asana Academy**. Disponível em: https://academy.asana.com. Acesso em: 30 set. 2026.

NOTION. **Notion Guides**. Disponível em: https://www.notion.so/help. Acesso em: 30 set. 2026.

### 6.3 Referências conceituais

ALLEN, David. **Getting Things Done**: the art of stress-free productivity. New York: Penguin, 2015.

WATZLAWICK, Paul; BEAVIN, Janet Helmick; JACKSON, Don D. **Pragmática da Comunicação Humana**. São Paulo: Cultrix, [s.d.].

EISENHOWER, Dwight D. Matriz de urgência × importância. *In*: LISBOA, Paulo. **Gestão de Tempo**. Rocketseat Boosting People, [s.d.].

CIRILLO, Francesco. Técnica Pomodoro. *In*: LISBOA, Paulo. **Gestão de Tempo**. Rocketseat Boosting People, [s.d.].

### 6.4 Stack e documentação de produto

COIMBRA, João Henrique Benatti. **PersonalOS**. Repositório: https://github.com/joao-coimbra/personal-os. Branch `cursor/personalos-mvp-44d9`, 2026.

VERCEL. **AI SDK**. Documentação oficial. Disponível em: https://sdk.vercel.ai. Acesso em: 30 set. 2026.

BETTER AUTH. Documentação. Disponível em: https://www.better-auth.com. Acesso em: 30 set. 2026.

---

## 7. Metadados de regeneração

| Campo | Valor |
|-------|-------|
| Nome | João Henrique Benatti Coimbra |
| RA | 188635 |
| Curso | Graduação Tecnológica em Inteligência Artificial e Automação Digital |
| Módulo | Produtividade e Gestão do Tempo |
| Fonte regenerável | `docs/entrega/PersonalOS-Documentacao-Entrega.md` |
| Script | `scripts/build-entrega-pdf.sh` |
| PDF gerado | `docs/entrega/PersonalOS-Documentacao-Entrega.pdf` |
| Artefato cloud | `/opt/cursor/artifacts/PersonalOS-Documentacao-Entrega.pdf` |
| Data | 30 de setembro de 2026 |
| Prazo de referência | 30/09/2026, 23:00 (America/Sao_Paulo) |
| Branch | `cursor/personalos-mvp-44d9` |
| Versão do documento | 1.1 |

Para regenerar após mudanças no produto:

```bash
bash scripts/build-entrega-pdf.sh
```

Atualizar a seção 3.2 se rotas, tools ou boards evoluirem antes do envio final.
