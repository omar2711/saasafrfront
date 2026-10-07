import { apiRequest } from '../api-client';

export interface OrgDto {
  id: string;
  name: string;
  taxId: string | null;
  timezone: string;
  status: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  /** Condiciones que se imprimen en el comprobante de una venta adelantada. */
  advanceSaleTerms?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateOrgPayload {
  name?: string;
  taxId?: string;
  timezone?: string;
  address?: string;
  phone?: string;
  email?: string;
  advanceSaleTerms?: string;
}

export interface WorkScheduleDto {
  orgId: string;
  enabled: boolean;
  /** ISO-8601: 1 = lunes ... 7 = domingo. */
  days: number[];
  startTime: string;
  endTime: string;
  exemptRoleIds: string[];
  message: string | null;
  updatedAt: string;
}

export type UpdateWorkSchedulePayload = Partial<
  Pick<WorkScheduleDto, 'enabled' | 'days' | 'startTime' | 'endTime' | 'exemptRoleIds'>
> & { message?: string };

export interface BranchDto {
  id: string;
  orgId: string;
  name: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  status: string;
  /** Encargado / dueño: apunta a la membresía, no al usuario global. */
  managerMemberId?: string | null;
  managerName?: string | null;
  isMain?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBranchPayload {
  name: string;
  address?: string;
  city?: string;
  phone?: string;
  /** `null` al actualizar significa "quitar el encargado". */
  managerMemberId?: string | null;
  isMain?: boolean;
}

export const organizationsApi = {
  list(): Promise<OrgDto[]> {
    return apiRequest<OrgDto[]>('/organizations', { requiresTenant: false });
  },
  listBranches(): Promise<BranchDto[]> {
    return apiRequest<BranchDto[]>('/organizations/branches');
  },
  createBranch(payload: CreateBranchPayload): Promise<BranchDto> {
    return apiRequest<BranchDto>('/organizations/branches', { method: 'POST', body: payload });
  },
  updateBranch(id: string, payload: Partial<CreateBranchPayload> & { status?: string }): Promise<BranchDto> {
    return apiRequest<BranchDto>(`/organizations/branches/${id}`, { method: 'PATCH', body: payload });
  },
  get(id: string): Promise<OrgDto> {
    return apiRequest<OrgDto>(`/organizations/${id}`, { requiresTenant: false });
  },
  update(id: string, payload: UpdateOrgPayload): Promise<OrgDto> {
    return apiRequest<OrgDto>(`/organizations/${id}`, { method: 'PATCH', body: payload });
  },
  getWorkSchedule(): Promise<WorkScheduleDto> {
    return apiRequest<WorkScheduleDto>('/organizations/work-schedule');
  },
  updateWorkSchedule(payload: UpdateWorkSchedulePayload): Promise<WorkScheduleDto> {
    return apiRequest<WorkScheduleDto>('/organizations/work-schedule', {
      method: 'PATCH',
      body: payload,
    });
  },
  myPermissions(): Promise<{ permissions: string[]; planFeatures: string[]; assignedBranchId: string | null }> {
    return apiRequest<{ permissions: string[]; planFeatures: string[]; assignedBranchId: string | null }>(
      '/organizations/permissions',
    );
  },
};
