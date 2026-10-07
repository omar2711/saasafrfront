export interface CountryCode {
  name: string;
  iso2: string;
  dialCode: string;
  flag: string;
}

function isoToFlagEmoji(iso2: string): string {
  return iso2
    .toUpperCase()
    .split('')
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join('');
}

const RAW_COUNTRIES: Omit<CountryCode, 'flag'>[] = [
  { name: 'Bolivia', iso2: 'BO', dialCode: '+591' },
  { name: 'Argentina', iso2: 'AR', dialCode: '+54' },
  { name: 'Brasil', iso2: 'BR', dialCode: '+55' },
  { name: 'Chile', iso2: 'CL', dialCode: '+56' },
  { name: 'Colombia', iso2: 'CO', dialCode: '+57' },
  { name: 'Costa Rica', iso2: 'CR', dialCode: '+506' },
  { name: 'Cuba', iso2: 'CU', dialCode: '+53' },
  { name: 'Ecuador', iso2: 'EC', dialCode: '+593' },
  { name: 'El Salvador', iso2: 'SV', dialCode: '+503' },
  { name: 'España', iso2: 'ES', dialCode: '+34' },
  { name: 'Estados Unidos', iso2: 'US', dialCode: '+1' },
  { name: 'Guatemala', iso2: 'GT', dialCode: '+502' },
  { name: 'Honduras', iso2: 'HN', dialCode: '+504' },
  { name: 'México', iso2: 'MX', dialCode: '+52' },
  { name: 'Nicaragua', iso2: 'NI', dialCode: '+505' },
  { name: 'Panamá', iso2: 'PA', dialCode: '+507' },
  { name: 'Paraguay', iso2: 'PY', dialCode: '+595' },
  { name: 'Perú', iso2: 'PE', dialCode: '+51' },
  { name: 'Puerto Rico', iso2: 'PR', dialCode: '+1' },
  { name: 'República Dominicana', iso2: 'DO', dialCode: '+1' },
  { name: 'Uruguay', iso2: 'UY', dialCode: '+598' },
  { name: 'Venezuela', iso2: 'VE', dialCode: '+58' },
  { name: 'Canadá', iso2: 'CA', dialCode: '+1' },
  { name: 'Reino Unido', iso2: 'GB', dialCode: '+44' },
  { name: 'Francia', iso2: 'FR', dialCode: '+33' },
  { name: 'Alemania', iso2: 'DE', dialCode: '+49' },
  { name: 'Italia', iso2: 'IT', dialCode: '+39' },
  { name: 'Portugal', iso2: 'PT', dialCode: '+351' },
  { name: 'China', iso2: 'CN', dialCode: '+86' },
  { name: 'Japón', iso2: 'JP', dialCode: '+81' },
  { name: 'India', iso2: 'IN', dialCode: '+91' },
];

export const COUNTRY_CODES: CountryCode[] = RAW_COUNTRIES.map((c) => ({
  ...c,
  flag: isoToFlagEmoji(c.iso2),
}));

/**
 * Ojo: +1 lo comparten US, PR, DO y CA. Devuelve el primero de la lista, que es
 * lo único que se puede hacer cuando el teléfono se guarda como "+1 3055550100"
 * y no queda rastro del país. Por eso el selector se indexa por iso2 y no por
 * dialCode: sin eso Radix marcaba las cuatro filas como seleccionadas.
 */
export function findCountryByDialCode(dialCode: string) {
  return COUNTRY_CODES.find((c) => c.dialCode === dialCode);
}

export function findCountryByIso2(iso2: string) {
  return COUNTRY_CODES.find((c) => c.iso2 === iso2.toUpperCase());
}

export const DEFAULT_DIAL_CODE = '+591';
export const DEFAULT_COUNTRY_ISO2 = 'BO';
