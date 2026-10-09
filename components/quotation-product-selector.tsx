'use client';

import { useState, useCallback } from 'react';
import { useLiveApiEffect } from '@/hooks/use-live-api-effect';
import { Search, Plus, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { productsApi, type ProductDto } from '@/lib/api/products';
import { pricingApi } from '@/lib/api/pricing';
import { formatCurrency } from '@/lib/format';
import { kitsApi, type KitDto } from '@/lib/api/kits';
import { inventoryApi } from '@/lib/api/inventory';
import { useOrganization } from '@/contexts/organization-context';

export interface QuoteLineItem {
  id: string;
  productId?: string;
  kitId?: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  discount: number;
  total: number;
  availableStock: number;
}

interface ProductSelectorProps {
  items: QuoteLineItem[];
  onAddItem: (item: QuoteLineItem) => void;
  onRemoveItem: (id: string) => void;
  onUpdateItem: (item: QuoteLineItem) => void;
}

interface StockInfo {
  currentStock: number;
  minStock: number;
}

/** Precio efectivo y rango autorizado del producto en la sucursal activa. */
interface BranchPricing {
  salePrice: number;
  min: number | null;
  max: number | null;
}

export function QuotationProductSelector({
  items,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
}: ProductSelectorProps) {
  const { currentBranch, organization, hasPermission } = useOrganization();
  const canOverridePrice = hasPermission('sales.price_override');
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [kits, setKits] = useState<KitDto[]>([]);
  const [catalogView, setCatalogView] = useState<'products' | 'kits'>('products');
  const [stockMap, setStockMap] = useState<Record<string, StockInfo>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedKitId, setSelectedKitId] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [pricingMap, setPricingMap] = useState<Record<string, BranchPricing>>({});

  const loadCatalog = useCallback(async (isCurrent: () => boolean) => {
    if (!currentBranch?.id || !organization?.id) return;
    try {
    const [productList, stocks, kitList, prices] = await Promise.all([
      productsApi.list(),
      inventoryApi.listStock(currentBranch.id),
      kitsApi.list(),
      pricingApi.listByBranch(currentBranch.id),
    ]);
        if (!isCurrent()) return;
        setProducts(productList);
        const sm: Record<string, StockInfo> = {};
        stocks.forEach(s => {
          sm[s.productId] = { currentStock: s.quantityOnHand, minStock: s.minStock };
        });
        setStockMap(sm);
        setKits(kitList.filter((k) => k.status === 'active'));
        const map: Record<string, BranchPricing> = {};
        prices.forEach((price) => {
          map[price.productId] = {
            salePrice: price.effectiveSalePrice,
            min: price.effectiveMinSalePrice,
            max: price.effectiveMaxSalePrice,
          };
        });
        setPricingMap(map);
    } catch { /* Keep last successful data; server validates stock and prices on save. */ }
  }, [currentBranch?.id, organization?.id]);
  useLiveApiEffect(loadCatalog, 10000);

  const getEffectivePrice = (product: ProductDto) =>
    pricingMap[product.id]?.salePrice ?? product.salePrice;

  const isPriceOutOfRange = (item: QuoteLineItem) => {
    const bounds = item.productId ? pricingMap[item.productId] : undefined;
    if (!bounds) return false;
    if (bounds.min !== null && item.unitPrice < bounds.min) return true;
    if (bounds.max !== null && item.unitPrice > bounds.max) return true;
    return false;
  };

  const getAvailability = (productId: string): StockInfo =>
    stockMap[productId] ?? { currentStock: 0, minStock: 0 };

  // Filter products/kits by search term
  const filteredProducts = products.filter(
    product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredKits = kits.filter(
    kit =>
      kit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      kit.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get selected product
  const selectedProduct = products.find(p => p.id === selectedProductId);
  const selectedAvailability = selectedProduct ? getAvailability(selectedProduct.id) : null;
  const isOutOfStock = selectedAvailability ? selectedAvailability.currentStock === 0 : false;
  const selectedKit = kits.find(k => k.id === selectedKitId);

  // Check if product/kit already in items
  const isProductAlreadyAdded = items.some(item => item.productId === selectedProductId);
  const isKitAlreadyAdded = items.some(item => item.kitId === selectedKitId);

  const handleAddProduct = () => {
    if (!selectedProduct || !selectedAvailability) return;

    if (selectedQuantity > selectedAvailability.currentStock) {
      alert(`Cannot add more than ${selectedAvailability.currentStock} units available`);
      return;
    }

    const newItem: QuoteLineItem = {
      id: `qi-${Date.now()}`,
      productId: selectedProduct.id,
      name: selectedProduct.name,
      sku: selectedProduct.sku,
      quantity: selectedQuantity,
      unitPrice: getEffectivePrice(selectedProduct),
      costPrice: selectedProduct.costPrice ?? 0,
      discount: 0,
      total: getEffectivePrice(selectedProduct) * selectedQuantity,
      availableStock: selectedAvailability.currentStock,
    };

    onAddItem(newItem);

    // Reset form
    setSelectedProductId('');
    setSelectedQuantity(1);
    setSearchTerm('');
  };

  const handleAddKit = () => {
    if (!selectedKit) return;

    const newItem: QuoteLineItem = {
      id: `qi-${Date.now()}`,
      kitId: selectedKit.id,
      name: `Kit: ${selectedKit.name}`,
      sku: selectedKit.sku,
      quantity: selectedQuantity,
      unitPrice: selectedKit.salePrice,
      costPrice: selectedKit.componentsTotal ?? 0,
      discount: 0,
      total: selectedKit.salePrice * selectedQuantity,
      availableStock: Infinity,
    };

    onAddItem(newItem);

    setSelectedKitId('');
    setSelectedQuantity(1);
    setSearchTerm('');
  };

  return (
    <div className="space-y-4">
      {/* Product Search & Selection */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Seleccionar Productos</CardTitle>
            <div className="flex rounded-md border overflow-hidden">
              <Button
                type="button"
                size="sm"
                variant={catalogView === 'products' ? 'default' : 'ghost'}
                className="rounded-none h-7"
                onClick={() => { setCatalogView('products'); setSelectedKitId(''); }}
              >
                Productos
              </Button>
              <Button
                type="button"
                size="sm"
                variant={catalogView === 'kits' ? 'default' : 'ghost'}
                className="rounded-none h-7"
                onClick={() => { setCatalogView('kits'); setSelectedProductId(''); }}
              >
                Kits
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={catalogView === 'products' ? 'Buscar por nombre o identificador...' : 'Buscar kit por nombre o SKU...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Kit Grid */}
          {searchTerm && catalogView === 'kits' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto">
              {filteredKits.length > 0 ? (
                filteredKits.map((kit) => (
                  <div
                    key={kit.id}
                    onClick={() => {
                      if (!isKitAlreadyAdded) {
                        setSelectedKitId(kit.id);
                        setSearchTerm('');
                      }
                    }}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedKitId === kit.id
                        ? 'border-primary bg-primary/5'
                        : isKitAlreadyAdded
                        ? 'border-muted opacity-50 cursor-not-allowed'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{kit.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{kit.sku}</div>
                      </div>
                      {isKitAlreadyAdded && (
                        <Badge variant="secondary" className="ml-2 flex-shrink-0">
                          Agregado
                        </Badge>
                      )}
                    </div>
                    <div className="mt-2 flex items-end justify-between text-xs">
                      <span className="text-muted-foreground">{kit.items.length} productos</span>
                      <div className="font-semibold">{formatCurrency(kit.salePrice)}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center py-8 text-muted-foreground">
                  No se encontraron kits
                </div>
              )}
            </div>
          )}

          {/* Selected Kit Details */}
          {selectedKit && (
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium">Kit: {selectedKit.name}</div>
                  <div className="text-sm text-muted-foreground">{selectedKit.sku}</div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Cantidad</label>
                  <Input
                    type="number"
                    min="1"
                    value={selectedQuantity}
                    onChange={(e) => setSelectedQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Precio Unit.</label>
                  <div className="mt-1 p-2 bg-muted rounded text-sm font-medium">
                    {formatCurrency(selectedKit.salePrice)}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Total</label>
                  <div className="mt-1 p-2 bg-muted rounded text-sm font-semibold">
                    {formatCurrency(selectedKit.salePrice * selectedQuantity)}
                  </div>
                </div>
              </div>
              <Button onClick={handleAddKit} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Agregar al presupuesto
              </Button>
            </div>
          )}

          {/* Product Grid */}
          {searchTerm && catalogView === 'products' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => {
                  const availability = getAvailability(product.id);
                  const outOfStock = availability.currentStock === 0;

                  return (
                    <div
                      key={product.id}
                      onClick={() => {
                        if (!outOfStock && !isProductAlreadyAdded) {
                          setSelectedProductId(product.id);
                          setSearchTerm('');
                        }
                      }}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedProductId === product.id
                          ? 'border-primary bg-primary/5'
                          : outOfStock || isProductAlreadyAdded
                          ? 'border-muted opacity-50 cursor-not-allowed'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{product.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{product.sku}</div>
                        </div>
                        {outOfStock && (
                          <Badge variant="destructive" className="ml-2 flex-shrink-0">
                            Sin stock
                          </Badge>
                        )}
                        {isProductAlreadyAdded && (
                          <Badge variant="secondary" className="ml-2 flex-shrink-0">
                            Agregado
                          </Badge>
                        )}
                      </div>
                      <div className="mt-2 flex items-end justify-between text-xs">
                        <div>
                          <span className="text-muted-foreground">Stock: </span>
                          <span className={availability.currentStock <= availability.minStock ? 'text-yellow-600 font-medium' : ''}>
                            {availability.currentStock}
                          </span>
                        </div>
                        <div className="font-semibold">{formatCurrency(product.salePrice)}</div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-2 text-center py-8 text-muted-foreground">
                  No se encontraron productos
                </div>
              )}
            </div>
          )}

          {/* Selected Product Details */}
          {selectedProduct && selectedAvailability && (
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium">{selectedProduct.name}</div>
                  <div className="text-sm text-muted-foreground">{selectedProduct.sku}</div>
                </div>
                <Badge variant={isOutOfStock ? 'destructive' : 'default'}>
                  {selectedAvailability.currentStock} disponibles
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Cantidad</label>
                  <Input
                    type="number"
                    min="1"
                    max={selectedAvailability.currentStock}
                    value={selectedQuantity}
                    onChange={(e) => setSelectedQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    disabled={isOutOfStock}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Precio Unit.</label>
                  <div className="mt-1 p-2 bg-muted rounded text-sm font-medium">
                    {formatCurrency(selectedProduct.salePrice)}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Total</label>
                  <div className="mt-1 p-2 bg-muted rounded text-sm font-semibold">
                    {formatCurrency(selectedProduct.salePrice * selectedQuantity)}
                  </div>
                </div>
              </div>

              {selectedQuantity > selectedAvailability.currentStock && (
                <div className="flex items-center gap-2 text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>Cantidad solicitada excede el stock disponible</span>
                </div>
              )}

              <Button
                onClick={handleAddProduct}
                disabled={isOutOfStock || selectedQuantity > selectedAvailability.currentStock}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Agregar al presupuesto
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Items */}
      {items.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Productos Seleccionados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {items.map((item) => {
                const bounds = item.productId ? pricingMap[item.productId] : undefined;
                const outOfRange = isPriceOutOfRange(item);
                return (
                  <div key={item.id} className="space-y-2 rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.quantity}x {formatCurrency(item.unitPrice)} = {formatCurrency(item.total)}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onRemoveItem(item.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Cantidad</Label>
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => {
                            const quantity = Math.max(1, Number(e.target.value));
                            onUpdateItem({
                              ...item,
                              quantity,
                              total: item.unitPrice * quantity - item.discount,
                            });
                          }}
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Precio unitario</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => {
                            const unitPrice = Math.max(0, Number(e.target.value));
                            onUpdateItem({
                              ...item,
                              unitPrice,
                              total: unitPrice * item.quantity - item.discount,
                            });
                          }}
                          className={`h-8 ${outOfRange ? 'border-destructive text-destructive' : ''}`}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Descuento</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.discount}
                          onChange={(e) => {
                            const discount = Math.max(0, Number(e.target.value));
                            onUpdateItem({
                              ...item,
                              discount,
                              total: item.unitPrice * item.quantity - discount,
                            });
                          }}
                          className="h-8"
                        />
                      </div>
                    </div>

                    {outOfRange && bounds && (
                      <p className="text-[11px] text-destructive">
                        Fuera del rango autorizado
                        {bounds.min !== null && ` · minimo ${formatCurrency(bounds.min)}`}
                        {bounds.max !== null && ` · maximo ${formatCurrency(bounds.max)}`}
                        {!canOverridePrice && '. El backend rechazara la cotizacion.'}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
