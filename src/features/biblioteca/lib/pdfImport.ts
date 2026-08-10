import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface PdfExtraction {
  title: string;
  titleSource: "embedded" | "heuristic" | "none";
  author: string;
  authorSource: "embedded" | "heuristic" | "none";
  year: number | null;
  doi: string;
}

interface PositionedText {
  text: string;
  y: number;
  fontSize: number;
}

const YEAR_REGEX = /\b(19|20)\d{2}\b/;
const DOI_REGEX = /\b10\.\d{4,9}\/[^\s"'<>]+/;

function cleanDoi(raw: string): string {
  return raw.replace(/[.,;)\]]+$/, "");
}

/** Heurística simples: poucas palavras, maioria capitalizada, sem pontuação de fim de frase. */
function looksLikeName(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 120 || /[.!?]$/.test(trimmed)) return false;
  const words = trimmed.split(/\s+/);
  if (words.length < 1 || words.length > 8) return false;
  const capitalized = words.filter((w) => /^[A-ZÀ-Ý]/.test(w));
  return capitalized.length >= Math.ceil(words.length * 0.6);
}

async function extractFirstPageItems(
  pdf: pdfjsLib.PDFDocumentProxy,
): Promise<{ items: PositionedText[]; pageHeight: number }> {
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1 });
  const content = await page.getTextContent();

  const items: PositionedText[] = [];
  for (const item of content.items) {
    if (!("str" in item)) continue;
    const text = item.str.trim();
    if (!text) continue;
    const transform = item.transform;
    const fontSize = Math.hypot(transform[2] ?? 0, transform[3] ?? 0);
    items.push({ text, y: transform[5] ?? 0, fontSize });
  }
  return { items, pageHeight: viewport.height };
}

/** Maior bloco de texto no topo da página = provável título; linha seguinte com jeito de nome = provável autor. */
function guessTitleAndAuthor(
  items: PositionedText[],
  pageHeight: number,
): { title: string; author: string } {
  const topItems = items.filter((i) => i.y > pageHeight * 0.5);
  if (topItems.length === 0) return { title: "", author: "" };

  const maxFontSize = Math.max(...topItems.map((i) => i.fontSize));
  const titleItems = topItems
    .filter((i) => i.fontSize >= maxFontSize - 0.5)
    .sort((a, b) => b.y - a.y);
  const title = titleItems
    .map((i) => i.text)
    .join(" ")
    .trim();

  const titleMinY = Math.min(...titleItems.map((i) => i.y));
  const belowTitle = topItems.filter((i) => i.y < titleMinY).sort((a, b) => b.y - a.y);

  const author = belowTitle.find((i) => looksLikeName(i.text))?.text ?? "";

  return { title, author };
}

export async function extractPdfData(file: File): Promise<PdfExtraction> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;

  const { info } = await pdf.getMetadata();
  const infoDict = (info ?? {}) as Record<string, unknown>;
  const embeddedTitle = typeof infoDict["Title"] === "string" ? infoDict["Title"].trim() : "";
  const embeddedAuthor = typeof infoDict["Author"] === "string" ? infoDict["Author"].trim() : "";
  const embeddedDate = typeof infoDict["CreationDate"] === "string" ? infoDict["CreationDate"] : "";

  const { items, pageHeight } = await extractFirstPageItems(pdf);
  const fullText = items.map((i) => i.text).join(" ");
  const { title: heuristicTitle, author: heuristicAuthor } = guessTitleAndAuthor(items, pageHeight);

  const yearFromInfo = embeddedDate.match(/D:(\d{4})/)?.[1];
  const yearFromText = fullText.match(YEAR_REGEX)?.[0];
  const doiMatch = fullText.match(DOI_REGEX)?.[0];

  return {
    title: embeddedTitle || heuristicTitle,
    titleSource: embeddedTitle ? "embedded" : heuristicTitle ? "heuristic" : "none",
    author: embeddedAuthor || heuristicAuthor,
    authorSource: embeddedAuthor ? "embedded" : heuristicAuthor ? "heuristic" : "none",
    year: yearFromInfo ? Number(yearFromInfo) : yearFromText ? Number(yearFromText) : null,
    doi: doiMatch ? cleanDoi(doiMatch) : "",
  };
}
