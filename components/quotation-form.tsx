'use client';

import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { FileText, UserRound, Calculator, StickyNote, CheckCircle2, UserPlus, CalendarClock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FormDialog } from '@/components/form-dialog';
import { FormSection, FormGrid, FormField } from '@/components/form-layout';
import { QuotationProductSelector, type QuoteLineItem } from './quotation-product-selector';
import { CountryCodeCombobox } from '@/components/country-code-combobox';
import { DEFAULT_DIAL_CODE } from '@/lib/data/country-codes';
import { joinPhone, validatePhone } from '@/lib/utils/phone';
import { customersApi, type CustomerDto } from '@/lib/api/customers';
import { useSystemSettings } from '@/contexts/organization-context';

export interface QuotationFormData {
  /** Cliente ya registrado (se resuelve por CI/NIT). Si no hay, el backend lo crea. */
  customerId?: string;
  clientName: string;
  clientCompany: string;
  clientNIT: string;
  clientPhone: string;
  clientEmail: string;
  clientAddress: string;
  items: QuoteLineItem[];
  discount: number;
  applyTax: boolean;
  notes: string;
  /** Dias de validez de la cotizacion. */
  validityDays: number;
}

interface QuotationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: QuotationFormData) => void;
  isLoading?: boolean;
}


const INITIAL_DATA: QuotationFormData = {
  clientName: '',
  clientCompany: '',
  clientNIT: '',
  clientPhone: '',
  clientEmail: '',
  clientAddress: '',
  items: [],
  discount: 0,
  applyTax: true,
  notes: '',
  validityDays: 15,
};

// Mismo criterio que el backend: recorte + mayúsculas.
const normalizeKey = (v: string) => v.trim().toUpperCase();

// El teléfono se guarda completo (+591...), pero el formulario lo pide sin código de país.
const splitPhone = (full: string, dial: string) => {
  const digits = full.replace(/\D/g, '');
  const dialDigits = dial.replace(/\D/g, '');
  return dialDigits && digits.startsWith(dialDigits) ? digits.slice(dialDigits.length) : digits;
};

const normText = (v: string) =>
  v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

// Coincidencias por CI/NIT o por nombre: primero las que empiezan con lo escrito, luego las que lo contienen.
const matchCustomers = (list: CustomerDto[], query: string): CustomerDto[] => {
  const q = normText(query);
  if (q.length < 1) return [];
  const starts: CustomerDto[] = [];
  const rest: CustomerDto[] = [];
  for (const c of list) {
    const tax = normText(c.taxId ?? '');
    const name = normText(c.name);
    if (tax.startsWith(q) || name.startsWith(q) || name.split(/\s+/).some((w) => w.startsWith(q))) starts.push(c);
    else if (tax.includes(q) || name.includes(q)) rest.push(c);
  }
  return [...starts, ...rest].slice(0, 6);
};

export function QuotationForm({ open, onOpenChange, onSubmit, isLoading = false }: QuotationFormProps) {
  const [phoneCountryCode, setPhoneCountryCode] = useState(DEFAULT_DIAL_CODE);
  const { taxName, taxRate } = useSystemSettings();
  const [formData, setFormData] = useState<QuotationFormData>(INITIAL_DATA);
  const [formError, setFormError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<CustomerDto[]>([]);
  const [linkedCustomer, setLinkedCustomer] = useState<CustomerDto | null>(null);
  const [activeField, setActiveField] = useState<'nit' | 'name' | null>(null);
  const [hi, setHi] = useState(0);

  // Al abrir el diálogo, el formulario empieza limpio y se cargan los clientes para autocompletar.
  useEffect(() => {
    if (!open) return;
    setFormData(INITIAL_DATA);
    setPhoneCountryCode(DEFAULT_DIAL_CODE);
    setFormError(null);
    setLinkedCustomer(null);
    let cancelled = false;
    customersApi
      .list()
      .then((list) => {
        if (!cancelled) setCustomers(list.filter((c) => c.status === 'active' && c.taxId));
      })
      .catch(() => {
        // Sin permiso de clientes: no hay autocompletado, pero el backend igual guarda por CI/NIT.
        if (!cancelled) setCustomers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-BO', {
      style: 'currency',
      currency: 'BOB',
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Calculate totals
  const subtotal = formData.items.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = subtotal * (formData.discount / 100);
  const subtotalAfterDiscount = subtotal - discountAmount;
  const tax = formData.applyTax ? subtotalAfterDiscount * (taxRate / 100) : 0;
  const total = subtotalAfterDiscount + tax;

  const handleFieldChange = (field: keyof QuotationFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const applyCustomer = (c: CustomerDto) => {
    setLinkedCustomer(c);
    setActiveField(null);
    setFormData((prev) => ({
      ...prev,
      customerId: c.id,
      clientNIT: c.taxId ?? prev.clientNIT,
      clientName: c.name,
      clientEmail: c.email ?? '',
      clientAddress: c.address ?? '',
      clientPhone: c.phone ? splitPhone(c.phone, phoneCountryCode) : prev.clientPhone,
    }));
  };

  const handleNitChange = (value: string) => {
    setActiveField('nit');
    const upper = value.toUpperCase();
    const key = normalizeKey(upper);
    const exact = key ? customers.find((c) => normalizeKey(c.taxId ?? '') === key) : undefined;
    if (exact) {
      applyCustomer(exact);
      return;
    }
    setLinkedCustomer(null);
    setFormData((prev) => ({ ...prev, clientNIT: upper, customerId: undefined }));
  };

  const handleNameChange = (value: string) => {
    setActiveField('name');
    setLinkedCustomer(null);
    setFormData((prev) => ({ ...prev, clientName: value, customerId: undefined }));
  };

  // Coincidencias mientras se escribe en CI/NIT o en el nombre.
  const nitSuggestions = useMemo(
    () => (linkedCustomer || activeField !== 'nit' ? [] : matchCustomers(customers, formData.clientNIT)),
    [customers, formData.clientNIT, linkedCustomer, activeField],
  );
  const nameSuggestions = useMemo(
    () => (linkedCustomer || activeField !== 'name' ? [] : matchCustomers(customers, formData.clientName)),
    [customers, formData.clientName, linkedCustomer, activeField],
  );

  const currentList = activeField === 'nit' ? nitSuggestions : activeField === 'name' ? nameSuggestions : [];

  // Al escribir, el resaltado vuelve al primer resultado.
  useEffect(() => {
    setHi(0);
  }, [activeField, formData.clientNIT, formData.clientName]);

  const handleSuggestKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setActiveField(null);
      return;
    }
    if (currentList.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHi((h) => (h + 1) % currentList.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHi((h) => (h - 1 + currentList.length) % currentList.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      applyCustomer(currentList[hi] ?? currentList[0]);
    }
  };

  const plain = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  // Resalta la parte del texto que coincide con lo escrito (sin distinguir tildes ni mayusculas).
  const highlight = (text: string, query: string) => {
    const q = plain(query).trim();
    const idx = q ? plain(text).indexOf(q) : -1;
    if (idx < 0) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="rounded-sm bg-primary/15 px-0.5 text-foreground">{text.slice(idx, idx + q.length)}</mark>
        {text.slice(idx + q.length)}
      </>
    );
  };

  const initialsOf = (name: string) =>
    name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';

  const renderSuggestions = (list: CustomerDto[], query: string) =>
    list.length === 0 ? null : (
      <div className="relative">
        <div
          className="absolute left-0 right-0 top-1 z-50 overflow-hidden rounded-lg border bg-popover shadow-lg"
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-1.5 text-[11px] text-muted-foreground">
            <span>{list.length} {list.length === 1 ? 'cliente encontrado' : 'clientes encontrados'}</span>
            <span className="hidden sm:inline">↑↓ navegar · Enter elegir · Esc cerrar</span>
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {list.map((c, i) => (
              <button
                key={c.id}
                type="button"
                className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${i === hi ? 'bg-primary/10' : 'hover:bg-muted'}`}
                onMouseEnter={() => setHi(i)}
                onClick={() => applyCustomer(c)}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {initialsOf(c.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{highlight(c.name, query)}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    CI/NIT: <span className="font-mono">{highlight(c.taxId ?? '', query)}</span>
                    {c.phone ? ` · ${c.phone}` : ''}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );

  const handleAddItem = (item: QuoteLineItem) => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, item],
    }));
  };

  const handleRemoveItem = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
  };

  const handleSubmit = (e?: { preventDefault?: () => void }) => {
    e?.preventDefault?.();

    if (!formData.clientNIT.trim() || !formData.clientName.trim() || !formData.clientPhone.trim()) {
      setFormError('Completa el CI/NIT, el nombre y el teléfono del cliente.');
      return;
    }
    if (formData.items.length === 0) {
      setFormError('Agrega al menos un producto a la cotización.');
      return;
    }

    setFormError(null);
    const phoneError = validatePhone(phoneCountryCode, formData.clientPhone);
    if (phoneError) {
      setFormError(phoneError);
      return;
    }
    onSubmit({
      ...formData,
      clientNIT: normalizeKey(formData.clientNIT),
      clientPhone: joinPhone(phoneCountryCode, formData.clientPhone),
    });
  };

  // Fecha en que vence la cotizacion segun los dias elegidos.
  const expiryLabel = new Date(Date.now() + (formData.validityDays || 15) * 86400000).toLocaleDateString('es-BO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={FileText}
      title="Crear Nueva Cotización"
      description="Completa la información del cliente y selecciona los productos."
      size="xl"
      submitLabel="Crear presupuesto"
      onSubmit={handleSubmit}
      isSubmitting={isLoading}
      submitDisabled={formData.items.length === 0}
      error={formError}
    >
      <FormSection icon={UserRound} title="Información del cliente">
        <FormGrid>
          <FormField label="CI / NIT" htmlFor="quote-client-nit" required>
            <Input
              id="quote-client-nit"
              value={formData.clientNIT}
              onChange={(e) => handleNitChange(e.target.value)}
              onFocus={() => setActiveField('nit')}
              onBlur={() => setActiveField(null)}
              onKeyDown={handleSuggestKey}
              placeholder="Ej: 1234567 o 1020304056"
              autoComplete="off"
            />
            {renderSuggestions(nitSuggestions, formData.clientNIT)}
            {linkedCustomer ? (
              <p className="mt-1 flex items-center gap-1 text-xs text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Cliente registrado: {linkedCustomer.name}
              </p>
            ) : formData.clientNIT.trim().length >= 5 ? (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <UserPlus className="h-3.5 w-3.5" />
                Cliente nuevo: se guardará con este CI/NIT.
              </p>
            ) : null}
          </FormField>
          <FormField label="Nombre completo" htmlFor="quote-client-name" required>
            <Input
              id="quote-client-name"
              value={formData.clientName}
              onChange={(e) => handleNameChange(e.target.value)}
              onFocus={() => setActiveField('name')}
              onBlur={() => setActiveField(null)}
              onKeyDown={handleSuggestKey}
              autoComplete="off"
              placeholder="Ej: Juan García"
            />
            {renderSuggestions(nameSuggestions, formData.clientName)}
          </FormField>
          <FormField label="Teléfono" htmlFor="quote-client-phone" required>
            <div className="flex gap-2">
              <CountryCodeCombobox
                value={phoneCountryCode}
                onChange={setPhoneCountryCode}
                disabled={isLoading}
              />
              <Input
                id="quote-client-phone"
                type="tel"
                inputMode="tel"
                maxLength={16}
                aria-label="Número de teléfono del cliente"
                autoComplete="tel-national"
                value={formData.clientPhone}
                onChange={(e) => handleFieldChange('clientPhone', e.target.value.replace(/[^\d\s]/g, ''))}
                placeholder="Ej: 70000000"
                className="min-w-0"
                disabled={isLoading}
              />
            </div>
          </FormField>
          <FormField label="Email" htmlFor="quote-client-email">
            <Input
              id="quote-client-email"
              type="email"
              value={formData.clientEmail}
              onChange={(e) => handleFieldChange('clientEmail', e.target.value)}
              placeholder="Ej: cliente@empresa.com"
            />
          </FormField>
          <FormField label="Empresa" htmlFor="quote-client-company">
            <Input
              id="quote-client-company"
              value={formData.clientCompany}
              onChange={(e) => handleFieldChange('clientCompany', e.target.value)}
              placeholder="Ej: Tech Solutions Inc."
            />
          </FormField>
          <FormField label="Dirección" htmlFor="quote-client-address">
            <Input
              id="quote-client-address"
              value={formData.clientAddress}
              onChange={(e) => handleFieldChange('clientAddress', e.target.value)}
              placeholder="Ej: Calle Principal 123, Apartamento 4B"
            />
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection icon={CalendarClock} title="Vigencia de la cotizaci&oacute;n">
        <FormGrid>
          <FormField label="V&aacute;lida por" htmlFor="quote-validity">
            <Select
              value={String(formData.validityDays)}
              onValueChange={(v) => handleFieldChange('validityDays', Number(v))}
            >
              <SelectTrigger id="quote-validity">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[7, 15, 30, 45, 60, 90].map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    {d} d&iacute;as
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <div className="flex flex-col justify-end pb-2">
            <p className="text-xs text-muted-foreground">Vence el</p>
            <p className="text-sm font-medium">{expiryLabel}</p>
          </div>
        </FormGrid>
      </FormSection>

      <QuotationProductSelector
        items={formData.items}
        onAddItem={handleAddItem}
        onRemoveItem={handleRemoveItem}
        onUpdateItem={(item) => {
          setFormData((prev) => ({
            ...prev,
            items: prev.items.map((i) => (i.id === item.id ? item : i)),
          }));
        }}
      />

      <FormSection icon={Calculator} title="Resumen de presupuesto">
        <FormGrid>
          <FormField label="Descuento (%)" htmlFor="quote-discount">
            <Input
              id="quote-discount"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={formData.discount}
              onChange={(e) => handleFieldChange('discount', parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
          </FormField>
          <div className="flex flex-col justify-end pb-2">
            <p className="text-sm text-muted-foreground">
              Descuento: {formatCurrency(discountAmount)}
            </p>
          </div>
        </FormGrid>

        <div className="mt-4 space-y-2 border-t pt-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal:</span>
            <span className="font-medium">{formatCurrency(subtotal)}</span>
          </div>
          {formData.discount > 0 && (
            <div className="flex justify-between text-sm text-yellow-600">
              <span>Descuento ({formData.discount}%):</span>
              <span className="font-medium">-{formatCurrency(discountAmount)}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <label className="flex cursor-pointer items-center gap-2 text-muted-foreground">
              <input
                type="checkbox"
                checked={formData.applyTax}
                onChange={(e) => setFormData((prev) => ({ ...prev, applyTax: e.target.checked }))}
                className="h-4 w-4 accent-primary"
              />
              <span>{taxName} ({taxRate}%):</span>
            </label>
            <span className="font-medium">{formatCurrency(tax)}</span>
          </div>
          <div className="flex justify-between border-t pt-2 text-lg">
            <span className="font-semibold">Total:</span>
            <span className="font-bold text-primary">{formatCurrency(total)}</span>
          </div>
        </div>

        <div className="mt-4 flex gap-2 border-t pt-4">
          <Badge variant="secondary">{formData.items.length} productos</Badge>
          <Badge variant="secondary">
            {formData.items.reduce((sum, item) => sum + item.quantity, 0)} unidades
          </Badge>
        </div>
      </FormSection>

      <FormSection icon={StickyNote} title="Observaciones">
        <FormField label="Observaciones (opcional)" htmlFor="quote-notes">
          <Textarea
            id="quote-notes"
            value={formData.notes}
            onChange={(e) => handleFieldChange('notes', e.target.value)}
            placeholder="Términos de pago, condiciones especiales, etc..."
            rows={4}
          />
        </FormField>
      </FormSection>
    </FormDialog>
  );
}