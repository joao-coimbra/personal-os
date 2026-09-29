# PersonalOS — README Acadêmico (Entrega)

## 1. Descrição do sistema

**PersonalOS** é um sistema operacional pessoal que integra **tarefas (Trello)**, **agenda (Google Calendar)**, **notas (Notion, P2)** e um **operador de IA** (Vercel AI SDK + Gemini) para planejar o dia, classificar prioridades (matriz de Eisenhower), criar blocos de foco e apoiar comunicação profissional. O dashboard reúne visão do dia, tarefas atrasadas e próximos eventos.

## 2. Ferramentas utilizadas

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 19, TanStack Router/Query, Tailwind 4, shadcn (preset Luma) |
| Backend | Fastify, oRPC, Better Auth |
| IA | Vercel AI SDK (`ai`, `@ai-sdk/react`, `@ai-sdk/google`) |
| Dados | PostgreSQL, Drizzle ORM |
| Desktop | Tauri 2 (dialog/fs para workspace local) |
| Monorepo | Turborepo, Bun |

Integrações externas: **Trello**, **Google Calendar**, **Notion** (tokens via UI de Integrações; OAuth completo documentado para evolução).

## 3. Fluxo de uso (golden path)

1. **Cadastro/login** (email e senha).
2. **Onboarding**: conectar Trello e Calendar (token ou pular), definir timezone e horário de trabalho, conhecer o operador de IA.
3. **Dashboard (`/home`)**: visão agregada via oRPC.
4. **Tarefas (`/tasks`)**: lista com sugestão Eisenhower.
5. **Calendário (`/calendar`)**: eventos do Google Calendar.
6. **Operador de IA** (Cmd/Ctrl+K ou painel lateral): exemplos:
   - “Classifique minhas tarefas com Eisenhower.”
   - “Proponha meu dia para amanhã respeitando 09–18h.”
   - “Crie blocos de foco após eu confirmar o plano.”
7. **Arquivos (`/files`)**: upload do PDF do trabalho acadêmico → extração de texto no servidor (`unpdf`); no desktop, pasta autorizada via Tauri.

## 4. IA no produto

- Endpoint autenticado `POST /api/ai` com tools sobre `@personal-os/capabilities`.
- Ações de alto impacto (≥3 blocos de calendário) geram `pending_ai_action`; confirmação via oRPC `ai.confirmAction`.
- Tools de comunicação: reescrita, resumo para equipe, notas de reunião → rascunho de tarefas.

## 5. Configuração local

Ver [`.env.example`](./.env.example). Copie variáveis para `apps/server/.env` e `apps/web/.env`.

```bash
bun install
bun run db:start    # Docker Postgres
bun run db:push
bun run dev
```

Web: http://localhost:3001 — API: http://localhost:3000

## 6. Checklist de prints (entrega)

- [ ] Tela de login/cadastro
- [ ] Onboarding (integrações + preferências)
- [ ] Dashboard com tarefas e eventos
- [ ] Matriz/lista Eisenhower em Tarefas
- [ ] Operador de IA com tool steps visíveis
- [ ] Integrações (estado conectado/desconectado)
- [ ] Upload PDF e texto extraído
- [ ] (Opcional) App Tauri com pasta autorizada

## 7. Vídeo (≤4 min)

Roteiro sugerido: desafio de produtividade → visão do PersonalOS → demo login → onboarding → dashboard → IA planejando o dia → PDF → ganhos percebidos.

## 8. Parte teórica (referência)

O enunciado pede diagnóstico, métodos (Pomodoro, Eisenhower, GTD), ferramentas digitais, uso de IA e estratégias de comunicação/procrastinação/bem-estar. Este README cobre a **implementação prática**; o relatório teórico deve ser redigido no documento acadêmico separado, citando o PDF *Meu Sistema Operacional Pessoal*.
