# PersonalOS

**POS acadêmico (UniFECAF)** · João Henrique Benatti Coimbra · RA **188635** · Graduação Tecnológica em IA e Automação Digital · módulo *Produtividade e Gestão do Tempo*.

Sistema operacional pessoal que une **Trello + Google Calendar + Notion + operador de IA** num único shell web (ReUI; desktop Tauri opcional). Na Home, a **matriz Eisenhower** atualiza com o Trello ao vivo; em Tarefas há **Kanban e Gantt**; o operador planeja o dia com blocos de foco e, na demo, prioriza **Gemini free-tier** quando a cota OpenAI esgota.

| Entregável | Onde |
|------------|------|
| PDF teórico + prático (ABNT simplificada) | [`docs/entrega/Documentacao.pdf`](./docs/entrega/Documentacao.pdf) · regenerar: `bun run docs:entrega-pdf` |
| Este README (apresentação + como rodar) | arquivo atual |
| Vídeo pitch (≤4 min) | link externo (YouTube / Loom / Drive) |

**Fora do MVP:** Gmail (scaffolding OAuth no backend; UI e onboarding **não** expõem Conectar Gmail).

## O que o MVP entrega

| Área | O que existe hoje |
|------|-------------------|
| Home `/` | KPIs + **matriz Eisenhower** (Trello ao vivo) + próximos eventos |
| Tarefas `/tasks` | Boards **Kanban** e **Gantt** com dados live do Trello; filtros Hoje/Agendadas |
| Calendário `/calendar` | Eventos Google; operador grava **blocos de foco** após confirmação |
| Integrações `/integrations` | Conectar Trello, Calendar e Notion; BYOK Claude/ChatGPT; seletor Gemini |
| Operador de IA | Dock/sheet (Cmd/Ctrl+K): classificar Eisenhower, planejar o dia, Notion, Trello, comunicação |
| Onboarding | Conectar apps, timezone, horário de trabalho e intro do operador |
| Arquivos `/files` | Upload de PDF com extração de texto |
| Analytics `/analytics` | Contagens básicas (sem score de horas) |
| Auth | E-mail/senha, Google, GitHub, magic link (Resend) |

**Leitura / escrita (honesto):** Trello listar/criar/classificar; Calendar listar + criar blocos de foco; Notion buscar/ler/criar página (título). Append de blocos no corpo Notion e CRUD genérico de eventos Calendar estão planejados e **não** são reivindicados como estáveis neste README. Notes (`/notes`) ainda é ponte textual para o operador.

## Previews

<p>
  <img src="docs/previews/dashboard-home.png" alt="Dashboard Home com KPIs e matriz Eisenhower" width="720" />
</p>

<p>
  <img src="docs/previews/onboarding-integracoes.png" alt="Onboarding: passo de integrações" width="720" />
</p>

<p>
  <img src="docs/previews/ai-dock.png" alt="Operador de IA no dock lateral" width="720" />
</p>

<p>
  <img src="docs/previews/tasks-kanban.png" alt="Board Kanban em Tarefas" width="480" />
  <img src="docs/previews/tasks-gantt.png" alt="Board Gantt em Tarefas" width="480" />
</p>

Checklist de prints para a entrega: login, onboarding, Home com Eisenhower, Kanban/Gantt, operador com tool steps (Gemini), integrações conectadas, upload de PDF, (opcional) app Tauri.

## Stack

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 19, TanStack Router/Query, Tailwind 4, shadcn/ReUI |
| Backend | Fastify, oRPC, Better Auth |
| IA | Vercel AI SDK + Gemini (free-tier demo) / Claude / ChatGPT (BYOK) |
| Dados | PostgreSQL, Drizzle ORM |
| Monorepo | Turborepo, Bun |
| Desktop | Tauri 2 (opcional) |

Base inicial: [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack).

## Como executar localmente

Pré-requisitos: **Bun 1.3+**, PostgreSQL (Docker ou sistema) e variáveis de ambiente.

1. Copie o modelo [`.env.example`](./.env.example) para `apps/server/.env` e `apps/web/.env`.
2. Preencha pelo menos `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CORS_ORIGIN` e `INTEGRATION_ENCRYPTION_KEY`. Integrações e login social pedem as chaves OAuth descritas no exemplo.
3. Para demo/pitch estável: defina `GOOGLE_GENERATIVE_AI_API_KEY` e, se quiser forçar Gemini primeiro, `OPERATOR_PITCH_DEMO=1`.

```bash
bun install
bun run db:start    # Postgres (Docker ou scripts/ensure-postgres.sh no Cloud Agent)
bun run db:push
bun run dev
```

- Web: http://localhost:3001
- API: http://localhost:3000

Apenas um app: `bun run dev:web` ou `bun run dev:server`. Desktop: `cd apps/web && bun run desktop:dev`.

### Redirects OAuth (resumo)

Registre no console do provedor (valores locais):

| Fluxo | Callback |
|-------|----------|
| Google login + Calendar Connect | `http://localhost:3000/api/auth/callback/google` |
| GitHub login | `http://localhost:3000/api/auth/callback/github` |
| Notion Connect | `http://localhost:3000/api/integrations/oauth/notion/callback` |
| Trello | `http://localhost:3001/oauth/trello` |

Detalhes e armadilhas (`redirect_uri_mismatch`, Power-Up hex key do Trello): ver comentários em [`.env.example`](./.env.example).

## Estrutura

```
personal-os/
├── apps/
│   ├── web/         # React + TanStack Router (+ Tauri)
│   └── server/      # Fastify, oRPC, auth, AI, OAuth
├── packages/
│   ├── api/         # Routers oRPC
│   ├── auth/        # Better Auth
│   ├── capabilities/# Eisenhower, planning, operator tools
│   ├── db/          # Drizzle + schema
│   ├── integrations/# OAuth e adapters
│   └── ui/          # shadcn/ReUI compartilhado
└── docs/
    ├── entrega/     # Documentacao.md → Documentacao.pdf
    └── previews/    # Screenshots do produto
```

## Scripts úteis

| Comando | Função |
|---------|--------|
| `bun run dev` | Sobe web + server |
| `bun run check-types` | Typecheck do monorepo |
| `bun run db:push` / `db:studio` | Schema e Drizzle Studio |
| `bun run docs:entrega-pdf` | Regenera `docs/entrega/Documentacao.pdf` |
| `bun run deploy` / `deploy:prod` | Deploy Vercel (após `deploy:setup` e sync de env) |

## Mapa teoria → produto (pitch)

| Teoria (módulo) | Na prática no PersonalOS |
|-----------------|--------------------------|
| Matriz Eisenhower | Home `/` + tool `tasks_classify` |
| Time blocking / blocos de foco | `planning_propose_day` → `planning_create_focus_blocks` |
| Kanban | `/tasks` board Kanban (Trello live) |
| Comunicação profissional | tools `comm_*` no operador |
| Bem-estar / carga sustentável | preferências de horário + teto de tarefas no planner |

Autor: João Henrique Benatti Coimbra · RA 188635 · UniFECAF · Módulo Produtividade e Gestão do Tempo.
