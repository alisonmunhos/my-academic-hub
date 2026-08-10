import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, FileText, Link2, Loader2, Plus, Upload } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useConfirmImport, type ImportResult } from "../hooks/useConfirmImport";
import { metadataToCandidate, useExtractMetadata } from "../hooks/useExtractMetadata";
import { useExtractPdf } from "../hooks/useExtractPdf";
import {
  buildExistingChaveDocMap,
  candidateChaveDoc,
  getCandidateStatus,
  type ImportCandidate,
} from "../lib/import";
import { parseRisFiles } from "../lib/ris";
import type { SourceRow } from "../hooks/useSources";
import { ImportReviewTable, type DuplicateInfo } from "./ImportReviewTable";

interface ImportSourcesDialogProps {
  ownerId: string;
  sources: SourceRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenExisting: (id: string) => void;
}

type Step = "choose" | "link" | "ris" | "pdf" | "review" | "result";

export function ImportSourcesDialog({
  ownerId,
  sources,
  open,
  onOpenChange,
  onOpenExisting,
}: ImportSourcesDialogProps) {
  const [step, setStep] = useState<Step>("choose");
  const [candidates, setCandidates] = useState<ImportCandidate[]>([]);
  const [linkUrl, setLinkUrl] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [risLoading, setRisLoading] = useState(false);

  const extractMetadata = useExtractMetadata();
  const extractPdf = useExtractPdf();
  const confirmImport = useConfirmImport(ownerId);

  const existingMap = useMemo(() => buildExistingChaveDocMap(sources), [sources]);

  const duplicates = useMemo(() => {
    const seen = new Map<string, string>();
    const map = new Map<string, DuplicateInfo | null>();
    for (const candidate of candidates) {
      const chaveDoc = candidateChaveDoc(candidate);
      const existing = existingMap.get(chaveDoc);
      if (existing) {
        map.set(candidate.localId, existing);
        continue;
      }
      const firstLocalId = seen.get(chaveDoc);
      if (firstLocalId && firstLocalId !== candidate.localId) {
        map.set(candidate.localId, { id: firstLocalId, title: "", local: true });
      } else {
        seen.set(chaveDoc, candidate.localId);
        map.set(candidate.localId, null);
      }
    }
    return map;
  }, [candidates, existingMap]);

  function reset() {
    setStep("choose");
    setCandidates([]);
    setLinkUrl("");
    setResult(null);
  }

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  }

  async function handleFetchLink() {
    if (!linkUrl.trim()) return;
    try {
      const data = await extractMetadata.mutateAsync(linkUrl.trim());
      const candidate = metadataToCandidate(data);
      setCandidates((prev) => [...prev, candidate]);
      setLinkUrl("");
      setStep("review");
      if (!data.found) {
        toast.warning("Nenhum metadado estruturado encontrado. Complete os campos manualmente.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível extrair metadados dessa URL.");
    }
  }

  async function handleRisFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setRisLoading(true);
    try {
      const files = Array.from(fileList);
      const parsed = await parseRisFiles(files);
      if (parsed.length === 0) {
        toast.warning("Nenhuma entrada RIS válida encontrada no(s) arquivo(s).");
        return;
      }
      setCandidates((prev) => [...prev, ...parsed]);
      setStep("review");
      toast.success(`${parsed.length} entrada(s) encontrada(s) em ${files.length} arquivo(s).`);
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível ler o(s) arquivo(s) RIS.");
    } finally {
      setRisLoading(false);
    }
  }

  async function handlePdfFile(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    try {
      const candidate = await extractPdf.mutateAsync(file);
      setCandidates((prev) => [...prev, candidate]);
      setStep("review");
      toast.warning("Extração de PDF é melhor esforço — confira e complete os campos na revisão.");
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível ler esse PDF.");
    }
  }

  function updateCandidate(localId: string, patch: Partial<ImportCandidate>) {
    setCandidates((prev) => prev.map((c) => (c.localId === localId ? { ...c, ...patch } : c)));
  }

  function removeCandidate(localId: string) {
    setCandidates((prev) => prev.filter((c) => c.localId !== localId));
  }

  const importable = candidates.filter((c) => {
    const status = getCandidateStatus(c, duplicates.get(c.localId) ?? null);
    return status !== "duplicate" && status !== "missing_title";
  });

  async function handleConfirm() {
    try {
      const outcome = await confirmImport.mutateAsync(importable);
      setResult(outcome);
      setStep("result");
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível importar as fontes.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl gap-0 p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Importar fontes</DialogTitle>
        </DialogHeader>

        {step === "choose" && (
          <div className="space-y-3 px-6 py-6">
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-lg border p-4 text-left hover:border-primary/50 hover:bg-accent/50"
              onClick={() => setStep("link")}
            >
              <Link2 className="size-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Importar por link</p>
                <p className="text-xs text-muted-foreground">
                  Cole a URL de um artigo, repositório ou página acadêmica.
                </p>
              </div>
            </button>

            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-lg border p-4 text-left hover:border-primary/50 hover:bg-accent/50"
              onClick={() => setStep("ris")}
            >
              <FileText className="size-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Importar arquivo RIS</p>
                <p className="text-xs text-muted-foreground">
                  Um ou vários arquivos .ris exportados do Mendeley, Zotero etc.
                </p>
              </div>
            </button>

            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-lg border p-4 text-left hover:border-primary/50 hover:bg-accent/50"
              onClick={() => setStep("pdf")}
            >
              <Upload className="size-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Importar por PDF</p>
                <p className="text-xs text-muted-foreground">
                  Melhor esforço, sem IA — normalmente vai exigir completar campos manualmente.
                </p>
              </div>
            </button>
          </div>
        )}

        {step === "link" && (
          <div className="space-y-4 px-6 py-6">
            <div className="space-y-1.5">
              <Label htmlFor="import-url">URL</Label>
              <Input
                id="import-url"
                placeholder="https://..."
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                autoFocus
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Tentamos extrair metadados estruturados da página (citation_*, Dublin Core, Open
              Graph). Se nada for encontrado, você poderá preencher os campos manualmente na tela de
              revisão.
            </p>
          </div>
        )}

        {step === "ris" && (
          <div className="space-y-4 px-6 py-6">
            <div className="space-y-1.5">
              <Label htmlFor="import-ris">Arquivo(s) .ris</Label>
              <Input
                id="import-ris"
                type="file"
                accept=".ris"
                multiple
                disabled={risLoading}
                onChange={(e) => handleRisFiles(e.target.files)}
              />
            </div>
            {risLoading && (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                Lendo arquivo(s)...
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Cada entrada do arquivo vira uma linha na tela de revisão, com checagem de duplicata
              automática antes de importar.
            </p>
          </div>
        )}

        {step === "pdf" && (
          <div className="space-y-4 px-6 py-6">
            <Alert>
              <AlertTriangle className="size-4" />
              <AlertTitle>Melhor esforço</AlertTitle>
              <AlertDescription>
                Sem usar IA paga, extraímos apenas os metadados embutidos no PDF e um palpite a
                partir do texto da primeira página. A precisão é bem menor que nos outros canais —
                quase sempre você vai precisar completar campos manualmente na revisão, que é
                obrigatória antes de importar.
              </AlertDescription>
            </Alert>
            <div className="space-y-1.5">
              <Label htmlFor="import-pdf">Arquivo PDF</Label>
              <Input
                id="import-pdf"
                type="file"
                accept="application/pdf"
                disabled={extractPdf.isPending}
                onChange={(e) => handlePdfFile(e.target.files)}
              />
            </div>
            {extractPdf.isPending && (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                Lendo PDF...
              </p>
            )}
          </div>
        )}

        {step === "review" && (
          <>
            <ScrollArea className="max-h-[55vh]">
              <div className="space-y-3 px-6 py-4">
                <button
                  type="button"
                  className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                  onClick={() => setStep("link")}
                >
                  <Plus className="size-3.5" />
                  Adicionar outro link
                </button>
                <ImportReviewTable
                  candidates={candidates}
                  duplicates={duplicates}
                  onChange={updateCandidate}
                  onRemove={removeCandidate}
                  onOpenExisting={(id) => {
                    handleClose(false);
                    onOpenExisting(id);
                  }}
                />
              </div>
            </ScrollArea>
            <div className="border-t px-6 py-3 text-xs text-muted-foreground">
              {importable.length} de {candidates.length} serão importadas
              {candidates.length - importable.length > 0 &&
                ` (${candidates.length - importable.length} ignorada(s): duplicata ou sem título)`}
              .
            </div>
          </>
        )}

        {step === "result" && result && (
          <div className="space-y-4 px-6 py-6">
            <Alert>
              <CheckCircle2 className="size-4" />
              <AlertTitle>Importação concluída</AlertTitle>
              <AlertDescription>
                {result.inserted} fonte(s) importada(s), {result.duplicates} duplicata(s)
                ignorada(s)
                {result.errors.length > 0 && `, ${result.errors.length} com erro`}.
              </AlertDescription>
            </Alert>
            {result.errors.length > 0 && (
              <ul className="space-y-1 text-xs text-destructive">
                {result.errors.map((e) => (
                  <li key={e.candidate.localId}>
                    {e.candidate.title || "(sem título)"}: {e.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <DialogFooter className="border-t px-6 py-4">
          {step !== "choose" && step !== "result" && (
            <Button type="button" variant="outline" onClick={() => setStep("choose")}>
              Cancelar
            </Button>
          )}
          {step === "link" && (
            <Button
              type="button"
              onClick={handleFetchLink}
              disabled={!linkUrl.trim() || extractMetadata.isPending}
            >
              {extractMetadata.isPending && <Loader2 className="size-4 animate-spin" />}
              Buscar metadados
            </Button>
          )}
          {step === "review" && (
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={importable.length === 0 || confirmImport.isPending}
            >
              {confirmImport.isPending && <Loader2 className="size-4 animate-spin" />}
              Importar {importable.length} fonte(s)
            </Button>
          )}
          {step === "result" && (
            <Button type="button" onClick={() => handleClose(false)}>
              Concluir
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
