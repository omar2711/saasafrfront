'use client';

import { FormDialog } from '@/components/form-dialog';
import { FormSection, FormGrid, FormField } from '@/components/form-layout';
import { Package as KitIcon, Boxes as KitProductsIcon } from 'lucide-react';

import { Fragment, useState, useEffect, useCallback } from 'react';
import { Plus, MoreHorizontal, Loader2, Package2, Trash2, ChevronRight, ChevronDown, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/status-badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { kitsApi, type KitDto } from '@/lib/api/kits';
import { productsApi, type ProductDto } from '@/lib/api/products';
import { useOrganization } from '@/contexts/organization-context';

interface DraftItem {
  productId: string;
  quantity: string;
}

const EMPTY_ITEM: DraftItem = { productId: '', quantity: '1' };

export function KitsTab() {
  const { hasPermission } = useOrganization();
  const canManage = hasPermission('kits.write');

  const [kits, setKits] = useState<KitDto[]>([]);
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<KitDto | null>(null);
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [items, setItems] = useState<DraftItem[]>([{ ...EMPTY_ITEM }]);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [kitsData, productsData] = await Promise.all([kitsApi.list(), productsApi.list()]);
      setKits(kitsData);
      setProducts(productsData);
    } catch {
      setError('No se pudieron cargar los kits');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB', minimumFractionDigits: 0 }).format(value);

  const openCreate = () => {
    setEditing(null);
    setSku('');
    setName('');
    setDescription('');
    setSalePrice('');
    setItems([{ ...EMPTY_ITEM }]);
    setFormError('');
    setDialogOpen(true);
  };

  const openEdit = (kit: KitDto) => {
    setEditing(kit);
    setSku(kit.sku);
    setName(kit.name);
    setDescription(kit.description ?? '');
    setSalePrice(String(kit.salePrice));
    setItems(
      kit.items.length > 0
        ? kit.items.map((i) => ({ productId: i.productId, quantity: String(i.quantity) }))
        : [{ ...EMPTY_ITEM }],
    );
    setFormError('');
    setDialogOpen(true);
  };

  const updateItem = (index: number, patch: Partial<DraftItem>) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };

  const handleSave = async () => {
    setFormError('');
    if (!sku.trim() || !name.trim()) {
      setFormError('El identificador y el nombre son requeridos');
      return;
    }
    const price = parseFloat(salePrice);
    if (!salePrice || isNaN(price) || price < 0) {
      setFormError('El precio de venta debe ser un numero valido');
      return;
    }
    const validItems = items
      .filter((it) => it.productId && parseFloat(it.quantity) > 0)
      .map((it) => ({ productId: it.productId, quantity: parseFloat(it.quantity) }));
    if (validItems.length === 0) {
      setFormError('Agrega al menos un producto componente');
      return;
    }

    setIsSaving(true);
    try {
      if (editing) {
        await kitsApi.update(editing.id, {
          sku: sku.trim(),
          name: name.trim(),
          description: description.trim() || undefined,
          salePrice: price,
          items: validItems,
        });
      } else {
        await kitsApi.create({
          sku: sku.trim(),
          name: name.trim(),
          description: description.trim() || undefined,
          salePrice: price,
          items: validItems,
        });
      }
      setDialogOpen(false);
      await loadData();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Error al guardar el kit');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (kit: KitDto) => {
    try {
      await kitsApi.update(kit.id, { status: kit.status === 'active' ? 'inactive' : 'active' });
      await loadData();
    } catch {
      /* noop */
    }
  };

  const handleDelete = async (kit: KitDto) => {
    if (!confirm(`¿Eliminar el kit "${kit.name}"?`)) return;
    try {
      await kitsApi.delete(kit.id);
      await loadData();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al eliminar el kit');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Kits</h3>
          <p className="text-sm text-muted-foreground">Combos de productos vendidos como una sola linea</p>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Kit
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
      )}

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        icon={KitIcon}
        title={editing ? 'Editar Kit' : 'Nuevo Kit'}
        description="Un kit agrupa varios productos y se vende a un solo precio."
        size="xl"
        submitLabel={editing ? 'Guardar cambios' : 'Crear kit'}
        onSubmit={handleSave}
        isSubmitting={isSaving}
        error={formError || null}
      >
        <FormSection icon={KitIcon} title="Datos del kit">
          <FormGrid>
            <FormField label="Identificador" htmlFor="kit-sku">
              <Input
                id="kit-sku"
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                placeholder="KIT-001"
                className="font-mono"
              />
            </FormField>
            <FormField label="Precio de venta" htmlFor="kit-price">
              <Input
                id="kit-price"
                type="number"
                step="0.01"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                placeholder="0.00"
              />
            </FormField>
            <FormField label="Nombre" htmlFor="kit-name" required className="sm:col-span-2">
              <Input
                id="kit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Combo Oficina Básico"
              />
            </FormField>
            <FormField label="Descripción (opcional)" htmlFor="kit-description" className="sm:col-span-2">
              <Textarea
                id="kit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </FormField>
          </FormGrid>
        </FormSection>

        <FormSection icon={KitProductsIcon} title="Productos componentes">
          <div className="space-y-2">
            <div className="hidden items-center gap-2 px-0.5 text-xs font-medium text-muted-foreground sm:flex">
              <span className="flex-1">Producto</span>
              <span className="w-24">Cantidad</span>
              <span className="w-9" />
            </div>
            {items.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="flex-1">
                  <Select value={item.productId} onValueChange={(v) => updateItem(index, { productId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Producto" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="w-24"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, { quantity: e.target.value })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Quitar producto"
                  onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                  disabled={items.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setItems((prev) => [...prev, { ...EMPTY_ITEM }])}
            >
              <Plus className="mr-1 h-3 w-3" /> Agregar producto
            </Button>
            {(() => {
              const componentsTotal = items.reduce((sum, it) => {
                const product = products.find((p) => p.id === it.productId);
                const qty = parseFloat(it.quantity) || 0;
                return sum + (product?.salePrice ?? 0) * qty;
              }, 0);
              const price = parseFloat(salePrice) || 0;
              const savings = componentsTotal - price;
              return componentsTotal > 0 ? (
                <p className="text-xs text-muted-foreground">
                  Suma de componentes: {formatCurrency(componentsTotal)}
                  {savings > 0 && (
                    <span className="ml-1 text-green-600">(ahorro de {formatCurrency(savings)})</span>
                  )}
                </p>
              ) : null;
            })()}
          </div>
        </FormSection>
      </FormDialog>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]" />
                <TableHead>Kit</TableHead>
                <TableHead>Identificador</TableHead>
                <TableHead>Componentes</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Margen</TableHead>
                <TableHead>Estado</TableHead>
                {canManage && <TableHead className="w-[50px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : kits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    No hay kits creados
                  </TableCell>
                </TableRow>
              ) : (
                kits.map((kit) => {
                  const componentsTotal = kit.componentsTotal ?? 0;
                  const margin = kit.salePrice > 0 ? ((kit.salePrice - componentsTotal) / kit.salePrice) * 100 : 0;
                  const isExpanded = expandedId === kit.id;
                  return (
                    <Fragment key={kit.id}>
                      <TableRow
                        className="cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : kit.id)}
                      >
                        <TableCell>
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded bg-muted flex items-center justify-center">
                              <Package2 className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <div className="font-medium">{kit.name}</div>
                              {kit.description && (
                                <div className="text-sm text-muted-foreground truncate max-w-[220px]">
                                  {kit.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{kit.sku}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{kit.items.length} producto(s)</Badge>
                        </TableCell>
                        <TableCell className="font-semibold">{formatCurrency(kit.salePrice)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={margin > 0 ? 'bg-green-100 text-green-700' : ''}>
                            {margin.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={kit.status} />
                        </TableCell>
                        {canManage && (
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEdit(kit)}>Editar</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleStatus(kit)}>
                                  {kit.status === 'active' ? 'Desactivar' : 'Activar'}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(kit)}>
                                  Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                      {isExpanded && (
                        <TableRow key={`${kit.id}-expanded`}>
                          <TableCell colSpan={8} className="bg-muted/30 py-3">
                            {kit.items.length === 0 ? (
                              <p className="text-sm text-muted-foreground pl-9">
                                Este kit no tiene productos componentes
                              </p>
                            ) : (
                              <div className="flex flex-wrap gap-2 pl-9">
                                {kit.items.map((item) => (
                                  <Badge key={item.id} variant="outline" className="gap-1 font-normal">
                                    <Package className="h-3 w-3" />
                                    {item.productName ?? item.productId} × {item.quantity}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
