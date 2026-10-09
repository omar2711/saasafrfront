'use client';

import { useState, useCallback } from 'react';
import { useLiveApiEffect } from '@/hooks/use-live-api-effect';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Building2,
  Receipt,
  User,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { productsApi, type ProductDto } from '@/lib/api/products';
import { kitsApi, type KitDto } from '@/lib/api/kits';
import { inventoryApi } from '@/lib/api/inventory';
import { pricingApi } from '@/lib/api/pricing';
import { salesApi, type PaymentMethod } from '@/lib/api/sales';
import { AdvanceSaleDialog, type InsufficientCartItem } from '@/components/advance-sale-dialog';
import { SaleConfirmationDialog } from '@/components/sale-confirmation-dialog';
import { SaleReceiptDialog, type SaleReceiptData } from '@/components/sale-receipt-dialog';
import { PosCustomerDialog, type PosCustomer } from '@/components/pos-customer-dialog';
import { useOrganization } from '@/contexts/organization-context';

interface CartItem {
  key: string;
  productId?: string;
  kitId?: string;
  name: string;
  price: number;
  quantity: number;
  /** Descuento de la linea completa, en Bs. El DTO lo acepta desde siempre. */
  discount: number;
}

/** Rango autorizado del producto en la sucursal activa. null = sin limite. */
interface PriceBounds {
  min: number | null;
  max: number | null;
}

export default function POSPage() {
  const { organization, currentBranch, currentUser, hasPermission } = useOrganization();
  const canOverridePrice = hasPermission('sales.price_override');
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [kits, setKits] = useState<KitDto[]>([]);
  const [catalogView, setCatalogView] = useState<'products' | 'kits'>('products');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [stockMap, setStockMap] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const catalogSearch = useDebouncedValue(searchQuery);
  const [catalogPage, setCatalogPage] = useState(0);
  const [hasMoreProducts, setHasMoreProducts] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [saleError, setSaleError] = useState<string | null>(null);
  const [lastSaleNumber, setLastSaleNumber] = useState<string | null>(null);
  const [isAdvanceSaleOpen, setIsAdvanceSaleOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('cash');
  const [receiptData, setReceiptData] = useState<SaleReceiptData | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [branchPriceMap, setBranchPriceMap] = useState<Record<string, number>>({});
  const [priceBoundsMap, setPriceBoundsMap] = useState<Record<string, PriceBounds>>({});
  const [saleCustomer, setSaleCustomer] = useState<PosCustomer | null>(null);
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [withInvoice, setWithInvoice] = useState(false);
  const [returnToConfirmation, setReturnToConfirmation] = useState(false);

  const loadCatalog = useCallback(async (isCurrent: () => boolean) => {
    if (!currentBranch?.id || !organization?.id) return;
    try {
      const [prods, list, stocks, prices] = await Promise.all([
        productsApi.listPage({ search: catalogSearch, status: 'active', limit: 101, offset: catalogPage * 100 }), kitsApi.list(), inventoryApi.listStock(currentBranch.id),
        pricingApi.listByBranch(currentBranch.id),
      ]);
      if (!isCurrent()) return;
      setProducts(prods.slice(0, 100));
      setHasMoreProducts(prods.length > 100);
      setKits(list.filter(k => k.status === 'active'));
      const sm: Record<string, number> = {};
      stocks.forEach(s => { sm[s.productId] = s.quantityOnHand; });
      setStockMap(sm);
      const pm: Record<string, number> = {};
      const bounds: Record<string, PriceBounds> = {};
      prices.forEach((p) => {
        pm[p.productId] = p.effectiveSalePrice;
        bounds[p.productId] = { min: p.effectiveMinSalePrice, max: p.effectiveMaxSalePrice };
      });
      setBranchPriceMap(pm);
      setPriceBoundsMap(bounds);
    } catch {
      if (isCurrent()) setSaleError('No se pudo actualizar el catálogo, stock o precios.');
    }
  }, [currentBranch?.id, organization?.id, catalogSearch, catalogPage]);
  useLiveApiEffect(loadCatalog, 10000);

  const getEffectivePrice = (product: ProductDto) =>
    branchPriceMap[product.id] ?? product.salePrice;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB', minimumFractionDigits: 0 }).format(value);

  const getKitAvailableQty = (kit: KitDto) => {
    if (kit.items.length === 0) return 0;
    return Math.min(...kit.items.map((item) => Math.floor((stockMap[item.productId] ?? 0) / item.quantity)));
  };

  const stockBadgeClass = (qty: number) =>
    qty <= 0
      ? 'bg-red-100 text-red-700 hover:bg-red-100'
      : qty <= 5
      ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100'
      : 'bg-green-100 text-green-700 hover:bg-green-100';

  const addProductToCart = (product: ProductDto) => {
    const key = `product:${product.id}`;
    setCart((prev) => {
      const existing = prev.find((item) => item.key === key);
      if (existing) {
        return prev.map((item) =>
          item.key === key ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          key,
          productId: product.id,
          name: product.name,
          price: getEffectivePrice(product),
          quantity: 1,
          discount: 0,
        },
      ];
    });
  };

  const addKitToCart = (kit: KitDto) => {
    const key = `kit:${kit.id}`;
    setCart((prev) => {
      const existing = prev.find((item) => item.key === key);
      if (existing) {
        return prev.map((item) =>
          item.key === key ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        { key, kitId: kit.id, name: `Kit: ${kit.name}`, price: kit.salePrice, quantity: 1, discount: 0 },
      ];
    });
  };

  const updateQuantity = (key: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.key === key
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (key: string) => {
    setCart((prev) => prev.filter((item) => item.key !== key));
  };

  const updatePrice = (key: string, price: number) => {
    setCart((prev) =>
      prev.map((item) => (item.key === key ? { ...item, price: Math.max(0, price) } : item)),
    );
  };

  const updateDiscount = (key: string, discount: number) => {
    setCart((prev) =>
      prev.map((item) => (item.key === key ? { ...item, discount: Math.max(0, discount) } : item)),
    );
  };

  /**
   * El rango lo impone el backend (create-sale.usecase); aqui solo se avisa
   * antes de cobrar. Los kits no tienen rango propio: su precio sale de la
   * suma de componentes.
   */
  const boundsFor = (item: CartItem): PriceBounds | null =>
    item.productId ? priceBoundsMap[item.productId] ?? null : null;

  const isPriceOutOfRange = (item: CartItem) => {
    const bounds = boundsFor(item);
    if (!bounds) return false;
    if (bounds.min !== null && item.price < bounds.min) return true;
    if (bounds.max !== null && item.price > bounds.max) return true;
    return false;
  };

  const outOfRangeItems = cart.filter(isPriceOutOfRange);
  // Un descuento mayor que la linea dejaria un total negativo.
  const invalidDiscountItems = cart.filter((item) => item.discount > item.price * item.quantity);
  const blockedByPrice = (outOfRangeItems.length > 0 && !canOverridePrice) ||
    invalidDiscountItems.length > 0;

  const grossSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountTotal = cart.reduce((sum, item) => sum + item.discount, 0);
  const subtotal = grossSubtotal - discountTotal;
  const tax = subtotal * 0.13;
  const total = subtotal + tax;

  // Los kits no se pueden reservar contra una orden de compra, asi que no entran en
  // el flujo de venta adelantada; pero sin stock tampoco se pueden cobrar. Antes el
  // filtro solo miraba item.productId y el backend reventaba al guardar.
  const kitShortages = cart
    .filter((item) => item.kitId)
    .map((item) => {
      const kit = kits.find((k) => k.id === item.kitId);
      const available = kit ? getKitAvailableQty(kit) : 0;
      return { name: item.name, needed: item.quantity, available };
    })
    .filter((entry) => entry.available < entry.needed);

  const insufficientItems: InsufficientCartItem[] = cart
    .filter((item) => item.productId && (stockMap[item.productId] ?? 0) < item.quantity)
    .map((item) => ({
      productId: item.productId!,
      name: item.name,
      quantity: item.quantity,
      needed: item.quantity,
      available: stockMap[item.productId!] ?? 0,
    }));

  const handleCheckout = async (paymentMethod: PaymentMethod) => {
    if (cart.length === 0 || !currentBranch) return;
    setIsProcessing(true);
    setSaleError(null);
    try {
      const saleNumber = `VTA-${Date.now().toString().slice(-6)}`;
      const soldAt = new Date().toISOString();
      // La respuesta se descartaba: es la unica forma de conocer el numero de
      // factura, que lo asigna el correlativo del servidor.
      const sale = await salesApi.create({
        branchId: currentBranch.id,
        saleNumber,
        soldAt,
        taxTotal: tax,
        documentType: withInvoice ? 'invoice' : 'receipt',
        paymentMethod,
        customerId: saleCustomer?.customerId,
        clientName: saleCustomer?.clientName,
        clientNit: saleCustomer?.clientNit,
        clientPhone: saleCustomer?.clientPhone,
        items: cart.map(item => ({
          productId: item.productId,
          kitId: item.kitId,
          quantity: item.quantity,
          unitPrice: item.price,
          discount: item.discount,
        })),
      });
      setLastSaleNumber(saleNumber);
      setReceiptData({
        saleNumber,
        soldAt,
        companyName: organization?.name ?? 'Mi Empresa',
        companyTaxId: organization?.taxId ?? null,
        companyAddress: organization?.address ?? null,
        companyPhone: organization?.phone ?? null,
        advanceSaleTerms: organization?.advanceSaleTerms ?? null,
        documentType: sale.documentType ?? (withInvoice ? 'invoice' : 'receipt'),
        invoiceNumber: sale.invoice?.invoiceNumber ?? sale.invoiceNumber ?? null,
        branchName: currentBranch.name,
        cashierName: currentUser?.name ?? 'Cajero',
        clientName: saleCustomer?.clientName,
        clientNit: saleCustomer?.clientNit,
        clientPhone: saleCustomer?.clientPhone,
        paymentMethod,
        isAdvanceSale: false,
        items: cart.map((item) => ({ name: item.name, quantity: item.quantity, price: item.price })),
        subtotal,
        tax,
        total,
      });
      setIsReceiptOpen(true);
      setCart([]);
      setSaleCustomer(null);
      setWithInvoice(false);
    } catch (e: unknown) {
      setSaleError(e instanceof Error ? e.message : 'Error al procesar la venta');
    } finally {
      setIsProcessing(false);
    }
  };

  const openConfirmation = (method: PaymentMethod) => {
    if (cart.length === 0) return;
    setSelectedMethod(method);
    setIsConfirmOpen(true);
  };

  // Dos dialogos de Radix abiertos a la vez se pisan el foco: se cierra el de
  // confirmacion y se reabre al volver.
  const openCustomerFromConfirmation = () => {
    setIsConfirmOpen(false);
    setReturnToConfirmation(true);
    setIsCustomerDialogOpen(true);
  };

  const handleConfirmSale = async () => {
    setIsConfirmOpen(false);
    await handleCheckout(selectedMethod);
  };

  const handleGoToAdvanceSale = () => {
    setIsConfirmOpen(false);
    setIsAdvanceSaleOpen(true);
  };

  const handleAdvanceSaleConfirm = async (
    reservations: Record<string, string>,
    deposit: { amount: number; method: PaymentMethod },
  ) => {
    if (cart.length === 0 || !currentBranch) return;
    setIsProcessing(true);
    setSaleError(null);
    try {
      const saleNumber = `VTA-${Date.now().toString().slice(-6)}`;
      const soldAt = new Date().toISOString();
      await salesApi.create({
        branchId: currentBranch.id,
        saleNumber,
        soldAt,
        taxTotal: tax,
        status: 'pending_delivery',
        payments: [{ amount: deposit.amount, method: deposit.method }],
        customerId: saleCustomer?.customerId,
        clientName: saleCustomer?.clientName,
        clientNit: saleCustomer?.clientNit,
        clientPhone: saleCustomer?.clientPhone,
        items: cart.map(item => ({
          productId: item.productId,
          kitId: item.kitId,
          quantity: item.quantity,
          unitPrice: item.price,
          discount: item.discount,
          purchaseOrderId: item.productId ? reservations[item.productId] : undefined,
        })),
      });
      setLastSaleNumber(saleNumber);
      setReceiptData({
        saleNumber,
        soldAt,
        companyName: organization?.name ?? 'Mi Empresa',
        companyTaxId: organization?.taxId ?? null,
        companyAddress: organization?.address ?? null,
        companyPhone: organization?.phone ?? null,
        advanceSaleTerms: organization?.advanceSaleTerms ?? null,
        // Una venta adelantada se cobra en dos tiempos: se factura al entregarla.
        documentType: 'receipt',
        branchName: currentBranch.name,
        cashierName: currentUser?.name ?? 'Cajero',
        clientName: saleCustomer?.clientName,
        clientNit: saleCustomer?.clientNit,
        clientPhone: saleCustomer?.clientPhone,
        paymentMethod: deposit.method,
        isAdvanceSale: true,
        items: cart.map((item) => {
          const available = item.productId ? stockMap[item.productId] ?? 0 : item.quantity;
          const pendingQty = Math.max(0, item.quantity - available);
          return { name: item.name, quantity: item.quantity, price: item.price, pendingQty };
        }),
        subtotal,
        tax,
        total,
        depositAmount: deposit.amount,
      });
      setIsReceiptOpen(true);
      setCart([]);
      setSaleCustomer(null);
      setIsAdvanceSaleOpen(false);
    } catch (e: unknown) {
      setSaleError(e instanceof Error ? e.message : 'Error al reservar la venta adelantada');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredKits = kits.filter((k) =>
    k.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    k.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  /*
   * En movil el catalogo y el carrito se apilan: el carrito tenia un ancho fijo
   * de 400px dentro de un flex sin wrap, asi que a 360px el carrito solo ya
   * desbordaba y el catalogo quedaba aplastado. La altura fija tambien se
   * levanta por debajo de lg, o los dos paneles se pelean por la pantalla.
   */
  return (
    <div className="flex flex-col gap-4 lg:h-[calc(100vh-7rem)] lg:flex-row">
      {/* Products Section */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mb-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={catalogView === 'products' ? 'Buscar producto por nombre o identificador...' : 'Buscar kit por nombre o identificador...'}
              className="pl-9"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCatalogPage(0); }}
            />
          </div>
          <div className="flex rounded-md border overflow-hidden">
            <Button
              type="button"
              size="sm"
              variant={catalogView === 'products' ? 'default' : 'ghost'}
              className="rounded-none"
              onClick={() => setCatalogView('products')}
            >
              Productos
            </Button>
            <Button
              type="button"
              size="sm"
              variant={catalogView === 'kits' ? 'default' : 'ghost'}
              className="rounded-none"
              onClick={() => setCatalogView('kits')}
            >
              Kits
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          {catalogView === 'products' ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pr-4">
              {filteredProducts.map((product) => (
                <Card
                  key={product.id}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => addProductToCart(product)}
                >
                  <CardContent className="p-4">
                    <div className="relative aspect-square bg-muted rounded-lg mb-3 flex items-center justify-center">
                      <span className="text-3xl text-muted-foreground">
                        {product.name.charAt(0)}
                      </span>
                      <Badge
                        variant="secondary"
                        className={`absolute top-1.5 right-1.5 ${stockBadgeClass(stockMap[product.id] ?? 0)}`}
                      >
                        Stock: {stockMap[product.id] ?? 0}
                      </Badge>
                    </div>
                    <div>
                      <h3 className="font-medium text-sm line-clamp-2">{product.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{product.sku}</p>
                      <p className="font-bold text-primary mt-2">
                        {formatCurrency(getEffectivePrice(product))}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pr-4">
              {filteredKits.map((kit) => (
                <Card
                  key={kit.id}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => addKitToCart(kit)}
                >
                  <CardContent className="p-4">
                    <div className="relative aspect-square bg-muted rounded-lg mb-3 flex items-center justify-center">
                      <Badge variant="secondary">Kit</Badge>
                      <Badge
                        variant="secondary"
                        className={`absolute top-1.5 right-1.5 ${stockBadgeClass(getKitAvailableQty(kit))}`}
                      >
                        Stock: {getKitAvailableQty(kit)}
                      </Badge>
                    </div>
                    <div>
                      <h3 className="font-medium text-sm line-clamp-2">{kit.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{kit.sku} · {kit.items.length} productos</p>
                      <p className="font-bold text-primary mt-2">
                        {formatCurrency(kit.salePrice)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filteredKits.length === 0 && (
                <p className="col-span-full text-center text-sm text-muted-foreground py-8">No hay kits disponibles</p>
              )}
            </div>
          )}
        </ScrollArea>
        {catalogView === 'products' && <div className="flex items-center justify-between gap-2 pt-2">
          <span className="text-sm text-muted-foreground">Página {catalogPage + 1}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={catalogPage === 0} onClick={() => setCatalogPage(p => p - 1)}>Anterior</Button>
            <Button variant="outline" size="sm" disabled={!hasMoreProducts} onClick={() => setCatalogPage(p => p + 1)}>Siguiente</Button>
          </div>
        </div>}
      </div>

      {/* Cart Section */}
      <Card className="flex w-full flex-col lg:w-[400px] lg:shrink-0">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Venta Actual</CardTitle>
            <Badge variant="secondary">{cart.length} items</Badge>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full px-6">
            {lastSaleNumber ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Receipt className="h-12 w-12 text-green-500 mb-4" />
                <p className="font-semibold text-green-600">Venta completada</p>
                <p className="text-sm text-muted-foreground mt-1">{lastSaleNumber}</p>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" onClick={() => setIsReceiptOpen(true)}>
                    Ver recibo
                  </Button>
                  <Button onClick={() => setLastSaleNumber(null)}>
                    Nueva Venta
                  </Button>
                </div>
              </div>
            ) : cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">El carrito esta vacio</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Haz clic en un producto para agregarlo
                </p>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                {cart.map((item) => {
                  const bounds = boundsFor(item);
                  const outOfRange = isPriceOutOfRange(item);
                  const lineTotal = item.price * item.quantity - item.discount;
                  return (
                    <div key={item.key} className="space-y-2 rounded-md border p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(lineTotal)} en total
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.key, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.key, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => removeFromCart(item.key)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Precio unitario</Label>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={item.price}
                            onChange={(e) => updatePrice(item.key, Number(e.target.value))}
                            className={`h-8 ${outOfRange ? 'border-destructive text-destructive' : ''}`}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Descuento (Bs)</Label>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={item.discount}
                            onChange={(e) => updateDiscount(item.key, Number(e.target.value))}
                            className="h-8"
                          />
                        </div>
                      </div>

                      {outOfRange && bounds && (
                        <p className="text-[11px] text-destructive">
                          Fuera del rango autorizado
                          {bounds.min !== null && ` · minimo ${formatCurrency(bounds.min)}`}
                          {bounds.max !== null && ` · maximo ${formatCurrency(bounds.max)}`}
                          {canOverridePrice && ' (tu rol puede autorizarlo)'}
                        </p>
                      )}
                      {item.discount > item.price * item.quantity && (
                        <p className="text-[11px] text-destructive">
                          El descuento no puede superar el importe de la linea.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>

        <CardFooter className="flex-col border-t pt-4">
          {saleError && (
            <div className="w-full mb-3 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {saleError}
            </div>
          )}
          <div className="w-full space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(grossSubtotal)}</span>
            </div>
            {discountTotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Descuentos</span>
                <span className="text-destructive">-{formatCurrency(discountTotal)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">IT (13%)</span>
              <span>{formatCurrency(tax)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          {!lastSaleNumber && outOfRangeItems.length > 0 && !canOverridePrice && (
            <div className="w-full mb-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
              Hay {outOfRangeItems.length} linea(s) con un precio fuera del rango autorizado. Corrige
              el precio o pide a un Gerente que autorice la venta.
            </div>
          )}

          {!lastSaleNumber && kitShortages.length > 0 && (
            <div className="w-full mb-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
              Sin stock suficiente para armar {kitShortages.map((k) => k.name).join(', ')}. Los kits no
              se pueden reservar contra una orden de compra: quita el kit o repone sus componentes.
            </div>
          )}

          {!lastSaleNumber && insufficientItems.length > 0 && kitShortages.length === 0 && (
            <div className="w-full mb-3 rounded-md bg-yellow-50 px-3 py-2 text-xs text-yellow-700 flex items-start gap-2">
              <span>
                Stock insuficiente para {insufficientItems.length} producto(s). Puedes registrarlo como venta
                adelantada con anticipo.
              </span>
            </div>
          )}

          <div className="w-full space-y-2">
            {saleCustomer ? (
              <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{saleCustomer.clientName}</p>
                  {saleCustomer.clientNit && (
                    <p className="text-xs text-muted-foreground font-mono">
                      CI/NIT: {saleCustomer.clientNit}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => setSaleCustomer(null)}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Quitar cliente</span>
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full justify-start"
                size="sm"
                onClick={() => setIsCustomerDialogOpen(true)}
              >
                <User className="mr-2 h-4 w-4" />
                Agregar cliente (opcional)
              </Button>
            )}
            {!lastSaleNumber && insufficientItems.length === 0 && kitShortages.length === 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={cart.length === 0 || isProcessing || blockedByPrice}
                  onClick={() => openConfirmation('cash')}
                >
                  <Banknote className="mr-1 h-4 w-4" />
                  Efectivo
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={cart.length === 0 || isProcessing || blockedByPrice}
                  onClick={() => openConfirmation('card')}
                >
                  <CreditCard className="mr-1 h-4 w-4" />
                  Tarjeta
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={cart.length === 0 || isProcessing || blockedByPrice}
                  onClick={() => openConfirmation('transfer')}
                >
                  <Building2 className="mr-1 h-4 w-4" />
                  Transfer
                </Button>
              </div>
            )}
            {!lastSaleNumber && insufficientItems.length === 0 && kitShortages.length === 0 && (
              <Button
                className="w-full"
                size="lg"
                disabled={cart.length === 0 || isProcessing || blockedByPrice}
                onClick={() => openConfirmation(selectedMethod)}
              >
                Revisar y cobrar {formatCurrency(total)}
              </Button>
            )}
            {!lastSaleNumber && insufficientItems.length > 0 && kitShortages.length === 0 && (
              <Button
                className="w-full"
                size="lg"
                variant="secondary"
                disabled={isProcessing}
                onClick={() => openConfirmation(selectedMethod)}
              >
                Revisar venta adelantada
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>

      <SaleConfirmationDialog
        isOpen={isConfirmOpen}
        items={cart.map((item) => ({
          ...item,
          available: item.productId ? stockMap[item.productId] ?? 0 : undefined,
        }))}
        subtotal={subtotal}
        tax={tax}
        total={total}
        paymentMethod={selectedMethod}
        hasInsufficientStock={insufficientItems.length > 0}
        isProcessing={isProcessing}
        formatCurrency={formatCurrency}
        onConfirm={handleConfirmSale}
        onGoToAdvanceSale={handleGoToAdvanceSale}
        onCancel={() => setIsConfirmOpen(false)}
        withInvoice={withInvoice}
        onWithInvoiceChange={setWithInvoice}
        clientName={saleCustomer?.clientName}
        clientNit={saleCustomer?.clientNit}
        onEditCustomer={openCustomerFromConfirmation}
      />

      <AdvanceSaleDialog
        isOpen={isAdvanceSaleOpen}
        items={insufficientItems}
        branchId={currentBranch?.id}
        total={total}
        isSaving={isProcessing}
        formatCurrency={formatCurrency}
        onConfirm={handleAdvanceSaleConfirm}
        onCancel={() => setIsAdvanceSaleOpen(false)}
      />

      <SaleReceiptDialog
        isOpen={isReceiptOpen}
        sale={receiptData}
        formatCurrency={formatCurrency}
        onClose={() => setIsReceiptOpen(false)}
      />

      <PosCustomerDialog
        isOpen={isCustomerDialogOpen}
        onSelect={(customer) => {
          setSaleCustomer(customer);
          setIsCustomerDialogOpen(false);
          // Volver a donde estaba el cajero: si vino del paso de confirmacion
          // para completar los datos de la factura, no lo dejamos en el carrito.
          if (returnToConfirmation) {
            setReturnToConfirmation(false);
            setIsConfirmOpen(true);
          }
        }}
        onCancel={() => {
          setIsCustomerDialogOpen(false);
          if (returnToConfirmation) {
            setReturnToConfirmation(false);
            setIsConfirmOpen(true);
          }
        }}
      />
    </div>
  );
}
