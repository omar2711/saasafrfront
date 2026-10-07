"use client";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminSave, AdminRow } from "@/lib/api/admin";
import { useAdminSession } from "@/components/admin-session";
import {
  Column,
  DataTable,
  date,
  Editor,
  Field,
  Filters,
  labels,
  moduleNames,
  money,
  Notice,
  SelectField,
  useResource,
} from "./ui";
import { COUNTRY_CODES } from "@/lib/data/country-codes";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const opts = (keys: string[]): [string, string][] =>
  keys.map((k) => [k, labels[k] ?? k]);
const statusColumn: Column = {
  key: "status",
  label: "Estado",
  render: (r) => labels[r.status] ?? r.status,
};
const companyColumns: Column[] = [
  { key: "name", label: "Empresa" },
  { key: "tax_id", label: "NIT" },
  { key: "phone", label: "Teléfono" },
  { key: "email", label: "Correo" },
  { key: "address", label: "Dirección fiscal" },
  { key: "user_count", label: "Usuarios" },
  { key: "plan_name", label: "Plan" },
  {
    key: "subscription_state",
    label: "Suscripción",
    render: (r) => labels[r.subscription_state],
  },
  statusColumn,
];
const planFields: Field[] = [
  { key: "code", label: "Código", required: true },
  { key: "name", label: "Nombre", required: true },
  {
    key: "priceMonthly",
    label: "Precio mensual",
    type: "number",
    min: 0,
    step: ".01",
    required: true,
  },
  {
    key: "priceYearly",
    label: "Precio anual",
    type: "number",
    min: 0,
    step: ".01",
    required: true,
  },
  {
    key: "currency",
    label: "Moneda",
    type: "select",
    options: [
      ["BOB", "BOB"],
      ["USD", "USD"],
    ],
  },
  {
    key: "status",
    label: "Estado",
    type: "select",
    options: opts(["active", "archived"]),
  },
  ...(["maxRoles", "maxProducts", "maxUsers", "maxBranches"] as const).map(
    (key, i) => ({
      key,
      label: [
        "Cantidad de roles",
        "Cantidad de productos",
        "Cantidad de usuarios",
        "Cantidad de sucursales",
      ][i],
      type: "number" as const,
      min: key === "maxProducts" ? 0 : 1,
      hint: "Vacío: sin límite.",
    }),
  ),
];
export function PlansPage() {
  const r = useResource("plans");
  const [edit, setEdit] = useState<AdminRow | null>(null);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Planes de suscripción"
        description="Precios, módulos y capacidad por empresa"
      >
        <Button
          onClick={() =>
            setEdit({
              code: "",
              name: "",
              priceMonthly: 0,
              priceYearly: 0,
              currency: "BOB",
              status: "active",
              maxRoles: 5,
              maxProducts: 100,
              maxUsers: 5,
              maxBranches: 1,
              modules: Object.keys(moduleNames),
            })
          }
        >
          Nuevo plan
        </Button>
      </PageHeader>
      <Notice {...r} />
      <DataTable
        rows={r.data ?? []}
        columns={[
          { key: "name", label: "Plan" },
          { key: "code", label: "Código" },
          {
            key: "price_monthly",
            label: "Mensual",
            render: (p) => money(p.price_monthly, p.currency),
          },
          {
            key: "price_yearly",
            label: "Anual",
            render: (p) => money(p.price_yearly, p.currency),
          },
          {
            key: "features",
            label: "Capacidad",
            render: (p) =>
              `${p.features.max_roles ?? "∞"} roles · ${p.features.max_products ?? "∞"} productos`,
          },
          statusColumn,
        ]}
        actions={(p) => (
          <Button
            variant="outline"
            onClick={() =>
              setEdit({
                ...p,
                priceMonthly: p.price_monthly,
                priceYearly: p.price_yearly,
                maxRoles: p.features.max_roles,
                maxProducts: p.features.max_products,
                maxUsers: p.features.max_users,
                maxBranches: p.features.max_branches,
                modules: Object.keys(moduleNames).filter(
                  (k) => k in p.features && p.features[k] !== 0,
                ),
              })
            }
          >
            Editar
          </Button>
        )}
      />
      {edit && (
        <Editor
          title={edit.id ? "Editar plan" : "Nuevo plan"}
          initial={edit}
          fields={planFields}
          onClose={() => setEdit(null)}
          onSave={async (v) => {
            await adminSave(
              "plans",
              {
                code: v.code,
                name: v.name,
                priceMonthly: Number(v.priceMonthly),
                priceYearly: Number(v.priceYearly),
                currency: v.currency,
                status: v.status,
                modules: v.modules,
                ...Object.fromEntries(
                  ["maxRoles", "maxProducts", "maxUsers", "maxBranches"].map(
                    (k) => [
                      k,
                      v[k] === "" || v[k] == null ? null : Number(v[k]),
                    ],
                  ),
                ),
              },
              v.id,
            );
            r.reload();
          }}
        >
          {(v, set) => (
            <fieldset className="grid gap-3 sm:grid-cols-2">
              <legend className="mb-3 font-medium">Módulos habilitados</legend>
              {Object.entries(moduleNames).map(([k, name]) => (
                <label key={k} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={v.modules.includes(k)}
                    onChange={(e) =>
                      set({
                        ...v,
                        modules: e.target.checked
                          ? [...v.modules, k]
                          : v.modules.filter((m: string) => m !== k),
                      })
                    }
                  />
                  {name}
                </label>
              ))}
            </fieldset>
          )}
        </Editor>
      )}
    </div>
  );
}

export function OrganizationsPage({ report = false }: { report?: boolean }) {
  const [filter, setFilter] = useState<Record<string, string>>({});
  const r = useResource("organizations", { ...filter, limit: "10000" }),
    plans = useResource("plans");
  const [edit, setEdit] = useState<AdminRow | null>(null);
  const planOptions: [string, string][] = [
    ["", "Seleccionar plan"],
    ...(plans.data ?? [])
      .filter((p) => p.status === "active")
      .map((p) => [p.id, p.name] as [string, string]),
  ];
  const fields: Field[] = [
    { key: "name", label: "Nombre de empresa", required: true },
    { key: "taxId", label: "NIT", required: true },
    { key: "responsibleName", label: "Responsable", required: true },
    {
      key: "legalRepresentative",
      label: "Representante legal",
      required: true,
    },
    {
      key: "phone",
      label: "Teléfono con código de país",
      type: "phone",
      required: true,
    },
    {
      key: "email",
      label: "Correo de la empresa",
      type: "email",
      required: true,
    },
    { key: "website", label: "Sitio web (https://...)" },
    { key: "address", label: "Dirección fiscal", required: true },
    { key: "logo", label: "Logo (hasta 500 KB)", type: "logo" },
    {
      key: "status",
      label: "Estado de la empresa",
      type: "select",
      options: opts(["active", "suspended"]),
    },
    {
      key: "planId",
      label: "Plan suscrito",
      type: "select",
      required: true,
      options: planOptions,
    },
    {
      key: "renewalPeriod",
      label: "Periodicidad",
      type: "select",
      options: opts(["monthly", "yearly"]),
    },
    {
      key: "startDate",
      label: "Inicio de suscripción",
      type: "date",
      required: true,
    },
    { key: "endDate", label: "Fin de suscripción", type: "date" },
    {
      key: "subscriptionStatus",
      label: "Estado de suscripción",
      type: "select",
      options: opts(["active", "past_due", "canceled"]),
    },
    ...(!edit?.id
      ? [
          {
            key: "ownerEmail",
            label: "Correo de acceso del responsable",
            type: "email" as const,
            required: true,
          },
          {
            key: "ownerPassword",
            label: "Contraseña inicial (mínimo 10 caracteres)",
            type: "password" as const,
            required: true,
          },
        ]
      : []),
  ];
  function open(row?: AdminRow) {
    if (!row) {
      setEdit({
        status: "active",
        subscriptionStatus: "active",
        renewalPeriod: "monthly",
        phoneCode: "+591",
        phoneNumber: "",
        startDate: new Date().toLocaleDateString("en-CA", {
          timeZone: "America/La_Paz",
        }),
      });
      return;
    }
    const code =
      [...COUNTRY_CODES]
        .sort((a, b) => b.dialCode.length - a.dialCode.length)
        .find((c) => row.phone?.startsWith(c.dialCode))?.dialCode ?? "+591";
    setEdit({
      ...row,
      taxId: row.tax_id,
      responsibleName: row.responsible_name,
      legalRepresentative: row.legal_representative,
      phoneCode: code,
      phoneNumber: row.phone?.slice(code.length).replace(/\D/g, ""),
      planId: row.plan_id,
      renewalPeriod: row.renewal_period ?? "monthly",
      subscriptionStatus: row.subscription_status ?? "active",
      startDate: date(row.start_date) === "—" ? "" : date(row.start_date),
      endDate: date(row.end_date) === "—" ? "" : date(row.end_date),
    });
  }
  return (
    <div className="space-y-6">
      <PageHeader
        title={report ? "Reporte de empresas y usuarios" : "Organizaciones"}
        description={
          report
            ? "Usuarios registrados por empresa. Un usuario puede pertenecer a más de una empresa."
            : "Alta y administración de empresas conectadas a la plataforma"
        }
      >
        {!report && <Button onClick={() => open()}>Nueva organización</Button>}
      </PageHeader>
      <Filters value={filter} onChange={setFilter}>
        <SelectField
          label="Plan"
          value={filter.planId ?? ""}
          onChange={(planId) => setFilter({ ...filter, planId })}
          options={[
            ["", "Todos los planes"],
            ...(plans.data ?? []).map(
              (p) => [p.id, p.name] as [string, string],
            ),
          ]}
        />
        <SelectField
          label="Suscripción"
          value={filter.subscriptionState ?? ""}
          onChange={(subscriptionState) =>
            setFilter({ ...filter, subscriptionState })
          }
          options={[
            ["", "Todos los estados"],
            ...opts(["vigente", "en_marcha", "concluido", "sin_plan"]),
          ]}
        />
      </Filters>
      <p className="text-sm text-muted-foreground">
        Fechas aplicadas al alta de la empresa. En marcha: pendiente de pago o
        con inicio futuro. Concluido: cancelada o vencida.
      </p>
      <Notice error={r.error || plans.error} loading={r.loading} />
      {report && (
        <p>
          {r.data?.length ?? 0} empresas ·{" "}
          {(r.data ?? []).reduce((n, o) => n + Number(o.user_count), 0)}{" "}
          membresías de usuarios en las empresas del reporte.
        </p>
      )}
      <DataTable
        rows={r.data ?? []}
        columns={companyColumns}
        exportName="empresas-usuarios"
        actions={
          report
            ? undefined
            : (o) => (
                <Button variant="outline" onClick={() => open(o)}>
                  Editar
                </Button>
              )
        }
      />
      {edit && (
        <Editor
          title={edit.id ? "Editar organización" : "Crear organización"}
          initial={edit}
          fields={fields}
          onClose={() => setEdit(null)}
          onSave={async (v) => {
            const body = Object.fromEntries(
              [
                "name",
                "taxId",
                "responsibleName",
                "legalRepresentative",
                "email",
                "website",
                "address",
                "logo",
                "status",
                "planId",
                "renewalPeriod",
                "subscriptionStatus",
                "ownerEmail",
                "ownerPassword",
              ]
                .filter((k) => v[k] !== undefined)
                .map((k) => [k, v[k]]),
            );
            await adminSave(
              "organizations",
              {
                ...body,
                phone: `${v.phoneCode}${v.phoneNumber}`,
                startDate: v.startDate || undefined,
                endDate: v.endDate || undefined,
              },
              v.id,
            );
            r.reload();
          }}
        />
      )}
    </div>
  );
}

export function UsersPage() {
  const r = useResource("users");
  const session = useAdminSession();
  const [edit, setEdit] = useState<AdminRow | null>(null);
  const fields: Field[] = [
    { key: "fullName", label: "Nombre completo", required: true },
    { key: "email", label: "Correo", type: "email", required: true },
    {
      key: "password",
      label: edit?.id ? "Nueva contraseña (opcional)" : "Contraseña inicial",
      type: "password",
      required: !edit?.id,
      hint: "Mínimo 10 caracteres. Cambiar una cuenta cierra sus sesiones.",
    },
    {
      key: "platformRole",
      label: "Rol AFR",
      type: "select",
      options: opts(["super_admin", "accountant"]),
    },
    {
      key: "status",
      label: "Estado",
      type: "select",
      options: opts(["active", "disabled"]),
    },
  ];
  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuarios AFR"
        description="El contable solo consulta tablas del movimiento económico"
      >
        <Button
          onClick={() =>
            setEdit({ platformRole: "accountant", status: "active" })
          }
        >
          Crear usuario AFR
        </Button>
      </PageHeader>
      <Notice {...r} />
      <DataTable
        rows={r.data ?? []}
        columns={[
          { key: "full_name", label: "Nombre" },
          { key: "email", label: "Correo" },
          {
            key: "platform_role",
            label: "Rol",
            render: (u) => labels[u.platform_role],
          },
          statusColumn,
        ]}
        actions={(u) => (
          <Button
            variant="outline"
            onClick={() =>
              setEdit({
                ...u,
                fullName: u.full_name,
                platformRole: u.platform_role,
              })
            }
          >
            Editar{session?.sub === u.id ? " mi cuenta" : ""}
          </Button>
        )}
      />
      {edit && (
        <Editor
          title={edit.id ? "Editar usuario AFR" : "Crear usuario AFR"}
          initial={edit}
          fields={fields}
          onClose={() => setEdit(null)}
          onSave={async (v) => {
            await adminSave(
              "users",
              {
                fullName: v.fullName,
                email: v.email,
                password: v.password || undefined,
                platformRole: v.platformRole,
                status: v.status,
              },
              v.id,
            );
            if (v.id === session?.sub) {
              window.location.assign("/login");
              return;
            }
            r.reload();
          }}
        />
      )}
    </div>
  );
}

export function FinancePage() {
  const session = useAdminSession();
  const [filter, setFilter] = useState<Record<string, string>>({});
  const r = useResource<{
    rows: AdminRow[];
    totals: AdminRow[];
    organizations: AdminRow[];
    plans: AdminRow[];
  }>("finance", { ...filter, limit: "10000" });
  const [edit, setEdit] = useState<AdminRow | null>(null),
    [status, setStatus] = useState<AdminRow | null>(null);
  const cols: Column[] = [
    { key: "company_name", label: "Empresa" },
    { key: "tax_id", label: "NIT" },
    { key: "plan_name", label: "Plan al registrar cobro" },
    {
      key: "amount",
      label: "Importe",
      render: (p) => money(p.amount, p.currency),
    },
    { key: "currency", label: "Moneda" },
    { key: "paid_on", label: "Fecha", render: (p) => date(p.paid_on) },
    statusColumn,
    {
      key: "subscription_state",
      label: "Suscripción actual",
      render: (p) => labels[p.subscription_state],
    },
    { key: "reference", label: "Referencia" },
    { key: "notes", label: "Notas" },
  ];
  return (
    <div className="space-y-6">
      <PageHeader
        title="Movimiento económico"
        description="Cobros de suscripciones de AFR; los importes anulados y pendientes no suman a lo recaudado"
      >
        {session?.isSuperAdmin && (
          <Button
            onClick={() =>
              setEdit({
                status: "paid",
                currency: "BOB",
                paidOn: new Date().toLocaleDateString("en-CA", {
                  timeZone: "America/La_Paz",
                }),
              })
            }
          >
            Registrar cobro
          </Button>
        )}
      </PageHeader>
      <Filters value={filter} onChange={setFilter}>
        <SelectField
          label="Empresa"
          value={filter.orgId ?? ""}
          onChange={(orgId) => setFilter({ ...filter, orgId })}
          options={[
            ["", "Todas"],
            ...(r.data?.organizations ?? []).map(
              (o) => [o.id, o.name] as [string, string],
            ),
          ]}
        />
        <SelectField
          label="Plan"
          value={filter.planId ?? ""}
          onChange={(planId) => setFilter({ ...filter, planId })}
          options={[
            ["", "Todos"],
            ...(r.data?.plans ?? []).map(
              (p) => [p.id, p.name] as [string, string],
            ),
          ]}
        />
        <SelectField
          label="Estado del cobro"
          value={filter.status ?? ""}
          onChange={(status) => setFilter({ ...filter, status })}
          options={[["", "Todos"], ...opts(["paid", "pending", "voided"])]}
        />
        <SelectField
          label="Suscripción"
          value={filter.subscriptionState ?? ""}
          onChange={(subscriptionState) =>
            setFilter({ ...filter, subscriptionState })
          }
          options={[
            ["", "Todas"],
            ...opts(["vigente", "en_marcha", "concluido", "sin_plan"]),
          ]}
        />
      </Filters>
      <Notice {...r} />
      <DataTable
        rows={r.data?.totals ?? []}
        columns={[
          { key: "currency", label: "Moneda" },
          {
            key: "collected",
            label: "Recaudado",
            render: (t) => money(t.collected, t.currency),
          },
          {
            key: "pending",
            label: "Pendiente",
            render: (t) => money(t.pending, t.currency),
          },
          { key: "records", label: "Registros" },
        ]}
      />
      <DataTable
        rows={r.data?.rows ?? []}
        columns={cols}
        exportName="movimiento-economico"
        actions={
          session?.isSuperAdmin
            ? (p) =>
                p.status !== "voided" && (
                  <div className="flex gap-2">
                    {p.status === "pending" && (
                      <Button
                        variant="outline"
                        onClick={() =>
                          setStatus({ ...p, status: "paid", reason: "" })
                        }
                      >
                        Confirmar pago
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() =>
                        setStatus({ ...p, status: "voided", reason: "" })
                      }
                    >
                      Anular
                    </Button>
                  </div>
                )
            : undefined
        }
      />
      {edit && (
        <PaymentEditor
          initial={edit}
          onClose={() => setEdit(null)}
          onSaved={r.reload}
        />
      )}{" "}
      {status && (
        <Editor
          title={status.status === "paid" ? "Confirmar pago" : "Anular cobro"}
          initial={status}
          fields={[
            {
              key: "reason",
              label: "Motivo del cambio",
              type: "textarea",
              required: true,
            },
          ]}
          onClose={() => setStatus(null)}
          onSave={async (v) => {
            await adminSave(
              "finance",
              { status: v.status, reason: v.reason },
              v.id,
            );
            r.reload();
          }}
        />
      )}
    </div>
  );
}
function PaymentEditor({
  initial,
  onClose,
  onSaved,
}: {
  initial: AdminRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const orgs = useResource("organizations", { limit: "10000" }),
    plans = useResource("plans");
  const fields: Field[] = [
    {
      key: "orgId",
      label: "Empresa",
      type: "select",
      required: true,
      options: [
        ["", "Seleccionar"],
        ...(orgs.data ?? []).map((o) => [o.id, o.name] as [string, string]),
      ],
    },
    {
      key: "planId",
      label: "Plan",
      type: "select",
      required: true,
      options: [
        ["", "Seleccionar"],
        ...(plans.data ?? []).map(
          (p) => [p.id, `${p.name} (${p.currency})`] as [string, string],
        ),
      ],
    },
    {
      key: "amount",
      label: "Importe cobrado o pendiente",
      type: "number",
      min: 0.01,
      step: ".01",
      required: true,
    },
    {
      key: "currency",
      label: "Moneda",
      type: "select",
      options: [
        ["BOB", "BOB"],
        ["USD", "USD"],
      ],
    },
    { key: "paidOn", label: "Fecha", type: "date", required: true },
    {
      key: "reference",
      label: "Referencia única de comprobante",
      required: true,
    },
    {
      key: "status",
      label: "Estado",
      type: "select",
      options: opts(["paid", "pending"]),
    },
    { key: "notes", label: "Notas", type: "textarea" },
  ];
  return (
    <>
      <Notice error={orgs.error || plans.error} />
      <Editor
        title="Registrar cobro de suscripción"
        initial={initial}
        fields={fields}
        onClose={onClose}
        onSave={async (v) => {
          await adminSave("finance", {
            orgId: v.orgId,
            planId: v.planId,
            amount: Number(v.amount),
            currency: v.currency,
            paidOn: v.paidOn,
            status: v.status,
            reference: v.reference,
            notes: v.notes,
          });
          onSaved();
        }}
      />
    </>
  );
}

export function DashboardPage() {
  const [filter, setFilter] = useState<Record<string, string>>({});
  const r = useResource<AdminRow>("dashboard", filter);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard administrativo"
        description="AFR · Datos reales de organizaciones, usuarios y cobros"
      />
      <Filters search={false} value={filter} onChange={setFilter} />
      <Notice {...r} />
      {r.data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Metric
              title="Empresas creadas en el período"
              value={r.data.stats.organizations}
            />
            <Metric
              title="Usuarios de plataforma creados en el período"
              value={r.data.stats.users}
            />
          </div>
          <DataTable
            rows={r.data.revenue}
            columns={[
              { key: "currency", label: "Moneda" },
              {
                key: "collected",
                label: "Recaudado en el período",
                render: (r) => money(r.collected, r.currency),
              },
            ]}
          />
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Altas de empresas por mes</CardTitle>
              </CardHeader>
              <CardContent>
                {r.data.growth.length ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={r.data.growth}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar
                        dataKey="organizations"
                        name="Empresas"
                        fill="var(--primary)"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p>No hay altas en este período.</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Suscripciones iniciadas por plan</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable
                  rows={r.data.distribution}
                  columns={[
                    { key: "name", label: "Plan" },
                    { key: "organizations", label: "Empresas" },
                  ]}
                />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
function Metric({ title, value }: { title: string; value: unknown }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-3xl font-semibold">
        {String(value ?? 0)}
      </CardContent>
    </Card>
  );
}

export function AuditPage() {
  const [filter, setFilter] = useState<Record<string, string>>({});
  const r = useResource("audit", { ...filter, limit: "10000" });
  const [detail, setDetail] = useState<AdminRow | null>(null);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Auditoría global"
        description="Historial de acciones administrativas y de las empresas"
      />
      <Filters value={filter} onChange={setFilter} />
      <Notice {...r} />
      <DataTable
        rows={r.data ?? []}
        columns={[
          {
            key: "created_at",
            label: "Fecha",
            render: (a) =>
              new Date(a.created_at).toLocaleString("es-BO", {
                timeZone: "America/La_Paz",
              }),
          },
          { key: "full_name", label: "Usuario" },
          { key: "email", label: "Correo" },
          { key: "company_name", label: "Empresa" },
          { key: "action", label: "Acción" },
          { key: "entity_type", label: "Entidad" },
        ]}
        exportName="auditoria"
        actions={(a) => (
          <Button variant="outline" onClick={() => setDetail(a)}>
            Ver cambios
          </Button>
        )}
      />
      {detail && (
        <Card>
          <CardHeader>
            <CardTitle>{detail.action}</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap text-xs">
              {JSON.stringify(detail.metadata, null, 2)}
            </pre>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setDetail(null)}
            >
              Cerrar detalle
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function LegalSettingsPage() {
  const r = useResource("legal");
  const [edit, setEdit] = useState<AdminRow | null>(null);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Políticas y términos"
        description="Publica únicamente textos revisados por Fernando. Cada versión conserva su contenido y las aceptaciones."
      >
        <Button
          onClick={() =>
            setEdit({ kind: "terms", publish: false, content: "", version: "" })
          }
        >
          Nueva versión
        </Button>
      </PageHeader>
      <Notice {...r} />
      <DataTable
        rows={r.data ?? []}
        columns={[
          { key: "kind", label: "Documento", render: (d) => labels[d.kind] },
          { key: "version", label: "Versión" },
          {
            key: "published_at",
            label: "Publicación",
            render: (d) => (d.published_at ? date(d.published_at) : "Borrador"),
          },
        ]}
        actions={(d) => (
          <Button
            variant="outline"
            onClick={() =>
              setEdit({
                kind: d.kind,
                version: "",
                content: d.content,
                publish: false,
              })
            }
          >
            Crear versión desde este texto
          </Button>
        )}
      />
      {edit && (
        <Editor
          title="Nueva versión legal"
          initial={edit}
          fields={[
            {
              key: "kind",
              label: "Documento",
              type: "select",
              options: opts(["terms", "privacy"]),
            },
            { key: "version", label: "Versión única", required: true },
            {
              key: "content",
              label: "Texto revisado",
              type: "textarea",
              required: true,
            },
          ]}
          onClose={() => setEdit(null)}
          onSave={async (v) => {
            await adminSave("legal", {
              kind: v.kind,
              version: v.version,
              content: v.content,
              publish: v.publish,
            });
            r.reload();
          }}
        >
          {(v, set) => (
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={v.publish}
                onChange={(e) => set({ ...v, publish: e.target.checked })}
              />
              Publicar esta versión: confirmo que el contenido fue revisado.
            </label>
          )}
        </Editor>
      )}
    </div>
  );
}
