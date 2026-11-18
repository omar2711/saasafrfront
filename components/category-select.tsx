'use client';

import { useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { categoriesApi } from '@/lib/api/categories';

const NEW_VALUE = '__new_category__';

interface CategorySelectProps {
  id?: string;
  value: string;
  onChange: (id: string) => void;
  categories: { id: string; name: string }[];
  noneValue: string;
  disabled?: boolean;
  onCreated?: (category: { id: string; name: string }) => void;
}

export function CategorySelect({ id, value, onChange, categories, noneValue, disabled, onCreated }: CategorySelectProps) {
  const [created, setCreated] = useState<{ id: string; name: string }[]>([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const all = [...categories, ...created.filter((c) => !categories.some((x) => x.id === c.id))];

  const cancel = () => {
    setAdding(false);
    setDraft('');
    setError('');
  };

  const confirm = async () => {
    const name = draft.trim();
    if (!name) return setError('Escribe el nombre de la categoría');
    const existing = all.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      onChange(existing.id);
      return cancel();
    }
    setSaving(true);
    try {
      const made = await categoriesApi.create({ name });
      setCreated((prev) => [...prev, { id: made.id, name: made.name }]);
      onCreated?.({ id: made.id, name: made.name });
      onChange(made.id);
      cancel();
    } catch (e: unknown) {
      setError(e instanceof Error && e.message ? e.message : 'No se pudo crear la categoría');
    } finally {
      setSaving(false);
    }
  };

  if (adding) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Input
            id={id}
            autoFocus
            value={draft}
            maxLength={60}
            disabled={saving}
            placeholder="Nombre de la nueva categoría"
            onChange={(e) => {
              setDraft(e.target.value);
              setError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void confirm();
              }
              if (e.key === 'Escape') {
                e.preventDefault();
                cancel();
              }
            }}
          />
          <Button type="button" size="icon" onClick={() => void confirm()} disabled={saving} aria-label="Crear categoría">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          </Button>
          <Button type="button" size="icon" variant="outline" onClick={cancel} disabled={saving} aria-label="Cancelar">
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
      onValueChange={(v) => (v === NEW_VALUE ? setAdding(true) : onChange(v))}
      disabled={disabled}
    >
      <SelectTrigger id={id}>
        <SelectValue placeholder="Sin categoría" />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        <SelectItem value={NEW_VALUE} className="font-medium text-primary">
          + Nueva categoría
        </SelectItem>
        <SelectItem value={noneValue}>Sin categoría</SelectItem>
        {all.map((cat) => (
          <SelectItem key={cat.id} value={cat.id}>
            {cat.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}