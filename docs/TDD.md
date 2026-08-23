# TDD — Documento de Design Técnico
## Biblioteca Pessoal de Referências Acadêmicas (my-academic-hub)

---

## 1. Arquitetura geral

```
GitHub (código, versionado) ──sync bidirecional──> Lovable (editor + preview)
                                                          │
                                                    Lovable Cloud
                                                    (Supabase gerenciado)
                                                          │
                                    ┌─────────────────────┼─────────────────────┐
                              Postgres + RLS        Edge Functions          Storage
                                                    (extract-metadata,      (bucket "pdfs")
                                                     import RIS,
                                                     doi-enrich [novo],
                                                     pdf-extract-ai [novo, opcional])
```

- **Frontend**: React + Tailwind + shadcn/ui (gerado inicialmente pelo Lovable)
- **Backend**: Postgres via Supabase (Lovable Cloud), com RLS em toda tabela
- **Integrações externas**:
  - Crossref API (`api.crossref.org`) — gratuita, sem chave, para
    enriquecimento por DOI [planejado]
  - Anthropic API (Claude Haiku 4.5) — paga por token, opcional, para
    extração de PDF sob demanda [planejado]

---

## 2. Modelo de dados

### 2.1 Núcleo já implementado (preservar)

```
sources (id, owner_id, public_slug, is_public, source_type, title, year,
  container_title, volume, issue, pages, months, place, publisher, doi, url,
  access_date, language, status_reading, has_pdf, pdf_storage_path, abstract,
  personal_notes, citation_full_abnt, citation_integrated,
  citation_parenthetical, color_tag, is_favorite, duplicate_group_id,
  duplicate_status, chave_doc, created_at, updated_at)

people (id, owner_id, full_name, normalized_name)
source_people (source_id, person_id, role, position)
  -- role: autor | orientador | coorientador | organizador | tradutor | ilustrador

keywords (id, owner_id, label, normalized_label)  -- unique(owner_id, normalized_label)
source_keywords (source_id, keyword_id)

tags (id, owner_id, label, color)
source_tags (source_id, tag_id)

projects (id, owner_id, name, description, is_public, public_slug, created_at)
project_sources (project_id, source_id, added_at)

user_preferences (owner_id, visible_columns, updated_at)
```

RLS em todas: dono (`auth.uid() = owner_id`) tem acesso total; leitura pública
liberada quando `is_public = true` (via `sources`/`projects` e cascata para
tabelas de junção).

### 2.2 Extensão — riqueza de importação [planejado]

```sql
-- Em sources, adicionar:
alter table sources add column issn_isbn text;
alter table sources add column database_source text;   -- tag RIS "DB"
alter table sources add column external_id text;        -- tag RIS "ID"
alter table sources add column raw_import_data jsonb;    -- registro bruto completo, sempre gravado

-- Títulos alternativos/traduzidos (tag RIS "TT", pode repetir)
source_titles (id, source_id, title_text, language, title_type)
  -- title_type: 'principal' | 'traduzido'

-- Resumos em múltiplos idiomas (tag RIS "AB", pode repetir)
source_abstracts (id, source_id, abstract_text, language)

-- Links múltiplos (tag RIS "UR" + "L1"-"L4")
source_links (id, source_id, url, link_type, label)
  -- link_type: 'pagina' | 'pdf_direto' | 'outro'
```

Regra de importação: **nunca criar entrada vazia** para um idioma/link que o
arquivo de origem não forneceu. `raw_import_data` grava o registro bruto
completo (todas as tags, tal como vieram) independentemente do que também foi
estruturado — rede de segurança contra qualquer tag não mapeada explicitamente.

### 2.3 Histórico de importação / aparições [planejado — substitui o desenho anterior restrito a busca formal]

```sql
source_import_events (
  id                  uuid primary key default gen_random_uuid(),
  source_id           uuid not null references sources(id) on delete cascade,
  import_channel      text not null check (import_channel in
                        ('ris','link','pdf','manual','busca_sistematica')),
  search_execution_id uuid references search_executions(id),  -- opcional
  origin_reference    text,   -- nome do arquivo RIS, URL, etc.
  occurred_at         timestamptz not null default now()
)
```

**Ponto crítico de design**: este log é populado desde a **primeira**
importação de qualquer fonte, por qualquer canal — não depende de nenhum
protocolo de busca sistemática cadastrado. `search_execution_id` só é
preenchido quando a importação estiver de fato vinculada a uma busca formal
(RF17). A contagem de aparições (`count(*) group by source_id`) funciona em
qualquer caso.

**Regra de mesclagem**: ao mesclar duas fontes (mesmo DOI, canais diferentes),
todos os `source_import_events` das duas entradas originais são
re-atribuídos (`UPDATE ... SET source_id = <sobrevivente>`) — nenhum evento é
apagado. Isso preserva o histórico completo e a contagem real de aparições
como indicador de relevância.

### 2.4 Busca sistemática / Estado da Arte [planejado, fase futura]

```sql
research_axes (id, owner_id, project_id, axis_code, axis_label, language,
  description, descriptors[], methodological_role, notes)

search_strings (id, owner_id, project_id, string_code, level, language,
  axes_used uuid[], methodological_question, importance, boolean_string,
  collect_links, observations)

search_repository_adaptations (id, owner_id, search_string_id, repository,
  suggested_field, temporal_filter, language_priority, repository_rules,
  suggested_order, adapted_string)

search_executions (id, owner_id, project_id, repository_adaptation_id,
  executed_at, year_filter_start, year_filter_end, raw_results_count,
  links_collected, status, observations)
```

`source_recurrence` (view): calcula `occurrence_count`,
`preliminary_recurrence` (Baixa/Média/Alta) e as combinações em que a fonte
apareceu, **a partir de `source_import_events`** (não mais só de execuções
formais) — sempre atual, nunca um campo manual.

### 2.5 Escopo do DOI/Crossref [planejado]

Fluxo de enriquecimento, executado como Edge Function (`doi-enrich`) chamada
sempre que uma fonte com DOI é criada ou atualizada, de qualquer canal:

1. Consulta `https://api.crossref.org/works/{doi}` (gratuito, sem chave,
   sem limite prático para uso pessoal — respeitar boas práticas de
   `User-Agent` e taxa de requisição)
2. Usa os campos do Crossref como base de verdade: título, autores,
   `container_title`, ano, editora, ISSN, idioma (normalizado ISO)
3. Campos que o Crossref não cobre bem (resumo, palavras-chave, link direto
   de PDF) continuam vindo de RIS/link, sem conflito — não sobrescrevem o
   núcleo vindo do Crossref
4. Fontes sem DOI seguem o fluxo atual (chave por título+ano), sem alteração

---

## 3. Motor de filtros — arquitetura

Facetas definidas como configuração (não hardcoded por campo):

```ts
type FacetDefinition = {
  key: string
  label: string
  sourceField: string          // campo ou relação de origem
  supportedModes: ('OR'|'AND'|'NOT')[]
}
```

Cada faceta ativa gera uma subquery (`EXISTS` para relações
muitos-para-muitos); todas as facetas ativas se combinam sempre em `AND`.
Adicionar uma faceta nova = adicionar uma entrada de configuração, sem tocar
na lógica de combinação.

---

## 4. Integração com IA (opcional) — extração de PDF

- Edge Function separada (`pdf-extract-ai`), acionada só por clique explícito
  do usuário na tela de revisão de importação, quando a extração gratuita
  falhar/ficar incompleta
- Modelo: Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) — custo ~US$
  0,003–0,005 por PDF (1 página de texto de entrada + resposta JSON curta)
- Chave de API armazenada como Secret do Supabase (nunca no frontend)
- Resposta sempre estruturada (JSON) e sempre passa pela mesma tela de
  revisão manual já usada pelos outros canais — nunca insere automaticamente

## 5. Formatação de citação — determinística, sem IA

Implementada como funções puras (entrada: campos estruturados da fonte;
saída: string formatada), baseadas no documento de regras
`regras_formatacao_citacoes.md` (NBR 6023:2018 + NBR 10520:2023), com casos
de teste conhecidos para validação automatizada antes de considerar pronto.
Nenhuma chamada de IA nesse caminho.

---

## 6. Débito técnico já resolvido (histórico, para referência)

- **Bug de palavra-chave duplicada/perdida**: causa raiz era uso de
  `Promise.all` para vincular keywords em paralelo, causando gravação parcial
  silenciosa em caso de colisão de `normalized_label` (dentro da mesma
  entrada ou entre fontes diferentes). Corrigido com upsert sequencial +
  rollback transacional real.
- **Bug de rolagem por mouse wheel em modais**: causa raiz não totalmente
  confirmada isoladamente, mas resolvida como parte da correção geral de
  responsividade (ver RNF1) — testada em 4 larguras de tela.
- **Perda de metadado em importação RIS rica** (`TT`, `AB` múltiplo, `SN`,
  `L1`, `DB`): motivou a extensão de schema da seção 2.2.

---

## 7. Considerações de custo (referência rápida)

| Item | Custo |
|---|---|
| Supabase (Lovable Cloud), free tier | 500 MB banco, 1 GB storage de arquivo — suficiente para o volume atual |
| Crossref API | Gratuito, sem chave |
| Anthropic API (Haiku 4.5), extração de PDF opcional | ~US$ 0,003–0,005 por PDF, só quando acionado manualmente |
| Formatação de citação, filtros, importação RIS/link | Zero custo (sem IA) |
