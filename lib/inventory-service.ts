import { mockProducts } from './mock-data';

/**
 * Inventory Service
 * Manages product stock, availability checks, and inventory movements
 */

export interface ProductAvailability {
  productId: string;
  name: string;
  currentStock: number;
  minStock: number;
  isLowStock: boolean;
  canFulfill: (quantity: number) => boolean;
}

export interface InventoryMovement {
  productId: string;
  quantity: number;
  type: 'in' | 'out';
  reason: 'sale' | 'purchase' | 'adjustment' | 'return';
  reference: string;
  timestamp: Date;
}

// In-memory inventory storage (in real app, this would be a database)
const inventoryState: Map<string, number> = new Map([
  ['prod-1', 15],
  ['prod-2', 42],
  ['prod-3', 8],
  ['prod-4', 125],
  ['prod-5', 28],
]);

const inventoryMovements: InventoryMovement[] = [];

/**
 * Get current stock for a product
 */
export function getStock(productId: string): number {
  return inventoryState.get(productId) || 0;
}

/**
 * Get availability info for a product
 */
export function getAvailability(productId: string): ProductAvailability | null {
  const product = mockProducts.find(p => p.id === productId);
  if (!product) return null;

  const currentStock = getStock(productId);
  const isLowStock = currentStock < product.minStock;

  return {
    productId: product.id,
    name: product.name,
    currentStock,
    minStock: product.minStock,
    isLowStock,
    canFulfill: (quantity: number) => currentStock >= quantity,
  };
}

/**
 * Check if products can fulfill quantities for a quotation
 */
export function canFulfillQuotation(items: Array<{ productId: string; quantity: number }>): {
  canFulfill: boolean;
  insufficientItems: Array<{ productId: string; name: string; available: number; requested: number }>;
} {
  const insufficientItems: Array<{ productId: string; name: string; available: number; requested: number }> = [];

  for (const item of items) {
    const availability = getAvailability(item.productId);
    if (!availability || !availability.canFulfill(item.quantity)) {
      insufficientItems.push({
        productId: item.productId,
        name: availability?.name || 'Unknown',
        available: availability?.currentStock || 0,
        requested: item.quantity,
      });
    }
  }

  return {
    canFulfill: insufficientItems.length === 0,
    insufficientItems,
  };
}

/**
 * Decrease stock (called when quotation is approved and sale created)
 */
export function decreaseStock(productId: string, quantity: number, reference: string): boolean {
  const currentStock = getStock(productId);

  if (currentStock < quantity) {
    console.error('[v0] Cannot decrease stock: insufficient inventory', {
      productId,
      available: currentStock,
      requested: quantity,
    });
    return false;
  }

  const newStock = currentStock - quantity;
  inventoryState.set(productId, newStock);

  // Record the movement
  recordMovement({
    productId,
    quantity,
    type: 'out',
    reason: 'sale',
    reference,
    timestamp: new Date(),
  });

  console.log('[v0] Stock decreased:', {
    productId,
    from: currentStock,
    to: newStock,
    quantity,
  });

  return true;
}

/**
 * Increase stock (called when purchase order is received)
 */
export function increaseStock(productId: string, quantity: number, reference: string): boolean {
  const currentStock = getStock(productId);
  const newStock = currentStock + quantity;
  
  inventoryState.set(productId, newStock);

  recordMovement({
    productId,
    quantity,
    type: 'in',
    reason: 'purchase',
    reference,
    timestamp: new Date(),
  });

  console.log('[v0] Stock increased:', {
    productId,
    from: currentStock,
    to: newStock,
    quantity,
  });

  return true;
}

/**
 * Adjust stock (for inventory corrections)
 */
export function adjustStock(productId: string, newQuantity: number, reason: string): boolean {
  const currentStock = getStock(productId);
  
  if (newQuantity < 0) {
    console.error('[v0] Cannot set negative stock');
    return false;
  }

  const difference = newQuantity - currentStock;
  inventoryState.set(productId, newQuantity);

  recordMovement({
    productId,
    quantity: Math.abs(difference),
    type: difference > 0 ? 'in' : 'out',
    reason: 'adjustment',
    reference: reason,
    timestamp: new Date(),
  });

  console.log('[v0] Stock adjusted:', {
    productId,
    from: currentStock,
    to: newQuantity,
  });

  return true;
}

/**
 * Get all products with low stock
 */
export function getLowStockProducts(): ProductAvailability[] {
  return mockProducts
    .map(product => getAvailability(product.id))
    .filter((avail): avail is ProductAvailability => avail !== null && avail.isLowStock);
}

/**
 * Get low stock count
 */
export function getLowStockCount(): number {
  return getLowStockProducts().length;
}

/**
 * Get inventory movements for a product
 */
export function getMovements(productId?: string): InventoryMovement[] {
  if (productId) {
    return inventoryMovements.filter(m => m.productId === productId);
  }
  return inventoryMovements;
}

/**
 * Record an inventory movement
 */
function recordMovement(movement: InventoryMovement): void {
  inventoryMovements.push(movement);
  console.log('[v0] Inventory movement recorded:', movement);
}

/**
 * Get inventory value (total cost value of all stock)
 */
export function getTotalInventoryValue(): number {
  let total = 0;
  
  mockProducts.forEach(product => {
    const stock = getStock(product.id);
    total += product.costPrice * stock;
  });

  return total;
}

/**
 * Get all product availability
 */
export function getAllAvailability(): ProductAvailability[] {
  return mockProducts
    .map(product => getAvailability(product.id))
    .filter((avail): avail is ProductAvailability => avail !== null);
}

/**
 * Create new product
 */
export interface CreateProductInput {
  name: string;
  sku: string;
  category: string;
  description?: string;
  costPrice: number;
  salePrice: number;
  minStock: number;
  unit?: string;
  image?: string;
  branchId: string;
  organizationId: string;
}

export function createProduct(input: CreateProductInput): { success: boolean; product?: any; error?: string } {
  // Validation
  if (!input.name || input.name.trim().length === 0) {
    return { success: false, error: 'El nombre del producto es requerido' };
  }

  if (!input.sku || input.sku.trim().length === 0) {
    return { success: false, error: 'El SKU es requerido' };
  }

  // Check if SKU already exists
  const skuExists = mockProducts.some(p => p.sku === input.sku);
  if (skuExists) {
    return { success: false, error: 'El SKU ya existe' };
  }

  if (input.salePrice <= 0) {
    return { success: false, error: 'El precio de venta debe ser mayor a 0' };
  }

  // Cost price can be 0 for free items or promotional products
  if (input.costPrice < 0) {
    return { success: false, error: 'El precio de compra no puede ser negativo' };
  }

  if (input.minStock < 0) {
    return { success: false, error: 'El stock mínimo no puede ser negativo' };
  }

  // Create product
  const newProduct = {
    id: `prod-${Date.now()}`,
    name: input.name,
    sku: input.sku,
    category: input.category || 'General',
    description: input.description || '',
    costPrice: input.costPrice,
    salePrice: input.salePrice,
    minStock: input.minStock,
    unit: input.unit || 'unidad',
    image: input.image,
    branchId: input.branchId,
    organizationId: input.organizationId,
    isActive: true,
    createdAt: new Date(),
  };

  mockProducts.push(newProduct as any);
  
  // Initialize stock for new product
  inventoryState.set(newProduct.id, input.minStock);

  console.log('[v0] Product created:', newProduct.id, newProduct.name);
  return { success: true, product: newProduct };
}

/**
 * Update product
 */
export interface UpdateProductInput {
  name?: string;
  sku?: string;
  category?: string;
  description?: string;
  costPrice?: number;
  salePrice?: number;
  minStock?: number;
  unit?: string;
  image?: string;
  isActive?: boolean;
}

export function updateProduct(productId: string, input: UpdateProductInput): { success: boolean; product?: any; error?: string } {
  const productIndex = mockProducts.findIndex(p => p.id === productId);
  if (productIndex === -1) {
    return { success: false, error: 'Producto no encontrado' };
  }

  const product = mockProducts[productIndex];

  // Validate SKU if changed
  if (input.sku && input.sku !== product.sku) {
    if (mockProducts.some(p => p.sku === input.sku)) {
      return { success: false, error: 'El SKU ya existe' };
    }
  }

  // Validate prices
  if ((input.costPrice !== undefined && input.costPrice <= 0) || 
      (input.salePrice !== undefined && input.salePrice <= 0)) {
    return { success: false, error: 'Los precios deben ser mayores a 0' };
  }

  // Update product
  const updatedProduct = {
    ...product,
    name: input.name ?? product.name,
    sku: input.sku ?? product.sku,
    category: input.category ?? product.category,
    description: input.description ?? product.description,
    costPrice: input.costPrice ?? product.costPrice,
    salePrice: input.salePrice ?? product.salePrice,
    minStock: input.minStock ?? product.minStock,
    unit: input.unit ?? product.unit,
    image: input.image ?? product.image,
    isActive: input.isActive !== undefined ? input.isActive : product.isActive,
  };

  mockProducts[productIndex] = updatedProduct;
  console.log('[v0] Product updated:', productId);

  return { success: true, product: updatedProduct };
}

/**
 * Delete product
 */
export function deleteProduct(productId: string): { success: boolean; error?: string } {
  const productIndex = mockProducts.findIndex(p => p.id === productId);
  if (productIndex === -1) {
    return { success: false, error: 'Producto no encontrado' };
  }

  mockProducts.splice(productIndex, 1);
  inventoryState.delete(productId);
  
  console.log('[v0] Product deleted:', productId);
  return { success: true };
}

/**
 * Get product by ID
 */
export function getProductById(productId: string) {
  return mockProducts.find(p => p.id === productId);
}

/**
 * Get all products
 */
export function getAllProducts() {
  return [...mockProducts];
}
