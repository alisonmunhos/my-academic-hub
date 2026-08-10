import type { SourceRow } from "../hooks/useSources";

export interface DuplicateGroup {
  chaveDoc: string;
  sources: SourceRow[];
}

export interface DuplicateReview {
  groups: DuplicateGroup[];
  standalone: SourceRow[];
}

function isUnresolved(source: SourceRow): boolean {
  return source.duplicate_status !== "Não" && source.duplicate_status !== "Variante confirmada";
}

/**
 * Fontes candidatas a duplicata: com duplicate_status = 'Revisar' (ou nulo)
 * que compartilham chave_doc com outra fonte não resolvida, agrupadas por
 * chave_doc. Fontes com duplicate_status = 'Não' ou 'Variante confirmada'
 * já foram resolvidas e não aparecem, mesmo que ainda compartilhem chave_doc.
 */
export function computeDuplicateReview(sources: SourceRow[]): DuplicateReview {
  const unresolved = sources.filter(isUnresolved);

  const byChaveDoc = new Map<string, SourceRow[]>();
  for (const source of unresolved) {
    if (!source.chave_doc) continue;
    const list = byChaveDoc.get(source.chave_doc) ?? [];
    list.push(source);
    byChaveDoc.set(source.chave_doc, list);
  }

  const groups: DuplicateGroup[] = [];
  const groupedIds = new Set<string>();
  for (const [chaveDoc, group] of byChaveDoc) {
    if (group.length < 2) continue;
    groups.push({ chaveDoc, sources: group });
    for (const s of group) groupedIds.add(s.id);
  }

  const standalone = unresolved.filter(
    (s) => s.duplicate_status === "Revisar" && !groupedIds.has(s.id),
  );

  return { groups, standalone };
}
