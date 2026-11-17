'use client';

import { FormSection, FormGrid, FormField } from '@/components/form-layout';
import { FormDialog } from '@/components/form-dialog';
import { ShieldCheck as AccessIcon, UserRound as AccountIcon } from 'lucide-react';

import { PhoneField } from '@/components/phone-field';
import { joinPhone, splitPhone, validatePhone } from '@/lib/utils/phone';
import { DEFAULT_DIAL_CODE } from '@/lib/data/country-codes';

import { useState, useEffect, useCallback } from 'react';
import { Search, MoreHorizontal, UserPlus, Loader2, CheckCircle2, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  phoneCountryCode: string;
  phone: string;
  /** NIT/CI. Vive en la membresía, no en la cuenta: ver migración 031. */
  taxId: string;
}

const EMPTY_FORM: UserFormState = {
  fullName: '',
  email: '',
  password: '',
  phoneCountryCode: DEFAULT_DIAL_CODE,
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
  const [notice, setNotice] = useState<{ title: string; description: string } | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserDto | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(t);
  }, [notice]);

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
      ...splitPhone(row.user.phone),
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
    if (validatePhone(form.phoneCountryCode, form.phone)) { setFormError('Revisa el teléfono'); return; }
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
          phone: joinPhone(form.phoneCountryCode, form.phone) || undefined,
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
          phone: joinPhone(form.phoneCountryCode, form.phone) || undefined,
          roleIds: selectedRoleId === NO_ROLE ? [] : [selectedRoleId],
          branchId: selectedBranchId === NO_BRANCH ? undefined : selectedBranchId,
          taxId: form.taxId.trim() || undefined,
        });
      }
      const wasCreating = !editingUser;
      setDialogOpen(false);
      if (wasCreating) {
        setNotice({
          title: '¡Usuario creado!',
          description: `${form.fullName.trim()} ya puede iniciar sesión.`,
        });
      }
      await loadData();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    setDeleteError('');
    try {
      await usersApi.remove(userToDelete.id);
      const deletedName = userToDelete.fullName;
      setUserToDelete(null);
      setNotice({ title: '¡Usuario eliminado!', description: `${deletedName} ya no tiene acceso.` });
      await loadData();
    } catch (err: unknown) {
      setDeleteError(
        err instanceof Error && err.message ? err.message : 'No se pudo eliminar el usuario',
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async (user: UserDto) => {
    const nextStatus = user.status === 'active' ? 'disabled' : 'active';

    try {
      await usersApi.setStatus(user.id, nextStatus);
      await loadData();

      setNotice({
        title: nextStatus === 'active'
          ? '¡Usuario activado!'
          : '¡Usuario desactivado!',
        description: nextStatus === 'active'
          ? `${user.fullName} ya puede iniciar sesión.`
          : `${user.fullName} ya no tiene acceso.`,
      });
    } catch (err: unknown) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : 'No se pudo cambiar el estado del usuario.',
      );
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

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        icon={UserPlus}
        title={editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
        description="Datos de la cuenta y acceso a la organización."
        submitLabel={editingUser ? 'Guardar cambios' : 'Crear usuario'}
        onSubmit={handleSave}
        isSubmitting={isSaving}
        error={formError}
      >
        <FormSection icon={AccountIcon} title="Datos de la cuenta">
          <FormGrid>
            <FormField label="Nombre completo" required className="sm:col-span-2">
              <Input
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                placeholder="Juan Pérez"
              />
            </FormField>
            {!editingUser && (
              <>
                <FormField label="Email" required>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="usuario@empresa.com"
                  />
                </FormField>
                <FormField label="Contraseña" required hint="Mínimo 8 caracteres">
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="Mínimo 8 caracteres"
                  />
                </FormField>
              </>
            )}
            <div className="sm:col-span-2">
              <PhoneField
                id="user-phone"
                label="Teléfono (opcional)"
                code={form.phoneCountryCode}
                number={form.phone}
                onChange={(code, number) =>
                  setForm((f) => ({ ...f, phoneCountryCode: code, phone: number }))
                }
                showError={Boolean(formError)}
              />
            </div>
          </FormGrid>
        </FormSection>

        {/* Antes este bloque entero sólo se mostraba al editar, así que todo
            usuario nacía sin rol y sin sucursal: entraba y no veía nada. */}
        <FormSection icon={AccessIcon} title="Acceso a la organización">
          <FormGrid>
            <FormField
              label="Rol"
              required
              hint="El rol decide qué puede hacer. Sin rol, el usuario entra y no ve nada."
              className="sm:col-span-2"
            >
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
            </FormField>
            <FormField
              label="Sucursal asignada"
              hint={
                branchWarning
                  ? undefined
                  : 'Si el rol no tiene permiso “Ver todas las sucursales”, el usuario solo verá esta.'
              }
              className="sm:col-span-2"
            >
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
              {branchWarning && <p className="text-xs text-amber-700">{branchWarning}</p>}
            </FormField>
            <FormField
              label="NIT / CI (opcional)"
              hint="Único dentro de esta organización. No se comparte con otras empresas."
              className="sm:col-span-2"
            >
              <Input
                className="font-mono"
                value={form.taxId}
                onChange={(e) => setForm((f) => ({ ...f, taxId: e.target.value.toUpperCase() }))}
                placeholder="1234567"
              />
            </FormField>
          </FormGrid>
        </FormSection>
      </FormDialog>

      <Dialog
        open={!!userToDelete}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setUserToDelete(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 ring-8 ring-red-50">
              <Trash2 className="h-7 w-7 text-red-600" />
            </div>
            <DialogTitle className="text-center">¿Eliminar este usuario?</DialogTitle>
          </DialogHeader>
          <p className="text-center text-sm text-muted-foreground">
            Vas a eliminar a{' '}
            <span className="font-medium text-foreground">{userToDelete?.fullName}</span>{' '}
            ({userToDelete?.email}). Esta acción no se puede deshacer.
          </p>
          {deleteError && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {deleteError}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setUserToDelete(null)} disabled={isDeleting}>
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
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              setDeleteError('');
                              setUserToDelete(user);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
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


