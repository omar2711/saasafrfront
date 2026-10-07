'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { Organization, Branch, User } from '@/types';
import { getToken, getTenantId, clearAuth, setAuth } from '@/lib/api-client';
import { organizationsApi, type OrgDto, type BranchDto } from '@/lib/api/organizations';
import { setOrgTimeZone } from '@/lib/format';

interface OrganizationContextType {
  organization: Organization | null;
  branches: Branch[];
  currentBranch: Branch | null;
  setCurrentBranch: (branch: Branch) => void;
  currentUser: User | null;
  permissions: string[];
  planFeatures: string[] | null;
  hasPermission: (permission: string) => boolean;
  hasPlanFeature: (feature: string) => boolean;
  canViewAllBranches: boolean;
  isLoading: boolean;
  logout: () => void;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

function mapOrg(dto: OrgDto): Organization {
  return {
    id: dto.id,
    name: dto.name,
    slug: dto.id,
    plan: 'professional',
    status: 'active',
    ownerId: '',
    maxUsers: 50,
    maxBranches: 10,
    features: [],
    createdAt: new Date(dto.createdAt),
    timezone: dto.timezone,
    advanceSaleTerms: dto.advanceSaleTerms ?? null,
    // Sin esto la factura no puede imprimir el NIT ni la direccion de la empresa.
    taxId: dto.taxId ?? null,
    address: dto.address ?? null,
    phone: dto.phone ?? null,
    email: dto.email ?? null,
  };
}

function mapBranch(dto: BranchDto): Branch {
  return {
    id: dto.id,
    organizationId: dto.orgId,
    name: dto.name,
    address: dto.address ?? undefined,
    phone: dto.phone ?? undefined,
    // Dato real desde la 033, no la posición en la lista.
    isMain: dto.isMain ?? false,
    isActive: dto.status === 'active',
    createdAt: new Date(dto.createdAt),
  };
}

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentBranch, setCurrentBranchState] = useState<Branch | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [planFeatures, setPlanFeatures] = useState<string[] | null>(null);
  const [canViewAllBranches, setCanViewAllBranches] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Si el usuario no puede ver todas las sucursales, queda bloqueado a la asignada.
  const setCurrentBranch = useCallback(
    (branch: Branch) => {
      if (canViewAllBranches) setCurrentBranchState(branch);
    },
    [canViewAllBranches],
  );

  const logout = useCallback(() => {
    const sessionId = localStorage.getItem('session_id');
    if (sessionId) {
      void fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}`,
        },
        body: JSON.stringify({ sessionId }),
      }).catch(() => {});
    }
    clearAuth();
    window.location.href = '/login';
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    async function load() {
      try {
        const storedTenantId = getTenantId();

        const orgs = await organizationsApi.list();
        const org = storedTenantId
          ? (orgs.find((o) => o.id === storedTenantId) ?? orgs[0])
          : orgs[0];

        if (!org) {
          setIsLoading(false);
          return;
        }

        // Sync tenant_id in localStorage
        const currentToken = getToken()!;
        if (!storedTenantId || storedTenantId !== org.id) {
          setAuth(currentToken, org.id);
        }

        // Todo lo que formatea fechas lee la zona desde lib/format, incluidos
        // los generadores de PDF/Excel que no son componentes de React.
        setOrgTimeZone(org.timezone);
        setOrganization(mapOrg(org));

        const [branchDtos, permResult] = await Promise.all([
          organizationsApi.listBranches(),
          organizationsApi.myPermissions().catch(() => ({
            permissions: [] as string[],
            planFeatures: [] as string[],
            // Sin esta clave el fallback formaba una union con la respuesta real
            // y TypeScript rechazaba leer assignedBranchId mas abajo.
            assignedBranchId: null as string | null,
          })),
        ]);

        const activeBranches = branchDtos
          .filter((b) => b.status === 'active')
          .map(mapBranch);

        const viewAll = permResult.permissions.includes('branches.view_all');
        setCanViewAllBranches(viewAll);
        setBranches(activeBranches);

        // Sucursal inicial: si está bloqueado, su sucursal asignada (o la primera como fallback);
        // si puede ver todas, la primera.
        const assigned = permResult.assignedBranchId
          ? activeBranches.find((b) => b.id === permResult.assignedBranchId)
          : undefined;
        const initialBranch = viewAll
          ? (activeBranches[0] ?? null)
          : (assigned ?? activeBranches[0] ?? null);
        setCurrentBranchState(initialBranch);

        setPermissions(permResult.permissions);
        setPlanFeatures(permResult.planFeatures ?? []);

        const email = localStorage.getItem('user_email') ?? '';
        const rawName = email ? email.split('@')[0].replace(/[._-]/g, ' ') : 'Usuario';
        const displayName = rawName
          .split(' ')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');

        setCurrentUser({
          id: '',
          email,
          name: displayName,
          role: 'admin',
          isActive: true,
          createdAt: new Date(),
        });
      } catch {
        // Token likely expired or backend unavailable — do nothing, UI will show empty state
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, []);

  const hasPermission = useCallback(
    (permission: string) => permissions.includes(permission),
    [permissions],
  );

  const hasPlanFeature = useCallback(
    (feature: string) => planFeatures?.includes(feature) ?? false,
    [planFeatures],
  );

  return (
    <OrganizationContext.Provider
      value={{
        organization,
        branches,
        currentBranch,
        setCurrentBranch,
        currentUser,
        permissions,
        planFeatures,
        hasPermission,
        hasPlanFeature,
        canViewAllBranches,
        isLoading,
        logout,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}
