'use client';

import { useEffect, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  COUNTRY_CODES,
  DEFAULT_COUNTRY_ISO2,
  findCountryByDialCode,
} from '@/lib/data/country-codes';

interface CountryCodeComboboxProps {
  /** Prefijo telefónico, p. ej. "+591". Es lo que se persiste junto al número. */
  value: string;
  onChange: (dialCode: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Reemplaza al `Select` que usaba el prefijo como `value`: al compartir "+1"
 * entre US, PR, DO y CA, Radix marcaba las cuatro filas como seleccionadas.
 * Aquí la clave es el iso2, así que sólo una fila lleva el check.
 *
 * El teléfono se sigue guardando como "+1 3055550100", sin el país, de modo que
 * al reabrir un registro con +1 se resuelve al primero de la lista. Es el
 * comportamiento correcto mientras no exista una columna para el país.
 */
export function CountryCodeCombobox({
  value,
  onChange,
  disabled,
  className,
}: CountryCodeComboboxProps) {
  const [open, setOpen] = useState(false);
  const [iso2, setIso2] = useState(
    () => findCountryByDialCode(value)?.iso2 ?? DEFAULT_COUNTRY_ISO2,
  );

  // El formulario puede reemplazar el prefijo por fuera (abrir "Editar" con otro
  // proveedor). Se re-sincroniza sólo si el prefijo actual dejó de coincidir,
  // para no pisar la elección del usuario entre países que comparten prefijo.
  useEffect(() => {
    const current = COUNTRY_CODES.find((country) => country.iso2 === iso2);
    if (current?.dialCode !== value) {
      setIso2(findCountryByDialCode(value)?.iso2 ?? DEFAULT_COUNTRY_ISO2);
    }
  }, [value, iso2]);

  const selected = COUNTRY_CODES.find((country) => country.iso2 === iso2);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Código de país"
          disabled={disabled}
          className={cn('w-[130px] shrink-0 justify-between font-normal', className)}
        >
          <span className="truncate">
            {selected ? `${selected.flag} ${selected.dialCode}` : value}
          </span>
          <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command
          filter={(itemValue, search) => {
            // itemValue es el iso2; se busca contra el texto visible.
            const country = COUNTRY_CODES.find((c) => c.iso2 === itemValue.toUpperCase());
            if (!country) return 0;
            const haystack = `${country.name} ${country.iso2} ${country.dialCode}`.toLowerCase();
            return haystack.includes(search.toLowerCase().trim()) ? 1 : 0;
          }}
        >
          <CommandInput placeholder="Buscar país o código..." />
          <CommandList>
            <CommandEmpty>Sin resultados.</CommandEmpty>
            <CommandGroup>
              {COUNTRY_CODES.map((country) => (
                <CommandItem
                  key={country.iso2}
                  value={country.iso2}
                  onSelect={() => {
                    setIso2(country.iso2);
                    onChange(country.dialCode);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      country.iso2 === iso2 ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <span className="mr-2">{country.flag}</span>
                  <span className="flex-1 truncate">{country.name}</span>
                  <span className="text-muted-foreground tabular-nums">{country.dialCode}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
