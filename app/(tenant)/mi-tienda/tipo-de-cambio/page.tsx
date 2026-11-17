'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, Plus } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CurrencyPicker } from '@/components/currency-picker';
import { systemSettingsApi, type ExchangeRateDto } from '@/lib/api/system-settings';
import { formatNumber, setBaseCurrency, toDateInputValue } from '@/lib/format';
import { useOrganization } from '@/contexts/organization-context';

/** "2026-11-15" -> "15/11/2026" sin pasar por Date (evita el corrimiento de zona horaria). */
const fmtDay = (iso: string) => iso.split('-').reverse().join('/');

export default function ExchangeRatesPage() {
  const { hasPermission } = useOrganization();
  const canWrite = hasPermission('settings.write');

  const [base, setBase] = useState('BOB');
  const [rates, setRates] = useState<ExchangeRateDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ title: string; description: string } | null>(null);

  const [currencyCode, setCurrencyCode] = useState('');
  const [rateText, setRateText] = useState('');
  const [date, setDate] = useState(() => toDateInputValue());

  const today = toDateInputValue();

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(t);
  }, [notice]);

  const load = useCallback(async () => {
    try {
      const [settings, list] = await Promise.all([systemSettingsApi.get(), systemSettingsApi.listRates()]);
      setBase(settings.baseCurrency);
      setBaseCurrency(settings.baseCurrency);
      setRates(list);
    } catch {
      setError('No se pudieron cargar los tipos de cambio');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // El backend los devuelve del mas reciente al mas antiguo: el primero de cada moneda es el vigente.
  const current = useMemo(() => {
    const seen = new Set<string>();
    const out: ExchangeRateDto[] = [];
    for (const r of rates) {
      if (r.baseCurrency !== base || seen.has(r.currencyCode)) continue;
      seen.add(r.currencyCode);
      out.push(r);
    }
    return out;
  }, [rates, base]);

  const rateNumber = Number(rateText.replace(',', '.'));
  const rateValid = rateText.trim() !== '' && Number.isFinite(rateNumber) && rateNumber > 0;
  const codeValid = /^[A-Z]{3}$/.test(currencyCode) && currencyCode !== base;
  const dateValid = /^\d{4}-\d{2}-\d{2}$/.test(date);
  const canSave = canWrite && rateValid && codeValid && dateValid && !isSaving;

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const saved = await systemSettingsApi.setRate({
        currencyCode,
        rate: Number(rateNumber.toFixed(6)),
        effectiveDate: date,
      });
      await load();
      setRateText('');
      setNotice({
        title: '\u00a1Tipo de cambio guardado!',
        description: `1 ${saved.currencyCode} = ${formatNumber(saved.rate, 4)} ${saved.baseCurrency}`,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el tipo de cambio');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={'Tipo de cambio'}
        description={'Cu\u00e1nto vale 1 unidad de una moneda extranjera en la moneda del sistema.'}
      />

      {error && <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

      {notice && (
        <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-black/20 p-4 backdrop-blur-[2px] animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl border bg-card p-8 text-center text-card-foreground shadow-2xl animate-in zoom-in-90 duration-300">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 ring-8 ring-emerald-50">
              <CheckCircle2 className="h-9 w-9 text-emerald-600" />
            </div>
            <h3 className="text-xl font-semibold">{notice.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{notice.description}</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div>
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">Tipos de cambio vigentes</h2>
            {current.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Todav&iacute;a no hay tipos de cambio registrados. Carga el primero abajo.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {current.map((r) => (
                  <Card key={r.id}>
                    <CardContent className="pt-6">
                      <div className="text-sm text-muted-foreground">1 {r.currencyCode} =</div>
                      <div className="text-2xl font-bold">
                        {formatNumber(r.rate, 4)} {r.baseCurrency}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">Desde el {fmtDay(r.effectiveDate)}</p>
                      {r.effectiveDate !== today && (
                        <p className="mt-1 text-xs text-amber-600">Sin actualizar hoy</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {canWrite && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Cargar tipo de cambio</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="fx-currency">Moneda extranjera</Label>
                    <CurrencyPicker
                      id="fx-currency"
                      value={currencyCode}
                      onChange={setCurrencyCode}
                      exclude={base}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fx-rate">
                      {currencyCode ? `1 ${currencyCode} = ` : 'Tipo de cambio '}
                      (en {base})
                    </Label>
                    <Input
                      id="fx-rate"
                      type="text"
                      inputMode="decimal"
                      value={rateText}
                      placeholder="Ej: 6.96"
                      onChange={(e) => setRateText(e.target.value.replace(/[^\d.,]/g, ''))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fx-date">Fecha</Label>
                    <Input id="fx-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={!canSave}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    Guardar tipo de cambio
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Historial</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Moneda</TableHead>
                    <TableHead>Tipo de cambio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                        Sin registros.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rates.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="whitespace-nowrap">
                          {fmtDay(r.effectiveDate)}
                          {r.effectiveDate === today && (
                            <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                              Hoy
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono">{r.currencyCode}</TableCell>
                        <TableCell>
                          1 {r.currencyCode} = {formatNumber(r.rate, 4)} {r.baseCurrency}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}