# FSD — Especificação Funcional
## Biblioteca Pessoal de Referências Acadêmicas (my-academic-hub)

Foco: visão de negócio, telas e jornadas do usuário — não implementação
técnica (ver TDD para isso).

---

## 1. Perfil de usuário

Um único usuário, dono de todo o conteúdo. Sem fluxo de cadastro — acesso
concedido manualmente. Visitantes sem login só enxergam conteúdo
explicitamente marcado como público (uma fonte ou um projeto por vez, via
link direto).

---

## 2. Mapa de telas

| Tela | Status |
|---|---|
| Login | ✅ |
| Biblioteca (tabela principal de fontes + filtros) | ✅, expansão planejada |
| Modal "Nova fonte" / "Editar fonte" | ✅, campos novos planejados |
| Modal "Importar fontes" (RIS / link / PDF) | ✅, refinamento planejado |
| Tela de revisão de duplicatas | ✅, mesclagem por enriquecimento planejada |
| Gestão de tags | 🔧 planejada |
| Projetos (lista + detalhe) | ✅ |
| Página pública de fonte (`/s/:slug`) | ✅ |
| Página pública de projeto (`/p/:slug`) | ✅ |
| Aba "Busca sistemática / Estado da Arte" (dentro de um Projeto) | 🔧 planejada, fase futura |

---

## 3. Telas em detalhe

### 3.1 Biblioteca (tela principal)
- Tabela com colunas configuráveis (seletor de colunas visíveis) e
  ordenação clicável em qualquer coluna
- Painel lateral de filtros por faceta, cada uma com modo de combinação
  (qualquer uma / todas / nenhuma) quando aplicável
- Seleção múltipla de linhas → barra de ações em massa
- Busca textual livre (título, resumo — **planejado**: também sobre títulos
  alternativos e resumos multilíngues)
- **Planejado**: indicador visual de recorrência/aparições por fonte (ex.:
  badge "aparece em 3 buscas")

### 3.2 Modal "Editar fonte" / "Nova fonte"
- Todos os campos bibliográficos, autores/orientadores com autocomplete,
  palavras-chave e tags com autocomplete, upload de PDF
- Rolagem funcional em qualquer tamanho de tela (bug corrigido)
- **Planejado**: seção de títulos alternativos (somente leitura, populada
  pela importação — não editável manualmente, para não "inventar" tradução
  que a fonte original não tem); seção de resumos multilíngues; seção de
  links (página / PDF direto)

### 3.3 Modal "Importar fontes"
Três abas/fluxos — RIS, link, PDF — convergindo para a mesma tela de revisão
em lote:

- **RIS**: upload de um ou vários arquivos → tela de revisão com status por
  linha (completo / campos faltando / já existe)
- **Link**: cola URL → extração automática → mesma tela de revisão.
  **Planejado**: se DOI for identificado, mostrar indicação visual "dados
  enriquecidos via Crossref"
- **PDF**: upload → extração "melhor esforço", aviso explícito de precisão
  limitada → mesma tela de revisão. **Planejado**: botão opcional "Tentar
  extração com IA" quando a extração gratuita vier incompleta, com aviso de
  custo antes de confirmar o clique
- Ao final: relatório de quantas fontes foram importadas, quantas eram
  duplicata, quantas tiveram campo faltando

### 3.4 Tela de revisão de duplicatas
- Lista fontes marcadas para revisão ou que compartilham `chave_doc`
- Ação "marcar como variante" (mesma obra publicada em lugares diferentes —
  não funde, só agrupa visualmente)
- **Planejado**: ação "mesclar" — quando o mesmo DOI aparece via canais
  diferentes, propõe união dos campos automaticamente (campos exclusivos
  entram sem perguntar; conflitos reais pedem confirmação); histórico de
  aparições das duas entradas originais é preservado e somado na fonte final

### 3.5 Gestão de tags [planejada]
- Lista de tags com cor e contagem de fontes associadas
- Renomear, recolorir, apagar
- Atalho para filtrar a biblioteca por aquela tag

### 3.6 Projetos
- Lista de projetos, criar/editar/apagar
- Dentro de um projeto: lista de fontes (adicionar/remover individualmente,
  ou em lote a partir de uma seleção filtrada)
- Criação inline de projeto direto do menu "adicionar seleção a um projeto"
  (sem sair do fluxo)
- Toggle de compartilhamento público
- **Planejado**: sub-aba "Busca sistemática" (ver 3.8)

### 3.7 Páginas públicas
- Fonte pública: ficha completa somente-leitura + botão de citar
- Projeto público: lista das fontes do projeto

### 3.8 Aba "Busca sistemática / Estado da Arte" [planejada, dentro de um Projeto]

Diferença de fluxo em relação ao resto do sistema: aqui o **protocolo vem
antes dos dados** — o oposto da catalogação comum.

1. **Cadastro de eixos**: nome, idioma, descritores/sinônimos (PT/EN),
   função metodológica — equivalente à aba "Dicionário de Eixos" da
   planilha que orientou este desenho
2. **Geração de strings booleanas**: combinações de 2, 3, 4 eixos, com nível
   (exploratória / corpus de sustentação / corpus nuclear) e a pergunta
   metodológica que cada combinação responde
3. **Adaptação por repositório**: BDTD, CAPES, SciELO, LUME, cada um com
   suas regras de sintaxe já conhecidas
4. **Registro de execução**: data, resultados brutos, links coletados,
   status — cada execução gerada aqui e as fontes importadas a partir dela
   alimentam o mesmo histórico de aparições (seção 2.3 do TDD), agora com o
   contexto de qual combinação de eixos encontrou aquela fonte
5. Fontes que aparecem em várias combinações diferentes ganham indicador de
   recorrência mais alta — sinal de centralidade para o problema de pesquisa

---

## 4. Jornadas de usuário (fluxos ponta a ponta)

**Importar um lote de RIS do Mendeley**
Exportar do Mendeley → anexar no modal de importação → revisar campos
faltantes linha a linha → confirmar → relatório final de inserção/duplicata.

**Importar por link com enriquecimento automático**
Colar a URL de um artigo → sistema identifica DOI → consulta Crossref →
preenche metadado padronizado → mostra na tela de revisão já enriquecido →
confirmar.

**Resolver uma duplicata detectada entre RIS e link**
Sistema identifica mesmo DOI em dois canais diferentes → propõe mesclagem →
campos exclusivos somados automaticamente, conflitos reais pedem decisão →
histórico de aparições das duas entradas soma na fonte final.

**Montar uma coleção pro TCC a partir de um filtro**
Aplicar filtros (ex.: palavra-chave "ciberburocracia" E ano 2020–2026) →
selecionar resultados → "adicionar a um projeto" → criar o projeto na hora,
sem sair do fluxo.

**Gerar a lista de referências de um projeto**
Abrir o projeto → selecionar todas as fontes → "Gerar referências" →
lista em ordem alfabética, pronta para copiar, formatada conforme ABNT.

**Rodar uma revisão sistemática formal (Estado da Arte)** [planejado]
Criar projeto → cadastrar eixos temáticos → gerar strings booleanas →
adaptar por repositório → executar busca fora do sistema → importar os
resultados (RIS/link) associando à execução cadastrada → acompanhar
recorrência de cada fonte ao longo de múltiplas combinações de eixos.
