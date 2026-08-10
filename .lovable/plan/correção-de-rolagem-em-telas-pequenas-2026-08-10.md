# Correção de rolagem em telas pequenas

## Situação atual (verificada agora no código)

As correções descritas pelo Claude Code **não estão neste projeto**. No código atual:

- `SourceFormDialog.tsx` (linha 229) ainda usa `ScrollArea` dentro do modal com `max-h-[85vh]`
- `ImportSourcesDialog.tsx` (linha 300) idem
- `BatchCiteDialog.tsx` (linha 36) usa `ScrollArea` com `max-h-[50vh]` num diálogo que não é flex-column
- A tabela de fontes (`SourcesTable.tsx`, linha 131) está num `div` sem rolagem horizontal
- O painel de filtros fica fixo ao lado da tabela em qualquer largura

Ou seja: o trabalho dele ficou na branch dele e não foi mesclado. O diagnóstico dele, porém, coincide com o nosso: o `ScrollArea` do Radix não recebe altura resolvida dentro de um diálogo que só tem `max-height`, então o recorte acontece num elemento `overflow:hidden` — que responde a foco (Tab) mas não à roda do mouse.

## O que fazer

1. **Modal Editar/Nova fonte**: trocar `ScrollArea` por rolagem nativa (`min-h-0 flex-1 overflow-y-auto`), mantendo cabeçalho e rodapé fixos.
2. **Modal Importar fontes**: mesma troca nos dois blocos roláveis.
3. **Diálogo de referências em lote**: transformar em coluna flex com corpo `overflow-y-auto`.
4. **Tabela de fontes**: envolver em contêiner `overflow-x-auto` e dar `min-w-max` à tabela, para as colunas gerarem rolagem lateral em vez de comprimir.
5. **Altura dos modais em telas baixas**: usar `max-h-[calc(100dvh-2rem)]` (com limite de 85vh) para aproveitar a altura real disponível em notebooks pequenos.
6. **Painel de filtros responsivo**: em telas estreitas ele passa a ser uma gaveta/painel recolhível acionado por um botão "Filtros"; a partir de `lg` continua fixo ao lado como hoje.
7. **Listas com rolagem interna** (palavras-chave nos filtros, seleção de projetos, pickers): padronizar rolagem nativa com altura máxima.
8. **Correção silenciosa**: erro de hidratação na rota `/biblioteca` que já aparece no console.

## Verificação

Teste com Playwright, disparando eventos reais de roda do mouse, nas larguras 1920, 1366, 1024 e 768 px:
- abrir o modal de fonte e rolar até os botões Cancelar/Salvar
- ativar todas as colunas e rolar a tabela lateralmente

Relato final com o resultado por largura.

## Notas técnicas

Nenhuma mudança de banco, schema ou regra de negócio. Apenas componentes de apresentação em `src/features/biblioteca/components/` e a rota `/biblioteca`. O componente `ScrollArea` continua disponível para outros usos onde a altura é explícita.
