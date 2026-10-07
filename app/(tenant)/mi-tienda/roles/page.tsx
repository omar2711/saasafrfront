'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Shield, Loader2, MoreHorizontal, Lock } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  purchases: { label: 'Órdenes de Compra', feature: 'module_purchases' },
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

export default function RolesPage() {
  const { hasPlanFeature, hasPermission } = useOrganization();
  const canManage = hasPermission('roles.manage');

  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [permissions, setPermissions] = useState<PermissionDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RoleDto | null>(null);
  const [name, setName] = useState('');
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [r, p] = await Promise.all([rolesApi.list(), permissionsApi.list()]);
      setRoles(r);
      setPermissions(p);
    } catch {
      setError('No se pudieron cargar los roles');
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  const handleDelete = async (role: RoleDto) => {
    if (!confirm(`¿Eliminar el rol "${role.name}"?`)) return;
    try {
      await rolesApi.remove(role.id);
      await loadData();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al eliminar el rol');
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Rol' : 'Nuevo Rol'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Nombre del rol</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Empleado, Vendedor, ..."
              />
            </div>

            <div className="space-y-3">
              <Label>Permisos</Label>
              <p className="text-xs text-muted-foreground">
                Solo se muestran las funcionalidades disponibles en tu plan.
              </p>
              {groups.map((group) => (
                <div key={group.prefix} className="rounded-md border p-3">
                  <div className="font-medium text-sm mb-2">{group.label}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {group.perms.map((perm) => (
                      <label key={perm.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={selectedPerms.has(perm.id)}
                          onCheckedChange={() => togglePerm(perm.id)}
                        />
                        <span>{perm.description ?? perm.code}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? 'Guardar' : 'Crear Rol'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                                  className="text-destructive"
                                  onClick={() => handleDelete(role)}
                                >
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
