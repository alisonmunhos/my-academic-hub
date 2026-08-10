import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle, FileText, Loader2, X } from "lucide-react";
import { toast } from "sonner";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  COLOR_TAG_PRESETS,
  LANGUAGES,
  SOURCE_TYPES,
  STATUS_READING,
  type Language,
  type SourceType,
  type StatusReading,
} from "../constants";
import type { KeywordOption, TagOption } from "../hooks/useLookups";
import { DuplicateSourceError, useSaveSource, type PersonEntry } from "../hooks/useSaveSource";
import type { SourceRow } from "../hooks/useSources";
import { PeoplePicker } from "./PeoplePicker";
import { KeywordsPicker } from "./KeywordsPicker";
import { TagsPicker } from "./TagsPicker";

const formSchema = z.object({
  source_type: z.enum(SOURCE_TYPES),
  title: z.string().min(1, "Informe o título"),
  year: z.number().int().nullable(),
  container_title: z.string(),
  volume: z.string(),
  issue: z.string(),
  pages: z.string(),
  months: z.string(),
  place: z.string(),
  publisher: z.string(),
  doi: z.string(),
  url: z.string(),
  language: z.enum(LANGUAGES).nullable(),
  status_reading: z.enum(STATUS_READING),
  abstract: z.string(),
  personal_notes: z.string(),
  color_tag: z.string().nullable(),
  is_favorite: z.boolean(),
  is_public: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

function toDefaults(source: SourceRow | null): FormValues {
  return {
    source_type: (source?.source_type as SourceType) ?? "Outro",
    title: source?.title ?? "",
    year: source?.year ?? null,
    container_title: source?.container_title ?? "",
    volume: source?.volume ?? "",
    issue: source?.issue ?? "",
    pages: source?.pages ?? "",
    months: source?.months ?? "",
    place: source?.place ?? "",
    publisher: source?.publisher ?? "",
    doi: source?.doi ?? "",
    url: source?.url ?? "",
    language: (source?.language as Language) ?? "PT",
    status_reading: (source?.status_reading as StatusReading) ?? "Não lido",
    abstract: source?.abstract ?? "",
    personal_notes: source?.personal_notes ?? "",
    color_tag: source?.color_tag ?? null,
    is_favorite: source?.is_favorite ?? false,
    is_public: source?.is_public ?? false,
  };
}

function toPeopleEntries(source: SourceRow | null): PersonEntry[] {
  if (!source) return [];
  return [...source.source_people]
    .sort((a, b) => a.position - b.position)
    .map((sp) => ({
      person_id: sp.person_id,
      full_name: sp.people?.full_name ?? "",
      role: sp.role as PersonEntry["role"],
      position: sp.position,
    }));
}

function toKeywordOptions(source: SourceRow | null): KeywordOption[] {
  if (!source) return [];
  return source.source_keywords.map((sk) => sk.keywords).filter((k): k is KeywordOption => !!k);
}

function toTagOptions(source: SourceRow | null): TagOption[] {
  if (!source) return [];
  return source.source_tags.map((st) => st.tags).filter((t): t is TagOption => !!t);
}

function pdfFileName(path: string | null | undefined) {
  if (!path) return "";
  const parts = path.split("/");
  return parts[parts.length - 1];
}

interface SourceFormDialogProps {
  ownerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: SourceRow | null;
  onSwitchToSource: (id: string) => void;
}

export function SourceFormDialog({
  ownerId,
  open,
  onOpenChange,
  source,
  onSwitchToSource,
}: SourceFormDialogProps) {
  const saveSource = useSaveSource(ownerId);
  const [people, setPeople] = useState<PersonEntry[]>(() => toPeopleEntries(source));
  const [keywords, setKeywords] = useState<KeywordOption[]>(() => toKeywordOptions(source));
  const [tags, setTags] = useState<TagOption[]>(() => toTagOptions(source));
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [removePdf, setRemovePdf] = useState(false);
  const [duplicate, setDuplicate] = useState<{ id: string; title: string } | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: toDefaults(source),
  });

  const hasExistingPdf = !!source?.pdf_storage_path && !removePdf;

  async function onSubmit(values: FormValues) {
    setDuplicate(null);
    try {
      await saveSource.mutateAsync({
        id: source?.id ?? null,
        values: {
          source_type: values.source_type,
          title: values.title.trim(),
          year: values.year,
          container_title: values.container_title || null,
          volume: values.volume || null,
          issue: values.issue || null,
          pages: values.pages || null,
          months: values.months || null,
          place: values.place || null,
          publisher: values.publisher || null,
          doi: values.doi || null,
          url: values.url || null,
          language: values.language,
          status_reading: values.status_reading,
          abstract: values.abstract || null,
          personal_notes: values.personal_notes || null,
          color_tag: values.color_tag || null,
          is_favorite: values.is_favorite,
          is_public: values.is_public,
        },
        people,
        keywordIds: keywords.map((k) => k.id),
        tagIds: tags.map((t) => t.id),
        pdfFile,
        removePdf,
        existingPdfPath: source?.pdf_storage_path ?? null,
      });
      toast.success(source ? "Fonte atualizada." : "Fonte criada.");
      onOpenChange(false);
    } catch (error) {
      if (error instanceof DuplicateSourceError) {
        setDuplicate(error.existing);
        return;
      }
      console.error(error);
      toast.error("Não foi possível salvar a fonte. Tente novamente.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>{source ? "Editar fonte" : "Nova fonte"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <ScrollArea className="max-h-[65vh]">
            <div className="space-y-6 px-6 py-4">
              {duplicate && (
                <Alert variant="destructive">
                  <AlertTriangle className="size-4" />
                  <AlertTitle>Possível duplicata</AlertTitle>
                  <AlertDescription>
                    <p>
                      Já existe uma fonte com a mesma chave (DOI ou título + ano): "
                      {duplicate.title}".
                    </p>
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto p-0 text-destructive underline"
                      onClick={() => {
                        onOpenChange(false);
                        onSwitchToSource(duplicate.id);
                      }}
                    >
                      Abrir registro existente
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="title">Título *</Label>
                  <Input id="title" {...register("title")} />
                  {errors.title && (
                    <p className="text-xs text-destructive">{errors.title.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>Tipo de fonte</Label>
                  <Controller
                    control={control}
                    name="source_type"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SOURCE_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="year">Ano</Label>
                  <Controller
                    control={control}
                    name="year"
                    render={({ field }) => (
                      <Input
                        id="year"
                        type="number"
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value === "" ? null : Number(e.target.value))
                        }
                      />
                    )}
                  />
                </div>

                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="container_title">Publicado em (periódico / livro / evento)</Label>
                  <Input id="container_title" {...register("container_title")} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="volume">Volume</Label>
                  <Input id="volume" {...register("volume")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="issue">Número/Fascículo</Label>
                  <Input id="issue" {...register("issue")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pages">Páginas</Label>
                  <Input id="pages" {...register("pages")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="months">Mês(es)</Label>
                  <Input id="months" {...register("months")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="place">Local</Label>
                  <Input id="place" {...register("place")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="publisher">Editora</Label>
                  <Input id="publisher" {...register("publisher")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="doi">DOI</Label>
                  <Input id="doi" {...register("doi")} placeholder="10.xxxx/xxxxx" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="url">URL</Label>
                  <Input id="url" {...register("url")} placeholder="https://" />
                </div>

                <div className="space-y-1.5">
                  <Label>Idioma</Label>
                  <Controller
                    control={control}
                    name="language"
                    render={({ field }) => (
                      <Select value={field.value ?? "PT"} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LANGUAGES.map((lang) => (
                            <SelectItem key={lang} value={lang}>
                              {lang}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Status de leitura</Label>
                  <Controller
                    control={control}
                    name="status_reading"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_READING.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="abstract">Resumo</Label>
                  <Textarea id="abstract" rows={3} {...register("abstract")} />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="personal_notes">Notas pessoais</Label>
                  <Textarea id="personal_notes" rows={3} {...register("personal_notes")} />
                </div>

                <div className="space-y-1.5">
                  <Label>Cor</Label>
                  <Controller
                    control={control}
                    name="color_tag"
                    render={({ field }) => (
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          className="flex size-6 items-center justify-center rounded-full border text-muted-foreground"
                          onClick={() => field.onChange(null)}
                          aria-label="Sem cor"
                        >
                          <X className="size-3.5" />
                        </button>
                        {COLOR_TAG_PRESETS.map((preset) => (
                          <button
                            type="button"
                            key={preset.value}
                            className="size-6 rounded-full border-2"
                            style={{
                              backgroundColor: preset.value,
                              borderColor:
                                field.value === preset.value ? "currentColor" : "transparent",
                            }}
                            aria-label={preset.label}
                            onClick={() => field.onChange(preset.value)}
                          />
                        ))}
                      </div>
                    )}
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="is_favorite">Favorito</Label>
                  </div>
                  <Controller
                    control={control}
                    name="is_favorite"
                    render={({ field }) => (
                      <Switch
                        id="is_favorite"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="is_public">Compartilhar por link (público)</Label>
                  </div>
                  <Controller
                    control={control}
                    name="is_public"
                    render={({ field }) => (
                      <Switch
                        id="is_public"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Autores e outras pessoas</Label>
                <PeoplePicker ownerId={ownerId} value={people} onChange={setPeople} />
              </div>

              <div className="space-y-1.5">
                <Label>Palavras-chave</Label>
                <KeywordsPicker ownerId={ownerId} value={keywords} onChange={setKeywords} />
              </div>

              <div className="space-y-1.5">
                <Label>Tags pessoais</Label>
                <TagsPicker ownerId={ownerId} value={tags} onChange={setTags} />
              </div>

              <div className="space-y-1.5">
                <Label>PDF</Label>
                {hasExistingPdf && !pdfFile && (
                  <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                    <FileText className="size-4 text-muted-foreground" />
                    <span className="flex-1 truncate">{pdfFileName(source?.pdf_storage_path)}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setRemovePdf(true)}
                    >
                      Remover
                    </Button>
                  </div>
                )}
                {pdfFile && (
                  <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                    <FileText className="size-4 text-muted-foreground" />
                    <span className="flex-1 truncate">{pdfFile.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setPdfFile(null)}
                    >
                      Remover seleção
                    </Button>
                  </div>
                )}
                {!hasExistingPdf && !pdfFile && (
                  <Input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => {
                      setRemovePdf(false);
                      setPdfFile(e.target.files?.[0] ?? null);
                    }}
                  />
                )}
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || saveSource.isPending}>
              {(isSubmitting || saveSource.isPending) && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
