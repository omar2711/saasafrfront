import { Suspense, type ReactNode } from 'react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { TenantSidebar } from '@/components/tenant-sidebar';
import { OrganizationProvider } from '@/contexts/organization-context';
import { TenantPlanAccess } from '@/components/tenant-plan-access';
import { Separator } from '@/components/ui/separator';

export default function TenantLayout({ children }: { children: ReactNode }) {
  return (
    <OrganizationProvider>
      <SidebarProvider>
        {/* TenantSidebar lee ?tab= para marcar el hijo activo de Reportes, y
            useSearchParams exige un limite de Suspense en el App Router. */}
        <Suspense fallback={null}>
          <TenantSidebar />
        </Suspense>
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="flex-1" />
          </header>
          <main className="flex-1 overflow-auto p-4 lg:p-6">
            <TenantPlanAccess>{children}</TenantPlanAccess>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </OrganizationProvider>
  );
}
