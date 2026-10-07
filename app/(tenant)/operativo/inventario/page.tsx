'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, MoreHorizontal, Package, Upload, Download, Eye, Edit, Settings, History, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { ProductFormDialog } from '@/components/product-form-dialog';
import { ProductDetailsDialog } from '@/components/product-details-dialog';
import { ProductStockAdjustDialog, type StockAdjustPayload } from '@/components/product-stock-adjust-dialog';
import { ProductMovementsDialog } from '@/components/product-movements-dialog';
import { WriteOffsTab } from '@/components/write-offs-tab';
import { CategoriesTab } from '@/components/categories-tab';
import { TransfersTab } from '@/components/transfers-tab';
import { BranchPricesTab } from '@/components/branch-prices-tab';
import { DeletedProductsTab } from '@/components/deleted-products-tab';
import { KitsTab } from '@/components/kits-tab';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { inventoryApi, NEGATIVE_MOVEMENT_TYPES, type StockDto } from '@/lib/api/inventory';
import { productsApi, type ProductDto } from '@/lib/api/products';
import { categoriesApi, type CategoryDto } from '@/lib/api/categories';
import { useOrganization } from '@/contexts/organization-context';

interface StockRow {
  stock: StockDto;
  product?: ProductDto;
}

export default function InventoryPage() {
  const { currentBranch, hasPermission } = useOrganization();
  const canViewPricing = hasPermission('products.pricing');
  const [rows, setRows] = useState<StockRow[]>([]);
  const [productMap, setProductMap] = useState<Record<string, ProductDto>>({});
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<(ProductDto & { minStock?: number }) | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedDetailsProduct, setSelectedDetailsProduct] = useState<ProductDto | null>(null);
  const [selectedAdjustProduct, setSelectedAdjustProduct] = useState<ProductDto | null>(null);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [selectedMovementsProduct, setSelectedMovementsProduct] = useState<ProductDto | null>(null);

  const loadData = async () => {
    try {
      const [stocks, products, cats] = await Promise.all([
        inventoryApi.listStock(currentBranch?.id),
        productsApi.list(),
        categoriesApi.list(currentBranch?.id),
      ]);
      const pm: Record<string, ProductDto> = {};
      products.forEach(p => { pm[p.id] = p; });
      setProductMap(pm);
      setCategories(cats);
      setRows(stocks.map(s => ({ stock: s, product: pm[s.productId] })));
    } catch {
      // silently keep empty state
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBranch]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB', minimumFractionDigits: 0 }).format(value);

  // Las opciones se derivan de `rows` (lo que realmente se muestra: el stock de la
  // sucursal actual) y no de todo el catalogo de la organizacion, para que ningun
  // filtro ofrezca valores que no producen resultados.
  const categoryNames = Array.from(
    new Set(rows.map(r => r.product?.category).filter(Boolean) as string[])
  ).sort((a, b) => a.localeCompare(b, 'es'));

  const hasUncategorized = rows.some(r => r.product && !r.product.category);
  const hasActive = rows.some(r => r.product?.status === 'active');
  const hasInactive = rows.some(r => r.product?.status === 'inactive');
  const hasPendingPricing = rows.some(r => r.product?.status === 'pending_pricing');
  const hasLowStock = rows.some(r => r.stock.quantityOnHand <= r.stock.minStock);

  const filteredRows = rows.filter(({ stock, product }) => {
    if (!product) return false;
    const matchSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory =
      categoryFilter === 'all' ||
      (categoryFilter === '__none__' ? !product.category : product.category === categoryFilter);
    const isLow = stock.quantityOnHand <= stock.minStock;
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'low-stock' ? isLow : product.status === statusFilter);
    return matchSearch && matchCategory && matchStatus;
  });

  const totalValue = rows.reduce((sum, { stock, product }) =>
    sum + (stock.quantityOnHand * (product?.costPrice ?? 0)), 0);
  const lowStockCount = rows.filter(r => r.stock.quantityOnHand > 0 && r.stock.quantityOnHand <= r.stock.minStock).length;

  const getStock = (productId: string) => rows.find(r => r.product?.id === productId)?.stock.quantityOnHand ?? 0;
  const getMinStock = (productId: string) => rows.find(r => r.product?.id === productId)?.stock.minStock ?? 0;

  const applyUpdatedProduct = (updated: ProductDto) => {
    setProductMap(prev => ({ ...prev, [updated.id]: updated }));
    setRows(prev => prev.map(r => r.product?.id === updated.id ? { ...r, product: updated } : r));
  };

  const handleCreateProduct = async (formData: any) => {
    setErrorMessage('');
    try {
      const created = await productsApi.create({
        sku: formData.sku,
        name: formData.name,
        categoryId: formData.categoryId,
        description: formData.description,
        salePrice: formData.salePrice,
        costPrice: formData.costPrice,
        unit: formData.unit,
        image: formData.image,
        minStock: formData.minStock,
        branchId: currentBranch?.id,
      });
      setProductMap(prev => ({ ...prev, [created.id]: created }));
      if (currentBranch) {
        setRows(prev => [...prev, {
          stock: {
            id: created.id,
            orgId: created.orgId,
            branchId: currentBranch.id,
            productId: created.id,
            quantityOnHand: 0,
            minStock: formData.minStock ?? 0,
            createdAt: created.createdAt,
            updatedAt: created.updatedAt,
          },
          product: created,
        }]);
      }
      setIsFormOpen(false);
    } catch (e: unknown) {
      setErrorMessage(e instanceof Error ? e.message : 'Error al crear producto');
    }
  };

  const handleEditProduct = async (formData: any) => {
    if (!editingProduct) return;
    setErrorMessage('');
    try {
      const updated = await productsApi.update(editingProduct.id, {
        name: formData.name,
        categoryId: formData.categoryId,
        description: formData.description,
        salePrice: formData.salePrice,
        costPrice: formData.costPrice,
        unit: formData.unit,
        image: formData.image,
        minStock: formData.minStock,
        branchId: currentBranch?.id,
      });
      applyUpdatedProduct(updated);
      if (currentBranch) {
        setRows(prev => prev.map(r => r.product?.id === updated.id
          ? { ...r, stock: { ...r.stock, minStock: formData.minStock ?? 0 } }
          : r));
      }
      setIsFormOpen(false);
      setEditingProduct(null);
    } catch (e: unknown) {
      setErrorMessage(e instanceof Error ? e.message : 'Error al actualizar producto');
    }
  };

  const handleToggleProductStatus = async (product: ProductDto) => {
    setErrorMessage('');
    try {
      const updated = await productsApi.update(product.id, {
        status: product.status === 'active' ? 'inactive' : 'active',
      });
      applyUpdatedProduct(updated);
    } catch (e: unknown) {
      setErrorMessage(e instanceof Error ? e.message : 'Error al cambiar estado del producto');
    }
  };

  const handleDeleteProduct = async (product: ProductDto) => {
    setErrorMessage('');
    if (!confirm(`¿Eliminar "${product.name}"? Podrás restaurarlo desde la papelera.`)) return;
    try {
      await productsApi.delete(product.id);
      setRows(prev => prev.filter(r => r.product?.id !== product.id));
      setProductMap(prev => {
        const next = { ...prev };
        delete next[product.id];
        return next;
      });
    } catch (e: unknown) {
      setErrorMessage(e instanceof Error ? e.message : 'Error al eliminar producto');
    }
  };

  const handleStockAdjust = async ({ quantity, movementType, reason }: StockAdjustPayload) => {
    if (!selectedAdjustProduct || !currentBranch) return;
    setErrorMessage('');
    setIsAdjusting(true);
    try {
      await inventoryApi.createMovement({
        branchId: currentBranch.id,
        productId: selectedAdjustProduct.id,
        movementType,
        quantity,
        notes: reason,
      });
      // El signo se deriva del tipo, igual que en el backend.
      const delta = NEGATIVE_MOVEMENT_TYPES.includes(movementType) ? -quantity : quantity;
      setRows(prev => prev.map(r => r.product?.id === selectedAdjustProduct.id
        ? { ...r, stock: { ...r.stock, quantityOnHand: Math.max(0, r.stock.quantityOnHand + delta) } }
        : r));
      setSelectedAdjustProduct(null);
    } catch (e: unknown) {
      setErrorMessage(e instanceof Error ? e.message : 'Error al ajustar el stock');
    } finally {
      setIsAdjusting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-muted-foreground">Cargando inventario...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Inventario" description="Catalogo de productos y control de stock">
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Importar
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          <Button onClick={() => { setEditingProduct(null); setErrorMessage(''); setIsFormOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Producto
          </Button>
        </div>
      </PageHeader>

      {errorMessage && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorMessage}</div>
      )}

      <ProductFormDialog
        isOpen={isFormOpen}
        editingProduct={editingProduct}
        categories={categories.map(c => ({ id: c.id, name: c.name }))}
        onSave={editingProduct ? handleEditProduct : handleCreateProduct}
        onCancel={() => {
          setIsFormOpen(false);
          setEditingProduct(null);
          setErrorMessage('');
        }}
      />

      <ProductDetailsDialog
        isOpen={!!selectedDetailsProduct}
        product={selectedDetailsProduct}
        stock={selectedDetailsProduct ? getStock(selectedDetailsProduct.id) : 0}
        minStock={selectedDetailsProduct ? getMinStock(selectedDetailsProduct.id) : 0}
        onClose={() => setSelectedDetailsProduct(null)}
      />

      <ProductStockAdjustDialog
        isOpen={!!selectedAdjustProduct}
        product={selectedAdjustProduct}
        stock={selectedAdjustProduct ? getStock(selectedAdjustProduct.id) : 0}
        isSubmitting={isAdjusting}
        onConfirm={handleStockAdjust}
        onCancel={() => setSelectedAdjustProduct(null)}
      />

      <ProductMovementsDialog
        isOpen={!!selectedMovementsProduct}
        product={selectedMovementsProduct}
        branchId={currentBranch?.id}
        onClose={() => setSelectedMovementsProduct(null)}
      />

      <Tabs defaultValue="inventario" className="w-full">
        <TabsList>
          <TabsTrigger value="inventario">Inventario</TabsTrigger>
          <TabsTrigger value="categorias">Categorías</TabsTrigger>
          <TabsTrigger value="kits">Kits</TabsTrigger>
          <TabsTrigger value="traspasos">Traspasos</TabsTrigger>
          <TabsTrigger value="bajas">Bajas</TabsTrigger>
          {canViewPricing && <TabsTrigger value="precios">Precios</TabsTrigger>}
          <TabsTrigger value="eliminados">Eliminados</TabsTrigger>
        </TabsList>

        <TabsContent value="inventario" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{rows.length}</div>
                <p className="text-sm text-muted-foreground">Productos activos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{lowStockCount}</div>
                <p className="text-sm text-muted-foreground">Bajo stock</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
                <p className="text-sm text-muted-foreground">Valor de inventario</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{categories.length}</div>
                <p className="text-sm text-muted-foreground">Categorias</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o identificador..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categoryNames.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
                {hasUncategorized && <SelectItem value="__none__">Sin categoria</SelectItem>}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {hasActive && <SelectItem value="active">Activos</SelectItem>}
                {hasInactive && <SelectItem value="inactive">Inactivos</SelectItem>}
                {hasPendingPricing && <SelectItem value="pending_pricing">Pendiente de precio</SelectItem>}
                {hasLowStock && <SelectItem value="low-stock">Bajo stock</SelectItem>}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Identificador</TableHead>
                    <TableHead>Costo</TableHead>
                    <TableHead>Precio Venta</TableHead>
                    <TableHead>Margen</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map(({ stock, product }) => {
                    if (!product) return null;
                    const margin = product.costPrice
                      ? ((product.salePrice - product.costPrice) / product.salePrice) * 100
                      : 0;
                    const isLowStock = stock.quantityOnHand < stock.minStock;
                    return (
                      <TableRow key={stock.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                              <Package className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                              <div className="font-medium">{product.name}</div>
                              <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                                {product.description || 'Sin descripcion'}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                        <TableCell>{formatCurrency(product.costPrice ?? 0)}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(product.salePrice)}</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={margin > 30 ? 'bg-green-100 text-green-700' : ''}
                          >
                            {margin.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={isLowStock ? 'text-yellow-600 font-medium' : ''}>
                              {stock.quantityOnHand}
                            </span>
                            <span className="text-muted-foreground text-sm">
                              / {stock.minStock} min
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {isLowStock ? (
                            <StatusBadge status="warning" label="Bajo stock" />
                          ) : product.status === 'pending_pricing' ? (
                            <StatusBadge status="pending" label="Pendiente de precio" />
                          ) : (
                            <StatusBadge status={product.status} />
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setSelectedDetailsProduct(product)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Ver detalles
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setEditingProduct({ ...product, minStock: getMinStock(product.id) }); setErrorMessage(''); setIsFormOpen(true); }}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setSelectedAdjustProduct(product)}>
                                <Settings className="mr-2 h-4 w-4" />
                                Ajustar stock
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setSelectedMovementsProduct(product)}>
                                <History className="mr-2 h-4 w-4" />
                                Ver movimientos
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleToggleProductStatus(product)}>
                                {product.status === 'active' ? 'Desactivar' : 'Activar'}
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteProduct(product)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categorias">
          <CategoriesTab />
        </TabsContent>

        <TabsContent value="kits">
          <KitsTab />
        </TabsContent>

        <TabsContent value="traspasos">
          <TransfersTab />
        </TabsContent>

        <TabsContent value="bajas">
          <WriteOffsTab onWriteOffRegistered={loadData} />
        </TabsContent>

        {canViewPricing && (
          <TabsContent value="precios">
            <BranchPricesTab />
          </TabsContent>
        )}

        <TabsContent value="eliminados">
          <DeletedProductsTab onRestored={loadData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
