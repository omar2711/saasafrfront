"use client"

import { useState, useEffect } from "react"
import { Plus, Search, Filter, MoreHorizontal, Package, Edit, Trash2, Eye, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/page-header"
import { ProductFormDialog } from "@/components/product-form-dialog"
import { ProductDetailsDialog } from "@/components/product-details-dialog"
import { ProductStockAdjustDialog, type StockAdjustPayload } from "@/components/product-stock-adjust-dialog"
import { productsApi, type ProductDto } from "@/lib/api/products"
import { inventoryApi, NEGATIVE_MOVEMENT_TYPES, type StockDto } from "@/lib/api/inventory"
import { useOrganization } from "@/contexts/organization-context"

export default function ProductosPage() {
  const { currentBranch } = useOrganization()
  const [products, setProducts] = useState<ProductDto[]>([])
  const [stockMap, setStockMap] = useState<Record<string, number>>({})
  const [minStockMap, setMinStockMap] = useState<Record<string, number>>({})
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<(ProductDto & { minStock?: number }) | null>(null)
  const [deletingProduct, setDeletingProduct] = useState<ProductDto | null>(null)
  const [errorMessage, setErrorMessage] = useState("")
  const [selectedDetailsProduct, setSelectedDetailsProduct] = useState<ProductDto | null>(null)
  const [selectedAdjustProduct, setSelectedAdjustProduct] = useState<ProductDto | null>(null)
  const [isAdjusting, setIsAdjusting] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [prods, stocks] = await Promise.all([
          productsApi.list(),
          currentBranch ? inventoryApi.listStock(currentBranch.id) : Promise.resolve([] as StockDto[]),
        ])
        setProducts(prods)
        const sm: Record<string, number> = {}
        const mm: Record<string, number> = {}
        stocks.forEach(s => {
          sm[s.productId] = s.quantityOnHand
          mm[s.productId] = s.minStock
        })
        setStockMap(sm)
        setMinStockMap(mm)
      } catch {
        setErrorMessage('Error al cargar productos')
      } finally {
        setIsLoadingData(false)
      }
    }
    loadData()
  }, [currentBranch])

  const getStock = (productId: string) => stockMap[productId] ?? 0
  const getMinStock = (productId: string) => minStockMap[productId] ?? 0

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStockStatus = (productId: string) => {
    const stock = getStock(productId)
    const min = getMinStock(productId)
    if (stock === 0) return { label: "Sin Stock", variant: "destructive" as const }
    if (stock <= min) return { label: "Stock Bajo", variant: "warning" as const }
    return { label: "En Stock", variant: "success" as const }
  }

  const handleCreateProduct = async (formData: any) => {
    setErrorMessage('')
    try {
      const created = await productsApi.create({
        sku: formData.sku,
        name: formData.name,
        category: formData.category,
        description: formData.description,
        salePrice: formData.salePrice,
        costPrice: formData.costPrice,
        minSalePrice: formData.minSalePrice,
        maxSalePrice: formData.maxSalePrice,
        unit: formData.unit,
        image: formData.image,
        minStock: formData.minStock,
        branchId: currentBranch?.id,
      })
      setProducts(prev => [...prev, created])
      if (currentBranch) {
        setMinStockMap(prev => ({ ...prev, [created.id]: formData.minStock ?? 0 }))
      }
      setIsFormOpen(false)
    } catch (e: unknown) {
      setErrorMessage(e instanceof Error ? e.message : 'Error al crear producto')
    }
  }

  const handleEditProduct = async (formData: any) => {
    if (!editingProduct) return
    setErrorMessage('')
    try {
      const updated = await productsApi.update(editingProduct.id, {
        name: formData.name,
        category: formData.category,
        description: formData.description,
        salePrice: formData.salePrice,
        costPrice: formData.costPrice,
        minSalePrice: formData.minSalePrice,
        maxSalePrice: formData.maxSalePrice,
        unit: formData.unit,
        image: formData.image,
        minStock: formData.minStock,
        branchId: currentBranch?.id,
      })
      setProducts(prev => prev.map(p => p.id === editingProduct.id ? updated : p))
      if (currentBranch) {
        setMinStockMap(prev => ({ ...prev, [editingProduct.id]: formData.minStock ?? 0 }))
      }
      setIsFormOpen(false)
      setEditingProduct(null)
    } catch (e: unknown) {
      setErrorMessage(e instanceof Error ? e.message : 'Error al actualizar producto')
    }
  }

  const handleDeleteProduct = async () => {
    if (!deletingProduct) return
    setErrorMessage('')
    try {
      await productsApi.delete(deletingProduct.id)
      setProducts(prev => prev.filter(p => p.id !== deletingProduct.id))
      setDeletingProduct(null)
    } catch (e: unknown) {
      setErrorMessage(e instanceof Error ? e.message : 'Error al eliminar producto')
    }
  }

  const handleToggleProductStatus = async (product: ProductDto) => {
    setErrorMessage('')
    try {
      const updated = await productsApi.update(product.id, {
        status: product.status === 'active' ? 'inactive' : 'active',
      })
      setProducts(prev => prev.map(p => p.id === product.id ? updated : p))
    } catch (e: unknown) {
      setErrorMessage(e instanceof Error ? e.message : 'Error al cambiar estado del producto')
    }
  }

  const handleStockAdjust = async ({ quantity, movementType, reason }: StockAdjustPayload) => {
    if (!selectedAdjustProduct || !currentBranch) return
    setErrorMessage('')
    setIsAdjusting(true)
    try {
      await inventoryApi.createMovement({
        branchId: currentBranch.id,
        productId: selectedAdjustProduct.id,
        movementType,
        quantity,
        notes: reason,
      })
      // El signo se deriva del tipo, igual que en el backend.
      const delta = NEGATIVE_MOVEMENT_TYPES.includes(movementType) ? -quantity : quantity
      setStockMap(prev => ({
        ...prev,
        [selectedAdjustProduct.id]: Math.max(0, (prev[selectedAdjustProduct.id] ?? 0) + delta),
      }))
      setSelectedAdjustProduct(null)
    } catch (e: unknown) {
      setErrorMessage(e instanceof Error ? e.message : 'Error al ajustar el stock')
    } finally {
      setIsAdjusting(false)
    }
  }

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-muted-foreground">Cargando productos...</p>
      </div>
    )
  }

  const lowStockCount = products.filter(p => {
    const stock = getStock(p.id)
    return stock <= getMinStock(p.id) && stock > 0
  }).length
  const noStockCount = products.filter(p => getStock(p.id) === 0).length

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Productos"
        description="Gestiona el catálogo de productos de tu negocio"
      />

      <ProductFormDialog
        isOpen={isFormOpen}
        editingProduct={editingProduct}
        onSave={editingProduct ? handleEditProduct : handleCreateProduct}
        onCancel={() => {
          setIsFormOpen(false)
          setEditingProduct(null)
          setErrorMessage('')
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

      <AlertDialog open={!!deletingProduct} onOpenChange={(open) => !open && setDeletingProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Producto</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Deseas eliminar &quot;{deletingProduct?.name}&quot;? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProduct} className="bg-destructive">
              Eliminar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {errorMessage && !deletingProduct && !isFormOpen && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
          {errorMessage}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Productos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              {products.filter(p => p.status === 'active').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Stock Bajo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{lowStockCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sin Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{noStockCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o identificador..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filtros
          </Button>
          <Button size="sm" onClick={() => {
            setEditingProduct(null)
            setErrorMessage('')
            setIsFormOpen(true)
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Producto
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Identificador</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Precio Compra</TableHead>
                <TableHead className="text-right">Precio Venta</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Stock Status</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => {
                const stock = getStock(product.id)
                const stockStatus = getStockStatus(product.id)
                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.unit ?? 'unidad'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                    <TableCell>{product.category ?? '-'}</TableCell>
                    <TableCell className="text-right">
                      Bs {(product.costPrice ?? 0).toLocaleString("es-BO")}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      Bs {product.salePrice.toLocaleString("es-BO")}
                    </TableCell>
                    <TableCell className="text-right">
                      {stock} {product.unit ?? ''}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          stockStatus.variant === "success"
                            ? "default"
                            : stockStatus.variant === "warning"
                            ? "secondary"
                            : "destructive"
                        }
                        className={
                          stockStatus.variant === "success"
                            ? "bg-accent text-accent-foreground"
                            : stockStatus.variant === "warning"
                            ? "bg-warning text-warning-foreground"
                            : ""
                        }
                      >
                        {stockStatus.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {product.status === 'pending_pricing' ? (
                        <Badge variant="secondary" className="bg-warning text-warning-foreground">
                          ⏳ Pendiente de precio
                        </Badge>
                      ) : (
                        <Badge variant={product.status === 'active' ? "default" : "secondary"}>
                          {product.status === 'active' ? "✓ Activo" : "○ Inactivo"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuItem onClick={() => setSelectedDetailsProduct(product)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver Detalle
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setEditingProduct({ ...product, minStock: getMinStock(product.id) })
                            setErrorMessage('')
                            setIsFormOpen(true)
                          }}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar Producto
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setSelectedAdjustProduct(product)}>
                            <Settings className="mr-2 h-4 w-4" />
                            Ajustar Stock
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleToggleProductStatus(product)}>
                            {product.status === 'active' ? '❌' : '✓'} {product.status === 'active' ? 'Desactivar' : 'Activar'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeletingProduct(product)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
