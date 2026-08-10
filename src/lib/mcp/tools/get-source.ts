import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_source",
  title: "Ver referência",
  description:
    "Retorna todos os dados de uma referência, incluindo autores, palavras-chave, tags e citação ABNT.",
  inputSchema: { id: z.string().describe("ID (uuid) da referência.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);

    const { data: source, error } = await supabase
      .from("sources")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!source) {
      return { content: [{ type: "text", text: "Referência não encontrada." }], isError: true };
    }

    const [people, keywords, tags] = await Promise.all([
      supabase.from("source_people").select("role, position, people(full_name)").eq("source_id", id),
      supabase.from("source_keywords").select("keywords(label)").eq("source_id", id),
      supabase.from("source_tags").select("tags(label, color)").eq("source_id", id),
    ]);

    const detail = {
      ...source,
      people: people.data ?? [],
      keywords: keywords.data ?? [],
      tags: tags.data ?? [],
    };

    return {
      content: [{ type: "text", text: JSON.stringify(detail) }],
      structuredContent: { source: detail },
    };
  },
});
