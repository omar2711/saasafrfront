import type { SaleDto } from '@/lib/api/sales';

export interface ResolvedSaleClient {
  name: string | null;
  nit: string | null;
  phone: string | null;
}

/**
 * Los datos del cliente registrado (JOIN vivo a `customers`) mandan sobre el
 * snapshot inline que la venta guardo al emitirse. Asi, si el cliente corrige su
 * CI o su telefono, las ventas ya emitidas lo reflejan.
 */
export function resolveSaleClient(sale: SaleDto): ResolvedSaleClient {
  return {
    name: sale.customerName ?? sale.clientName ?? null,
    nit: sale.customerTaxId ?? sale.clientNit ?? null,
    phone: sale.customerPhone ?? sale.clientPhone ?? null,
  };
}
