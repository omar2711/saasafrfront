'use client';

import { useEffect, useState } from 'react';
import { Loader2, Search, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CustomerForm, emptyCustomerFormData, type CustomerFormData } from '@/components/customer-form';
import { customersApi, type CustomerDto } from '@/lib/api/customers';
import { CountryCodeCombobox } from '@/components/country-code-combobox';
import { DEFAULT_DIAL_CODE } from '@/lib/data/country-codes';
import { joinPhone } from '@/lib/utils/phone';

/** Cliente asociado a la venta en curso. Sin customerId es un cliente ocasional. */
export interface PosCustomer {
  customerId?: string;
  clientName: string;
  clientNit?: string;
  clientPhone?: string;
}

interface PosCustomerDialogProps {
  isOpen: boolean;
  onSelect: (customer: PosCustomer) => void;
  onCancel: () => void;
}

export function PosCustomerDialog({ isOpen, onSelect, onCancel }: PosCustomerDialogProps) {
  const [customers, setCustomers] = useState<CustomerDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Cliente ocasional (no se guarda en el catalogo salvo que se pida explicitamente).
  const [walkInName, setWalkInName] = useState('');
  const [walkInNit, setWalkInNit] = useState('');
  const [walkInDialCode, setWalkInDialCode] = useState(DEFAULT_DIAL_CODE);
  const [walkInPhone, setWalkInPhone] = useState('');

  // Alta de cliente nuevo desde el POS.
  const [newCustomer, setNewCustomer] = useState<CustomerFormData>(emptyCustomerFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setSearchTerm('');
    setWalkInName('');
    setWalkInNit('');
    setWalkInDialCode(DEFAULT_DIAL_CODE);
    setWalkInPhone('');
    setNewCustomer(emptyCustomerFormData);
    setSaveError(null);
    setIsLoading(true);
    customersApi
      .list()
      .then((list) => setCustomers(list.filter((c) => c.status === 'active')))
      .catch(() => setError('No se pudieron cargar los clientes'))
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  const term = searchTerm.trim().toLowerCase();
  const filteredCustomers = term
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          (c.taxId ?? '').toLowerCase().includes(term),
      )
    : customers;

  const pickRegistered = (customer: CustomerDto) => {
    onSelect({
      customerId: customer.id,
      clientName: customer.name,
      clientNit: customer.taxId ?? undefined,
      clientPhone: customer.phone ?? undefined,
    });
  };

  const confirmWalkIn = () => {
    if (!walkInName.trim()) return;
    onSelect({
      clientName: walkInName.trim(),
      clientNit: walkInNit.trim().toUpperCase() || undefined,
      clientPhone: joinPhone(walkInDialCode, walkInPhone) || undefined,
    });
  };

  const createAndSelect = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const created = await customersApi.create({
        name: newCustomer.name.trim(),
        taxId: newCustomer.taxId.trim().toUpperCase(),
        phone: joinPhone(newCustomer.phoneCountryCode, newCustomer.phone) || undefined,
        email: newCustomer.email.trim() || undefined,
        address: newCustomer.address.trim() || undefined,
        city: newCustomer.city.trim() || undefined,
      });
      pickRegistered(created);
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'No se pudo crear el cliente');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cliente de la venta</DialogTitle>
          <DialogDescription>
            Los datos elegidos se guardan en la venta y aparecen en el comprobante.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="registrado">
          <TabsList className="w-full">
            <TabsTrigger value="registrado" className="flex-1">Cliente registrado</TabsTrigger>
            <TabsTrigger value="ocasional" className="flex-1">Cliente ocasional</TabsTrigger>
            <TabsTrigger value="nuevo" className="flex-1">Nuevo</TabsTrigger>
          </TabsList>

          <TabsContent value="registrado" className="space-y-3 pt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o CI/NIT..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
            )}

            <div className="max-h-[280px] overflow-y-auto rounded-lg border divide-y">
              {isLoading ? (
                <div className="py-10 text-center">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                </div>
              ) : filteredCustomers.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  {term ? 'Sin coincidencias' : 'Todavia no hay clientes registrados'}
                </p>
              ) : (
                filteredCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => pickRegistered(customer)}
                    className="w-full text-left px-3 py-2.5 hover:bg-muted transition-colors"
                  >
                    <div className="font-medium text-sm">{customer.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {customer.taxId ? `CI/NIT: ${customer.taxId}` : 'Sin CI/NIT'}
                      {customer.phone ? ` · ${customer.phone}` : ''}
                    </div>
                  </button>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="ocasional" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="walkin-name">Nombre *</Label>
              <Input
                id="walkin-name"
                value={walkInName}
                onChange={(e) => setWalkInName(e.target.value)}
                placeholder="Ej: Juan Perez"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="walkin-nit">CI / NIT</Label>
              <Input
                id="walkin-nit"
                value={walkInNit}
                onChange={(e) => setWalkInNit(e.target.value.toUpperCase())}
                placeholder="Ej: 1234567"
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="walkin-phone">Telefono</Label>
              <div className="flex gap-2">
                <CountryCodeCombobox value={walkInDialCode} onChange={setWalkInDialCode} />
                <Input
                  id="walkin-phone"
                  type="tel"
                  value={walkInPhone}
                  onChange={(e) => setWalkInPhone(e.target.value)}
                  placeholder="70000000"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={confirmWalkIn} disabled={!walkInName.trim()}>
                Usar estos datos
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="nuevo" className="pt-2">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Se guarda en el catalogo de clientes y queda asociado a esta venta.
            </p>
            <CustomerForm
              formData={newCustomer}
              setFormData={setNewCustomer}
              onSubmit={createAndSelect}
              submitLabel="Crear y usar"
              isSubmitting={isSaving}
              error={saveError}
              showStatus={false}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
