import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { supabaseForUser } from "../supabase";

const FIELDS =
  "id, title, source_type, year, container_title, publisher, doi, url, status_reading, is_favorite, abstract, personal_notes, citation_full_abnt, public_slug, is_public, created_at";

export default defineTool({
  name: "search_sources",
  title: "Buscar referências",
  description:
    "Busca referências da biblioteca do usuário por texto (título, revista, DOI), tipo, ano ou status de leitura.",
  inputSchema: {
    query: z.string().optional().describe("Texto livre buscado em título, revista/editora e DOI."),
    source_type: z.string().optional().describe("Tipo da fonte, ex.: article, book, thesis."),
    status_reading: z.string().optional().describe("Status de leitura, ex.: to_read, reading, read."),
    year: z.number().int().optional().describe("Ano de publicação exato."),
    favorites_only: z.boolean().optional().describe("Retornar apenas favoritas."),
    limit: z.number().int().optional().describe("Máximo de resultados (padrão 20, teto 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);

    let query = supabase
      .from("sources")
      .select(FIELDS)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (input.query) {
      const term = `%${input.query.replace(/[%,]/g, " ")}%`;
      query = query.or(
        `title.ilike.${term},container_title.ilike.${term},doi.ilike.${term},publisher.ilike.${term}`,
      );
    }
    if (input.source_type) query = query.eq("source_type", input.source_type);
    if (input.status_reading) query = query.eq("status_reading", input.status_reading);
    if (typeof input.year === "number") query = query.eq("year", input.year);
    if (input.favorites_only) query = query.eq("is_favorite", true);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { sources: data ?? [], count: data?.length ?? 0 },
    };
  },
});
