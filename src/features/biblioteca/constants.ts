export const SOURCE_TYPES = [
  "Artigo",
  "Livro",
  "Capítulo de livro",
  "Tese",
  "Dissertação",
  "TCC",
  "Anais",
  "Website",
  "Outro",
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const LANGUAGES = ["PT", "EN", "ES", "Outro"] as const;
export type Language = (typeof LANGUAGES)[number];

export const STATUS_READING = ["Não lido", "Em leitura", "Lido", "Anotado"] as const;
export type StatusReading = (typeof STATUS_READING)[number];

export const PERSON_ROLES = [
  "autor",
  "orientador",
  "coorientador",
  "organizador",
  "tradutor",
  "ilustrador",
] as const;
export type PersonRole = (typeof PERSON_ROLES)[number];

export const PERSON_ROLE_LABELS: Record<PersonRole, string> = {
  autor: "Autor",
  orientador: "Orientador",
  coorientador: "Coorientador",
  organizador: "Organizador",
  tradutor: "Tradutor",
  ilustrador: "Ilustrador",
};

export const DUPLICATE_STATUS = ["Não", "Revisar", "Variante confirmada"] as const;
export type DuplicateStatus = (typeof DUPLICATE_STATUS)[number];

export const COLOR_TAG_PRESETS = [
  { value: "#ef4444", label: "Vermelho" },
  { value: "#f97316", label: "Laranja" },
  { value: "#eab308", label: "Amarelo" },
  { value: "#22c55e", label: "Verde" },
  { value: "#0ea5e9", label: "Azul" },
  { value: "#8b5cf6", label: "Roxo" },
  { value: "#ec4899", label: "Rosa" },
] as const;

export const TAG_COLOR_PRESETS = COLOR_TAG_PRESETS;

export interface TableColumnDef {
  key: string;
  label: string;
  sortable: boolean;
}

export const ALL_COLUMNS: TableColumnDef[] = [
  { key: "authors", label: "Autores", sortable: true },
  { key: "year", label: "Ano", sortable: true },
  { key: "source_type", label: "Tipo", sortable: true },
  { key: "status_reading", label: "Status de leitura", sortable: true },
  { key: "is_favorite", label: "Favorito", sortable: true },
  { key: "color_tag", label: "Cor", sortable: true },
  { key: "container_title", label: "Publicado em", sortable: true },
  { key: "language", label: "Idioma", sortable: true },
  { key: "has_pdf", label: "PDF", sortable: true },
  { key: "created_at", label: "Adicionado em", sortable: true },
];

export const DEFAULT_VISIBLE_COLUMNS = [
  "authors",
  "year",
  "source_type",
  "status_reading",
  "is_favorite",
  "color_tag",
];
