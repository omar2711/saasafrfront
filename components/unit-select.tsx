'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ADD_VALUE = '__add_unit__';
const STORAGE_KEY = 'saas-custom-units';

export const UNIT_GROUPS: { label: string; units: string[] }[] = [
  { label: 'Conteo', units: ['unidad', 'par', 'docena', 'ciento', 'millar', 'juego', 'kit'] },
  { label: 'Empaque', units: ['caja', 'paquete', 'bolsa', 'bulto', 'saco', 'fardo', 'bandeja', 'blister', 'sobre', 'rollo', 'pallet'] },
  { label: 'Envases', units: ['botella', 'lata', 'frasco', 'tarro', 'balde', 'bidón', 'barril', 'tubo'] },
  { label: 'Peso', units: ['mg', 'g', 'kg', 'lb', 'oz', 'quintal', 'tonelada'] },
  { label: 'Volumen', units: ['ml', 'cl', 'litro', 'galón', 'm³'] },
  { label: 'Longitud', units: ['mm', 'cm', 'metro', 'km', 'pulgada', 'pie', 'yarda'] },
  { label: 'Superficie', units: ['m²', 'ft²'] },
  { label: 'Tiempo y servicios', units: ['hora', 'día', 'semana', 'mes', 'servicio', 'sesión', 'licencia'] },
];

function loadCustom(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((u): u is string => typeof u === 'string') : [];
  } catch {
    return [];
  }
}

function saveCustom(list: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* sin almacenamiento disponible */
  }
}

interface UnitSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function UnitSelect({ id, value, onChange, disabled }: UnitSelectProps) {
  const [custom, setCustom] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setCustom(loadCustom());
  }, []);

  const builtIn = useMemo(() => new Set(UNIT_GROUPS.flatMap((g) => g.units)), []);

  // Propias + la del producto si es un valor viejo que no esta en la lista.
  const extras = useMemo(() => {
    const list = custom.filter((u) => !builtIn.has(u));
    if (value && !builtIn.has(value) && !list.includes(value)) list.unshift(value);
    return list;
  }, [custom, builtIn, value]);

  const cancel = () => {
    setAdding(false);
    setDraft('');
    setError('');
  };

  const confirm = () => {
    const name = draft.trim();
    if (!name) return setError('Escribe el nombre de la unidad');
    if (name.length > 20) return setError('Máximo 20 caracteres');
    const existing = [...builtIn, ...extras].find((u) => u.toLowerCase() === name.toLowerCase());
    if (!existing) {
      const next = [...custom, name];
      setCustom(next);
      saveCustom(next);
    }
    onChange(existing ?? name);
    cancel();
  };

  if (adding) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Input
            id={id}
            autoFocus
            value={draft}
            maxLength={20}
            placeholder="Ej: arroba, tanda, galón"
            onChange={(e) => {
              setDraft(e.target.value);
              setError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                confirm();
              }
              if (e.key === 'Escape') {
                e.preventDefault();
                cancel();
              }
            }}
          />
          <Button type="button" size="icon" onClick={confirm} aria-label="Guardar unidad">
            <Check className="h-4 w-4" />
          </Button>
          <Button type="button" size="icon" variant="outline" onClick={cancel} aria-label="Cancelar">
            <X className="h-4 w-4" />
          </Button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <Select
      value={value}
      onValueChange={(v) => (v === ADD_VALUE ? setAdding(true) : onChange(v))}
      disabled={disabled}
    >
      <SelectTrigger id={id}>
        <SelectValue placeholder="Selecciona una unidad" />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        <SelectGroup>
          <SelectItem value={ADD_VALUE} className="font-medium text-primary">
            + Agregar unidad
          </SelectItem>
        </SelectGroup>
        {extras.length > 0 && (
          <SelectGroup>
            <SelectLabel>Personalizadas</SelectLabel>
            {extras.map((u) => (
              <SelectItem key={'c-' + u} value={u}>
                {u}
              </SelectItem>
            ))}
          </SelectGroup>
        )}
        {UNIT_GROUPS.map((g) => (
          <SelectGroup key={g.label}>
            <SelectLabel>{g.label}</SelectLabel>
            {g.units.map((u) => (
              <SelectItem key={u} value={u}>
                {u}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}