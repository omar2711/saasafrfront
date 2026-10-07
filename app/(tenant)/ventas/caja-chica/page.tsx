'use client';

import { useEffect, useState } from 'react';
import { Plus, ArrowUpRight, ArrowDownRight, Filter, Search, Trash2, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  pettyCashApi,
  type PettyCashTransactionDto,
  type PettyCashSummaryDto,
  type CreatePettyCashTransactionPayload,
} from '@/lib/api/petty-cash';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/format';

const CATEGORIES = ['Fondo Inicial', 'Papelería', 'Limpieza', 'Transporte', 'Alimentación', 'Servicios', 'Otros'];

interface FormData {
  type: 'income' | 'expense';
  amount: string;
  description: string;
  category: string;
  reference: string;
}

const emptyForm: FormData = {
  type: 'expense',
  amount: '',
  description: '',
  category: 'Otros',
  reference: '',
};

export default function PettyCashPage() {
  const [transactions, setTransactions] = useState<PettyCashTransactionDto[]>([]);
  const [summary, setSummary] = useState<PettyCashSummaryDto>({ totalIncome: 0, totalExpense: 0, balance: 0 });
  const [loading, setLoading] = useState(true);
  const [planError, setPlanError] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'income' | 'expense'>('expense');
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(value);

  async function loadData() {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (typeFilter !== 'all') params.type = typeFilter;
      if (categoryFilter !== 'all') params.category = categoryFilter;
      const result = await pettyCashApi.list(params);
      setTransactions(result.transactions);
      setSummary(result.summary);
      setPlanError(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('plan') || message.includes('módulo')) {
        setPlanError(true);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [typeFilter, categoryFilter]);

  function openDialog(type: 'income' | 'expense') {
    setDialogType(type);
    setForm({ ...emptyForm, type });
    setFormError('');
    setIsDialogOpen(true);
  }

  async function handleSave() {
    if (!form.amount || Number(form.amount) <= 0) {
      setFormError('El monto debe ser mayor a 0');
      return;
    }
    if (!form.description.trim()) {
      setFormError('La descripción es requerida');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload: CreatePettyCashTransactionPayload = {
        type: form.type,
        amount: Number(form.amount),
        description: form.description.trim(),
        category: form.category,
        reference: form.reference.trim() || undefined,
      };
      await pettyCashApi.create(payload);
      setIsDialogOpen(false);
      await loadData();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await pettyCashApi.delete(deleteId);
      setDeleteId(null);
      await loadData();
    } catch {
      // error handled silently — user can retry
    } finally {
      setDeleting(false);
    }
  }

  const filtered = transactions.filter((t) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      t.description.toLowerCase().includes(term) ||
      t.category.toLowerCase().includes(term) ||
      (t.reference ?? '').toLowerCase().includes(term)
    );
  });

  if (planError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Caja Chica" description="Registro de ingresos y gastos menores" />
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center gap-4 pt-6">
            <AlertTriangle className="h-8 w-8 text-amber-500 shrink-0" />
            <div>
              <p className="font-semibold text-amber-900">Módulo no disponible en tu plan actual</p>
              <p className="text-sm text-amber-700 mt-1">
                El módulo de Caja Chica está disponible en el Plan Empresarial. Actualiza tu suscripción para acceder a esta funcionalidad.
              </p>
              <Button className="mt-3" size="sm" onClick={() => window.location.href = '/mi-tienda/suscripcion'}>
                Ver planes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Caja Chica"
        description="Registro de ingresos y gastos menores"
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openDialog('expense')}>
            <ArrowDownRight className="mr-2 h-4 w-4" />
            Registrar Gasto
          </Button>
          <Button onClick={() => openDialog('income')}>
            <ArrowUpRight className="mr-2 h-4 w-4" />
            Registrar Ingreso
          </Button>
        </div>
      </PageHeader>

      {/* Balance Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-green-500" />
              Total Ingresos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {loading ? '...' : formatCurrency(summary.totalIncome)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Acumulado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowDownRight className="h-4 w-4 text-red-500" />
              Total Gastos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {loading ? '...' : formatCurrency(summary.totalExpense)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Acumulado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Saldo Actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              'text-2xl font-bold',
              summary.balance >= 0 ? 'text-green-600' : 'text-red-600',
            )}>
              {loading ? '...' : formatCurrency(summary.balance)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Disponible</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por descripción, categoría o referencia..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="income">Ingresos</SelectItem>
            <SelectItem value="expense">Gastos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground text-sm">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              No se encontraron movimientos.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {transaction.type === 'income' ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                          <ArrowUpRight className="mr-1 h-3 w-3" />
                          Ingreso
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                          <ArrowDownRight className="mr-1 h-3 w-3" />
                          Gasto
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{transaction.description}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{transaction.category}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">
                      {transaction.reference || '-'}
                    </TableCell>
                    <TableCell className={cn(
                      'font-semibold',
                      transaction.type === 'income' ? 'text-green-600' : 'text-red-600',
                    )}>
                      {transaction.type === 'income' ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDateTime(transaction.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteId(transaction.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogType === 'income' ? 'Registrar Ingreso' : 'Registrar Gasto'}
            </DialogTitle>
            <DialogDescription>
              Completa los datos del movimiento de caja chica.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="amount">Monto *</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="category">Categoría *</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="description">Descripción *</Label>
              <Textarea
                id="description"
                placeholder="Descripción del movimiento..."
                rows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="reference">Referencia / N° Comprobante</Label>
              <Input
                id="reference"
                placeholder="FAC-0001 (opcional)"
                value={form.reference}
                onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
              />
            </div>
            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar movimiento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El movimiento será eliminado del registro de caja chica.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
