import { apiRequest } from '../api-client';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  expiresAt: string;
}

export interface MeResponse {
  sub: string;
  email?: string;
  sessionId?: string;
  isSuperAdmin?: boolean;
  platformRole?: 'super_admin' | 'accountant' | null;
}

export const authApi = {
  login(email: string, password: string): Promise<LoginResponse> {
    return apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
      requiresTenant: false,
    });
  },
  me(): Promise<MeResponse> {
    return apiRequest<MeResponse>('/auth/me', { requiresTenant: false });
  },
  logout(sessionId: string): Promise<{ revoked: boolean }> {
    return apiRequest<{ revoked: boolean }>('/auth/logout', {
      method: 'POST',
      body: { sessionId },
      requiresTenant: false,
    });
  },
};
