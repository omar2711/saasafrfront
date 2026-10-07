import { apiRequest } from '@/lib/api-client';

export interface BranchPriceDto {
  productId: string;
  sku: string;
  name: string;
  branchId: string;
  branchName?: string | null;
  globalSalePrice: number;
  globalCostPrice: number | null;
  branchSalePrice: number | null;
  branchCostPrice: number | null;
  effectiveSalePrice: number;
  effectiveCostPrice: number | null;
  globalMinSalePrice: number | null;
  globalMaxSalePrice: number | null;
  branchMinSalePrice: number | null;
  branchMaxSalePrice: number | null;
  /** Rango que el backend exige realmente al vender en esta sucursal. */
  effectiveMinSalePrice: number | null;
  effectiveMaxSalePrice: number | null;
  hasOverride: boolean;
}

export interface UpsertBranchPricePayload {
  productId: string;
  branchId: string;
  salePrice?: number | null;
  costPrice?: number | null;
  minSalePrice?: number | null;
  maxSalePrice?: number | null;
}

export const pricingApi = {
  listByBranch: (branchId: string) =>
    apiRequest<BranchPriceDto[]>(`/operations/pricing?branchId=${branchId}`),

  listForProduct: (productId: string) =>
    apiRequest<BranchPriceDto[]>(`/operations/pricing/product/${productId}`),

  upsert: (payload: UpsertBranchPricePayload) =>
    apiRequest<unknown>('/operations/pricing', { method: 'PUT', body: payload }),
};
