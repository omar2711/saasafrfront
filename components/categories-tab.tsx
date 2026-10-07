'use client';

import { Fragment, useState, useEffect, useCallback } from 'react';
import { Plus, MoreHorizontal, Loader2, Tag, ChevronRight, ChevronDown, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/status-badge';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { categoriesApi, type CategoryDto } from '@/lib/api/categories';
import { productsApi, type ProductDto } from '@/lib/api/products';
import { useOrganization } from '@/contexts/organization-context';

interface FormState {
  name: string;
  description: string;
}

const EMPTY: FormState = { name: '', description: '' };

export function CategoriesTab() {
  const { currentBranch, hasPermission } = useOrganization();
  const canManage = hasPermission('categories.write');
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryDto | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [cats, prods] = await Promise.all([
        categoriesApi.list(currentBranch?.id),
        productsApi.list(),
      ]);
      setCategories(cats);
      setProducts(prods);
    } catch {
      setError('No se pudieron cargar las categorías');
    } finally {
      setIsLoading(false);
    }
  }, [currentBranch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setFormError('');
    setDialogOpen(true);
  };

  const openEdit = (category: CategoryDto) => {
    setEditing(category);
    setForm({ name: category.name, description: category.description ?? '' });
    setFormError('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setFormError('');
    if (!form.name.trim()) {
      setFormError('El nombre es requerido');
      return;
    }
    setIsSaving(true);
    try {
      if (editing) {
        await categoriesApi.update(editing.id, {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
        });
      } else {
        await categoriesApi.create({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
        });
      }
      setDialogOpen(false);
      await loadData();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (category: CategoryDto) => {
    try {
      await categoriesApi.update(category.id, {
        status: category.status === 'active' ? 'inactive' : 'active',
      });
      await loadData();
    } catch {
      /* noop */
    }
  };

  const handleDelete = async (category: CategoryDto) => {
    try {
      await categoriesApi.remove(category.id);
      await loadData();
    } catch {
      /* noop */
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Categorías</h3>
          <p className="text-sm text-muted-foreground">
            Conteo de productos {currentBranch ? `en ${currentBranch.name}` : 'global'}
          </p>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Categoría
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Categoría' : 'Nueva Categoría'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Electrónica"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descripción (opcional)</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? 'Guardar' : 'Crear'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]" />
                <TableHead>Categoría</TableHead>
                <TableHead>Productos (total)</TableHead>
                {currentBranch && <TableHead>En sucursal</TableHead>}
                <TableHead>Estado</TableHead>
                {canManage && <TableHead className="w-[50px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    No hay categorías
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((cat) => {
                  const isExpanded = expandedId === cat.id;
                  const categoryProducts = products.filter((p) => p.categoryId === cat.id);
                  return (
                    <Fragment key={cat.id}>
                      <TableRow
                        className="cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : cat.id)}
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
                              <Tag className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <div className="font-medium">{cat.name}</div>
                              {cat.description && (
                                <div className="text-sm text-muted-foreground truncate max-w-[240px]">
                                  {cat.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{cat.productCount}</Badge>
                        </TableCell>
                        {currentBranch && (
                          <TableCell>
                            <Badge variant="secondary">{cat.productCountInBranch ?? 0}</Badge>
                            <span className="ml-2 text-xs text-muted-foreground">
                              {cat.stockInBranch ?? 0} en stock
                            </span>
                          </TableCell>
                        )}
                        <TableCell>
                          <StatusBadge status={cat.status} />
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
                                <DropdownMenuItem onClick={() => openEdit(cat)}>Editar</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleStatus(cat)}>
                                  {cat.status === 'active' ? 'Inactivar' : 'Activar'}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDelete(cat)}
                                >
                                  Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                      {isExpanded && (
                        <TableRow key={`${cat.id}-expanded`}>
                          <TableCell colSpan={6} className="bg-muted/30 py-3">
                            {categoryProducts.length === 0 ? (
                              <p className="text-sm text-muted-foreground pl-9">
                                No hay productos en esta categoría
                              </p>
                            ) : (
                              <div className="flex flex-wrap gap-2 pl-9">
                                {categoryProducts.map((p) => (
                                  <Badge key={p.id} variant="outline" className="gap-1 font-normal">
                                    <Package className="h-3 w-3" />
                                    {p.name}
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
