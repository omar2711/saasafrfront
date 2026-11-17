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
import { API_BASE_URL, getToken, getTenantId, clearAuth, setAuth } from '@/lib/api-client';
import { organizationsApi, type OrgDto, type BranchDto } from '@/lib/api/organizations';
import { setOrgTimeZone, setBaseCurrency, setTaxName } from '@/lib/format';
import { systemSettingsApi } from '@/lib/api/system-settings';
import { useIdleLogout } from '@/hooks/use-idle-logout';
import { Clock } from 'lucide-react';

export interface SystemSettingsInfo {
  taxName: string;
  taxRate: number;
  baseCurrency: string;
}

const DEFAULT_SYSTEM_SETTINGS: SystemSettingsInfo = { taxName: 'IVA', taxRate: 13, baseCurrency: 'BOB' };

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
  systemSettings: SystemSettingsInfo;
  refreshSystemSettings: () => Promise<void>;
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
  const [systemSettings, setSystemSettings] = useState<SystemSettingsInfo>(DEFAULT_SYSTEM_SETTINGS);

  const refreshSystemSettings = useCallback(async () => {
    try {
      const s = await systemSettingsApi.get();
      setBaseCurrency(s.baseCurrency);
      setTaxName(s.taxName);
      setSystemSettings({ taxName: s.taxName, taxRate: s.taxRate, baseCurrency: s.baseCurrency });
    } catch {
      // Sin configuracion se quedan los valores de siempre: IVA 13% en BOB.
    }
  }, []);

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
      void fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}`,
        },
        body: JSON.stringify({ sessionId }),
      }).catch(() => {});
    }
    localStorage.removeItem('last_activity');
    clearAuth();
    window.location.href = '/login';
  }, []);

  const { warning, secondsLeft, stay } = useIdleLogout(logout);

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
        void refreshSystemSettings();

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

        const perm = permResult as typeof permResult & { userName?: string | null; roleNames?: string[] };
        const email = localStorage.getItem('user_email') ?? '';
        const rawName = email ? email.split('@')[0].replace(/[._-]/g, ' ') : 'Usuario';
        const displayName = rawName
          .split(' ')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');

        setCurrentUser({
          id: '',
          email,
          name: perm.userName?.trim() || displayName,
          roleNames: perm.roleNames ?? [],
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
        systemSettings,
        refreshSystemSettings,
        logout,
      }}
    >
      {children}
      {warning && (
        <div
          role="alertdialog"
          aria-live="assertive"
          className="fixed bottom-6 right-6 z-50 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-amber-500/30 bg-background shadow-2xl animate-in fade-in slide-in-from-bottom-4"
        >
          <div className="flex items-start gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">¿Sigues ahí?</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Por seguridad, tu sesión se cerrará en{' '}
                <span className="font-semibold tabular-nums text-foreground">{secondsLeft} s</span>{' '}
                por inactividad.
              </p>
            </div>
          </div>
          <div className="flex gap-2 px-4 pb-4">
            <button
              type="button"
              onClick={stay}
              className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              Seguir en sesión
            </button>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg border px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted"
            >
              Cerrar sesión
            </button>
          </div>
          <div className="h-1 w-full bg-amber-500/15">
            <div
              className="h-full bg-amber-500 transition-all duration-1000 ease-linear"
              style={{ width: `${Math.min(100, (secondsLeft / 60) * 100)}%` }}
            />
          </div>
        </div>
      )}
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

/** Impuesto y moneda configurados en "Configuracion del sistema". */
export function useSystemSettings(): SystemSettingsInfo {
  return useOrganization().systemSettings;
}
