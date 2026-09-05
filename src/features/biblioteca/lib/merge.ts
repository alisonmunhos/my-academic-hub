import type { SourceRow } from "../hooks/useSources";
import { dedupeByNormalized } from "./upsertLookup";
import {
  parseKeywordList,
  parseSemicolonList,
  type CandidateLink,
  type ImportCandidate,
  type LocalizedText,
} from "./import";

export type MergeFieldKey =
  | "title"
  | "sourceType"
  | "year"
  | "containerTitle"
  | "volume"
  | "issue"
  | "pages"
  | "publisher"
  | "place"
  | "doi"
  | "url"
  | "abstract"
  | "language"
  | "issnIsbn"
  | "databaseSource"
  | "externalId";

export const MERGE_FIELD_LABELS: Record<MergeFieldKey, string> = {
  title: "Título",
  sourceType: "Tipo",
  year: "Ano",
  containerTitle: "Veículo / publicado em",
  volume: "Volume",
  issue: "Fascículo",
  pages: "Páginas",
  publisher: "Editora",
  place: "Local",
  doi: "DOI",
  url: "URL",
  abstract: "Resumo",
  language: "Idioma",
  issnIsbn: "ISSN/ISBN",
  databaseSource: "Base de origem",
  externalId: "ID externo",
};

const MERGE_FIELDS: MergeFieldKey[] = Object.keys(MERGE_FIELD_LABELS) as MergeFieldKey[];

/**
 * Só existem duas escolhas por campo em conflito: qual valor fica no campo
 * escalar de `sources`. Nunca há perda — o texto que "perder" continua
 * presente em source_titles/source_abstracts/source_links (sempre multi-valor,
 * ver newTitles/newAbstracts/newLinks abaixo), então não existe opção
 * "manter os dois" separada: os dois já convivem nas tabelas relacionadas,
 * a decisão aqui é só sobre qual representa o registro no campo único.
 */
export type MergeDecision = "existing" | "new";
export type MergeDecisions = Partial<Record<MergeFieldKey, MergeDecision>>;

export interface MergeFieldDiff {
  field: MergeFieldKey;
  label: string;
  existingValue: string | number | null;
  candidateValue: string | number | null;
  status: "same" | "only-existing" | "only-new" | "conflict";
}

export interface MergePlan {
  existing: SourceRow;
  fieldDiffs: MergeFieldDiff[];
  hasConflicts: boolean;
  newTitles: LocalizedText[];
  newAbstracts: LocalizedText[];
  newLinks: CandidateLink[];
  newKeywordLabels: string[];
  newAuthorNames: string[];
}

function norm(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function existingFieldValue(existing: SourceRow, field: MergeFieldKey): string | number | null {
  switch (field) {
    case "title":
      return existing.title;
    case "sourceType":
      return existing.source_type;
    case "year":
      return existing.year;
    case "containerTitle":
      return existing.container_title;
    case "volume":
      return existing.volume;
    case "issue":
      return existing.issue;
    case "pages":
      return existing.pages;
    case "publisher":
      return existing.publisher;
    case "place":
      return existing.place;
    case "doi":
      return existing.doi;
    case "url":
      return existing.url;
    case "abstract":
      return existing.abstract;
    case "language":
      return existing.language;
    case "issnIsbn":
      return existing.issn_isbn;
    case "databaseSource":
      return existing.database_source;
    case "externalId":
      return existing.external_id;
  }
}

function candidateFieldValue(
  candidate: ImportCandidate,
  field: MergeFieldKey,
): string | number | null {
  switch (field) {
    case "title":
      return candidate.title;
    case "sourceType":
      return candidate.sourceType;
    case "year":
      return candidate.year;
    case "containerTitle":
      return candidate.containerTitle;
    case "volume":
      return candidate.volume;
    case "issue":
      return candidate.issue;
    case "pages":
      return candidate.pages;
    case "publisher":
      return candidate.publisher;
    case "place":
      return candidate.place;
    case "doi":
      return candidate.doi;
    case "url":
      return candidate.url;
    case "abstract":
      return candidate.abstract;
    case "language":
      return candidate.language;
    case "issnIsbn":
      return candidate.issnIsbn;
    case "databaseSource":
      return candidate.databaseSource;
    case "externalId":
      return candidate.externalId;
  }
}

/** Coluna real em `sources` para gravar o valor decidido de um campo de merge. */
export function mergeFieldColumn(field: MergeFieldKey): string {
  const map: Record<MergeFieldKey, string> = {
    title: "title",
    sourceType: "source_type",
    year: "year",
    containerTitle: "container_title",
    volume: "volume",
    issue: "issue",
    pages: "pages",
    publisher: "publisher",
    place: "place",
    doi: "doi",
    url: "url",
    abstract: "abstract",
    language: "language",
    issnIsbn: "issn_isbn",
    databaseSource: "database_source",
    externalId: "external_id",
  };
  return map[field];
}

/**
 * Compara uma fonte já existente com um candidato de importação que bateu na
 * mesma `chave_doc`. Campos só de um lado entram sem perguntar; campos com
 * valores diferentes nos dois lados viram conflito (RF7 — mesclagem por
 * enriquecimento). Títulos/resumos/links/palavras-chave/autores são tratados
 * à parte (sempre multi-valor, nunca conflito): o que o candidato trouxer e a
 * fonte existente ainda não tiver é adicionado.
 */
export function computeMergePlan(existing: SourceRow, candidate: ImportCandidate): MergePlan {
  const fieldDiffs: MergeFieldDiff[] = MERGE_FIELDS.map((field) => {
    const existingValue = existingFieldValue(existing, field);
    const candidateValue = candidateFieldValue(candidate, field);
    const existingEmpty = norm(existingValue) === "";
    const candidateEmpty = norm(candidateValue) === "";

    let status: MergeFieldDiff["status"];
    if (existingEmpty && candidateEmpty) status = "same";
    else if (existingEmpty) status = "only-new";
    else if (candidateEmpty) status = "only-existing";
    else if (norm(existingValue) === norm(candidateValue)) status = "same";
    else status = "conflict";

    return { field, label: MERGE_FIELD_LABELS[field], existingValue, candidateValue, status };
  });

  const existingTitleTexts = new Set(
    existing.source_titles.map((t) => norm(t.title_text).toLowerCase()),
  );
  const candidateTitleRows: LocalizedText[] = [
    { text: candidate.title, language: candidate.language },
    ...candidate.altTitles,
  ];
  const newTitles = candidateTitleRows.filter(
    (t) => t.text.trim() && !existingTitleTexts.has(norm(t.text).toLowerCase()),
  );

  const existingAbstractTexts = new Set(
    existing.source_abstracts.map((a) => norm(a.abstract_text).toLowerCase()),
  );
  const candidateAbstractRows: LocalizedText[] =
    candidate.abstracts.length > 0
      ? candidate.abstracts
      : candidate.abstract.trim()
        ? [{ text: candidate.abstract.trim(), language: candidate.language }]
        : [];
  const newAbstracts = candidateAbstractRows.filter(
    (a) => a.text.trim() && !existingAbstractTexts.has(norm(a.text).toLowerCase()),
  );

  const existingLinkUrls = new Set(existing.source_links.map((l) => norm(l.url).toLowerCase()));
  const candidateLinkRows: CandidateLink[] =
    candidate.links.length > 0
      ? candidate.links
      : candidate.url.trim()
        ? [{ url: candidate.url.trim(), linkType: "pagina" as const }]
        : [];
  const newLinks = candidateLinkRows.filter(
    (l) => l.url.trim() && !existingLinkUrls.has(norm(l.url).toLowerCase()),
  );

  const existingKeywordLabels = new Set(
    existing.source_keywords.map((sk) => norm(sk.keywords?.label).toLowerCase()).filter(Boolean),
  );
  const candidateKeywordLabels = dedupeByNormalized(parseKeywordList(candidate.keywords));
  const newKeywordLabels = candidateKeywordLabels.filter(
    (k) => !existingKeywordLabels.has(k.toLowerCase()),
  );

  const existingAuthorNames = new Set(
    existing.source_people
      .filter((sp) => sp.role === "autor")
      .map((sp) => norm(sp.people?.full_name).toLowerCase())
      .filter(Boolean),
  );
  const candidateAuthorNames = dedupeByNormalized(parseSemicolonList(candidate.authors));
  const newAuthorNames = candidateAuthorNames.filter(
    (n) => !existingAuthorNames.has(n.toLowerCase()),
  );

  return {
    existing,
    fieldDiffs,
    hasConflicts: fieldDiffs.some((d) => d.status === "conflict"),
    newTitles,
    newAbstracts,
    newLinks,
    newKeywordLabels,
    newAuthorNames,
  };
}

/** Um plano só está pronto para aplicar quando todo conflito tiver uma decisão explícita do usuário. */
export function isMergeFullyResolved(plan: MergePlan, decisions: MergeDecisions): boolean {
  return plan.fieldDiffs
    .filter((d) => d.status === "conflict")
    .every((d) => decisions[d.field] !== undefined);
}

export interface ResolvedMerge {
  /** Valores decididos para as colunas escalares de `sources` que mudam (chave = MergeFieldKey). */
  sourceUpdate: Partial<Record<MergeFieldKey, string | number | null>>;
  titleRows: LocalizedText[];
  abstractRows: LocalizedText[];
  linkRows: CandidateLink[];
}

/**
 * Aplica as decisões de conflito sobre o plano e devolve exatamente o que
 * precisa ser escrito. Campos "only-new" sempre entram. Para um campo em
 * conflito decidido "new" (o valor do candidato substitui o da fonte
 * existente), o valor antigo é preservado como linha extra em
 * source_titles/abstracts/links — rede de segurança para o caso (raro, mas
 * possível) de uma fonte editada manualmente ter o campo único
 * (`sources.title`/`abstract`/`url`) fora de sincronia com a tabela
 * multi-valor correspondente. Decisão ausente para um conflito é tratada
 * como "existing" (mais seguro: nada muda).
 */
export function resolveMergePlan(plan: MergePlan, decisions: MergeDecisions): ResolvedMerge {
  const sourceUpdate: Partial<Record<MergeFieldKey, string | number | null>> = {};
  const extraTitles: LocalizedText[] = [];
  const extraAbstracts: LocalizedText[] = [];
  const extraLinks: CandidateLink[] = [];

  for (const diff of plan.fieldDiffs) {
    if (diff.status === "only-new") {
      sourceUpdate[diff.field] = diff.candidateValue;
      continue;
    }
    if (diff.status !== "conflict") continue;

    const decision = decisions[diff.field] ?? "existing";
    if (decision !== "new") continue;

    sourceUpdate[diff.field] = diff.candidateValue;
    const oldValue = typeof diff.existingValue === "string" ? diff.existingValue.trim() : "";
    if (!oldValue) continue;
    if (diff.field === "title") extraTitles.push({ text: oldValue, language: null });
    if (diff.field === "abstract") extraAbstracts.push({ text: oldValue, language: null });
    if (diff.field === "url") extraLinks.push({ url: oldValue, linkType: "pagina" });
  }

  const existingTitleTexts = new Set(
    plan.existing.source_titles.map((t) => norm(t.title_text).toLowerCase()),
  );
  const existingAbstractTexts = new Set(
    plan.existing.source_abstracts.map((a) => norm(a.abstract_text).toLowerCase()),
  );
  const existingLinkUrls = new Set(
    plan.existing.source_links.map((l) => norm(l.url).toLowerCase()),
  );

  function dedupeAgainst<T>(rows: T[], text: (row: T) => string, already: Set<string>): T[] {
    const seen = new Set<string>();
    const out: T[] = [];
    for (const row of rows) {
      const key = norm(text(row)).toLowerCase();
      if (!key || already.has(key) || seen.has(key)) continue;
      seen.add(key);
      out.push(row);
    }
    return out;
  }

  return {
    sourceUpdate,
    titleRows: dedupeAgainst(
      [...plan.newTitles, ...extraTitles],
      (t) => t.text,
      existingTitleTexts,
    ),
    abstractRows: dedupeAgainst(
      [...plan.newAbstracts, ...extraAbstracts],
      (a) => a.text,
      existingAbstractTexts,
    ),
    linkRows: dedupeAgainst([...plan.newLinks, ...extraLinks], (l) => l.url, existingLinkUrls),
  };
}
