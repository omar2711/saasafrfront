'use client';

import { Check, ChevronsUpDown, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useOrganization } from '@/contexts/organization-context';
import { useState } from 'react';

export function BranchSelector() {
  const { branches, currentBranch, setCurrentBranch, canViewAllBranches } = useOrganization();
  const [open, setOpen] = useState(false);

  if (branches.length <= 1) {
    return null;
  }

  // Usuario bloqueado a su sucursal: mostrar etiqueta fija, sin posibilidad de cambiar.
  if (!canViewAllBranches) {
    return (
      <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
        <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate">{currentBranch?.name ?? 'Sin sucursal'}</span>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <div className="flex items-center gap-2 truncate">
            <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{currentBranch?.name || 'Seleccionar sucursal'}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar sucursal..." />
          <CommandList>
            <CommandEmpty>No se encontraron sucursales.</CommandEmpty>
            <CommandGroup>
              {branches.map((branch) => (
                <CommandItem
                  key={branch.id}
                  value={branch.name}
                  onSelect={() => {
                    setCurrentBranch(branch);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      currentBranch?.id === branch.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{branch.name}</span>
                    {branch.isMain && (
                      <span className="text-xs text-muted-foreground">Principal</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
