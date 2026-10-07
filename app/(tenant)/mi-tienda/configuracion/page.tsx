'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Building2, Clock, Loader2, Save, ShieldCheck, Eye, DoorOpen, DoorClosed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/page-header';
import { organizationsApi, type WorkScheduleDto } from '@/lib/api/organizations';
import { rolesApi, type RoleDto } from '@/lib/api/users';
import { useOrganization } from '@/contexts/organization-context';
import {
  SCHEDULE_PRESETS,
  WEEKDAYS,
  crossesMidnight as scheduleCrossesMidnight,
  describeClosing,
  describeNextOpening,
  describeSchedule,
  getOrgNow,
  isWithinSchedule,
} from '@/lib/work-schedule';

/** Zonas de la región. Bolivia primero: es donde opera el producto. */
const TIMEZONES = [
  'America/La_Paz',
  'America/Argentina/Buenos_Aires',
  'America/Santiago',
  'America/Lima',
  'America/Bogota',
  'America/Asuncion',
  'America/Montevideo',
  'America/Sao_Paulo',
  'America/Mexico_City',
  'UTC',
];

interface OrgForm {
  name: string;
  taxId: string;
  timezone: string;
  address: string;
  phone: string;
  email: string;
  advanceSaleTerms: string;
}

const EMPTY_ORG: OrgForm = {
  name: '',
  taxId: '',
  timezone: 'America/La_Paz',
  address: '',
  phone: '',
  email: '',
  advanceSaleTerms: '',
};

function ConfiguracionContent() {
  const { organization, hasPermission, permissions } = useOrganization();
  const canWriteSettings = permissions.length === 0 || hasPermission('settings.write');
  const canWriteSchedule = permissions.length === 0 || hasPermission('settings.schedule');

  // La pestaña vive en la URL: el acceso directo del menú apunta a ?tab=horario,
  // que antes no hacía nada porque el Tabs era `defaultValue`.
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') === 'horario' ? 'horario' : 'general';
  const setTab = (value: string) =>
    router.replace(value === 'horario' ? '?tab=horario' : '?tab=general', { scroll: false });

  const [orgForm, setOrgForm] = useState<OrgForm>(EMPTY_ORG);
  const [schedule, setSchedule] = useState<WorkScheduleDto | null>(null);
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [rolesError, setRolesError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingOrg, setIsSavingOrg] = useState(false);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  // Fuerza el recálculo del estado en vivo mientras la pantalla está abierta.
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const loadData = useCallback(async () => {
    if (!organization) return;
    setIsLoading(true);
    setError('');
    setRolesError('');
    try {
      const [org, workSchedule, roleList] = await Promise.all([
        organizationsApi.get(organization.id),
        organizationsApi.getWorkSchedule(),
        // Un fallo aquí sólo deja la pantalla sin roles exentos; antes moría en
        // silencio y el usuario leía "No hay roles cargados" sin saber por qué.
        rolesApi.list().catch((e: unknown) => {
          setRolesError(e instanceof Error ? e.message : 'No se pudieron cargar los roles');
          return [] as RoleDto[];
        }),
      ]);
      setOrgForm({
        name: org.name,
        taxId: org.taxId ?? '',
        timezone: org.timezone,
        address: org.address ?? '',
        phone: org.phone ?? '',
        email: org.email ?? '',
        advanceSaleTerms: org.advanceSaleTerms ?? '',
      });
      setSchedule(workSchedule);
      setRoles(roleList);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar la configuración');
    } finally {
      setIsLoading(false);
    }
  }, [organization]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveOrg = async () => {
    if (!organization) return;
    setIsSavingOrg(true);
    setError('');
    setSuccess('');
    try {
      await organizationsApi.update(organization.id, {
        name: orgForm.name.trim(),
        taxId: orgForm.taxId.trim() || undefined,
        timezone: orgForm.timezone,
        address: orgForm.address.trim() || undefined,
        phone: orgForm.phone.trim() || undefined,
        email: orgForm.email.trim() || undefined,
        // Se manda siempre, incluso vacío: vaciar las condiciones es una acción
        // legítima y el backend distingue "ausente" de "vacío".
        advanceSaleTerms: orgForm.advanceSaleTerms,
      });
      setSuccess('Datos de la empresa guardados. Recarga para ver el cambio de zona horaria en todas las pantallas.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudieron guardar los datos');
    } finally {
      setIsSavingOrg(false);
    }
  };

  const handleSaveSchedule = async () => {
    if (!schedule) return;
    setIsSavingSchedule(true);
    setError('');
    setSuccess('');
    try {
      const saved = await organizationsApi.updateWorkSchedule({
        enabled: schedule.enabled,
        days: schedule.days,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        exemptRoleIds: schedule.exemptRoleIds,
        message: schedule.message ?? '',
      });
      setSchedule(saved);
      setSuccess('Horario laboral guardado.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el horario');
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const toggleDay = (day: number) => {
    setSchedule((prev) => {
      if (!prev) return prev;
      const days = prev.days.includes(day)
        ? prev.days.filter((d) => d !== day)
        : [...prev.days, day].sort((a, b) => a - b);
      // Al menos un día: la BD tiene el mismo CHECK y rechazaría el array vacío.
      return days.length === 0 ? prev : { ...prev, days };
    });
  };

  const toggleExemptRole = (roleId: string) => {
    setSchedule((prev) => {
      if (!prev) return prev;
      const exemptRoleIds = prev.exemptRoleIds.includes(roleId)
        ? prev.exemptRoleIds.filter((id) => id !== roleId)
        : [...prev.exemptRoleIds, roleId];
      return { ...prev, exemptRoleIds };
    });
  };

  const applyPreset = (preset: (typeof SCHEDULE_PRESETS)[number]) => {
    setSchedule((prev) =>
      prev
        ? { ...prev, days: preset.days, startTime: preset.startTime, endTime: preset.endTime }
        : prev,
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const crossesMidnight = schedule ? scheduleCrossesMidnight(schedule) : false;
  const orgNow = getOrgNow();
  const isOpenNow = schedule ? isWithinSchedule(schedule, orgNow) : true;
  const nextOpening = schedule ? describeNextOpening(schedule, orgNow) : null;

  // Quién entra igualmente: lo estructural (permiso de configuración) separado de
  // lo que se elige aquí. Antes esto sólo se contaba en prosa.
  const structurallyExemptRoles = roles.filter((role) => role.permissions.includes('settings.write'));
  const configuredExemptRoles = schedule
    ? roles.filter(
        (role) => schedule.exemptRoleIds.includes(role.id) && !role.permissions.includes('settings.write'),
      )
    : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Configuración"
        description="Datos de la empresa y horario de atención"
      />

      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{success}</div>
      )}

      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">Datos de la empresa</TabsTrigger>
          <TabsTrigger value="horario">Horario laboral</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Información de la empresa
              </CardTitle>
              <CardDescription>
                Estos datos se imprimen en los comprobantes de venta.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="org-name">Nombre *</Label>
                  <Input
                    id="org-name"
                    value={orgForm.name}
                    onChange={(e) => setOrgForm((p) => ({ ...p, name: e.target.value }))}
                    disabled={!canWriteSettings}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-taxid">NIT</Label>
                  <Input
                    id="org-taxid"
                    className="font-mono"
                    value={orgForm.taxId}
                    onChange={(e) =>
                      setOrgForm((p) => ({ ...p, taxId: e.target.value.toUpperCase() }))
                    }
                    disabled={!canWriteSettings}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="org-phone">Teléfono</Label>
                  <Input
                    id="org-phone"
                    value={orgForm.phone}
                    onChange={(e) => setOrgForm((p) => ({ ...p, phone: e.target.value }))}
                    disabled={!canWriteSettings}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-email">Correo</Label>
                  <Input
                    id="org-email"
                    type="email"
                    value={orgForm.email}
                    onChange={(e) => setOrgForm((p) => ({ ...p, email: e.target.value }))}
                    disabled={!canWriteSettings}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="org-address">Dirección</Label>
                <Input
                  id="org-address"
                  value={orgForm.address}
                  onChange={(e) => setOrgForm((p) => ({ ...p, address: e.target.value }))}
                  disabled={!canWriteSettings}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="org-timezone">Zona horaria</Label>
                <Select
                  value={orgForm.timezone}
                  onValueChange={(value) => setOrgForm((p) => ({ ...p, timezone: value }))}
                  disabled={!canWriteSettings}
                >
                  <SelectTrigger id="org-timezone" className="max-w-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Define cómo se leen todas las fechas del sistema y a qué hora empieza y termina el
                  horario laboral. No es la zona del navegador.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="org-terms">Condiciones de venta adelantada</Label>
                <Textarea
                  id="org-terms"
                  rows={4}
                  value={orgForm.advanceSaleTerms}
                  onChange={(e) => setOrgForm((p) => ({ ...p, advanceSaleTerms: e.target.value }))}
                  placeholder="Ej: El anticipo no es reembolsable. La entrega se realiza contra pago del saldo."
                  disabled={!canWriteSettings}
                />
                <p className="text-xs text-muted-foreground">
                  Se imprime en el comprobante cuando la venta tiene entrega pendiente.
                </p>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveOrg} disabled={!canWriteSettings || isSavingOrg}>
                  {isSavingOrg ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Guardar
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="horario" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Horario laboral
              </CardTitle>
              <CardDescription>
                Fuera de este horario nadie puede iniciar sesión ni seguir operando.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {schedule && (
                <>
                  {/* Estado en vivo: configurar el horario sin ver el efecto era
                      adivinar, sobre todo con el PC en otra zona horaria. */}
                  <div
                    className={
                      'flex flex-col gap-1 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between ' +
                      (!schedule.enabled
                        ? 'bg-muted/40'
                        : isOpenNow
                        ? 'border-green-200 bg-green-50'
                        : 'border-amber-200 bg-amber-50')
                    }
                  >
                    <div className="flex items-start gap-2.5">
                      {isOpenNow || !schedule.enabled ? (
                        <DoorOpen className="mt-0.5 h-5 w-5 text-green-700" />
                      ) : (
                        <DoorClosed className="mt-0.5 h-5 w-5 text-amber-700" />
                      )}
                      <div>
                        <p className="text-sm font-semibold">
                          {!schedule.enabled
                            ? 'Horario desactivado: se puede entrar a cualquier hora'
                            : isOpenNow
                            ? `Ahora mismo: abierto · cierra ${describeClosing(schedule)}`
                            : `Ahora mismo: cerrado${nextOpening ? ` · abre ${nextOpening}` : ''}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {describeSchedule(schedule)} · son las {orgNow.timeLabel} en{' '}
                          {orgForm.timezone}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsPreviewOpen(true)}
                    >
                      <Eye className="mr-2 h-3.5 w-3.5" />
                      Ver el aviso
                    </Button>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label>Aplicar el horario</Label>
                      <p className="text-sm text-muted-foreground">
                        {schedule.enabled
                          ? 'El acceso está restringido al horario configurado.'
                          : 'Desactivado: se puede entrar a cualquier hora.'}
                      </p>
                    </div>
                    <Switch
                      checked={schedule.enabled}
                      onCheckedChange={(checked) =>
                        setSchedule((p) => (p ? { ...p, enabled: checked } : p))
                      }
                      disabled={!canWriteSchedule}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Horarios habituales</Label>
                    <div className="flex flex-wrap gap-2">
                      {SCHEDULE_PRESETS.map((preset) => (
                        <Button
                          key={preset.label}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => applyPreset(preset)}
                          disabled={!canWriteSchedule}
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Días laborables</Label>
                    <div className="flex flex-wrap gap-2">
                      {WEEKDAYS.map((day) => {
                        const active = schedule.days.includes(day.value);
                        return (
                          <Button
                            key={day.value}
                            type="button"
                            variant={active ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => toggleDay(day.value)}
                            disabled={!canWriteSchedule}
                          >
                            {day.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 max-w-md">
                    <div className="space-y-2">
                      <Label htmlFor="start-time">Hora de inicio</Label>
                      <Input
                        id="start-time"
                        type="time"
                        value={schedule.startTime}
                        onChange={(e) =>
                          setSchedule((p) => (p ? { ...p, startTime: e.target.value } : p))
                        }
                        disabled={!canWriteSchedule}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end-time">Hora de fin</Label>
                      <Input
                        id="end-time"
                        type="time"
                        value={schedule.endTime}
                        onChange={(e) =>
                          setSchedule((p) => (p ? { ...p, endTime: e.target.value } : p))
                        }
                        disabled={!canWriteSchedule}
                      />
                    </div>
                  </div>

                  {crossesMidnight && (
                    <div className="rounded-md bg-muted px-3 py-2 text-xs">
                      <span className="font-medium">Turno nocturno:</span> abre a las{' '}
                      {schedule.startTime} y cierra a las {schedule.endTime} del día siguiente.
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    La hora se mide en <span className="font-medium">{orgForm.timezone}</span>, la
                    zona horaria de la empresa, no la del navegador.{' '}
                    <button
                      type="button"
                      className="underline underline-offset-2"
                      onClick={() => setTab('general')}
                    >
                      Cambiarla en Datos de la empresa
                    </button>
                    .
                  </p>

                  {/* Quién queda fuera del bloqueo, de verdad y no de palabra. */}
                  <div className="rounded-lg border p-4 space-y-2">
                    <Label className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" />
                      Siempre pueden entrar
                    </Label>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>
                        <span className="font-medium text-foreground">El super administrador</span>{' '}
                        de la plataforma.
                      </li>
                      <li>
                        <span className="font-medium text-foreground">
                          {structurallyExemptRoles.length > 0
                            ? structurallyExemptRoles.map((r) => r.name).join(', ')
                            : 'Quien administre la configuración'}
                        </span>{' '}
                        — porque administra la configuración. No es opcional: es lo que impide dejar
                        a la empresa fuera del sistema con el que se arreglaría el horario.
                      </li>
                      {configuredExemptRoles.length > 0 && (
                        <li>
                          <span className="font-medium text-foreground">
                            {configuredExemptRoles.map((r) => r.name).join(', ')}
                          </span>{' '}
                          — porque los marcaste como exentos abajo.
                        </li>
                      )}
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <Label>Roles exentos</Label>
                    <p className="text-xs text-muted-foreground">
                      Pueden operar a cualquier hora. Los roles con permiso de configuración ya están
                      exentos siempre, aparezcan o no aquí.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {rolesError ? (
                        <span className="text-sm text-destructive">{rolesError}</span>
                      ) : roles.length === 0 ? (
                        <span className="text-sm text-muted-foreground">No hay roles cargados.</span>
                      ) : (
                        roles.map((role) => {
                          const active = schedule.exemptRoleIds.includes(role.id);
                          return (
                            <Badge
                              key={role.id}
                              variant={active ? 'default' : 'outline'}
                              className={canWriteSchedule ? 'cursor-pointer' : ''}
                              onClick={() => canWriteSchedule && toggleExemptRole(role.id)}
                            >
                              {role.name}
                            </Badge>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="schedule-message">Aviso para quien queda fuera</Label>
                    <Textarea
                      id="schedule-message"
                      rows={2}
                      value={schedule.message ?? ''}
                      onChange={(e) =>
                        setSchedule((p) => (p ? { ...p, message: e.target.value } : p))
                      }
                      placeholder="Ej: La tienda atiende de 08:00 a 18:00, de lunes a viernes."
                      disabled={!canWriteSchedule}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={handleSaveSchedule}
                      disabled={!canWriteSchedule || isSavingSchedule}
                    >
                      {isSavingSchedule ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Guardar horario
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* El mismo aviso que ve el empleado al intentar entrar fuera de hora. */}
      <AlertDialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fuera del horario de trabajo</AlertDialogTitle>
            <AlertDialogDescription>
              {schedule?.message?.trim() ||
                (schedule
                  ? `El acceso está habilitado ${describeSchedule(schedule).toLowerCase()}.`
                  : '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Entendido</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function ConfiguracionPage() {
  // useSearchParams obliga a un límite de Suspense en el App Router.
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ConfiguracionContent />
    </Suspense>
  );
}
