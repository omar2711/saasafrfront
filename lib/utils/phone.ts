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

/** Devuelve el mensaje de error, o null si el número es válido (o está vacío). */
export function validatePhone(phoneCountryCode: string, phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  if (phoneCountryCode === '+591') {
    if (digits.length !== 8) return 'En Bolivia el número debe tener 8 dígitos';
    if (!/^[234679]/.test(digits) || /^[89]/.test(digits)) {
      return 'Debe empezar con 2, 3 o 4 (fijo) o con 6 o 7 (celular)';
    }
    return null;
  }
  if (digits.length < 6 || digits.length > 14) {
    return 'El número debe tener entre 6 y 14 dígitos';
  }
  return null;
}