import { apiRequest } from '@/lib/api-client';

export interface UserDto {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

export interface MembershipDto {
  id: string;
  orgId: string;
  userId: string;
  roleIds: string[];
  branchId: string | null;
  /** NIT/CI del miembro, único dentro de la organización (no global). */
  taxId?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoleDto {
  id: string;
  orgId: string;
  name: string;
  isSystem: boolean;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PermissionDto {
  id: string;
  code: string;
  description: string | null;
}

export interface CreateUserPayload {
  email: string;
  fullName: string;
  password: string;
  phone?: string;
  /** Acceso a la organización: se asigna en el alta, en la misma transacción. */
  roleIds?: string[];
  branchId?: string;
  taxId?: string;
}

export interface UpdateUserPayload {
  fullName?: string;
  phone?: string;
}

export const usersApi = {
  list: (): Promise<UserDto[]> =>
    apiRequest<UserDto[]>('/iam/users'),

  create: (payload: CreateUserPayload): Promise<UserDto> =>
    apiRequest<UserDto>('/iam/users', { method: 'POST', body: payload }),

  update: (id: string, payload: UpdateUserPayload): Promise<UserDto> =>
    apiRequest<UserDto>(`/iam/users/${id}`, { method: 'PATCH', body: payload }),

  setStatus: (id: string, status: 'active' | 'inactive'): Promise<UserDto> =>
    apiRequest<UserDto>(`/iam/users/${id}/status`, { method: 'PATCH', body: { status } }),
};

export const membershipsApi = {
  listByOrg: (): Promise<MembershipDto[]> =>
    apiRequest<MembershipDto[]>('/iam/memberships'),

  update: (
    id: string,
    payload: { status?: string; roleIds?: string[]; branchId?: string | null; taxId?: string },
  ): Promise<MembershipDto> =>
    apiRequest<MembershipDto>(`/iam/memberships/${id}`, { method: 'PATCH', body: payload }),
};

export const rolesApi = {
  list: (): Promise<RoleDto[]> =>
    apiRequest<RoleDto[]>('/iam/roles'),

  create: (payload: { name: string }): Promise<RoleDto> =>
    apiRequest<RoleDto>('/iam/roles', { method: 'POST', body: payload }),

  update: (id: string, payload: { name: string }): Promise<RoleDto> =>
    apiRequest<RoleDto>(`/iam/roles/${id}`, { method: 'PATCH', body: payload }),

  remove: (id: string): Promise<void> =>
    apiRequest<void>(`/iam/roles/${id}`, { method: 'DELETE' }),

  assignPermission: (id: string, permissionId: string): Promise<RoleDto> =>
    apiRequest<RoleDto>(`/iam/roles/${id}/permissions`, {
      method: 'POST',
      body: { permissionId },
    }),

  removePermission: (id: string, permissionId: string): Promise<RoleDto> =>
    apiRequest<RoleDto>(`/iam/roles/${id}/permissions/${permissionId}`, { method: 'DELETE' }),
};

export const permissionsApi = {
  list: (): Promise<PermissionDto[]> => apiRequest<PermissionDto[]>('/iam/permissions'),
};
