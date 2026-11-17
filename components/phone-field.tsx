'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CountryCodeCombobox } from '@/components/country-code-combobox';
import { cn } from '@/lib/utils';
import { validatePhone } from '@/lib/utils/phone';

interface PhoneFieldProps {
  label?: string;
  id?: string;
  code: string;
  number: string;
  onChange: (code: string, number: string) => void;
  /** Fuerza mostrar el error (por ejemplo al intentar guardar). */
  showError?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function PhoneField({
  label = 'Teléfono',
  id,
  code,
  number,
  onChange,
  showError = false,
  disabled,
  placeholder = '71234567',
}: PhoneFieldProps) {
  const [touched, setTouched] = useState(false);
  const error = validatePhone(code, number);
  const visibleError = (touched || showError) && error ? error : null;

  return (
    <div className="space-y-1.5">
      {label && <Label htmlFor={id}>{label}</Label>}
      <div
        className={cn(
          'flex items-stretch overflow-hidden rounded-md border bg-background transition-shadow',
          'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1',
          visibleError && 'border-destructive focus-within:ring-destructive',
        )}
      >
        <CountryCodeCombobox
          value={code}
          onChange={(c) => onChange(c, number)}
          disabled={disabled}
          className="rounded-none border-0 border-r"
        />
        <Input
          id={id}
          type="tel"
          inputMode="tel"
          maxLength={16}
          value={number}
          disabled={disabled}
          placeholder={placeholder}
          onBlur={() => setTouched(true)}
          onChange={(e) => onChange(code, e.target.value.replace(/[^\d\s]/g, ''))}
          className="rounded-none border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>
      {visibleError && <p className="text-xs text-destructive">{visibleError}</p>}
    </div>
  );
}