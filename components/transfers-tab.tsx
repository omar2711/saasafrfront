'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Loader2, ArrowRight, Trash2, Check, X, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { transfersApi, type TransferDto, type TransferStatus } from '@/lib/api/transfers';
import { productsApi, type ProductDto } from '@/lib/api/products';
import { useOrganization } from '@/contexts/organization-context';
import { formatDate } from '@/lib/format';

const STATUS_BADGE: Record<TransferStatus, { label: string; className: string }> = {
  in_transit: { label: 'En tránsito', className: 'bg-yellow-100 text-yellow-700' },
  completed: { label: 'Recibido', className: 'bg-green-100 text-green-700' },
  voided: { label: 'Anulado', className: 'bg-gray-100 text-gray-600' },
};

interface DraftItem {
  productId: string;
  quantity: string;
}

export function TransfersTab() {
  const { branches, currentBranch, hasPermission } = useOrganization();
  const canManage = hasPermission('inventory.transfer');

  const [transfers, setTransfers] = useState<TransferDto[]>([]);
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [sourceBranchId, setSourceBranchId] = useState('');
  const [destBranchId, setDestBranchId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<DraftItem[]>([{ productId: '', quantity: '1' }]);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [t, p] = await Promise.all([transfersApi.list(), productsApi.list()]);
      setTransfers(t);
      setProducts(p);
    } catch {
      setError('No se pudieron cargar los traspasos');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreate = () => {
    setSourceBranchId(currentBranch?.id ?? '');
    setDestBranchId('');
    setNotes('');
    setItems([{ productId: '', quantity: '1' }]);
    setFormError('');
    setDialogOpen(true);
  };

  const updateItem = (index: number, patch: Partial<DraftItem>) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };

  const handleSave = async () => {
    setFormError('');
    if (!sourceBranchId || !destBranchId) {
      setFormError('Selecciona sucursal de origen y destino');
      return;
    }
    if (sourceBranchId === destBranchId) {
      setFormError('El origen y el destino deben ser diferentes');
      return;
    }
    const validItems = items
      .filter((it) => it.productId && parseFloat(it.quantity) > 0)
      .map((it) => ({ productId: it.productId, quantity: parseFloat(it.quantity) }));
    if (validItems.length === 0) {
      setFormError('Agrega al menos un producto con cantidad');
      return;
    }

    setIsSaving(true);
    try {
      await transfersApi.create({ sourceBranchId, destBranchId, notes: notes.trim() || undefined, items: validItems });
      setDialogOpen(false);
      await loadData();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Error al crear el traspaso');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReceive = async (id: string) => {
    try {
      await transfersApi.receive(id);
      await loadData();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al recibir el traspaso');
    }
  };

  const handleVoid = async (id: string) => {
    try {
      await transfersApi.void(id);
      await loadData();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al anular el traspaso');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Traspasos</h3>
          <p className="text-sm text-muted-foreground">Movimiento de stock entre sucursales</p>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Traspaso
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Traspaso</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Sucursal origen</Label>
                <Select value={sourceBranchId} onValueChange={setSourceBranchId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Origen" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Sucursal destino</Label>
                <Select value={destBranchId} onValueChange={setDestBranchId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Productos</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setItems((prev) => [...prev, { productId: '', quantity: '1' }])}
                >
                  <Plus className="mr-1 h-3 w-3" /> Agregar
                </Button>
              </div>
              {items.map((item, index) => (
                <div key={index} className="flex gap-2 items-center">
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
                    onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label>Notas (opcional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>

            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear Traspaso
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
                <TableHead>Nº</TableHead>
                <TableHead>Ruta</TableHead>
                <TableHead>Productos</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
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
              ) : transfers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    No hay traspasos
                  </TableCell>
                </TableRow>
              ) : (
                transfers.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-sm">{t.transferNumber}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <span>{t.sourceBranchName}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span>{t.destBranchName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {t.items.length} ítem(s) · {t.items.reduce((s, i) => s + i.quantity, 0)} u.
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={STATUS_BADGE[t.status].className}>
                        {STATUS_BADGE[t.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(t.createdAt)}
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        {t.status === 'in_transit' ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleReceive(t.id)}>
                                <Check className="mr-2 h-4 w-4" /> Recibir
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => handleVoid(t.id)}>
                                <X className="mr-2 h-4 w-4" /> Anular
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
