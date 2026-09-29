import type { FastifyInstance } from "fastify";

/** Tool names mirrored from @personal-os/capabilities (AI Operator registry). */
const CAPABILITY_TOOL_NAMES = [
  "tasks_list",
  "tasks_create",
  "tasks_classify",
  "calendar_list_events",
  "planning_propose_day",
  "planning_create_focus_blocks",
  "knowledge_search",
  "knowledge_read_page",
  "knowledge_create_note",
  "comm_rewrite_message",
  "comm_summarize_for_team",
  "comm_meeting_notes_to_tasks",
] as const;

/** P2 foundation: MCP Streamable HTTP placeholder sharing capability registry later. */
export async function registerMcpRoutes(fastify: FastifyInstance) {
  fastify.get("/.well-known/oauth-protected-resource", async () => ({
    authorization_servers: [],
    resource: "personal-os-mcp",
  }));

  fastify.get("/mcp/tools", async () => ({
    status: "setup_available",
    tools: CAPABILITY_TOOL_NAMES.map((name) => ({ name })),
  }));

  fastify.post("/mcp", async (_request, reply) =>
    reply.status(501).send({
      error:
        "MCP Streamable HTTP adapter not fully configured. Use AI Operator or configure PAT in Integrations.",
      tools: CAPABILITY_TOOL_NAMES,
    })
  );
}
