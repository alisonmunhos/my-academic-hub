# Ampliar as ferramentas do MCP

Hoje o servidor MCP do app expõe 7 ferramentas (buscar, ver, criar e atualizar referências; listar projetos, listar referências de um projeto, adicionar referência a projeto). O plano é completar as lacunas mais úteis para uso com assistentes de IA.

## Novas ferramentas

1. **Criar projeto** — cria uma coleção nova (nome e descrição).
2. **Remover referência de um projeto** — desfaz o vínculo sem apagar a referência.
3. **Excluir referência** — apaga uma fonte da biblioteca; marcada como ação destrutiva, exigindo confirmação do assistente.
4. **Buscar por autor** — lista referências de uma pessoa (autor/orientador), com busca por nome parcial.
5. **Buscar por palavra-chave ou tag** — lista referências associadas a uma palavra-chave ou tag.
6. **Gerar citações em lote** — recebe uma lista de referências e devolve as citações ABNT (completa, integrada e parentética) já salvas no banco.
7. **Listar palavras-chave e tags** — ajuda o assistente a descobrir os termos existentes antes de filtrar.

## Cuidados

- Tudo continua rodando com o login do usuário (OAuth), respeitando as regras de acesso do banco: cada cliente só vê e altera os próprios dados.
- A exclusão será a única ferramenta destrutiva, sinalizada como tal para o assistente pedir confirmação antes de executar.
- Nenhuma tela do app muda; nada é apagado no banco por esta implementação.

## Detalhes técnicos

- Um arquivo por ferramenta em `src/lib/mcp/tools/`, seguindo o padrão atual (`defineTool` + esquema Zod + `supabaseForUser`).
- Registro das novas ferramentas em `src/lib/mcp/index.ts`.
- Buscas por autor/palavra-chave/tag usam as tabelas de ligação (`source_people`, `source_keywords`, `source_tags`).
- Citações em lote leem `citation_full_abnt`, `citation_integrated` e `citation_parenthetical` das fontes, sem recalcular nada.
- Ao final, regeneração do manifesto MCP e validação do endpoint `/mcp`.
- Necessário publicar novamente para valer no domínio de produção.
