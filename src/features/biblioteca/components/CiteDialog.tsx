import { Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { getCitations } from "../lib/citations";
import type { SourceRow } from "../hooks/useSources";

interface CiteDialogProps {
  source: SourceRow | null;
  onOpenChange: (open: boolean) => void;
}

async function copyToClipboard(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copiada.`);
  } catch {
    toast.error("Não foi possível copiar. Selecione e copie manualmente.");
  }
}

function CitationBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => copyToClipboard(text, label)}
        >
          <Copy className="size-3" />
          Copiar
        </Button>
      </div>
      <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm">{text}</p>
    </div>
  );
}

export function CiteDialog({ source, onOpenChange }: CiteDialogProps) {
  if (!source) return null;
  const citations = getCitations(source);

  return (
    <Dialog open={!!source} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Citar</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <CitationBlock label="Referência completa (ABNT)" text={citations.full} />
          <CitationBlock label="Citação integrada ao texto" text={citations.integrated} />
          <CitationBlock label="Citação parentética" text={citations.parenthetical} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
