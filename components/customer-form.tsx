'use client';

import type { Dispatch, SetStateAction } from 'react';
import { Loader2, MapPin, Phone, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { PhoneField } from '@/components/phone-field';
import { FormSection, FormGrid, FormField } from '@/components/form-layout';
import { DEFAULT_DIAL_CODE } from '@/lib/data/country-codes';
import { validatePhone } from '@/lib/utils/phone';

export interface CustomerFormData {
  name: string;
  taxId: string;
  phoneCountryCode: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  isActive: boolean;
}

export const emptyCustomerFormData: CustomerFormData = {
  name: '',
  taxId: '',
  phoneCountryCode: DEFAULT_DIAL_CODE,
  phone: '',
  email: '',
  address: '',
  city: '',
  isActive: true,
};

interface CustomerFormProps {
  formData: CustomerFormData;
  setFormData: Dispatch<SetStateAction<CustomerFormData>>;
  onSubmit: () => void;
  submitLabel: string;
  isSubmitting: boolean;
  error: string | null;
  /** El POS crea clientes siempre activos: no tiene sentido mostrar el switch ahí. */
  showStatus?: boolean;
  /** Si se pasa, se muestra el botón "Cancelar" junto al botón principal. */
  onCancel?: () => void;
}

export function CustomerForm({
  formData,
  setFormData,
  onSubmit,
  submitLabel,
  isSubmitting,
  error,
  showStatus = true,
  onCancel,
}: CustomerFormProps) {
  const phoneError = validatePhone(formData.phoneCountryCode, formData.phone);
  // El CI/NIT es obligatorio porque es la clave de unicidad del cliente.
  const canSubmit =
    Boolean(formData.name.trim() && formData.taxId.trim()) && !phoneError && !isSubmitting;

  return (
    <form
      className="space-y-6 py-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) onSubmit();
      }}
    >
      <FormSection icon={UserRound} title="Datos del cliente">
        <FormGrid>
          <FormField label="Nombre completo" htmlFor="customer-name" required>
            <Input
              id="customer-name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Ej: Juan Pérez"
            />
          </FormField>
          <FormField
            label="CI / NIT"
            htmlFor="customer-taxid"
            required
            hint="No puede repetirse entre clientes."
          >
            <Input
              id="customer-taxid"
              value={formData.taxId}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, taxId: e.target.value.toUpperCase() }))
              }
              placeholder="Ej: 1234567"
              className="font-mono"
            />
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection icon={Phone} title="Contacto">
        <FormGrid>
          <PhoneField
            id="customer-phone"
            label="Teléfono"
            code={formData.phoneCountryCode}
            number={formData.phone}
            onChange={(code, number) =>
              setFormData((prev) => ({ ...prev, phoneCountryCode: code, phone: number }))
            }
            showError={Boolean(error)}
          />
          <FormField label="Correo electrónico" htmlFor="customer-email">
            <Input
              id="customer-email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="cliente@email.com"
            />
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection icon={MapPin} title="Ubicación">
        <FormGrid>
          <FormField label="Dirección" htmlFor="customer-address">
            <Input
              id="customer-address"
              value={formData.address}
              onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
              placeholder="Calle, número, zona"
            />
          </FormField>
          <FormField label="Ciudad" htmlFor="customer-city">
            <Input
              id="customer-city"
              value={formData.city}
              onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
              placeholder="Ej: Santa Cruz"
            />
          </FormField>
        </FormGrid>
      </FormSection>

      {showStatus && (
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="customer-status">Estado</Label>
            <p className="text-sm text-muted-foreground">
              {formData.isActive ? 'El cliente está activo' : 'El cliente está inactivo'}
            </p>
          </div>
          <Switch
            id="customer-status"
            checked={formData.isActive}
            onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isActive: checked }))}
          />
        </div>
      )}

      <div className="space-y-3 border-t pt-4">
        {error && (
          <div
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </div>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={!canSubmit} className="min-w-[120px]">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Guardando...' : submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}