import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_project",
  title: "Criar projeto",
  description: "Cria um novo projeto (coleção de referências) para o usuário.",
  inputSchema: {
    name: z.string().min(1).describe("Nome do projeto."),
    description: z.string().nullable().optional().describe("Descrição opcional do projeto."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ name, description }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("projects")
      .insert({ name, description: description ?? null })
      .select("id, name, description, is_public, public_slug, created_at")
      .single();

    if (error) throw new ToolError(error.message);
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { project: data },
    };
  },
});
