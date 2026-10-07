'use client';

import { useState, useEffect } from 'react';
import { Check, Calendar, Loader2, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { plansApi, subscriptionsApi, type PlanDto, type SubscriptionDto } from '@/lib/api/billing';
import { formatDateLong } from '@/lib/format';

const FEATURE_NAMES: Record<string,string> = {module_inventory:'Inventario',module_sales:'Ventas',module_reports:'Reportes',module_audit:'Auditoria',module_customers:'Clientes',module_transfers:'Traspasos',module_kits:'Kits',module_suppliers:'Proveedores',module_purchases:'Compras',module_quotes:'Cotizaciones',module_discounts:'Descuentos',module_petty_cash:'Caja chica',max_users:'Usuarios',max_branches:'Sucursales',max_roles:'Roles',max_products:'Productos'};
const describeFeatures = (plan:PlanDto) => Object.entries(plan.features??{}).filter(([key,value])=>key.startsWith('max_')||value===null||value>0).map(([key,value])=>key.startsWith('max_') ? (FEATURE_NAMES[key]??key)+': '+(value??'Sin limite') : (FEATURE_NAMES[key]??key));

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  canceled: 'Cancelado',
  past_due: 'Vencido',
  trialing: 'Prueba',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'text-green-600 border-green-600',
  canceled: 'text-red-600 border-red-600',
  past_due: 'text-yellow-600 border-yellow-600',
  trialing: 'text-blue-600 border-blue-600',
};

const fmtDate = (iso: string) =>
  formatDateLong(iso);

const fmtCurrency = (n: number, currency = 'BOB') =>
  new Intl.NumberFormat('es-BO', { style: 'currency', currency, minimumFractionDigits: 0 }).format(n);

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<SubscriptionDto | null>(null);
  const [plans, setPlans] = useState<PlanDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const [sub, plansData] = await Promise.all([
          subscriptionsApi.getCurrent(),
          plansApi.list().catch(() => [] as PlanDto[]),
        ]);
        setSubscription(sub);
        setPlans(plansData);
      } catch {
        setError('No se pudo cargar la información de suscripción');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Suscripción" description="Administra tu plan y facturación" />
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Suscripción" description="Administra tu plan y facturación" />
        <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  const currentPlan = plans.find((p) => p.id === subscription?.planId);
  const features = currentPlan ? describeFeatures(currentPlan) : [];
  const statusLabel = subscription ? (STATUS_LABELS[subscription.status] ?? subscription.status) : '';
  const statusColor = subscription ? (STATUS_COLORS[subscription.status] ?? '') : '';

  return (
    <div className="space-y-6">
      <PageHeader title="Suscripción" description="Administra tu plan y facturación" />

      {/* Current Plan Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">
                  {currentPlan ? `Plan ${currentPlan.name}` : 'Plan activo'}
                </CardTitle>
                <CardDescription>Tu suscripción actual</CardDescription>
              </div>
              {subscription && (
                <Badge variant="outline" className={statusColor}>
                  {statusLabel}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {currentPlan && (
              <div className="flex items-end gap-1">
                <p className="text-3xl font-bold">{fmtCurrency(currentPlan.priceMonthly,currentPlan.currency)}</p>
                <p className="text-sm text-muted-foreground mb-1">/ mes</p>
              </div>
            )}

            <Separator />

            {subscription && (
              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">Inicio</p>
                    <p>{fmtDate(subscription.startDate)}</p>
                  </div>
                </div>
                {subscription.endDate && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4 shrink-0" />
                    <div>
                      <p className="font-medium text-foreground">Vencimiento</p>
                      <p>{fmtDate(subscription.endDate)}</p>
                    </div>
                  </div>
                )}
                <div className="text-muted-foreground">
                  <p className="font-medium text-foreground">Período</p>
                  <p>{subscription.renewalPeriod === 'monthly' ? 'Mensual' : 'Anual'}</p>
                </div>
              </div>
            )}

            {features.length > 0 && (
              <>
                <Separator />
                <ul className="grid gap-1.5 sm:grid-cols-2">
                  {features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {subscription && (
              <>
                <div>
                  <p className="text-muted-foreground">Estado</p>
                  <p className="font-medium">{statusLabel}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-muted-foreground">Plan</p>
                  <p className="font-medium">{currentPlan?.name ?? '—'}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-muted-foreground">Renovación</p>
                  <p className="font-medium">
                    {subscription.renewalPeriod === 'monthly' ? 'Mensual' : 'Anual'}
                  </p>
                </div>
                {currentPlan && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-muted-foreground">Precio mensual</p>
                      <p className="font-bold text-base">{fmtCurrency(currentPlan.priceMonthly,currentPlan.currency)}</p>
                    </div>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Available Plans */}
      {plans.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Planes Disponibles</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {plans.filter(plan=>plan.status==='active'||plan.id===subscription?.planId).map((plan) => {
              const isCurrent = plan.id === subscription?.planId;
              const planFeatures = describeFeatures(plan);
              return (
                <Card
                  key={plan.id}
                  className={cn('relative', isCurrent && 'border-primary shadow-md')}
                >
                  {isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary">Plan Actual</Badge>
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription>{plan.code}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <span className="text-3xl font-bold">{fmtCurrency(plan.priceMonthly,plan.currency)}</span>
                      <span className="text-muted-foreground">/mes</span>
                    </div>
                    {planFeatures.length > 0 && (
                      <ul className="space-y-2">
                        {planFeatures.map((f) => (
                          <li key={f} className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-green-500 shrink-0" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full" variant={isCurrent ? 'outline' : 'default'} disabled={isCurrent} onClick={()=>window.location.assign('/soporte')}>
                      {isCurrent ? 'Plan Actual' : 'Contactar para cambiar'}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
