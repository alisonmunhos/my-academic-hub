import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_terms",
  title: "Listar palavras-chave e tags",
  description:
    "Lista as palavras-chave e as tags existentes na biblioteca do usuário, para depois filtrar referências por elas.",
  inputSchema: {
    query: z.string().nullable().optional().describe("Filtra por texto parcial no termo."),
    kind: z
      .enum(["keyword", "tag", "both"])
      .nullable()
      .optional()
      .describe("O que listar: keyword, tag ou both (padrão both)."),
    limit: z.number().int().nullable().optional().describe("Máximo de itens por tipo (padrão 100, teto 500)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, kind, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const max = Math.min(Math.max(limit ?? 100, 1), 500);
    const scope = kind ?? "both";
    const pattern = query ? `%${query.replace(/[%,]/g, " ")}%` : null;

    let keywords: { id: string; label: string }[] = [];
    let tags: { id: string; label: string; color: string | null }[] = [];

    if (scope === "keyword" || scope === "both") {
      let builder = supabase.from("keywords").select("id, label").order("label").limit(max);
      if (pattern) builder = builder.ilike("label", pattern);
      const { data, error } = await builder;
      if (error) return { content: [{ type: "text", text: error.message }], isError: true };
      keywords = data ?? [];
    }

    if (scope === "tag" || scope === "both") {
      let builder = supabase.from("tags").select("id, label, color").order("label").limit(max);
      if (pattern) builder = builder.ilike("label", pattern);
      const { data, error } = await builder;
      if (error) return { content: [{ type: "text", text: error.message }], isError: true };
      tags = data ?? [];
    }

    return {
      content: [{ type: "text", text: JSON.stringify({ keywords, tags }) }],
      structuredContent: { keywords, tags },
    };
  },
});
