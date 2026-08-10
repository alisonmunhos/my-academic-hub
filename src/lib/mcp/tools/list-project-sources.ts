import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_project_sources",
  title: "Ver referências de um projeto",
  description: "Lista as referências que pertencem a um projeto (coleção) do usuário.",
  inputSchema: {
    project_id: z.string().describe("ID (uuid) do projeto."),
    limit: z.number().int().optional().describe("Máximo de referências (padrão 50, teto 200)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ project_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("project_sources")
      .select(
        "added_at, sources(id, title, source_type, year, container_title, doi, url, status_reading, citation_full_abnt)",
      )
      .eq("project_id", project_id)
      .order("added_at", { ascending: false })
      .limit(Math.min(Math.max(limit ?? 50, 1), 200));

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const sources = (data ?? []).map((row) => row.sources).filter(Boolean);
    return {
      content: [{ type: "text", text: JSON.stringify(sources) }],
      structuredContent: { sources, count: sources.length },
    };
  },
});
