'use client';

import { getBaseCurrency } from '@/lib/format';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Calendar,
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  FileText,
  RefreshCw,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { ChartCard } from '@/components/chart-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useOrganization } from '@/contexts/organization-context';

import { salesApi, type SaleDto } from '@/lib/api/sales';
import { quotesApi } from '@/lib/api/quotes';
import { productsApi } from '@/lib/api/products';
import { inventoryApi, type StockDto } from '@/lib/api/inventory';
import { pettyCashApi } from '@/lib/api/petty-cash';
import { formatDateFull } from '@/lib/format';

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

type DashboardData = {
  sales: SaleDto[];
  quotes: Awaited<ReturnType<typeof quotesApi.list>>;
  products: Awaited<ReturnType<typeof productsApi.list>>;
  stock: StockDto[];
  cashTransactions: Awaited<ReturnType<typeof pettyCashApi.list>>['transactions'];
};

const currency = (value: number) =>
  new Intl.NumberFormat('es-BO', {
    style: 'currency',
    currency: getBaseCurrency(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value || 0);

const paymentLabels: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  credit: 'Crédito',
  other: 'Otro',
};

const dateOf = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const formatDay = (date: Date) =>
  new Intl.DateTimeFormat('es-BO', { weekday: 'short' }).format(date);

const formatMonth = (date: Date) =>
  new Intl.DateTimeFormat('es-BO', { month: 'short' }).format(date);

export default function TenantDashboard() {
  const { organization, currentBranch, currentUser, branches } = useOrganization();

  const [data, setData] = useState<DashboardData>({
    sales: [],
    quotes: [],
    products: [],
    stock: [],
    cashTransactions: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openPeriod, setOpenPeriod] = useState<string | null>(null);

  const branchId = currentBranch?.id;

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError(null);

      try {
        const [sales, quotes, products, stock, cash] = await Promise.all([
          salesApi.list({
            branchId,
            status: 'completed',
            limit: 500,
            offset: 0,
          }),
          quotesApi.list({
            branchId,
            limit: 500,
            offset: 0,
          }),
          productsApi.list(),
          inventoryApi.listStock(branchId),
          pettyCashApi.list({ branchId }),
        ]);

        if (cancelled) return;

        setData({
          sales: sales.filter((sale) => sale.status === 'completed'),
          quotes,
          products,
          stock,
          cashTransactions: cash.transactions ?? [],
        });
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'No se pudieron cargar los datos del dashboard.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [branchId]);

  const now = new Date();
  const today = startOfDay(now);

  const periods = useMemo(() => {
    const weekStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - ((today.getDay() + 6) % 7),
    );
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const yearStart = new Date(today.getFullYear(), 0, 1);

    const previousWeek = new Date(weekStart);
    previousWeek.setDate(previousWeek.getDate() - 7);

    const previousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const previousYear = new Date(today.getFullYear() - 1, 0, 1);

    const build = (start: Date, previousStart: Date) => {
      const current = data.sales.filter((sale) => {
        const date = dateOf(sale.soldAt);
        return date && date >= start && date <= now;
      });

      const previous = data.sales.filter((sale) => {
        const date = dateOf(sale.soldAt);
        return date && date >= previousStart && date < start;
      });

      const revenue = current.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
      const previousRevenue = previous.reduce(
        (sum, sale) => sum + Number(sale.total || 0),
        0,
      );

      const itemCount = current.reduce(
        (sum, sale) =>
          sum +
          Number(
            sale.itemCount ??
              sale.items?.reduce((total, item) => total + Number(item.quantity || 0), 0) ??
              0,
          ),
        0,
      );

      const methods: Record<string, number> = {};
      current.forEach((sale) => {
        const method = sale.paymentMethod || 'other';
        methods[method] = (methods[method] || 0) + 1;
      });

      const topMethod = Object.entries(methods).sort((a, b) => b[1] - a[1])[0]?.[0];

      return {
        revenue,
        count: current.length,
        items: itemCount,
        avg: current.length ? revenue / current.length : 0,
        topMethod: topMethod ? paymentLabels[topMethod] || topMethod : 'Sin datos',
        trend:
          previousRevenue > 0
            ? ((revenue - previousRevenue) / previousRevenue) * 100
            : null,
      };
    };

    return [
      {
        key: 'semanal',
        label: 'Semanal',
        subtitle: 'Esta semana',
        icon: CalendarDays,
        gradient: 'from-blue-500 to-cyan-400',
        iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        ...build(weekStart, previousWeek),
      },
      {
        key: 'mensual',
        label: 'Mensual',
        subtitle: 'Este mes',
        icon: Calendar,
        gradient: 'from-violet-500 to-fuchsia-400',
        iconBg: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
        ...build(monthStart, previousMonth),
      },
      {
        key: 'anual',
        label: 'Anual',
        subtitle: 'Este año',
        icon: CalendarCheck,
        gradient: 'from-emerald-500 to-teal-400',
        iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        ...build(yearStart, previousYear),
      },
    ];
  }, [data.sales, today, now]);

  const pendingQuotes = data.quotes.filter(
    (quote) => quote.status === 'pending' || quote.status === 'sent',
  ).length;

  const approvedQuotes = data.quotes.filter(
    (quote) => quote.status === 'approved' || quote.status === 'accepted',
  ).length;

  const lowStock = useMemo(() => {
    const productsById = new Map(data.products.map((product) => [product.id, product]));
    const branchNames = new Map(branches.map((branch) => [branch.id, branch.name]));

    return data.stock
      .filter((stock) => stock.minStock > 0 && stock.quantityOnHand < stock.minStock)
      .map((stock) => ({
        ...stock,
        product: productsById.get(stock.productId),
        branchName: branchNames.get(stock.branchId),
      }))
      .sort((a, b) => {
        const aRatio = a.minStock ? a.quantityOnHand / a.minStock : 1;
        const bRatio = b.minStock ? b.quantityOnHand / b.minStock : 1;
        return aRatio - bRatio;
      });
  }, [data.stock, data.products, branches]);

  const recentSales = useMemo(
    () =>
      [...data.sales]
        .sort(
          (a, b) =>
            (dateOf(b.soldAt)?.getTime() || 0) -
            (dateOf(a.soldAt)?.getTime() || 0),
        )
        .slice(0, 5),
    [data.sales],
  );

  const salesByDay = useMemo(() => {
    const monday = new Date(today);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));

    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(monday);
      day.setDate(monday.getDate() + index);

      const nextDay = new Date(day);
      nextDay.setDate(day.getDate() + 1);

      const sales = data.sales.filter((sale) => {
        const date = dateOf(sale.soldAt);
        return date && date >= day && date < nextDay;
      });

      return {
        day: formatDay(day),
        ventas: sales.length,
      };
    });
  }, [data.sales, today]);

  const cashByMonth = useMemo(() => {
    return Array.from({ length: 6 }, (_, index) => {
      const month = new Date(today.getFullYear(), today.getMonth() - 5 + index, 1);
      const nextMonth = new Date(month.getFullYear(), month.getMonth() + 1, 1);

      const transactions = data.cashTransactions.filter((transaction) => {
        const date = dateOf(transaction.createdAt);
        return date && date >= month && date < nextMonth;
      });

      return {
        month: formatMonth(month),
        ingresos: transactions
          .filter((transaction) => transaction.type === 'income')
          .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0),
        gastos: transactions
          .filter((transaction) => transaction.type === 'expense')
          .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0),
      };
    });
  }, [data.cashTransactions, today]);

  const firstName = (currentUser?.name ?? '').trim().split(' ')[0];
  const roleLabel = (currentUser?.roleNames ?? []).join(', ');

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hola, ${firstName || 'bienvenido'}`}
        description={[
          roleLabel,
          currentBranch ? `Sucursal ${currentBranch.name}` : 'Todas las sucursales',
          formatDateFull(new Date()),
        ].filter(Boolean).join(' · ')}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{organization?.name || 'Resumen del negocio'}</p>
          <p className="text-xs text-muted-foreground">
            Información obtenida de tus registros reales
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
          disabled={loading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {error && (
        <Card className="border-red-500/30">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-red-500" />
            <div>
              <p className="font-semibold">No se pudieron cargar todos los datos</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {periods.map((period) => {
          const Icon = period.icon;
          const isOpen = openPeriod === period.key;
          const up = (period.trend ?? 0) >= 0;

          return (
            <Card
              key={period.key}
              role="button"
              tabIndex={0}
              aria-expanded={isOpen}
              onClick={() => setOpenPeriod(isOpen ? null : period.key)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setOpenPeriod(isOpen ? null : period.key);
                }
              }}
              className={`group relative cursor-pointer overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
                isOpen ? 'shadow-lg ring-1 ring-primary/30' : ''
              }`}
            >
              <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${period.gradient}`} />
              <CardContent className="p-5 pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${period.iconBg}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{period.label}</p>
                      <p className="text-xs text-muted-foreground">{period.subtitle}</p>
                    </div>
                  </div>
                  <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>

                <div className="mt-5 flex flex-wrap items-end justify-between gap-2">
                  <p className="text-2xl font-bold tracking-tight">
                    {loading ? '...' : currency(period.revenue)}
                  </p>
                  {period.trend !== null && (
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                      up
                        ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                        : 'bg-red-500/10 text-red-600 dark:text-red-400'
                    }`}>
                      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {Math.abs(period.trend).toFixed(1)}%
                    </span>
                  )}
                </div>

                {isOpen && (
                  <div className="mt-5 grid grid-cols-2 gap-3 border-t pt-4">
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">Ventas</p>
                      <p className="text-lg font-semibold">{period.count}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">Ticket promedio</p>
                      <p className="text-lg font-semibold">{currency(period.avg)}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">Unidades vendidas</p>
                      <p className="text-lg font-semibold">{period.items}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">Pago más usado</p>
                      <p className="truncate text-lg font-semibold">{period.topMethod}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <StatCard
          title="Cotizaciones pendientes"
          value={loading ? '...' : pendingQuotes}
          icon={FileText}
          description={`${approvedQuotes} aprobadas`}
        />
        <StatCard
          title="Productos con bajo stock"
          value={loading ? '...' : lowStock.length}
          icon={AlertTriangle}
          description="Según existencias y mínimo por sucursal"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Ingresos y gastos de caja chica"
          description="Últimos 6 meses · No representa la contabilidad general"
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={cashByMonth}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `Bs ${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: number) => [currency(value), '']}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="ingresos" name="Ingresos" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="gastos" name="Gastos" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Ventas por día" description="Esta semana">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesByDay}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Line
                type="monotone"
                dataKey="ventas"
                name="Ventas"
                stroke="hsl(var(--chart-1))"
                strokeWidth={3}
                dot={{ fill: 'hsl(var(--chart-1))', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingCart className="h-4 w-4 text-primary" />
              Ventas recientes
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => window.location.href = '/mi-tienda/ventas'}>
              Ver todas
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Cargando ventas...</p>
            ) : recentSales.length ? (
              <div className="space-y-4">
                {recentSales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between gap-3 border-b pb-3 last:border-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{sale.saleNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        {sale.customerName || sale.clientName || 'Cliente General'}
                        {' · '}
                        {sale.itemCount ?? sale.items?.length ?? 0} productos
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {dateOf(sale.soldAt)?.toLocaleDateString('es-BO') || 'Fecha no disponible'}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-semibold">{currency(sale.total)}</p>
                      <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                        <ArrowUpRight className="h-3 w-3 text-green-500" />
                        {paymentLabels[sale.paymentMethod || 'other'] || 'Otro'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Todavía no hay ventas completadas.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Productos con bajo stock
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => window.location.href = '/mi-tienda/inventario'}>
              Ver inventario
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Cargando inventario...</p>
            ) : lowStock.length ? (
              <div className="space-y-4">
                {lowStock.slice(0, 5).map((item) => {
                  const percentage = item.minStock > 0
                    ? Math.min(100, (item.quantityOnHand / item.minStock) * 100)
                    : 100;

                  return (
                    <div key={item.id} className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {item.product?.name || 'Producto sin nombre'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.product?.sku || item.productId}
                            {!currentBranch && item.branchName ? ` · ${item.branchName}` : ''}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-semibold text-yellow-600">
                            {item.quantityOnHand} / {item.minStock}
                          </p>
                          <p className="text-xs text-muted-foreground">disponible / mínimo</p>
                        </div>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-yellow-500 transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No hay productos con bajo stock.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
