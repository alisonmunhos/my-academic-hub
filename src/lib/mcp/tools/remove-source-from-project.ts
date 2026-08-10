import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "remove_source_from_project",
  title: "Remover referência de um projeto",
  description:
    "Desvincula uma referência de um projeto (coleção). A referência continua existindo na biblioteca.",
  inputSchema: {
    project_id: z.string().describe("ID (uuid) do projeto."),
    source_id: z.string().describe("ID (uuid) da referência."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ project_id, source_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { error } = await supabase
      .from("project_sources")
      .delete()
      .eq("project_id", project_id)
      .eq("source_id", source_id);

    if (error) throw new ToolError(error.message);
    return {
      content: [{ type: "text", text: "Referência removida do projeto." }],
      structuredContent: { project_id, source_id },
    };
  },
});
