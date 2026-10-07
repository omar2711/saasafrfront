'use client';

import type { Dispatch, SetStateAction } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { DialogFooter } from '@/components/ui/dialog';
import { CountryCodeCombobox } from '@/components/country-code-combobox';
import { DEFAULT_DIAL_CODE } from '@/lib/data/country-codes';

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
  /** El POS crea clientes siempre activos: no tiene sentido mostrar el switch ahi. */
  showStatus?: boolean;
}

export function CustomerForm({
  formData,
  setFormData,
  onSubmit,
  submitLabel,
  isSubmitting,
  error,
  showStatus = true,
}: CustomerFormProps) {
  // El CI/NIT es obligatorio porque es la clave de unicidad del cliente.
  const canSubmit = Boolean(formData.name.trim() && formData.taxId.trim()) && !isSubmitting;

  return (
    <div className="grid gap-4 py-4">
      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="customer-name">Nombre completo *</Label>
          <Input
            id="customer-name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Ej: Juan Perez"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customer-taxid">CI / NIT *</Label>
          <Input
            id="customer-taxid"
            value={formData.taxId}
            onChange={(e) => setFormData(prev => ({ ...prev, taxId: e.target.value.toUpperCase() }))}
            placeholder="Ej: 1234567"
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">No puede repetirse entre clientes.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="customer-phone">Telefono</Label>
          <div className="flex gap-2">
            <CountryCodeCombobox
              value={formData.phoneCountryCode}
              onChange={(value) => setFormData(prev => ({ ...prev, phoneCountryCode: value }))}
            />
            <Input
              id="customer-phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="70000000"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="customer-email">Correo electronico</Label>
          <Input
            id="customer-email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            placeholder="cliente@email.com"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="customer-address">Direccion</Label>
          <Input
            id="customer-address"
            value={formData.address}
            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
            placeholder="Calle, numero, zona"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customer-city">Ciudad</Label>
          <Input
            id="customer-city"
            value={formData.city}
            onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
            placeholder="Ej: Santa Cruz"
          />
        </div>
      </div>

      {showStatus && (
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="customer-status">Estado</Label>
            <p className="text-sm text-muted-foreground">
              {formData.isActive ? 'El cliente esta activo' : 'El cliente esta inactivo'}
            </p>
          </div>
          <Switch
            id="customer-status"
            checked={formData.isActive}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
          />
        </div>
      )}

      <DialogFooter>
        <Button type="submit" onClick={onSubmit} disabled={!canSubmit}>
          {isSubmitting ? 'Guardando...' : submitLabel}
        </Button>
      </DialogFooter>
    </div>
  );
}
