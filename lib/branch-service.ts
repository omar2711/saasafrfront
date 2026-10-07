import { mockBranches } from './mock-data';
import { getUsersByBranch } from './user-service';
import type { Branch } from '@/types';

/**
 * Branch Service
 * Manages branch CRUD operations and validation
 */

export interface CreateBranchInput {
  name: string;
  address: string;
  phone: string;
  organizationId: string;
}

export interface UpdateBranchInput {
  name?: string;
  address?: string;
  phone?: string;
  isActive?: boolean;
}

/**
 * Validate branch name
 */
export function validateBranchName(name: string): boolean {
  return name && name.trim().length > 0;
}

/**
 * Validate phone format
 */
export function validatePhoneFormat(phone: string): boolean {
  if (!phone) return false;
  const phoneRegex = /^\+?[\d\s\-()]{10,}$/;
  return phoneRegex.test(phone);
}

/**
 * Get all branches
 */
export function getAllBranches(): Branch[] {
  return [...mockBranches];
}

/**
 * Get branch by ID
 */
export function getBranchById(branchId: string): Branch | undefined {
  return mockBranches.find(b => b.id === branchId);
}

/**
 * Get branches by organization
 */
export function getBranchesByOrganization(organizationId: string): Branch[] {
  return mockBranches.filter(b => b.organizationId === organizationId);
}

/**
 * Get active branches
 */
export function getActiveBranches(): Branch[] {
  return mockBranches.filter(b => b.isActive);
}

/**
 * Get main branch
 */
export function getMainBranch(organizationId: string): Branch | undefined {
  return mockBranches.find(b => b.organizationId === organizationId && b.isMain);
}

/**
 * Create new branch
 */
export function createBranch(input: CreateBranchInput): { success: boolean; branch?: Branch; error?: string } {
  // Validation
  if (!validateBranchName(input.name)) {
    return { success: false, error: 'El nombre de la sucursal es requerido' };
  }

  if (!input.address || input.address.trim().length === 0) {
    return { success: false, error: 'La ubicación es requerida' };
  }

  if (!validatePhoneFormat(input.phone)) {
    return { success: false, error: 'El teléfono no es válido' };
  }

  // Check if name already exists for this organization
  const nameExists = mockBranches.some(
    b => b.organizationId === input.organizationId && b.name === input.name
  );
  if (nameExists) {
    return { success: false, error: 'Ya existe una sucursal con este nombre' };
  }

  // Create branch
  const newBranch: Branch = {
    id: `branch-${Date.now()}`,
    organizationId: input.organizationId,
    name: input.name,
    address: input.address,
    phone: input.phone,
    isMain: false,
    isActive: true,
    createdAt: new Date(),
  };

  mockBranches.push(newBranch);
  console.log('[v0] Branch created:', newBranch.id, newBranch.name);

  return { success: true, branch: newBranch };
}

/**
 * Update branch
 */
export function updateBranch(branchId: string, input: UpdateBranchInput): { success: boolean; branch?: Branch; error?: string } {
  const branchIndex = mockBranches.findIndex(b => b.id === branchId);
  if (branchIndex === -1) {
    return { success: false, error: 'Sucursal no encontrada' };
  }

  const branch = mockBranches[branchIndex];

  // Validate phone if provided
  if (input.phone && !validatePhoneFormat(input.phone)) {
    return { success: false, error: 'El teléfono no es válido' };
  }

  // Validate name if provided
  if (input.name && !validateBranchName(input.name)) {
    return { success: false, error: 'El nombre de la sucursal es requerido' };
  }

  // Update branch
  const updatedBranch: Branch = {
    ...branch,
    name: input.name ?? branch.name,
    address: input.address ?? branch.address,
    phone: input.phone ?? branch.phone,
    isActive: input.isActive !== undefined ? input.isActive : branch.isActive,
  };

  mockBranches[branchIndex] = updatedBranch;
  console.log('[v0] Branch updated:', branchId);

  return { success: true, branch: updatedBranch };
}

/**
 * Delete branch - with validation
 */
export function deleteBranch(branchId: string): { success: boolean; error?: string } {
  const branchIndex = mockBranches.findIndex(b => b.id === branchId);
  if (branchIndex === -1) {
    return { success: false, error: 'Sucursal no encontrada' };
  }

  const branch = mockBranches[branchIndex];

  // Prevent deletion of main branch
  if (branch.isMain) {
    return { success: false, error: 'No se puede eliminar la sucursal principal' };
  }

  // Check if branch has users
  const branchUsers = getUsersByBranch(branchId);
  if (branchUsers.length > 0) {
    return { success: false, error: `No se puede eliminar. Hay ${branchUsers.length} usuario(s) asignado(s) a esta sucursal` };
  }

  mockBranches.splice(branchIndex, 1);
  console.log('[v0] Branch deleted:', branchId);

  return { success: true };
}

/**
 * Get branches count
 */
export function getBranchesCount(): number {
  return mockBranches.length;
}

/**
 * Get active branches count
 */
export function getActiveBranchesCount(): number {
  return mockBranches.filter(b => b.isActive).length;
}
