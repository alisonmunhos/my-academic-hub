import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "cite_sources",
  title: "Gerar citações em lote",
  description:
    "Devolve as citações ABNT (completa, integrada e parentética) já salvas para uma lista de referências, ou para todas as referências de um projeto.",
  inputSchema: {
    source_ids: z
      .array(z.string())
      .nullable()
      .optional()
      .describe("IDs (uuid) das referências. Ignorado quando project_id é informado."),
    project_id: z
      .string()
      .nullable()
      .optional()
      .describe("ID (uuid) de um projeto: cita todas as referências vinculadas a ele."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ source_ids, project_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);

    let ids = source_ids ?? [];
    if (project_id) {
      const { data, error } = await supabase
        .from("project_sources")
        .select("source_id")
        .eq("project_id", project_id);
      if (error) return { content: [{ type: "text", text: error.message }], isError: true };
      ids = (data ?? []).map((row) => row.source_id);
    }

    if (!ids.length) {
      return {
        content: [{ type: "text", text: "Informe source_ids ou um project_id com referências." }],
        isError: true,
      };
    }

    const { data, error } = await supabase
      .from("sources")
      .select("id, title, year, citation_full_abnt, citation_integrated, citation_parenthetical")
      .in("id", ids.slice(0, 200));

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const citations = (data ?? []).sort((a, b) =>
      (a.citation_full_abnt ?? a.title).localeCompare(b.citation_full_abnt ?? b.title, "pt-BR"),
    );
    const missing = citations.filter((item) => !item.citation_full_abnt).map((item) => item.id);
    const referenceList = citations
      .map((item) => item.citation_full_abnt)
      .filter((value): value is string => Boolean(value))
      .join("\n");

    return {
      content: [{ type: "text", text: referenceList || "Nenhuma citação salva nessas referências." }],
      structuredContent: { citations, reference_list: referenceList, missing_citation_ids: missing },
    };
  },
});
