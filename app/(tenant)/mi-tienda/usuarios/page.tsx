'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, MoreHorizontal, UserPlus, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  usersApi,
  membershipsApi,
  rolesApi,
  type UserDto,
  type MembershipDto,
  type RoleDto,
} from '@/lib/api/users';
import { useOrganization } from '@/contexts/organization-context';
import { formatDate } from '@/lib/format';

interface UserRow {
  user: UserDto;
  membership: MembershipDto | null;
  roleName: string | null;
}

const NO_ROLE = '__none__';
const NO_BRANCH = '__none__';

interface UserFormState {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  /** NIT/CI. Vive en la membresía, no en la cuenta: ver migración 031. */
  taxId: string;
}

const EMPTY_FORM: UserFormState = {
  fullName: '',
  email: '',
  password: '',
  phone: '',
  taxId: '',
};

export default function UsersPage() {
  const { branches } = useOrganization();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserDto | null>(null);
  const [editingMembership, setEditingMembership] = useState<MembershipDto | null>(null);
  const [form, setForm] = useState<UserFormState>(EMPTY_FORM);
  const [selectedRoleId, setSelectedRoleId] = useState<string>(NO_ROLE);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(NO_BRANCH);
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [users, memberships, rolesData] = await Promise.all([
        usersApi.list(),
        membershipsApi.listByOrg(),
        rolesApi.list(),
      ]);

      setRoles(rolesData);
      const roleMap = new Map<string, RoleDto>(rolesData.map((r) => [r.id, r]));
      const membershipByUser = new Map<string, MembershipDto>(
        memberships.map((m) => [m.userId, m]),
      );

      setRows(
        users.map((user) => {
          const membership = membershipByUser.get(user.id) ?? null;
          const roleName =
            membership?.roleIds?.[0] ? (roleMap.get(membership.roleIds[0])?.name ?? null) : null;
          return { user, membership, roleName };
        }),
      );
    } catch {
      setError('No se pudieron cargar los usuarios');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreate = () => {
    setEditingUser(null);
    setEditingMembership(null);
    setForm(EMPTY_FORM);
    setSelectedRoleId(NO_ROLE);
    setSelectedBranchId(NO_BRANCH);
    setFormError('');
    setDialogOpen(true);
  };

  const openEdit = (row: UserRow) => {
    setEditingUser(row.user);
    setEditingMembership(row.membership);
    setForm({
      fullName: row.user.fullName,
      email: row.user.email,
      password: '',
      phone: row.user.phone ?? '',
      taxId: row.membership?.taxId ?? '',
    });
    setSelectedRoleId(row.membership?.roleIds?.[0] ?? NO_ROLE);
    setSelectedBranchId(row.membership?.branchId ?? NO_BRANCH);
    setFormError('');
    setDialogOpen(true);
  };

  /*
   * Un rol sin `branches.view_all` sólo ve su sucursal. Si además no se le
   * asigna ninguna, el usuario entra a una aplicación vacía y nadie entiende por
   * qué. El aviso se calcula en cliente porque rolesApi.list() ya devuelve los
   * permisos de cada rol.
   */
  const branchWarning = (() => {
    if (selectedRoleId === NO_ROLE || selectedBranchId !== NO_BRANCH) return null;
    const role = roles.find((r) => r.id === selectedRoleId);
    if (!role || role.permissions.includes('branches.view_all')) return null;
    return `El rol ${role.name} solo ve su sucursal: elige una o el usuario no verá datos.`;
  })();

  const handleSave = async () => {
    setFormError('');
    if (!form.fullName.trim()) { setFormError('El nombre es requerido'); return; }
    if (!editingUser && !form.email.trim()) { setFormError('El email es requerido'); return; }
    if (!editingUser && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setFormError('El email no tiene un formato válido');
      return;
    }
    if (!editingUser && form.password.length < 8) { setFormError('La contraseña debe tener al menos 8 caracteres'); return; }
    // Al crear, el rol es obligatorio: es la causa real del "creé el usuario y
    // no le aparece nada".
    if (!editingUser && selectedRoleId === NO_ROLE) {
      setFormError('Elige un rol: sin rol el usuario no podrá hacer nada');
      return;
    }

    setIsSaving(true);
    try {
      if (editingUser) {
        await usersApi.update(editingUser.id, {
          fullName: form.fullName.trim(),
          phone: form.phone.trim() || undefined,
        });
        // Actualizar rol y/o sucursal de la membresía si cambiaron
        if (editingMembership) {
          const payload: {
            roleIds?: string[];
            branchId?: string | null;
            taxId?: string;
          } = {};
          const currentRole = editingMembership.roleIds?.[0] ?? NO_ROLE;
          if (currentRole !== selectedRoleId) {
            payload.roleIds = selectedRoleId === NO_ROLE ? [] : [selectedRoleId];
          }
          const currentBranch = editingMembership.branchId ?? NO_BRANCH;
          if (currentBranch !== selectedBranchId) {
            payload.branchId = selectedBranchId === NO_BRANCH ? null : selectedBranchId;
          }
          // El NIT vive en org_members, no en users: la cuenta es global entre
          // organizaciones y un unico global filtraria datos entre tenants.
          if ((editingMembership.taxId ?? '') !== form.taxId.trim().toUpperCase()) {
            payload.taxId = form.taxId.trim();
          }
          if (Object.keys(payload).length > 0) {
            await membershipsApi.update(editingMembership.id, payload);
          }
        }
      } else {
        // Una sola llamada: el backend crea cuenta, membresía, sucursal, NIT y
        // roles en la misma transacción.
        await usersApi.create({
          email: form.email.trim(),
          fullName: form.fullName.trim(),
          password: form.password,
          phone: form.phone.trim() || undefined,
          roleIds: selectedRoleId === NO_ROLE ? [] : [selectedRoleId],
          branchId: selectedBranchId === NO_BRANCH ? undefined : selectedBranchId,
          taxId: form.taxId.trim() || undefined,
        });
      }
      setDialogOpen(false);
      await loadData();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (user: UserDto) => {
    try {
      await usersApi.setStatus(user.id, user.status === 'active' ? 'inactive' : 'active');
      await loadData();
    } catch {
      // ignore — could show toast
    }
  };

  const filtered = rows.filter(({ user }) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      user.fullName.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Usuarios" description="Administra los usuarios de tu organización">
        <Button onClick={openCreate}>
          <UserPlus className="mr-2 h-4 w-4" />
          Nuevo Usuario
        </Button>
      </PageHeader>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <section className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Datos de la cuenta
              </h3>
              <div className="space-y-1.5">
                <Label>Nombre completo *</Label>
                <Input
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  placeholder="Juan Pérez"
                />
              </div>
              {!editingUser && (
                <>
                  <div className="space-y-1.5">
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="usuario@empresa.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Contraseña *</Label>
                    <Input
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      placeholder="Mínimo 8 caracteres"
                    />
                  </div>
                </>
              )}
              <div className="space-y-1.5">
                <Label>Teléfono (opcional)</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+591 7XXXXXXX"
                />
              </div>
            </section>

            {/* Antes este bloque entero sólo se mostraba al editar, así que todo
                usuario nacía sin rol y sin sucursal: entraba y no veía nada. */}
            <Separator />

            <section className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Acceso a la organización
              </h3>
              <div className="space-y-1.5">
                <Label>Rol *</Label>
                <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_ROLE}>Sin rol</SelectItem>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  El rol decide qué puede hacer. Sin rol, el usuario entra y no ve nada.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Sucursal asignada</Label>
                <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin sucursal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_BRANCH}>Todas (sin asignar)</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {branchWarning ? (
                  <p className="text-xs text-amber-700">{branchWarning}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Si el rol no tiene permiso “Ver todas las sucursales”, el usuario solo verá esta.
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>NIT / CI (opcional)</Label>
                <Input
                  className="font-mono"
                  value={form.taxId}
                  onChange={(e) => setForm((f) => ({ ...f, taxId: e.target.value.toUpperCase() }))}
                  placeholder="1234567"
                />
                <p className="text-xs text-muted-foreground">
                  Único dentro de esta organización. No se comparte con otras empresas.
                </p>
              </div>
            </section>

            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingUser ? 'Guardar' : 'Crear'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o email..."
          className="pl-9 max-w-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Sucursal</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Creado</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    {rows.length === 0 ? 'No hay usuarios' : 'Sin resultados'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => {
                  const { user, roleName, membership } = row;
                  const branchName = membership?.branchId
                    ? branches.find((b) => b.id === membership.branchId)?.name ?? 'Sucursal eliminada'
                    : null;
                  return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="text-xs">
                            {user.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.fullName}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {roleName ? (
                        <Badge variant="secondary">{roleName}</Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">Sin rol</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {branchName ?? 'Todas'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.phone ?? '—'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={user.status === 'active' ? 'active' : 'inactive'} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(row)}>Editar</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleToggleStatus(user)}>
                            {user.status === 'active' ? 'Desactivar' : 'Activar'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
