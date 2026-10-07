import { mockProducts } from './mock-data';
import { createProduct, getStock } from './inventory-service';

/**
 * Create or update product from PO item
 * This is the primary source of product creation
 */
export interface POItemData {
  productName: string;
  sku: string;
  costPrice: number;
  quantity: number;
  category?: string;
  unit?: string;
  supplierId?: string;
}

export function createOrUpdateProductFromPO(
  item: POItemData,
  organizationId: string,
  branchId: string
): { success: boolean; productId?: string; isNew: boolean; error?: string } {
  // Check if product exists by SKU
  const existingProduct = mockProducts.find(p => p.sku === item.sku);

  if (existingProduct) {
    // Product exists - just update stock quantity and registration
    console.log('[v0] Product exists, updating stock from PO:', item.sku);
    
    // Stock update will be handled by inventory service when PO is marked as received
    
    return {
      success: true,
      productId: existingProduct.id,
      isNew: false,
    };
  }

  // Product doesn't exist - create new one
  console.log('[v0] Creating new product from PO:', item.sku);

  const result = createProduct({
    name: item.productName,
    sku: item.sku,
    category: item.category || 'General',
    costPrice: item.costPrice,
    salePrice: item.costPrice * 1.3, // Default 30% margin
    minStock: Math.ceil(item.quantity / 4), // Default min stock to 25% of initial quantity
    unit: item.unit || 'unidad',
    branchId,
    organizationId,
  });

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      isNew: false,
    };
  }

  // Stock will be registered when PO is marked as received
  if (result.product) {
    
    return {
      success: true,
      productId: result.product.id,
      isNew: true,
    };
  }

  return {
    success: false,
    error: 'Failed to create product',
    isNew: false,
  };
}

/**
 * Sync PO products to all modules (quotations, POS, etc.)
 */
export function syncPOProductToModules(poId: string, items: POItemData[]): {
  success: boolean;
  productsCreated: number;
  productsUpdated: number;
  error?: string;
} {
  let created = 0;
  let updated = 0;

  for (const item of items) {
    const result = createOrUpdateProductFromPO(item, 'org-1', 'branch-1');
    
    if (result.success) {
      if (result.isNew) {
        created++;
      } else {
        updated++;
      }
    }
  }

  console.log(`[v0] PO ${poId} synced: ${created} created, ${updated} updated`);

  return {
    success: true,
    productsCreated: created,
    productsUpdated: updated,
  };
}

/**
 * Get products from a specific PO
 */
export function getPOProductIds(poId: string): string[] {
  // This would normally query a junction table
  // For now, we'll return products that were created from this PO
  // In a real system, this would be tracked in poProductMapping
  return [];
}

/**
 * Mark product as coming from PO
 */
interface POProductMapping {
  productId: string;
  poId: string;
  poNumber: string;
  createdAt: Date;
}

const poProductMap = new Map<string, POProductMapping>();

export function recordProductOriginPO(
  productId: string,
  poId: string,
  poNumber: string
): void {
  poProductMap.set(productId, {
    productId,
    poId,
    poNumber,
    createdAt: new Date(),
  });
  console.log('[v0] Product origin recorded:', productId, 'from', poNumber);
}

export function getProductOriginPO(productId: string): POProductMapping | undefined {
  return poProductMap.get(productId);
}

export function isProductFromPO(productId: string): boolean {
  return poProductMap.has(productId);
}

