import { auth, defineMcp } from "@lovable.dev/mcp-js";

import addSourceToProjectTool from "./tools/add-source-to-project";
import createSourceTool from "./tools/create-source";
import getSourceTool from "./tools/get-source";
import listProjectSourcesTool from "./tools/list-project-sources";
import listProjectsTool from "./tools/list-projects";
import searchSourcesTool from "./tools/search-sources";
import updateSourceTool from "./tools/update-source";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "biblioteca-de-referencias",
  title: "Biblioteca de Referências",
  version: "0.1.0",
  instructions:
    "Ferramentas da Biblioteca de Referências: consulte, crie e atualize referências acadêmicas do usuário, e trabalhe com seus projetos (coleções). Use search_sources para localizar itens, get_source para detalhes completos (autores, palavras-chave, tags e citação ABNT), create_source/update_source para escrever, e list_projects/list_project_sources/add_source_to_project para as coleções.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    searchSourcesTool,
    getSourceTool,
    createSourceTool,
    updateSourceTool,
    listProjectsTool,
    listProjectSourcesTool,
    addSourceToProjectTool,
  ],
});
