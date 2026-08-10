/** Normaliza um DOI: remove prefixo de URL, "doi:", espaços e caixa. */
export function normalizeDoi(doi: string | null | undefined): string | null {
  if (!doi) return null;
  let value = doi.trim().toLowerCase();
  if (!value) return null;
  value = value.replace(/^https?:\/\/(dx\.)?doi\.org\//, "");
  value = value.replace(/^doi:\s*/, "");
  value = value.trim();
  return value || null;
}

function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Chave de deduplicação: DOI normalizado, ou título normalizado + ano. */
export function buildChaveDoc(
  title: string,
  year: number | null | undefined,
  doi: string | null | undefined,
): string {
  const normalizedDoi = normalizeDoi(doi);
  if (normalizedDoi) return `doi:${normalizedDoi}`;
  const slug = slugifyTitle(title || "");
  return `td:${slug}-${year ?? "sd"}`;
}
