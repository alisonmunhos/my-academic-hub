import { auth, defineMcp } from "@lovable.dev/mcp-js";

import addSourceToProjectTool from "./tools/add-source-to-project";
import citeSourcesTool from "./tools/cite-sources";
import createProjectTool from "./tools/create-project";
import createSourceTool from "./tools/create-source";
import deleteSourceTool from "./tools/delete-source";
import getSourceTool from "./tools/get-source";
import listProjectSourcesTool from "./tools/list-project-sources";
import listProjectsTool from "./tools/list-projects";
import listTermsTool from "./tools/list-terms";
import removeSourceFromProjectTool from "./tools/remove-source-from-project";
import searchSourcesTool from "./tools/search-sources";
import searchSourcesByPersonTool from "./tools/search-sources-by-person";
import searchSourcesByTermTool from "./tools/search-sources-by-term";
import updateSourceTool from "./tools/update-source";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

type McpTools = Parameters<typeof defineMcp>[0]["tools"];

const tools = [
  searchSourcesTool,
  searchSourcesByPersonTool,
  searchSourcesByTermTool,
  listTermsTool,
  getSourceTool,
  createSourceTool,
  updateSourceTool,
  deleteSourceTool,
  citeSourcesTool,
  listProjectsTool,
  createProjectTool,
  listProjectSourcesTool,
  addSourceToProjectTool,
  removeSourceFromProjectTool,
] as unknown as McpTools;

export default defineMcp({
  name: "biblioteca-de-referencias",
  title: "Biblioteca de Referências",
  version: "0.2.0",
  instructions:
    "Ferramentas da Biblioteca de Referências: consulte, crie, atualize e exclua referências acadêmicas do usuário, e trabalhe com seus projetos (coleções). Use search_sources para busca livre, search_sources_by_person para buscar por autor/orientador, list_terms + search_sources_by_term para palavras-chave e tags, get_source para detalhes completos, create_source/update_source para escrever, cite_sources para gerar listas de referências em ABNT, e list_projects/create_project/list_project_sources/add_source_to_project/remove_source_from_project para as coleções. delete_source é destrutivo: confirme com o usuário antes de usar.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools,
});
