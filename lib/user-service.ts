import { mockUsers } from './mock-data';
import type { User } from '@/types';

/**
 * User Service
 * Manages user CRUD operations, validation, and role management
 */

export interface CreateUserInput {
  email: string;
  name: string;
  phone?: string;
  address?: string;
  nit?: string;
  role: 'owner' | 'admin' | 'manager' | 'seller' | 'warehouse' | 'viewer';
  branchIds: string[];
  organizationId: string;
}

export interface UpdateUserInput {
  email?: string;
  name?: string;
  phone?: string;
  address?: string;
  nit?: string;
  role?: 'owner' | 'admin' | 'manager' | 'seller' | 'warehouse' | 'viewer';
  branchIds?: string[];
  isActive?: boolean;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone format (basic validation for +XX XXX XXX XXXX format)
 */
export function validatePhone(phone: string): boolean {
  // Allow empty phone or valid format
  if (!phone) return true;
  const phoneRegex = /^\+?[\d\s\-()]{10,}$/;
  return phoneRegex.test(phone);
}

/**
 * Check if email already exists
 */
export function emailExists(email: string, excludeUserId?: string): boolean {
  return mockUsers.some(
    user => user.email === email && (!excludeUserId || user.id !== excludeUserId)
  );
}

/**
 * Get all users
 */
export function getAllUsers(): User[] {
  return [...mockUsers];
}

/**
 * Get user by ID
 */
export function getUserById(userId: string): User | undefined {
  return mockUsers.find(u => u.id === userId);
}

/**
 * Get users by branch
 */
export function getUsersByBranch(branchId: string): User[] {
  return mockUsers.filter(u => u.branchIds.includes(branchId));
}

/**
 * Get users by role
 */
export function getUsersByRole(role: string): User[] {
  return mockUsers.filter(u => u.role === role);
}

/**
 * Create new user
 */
export function createUser(input: CreateUserInput): { success: boolean; user?: User; error?: string } {
  // Validation
  if (!input.name || input.name.trim().length === 0) {
    return { success: false, error: 'El nombre es requerido' };
  }

  if (!input.email || input.email.trim().length === 0) {
    return { success: false, error: 'El correo es requerido' };
  }

  if (!validateEmail(input.email)) {
    return { success: false, error: 'El correo no es válido' };
  }

  if (emailExists(input.email)) {
    return { success: false, error: 'El correo ya está registrado' };
  }

  if (!input.phone || !validatePhone(input.phone)) {
    return { success: false, error: 'El teléfono no es válido' };
  }

  if (!input.branchIds || input.branchIds.length === 0) {
    return { success: false, error: 'El usuario debe estar asignado a al menos una sucursal' };
  }

  // Create user
  const newUser: User = {
    id: `user-${Date.now()}`,
    email: input.email,
    name: input.name,
    phone: input.phone,
    address: input.address,
    nit: input.nit,
    role: input.role,
    branchIds: input.branchIds,
    organizationId: input.organizationId,
    isActive: true,
    createdAt: new Date(),
    lastLoginAt: new Date(),
  };

  mockUsers.push(newUser);
  console.log('[v0] User created:', newUser.id, newUser.email);

  return { success: true, user: newUser };
}

/**
 * Update user
 */
export function updateUser(userId: string, input: UpdateUserInput): { success: boolean; user?: User; error?: string } {
  const userIndex = mockUsers.findIndex(u => u.id === userId);
  if (userIndex === -1) {
    return { success: false, error: 'Usuario no encontrado' };
  }

  const user = mockUsers[userIndex];

  // Validate email if changed
  if (input.email && input.email !== user.email) {
    if (!validateEmail(input.email)) {
      return { success: false, error: 'El correo no es válido' };
    }
    if (emailExists(input.email, userId)) {
      return { success: false, error: 'El correo ya está registrado' };
    }
  }

  // Validate phone if provided
  if (input.phone !== undefined && !validatePhone(input.phone)) {
    return { success: false, error: 'El teléfono no es válido' };
  }

  // Update user
  const updatedUser: User = {
    ...user,
    email: input.email ?? user.email,
    name: input.name ?? user.name,
    phone: input.phone ?? user.phone,
    address: input.address ?? user.address,
    nit: input.nit ?? user.nit,
    role: input.role ?? user.role,
    branchIds: input.branchIds ?? user.branchIds,
    isActive: input.isActive !== undefined ? input.isActive : user.isActive,
  };

  mockUsers[userIndex] = updatedUser;
  console.log('[v0] User updated:', userId);

  return { success: true, user: updatedUser };
}

/**
 * Delete user
 */
export function deleteUser(userId: string): { success: boolean; error?: string } {
  const userIndex = mockUsers.findIndex(u => u.id === userId);
  if (userIndex === -1) {
    return { success: false, error: 'Usuario no encontrado' };
  }

  const user = mockUsers[userIndex];
  
  // Prevent deletion of owner
  if (user.role === 'owner') {
    return { success: false, error: 'No se puede eliminar el propietario de la organización' };
  }

  mockUsers.splice(userIndex, 1);
  console.log('[v0] User deleted:', userId);

  return { success: true };
}

/**
 * Get active users count
 */
export function getActiveUsersCount(): number {
  return mockUsers.filter(u => u.isActive).length;
}

/**
 * Get users by organization
 */
export function getUsersByOrganization(organizationId: string): User[] {
  return mockUsers.filter(u => u.organizationId === organizationId);
}
