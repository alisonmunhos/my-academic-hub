import { corsHeaders } from "../_shared/cors.ts";

// Boas práticas da Crossref: identificar o app e um contato no User-Agent
// (pool "polite" de rate-limit). Preencha com um e-mail de contato real.
const CROSSREF_USER_AGENT = "my-academic-hub/1.0 (mailto:seu-email@exemplo.com)";
const FETCH_TIMEOUT_MS = 10_000;

interface DoiEnrichResult {
  found: boolean;
  title: string;
  authors: string[];
  containerTitle: string;
  year: number | null;
  publisher: string;
  issnIsbn: string;
  language: string;
  error?: string;
}

interface CrossrefAuthor {
  family?: string;
  given?: string;
  name?: string;
}

interface CrossrefMessage {
  title?: string[];
  author?: CrossrefAuthor[];
  "container-title"?: string[];
  "published-print"?: { "date-parts"?: number[][] };
  "published-online"?: { "date-parts"?: number[][] };
  issued?: { "date-parts"?: number[][] };
  publisher?: string;
  ISSN?: string[];
  language?: string;
}

function emptyResult(error?: string): DoiEnrichResult {
  return {
    found: false,
    title: "",
    authors: [],
    containerTitle: "",
    year: null,
    publisher: "",
    issnIsbn: "",
    language: "",
    ...(error ? { error } : {}),
  };
}

function extractYear(message: CrossrefMessage): number | null {
  const parts =
    message["published-print"]?.["date-parts"]?.[0] ??
    message["published-online"]?.["date-parts"]?.[0] ??
    message.issued?.["date-parts"]?.[0];
  return parts?.[0] ?? null;
}

function extractAuthors(message: CrossrefMessage): string[] {
  if (!message.author) return [];
  return message.author
    .map((a) => {
      if (a.family) return a.given ? `${a.family}, ${a.given}` : a.family;
      return a.name ?? "";
    })
    .filter((name) => name.trim().length > 0);
}

function normalizeDoi(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
    .replace(/^doi:/i, "");
}

function extract(message: CrossrefMessage): DoiEnrichResult {
  return {
    found: true,
    title: message.title?.[0] ?? "",
    authors: extractAuthors(message),
    containerTitle: message["container-title"]?.[0] ?? "",
    year: extractYear(message),
    publisher: message.publisher ?? "",
    issnIsbn: message.ISSN?.[0] ?? "",
    language: message.language ?? "",
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { doi } = await req.json();
    if (typeof doi !== "string" || !doi.trim()) {
      return new Response(JSON.stringify({ ...emptyResult("DOI é obrigatório.") }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanDoi = normalizeDoi(doi);
    const crossrefUrl = `https://api.crossref.org/works/${encodeURIComponent(cleanDoi)}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(crossrefUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": CROSSREF_USER_AGENT,
          Accept: "application/json",
        },
      });
    } catch (fetchError) {
      // Timeout ou erro de rede: nunca deve travar a importação — devolve
      // found:false com 200, quem chama segue sem enriquecimento.
      const message = fetchError instanceof Error ? fetchError.message : "Erro de rede.";
      return new Response(JSON.stringify(emptyResult(`Crossref inacessível: ${message}`)), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } finally {
      clearTimeout(timeout);
    }

    if (response.status === 404) {
      return new Response(JSON.stringify(emptyResult("DOI não encontrado na Crossref.")), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!response.ok) {
      return new Response(
        JSON.stringify(emptyResult(`Crossref retornou status ${response.status}.`)),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await response.json();
    const message: CrossrefMessage | undefined = body?.message;
    if (!message) {
      return new Response(
        JSON.stringify(emptyResult("Resposta da Crossref sem os dados esperados.")),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const result = extract(message);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    // Erro inesperado (ex.: JSON de entrada malformado) — ainda assim nunca
    // deve derrubar quem chamou; found:false com detalhe do erro.
    const message = error instanceof Error ? error.message : "Erro desconhecido.";
    return new Response(JSON.stringify(emptyResult(message)), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
