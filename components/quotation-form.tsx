'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { QuotationProductSelector, type QuoteLineItem } from './quotation-product-selector';
import { Badge } from '@/components/ui/badge';

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
  onSubmit: (data: QuotationFormData) => void;
  isLoading?: boolean;
}

const TAX_RATE = 0.16; // 16% VAT (IVA)

export function QuotationForm({ onSubmit, isLoading = false }: QuotationFormProps) {
  const [formData, setFormData] = useState<QuotationFormData>({
    clientName: '',
    clientCompany: '',
    clientNIT: '',
    clientPhone: '',
    clientEmail: '',
    clientAddress: '',
    items: [],
    discount: 0,
    notes: '',
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
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
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddItem = (item: QuoteLineItem) => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, item],
    }));
  };

  const handleRemoveItem = (id: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.clientName || !formData.clientPhone || !formData.items.length) {
      alert('Por favor completa todos los campos requeridos y agrega al menos un producto');
      return;
    }

    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Client Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Información del Cliente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Nombre Completo *</label>
              <Input
                required
                value={formData.clientName}
                onChange={(e) => handleFieldChange('clientName', e.target.value)}
                placeholder="Ej: Juan García"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Empresa</label>
              <Input
                value={formData.clientCompany}
                onChange={(e) => handleFieldChange('clientCompany', e.target.value)}
                placeholder="Ej: Tech Solutions Inc."
              />
            </div>
            <div>
              <label className="text-sm font-medium">NIT/RFC</label>
              <Input
                value={formData.clientNIT}
                onChange={(e) => handleFieldChange('clientNIT', e.target.value)}
                placeholder="Ej: 123456789-0"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Teléfono *</label>
              <Input
                required
                type="tel"
                value={formData.clientPhone}
                onChange={(e) => handleFieldChange('clientPhone', e.target.value)}
                placeholder="Ej: +52 55 1234 5678"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={formData.clientEmail}
                onChange={(e) => handleFieldChange('clientEmail', e.target.value)}
                placeholder="Ej: cliente@empresa.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Dirección</label>
              <Input
                value={formData.clientAddress}
                onChange={(e) => handleFieldChange('clientAddress', e.target.value)}
                placeholder="Ej: Calle Principal 123, Apartamento 4B"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product Selection */}
      <QuotationProductSelector
        items={formData.items}
        onAddItem={handleAddItem}
        onRemoveItem={handleRemoveItem}
        onUpdateItem={(item) => {
          setFormData(prev => ({
            ...prev,
            items: prev.items.map(i => (i.id === item.id ? item : i)),
          }));
        }}
      />

      {/* Pricing Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumen de Presupuesto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Descuento (%)</label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.discount}
                onChange={(e) => handleFieldChange('discount', parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div className="flex flex-col justify-end">
              <p className="text-sm text-muted-foreground">
                Descuento: {formatCurrency(discountAmount)}
              </p>
            </div>
          </div>

          {/* Totals */}
          <div className="space-y-2 pt-4 border-t">
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
            <div className="flex justify-between text-lg pt-2 border-t">
              <span className="font-semibold">Total:</span>
              <span className="font-bold text-primary">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-2 pt-4 border-t">
            <Badge variant="secondary">{formData.items.length} productos</Badge>
            <Badge variant="secondary">
              {formData.items.reduce((sum, item) => sum + item.quantity, 0)} unidades
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Observaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.notes}
            onChange={(e) => handleFieldChange('notes', e.target.value)}
            placeholder="Términos de pago, condiciones especiales, etc..."
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-2">
        <Button type="submit" disabled={isLoading || formData.items.length === 0}>
          {isLoading ? 'Creando...' : 'Crear Presupuesto'}
        </Button>
        <Button type="button" variant="outline" disabled={isLoading}>
          Guardar como Borrador
        </Button>
      </div>
    </form>
  );
}
