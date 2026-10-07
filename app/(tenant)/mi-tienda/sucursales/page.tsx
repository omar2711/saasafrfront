'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, MapPin, Phone, MoreHorizontal, Building2, Loader2, UserRound, Star } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { organizationsApi, type BranchDto } from '@/lib/api/organizations';
import { usersApi, membershipsApi } from '@/lib/api/users';
import { formatDate } from '@/lib/format';

interface BranchFormState {
  name: string;
  address: string;
  city: string;
  phone: string;
  managerMemberId: string;
}

/** Miembro de la organización que puede ser encargado de una sucursal. */
interface ManagerOption {
  memberId: string;
  name: string;
  email: string;
}

const NO_MANAGER = '__none__';

const EMPTY_FORM: BranchFormState = {
  name: '',
  address: '',
  city: '',
  phone: '',
  managerMemberId: NO_MANAGER,
};

export default function BranchesPage() {
  const [branches, setBranches] = useState<BranchDto[]>([]);
  const [managers, setManagers] = useState<ManagerOption[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchDto | null>(null);
  const [form, setForm] = useState<BranchFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadBranches = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await organizationsApi.listBranches();
      setBranches(data);
    } catch {
      setError('No se pudieron cargar las sucursales');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /*
   * Los candidatos a encargado necesitan `users.read`, que el Gerente tiene pero
   * un rol a medida con `settings.write` podría no tener. Si falla, se oculta el
   * selector y el resto del formulario sigue funcionando (managers = null).
   */
  const loadManagers = useCallback(async () => {
    try {
      const [users, memberships] = await Promise.all([
        usersApi.list(),
        membershipsApi.listByOrg(),
      ]);
      const userById = new Map(users.map((u) => [u.id, u]));
      setManagers(
        memberships
          .filter((m) => m.status === 'active' && userById.has(m.userId))
          .map((m) => ({
            memberId: m.id,
            name: userById.get(m.userId)!.fullName,
            email: userById.get(m.userId)!.email,
          }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
    } catch {
      setManagers(null);
    }
  }, []);

  useEffect(() => {
    loadBranches();
    loadManagers();
  }, [loadBranches, loadManagers]);

  const openCreate = () => {
    setEditingBranch(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setDialogOpen(true);
  };

  const openEdit = (branch: BranchDto) => {
    setEditingBranch(branch);
    setForm({
      name: branch.name,
      address: branch.address ?? '',
      city: branch.city ?? '',
      phone: branch.phone ?? '',
      managerMemberId: branch.managerMemberId ?? NO_MANAGER,
    });
    setFormError('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setFormError('');
    if (!form.name.trim()) { setFormError('El nombre es requerido'); return; }

    setIsSaving(true);
    try {
      const managerMemberId =
        form.managerMemberId === NO_MANAGER ? null : form.managerMemberId;
      const payload = {
        name: form.name.trim(),
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        phone: form.phone.trim() || undefined,
      };

      if (editingBranch) {
        // `null` explícito para poder QUITAR el encargado.
        await organizationsApi.updateBranch(editingBranch.id, { ...payload, managerMemberId });
      } else {
        await organizationsApi.createBranch({
          ...payload,
          managerMemberId: managerMemberId ?? undefined,
        });
      }
      setDialogOpen(false);
      await loadBranches();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (branch: BranchDto) => {
    try {
      await organizationsApi.updateBranch(branch.id, {
        status: branch.status === 'active' ? 'inactive' : 'active',
      });
      await loadBranches();
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Sucursales" description="Administra las sucursales de tu organización">
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Sucursal
        </Button>
      </PageHeader>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingBranch ? 'Editar Sucursal' : 'Nueva Sucursal'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Sucursal Central"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Dirección (opcional)</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Av. Principal N°123"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Ciudad (opcional)</Label>
              <Input
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                placeholder="Santa Cruz de la Sierra"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Teléfono (opcional)</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+591 3-XXXXXXX"
              />
            </div>
            {managers !== null && (
              <div className="space-y-1.5">
                <Label>Encargado / dueño (opcional)</Label>
                <Select
                  value={form.managerMemberId}
                  onValueChange={(v) => setForm((f) => ({ ...f, managerMemberId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin encargado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_MANAGER}>Sin encargado</SelectItem>
                    {managers.map((m) => (
                      <SelectItem key={m.memberId} value={m.memberId}>
                        <div className="flex flex-col">
                          <span>{m.name}</span>
                          <span className="text-xs text-muted-foreground">{m.email}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Quién responde por esta sucursal. Se elige entre los usuarios de la organización.
                </p>
              </div>
            )}
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingBranch ? 'Guardar' : 'Crear'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {branches.map((branch) => (
            <Card key={branch.id} className="group">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{branch.name}</h3>
                        {/* Antes era `index === 0` sobre una lista ordenada por
                            fecha descendente: marcaba la sucursal MÁS NUEVA. */}
                        {branch.isMain && (
                          <Badge variant="secondary" className="text-xs">
                            <Star className="mr-1 h-3 w-3" />
                            Principal
                          </Badge>
                        )}
                      </div>
                      <StatusBadge
                        status={branch.status === 'active' ? 'active' : 'inactive'}
                        className="mt-1"
                      />
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
                      <DropdownMenuItem onClick={() => openEdit(branch)}>Editar</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleToggleStatus(branch)}>
                        {branch.status === 'active' ? 'Desactivar' : 'Activar'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <UserRound className="h-4 w-4 shrink-0" />
                    <span className={branch.managerName ? 'text-foreground' : undefined}>
                      {branch.managerName ?? 'Sin encargado'}
                    </span>
                  </div>
                  {branch.address && (
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{branch.address}{branch.city ? `, ${branch.city}` : ''}</span>
                    </div>
                  )}
                  {branch.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4 shrink-0" />
                      <span>{branch.phone}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
                  Creada: {formatDate(branch.createdAt)}
                </div>
              </CardContent>
            </Card>
          ))}
          {branches.length === 0 && (
            <div className="col-span-3 text-center py-16 text-muted-foreground">
              No hay sucursales registradas
            </div>
          )}
        </div>
      )}
    </div>
  );
}
