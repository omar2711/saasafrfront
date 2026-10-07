"use client";
import { useEffect, useId, useState } from "react";
import { adminGet, AdminRow } from "@/lib/api/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CountryCodeCombobox } from "@/components/country-code-combobox";
export const moduleNames: Record<string, string> = {
  module_inventory: "Inventario y productos",
  module_sales: "Ventas",
  module_reports: "Reportes",
  module_audit: "Auditoría",
  module_customers: "Clientes",
  module_transfers: "Traspasos",
  module_kits: "Kits",
  module_suppliers: "Proveedores",
  module_purchases: "Compras",
  module_quotes: "Cotizaciones",
  module_discounts: "Descuentos",
  module_petty_cash: "Caja chica",
};
export const labels: Record<string, string> = {
  active: "Activo",
  suspended: "Suspendido",
  disabled: "Deshabilitado",
  archived: "Archivado",
  super_admin: "Super admin",
  accountant: "Contable",
  paid: "Cobrado",
  pending: "Pendiente",
  voided: "Anulado",
  vigente: "Vigente",
  en_marcha: "En marcha",
  concluido: "Concluido",
  sin_plan: "Sin plan",
  monthly: "Mensual",
  yearly: "Anual",
  past_due: "Pago pendiente",
  canceled: "Cancelada",
  terms: "Términos y condiciones",
  privacy: "Política de privacidad",
};
export const money = (value: unknown, currency = "BOB") =>
  `${Number(value ?? 0).toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
export const date = (value: unknown) =>
  value ? String(value).slice(0, 10) : "—";
export function useResource<T = AdminRow[]>(
  path: string,
  filter: Record<string, string> = {},
) {
  const [data, setData] = useState<T | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0);
  const key = JSON.stringify(filter);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    adminGet<T>(path, JSON.parse(key))
      .then((r) => {
        if (alive) setData(r);
      })
      .catch((e) => {
        if (alive) {
          setData(null);
          setError(e.message);
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [path, key, revision]);
  return { data, loading, error, reload: () => setRevision((n) => n + 1) };
}
export function Notice({
  error,
  loading,
}: {
  error?: string;
  loading?: boolean;
}) {
  return (
    <>
      {error && (
        <p
          role="alert"
          className="rounded border border-red-300 bg-red-50 p-3 text-red-900"
        >
          {error}
        </p>
      )}
      {loading && <p role="status">Cargando datos…</p>}
    </>
  );
}
export function Filters({
  value,
  onChange,
  children,
  search = true,
}: {
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
  children?: React.ReactNode;
  search?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
      {search && (
        <label htmlFor={`${id}-search`} className="text-sm">
          Buscar
          <Input
            id={`${id}-search`}
            value={value.search ?? ""}
            onChange={(e) => onChange({ ...value, search: e.target.value })}
            placeholder="Empresa, NIT, correo…"
          />
        </label>
      )}
      <label htmlFor={`${id}-from`} className="text-sm">
        Desde
        <Input
          id={`${id}-from`}
          type="date"
          value={value.dateFrom ?? ""}
          max={value.dateTo || undefined}
          onChange={(e) => onChange({ ...value, dateFrom: e.target.value })}
        />
      </label>
      <label htmlFor={`${id}-to`} className="text-sm">
        Hasta
        <Input
          id={`${id}-to`}
          type="date"
          value={value.dateTo ?? ""}
          min={value.dateFrom || undefined}
          onChange={(e) => onChange({ ...value, dateTo: e.target.value })}
        />
      </label>
      {children}
      <Button variant="outline" onClick={() => onChange({})}>
        Limpiar filtros
      </Button>
    </div>
  );
}
export function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  const id = useId();
  return (
    <label htmlFor={id} className="grid gap-1 text-sm">
      {label}
      <select
        id={id}
        className="h-9 rounded-md border bg-background px-3"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
    </label>
  );
}
export type Column = {
  key: string;
  label: string;
  render?: (row: AdminRow) => React.ReactNode;
};
export function DataTable({
  rows,
  columns,
  actions,
  exportName,
}: {
  rows: AdminRow[];
  columns: Column[];
  actions?: (r: AdminRow) => React.ReactNode;
  exportName?: string;
}) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(rows.length / 25)),
    current = Math.min(page, pages - 1);
  function download() {
    const clean = (v: unknown) => {
      const s = String(v ?? "");
      return (
        '"' +
        (/^[=+@\-\t\r]/.test(s) ? "'" : "") +
        s.replaceAll('"', '""') +
        '"'
      );
    };
    const csv = [
      columns.map((c) => clean(c.label)).join(","),
      ...rows.map((r) =>
        columns
          .map((c) =>
            clean(
              typeof r[c.key] === "object"
                ? JSON.stringify(r[c.key])
                : r[c.key],
            ),
          )
          .join(","),
      ),
    ].join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {rows.length} registros
          {rows.length >= 10000
            ? " · Se alcanzó el máximo; acota el rango de fechas."
            : ""}
        </p>
        {exportName && (
          <Button variant="outline" disabled={!rows.length} onClick={download}>
            Exportar CSV
          </Button>
        )}
      </div>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className="whitespace-nowrap p-3 text-left font-medium"
                >
                  {c.label}
                </th>
              ))}
              {actions && <th className="p-3 text-left">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {rows.slice(current * 25, current * 25 + 25).map((r, i) => (
              <tr key={r.id ?? i} className="border-t">
                {columns.map((c) => (
                  <td key={c.key} className="max-w-sm p-3 break-words">
                    {c.render ? c.render(r) : String(r[c.key] ?? "—")}
                  </td>
                ))}
                {actions && <td className="p-3">{actions(r)}</td>}
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="p-8 text-center text-muted-foreground"
                >
                  No hay registros para estos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-end gap-3">
        <Button
          variant="outline"
          disabled={!current}
          onClick={() => setPage(current - 1)}
        >
          Anterior
        </Button>
        <span className="text-sm">
          {current + 1} / {pages}
        </span>
        <Button
          variant="outline"
          disabled={current + 1 >= pages}
          onClick={() => setPage(current + 1)}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}
export type Field = {
  key: string;
  label: string;
  type?:
    | "text"
    | "email"
    | "password"
    | "number"
    | "date"
    | "textarea"
    | "select"
    | "logo"
    | "phone";
  required?: boolean;
  options?: [string, string][];
  min?: number;
  step?: string;
  hint?: string;
};
export function Editor({
  title,
  initial,
  fields,
  onSave,
  onClose,
  children,
}: {
  title: string;
  initial: AdminRow;
  fields: Field[];
  onSave: (value: AdminRow) => Promise<unknown>;
  onClose: () => void;
  children?: (v: AdminRow, set: (v: AdminRow) => void) => React.ReactNode;
}) {
  const [value, setValue] = useState(initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const id = useId();
  const change = (key: string, v: unknown) =>
    setValue((p) => ({ ...p, [key]: v }));
  async function upload(file?: File) {
    if (!file) return;
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 500000
    ) {
      setError("El logo debe ser PNG, JPG o WebP de hasta 500 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => change("logo", reader.result);
    reader.readAsDataURL(file);
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await onSave(value);
              onClose();
            } catch (e) {
              setError(e instanceof Error ? e.message : "No se pudo guardar.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
            {fields.map((f) => (
              <div
                key={f.key}
                className={
                  f.type === "textarea"
                    ? "sm:col-span-2 space-y-1"
                    : "space-y-1"
                }
              >
                <label
                  htmlFor={`${id}-${f.key}`}
                  className="text-sm font-medium"
                >
                  {f.label}
                  {f.required ? " *" : ""}
                </label>
                {f.type === "select" ? (
                  <select
                    id={`${id}-${f.key}`}
                    required={f.required}
                    className="h-9 w-full rounded-md border bg-background px-3"
                    value={value[f.key] ?? ""}
                    onChange={(e) => change(f.key, e.target.value)}
                  >
                    {f.options?.map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea
                    id={`${id}-${f.key}`}
                    required={f.required}
                    className="min-h-32 w-full rounded-md border bg-background p-3"
                    value={value[f.key] ?? ""}
                    onChange={(e) => change(f.key, e.target.value)}
                  />
                ) : f.type === "logo" ? (
                  <div className="space-y-2">
                    <Input
                      id={`${id}-${f.key}`}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => void upload(e.target.files?.[0])}
                    />
                    {value.logo && (
                      <>
                        <img
                          src={value.logo}
                          alt="Logo de empresa"
                          className="h-16 w-24 object-contain"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => change("logo", "")}
                        >
                          Quitar logo
                        </Button>
                      </>
                    )}
                  </div>
                ) : f.type === "phone" ? (
                  <div className="flex gap-2">
                    <CountryCodeCombobox
                      value={value.phoneCode ?? "+591"}
                      onChange={(v) => change("phoneCode", v)}
                    />
                    <Input
                      id={`${id}-${f.key}`}
                      type="tel"
                      required={f.required}
                      value={value.phoneNumber ?? ""}
                      onChange={(e) =>
                        change("phoneNumber", e.target.value.replace(/\D/g, ""))
                      }
                    />
                  </div>
                ) : (
                  <Input
                    id={`${id}-${f.key}`}
                    type={f.type ?? "text"}
                    required={f.required}
                    min={f.min}
                    step={f.step}
                    autoComplete={
                      f.type === "password" ? "new-password" : undefined
                    }
                    value={value[f.key] ?? ""}
                    onChange={(e) => change(f.key, e.target.value)}
                  />
                )}{" "}
                {f.hint && (
                  <p className="text-xs text-muted-foreground">{f.hint}</p>
                )}
              </div>
            ))}
          </fieldset>
          {children?.(value, setValue)}
          <Notice error={error} />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
