import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "add_source_to_project",
  title: "Adicionar referência a um projeto",
  description: "Vincula uma referência existente a um projeto (coleção) do usuário.",
  inputSchema: {
    project_id: z.string().describe("ID (uuid) do projeto."),
    source_id: z.string().describe("ID (uuid) da referência."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ project_id, source_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { error } = await supabase
      .from("project_sources")
      .upsert({ project_id, source_id }, { onConflict: "project_id,source_id" });

    if (error) throw new ToolError(error.message);
    return {
      content: [{ type: "text", text: "Referência adicionada ao projeto." }],
      structuredContent: { project_id, source_id },
    };
  },
});
