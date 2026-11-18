"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOrganization } from "@/contexts/organization-context";
const routes: [string, string][] = [
  ["/reportes", "module_reports"],
  ["/auditoria", "module_audit"],
  ["/operativo/productos", "module_inventory"],
  ["/operativo/inventario", "module_inventory"],
  ["/operativo/proveedores", "module_suppliers"],
  ["/operativo/clientes", "module_customers"],
  ["/operativo/ordenes-compra", "module_purchases"],
  ["/ventas/cotizaciones", "module_quotes"],
  ["/ventas/caja-chica", "module_petty_cash"],
  ["/ventas", "module_sales"],
];

const SLOW_MS = 8000;

export function TenantPlanAccess({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { isLoading, hasPlanFeature } = useOrganization();
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setSlow(false);
      return;
    }
    const t = setTimeout(() => setSlow(true), SLOW_MS);
    return () => clearTimeout(t);
  }, [isLoading]);

  if (isLoading)
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Verificando tu acceso…</p>
        {slow && (
          <div className="mt-2 space-y-3">
            <p className="text-sm">Esto está tardando más de lo normal.</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Reintentar
            </Button>
          </div>
        )}
      </div>
    );

  const feature = routes.find(([prefix]) => path.startsWith(prefix))?.[1];
  if (feature && !hasPlanFeature(feature))
    return (
      <div className="rounded-lg border p-6">
        <h1 className="text-xl font-semibold">Módulo no disponible</h1>
        <p className="mt-2">
          El plan vigente de tu empresa no incluye este módulo. Contacta a AFR
          para cambiar tu suscripción.
        </p>
      </div>
    );
  return children;
}