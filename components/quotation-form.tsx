'use client';

import { useEffect, useState } from 'react';
import { FileText, UserRound, Calculator, StickyNote } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { FormDialog } from '@/components/form-dialog';
import { FormSection, FormGrid, FormField } from '@/components/form-layout';
import { QuotationProductSelector, type QuoteLineItem } from './quotation-product-selector';
import { CountryCodeCombobox } from '@/components/country-code-combobox';
import { DEFAULT_DIAL_CODE } from '@/lib/data/country-codes';
import { joinPhone } from '@/lib/utils/phone';

export interface QuotationFormData {
  clientName: string;
  clientCompany: string;
  clientNIT: string;
  clientPhone: string;
  clientEmail: string;
  clientAddress: string;
  items: QuoteLineItem[];
  discount: number;
  notes: string;
}

interface QuotationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: QuotationFormData) => void;
  isLoading?: boolean;
}

const TAX_RATE = 0.16; // 16% VAT (IVA)

const INITIAL_DATA: QuotationFormData = {
  clientName: '',
  clientCompany: '',
  clientNIT: '',
  clientPhone: '',
  clientEmail: '',
  clientAddress: '',
  items: [],
  discount: 0,
  notes: '',
};

export function QuotationForm({ open, onOpenChange, onSubmit, isLoading = false }: QuotationFormProps) {
  const [phoneCountryCode, setPhoneCountryCode] = useState(DEFAULT_DIAL_CODE);
  const [formData, setFormData] = useState<QuotationFormData>(INITIAL_DATA);
  const [formError, setFormError] = useState<string | null>(null);

  // Al abrir el diálogo, el formulario empieza limpio.
  useEffect(() => {
    if (open) {
      setFormData(INITIAL_DATA);
      setPhoneCountryCode(DEFAULT_DIAL_CODE);
      setFormError(null);
    }
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
  const tax = subtotalAfterDiscount * TAX_RATE;
  const total = subtotalAfterDiscount + tax;

  const handleFieldChange = (field: keyof QuotationFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

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

    if (!formData.clientName.trim() || !formData.clientPhone.trim()) {
      setFormError('Completa el nombre y el teléfono del cliente.');
      return;
    }
    if (formData.items.length === 0) {
      setFormError('Agrega al menos un producto a la cotización.');
      return;
    }

    setFormError(null);
    onSubmit({ ...formData, clientPhone: joinPhone(phoneCountryCode, formData.clientPhone) });
  };

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
          <FormField label="Nombre completo" htmlFor="quote-client-name" required>
            <Input
              id="quote-client-name"
              value={formData.clientName}
              onChange={(e) => handleFieldChange('clientName', e.target.value)}
              placeholder="Ej: Juan García"
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
          <FormField label="NIT/RFC" htmlFor="quote-client-nit">
            <Input
              id="quote-client-nit"
              value={formData.clientNIT}
              onChange={(e) => handleFieldChange('clientNIT', e.target.value)}
              placeholder="Ej: 123456789-0"
            />
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
                aria-label="Número de teléfono del cliente"
                autoComplete="tel-national"
                value={formData.clientPhone}
                onChange={(e) => handleFieldChange('clientPhone', e.target.value)}
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
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">IVA (16%):</span>
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
