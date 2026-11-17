export interface CurrencyInfo {
  code: string;
  name: string;
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: 'BOB', name: 'Boliviano' },
  { code: 'USD', name: 'D\u00f3lar estadounidense' },
  { code: 'BRL', name: 'Real brasile\u00f1o' },
  { code: 'EUR', name: 'Euro' },
  { code: 'ARS', name: 'Peso argentino' },
  { code: 'CLP', name: 'Peso chileno' },
  { code: 'PEN', name: 'Sol peruano' },
  { code: 'COP', name: 'Peso colombiano' },
  { code: 'MXN', name: 'Peso mexicano' },
  { code: 'PYG', name: 'Guaran\u00ed paraguayo' },
  { code: 'UYU', name: 'Peso uruguayo' },
  { code: 'GBP', name: 'Libra esterlina' },
  { code: 'CNY', name: 'Yuan chino' },
];

export function currencyLabel(code: string): string {
  const found = CURRENCIES.find((c) => c.code === code);
  return found ? `${found.name} (${found.code})` : code;
}