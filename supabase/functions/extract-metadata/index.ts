import { corsHeaders } from "../_shared/cors.ts";

interface ExtractedMetadata {
  found: boolean;
  metadataSource: "citation" | "dublin_core" | "open_graph" | "none";
  title: string;
  authors: string[];
  year: number | null;
  doi: string;
  containerTitle: string;
  abstract: string;
  keywords: string[];
  language: string;
  sourceTypeHint: string;
  url: string;
}

const FETCH_TIMEOUT_MS = 10_000;
const MAX_BYTES = 3_000_000;

function isBlockedHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (lower === "localhost" || lower.endsWith(".local")) return true;
  if (lower === "0.0.0.0" || lower === "::1" || lower === "127.0.0.1") return true;
  if (/^127\./.test(lower)) return true;
  if (/^10\./.test(lower)) return true;
  if (/^192\.168\./.test(lower)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(lower)) return true;
  return false;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function extractMetaTags(html: string): Map<string, string[]> {
  const result = new Map<string, string[]>();
  const metaTagRegex = /<meta\s+[^>]*>/gi;
  const attrRegex = /([a-zA-Z:_-]+)\s*=\s*"([^"]*)"|([a-zA-Z:_-]+)\s*=\s*'([^']*)'/g;

  for (const tagMatch of html.matchAll(metaTagRegex)) {
    const tag = tagMatch[0];
    const attrs: Record<string, string> = {};
    for (const attrMatch of tag.matchAll(attrRegex)) {
      const key = (attrMatch[1] ?? attrMatch[3])?.toLowerCase();
      const value = attrMatch[2] ?? attrMatch[4];
      if (key) attrs[key] = decodeEntities(value ?? "");
    }
    const key = (attrs["name"] ?? attrs["property"])?.toLowerCase();
    const content = attrs["content"];
    if (key && content !== undefined) {
      const list = result.get(key) ?? [];
      list.push(content);
      result.set(key, list);
    }
  }
  return result;
}

function firstYear(...values: (string | undefined)[]): number | null {
  for (const value of values) {
    if (!value) continue;
    const match = value.match(/\d{4}/);
    if (match) return Number(match[0]);
  }
  return null;
}

function extract(meta: Map<string, string[]>, requestUrl: string): ExtractedMetadata {
  const get = (key: string) => meta.get(key)?.[0];
  const getAll = (key: string) => meta.get(key) ?? [];

  const citationTitle = get("citation_title");
  const citationAuthors = getAll("citation_author");
  const citationDate = get("citation_publication_date") ?? get("citation_date");
  const citationDoi = get("citation_doi");
  const citationJournal =
    get("citation_journal_title") ?? get("citation_conference_title") ?? get("citation_book_title");
  const citationAbstract = get("citation_abstract");
  const citationKeywords = getAll("citation_keywords");
  const citationLanguage = get("citation_language");

  if (citationTitle) {
    return {
      found: true,
      metadataSource: "citation",
      title: citationTitle,
      authors: citationAuthors,
      year: firstYear(citationDate),
      doi: citationDoi ?? "",
      containerTitle: citationJournal ?? "",
      abstract: citationAbstract ?? "",
      keywords: citationKeywords.flatMap((k) => k.split(/[;,]/)).map((k) => k.trim()).filter(Boolean),
      language: citationLanguage ?? "",
      sourceTypeHint: citationJournal ? "Artigo" : "Outro",
      url: requestUrl,
    };
  }

  const dcTitle = get("dc.title");
  const dcCreators = getAll("dc.creator");
  const dcDate = get("dc.date");
  const dcLanguage = get("dc.language");

  if (dcTitle) {
    return {
      found: true,
      metadataSource: "dublin_core",
      title: dcTitle,
      authors: dcCreators,
      year: firstYear(dcDate),
      doi: "",
      containerTitle: "",
      abstract: "",
      keywords: [],
      language: dcLanguage ?? "",
      sourceTypeHint: "Outro",
      url: requestUrl,
    };
  }

  const ogTitle = get("og:title");
  const ogDescription = get("og:description");

  if (ogTitle) {
    return {
      found: true,
      metadataSource: "open_graph",
      title: ogTitle,
      authors: [],
      year: null,
      doi: "",
      containerTitle: "",
      abstract: ogDescription ?? "",
      keywords: [],
      language: "",
      sourceTypeHint: "Website",
      url: requestUrl,
    };
  }

  return {
    found: false,
    metadataSource: "none",
    title: "",
    authors: [],
    year: null,
    doi: "",
    containerTitle: "",
    abstract: "",
    keywords: [],
    language: "",
    sourceTypeHint: "Website",
    url: requestUrl,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (typeof url !== "string" || !url.trim()) {
      return new Response(JSON.stringify({ error: "URL é obrigatória." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return new Response(JSON.stringify({ error: "URL inválida." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["http:", "https:"].includes(parsed.protocol) || isBlockedHost(parsed.hostname)) {
      return new Response(JSON.stringify({ error: "URL não permitida." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(parsed.toString(), {
        signal: controller.signal,
        redirect: "follow",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; BibliotecaDeReferencias/1.0; +https://lovable.dev)",
          Accept: "text/html,application/xhtml+xml",
        },
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `Não foi possível acessar a URL (status ${response.status}).` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("html")) {
      return new Response(
        JSON.stringify({ error: "A URL não retornou uma página HTML." }),
        { status: 415, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const reader = response.body?.getReader();
    let html = "";
    if (reader) {
      const decoder = new TextDecoder();
      let bytesRead = 0;
      while (bytesRead < MAX_BYTES) {
        const { done, value } = await reader.read();
        if (done) break;
        bytesRead += value.byteLength;
        html += decoder.decode(value, { stream: true });
      }
      await reader.cancel().catch(() => {});
    }

    const meta = extractMetaTags(html);
    const result = extract(meta, parsed.toString());

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido.";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
