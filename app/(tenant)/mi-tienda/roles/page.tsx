'use client';

import { FormDialog } from '@/components/form-dialog';
import { FormSection, FormField } from '@/components/form-layout';
import { ShieldCheck as RoleIcon, KeyRound as PermsIcon } from 'lucide-react';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Shield, Loader2, MoreHorizontal, Lock, Trash2, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  rolesApi,
  permissionsApi,
  type RoleDto,
  type PermissionDto,
} from '@/lib/api/users';
import { useOrganization } from '@/contexts/organization-context';

// Prefijo de permiso -> { etiqueta, feature de plan requerida (opcional) }
const GROUP_META: Record<string, { label: string; feature?: string }> = {
  suppliers: { label: 'Proveedores', feature: 'module_suppliers' },
  products: { label: 'Productos' },
  categories: { label: 'Categorías' },
  inventory: { label: 'Inventario' },
  purchases: { label: 'Nuevo Ingreso', feature: 'module_purchases' },
  quotes: { label: 'Cotizaciones', feature: 'module_quotes' },
  sales: { label: 'Ventas' },
  reports: { label: 'Reportes' },
  settings: { label: 'Configuración' },
  users: { label: 'Usuarios' },
  roles: { label: 'Roles' },
  branches: { label: 'Sucursales' },
  customers: { label: 'Clientes' },
  petty_cash: { label: 'Caja Chica', feature: 'module_petty_cash' },
  audit: { label: 'Auditoría' },
  support: { label: 'Soporte técnico' },
};

// Última respuesta conocida (por organización): al volver a la pantalla se pinta
// al instante y se refresca en segundo plano.
let rolesCache: { orgId: string; roles: RoleDto[]; perms: PermissionDto[] } | null = null;

export default function RolesPage() {
  const { hasPlanFeature, hasPermission, organization } = useOrganization();
  const cached = rolesCache && rolesCache.orgId === organization?.id ? rolesCache : null;
  const canManage = hasPermission('roles.manage');

  const [roles, setRoles] = useState<RoleDto[]>(cached?.roles ?? []);
  const [permissions, setPermissions] = useState<PermissionDto[]>(cached?.perms ?? []);
  const [isLoading, setIsLoading] = useState(!cached);
  const [error, setError] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RoleDto | null>(null);
  const [name, setName] = useState('');
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<RoleDto | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [notice, setNotice] = useState<{ title: string; description: string } | null>(null);
  const isOwnerRole = (r: RoleDto | null) => !!r && r.isSystem && r.name === 'Propietario';
  const lockedOwner = isOwnerRole(editing);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(t);
  }, [notice]);

  const loadData = useCallback(async () => {
    setError('');
    try {
      const [r, p] = await Promise.all([rolesApi.list(), permissionsApi.list()]);
      setRoles(r);
      setPermissions(p);
      if (organization) rolesCache = { orgId: organization.id, roles: r, perms: p };
    } catch {
      setError('No se pudieron cargar los roles');
    } finally {
      setIsLoading(false);
    }
  }, [organization]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Agrupa permisos por prefijo y filtra por features del plan
  const groups = useMemo(() => {
    const byPrefix = new Map<string, PermissionDto[]>();
    for (const perm of permissions) {
      const prefix = perm.code.split('.')[0];
      const list = byPrefix.get(prefix) ?? [];
      list.push(perm);
      byPrefix.set(prefix, list);
    }
    return Array.from(byPrefix.entries())
      .map(([prefix, perms]) => ({
        prefix,
        label: GROUP_META[prefix]?.label ?? prefix,
        feature: GROUP_META[prefix]?.feature,
        perms,
      }))
      .filter((g) => !g.feature || hasPlanFeature(g.feature))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [permissions, hasPlanFeature]);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setSelectedPerms(new Set());
    setFormError('');
    setDialogOpen(true);
  };

  const openEdit = (role: RoleDto) => {
    setEditing(role);
    setName(role.name);
    setSelectedPerms(new Set(role.permissions));
    setFormError('');
    setDialogOpen(true);
  };

  const togglePerm = (id: string) => {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    setFormError('');
    if (isOwnerRole(editing)) {
      setDialogOpen(false);
      return;
    }
    if (!name.trim()) {
      setFormError('El nombre es requerido');
      return;
    }
    setIsSaving(true);
    try {
      let roleId: string;
      let currentPerms: Set<string>;
      if (editing) {
        await rolesApi.update(editing.id, { name: name.trim() });
        roleId = editing.id;
        currentPerms = new Set(editing.permissions);
      } else {
        const created = await rolesApi.create({ name: name.trim() });
        roleId = created.id;
        currentPerms = new Set();
      }

      // Diff de permisos
      const toAdd = [...selectedPerms].filter((id) => !currentPerms.has(id));
      const toRemove = [...currentPerms].filter((id) => !selectedPerms.has(id));
      for (const id of toAdd) {
        await rolesApi.assignPermission(roleId, id);
      }
      for (const id of toRemove) {
        await rolesApi.removePermission(roleId, id);
      }

      setDialogOpen(false);
      await loadData();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Error al guardar el rol');
    } finally {
      setIsSaving(false);
    }
  };

  const askDelete = (role: RoleDto) => {
    setDeleteError('');
    setRoleToDelete(role);
  };

  const confirmDelete = async () => {
    if (!roleToDelete) return;
    setIsDeleting(true);
    setDeleteError('');
    try {
      await rolesApi.remove(roleToDelete.id);
      const deletedName = roleToDelete.name;
      setRoleToDelete(null);
      setNotice({ title: '¡Rol eliminado!', description: `El rol "${deletedName}" ya no existe.` });
      await loadData();
    } catch (e: unknown) {
      setDeleteError(
        e instanceof Error && e.message
          ? e.message
          : 'No se pudo eliminar el rol. Puede que tenga usuarios asignados.',
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Roles" description="Crea roles y define a qué funcionalidades puede acceder cada uno">
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Rol
          </Button>
        )}
      </PageHeader>

      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
      )}

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        icon={RoleIcon}
        title={editing ? 'Editar Rol' : 'Nuevo Rol'}
        description="El rol decide qué puede hacer cada usuario dentro de la organización."
        size="xl"
        submitLabel={lockedOwner ? 'Cerrar' : editing ? 'Guardar cambios' : 'Crear rol'}
        onSubmit={handleSave}
        isSubmitting={isSaving}
        error={formError || null}
      >
        <FormSection icon={RoleIcon} title="Datos del rol">
          <FormField label="Nombre del rol" htmlFor="role-name" required>
            <Input
              id="role-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Empleado, Vendedor, ..."
              disabled={lockedOwner}
            />
          </FormField>
        </FormSection>

        <FormSection
          icon={PermsIcon}
          title="Permisos"
          description="Solo se muestran las funcionalidades disponibles en tu plan."
        >
          <div className="space-y-3">
            {lockedOwner && (
              <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                <Lock className="h-4 w-4 shrink-0" />
                El rol Propietario siempre tiene acceso total y no se puede modificar.
              </div>
            )}
            {groups.map((group) => (
              <div key={group.prefix} className="rounded-md border p-3">
                <div className="mb-2 text-sm font-medium">{group.label}</div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {group.perms.map((perm) => (
                    <label key={perm.id} className="flex cursor-pointer items-center gap-2 text-sm">
                      <Checkbox
                        checked={lockedOwner || selectedPerms.has(perm.id)}
                        disabled={lockedOwner}
                        onCheckedChange={() => togglePerm(perm.id)}
                      />
                      <span>{perm.description ?? perm.code}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </FormSection>
      </FormDialog>

      <Dialog
        open={!!roleToDelete}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setRoleToDelete(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 ring-8 ring-red-50">
              <Trash2 className="h-7 w-7 text-red-600" />
            </div>
            <DialogTitle className="text-center">¿Eliminar este rol?</DialogTitle>
          </DialogHeader>
          <p className="text-center text-sm text-muted-foreground">
            Vas a eliminar el rol{' '}
            <span className="font-medium text-foreground">{roleToDelete?.name}</span>. Esta acción
            no se puede deshacer.
          </p>
          {deleteError && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {deleteError}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setRoleToDelete(null)} disabled={isDeleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {notice && (
        <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-black/20 p-4 backdrop-blur-[2px] animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl border bg-card p-8 text-center text-card-foreground shadow-2xl animate-in zoom-in-90 duration-300">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 ring-8 ring-emerald-50">
              <CheckCircle2 className="h-9 w-9 text-emerald-600" />
            </div>
            <h3 className="text-xl font-semibold">{notice.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{notice.description}</p>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rol</TableHead>
                <TableHead>Permisos</TableHead>
                <TableHead>Tipo</TableHead>
                {canManage && <TableHead className="w-[50px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : roles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                    No hay roles
                  </TableCell>
                </TableRow>
              ) : (
                roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded bg-muted flex items-center justify-center">
                          <Shield className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <span className="font-medium">{role.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {role.permissions.length} permiso(s)
                      </span>
                    </TableCell>
                    <TableCell>
                      {role.isSystem ? (
                        <Badge variant="secondary" className="gap-1">
                          <Lock className="h-3 w-3" /> Sistema
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Personalizado</Badge>
                      )}
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(role)}>Editar</DropdownMenuItem>
                            {!role.isSystem && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => askDelete(role)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Eliminar
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
