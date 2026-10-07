'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, MoreHorizontal, Users, Mail, Phone, MapPin, Edit, Trash2, Eye, History, Loader2,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/status-badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CustomerForm, emptyCustomerFormData, type CustomerFormData } from '@/components/customer-form';
import { CustomerHistoryDialog } from '@/components/customer-history-dialog';
import { customersApi, type CustomerDto } from '@/lib/api/customers';
import { joinPhone, splitPhone } from '@/lib/utils/phone';
import { useOrganization } from '@/contexts/organization-context';

export default function CustomersPage() {
  const { hasPermission } = useOrganization();
  const canWrite = hasPermission('customers.write');
  const canDelete = hasPermission('customers.delete');

  const [customers, setCustomers] = useState<CustomerDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [deletingCustomer, setDeletingCustomer] = useState<CustomerDto | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDto | null>(null);

  const [formData, setFormData] = useState<CustomerFormData>(emptyCustomerFormData);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadCustomers = useCallback(async () => {
    setIsLoading(true);
    setListError('');
    try {
      setCustomers(await customersApi.list());
    } catch {
      setListError('No se pudieron cargar los clientes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const openCreate = () => {
    setFormData(emptyCustomerFormData);
    setFormError(null);
    setIsCreateOpen(true);
  };

  const openEdit = (customer: CustomerDto) => {
    const { phoneCountryCode, phone } = splitPhone(customer.phone);
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name,
      taxId: customer.taxId ?? '',
      phoneCountryCode,
      phone,
      email: customer.email ?? '',
      address: customer.address ?? '',
      city: customer.city ?? '',
      isActive: customer.status === 'active',
    });
    setFormError(null);
    setIsEditOpen(true);
  };

  const buildPayload = () => ({
    name: formData.name.trim(),
    taxId: formData.taxId.trim().toUpperCase(),
    phone: joinPhone(formData.phoneCountryCode, formData.phone) || undefined,
    email: formData.email.trim() || undefined,
    address: formData.address.trim() || undefined,
    city: formData.city.trim() || undefined,
  });

  const handleCreate = async () => {
    setIsSubmitting(true);
    setFormError(null);
    try {
      await customersApi.create(buildPayload());
      setIsCreateOpen(false);
      await loadCustomers();
    } catch (e: unknown) {
      // El backend devuelve 409 con el mensaje de CI/NIT duplicado.
      setFormError(e instanceof Error ? e.message : 'No se pudo crear el cliente');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedCustomer) return;
    setIsSubmitting(true);
    setFormError(null);
    try {
      await customersApi.update(selectedCustomer.id, {
        ...buildPayload(),
        status: formData.isActive ? 'active' : 'inactive',
      });
      setIsEditOpen(false);
      setSelectedCustomer(null);
      await loadCustomers();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'No se pudo actualizar el cliente');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (customer: CustomerDto) => {
    setListError('');
    try {
      await customersApi.update(customer.id, {
        status: customer.status === 'active' ? 'inactive' : 'active',
      });
      await loadCustomers();
    } catch (e: unknown) {
      setListError(e instanceof Error ? e.message : 'No se pudo cambiar el estado del cliente');
    }
  };

  const handleDelete = async () => {
    if (!deletingCustomer) return;
    setListError('');
    try {
      await customersApi.delete(deletingCustomer.id);
      setDeletingCustomer(null);
      await loadCustomers();
    } catch (e: unknown) {
      setListError(e instanceof Error ? e.message : 'No se pudo eliminar el cliente');
    }
  };

  const term = searchTerm.trim().toLowerCase();
  const filteredCustomers = customers.filter((customer) => {
    const matchSearch =
      !term ||
      customer.name.toLowerCase().includes(term) ||
      (customer.taxId ?? '').toLowerCase().includes(term) ||
      (customer.email ?? '').toLowerCase().includes(term);
    const matchStatus = statusFilter === 'all' || customer.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const activeCount = customers.filter((c) => c.status === 'active').length;

  return (
    <div className="space-y-6">
      <PageHeader title="Clientes" description="Registro de clientes y su historial de compras">
        {canWrite && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Cliente
          </Button>
        )}
      </PageHeader>

      {listError && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{listError}</div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{customers.length}</div>
            <p className="text-sm text-muted-foreground">Clientes registrados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{activeCount}</div>
            <p className="text-sm text-muted-foreground">Activos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{customers.length - activeCount}</div>
            <p className="text-sm text-muted-foreground">Inactivos</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, CI/NIT o correo..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="inactive">Inactivos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No hay clientes</h3>
          <p className="text-muted-foreground mt-1">
            {term || statusFilter !== 'all'
              ? 'No se encontraron clientes con los filtros actuales.'
              : 'Registra tu primer cliente.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCustomers.map((customer) => (
            <Card key={customer.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{customer.name}</h3>
                    <StatusBadge status={customer.status} />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setSelectedCustomer(customer); setIsViewOpen(true); }}>
                        <Eye className="mr-2 h-4 w-4" />
                        Ver detalles
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setSelectedCustomer(customer); setIsHistoryOpen(true); }}>
                        <History className="mr-2 h-4 w-4" />
                        Historial de compras
                      </DropdownMenuItem>
                      {canWrite && (
                        <>
                          <DropdownMenuItem onClick={() => openEdit(customer)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(customer)}>
                            {customer.status === 'active' ? 'Desactivar' : 'Activar'}
                          </DropdownMenuItem>
                        </>
                      )}
                      {canDelete && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeletingCustomer(customer)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  {customer.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4 shrink-0" />
                      <span className="truncate">{customer.email}</span>
                    </div>
                  )}
                  {customer.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4 shrink-0" />
                      <span>{customer.phone}</span>
                    </div>
                  )}
                  {(customer.address || customer.city) && (
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{[customer.address, customer.city].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                </div>

                {customer.taxId && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs text-muted-foreground">
                      CI/NIT: <span className="font-mono">{customer.taxId}</span>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Nuevo cliente</DialogTitle>
            <DialogDescription>El CI/NIT no puede repetirse entre clientes.</DialogDescription>
          </DialogHeader>
          <CustomerForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleCreate}
            submitLabel="Crear cliente"
            isSubmitting={isSubmitting}
            error={formError}
            showStatus={false}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Editar cliente</DialogTitle>
            <DialogDescription>Actualiza los datos de {selectedCustomer?.name}.</DialogDescription>
          </DialogHeader>
          <CustomerForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleEdit}
            submitLabel="Guardar cambios"
            isSubmitting={isSubmitting}
            error={formError}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{selectedCustomer?.name}</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">CI / NIT</p>
                <p className="font-medium font-mono">{selectedCustomer.taxId ?? '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Estado</p>
                <StatusBadge status={selectedCustomer.status} />
              </div>
              <div>
                <p className="text-muted-foreground">Correo</p>
                <p className="font-medium">{selectedCustomer.email ?? '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Telefono</p>
                <p className="font-medium">{selectedCustomer.phone ?? '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Direccion</p>
                <p className="font-medium">{selectedCustomer.address ?? '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Ciudad</p>
                <p className="font-medium">{selectedCustomer.city ?? '—'}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>Cerrar</Button>
            {selectedCustomer && (
              <Button onClick={() => { setIsViewOpen(false); setIsHistoryOpen(true); }}>
                <History className="mr-2 h-4 w-4" />
                Ver historial
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CustomerHistoryDialog
        isOpen={isHistoryOpen}
        customer={selectedCustomer}
        onClose={() => setIsHistoryOpen(false)}
      />

      <AlertDialog open={!!deletingCustomer} onOpenChange={(open) => !open && setDeletingCustomer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar cliente</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar a <strong>{deletingCustomer?.name}</strong>? Las ventas ya registradas conservan
              sus datos, pero el cliente dejara de aparecer en el listado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
