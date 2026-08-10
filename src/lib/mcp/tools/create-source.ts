import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_source",
  title: "Adicionar referência",
  description:
    "Cria uma nova referência na biblioteca do usuário. Use apenas os campos conhecidos; os demais podem ser preenchidos depois no app.",
  inputSchema: {
    title: z.string().describe("Título da fonte."),
    source_type: z
      .string()
      .optional()
      .describe("Tipo da fonte (padrão: article). Ex.: article, book, thesis, website."),
    year: z.number().int().optional().describe("Ano de publicação."),
    container_title: z.string().optional().describe("Revista, livro ou evento onde foi publicado."),
    publisher: z.string().optional().describe("Editora ou instituição."),
    doi: z.string().optional().describe("DOI da publicação."),
    url: z.string().optional().describe("URL de acesso."),
    abstract: z.string().optional().describe("Resumo da fonte."),
    personal_notes: z.string().optional().describe("Notas pessoais sobre a fonte."),
    status_reading: z.string().optional().describe("Status de leitura (padrão: to_read)."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const title = input.title.trim();
    if (!title) throw new ToolError("O título é obrigatório.");

    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("sources")
      .insert({
        owner_id: ctx.getUserId()!,
        title,
        source_type: input.source_type?.trim() || "article",
        status_reading: input.status_reading?.trim() || "to_read",
        year: input.year ?? null,
        container_title: input.container_title ?? null,
        publisher: input.publisher ?? null,
        doi: input.doi ?? null,
        url: input.url ?? null,
        abstract: input.abstract ?? null,
        personal_notes: input.personal_notes ?? null,
      })
      .select("id, title, source_type, year, status_reading")
      .single();

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { source: data },
    };
  },
});
