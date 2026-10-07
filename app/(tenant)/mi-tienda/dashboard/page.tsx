'use client';

import { 
  ShoppingCart, 
  DollarSign, 
  Package, 
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { ChartCard } from '@/components/chart-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useOrganization } from '@/contexts/organization-context';
import { 
  mockTenantStats, 
  mockRevenueChartData, 
  mockSalesChartData,
  mockSales,
  mockProducts,
  mockQuotes,
} from '@/lib/mock-data';
import { getStock, getLowStockProducts } from '@/lib/inventory-service';
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
import { formatDateFull } from '@/lib/format';

export default function TenantDashboard() {
  const { organization, currentBranch } = useOrganization();
  const stats = mockTenantStats;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Calculate quotation stats
  const pendingQuotes = mockQuotes.filter(q => q.status === 'sent').length;
  const approvedQuotes = mockQuotes.filter(q => q.status === 'accepted').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Bienvenido, ${organization?.name || 'Mi Tienda'}`}
        description={`Resumen de ${currentBranch?.name || 'todas las sucursales'} - Hoy es ${formatDateFull(new Date())}`}
      >
        <Button>
          <ShoppingCart className="mr-2 h-4 w-4" />
          Nueva Venta
        </Button>
      </PageHeader>

      {/* Main Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Ventas de Hoy"
          value={stats.todaySales}
          icon={ShoppingCart}
          trend={{ value: 12, isPositive: true }}
          description="vs. ayer"
        />
        <StatCard
          title="Ingresos de Hoy"
          value={formatCurrency(stats.todayRevenue)}
          icon={DollarSign}
          trend={{ value: 8.5, isPositive: true }}
          description="vs. ayer"
        />
        <StatCard
          title="Cotizaciones Pendientes"
          value={pendingQuotes}
          icon={FileText}
          description={`${approvedQuotes} aprobadas`}
        />
        <StatCard
          title="Bajo Stock"
          value={getLowStockProducts().length}
          icon={AlertTriangle}
          description="Productos con bajo stock"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Ingresos vs Gastos"
          description="Ultimos 6 meses"
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mockRevenueChartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis 
                tick={{ fontSize: 12 }} 
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), '']}
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

        <ChartCard
          title="Ventas por Dia"
          description="Esta semana"
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={mockSalesChartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
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
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--chart-1))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Bottom Section */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Sales */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Ventas Recientes</CardTitle>
            <Button variant="ghost" size="sm">Ver todas</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockSales.slice(0, 5).map((sale) => (
                <div key={sale.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{sale.saleNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      {sale.clientName || 'Cliente General'} - {sale.items.length} productos
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(sale.total)}</p>
                    <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                      <ArrowUpRight className="h-3 w-3 text-green-500" />
                      {sale.paymentMethod}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Productos con Bajo Stock
            </CardTitle>
            <Button variant="ghost" size="sm">Ver inventario</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {getLowStockProducts().slice(0, 5).map((availability) => {
                const stockPercent = (availability.currentStock / availability.minStock) * 100;
                return (
                  <div key={availability.productId} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{availability.name}</p>
                        <p className="text-sm text-muted-foreground">Identificador: {availability.productId}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-yellow-600">
                          {availability.currentStock} / {availability.minStock}
                        </p>
                        <p className="text-xs text-muted-foreground">unidades</p>
                      </div>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-500 rounded-full"
                        style={{ width: `${stockPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {getLowStockProducts().length === 0 && (
                <p className="text-center py-4 text-muted-foreground">
                  No hay productos con bajo stock
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
