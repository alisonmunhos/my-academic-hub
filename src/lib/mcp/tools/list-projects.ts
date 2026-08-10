import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_projects",
  title: "Listar projetos",
  description:
    "Lista os projetos (coleções de referências) do usuário, com a quantidade de referências em cada um.",
  inputSchema: {
    query: z.string().optional().describe("Filtra projetos pelo nome."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let builder = supabase
      .from("projects")
      .select("id, name, description, is_public, public_slug, created_at, project_sources(count)")
      .order("created_at", { ascending: false });

    if (query) builder = builder.ilike("name", `%${query.replace(/[%,]/g, " ")}%`);

    const { data, error } = await builder;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const projects = (data ?? []).map((project) => {
      const { project_sources, ...rest } = project as typeof project & {
        project_sources?: { count: number }[];
      };
      return { ...rest, sources_count: project_sources?.[0]?.count ?? 0 };
    });

    return {
      content: [{ type: "text", text: JSON.stringify(projects) }],
      structuredContent: { projects },
    };
  },
});
