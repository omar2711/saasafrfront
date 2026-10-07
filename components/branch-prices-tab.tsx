'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Search, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { pricingApi, type BranchPriceDto } from '@/lib/api/pricing';
import { useOrganization } from '@/contexts/organization-context';

interface BranchCell {
  override: number | null;
  effective: number;
  /** Se conservan para no borrarlos al guardar: el upsert reemplaza la fila entera. */
  costOverride: number | null;
  minOverride: number | null;
  maxOverride: number | null;
  effectiveMin: number | null;
  effectiveMax: number | null;
}

interface ProductRow {
  productId: string;
  sku: string;
  name: string;
  globalSalePrice: number;
  globalMinSalePrice: number | null;
  globalMaxSalePrice: number | null;
  byBranch: Record<string, BranchCell>;
}

/** Campos editables de una celda. Vacio = heredar el valor global. */
interface CellEdit {
  price: string;
  min: string;
  max: string;
}

const emptyEdit: CellEdit = { price: '', min: '', max: '' };
const toEditValue = (value: number | null | undefined) => (value != null ? String(value) : '');
const toPayloadValue = (value: string) => (value.trim() === '' ? null : Number(value));

export function BranchPricesTab() {
  const { branches } = useOrganization();
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  // edits[productId][branchId] = string
  const [edits, setEdits] = useState<Record<string, Record<string, CellEdit>>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const activeBranches = branches.filter((b) => b.status !== 'inactive');

  const loadData = useCallback(async () => {
    if (activeBranches.length === 0) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      // Una llamada por sucursal; cada una trae el precio efectivo + override por producto
      const perBranch = await Promise.all(
        activeBranches.map((b) =>
          pricingApi.listByBranch(b.id).then((list) => ({ branchId: b.id, list })),
        ),
      );

      const map = new Map<string, ProductRow>();
      for (const { branchId, list } of perBranch) {
        for (const item of list) {
          let row = map.get(item.productId);
          if (!row) {
            row = {
              productId: item.productId,
              sku: item.sku,
              name: item.name,
              globalSalePrice: item.globalSalePrice,
              globalMinSalePrice: item.globalMinSalePrice,
              globalMaxSalePrice: item.globalMaxSalePrice,
              byBranch: {},
            };
            map.set(item.productId, row);
          }
          row.byBranch[branchId] = {
            override: item.branchSalePrice,
            effective: item.effectiveSalePrice,
            costOverride: item.branchCostPrice,
            minOverride: item.branchMinSalePrice,
            maxOverride: item.branchMaxSalePrice,
            effectiveMin: item.effectiveMinSalePrice,
            effectiveMax: item.effectiveMaxSalePrice,
          };
        }
      }

      const result = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
      setRows(result);

      const initial: Record<string, Record<string, CellEdit>> = {};
      result.forEach((r) => {
        initial[r.productId] = {};
        activeBranches.forEach((b) => {
          const cell = r.byBranch[b.id];
          initial[r.productId][b.id] = {
            price: toEditValue(cell?.override),
            min: toEditValue(cell?.minOverride),
            max: toEditValue(cell?.maxOverride),
          };
        });
      });
      setEdits(initial);
    } catch {
      setError('No se pudieron cargar los precios');
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branches]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB', minimumFractionDigits: 0 }).format(value);

  const handleSave = async (row: ProductRow, branchId: string) => {
    const key = `${row.productId}:${branchId}`;
    const edit = edits[row.productId]?.[branchId] ?? emptyEdit;
    const min = toPayloadValue(edit.min);
    const max = toPayloadValue(edit.max);

    if (min !== null && max !== null && min > max) {
      setError('El precio minimo no puede ser mayor que el maximo');
      return;
    }

    setSavingKey(key);
    setError('');
    try {
      // El upsert reemplaza la fila entera, asi que hay que reenviar el costo de
      // sucursal: omitirlo lo borraba en silencio.
      await pricingApi.upsert({
        productId: row.productId,
        branchId,
        salePrice: toPayloadValue(edit.price),
        costPrice: row.byBranch[branchId]?.costOverride ?? null,
        minSalePrice: min,
        maxSalePrice: max,
      });
      await loadData();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar el precio');
    } finally {
      setSavingKey(null);
    }
  };

  const updateEdit = (productId: string, branchId: string, patch: Partial<CellEdit>) => {
    setEdits((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [branchId]: { ...(prev[productId]?.[branchId] ?? emptyEdit), ...patch },
      },
    }));
  };

  const filtered = rows.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.sku.toLowerCase().includes(search.toLowerCase()),
  );

  if (activeBranches.length === 0) {
    return <p className="text-sm text-muted-foreground py-10 text-center">No hay sucursales</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Precios por sucursal</h3>
        <p className="text-sm text-muted-foreground">
          Precio de venta efectivo por sucursal. Deja un campo vacío para heredar el valor global.
          Los campos min y max acotan a cuánto se puede vender: salirse del rango exige el permiso
          de Gerente.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o identificador..."
          className="pl-9 max-w-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Producto</TableHead>
                <TableHead>Precio global</TableHead>
                {activeBranches.map((b) => (
                  <TableHead key={b.id} className="min-w-[200px]">{b.name}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={2 + activeBranches.length} className="text-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2 + activeBranches.length} className="text-center py-10 text-muted-foreground">
                    Sin productos
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => (
                  <TableRow key={row.productId}>
                    <TableCell>
                      <div className="font-medium">{row.name}</div>
                      <div className="font-mono text-xs text-muted-foreground">{row.sku}</div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatCurrency(row.globalSalePrice)}
                    </TableCell>
                    {activeBranches.map((b) => {
                      const cell = row.byBranch[b.id];
                      const key = `${row.productId}:${b.id}`;
                      const hasOverride = cell?.override != null;
                      const edit = edits[row.productId]?.[b.id] ?? emptyEdit;
                      return (
                        <TableCell key={b.id}>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              step="0.01"
                              className="w-24"
                              placeholder="(global)"
                              value={edit.price}
                              onChange={(e) => updateEdit(row.productId, b.id, { price: e.target.value })}
                            />
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8 shrink-0"
                              onClick={() => handleSave(row, b.id)}
                              disabled={savingKey === key}
                            >
                              {savingKey === key ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          <div className="mt-1 flex items-center gap-1">
                            <Input
                              type="number"
                              step="0.01"
                              className="h-7 w-[74px] text-xs"
                              placeholder="min"
                              value={edit.min}
                              onChange={(e) => updateEdit(row.productId, b.id, { min: e.target.value })}
                            />
                            <Input
                              type="number"
                              step="0.01"
                              className="h-7 w-[74px] text-xs"
                              placeholder="max"
                              value={edit.max}
                              onChange={(e) => updateEdit(row.productId, b.id, { max: e.target.value })}
                            />
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground whitespace-nowrap">
                            Efectivo: {formatCurrency(cell?.effective ?? row.globalSalePrice)}
                            {hasOverride && (
                              <Badge variant="secondary" className="ml-1 bg-blue-100 text-blue-700">
                                override
                              </Badge>
                            )}
                          </div>
                          {(cell?.effectiveMin != null || cell?.effectiveMax != null) && (
                            <div className="text-[11px] text-muted-foreground whitespace-nowrap">
                              Rango: {cell.effectiveMin != null ? formatCurrency(cell.effectiveMin) : 'sin minimo'}
                              {' / '}
                              {cell.effectiveMax != null ? formatCurrency(cell.effectiveMax) : 'sin maximo'}
                            </div>
                          )}
                        </TableCell>
                      );
                    })}
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
