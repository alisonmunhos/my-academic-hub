import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { supabaseForUser } from "../supabase";

const SOURCE_FIELDS =
  "id, title, source_type, year, container_title, doi, url, status_reading, is_favorite, citation_full_abnt";

export default defineTool({
  name: "search_sources_by_term",
  title: "Buscar referências por palavra-chave ou tag",
  description:
    "Lista as referências associadas a uma palavra-chave ou a uma tag do usuário. Use list_terms antes para descobrir os termos existentes.",
  inputSchema: {
    term: z.string().min(1).describe("Palavra-chave ou tag (busca por texto parcial)."),
    kind: z
      .enum(["keyword", "tag", "both"])
      .nullable()
      .optional()
      .describe("Onde buscar: keyword, tag ou both (padrão both)."),
    limit: z.number().int().nullable().optional().describe("Máximo de resultados (padrão 50, teto 200)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ term, kind, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const max = Math.min(Math.max(limit ?? 50, 1), 200);
    const pattern = `%${term.replace(/[%,]/g, " ")}%`;
    const scope = kind ?? "both";

    const matched: { id: string; label: string; kind: "keyword" | "tag" }[] = [];
    const sourceIds = new Set<string>();

    if (scope === "keyword" || scope === "both") {
      const { data: keywords, error } = await supabase
        .from("keywords")
        .select("id, label")
        .ilike("label", pattern)
        .limit(50);
      if (error) return { content: [{ type: "text", text: error.message }], isError: true };
      for (const keyword of keywords ?? []) matched.push({ ...keyword, kind: "keyword" });
      if (keywords?.length) {
        const { data: links, error: linkError } = await supabase
          .from("source_keywords")
          .select("source_id")
          .in(
            "keyword_id",
            keywords.map((keyword) => keyword.id),
          );
        if (linkError) return { content: [{ type: "text", text: linkError.message }], isError: true };
        for (const link of links ?? []) sourceIds.add(link.source_id);
      }
    }

    if (scope === "tag" || scope === "both") {
      const { data: tags, error } = await supabase
        .from("tags")
        .select("id, label")
        .ilike("label", pattern)
        .limit(50);
      if (error) return { content: [{ type: "text", text: error.message }], isError: true };
      for (const tag of tags ?? []) matched.push({ ...tag, kind: "tag" });
      if (tags?.length) {
        const { data: links, error: linkError } = await supabase
          .from("source_tags")
          .select("source_id")
          .in(
            "tag_id",
            tags.map((tag) => tag.id),
          );
        if (linkError) return { content: [{ type: "text", text: linkError.message }], isError: true };
        for (const link of links ?? []) sourceIds.add(link.source_id);
      }
    }

    if (!sourceIds.size) {
      return {
        content: [{ type: "text", text: "Nenhuma referência encontrada para esse termo." }],
        structuredContent: { terms: matched, sources: [], count: 0 },
      };
    }

    const { data: sources, error } = await supabase
      .from("sources")
      .select(SOURCE_FIELDS)
      .in("id", Array.from(sourceIds).slice(0, max))
      .order("year", { ascending: false });

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    return {
      content: [{ type: "text", text: JSON.stringify(sources ?? []) }],
      structuredContent: { terms: matched, sources: sources ?? [], count: sources?.length ?? 0 },
    };
  },
});
