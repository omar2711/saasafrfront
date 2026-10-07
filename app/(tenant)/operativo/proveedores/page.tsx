'use client';

import { useState, useEffect, type Dispatch, type SetStateAction } from 'react';
import { Plus, Search, MoreHorizontal, Truck, Mail, Phone, MapPin, Edit, Trash2, Eye } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/status-badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
import { suppliersApi, type SupplierDto } from '@/lib/api/suppliers';
import { CountryCodeCombobox } from '@/components/country-code-combobox';
import { DEFAULT_DIAL_CODE } from '@/lib/data/country-codes';
import { joinPhone, splitPhone } from '@/lib/utils/phone';
import { formatDate } from '@/lib/format';

interface ProviderFormData {
  name: string;
  contactName: string;
  company: string;
  phoneCountryCode: string;
  phone: string;
  email: string;
  address: string;
  stateRegion: string;
  location: string;
  isActive: boolean;
  notes: string;
  taxId: string;
}

const emptyFormData: ProviderFormData = {
  name: '',
  contactName: '',
  company: '',
  phoneCountryCode: DEFAULT_DIAL_CODE,
  phone: '',
  email: '',
  address: '',
  stateRegion: '',
  location: '',
  isActive: true,
  notes: '',
  taxId: '',
};

/**
 * Recorta todo antes de enviar. Sin esto un nombre de solo espacios pasaba la
 * validacion del boton y el backend respondia en ingles; ademas " ACME " y
 * "ACME" se guardaban como dos proveedores distintos.
 */
function buildSupplierPayload(formData: ProviderFormData) {
  // Cadena vacia, no `undefined`: el backend distingue "campo ausente" (no
  // tocar) de "campo vacio" (borrar). Con `undefined` era imposible vaciar el
  // correo o el NIT de un proveedor: el valor anterior volvia al guardar.
  const clean = (value: string) => value.trim();
  return {
    name: formData.name.trim(),
    taxId: clean(formData.taxId),
    contactName: clean(formData.contactName),
    email: clean(formData.email),
    phone: joinPhone(formData.phoneCountryCode, formData.phone),
    address: clean(formData.address),
    stateRegion: clean(formData.stateRegion),
    location: clean(formData.location),
    company: clean(formData.company),
    notes: clean(formData.notes),
  };
}

interface ProviderFormProps {
  formData: ProviderFormData;
  setFormData: Dispatch<SetStateAction<ProviderFormData>>;
  onSubmit: () => void;
  submitLabel: string;
  isSubmitting: boolean;
  error: string | null;
}

function ProviderForm({ formData, setFormData, onSubmit, submitLabel, isSubmitting, error }: ProviderFormProps) {
  // Misma regla que el DTO del backend (@MinLength(2) tras el recorte).
  const isNameValid = formData.name.trim().length >= 2;

  return (
    <div className="grid gap-4 py-4">
      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre del proveedor *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Ej: Distribuidora ABC"
            aria-invalid={!isNameValid}
            maxLength={120}
          />
          {/* El boton deshabilitado no decia por que. */}
          {!isNameValid && (
            <p className="text-xs text-destructive">
              {formData.name.length === 0
                ? 'El nombre es obligatorio.'
                : 'El nombre debe tener al menos 2 caracteres.'}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="company">Empresa</Label>
          <Input
            id="company"
            value={formData.company}
            onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
            placeholder="Razon social"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="contactName">Nombre de contacto</Label>
          <Input
            id="contactName"
            value={formData.contactName}
            onChange={(e) => setFormData(prev => ({ ...prev, contactName: e.target.value }))}
            placeholder="Persona de contacto"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="taxId">NIT / RFC</Label>
          <Input
            id="taxId"
            value={formData.taxId}
            onChange={(e) => setFormData(prev => ({ ...prev, taxId: e.target.value.toUpperCase() }))}
            placeholder="NIT del proveedor"
            className="font-mono"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Telefono</Label>
          <div className="flex gap-2">
            <CountryCodeCombobox
              value={formData.phoneCountryCode}
              onChange={(value) => setFormData(prev => ({ ...prev, phoneCountryCode: value }))}
            />
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="70000000"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Correo electronico</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            placeholder="contacto@proveedor.com"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Direccion</Label>
        <Input
          id="address"
          value={formData.address}
          onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
          placeholder="Calle, numero, zona"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="stateRegion">Departamento / Estado</Label>
          <Input
            id="stateRegion"
            value={formData.stateRegion}
            onChange={(e) => setFormData(prev => ({ ...prev, stateRegion: e.target.value }))}
            placeholder="Ej: Santa Cruz"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="location">Pais / Region</Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
            placeholder="Ej: Bolivia"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notas</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Notas adicionales sobre el proveedor..."
          rows={3}
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label htmlFor="status">Estado</Label>
          <p className="text-sm text-muted-foreground">
            {formData.isActive ? 'El proveedor esta activo' : 'El proveedor esta inactivo'}
          </p>
        </div>
        <Switch
          id="status"
          checked={formData.isActive}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
        />
      </div>

      <DialogFooter>
        <Button
          type="submit"
          onClick={onSubmit}
          disabled={!isNameValid || isSubmitting}
        >
          {isSubmitting ? 'Guardando...' : submitLabel}
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function ProvidersPage() {
  const [providers, setProviders] = useState<SupplierDto[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [selectedProvider, setSelectedProvider] = useState<SupplierDto | null>(null);
  const [formData, setFormData] = useState<ProviderFormData>(emptyFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    suppliersApi.list()
      .then(setProviders)
      .catch(() => setError('Error al cargar proveedores'))
      .finally(() => setIsLoadingData(false));
  }, []);

  const totalProviders = providers.length;
  const activeProviders = providers.filter(p => p.status === 'active').length;
  const inactiveProviders = providers.filter(p => p.status === 'inactive').length;

  const filteredProviders = providers.filter(provider => {
    const matchesSearch =
      provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      provider.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      provider.taxId?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && provider.status === 'active') ||
      (statusFilter === 'inactive' && provider.status === 'inactive');
    return matchesSearch && matchesStatus;
  });

  // Sin este reset el banner de un intento fallido (o el "Error al cargar
  // proveedores" de la carga inicial, que comparte estado) seguia pegado dentro
  // del formulario al volver a abrirlo.
  const handleCreate = () => {
    setError(null);
    setFormData(emptyFormData);
    setIsCreateOpen(true);
  };

  const handleEdit = (provider: SupplierDto) => {
    setError(null);
    setSelectedProvider(provider);
    const { phoneCountryCode, phone } = splitPhone(provider.phone);
    setFormData({
      name: provider.name,
      contactName: provider.contactName || '',
      company: provider.company || '',
      phoneCountryCode,
      phone,
      email: provider.email || '',
      address: provider.address || '',
      stateRegion: provider.stateRegion || '',
      location: provider.location || '',
      isActive: provider.status === 'active',
      notes: provider.notes || '',
      taxId: provider.taxId || '',
    });
    setIsEditOpen(true);
  };

  const handleView = (provider: SupplierDto) => {
    setSelectedProvider(provider);
    setIsViewOpen(true);
  };

  const handleDeleteClick = (provider: SupplierDto) => {
    setSelectedProvider(provider);
    setIsDeleteOpen(true);
  };

  const handleSubmitCreate = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const created = await suppliersApi.create(buildSupplierPayload(formData));
      setProviders(prev => [created, ...prev]);
      setIsCreateOpen(false);
      setFormData(emptyFormData);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al crear proveedor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitEdit = async () => {
    if (!selectedProvider) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const updated = await suppliersApi.update(selectedProvider.id, {
        ...buildSupplierPayload(formData),
        isActive: formData.isActive,
      });
      setProviders(prev => prev.map(p => (p.id === selectedProvider.id ? updated : p)));
      setIsEditOpen(false);
      setSelectedProvider(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al actualizar proveedor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProvider) return;
    try {
      await suppliersApi.delete(selectedProvider.id);
      setProviders(prev => prev.filter(p => p.id !== selectedProvider.id));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al eliminar proveedor');
    }
    setIsDeleteOpen(false);
    setSelectedProvider(null);
  };

  const handleToggleStatus = async (provider: SupplierDto) => {
    try {
      const updated = await suppliersApi.update(provider.id, {
        isActive: provider.status !== 'active',
      });
      setProviders(prev => prev.map(p => (p.id === provider.id ? updated : p)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cambiar estado');
    }
  };

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-muted-foreground">Cargando proveedores...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Proveedores"
        description="Administra tus proveedores y contactos"
      >
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Crear Nuevo Proveedor
        </Button>
      </PageHeader>

      {error && !isCreateOpen && !isEditOpen && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Proveedores</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProviders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activos</CardTitle>
            <div className="h-2 w-2 rounded-full bg-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeProviders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactivos</CardTitle>
            <div className="h-2 w-2 rounded-full bg-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{inactiveProviders}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, email o NIT..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="inactive">Inactivos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredProviders.map((provider) => (
          <Card key={provider.id} className="group">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/10 text-primary text-lg">
                      {provider.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{provider.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {provider.contactName || 'Sin contacto'}
                    </p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleView(provider)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Ver detalles
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleEdit(provider)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleToggleStatus(provider)}>
                      {provider.status === 'active' ? 'Desactivar' : 'Activar'}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => handleDeleteClick(provider)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="mt-4">
                <StatusBadge status={provider.status} />
              </div>

              <div className="mt-4 space-y-2 text-sm">
                {provider.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4 shrink-0" />
                    <span className="truncate">{provider.email}</span>
                  </div>
                )}
                {provider.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4 shrink-0" />
                    <span>{provider.phone}</span>
                  </div>
                )}
                {(provider.address || provider.stateRegion || provider.location) && (
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                      {[provider.address, provider.stateRegion, provider.location]
                        .filter(Boolean)
                        .join(', ')}
                    </span>
                  </div>
                )}
              </div>

              {provider.taxId && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    NIT: <span className="font-mono">{provider.taxId}</span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProviders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Truck className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No hay proveedores</h3>
          <p className="text-muted-foreground mt-1">
            {searchTerm || statusFilter !== 'all'
              ? 'No se encontraron proveedores con los filtros actuales.'
              : 'Agrega tu primer proveedor para comenzar.'}
          </p>
          {!searchTerm && statusFilter === 'all' && (
            <Button className="mt-4" onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar Proveedor
            </Button>
          )}
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Proveedor</DialogTitle>
            <DialogDescription>
              Ingresa los datos del nuevo proveedor. Los campos con * son obligatorios.
            </DialogDescription>
          </DialogHeader>
          <ProviderForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleSubmitCreate}
            submitLabel="Crear Proveedor"
            isSubmitting={isSubmitting}
            error={error}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Proveedor</DialogTitle>
            <DialogDescription>Modifica los datos del proveedor.</DialogDescription>
          </DialogHeader>
          <ProviderForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleSubmitEdit}
            submitLabel="Guardar Cambios"
            isSubmitting={isSubmitting}
            error={error}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {selectedProvider?.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {selectedProvider?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedProvider && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <StatusBadge status={selectedProvider.status} />
                {selectedProvider.company && (
                  <span className="text-sm text-muted-foreground">{selectedProvider.company}</span>
                )}
              </div>
              <div className="grid gap-3 text-sm">
                {selectedProvider.contactName && (
                  <div>
                    <p className="text-muted-foreground">Contacto</p>
                    <p className="font-medium">{selectedProvider.contactName}</p>
                  </div>
                )}
                {selectedProvider.taxId && (
                  <div>
                    <p className="text-muted-foreground">NIT</p>
                    <p className="font-medium font-mono">{selectedProvider.taxId}</p>
                  </div>
                )}
                {selectedProvider.email && (
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedProvider.email}</p>
                  </div>
                )}
                {selectedProvider.phone && (
                  <div>
                    <p className="text-muted-foreground">Telefono</p>
                    <p className="font-medium">{selectedProvider.phone}</p>
                  </div>
                )}
                {selectedProvider.address && (
                  <div>
                    <p className="text-muted-foreground">Direccion</p>
                    <p className="font-medium">{selectedProvider.address}</p>
                  </div>
                )}
                {selectedProvider.stateRegion && (
                  <div>
                    <p className="text-muted-foreground">Departamento / Estado</p>
                    <p className="font-medium">{selectedProvider.stateRegion}</p>
                  </div>
                )}
                {selectedProvider.location && (
                  <div>
                    <p className="text-muted-foreground">Pais / Region</p>
                    <p className="font-medium">{selectedProvider.location}</p>
                  </div>
                )}
                {selectedProvider.notes && (
                  <div>
                    <p className="text-muted-foreground">Notas</p>
                    <p className="font-medium">{selectedProvider.notes}</p>
                  </div>
                )}
              </div>
              <div className="pt-4 border-t text-xs text-muted-foreground">
                <p>Creado: {formatDate(selectedProvider.createdAt)}</p>
                <p>Actualizado: {formatDate(selectedProvider.updatedAt)}</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsViewOpen(false)}>
                  Cerrar
                </Button>
                <Button onClick={() => { setIsViewOpen(false); handleEdit(selectedProvider); }}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar proveedor</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estas seguro de que deseas eliminar a <strong>{selectedProvider?.name}</strong>?
              Esta accion no se puede deshacer.
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
