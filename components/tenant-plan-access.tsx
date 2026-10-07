"use client";
import { usePathname } from "next/navigation";
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
export function TenantPlanAccess({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { isLoading, hasPlanFeature } = useOrganization();
  if (isLoading) return <p>Cargando permisos…</p>;
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
