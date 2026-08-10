import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PERSON_ROLES, PERSON_ROLE_LABELS, type PersonRole } from "../constants";
import { useCreatePerson, usePeople, type PersonOption } from "../hooks/useLookups";
import type { PersonEntry } from "../hooks/useSaveSource";

interface PeoplePickerProps {
  ownerId: string | undefined;
  value: PersonEntry[];
  onChange: (value: PersonEntry[]) => void;
}

export function PeoplePicker({ ownerId, value, onChange }: PeoplePickerProps) {
  const { data: people = [] } = usePeople(ownerId);
  const createPerson = useCreatePerson(ownerId);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  function recomputePositions(entries: PersonEntry[]): PersonEntry[] {
    const counters: Partial<Record<PersonRole, number>> = {};
    return entries.map((entry) => {
      const next = (counters[entry.role] ?? 0) + 1;
      counters[entry.role] = next;
      return { ...entry, position: next };
    });
  }

  function addPerson(person: PersonOption) {
    const next = recomputePositions([
      ...value,
      { person_id: person.id, full_name: person.full_name, role: "autor", position: 0 },
    ]);
    onChange(next);
    setOpen(false);
    setQuery("");
  }

  async function handleCreate() {
    const name = query.trim();
    if (!name) return;
    const person = await createPerson.mutateAsync(name);
    addPerson(person);
  }

  function removeAt(index: number) {
    onChange(recomputePositions(value.filter((_, i) => i !== index)));
  }

  function updateRole(index: number, role: PersonRole) {
    const next = value.map((entry, i) => (i === index ? { ...entry, role } : entry));
    onChange(recomputePositions(next));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    const [item] = next.splice(index, 1);
    if (!item) return;
    next.splice(target, 0, item);
    onChange(recomputePositions(next));
  }

  const alreadySelectedIds = new Set(value.map((v) => v.person_id));
  const filteredPeople = people.filter(
    (p) => !alreadySelectedIds.has(p.id) && p.full_name.toLowerCase().includes(query.toLowerCase()),
  );
  const exactMatch = people.some((p) => p.full_name.toLowerCase() === query.trim().toLowerCase());

  return (
    <div className="space-y-2">
      <div className="space-y-2">
        {value.map((entry, index) => (
          <div
            key={`${entry.person_id}-${entry.role}-${index}`}
            className="flex items-center gap-2"
          >
            <span className="flex-1 truncate text-sm">{entry.full_name}</span>
            <Select
              value={entry.role}
              onValueChange={(role) => updateRole(index, role as PersonRole)}
            >
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERSON_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {PERSON_ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              disabled={index === 0}
              onClick={() => move(index, -1)}
              aria-label="Mover para cima"
            >
              <ArrowUp className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              disabled={index === value.length - 1}
              onClick={() => move(index, 1)}
              aria-label="Mover para baixo"
            >
              <ArrowDown className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 text-destructive"
              onClick={() => removeAt(index)}
              aria-label="Remover"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        ))}
        {value.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhuma pessoa adicionada ainda.</p>
        )}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            <Plus className="size-3.5" />
            Adicionar pessoa
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Buscar ou criar pessoa..."
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandEmpty>Nenhuma pessoa encontrada.</CommandEmpty>
              <CommandGroup>
                {filteredPeople.map((person) => (
                  <CommandItem key={person.id} onSelect={() => addPerson(person)}>
                    {person.full_name}
                  </CommandItem>
                ))}
                {query.trim() && !exactMatch && (
                  <CommandItem onSelect={handleCreate} disabled={createPerson.isPending}>
                    <Plus className="size-3.5" />
                    Criar "{query.trim()}"
                  </CommandItem>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
