'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CURRENCIES } from '@/lib/currencies';

interface CurrencyPickerProps {
  id?: string;
  value: string;
  onChange: (code: string) => void;
  /** Moneda que no se puede elegir (por ejemplo, la del sistema en el tipo de cambio). */
  exclude?: string;
  disabled?: boolean;
}

export function CurrencyPicker({ id, value, onChange, exclude, disabled }: CurrencyPickerProps) {
  const isKnown = CURRENCIES.some((c) => c.code === value);
  const [other, setOther] = useState(value !== '' && !isKnown);
  const options = CURRENCIES.filter((c) => c.code !== exclude);

  return (
    <div className="space-y-2">
      <Select
        value={other ? 'OTHER' : value}
        onValueChange={(v) => {
          if (v === 'OTHER') {
            setOther(true);
            onChange('');
          } else {
            setOther(false);
            onChange(v);
          }
        }}
        disabled={disabled}
      >
        <SelectTrigger id={id}>
          <SelectValue placeholder="Elige una moneda" />
        </SelectTrigger>
        <SelectContent>
          {options.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              {c.name} ({c.code})
            </SelectItem>
          ))}
          <SelectItem value="OTHER">Otra moneda...</SelectItem>
        </SelectContent>
      </Select>
      {other && (
        <Input
          value={value}
          maxLength={3}
          placeholder="C&oacute;digo de 3 letras, ej: JPY"
          disabled={disabled}
          onChange={(e) => onChange(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
        />
      )}
    </div>
  );
}