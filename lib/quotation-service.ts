import type { Quote, Sale, SaleItem, AuditLog } from '@/types';
import { mockQuotes, mockSales, mockAuditLogs } from './mock-data';
import { getStock, decreaseStock as inventoryDecreaseStock } from './inventory-service';

/**
 * Quotation Service
 * Handles quotation state transitions and automatic sale generation
 */

export interface ApproveQuotationResult {
  success: boolean;
  saleId?: string;
  error?: string;
  details?: {
    message: string;
    insufficientStock?: Array<{ productId: string; productName: string; available: number; requested: number }>;
  };
}

/**
 * Approve a quotation and automatically create a sale
 * This is the critical workflow that synchronizes all modules
 */
export function approveQuotation(quoteId: string): ApproveQuotationResult {
  console.log('[v0] Approving quotation:', quoteId);
  
  // Find the quotation
  const quote = mockQuotes.find(q => q.id === quoteId);
  if (!quote) {
    return {
      success: false,
      error: 'Quotation not found',
    };
  }

  // Validate quotation status
  if (quote.status !== 'sent' && quote.status !== 'draft') {
    return {
      success: false,
      error: `Cannot approve quotation in ${quote.status} status`,
    };
  }

  // Check inventory availability before approval
  const stockCheck = checkInventoryAvailability(quote);
  if (!stockCheck.available) {
    return {
      success: false,
      error: 'Insufficient inventory for approval',
      details: {
        message: 'The following products do not have enough stock:',
        insufficientStock: stockCheck.insufficientItems,
      },
    };
  }

  // Update quotation status to accepted
  quote.status = 'accepted';

  // Create a sale from the quotation
  const newSale = createSaleFromQuotation(quote);
  
  // Add to sales list
  mockSales.push(newSale);

  // Decrease inventory for each item
  decreaseInventoryForSale(newSale);

  // Create audit log for approval
  createAuditLog({
    action: 'sale',
    entity: 'quotation',
    entityId: quote.id,
    newValue: {
      status: 'accepted',
      saleId: newSale.id,
      total: quote.total,
    },
  });

  console.log('[v0] Quotation approved, sale created:', newSale.id);
  
  return {
    success: true,
    saleId: newSale.id,
    details: {
      message: `Sale ${newSale.saleNumber} created successfully from quotation ${quote.quoteNumber}`,
    },
  };
}

/**
 * Reject a quotation without any inventory impact
 */
export function rejectQuotation(quoteId: string, reason?: string): { success: boolean; error?: string } {
  const quote = mockQuotes.find(q => q.id === quoteId);
  if (!quote) {
    return { success: false, error: 'Quotation not found' };
  }

  quote.status = 'rejected';

  createAuditLog({
    action: 'update',
    entity: 'quotation',
    entityId: quote.id,
    oldValue: { status: 'sent' },
    newValue: { status: 'rejected', reason },
  });

  return { success: true };
}

/**
 * Check if there's enough inventory for all items in a quotation
 */
function checkInventoryAvailability(quote: Quote): {
  available: boolean;
  insufficientItems: Array<{ productId: string; productName: string; available: number; requested: number }>;
} {
  const insufficientItems: Array<{ productId: string; productName: string; available: number; requested: number }> = [];

  for (const item of quote.items) {
    const currentStock = getProductStock(item.productId, quote.branchId);
    if (currentStock < item.quantity) {
      // Find product name for error reporting
      const productName = getProductName(item.productId);
      insufficientItems.push({
        productId: item.productId,
        productName,
        available: currentStock,
        requested: item.quantity,
      });
    }
  }

  return {
    available: insufficientItems.length === 0,
    insufficientItems,
  };
}

/**
 * Create a Sale record from an approved Quotation
 */
function createSaleFromQuotation(quote: Quote): Sale {
  const saleNumber = generateSaleNumber();
  
  const saleItems: SaleItem[] = quote.items.map(item => ({
    id: `si-${Date.now()}-${Math.random()}`,
    saleId: `sale-${Date.now()}`,
    productId: item.productId,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    costPrice: getProductCostPrice(item.productId), // Get actual cost from inventory
    discount: item.discount,
    total: item.total,
  }));

  const newSale: Sale = {
    id: `sale-${Date.now()}`,
    organizationId: quote.organizationId,
    branchId: quote.branchId,
    saleNumber,
    status: 'completed',
    items: saleItems,
    subtotal: quote.subtotal,
    discount: quote.discount,
    tax: quote.tax,
    total: quote.total,
    paymentMethod: 'transfer', // Default for quote-to-sale conversion
    clientName: quote.clientName,
    notes: `Converted from quotation ${quote.quoteNumber}`,
    createdById: quote.createdById,
    createdAt: new Date(),
  };

  // Update sale items with correct sale ID
  newSale.items = newSale.items.map(item => ({
    ...item,
    saleId: newSale.id,
  }));

  return newSale;
}

/**
 * Decrease inventory stock for all items in a sale
 */
function decreaseInventoryForSale(sale: Sale): void {
  for (const item of sale.items) {
    decreaseStock(item.productId, sale.branchId, item.quantity, sale.id);
  }
}

/**
 * Decrease stock for a product
 */
function decreaseStock(productId: string, branchId: string, quantity: number, saleId: string): boolean {
  const currentStock = getProductStock(productId, branchId);
  
  if (currentStock < quantity) {
    console.error('[v0] Insufficient stock for product:', productId);
    return false;
  }

  // Use inventory service to decrease stock
  const success = inventoryDecreaseStock(productId, quantity, `sale-${saleId}`);
  
  if (success) {
    // Create audit log for stock decrease
    createAuditLog({
      action: 'stock_change',
      entity: 'inventory',
      entityId: productId,
      oldValue: { quantity: currentStock },
      newValue: { quantity: currentStock - quantity },
    });

    console.log('[v0] Stock decreased:', productId, 'by', quantity, 'units');
    return true;
  }

  return false;
}

/**
 * Get current stock for a product at a branch
 */
function getProductStock(productId: string, branchId: string): number {
  // Use inventory service for real-time stock
  return getStock(productId);
}

/**
 * Get product cost price
 */
function getProductCostPrice(productId: string): number {
  const costPriceMap: Record<string, number> = {
    'prod-1': 8500,
    'prod-2': 250,
    'prod-3': 800,
    'prod-4': 80,
    'prod-5': 180,
  };
  
  return costPriceMap[productId] || 0;
}

/**
 * Get product name
 */
function getProductName(productId: string): string {
  const nameMap: Record<string, string> = {
    'prod-1': 'Laptop HP 15.6"',
    'prod-2': 'Mouse Inalámbrico Logitech',
    'prod-3': 'Teclado Mecánico RGB',
    'prod-4': 'Cable HDMI 2m',
    'prod-5': 'Hub USB 4 puertos',
  };
  
  return nameMap[productId] || 'Unknown Product';
}

/**
 * Generate a new sale number
 */
function generateSaleNumber(): string {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `VTA-${dateStr}-${randomPart}`;
}

/**
 * Create an audit log entry
 */
function createAuditLog(data: {
  action: string;
  entity: string;
  entityId: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
}): void {
  const auditLog: AuditLog = {
    id: `audit-${Date.now()}`,
    organizationId: 'org-1', // This should come from context
    branchId: 'branch-1', // This should come from context
    userId: 'user-1', // This should come from auth context
    action: data.action as any,
    entity: data.entity,
    entityId: data.entityId,
    oldValue: data.oldValue,
    newValue: data.newValue,
    createdAt: new Date(),
  };

  mockAuditLogs.push(auditLog);
  console.log('[v0] Audit log created:', auditLog.id);
}

/**
 * Get quotation details for approval preview
 */
export function getQuotationForApproval(quoteId: string) {
  const quote = mockQuotes.find(q => q.id === quoteId);
  if (!quote) return null;

  const stockCheck = checkInventoryAvailability(quote);
  
  return {
    quote,
    canApprove: stockCheck.available,
    stockWarnings: stockCheck.insufficientItems,
  };
}
