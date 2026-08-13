import { useMutation } from "@tanstack/react-query";

import { createEmptyCandidate, type ImportCandidate } from "../lib/import";
import { extractPdfData } from "../lib/pdfImport";

export function pdfExtractionToCandidate(
  file: File,
  data: Awaited<ReturnType<typeof extractPdfData>>,
): ImportCandidate {
  const candidate = createEmptyCandidate("pdf");
  return {
    ...candidate,
    title: data.title,
    authors: data.author,
    year: data.year,
    doi: data.doi,
    pdfFile: file,
    // Zero perda: guarda tudo que a extração do PDF conseguiu ler, mesmo o
    // que não virou campo estruturado (fonte do título/autor, etc.).
    rawImportData: data as unknown as Record<string, unknown>,
  };
}

export function useExtractPdf() {
  return useMutation({
    mutationFn: async (file: File) => {
      const data = await extractPdfData(file);
      return pdfExtractionToCandidate(file, data);
    },
  });
}
