import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "delete_source",
  title: "Excluir referência",
  description:
    "Exclui permanentemente uma referência da biblioteca do usuário, junto com seus vínculos de autores, palavras-chave, tags e projetos. Ação destrutiva: confirme com o usuário antes de executar.",
  inputSchema: {
    source_id: z.string().describe("ID (uuid) da referência a excluir."),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ source_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);

    const { data: existing, error: findError } = await supabase
      .from("sources")
      .select("id, title")
      .eq("id", source_id)
      .maybeSingle();

    if (findError) throw new ToolError(findError.message);
    if (!existing) {
      return {
        content: [{ type: "text", text: "Referência não encontrada." }],
        isError: true,
      };
    }

    await supabase.from("source_people").delete().eq("source_id", source_id);
    await supabase.from("source_keywords").delete().eq("source_id", source_id);
    await supabase.from("source_tags").delete().eq("source_id", source_id);
    await supabase.from("project_sources").delete().eq("source_id", source_id);

    const { error } = await supabase.from("sources").delete().eq("id", source_id);
    if (error) throw new ToolError(error.message);

    return {
      content: [{ type: "text", text: `Referência excluída: ${existing.title}` }],
      structuredContent: { deleted: { id: existing.id, title: existing.title } },
    };
  },
});
