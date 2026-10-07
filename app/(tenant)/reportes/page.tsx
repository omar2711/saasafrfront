'use client';

import { Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InventoryHistoryTab } from '@/components/reports/inventory-history-tab';
import { SalesHistoryTab } from '@/components/reports/sales-history-tab';
import { QuotesHistoryTab } from '@/components/reports/quotes-history-tab';
import { CustomersReportTab } from '@/components/reports/customers-report-tab';
import { PurchaseOrdersHistoryTab } from '@/components/purchase-orders-history-tab';
import { WriteOffsTab } from '@/components/write-offs-tab';

const TABS = [
  { value: 'inventario', label: 'Inventario' },
  { value: 'ventas', label: 'Ventas' },
  { value: 'cotizaciones', label: 'Cotizaciones' },
  { value: 'compras', label: 'Compras' },
  { value: 'clientes', label: 'Clientes' },
  { value: 'bajas', label: 'Bajas' },
] as const;

const DEFAULT_TAB = 'inventario';

function ReportsTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const requested = searchParams.get('tab');
  const activeTab = TABS.some((tab) => tab.value === requested)
    ? (requested as string)
    : DEFAULT_TAB;

  /**
   * Controlado, no `defaultValue`. Con `defaultValue` el `Tabs` fijaba la
   * pestaña en el primer render y navegar entre los hijos del sidebar
   * (/reportes?tab=ventas) no cambiaba nada: la URL cambiaba y la vista no.
   * `replace` y no `push` para que el botón Atrás no recorra pestaña por pestaña.
   */
  const handleTabChange = (value: string) => {
    router.replace(`${pathname}?tab=${value}`, { scroll: false });
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList>
        {TABS.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="inventario">
        <InventoryHistoryTab />
      </TabsContent>

      <TabsContent value="ventas">
        <SalesHistoryTab />
      </TabsContent>

      <TabsContent value="cotizaciones">
        <QuotesHistoryTab />
      </TabsContent>

      <TabsContent value="compras">
        <PurchaseOrdersHistoryTab />
      </TabsContent>

      <TabsContent value="clientes">
        <CustomersReportTab />
      </TabsContent>

      <TabsContent value="bajas">
        {/* De consulta: el alta de bajas vive en Inventario, junto al stock. */}
        <WriteOffsTab readOnly />
      </TabsContent>
    </Tabs>
  );
}

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reportes"
        description="Inventario, ventas, cotizaciones, compras, clientes y bajas"
      />

      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando...</p>}>
        <ReportsTabs />
      </Suspense>
    </div>
  );
}
