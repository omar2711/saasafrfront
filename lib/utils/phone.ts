import { DEFAULT_DIAL_CODE, findCountryByDialCode } from '@/lib/data/country-codes';

/**
 * Separa un telefono almacenado como "+591 70000000" en codigo de pais y numero.
 * Si no reconoce el prefijo, devuelve el valor completo como numero para no
 * perder datos capturados antes de que existiera el selector de pais.
 */
export function splitPhone(fullPhone: string | null | undefined): {
  phoneCountryCode: string;
  phone: string;
} {
  if (!fullPhone) {
    return { phoneCountryCode: DEFAULT_DIAL_CODE, phone: '' };
  }
  const match = fullPhone.trim().match(/^(\+\d{1,4})\s*(.*)$/);
  if (match && findCountryByDialCode(match[1])) {
    return { phoneCountryCode: match[1], phone: match[2] };
  }
  return { phoneCountryCode: DEFAULT_DIAL_CODE, phone: fullPhone };
}

/** Une codigo de pais y numero al formato que se persiste. Vacio si no hay numero. */
export function joinPhone(phoneCountryCode: string, phone: string): string {
  const trimmed = phone.trim();
  return trimmed ? `${phoneCountryCode} ${trimmed}` : '';
}
