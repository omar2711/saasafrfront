'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Coins, Loader2, Percent } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencyPicker } from '@/components/currency-picker';
import { systemSettingsApi } from '@/lib/api/system-settings';
import { formatMoney, setBaseCurrency } from '@/lib/format';
import { useOrganization } from '@/contexts/organization-context';

export default function SystemSettingsPage() {
  const { hasPermission, refreshSystemSettings } = useOrganization();
  const canWrite = hasPermission('settings.write');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ title: string; description: string } | null>(null);

  const [taxName, setTaxName] = useState('');
  const [taxRate, setTaxRate] = useState('');
  const [currency, setCurrency] = useState('');
  const [savedCurrency, setSavedCurrency] = useState('');

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(t);
  }, [notice]);

  useEffect(() => {
    let cancelled = false;
    systemSettingsApi
      .get()
      .then((s) => {
        if (cancelled) return;
        setTaxName(s.taxName);
        setTaxRate(String(s.taxRate));
        setCurrency(s.baseCurrency);
        setSavedCurrency(s.baseCurrency);
        setBaseCurrency(s.baseCurrency);
      })
      .catch(() => {
        if (!cancelled) setError('No se pudo cargar la configuraci\u00f3n');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rateNumber = Number(taxRate.replace(',', '.'));
  const rateValid = taxRate.trim() !== '' && Number.isFinite(rateNumber) && rateNumber >= 0 && rateNumber <= 100;
  const currencyValid = /^[A-Z]{3}$/.test(currency);
  const canSave = canWrite && taxName.trim().length > 0 && rateValid && currencyValid && !isSaving;

  const previewCurrency = currencyValid ? currency : 'BOB';
  const previewTax = rateValid ? (100 * rateNumber) / 100 : 0;

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const saved = await systemSettingsApi.update({
        taxName: taxName.trim(),
        taxRate: Math.round(rateNumber * 100) / 100,
        baseCurrency: currency,
      });
      setTaxName(saved.taxName);
      setTaxRate(String(saved.taxRate));
      setCurrency(saved.baseCurrency);
      setSavedCurrency(saved.baseCurrency);
      setBaseCurrency(saved.baseCurrency);
      await refreshSystemSettings();
      setNotice({
        title: '\u00a1Configuraci\u00f3n guardada!',
        description: `${saved.taxName} al ${saved.taxRate}% \u00b7 moneda ${saved.baseCurrency}.`,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la configuraci\u00f3n');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={'Configuraci\u00f3n del sistema'}
        description={'Impuesto y moneda con los que trabaja tu tienda.'}
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
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Percent className="h-4 w-4" />
                  Impuesto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Se usa en el punto de venta y en las cotizaciones. Puedes ponerle el nombre y el porcentaje que
                  corresponda a tu pa&iacute;s.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="tax-name">Nombre del impuesto</Label>
                    <Input
                      id="tax-name"
                      value={taxName}
                      maxLength={30}
                      placeholder="Ej: IVA"
                      disabled={!canWrite}
                      onChange={(e) => setTaxName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tax-rate">Porcentaje (%)</Label>
                    <Input
                      id="tax-rate"
                      type="text"
                      inputMode="decimal"
                      value={taxRate}
                      placeholder="Ej: 13"
                      disabled={!canWrite}
                      onChange={(e) => setTaxRate(e.target.value.replace(/[^\d.,]/g, ''))}
                    />
                    {taxRate.trim() !== '' && !rateValid && (
                      <p className="text-xs text-destructive">Ingresa un porcentaje entre 0 y 100.</p>
                    )}
                  </div>
                </div>
                <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Ejemplo: </span>
                  {formatMoney(100, previewCurrency)} + {taxName.trim() || 'Impuesto'} (
                  {rateValid ? rateNumber : 0}%) ={' '}
                  <span className="font-semibold">{formatMoney(100 + previewTax, previewCurrency)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Coins className="h-4 w-4" />
                  Moneda del sistema
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Es la moneda en la que se muestran y se cobran los precios. Si un producto est&aacute; en otra
                  moneda, se convierte con el tipo de cambio del d&iacute;a.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="base-currency">Moneda</Label>
                  <CurrencyPicker id="base-currency" value={currency} onChange={setCurrency} disabled={!canWrite} />
                </div>
                {currencyValid && currency !== savedCurrency && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    Cambiar la moneda no convierte los precios que ya est&aacute;n guardados: solo cambia el
                    s&iacute;mbolo con el que se muestran. Revisa tus precios despu&eacute;s de cambiarla.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {canWrite ? (
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={!canSave}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar cambios
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No tienes permiso para modificar esta configuraci&oacute;n.</p>
          )}
        </>
      )}
    </div>
  );
}