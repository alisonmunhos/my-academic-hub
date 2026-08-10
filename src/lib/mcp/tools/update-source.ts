import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "update_source",
  title: "Atualizar referência",
  description:
    "Atualiza campos de uma referência existente. Apenas os campos informados são alterados.",
  inputSchema: {
    id: z.string().describe("ID (uuid) da referência."),
    title: z.string().optional().describe("Novo título."),
    source_type: z.string().optional().describe("Novo tipo da fonte."),
    year: z.number().int().optional().describe("Novo ano de publicação."),
    container_title: z.string().optional().describe("Nova revista/livro/evento."),
    publisher: z.string().optional().describe("Nova editora."),
    doi: z.string().optional().describe("Novo DOI."),
    url: z.string().optional().describe("Nova URL."),
    abstract: z.string().optional().describe("Novo resumo."),
    personal_notes: z.string().optional().describe("Novas notas pessoais."),
    status_reading: z.string().optional().describe("Novo status de leitura."),
    is_favorite: z.boolean().optional().describe("Marcar ou desmarcar como favorita."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ id, ...fields }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const patch = Object.fromEntries(
      Object.entries(fields).filter(([, value]) => value !== undefined),
    );
    if (Object.keys(patch).length === 0) {
      throw new ToolError("Informe pelo menos um campo para atualizar.");
    }

    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("sources")
      .update(patch)
      .eq("id", id)
      .select("id, title, source_type, year, status_reading, is_favorite")
      .maybeSingle();

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) {
      return { content: [{ type: "text", text: "Referência não encontrada." }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { source: data },
    };
  },
});
