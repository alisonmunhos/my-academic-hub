import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "search_sources_by_person",
  title: "Buscar referências por autor",
  description:
    "Lista as referências associadas a uma pessoa (autor, orientador etc.), buscando pelo nome parcial ou completo.",
  inputSchema: {
    name: z.string().min(1).describe("Nome (ou parte do nome) da pessoa."),
    role: z.string().nullable().optional().describe("Filtra pelo papel, ex.: autor, orientador."),
    limit: z.number().int().nullable().optional().describe("Máximo de resultados (padrão 50, teto 200)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ name, role, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const max = Math.min(Math.max(limit ?? 50, 1), 200);
    const term = `%${name.replace(/[%,]/g, " ")}%`;

    const { data: people, error: peopleError } = await supabase
      .from("people")
      .select("id, full_name")
      .ilike("full_name", term)
      .limit(50);

    if (peopleError) return { content: [{ type: "text", text: peopleError.message }], isError: true };
    if (!people?.length) {
      return {
        content: [{ type: "text", text: "Nenhuma pessoa encontrada com esse nome." }],
        structuredContent: { people: [], sources: [], count: 0 },
      };
    }

    let builder = supabase
      .from("source_people")
      .select(
        "role, position, person_id, sources(id, title, source_type, year, container_title, doi, url, status_reading, is_favorite, citation_full_abnt)",
      )
      .in(
        "person_id",
        people.map((person) => person.id),
      )
      .limit(max);

    if (role) builder = builder.eq("role", role);

    const { data, error } = await builder;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const peopleById = new Map(people.map((person) => [person.id, person.full_name]));
    const sources = (data ?? [])
      .filter((row) => row.sources)
      .map((row) => ({
        ...row.sources,
        person_name: peopleById.get(row.person_id) ?? null,
        role: row.role,
        position: row.position,
      }));

    return {
      content: [{ type: "text", text: JSON.stringify(sources) }],
      structuredContent: { people, sources, count: sources.length },
    };
  },
});
