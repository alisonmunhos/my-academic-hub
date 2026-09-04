# SRS — Especificação de Requisitos de Software
## Biblioteca Pessoal de Referências Acadêmicas (my-academic-hub)

Versão consolidada a partir de todo o planejamento realizado. Marca claramente
o que **já está implementado e deve ser preservado** vs. o que está **planejado
para implementação**.

---

## 1. Introdução

### 1.1 Objetivo
Sistema pessoal de gerenciamento de referências bibliográficas acadêmicas
(equivalente a um Mendeley/Zotero sob medida), com importação automática
multi-canal, deduplicação inteligente por DOI, filtros avançados, e —
futuramente — um módulo de apoio a revisões sistemáticas de literatura
("Estado da Arte").

### 1.2 Escopo
Uso pessoal e individual (usuário único, sem cadastro público). Cobre o ciclo
completo: importação de fontes → organização (tags, projetos, filtros) →
formatação de citação → compartilhamento seletivo.

### 1.3 Definições
- **Fonte**: um registro bibliográfico (artigo, livro, tese, etc.)
- **Chave de deduplicação (`chave_doc`)**: DOI normalizado ou título+ano, na
  ausência de DOI
- **Faceta**: um campo filtrável no motor de filtros genérico
- **Evento de importação**: um registro de que uma fonte foi encontrada por um
  canal específico, em um momento específico

---

## 2. Visão geral do produto

Stack: React (Lovable) + Supabase/Postgres (Lovable Cloud) + Edge Functions +
GitHub (versionamento). Autenticação de usuário único, sem fluxo de cadastro
público. RLS (Row Level Security) em todas as tabelas.

---

## 3. Requisitos funcionais

### RF1 — Autenticação [✅ implementado]
- Login único (e-mail/senha), sem tela ou rota de cadastro público
- Usuário criado manualmente no painel do Supabase

### RF2 — Cadastro manual de fonte [✅ implementado]
- Formulário completo cobrindo todos os campos de `sources`
- Autocomplete de autores/orientadores/coorientadores com criação inline
- Autocomplete de palavras-chave e tags com criação inline
- Upload de PDF anexado

### RF3 — Importação por RIS [✅ implementado, ⚠️ em refinamento]
- Upload de um ou vários arquivos `.ris`
- Extração determinística de todas as tags conhecidas (sem uso de IA)
- **Planejado**: mapeamento ampliado — `TT` (títulos alternativos), `AB`
  múltiplo (resumos multilíngues), `SN` (ISSN), `L1`-`L4` (links diretos,
  inclusive PDF), `DB` (base de origem), `ID` (identificador externo);
  gravação do registro bruto completo (`raw_import_data`) como rede de
  segurança contra qualquer tag não mapeada
- Tela de revisão em lote antes de confirmar a importação, com indicação de
  campos ausentes por registro

### RF4 — Importação por link [✅ implementado, ⚠️ em refinamento]
- Extração de metadado via Edge Function (meta tags `citation_*` → Dublin
  Core → Open Graph, sem IA)
- **Planejado**: quando a fonte tiver DOI extraído/identificável, este passa
  a ser tratado como o identificador primário para deduplicação e
  enriquecimento (ver RF6)

### RF5 — Importação por PDF [✅ implementado — "melhor esforço"]
- Metadados embutidos do PDF + heurística de texto da primeira página, sem
  custo de IA
- Nunca insere sem revisão manual
- Aviso explícito de precisão limitada na interface

### RF6 — Enriquecimento e padronização por DOI [🔧 planejado]
- Toda fonte com DOI (de qualquer canal de entrada) consulta a API pública e
  gratuita do Crossref
- Crossref vira a camada de verdade para: título, autores, `container_title`,
  ano, editora, ISSN, idioma normalizado
- RIS e link passam a ser **complementares** entre si (cada um contribui com
  o que sabe fazer bem — resumo, palavras-chave, links diretos) em vez de
  concorrentes na definição do registro
- Resolve a inconsistência de idioma hoje observada entre importações de
  origens diferentes

### RF7 — Detecção e mesclagem de duplicatas [✅ base implementada, 🔧 mesclagem por enriquecimento planejada]
- Detecção automática por `chave_doc` (já implementado)
- **Planejado**: ao detectar a mesma fonte por um canal diferente do já
  cadastrado, propor mesclagem automática por enriquecimento — campos
  exclusivos de um dos lados entram sem confirmação; conflitos reais (mesmo
  campo, valores diferentes) exigem confirmação do usuário
- Tela de revisão de duplicatas (marcar como variante, ignorar) [✅ implementado]

### RF8 — Histórico de importação e contagem de aparições [🔧 planejado]
- Todo evento de importação (por qualquer canal: RIS, link, PDF, manual, ou
  busca sistemática formal) gera um registro de "aparição" ligado à fonte
- Esse histórico **nunca é apagado** em uma mesclagem — os eventos das duas
  fontes originais passam a apontar para a fonte sobrevivente
- A contagem de aparições funciona desde a primeira importação, sem exigir
  nenhum protocolo formal de busca cadastrado
- Serve como indicador de relevância/qualidade (quanto mais vezes uma fonte
  reaparece, mais central ela é ao tema de pesquisa)

### RF9 — Palavras-chave [✅ implementado, bug corrigido]
- Individualizadas (uma linha por palavra-chave, nunca texto livre concatenado)
- Deduplicação por `normalized_label`, tanto dentro de uma mesma importação
  quanto entre fontes diferentes — via upsert seguro (corrigido; bug anterior
  causava perda silenciosa de palavras-chave)

### RF10 — Tags pessoais [✅ estrutura implementada, 🔧 tela de gestão planejada]
- Tag livre, com cor, diferente de palavra-chave (que vem do documento)
- **Planejado**: tela de gestão (renomear, recolorir, ver contagem de uso,
  apagar); aplicação em lote

### RF11 — Filtros [✅ implementado como motor genérico]
- Motor orientado a dados: cada faceta definida uma vez, com modos de
  combinação (OR/AND/NOT conforme aplicável); facetas sempre combinam em AND
  entre si
- Facetas hoje: tipo de fonte, ano, idioma, status de leitura, autor,
  orientador/coorientador, palavra-chave, tag, projeto
- **Planejado, mesma arquitetura, sem lógica nova**: possui DOI, status de
  duplicata, base de dados de origem, possui PDF direto, possui título/resumo
  multilíngue

### RF12 — Projetos (coleções) [✅ implementado]
- Criação a partir de seleção filtrada, ou a partir do zero
- Criação inline ao adicionar fontes selecionadas, sem sair do fluxo
- Adição/remoção manual de fontes independente do filtro original

### RF13 — Ações em massa [✅ base implementada — adicionar a projeto, gerar referências; 🔧 expansão planejada]
- **Planejado**: aplicar tag/cor/status de leitura em lote; favoritar em
  lote; mesclar seleção manualmente; excluir em lote com confirmação;
  exportar seleção (`.bib`/`.ris`) — fase posterior, junto de RF14

### RF14 — Formatação de citação (ABNT) [✅ regras definidas como documento determinístico; implementação de UI pendente — fase 2]
- Toda formatação é **determinística** (funções puras, sem IA) — templates
  por tipo de fonte, regras de autor por quantidade, apud, citação direta/
  indireta, conforme NBR 6023:2018 e NBR 10520:2023
- Botão "Citar" com cópia de referência completa + citação integrada +
  parentética; geração em lote de lista de referências ordenada

### RF15 — Compartilhamento por link [✅ implementado]
- Toggle `is_public` em fonte e em projeto; rotas públicas somente-leitura
  (`/s/:slug`, `/p/:slug`), sem exigir login, respeitando RLS

### RF16 — Extração de PDF assistida por IA [🔧 planejado, opcional, sob demanda]
- Camada adicional **opcional**, acionada por clique do usuário quando a
  extração gratuita (RF5) falhar ou vier incompleta
- Usa Claude Haiku 4.5 via Edge Function; custo estimado de US$ 0,003–0,005
  por PDF processado
- Resultado sempre passa por revisão manual antes de salvar — nunca insere
  automaticamente

### RF17 — Módulo de Busca Sistemática / Estado da Arte [🔧 planejado, fase futura]
- Camada opcional por Projeto: cadastro de eixos temáticos (com descritores
  PT/EN), geração de combinações booleanas, adaptação por repositório
  (BDTD/CAPES/SciELO/LUME), registro de execuções de busca
- Sources importadas nesse contexto geram os mesmos eventos de importação de
  RF8, apenas com contexto adicional (qual busca formal encontrou aquela fonte)
- Diferença fundamental de fluxo: aqui o protocolo (eixos + strings) é
  cadastrado **antes** de existir qualquer fonte — ao contrário do fluxo de
  catalogação comum, que é "importa e organiza depois"

---

## 4. Requisitos não funcionais

- **RNF1 — Responsividade**: interface deve funcionar corretamente em
  qualquer largura de tela (testado formalmente em 1920/1366/1024/768px),
  incluindo rolagem vertical de modais e horizontal de tabelas com todas as
  colunas ativas
- **RNF2 — Custo padrão zero**: toda funcionalidade principal opera sem custo
  de API paga; qualquer uso de IA é opcional, sob controle explícito do
  usuário, com custo transparente e estimado previamente
- **RNF3 — Zero perda de dado na importação**: todo campo presente em um
  arquivo importado deve ser preservado, seja em campo estruturado, seja no
  registro bruto de segurança (`raw_import_data`)
- **RNF4 — Segurança**: RLS em 100% das tabelas; usuário único sem exposição
  de credenciais no frontend; segredos de API (Anthropic) apenas em variáveis
  de ambiente do backend (Supabase Secrets)
- **RNF5 — Extensibilidade dos filtros**: novas facetas devem ser
  adicionáveis via configuração, sem exigir reescrita da lógica de combinação

---

## 5. Fora de escopo (por decisão explícita, revisitável no futuro)

- Assistente de IA capaz de executar ações autônomas no sistema (mesclar,
  buscar, gerar relatórios por comando em linguagem natural) — adiado
  deliberadamente para uma fase futura
- Treinamento/fine-tuning de modelo de IA — desnecessário; refinamento de
  regras de formatação acontece via documento de regras determinísticas,
  mantido e versionado externamente ao modelo
