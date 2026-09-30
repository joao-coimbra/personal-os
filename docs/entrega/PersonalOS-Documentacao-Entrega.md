---
title: "PersonalOS - Documentação de Entrega"
author: "João Henrique Benatti Coimbra"
institution: "UniFECAF"
ra: "188635"
course: "Graduação Tecnológica em Inteligência Artificial e Automação Digital"
module: "Produtividade e Gestão do Tempo"
date: "30 de setembro de 2026"
version: "1.2"
repo: "https://github.com/joao-coimbra/personal-os"
branch: "cursor/personalos-mvp-44d9"
pr: "https://github.com/joao-coimbra/personal-os/pull/2"
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
   - 3.3 Fluxo de uso (golden path)
   - 3.4 Arquitetura
   - 3.5 Como executar localmente
   - 3.6 Integrações
   - 3.7 Operador de IA: tools
   - 3.8 Navegação e shell
4. Limitações e trabalho futuro
5. Checklist da rubrica (autoavaliação)
6. Referências
7. Metadados de regeneração

</div>

<div class="section-break" markdown="1">

## 1. Introdução e missão do trabalho

O enunciado da disciplina destaca um desafio recorrente entre profissionais de tecnologia: não a falta de conhecimento técnico, mas a dificuldade em organizar demandas, priorizar atividades, comunicar-se com eficiência e manter equilíbrio entre produtividade e bem-estar.

A missão é construir um Sistema Operacional Pessoal (Personal Operating System, POS) que integre métodos de produtividade, planejamento, comunicação e acompanhamento. O trabalho deve usar ferramentas digitais (Notion, Trello, Google Agenda e similares) e Inteligência Artificial para automatizar, organizar e apoiar decisões.

**PersonalOS** responde a esse enunciado na prática. Trata-se de um monorepo web e desktop que conecta Trello, Google Calendar, Notion e um operador de IA autenticado. O sistema oferece dashboard, matriz de Eisenhower, time blocking com limites de carga e tools de comunicação profissional.

Este documento cobre a parte teórica (1,5 pts) e documenta a parte prática (3,5 pts). O vídeo pitch (até 4 minutos, 2,0 pts) é entregável separado (YouTube, Loom ou Google Drive).

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

O diagnóstico não aponta falta de aplicativos. O problema central é a falta de orquestração: métodos como Eisenhower e planejamento do dia existem na teoria, mas não estão aplicados de forma contínua na stack já usada.

### 2.2 Principais desafios de produtividade

Os pontos abaixo alinhados ao material da disciplina (*Gestão de Tempo: Tarefas, Compromissos e Produtividade*, Paulo Lisboa / Rocketseat) e ao enunciado:

1. **Priorização frágil:** misturar urgente com importante concentra esforço no Quadrante I e abandona o Quadrante II (importante e não urgente).
2. **Compromissos sem proteção de foco:** a agenda enche de reuniões; tarefas profundas competem pelo tempo restante.
3. **Procrastinação por sobrecarga:** lista longa sem corte realista aumenta estresse e adiamento (módulo sobre impactos da procrastinação).
4. **Fragmentação de ferramentas:** Trello, Calendar e Notion sem um painel único elevam o custo de troca de contexto.
5. **Comunicação assíncrona ambígua:** texto sem tom e contexto suficientes (módulo *Comunicação eficaz em times de tecnologia*, Jorge Dalfovo) gera retrabalho.
6. **Bem-estar:** gestão do tempo mal feita correlaciona-se com estresse, burnout e perda de equilíbrio entre vida e trabalho (módulo *Saúde Mental e performance na carreira*).

### 2.3 Métodos utilizados

| Método | Origem no módulo | Uso no PersonalOS |
|--------|------------------|-------------------|
| **Matriz de Eisenhower** | Gestão de Tempo: 4 quadrantes (Fazer, Agendar, Delegar, Eliminar) | Classificação de cards Trello na UI (`/tasks`) e tool `tasks_classify` do operador |
| **Time blocking** | Bloquear tempo para tarefas importantes (compromissos e foco) | `planning_propose_day` e `planning_create_focus_blocks` no Google Calendar (com confirmação) |
| **Kanban** | Visualização de fluxo (A fazer, Em andamento, Concluído) | Vista Kanban em `/tasks` (`TasksKanbanBoard`, ReUI kanban) com DnD e rating Eisenhower |
| **GTD (referência)** | Capturar, Clarificar, Organizar, Refletir, Engajar | Captura em Trello; clarificação e priorização via Eisenhower e IA; reflexão no dashboard |
| **Pomodoro** | Ciclos 25+5 (módulo) | Não implementado como timer no MVP; citado na teoria e compatível com `focusMinutes` e `breakMinutes` das preferências |
| **Planejamento sustentável** | Bem-estar e redução de sobrecarga | Planner respeita horário de trabalho, pausas, eventos existentes e limite de tarefas por dia |

### 2.4 Ferramentas escolhidas e justificativa

| Ferramenta | Papel | Justificativa |
|------------|-------|---------------|
| **Trello** | Fonte de tarefas | Já adotado por muitos times; OAuth Power-Up; boards, listas e cards; alinhado ao Trello Guide citado no enunciado |
| **Google Calendar** | Compromissos e blocos de foco | Agenda real do profissional; time blocking vira eventos concretos |
| **Notion** | Conhecimento e notas | Busca e criação via operador (P2); alinhado a Notion Guides do enunciado |
| **Gmail (readonly)** | Contexto de comunicação (OAuth) | Separado do Calendar; escopo mínimo `gmail.readonly` |
| **Operador de IA (Vercel AI SDK)** | Classificar, planejar, reescrever, resumir | Cumpre o requisito de IA para automatizar, organizar e planejar, com confirmação em ações de alto impacto |
| **PersonalOS (este app)** | Shell, dashboard e orquestração | Une as ferramentas acima em um POS único, com autenticação e preferências |

**Stack técnica:** React 19, TanStack Router/Query, Tailwind 4, shadcn/ReUI (preset Luma), Fastify, oRPC, Better Auth, PostgreSQL, Drizzle, Bun, Turborepo, Tauri 2 (workspace local), Vercel AI SDK (`ai`, `@ai-sdk/react`, Google/OpenAI/Anthropic).

### 2.5 Como a IA apoia a organização

No produto, a IA atua como copiloto cognitivo (conceito do módulo de comunicação), e não como agente autônomo sem restrições:

- Classificação Eisenhower sugerida (`tasks_classify`): não altera o board em silêncio.
- Proposta de dia (`planning_propose_day`): respeita preferências (timezone, janela 09–18, foco e pausas).
- Criação de blocos de foco somente após confirmação; a partir de 3 blocos, gera `pending_ai_action` e exige `ai.confirmAction`.
- Comunicação: reescrita profissional, resumo para o time, notas de reunião convertidas em rascunho de tarefas.
- Notion: busca, leitura e criação de notas via tools.
- Failover de modelo: chaves Anthropic/OpenAI conectadas pelo usuário, depois preferência, depois fallback Gemini (env), com tentativas em cadeia se a chave esgota ou falha.

Limites éticos aplicados: o system prompt exige proposta antes de ações em massa; respostas no idioma do usuário (padrão pt-BR); não afirmar sucesso sem confirmação da tool.

### 2.6 Comunicação, procrastinação e saúde mental

**Comunicação.** O módulo enfatiza clareza, redução de ruído e uso consciente de prompting. PersonalOS oferece as tools `comm_rewrite_message`, `comm_summarize_for_team` e `comm_meeting_notes_to_tasks` para melhorar textos assíncronos e transformar reuniões em ações, sem substituir o julgamento humano.

**Procrastinação.** Estratégias do material (identificar causas, priorizar, fatiar, planejar) aparecem na matriz Eisenhower visível, no filtro “Hoje/Agendadas”, na proposta de dia com teto de tarefas e rejeição do excedente, e no dashboard com contagem de atrasadas.

**Saúde mental e bem-estar.** Preferências de horário de trabalho e pausas; planner que evita carga irrealista; analytics sem score punitivo de horas; narrativa do produto (“Foque no que importa”) alinhada a equilíbrio e sustentabilidade, e não a hiperprodutividade.

</div>

<div class="section-break" markdown="1">

## 3. Parte prática: o sistema PersonalOS

### 3.1 Visão geral

PersonalOS é um POS web (com shell Tauri opcional) que:

1. Autentica o usuário (Better Auth: e-mail/senha, Google, GitHub, magic link Resend).
2. Conecta integrações via OAuth (**Conectar** / `/integrations`).
3. Agrega tarefas e eventos no dashboard em `/`.
4. Expõe tarefas com Eisenhower, filtros e boards Kanban/Gantt em `/tasks`.
5. Mostra agenda em `/calendar`.
6. Oferece operador de IA (Cmd/Ctrl+K, dock/sheet lateral; rota auxiliar `/ai`).
7. Permite upload de PDF acadêmico com extração de texto (`unpdf`) em `/files`.
8. Expõe analytics básicos em `/analytics` e preferências em `/settings`.

### 3.2 Mapeamento requisito prático e feature

Mapeamento verificado em relação ao HEAD da branch `cursor/personalos-mvp-44d9` (código em `apps/web`, `packages/capabilities`, `packages/api`).

| Requisito do enunciado (prática) | Implementação no PersonalOS (código atual) |
|----------------------------------|--------------------------------------------|
| Organização de tarefas e prioridades | Trello via oRPC `tasks`; grade Eisenhower em `/tasks`; sidebar com seção Eisenhower; filtros `today`, `scheduled`, `completed` |
| Planejamento semanal ou mensal | `planning_propose_day` e `planning_create_focus_blocks`; visão `/calendar`; KPIs em `/` e `/analytics` |
| Gestão de compromissos | Google Calendar (login Google sincroniza Calendar; Connect explícito também); `calendar_list_events` |
| Pelo menos 1 técnica de produtividade | Eisenhower (`tasks_classify` e UI) e time blocking (também Kanban/Gantt em `/tasks`) |
| Pelo menos 1 ferramenta digital | Trello (golden path); Calendar; Notion (tools e Connect); Gmail readonly |
| IA para automatizar, organizar ou planejar | `POST /api/ai` e `buildOperatorTools` em `@personal-os/capabilities` |
| Dashboard de acompanhamento | Home `/` (`dashboard.getOverview`: pendentes, atrasadas, prioritárias, eventos) |
| README | `README.md`, `README-ACADEMICO.md` e este documento |

**Rotas autenticadas (`/_app`):** `/`, `/tasks`, `/calendar`, `/notes`, `/files`, `/analytics`, `/integrations`, `/settings`.

### 3.3 Fluxo de uso (golden path)

1. **Login / cadastro** em `/login` (UI ReUI auth-16).
2. **Onboarding** (`/onboarding`): conectar Trello e Calendar (ou pular), timezone e horário de trabalho, intro do operador. Após OAuth, o passo de integrações é restaurado (`?step=integrations`).
3. **Home `/`:** saudação, KPIs, painel Eisenhower, atalho ao operador.
4. **Tarefas `/tasks`:** grade por quadrante (`do`, `schedule`, `delegate`, `eliminate`); boards Kanban (`TasksKanbanBoard`) e Gantt (`TasksGanttBoard`); nav com filtros Hoje, Agendadas e Completas.
5. **Calendário `/calendar`:** eventos Google.
6. **Operador:** “Classifique com Eisenhower”, “Proponha meu dia 09–18”, “Crie blocos após eu confirmar”.
7. **Arquivos `/files`:** PDF para texto; no desktop Tauri, pasta autorizada.
8. **Integrações `/integrations`:** status conectado/desconectado; Claude/ChatGPT via API key; limpar preferência de modelo para roteamento Gemini.
9. **Notes `/notes`:** ponte para uso do Notion via operador (UI stub).
10. **Analytics `/analytics`:** pendentes, atrasadas e prioritárias (sem score de horas).

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

**Confirmação de alto impacto:** criação de 3 ou mais blocos de calendário persiste `pending_ai_action`; o cliente confirma via oRPC `ai.confirmAction`.

**Roteamento de modelos:** preferência do usuário (Anthropic/OpenAI conectados), demais chaves, depois Gemini (`gemini-3-flash-preview`, fallback `gemini-3.8-flash`).

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
| Notion | Implementado (tools e Connect) | UI `/notes` ainda é ponte para o operador |
| Anthropic / OpenAI | Implementado (BYOK) | Preferência e failover para Gemini |
| Gemini | Implementado (env) | Fallback padrão do operador |

### 3.7 Operador de IA: tools

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

</div>

<div class="section-break" markdown="1">

## 4. Limitações e trabalho futuro

Esta seção distingue o que já existe do que ainda é parcial ou em evolução. Não se inventam features não implementadas.

| Item | Status |
|------|--------|
| Timer Pomodoro dedicado | Não implementado |
| MCP server HTTP externo (P2 do plano) | Não entregue como produto |
| UI rica de Notion em `/notes` | Stub: orienta uso via operador |
| Analytics | KPIs básicos (`pendingCount`, `overdueCount`, `priorityTasks`); sem séries históricas avançadas |
| Filtro “Completas” | `listTasks` retorna apenas cards abertos; filtro `completed` resulta em lista vazia |
| Boards Gantt/Kanban | Presentes em `/tasks` (`TasksKanbanBoard`, `TasksGanttBoard`); refinamentos de sync e drag ainda em evolução |
| Operador multi-agente / AI chat agents | Em evolução; não tratar como feature estável de entrega |
| Vídeo pitch | Entregável separado (fora deste PDF) |
| Prints oficiais no README | Checklist em `README-ACADEMICO.md`; anexar evidências antes do envio final |

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
- [x] Uso de IA (operador, tools e confirmação)
- [x] Dashboard (`/`)
- [x] README (`README.md`, `README-ACADEMICO.md`, este PDF)

### 5.3 Vídeo (2,0), fora deste PDF

- [ ] Gravado e link acessível (YouTube, Loom ou Drive)

### 5.4 Prints sugeridos

Ver seção 6 de `README-ACADEMICO.md` (login, onboarding, dashboard, Eisenhower, operador, integrações, PDF, Tauri opcional).

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
| Fonte regenerável | `docs/entrega/PersonalOS-Documentacao-Entrega.md` |
| Script | `scripts/build-entrega-pdf.sh` |
| PDF gerado | `docs/entrega/PersonalOS-Documentacao-Entrega.pdf` |
| Artefato cloud | `/opt/cursor/artifacts/PersonalOS-Documentacao-Entrega.pdf` |
| Data | 30 de setembro de 2026 |
| Prazo de referência | 30/09/2026, 23:00 (America/Sao_Paulo) |
| Branch | `cursor/personalos-mvp-44d9` |
| Versão do documento | 1.2 |

Para regenerar após mudanças no produto:

```bash
bash scripts/build-entrega-pdf.sh
```

Atualizar a seção 3.2 se rotas, tools ou boards evoluirem antes do envio final.

</div>
