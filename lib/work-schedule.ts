/**
 * Lectura del horario laboral para la interfaz.
 *
 * La decisión real la toma Postgres (`app.is_within_work_schedule`, migración
 * 031) y nadie entra ni deja de entrar por lo que diga este archivo: esto sólo
 * responde "¿cómo se ve el horario ahora mismo?" para que configurarlo no sea
 * a ciegas. Por eso la lógica replica la de la función SQL **al pie de la
 * letra**, incluido el orden (primero el día, después el rango) y el turno que
 * cruza la medianoche como unión de los dos extremos del día.
 */

import { getOrgTimeZone } from '@/lib/format';
import type { WorkScheduleDto } from '@/lib/api/organizations';

/** ISO-8601: 1 = lunes … 7 = domingo, igual que EXTRACT(ISODOW). */
export const WEEKDAYS: { value: number; label: string; short: string }[] = [
  { value: 1, label: 'Lunes', short: 'Lun' },
  { value: 2, label: 'Martes', short: 'Mar' },
  { value: 3, label: 'Miércoles', short: 'Mié' },
  { value: 4, label: 'Jueves', short: 'Jue' },
  { value: 5, label: 'Viernes', short: 'Vie' },
  { value: 6, label: 'Sábado', short: 'Sáb' },
  { value: 7, label: 'Domingo', short: 'Dom' },
];

const ISO_DOW_BY_NAME: Record<string, number> = {
  Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7,
};

export interface OrgNow {
  isoDow: number;
  /** Minutos desde medianoche en la zona de la organización. */
  minutes: number;
  /** "14:35" */
  timeLabel: string;
}

/** La hora de la organización, no la del navegador: es la que usa el bloqueo. */
export function getOrgNow(at: Date = new Date()): OrgNow {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: getOrgTimeZone(),
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(at);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const hour = Number(get('hour'));
  const minute = Number(get('minute'));

  return {
    isoDow: ISO_DOW_BY_NAME[get('weekday')] ?? 1,
    minutes: hour * 60 + minute,
    timeLabel: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
  };
}

export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':');
  return Number(hours) * 60 + Number(minutes);
}

export function crossesMidnight(schedule: Pick<WorkScheduleDto, 'startTime' | 'endTime'>): boolean {
  return toMinutes(schedule.startTime) > toMinutes(schedule.endTime);
}

/**
 * Réplica exacta de `app.is_within_work_schedule` para el día y la hora, sin
 * los escapes (rol exento, `settings.write`, super admin), que se muestran
 * aparte porque son de personas, no de reloj.
 */
export function isWithinSchedule(schedule: WorkScheduleDto, now: OrgNow = getOrgNow()): boolean {
  if (!schedule.enabled) return true;
  if (!schedule.days.includes(now.isoDow)) return false;

  const start = toMinutes(schedule.startTime);
  const end = toMinutes(schedule.endTime);

  return start < end
    ? now.minutes >= start && now.minutes <= end
    : now.minutes >= start || now.minutes <= end;
}

/** "Lunes a viernes", "Lunes, miércoles y viernes", "Todos los días". */
export function describeDays(days: number[]): string {
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.length === 0) return 'Ningún día';
  if (sorted.length === 7) return 'Todos los días';

  const isRange = sorted.every((day, index) => index === 0 || day === sorted[index - 1] + 1);
  const labelOf = (day: number) => WEEKDAYS.find((w) => w.value === day)?.label ?? '';

  if (isRange && sorted.length > 2) {
    return `${labelOf(sorted[0])} a ${labelOf(sorted[sorted.length - 1]).toLowerCase()}`;
  }

  const labels = sorted.map(labelOf);
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(', ')} y ${labels[labels.length - 1].toLowerCase()}`;
}

/** "Lunes a viernes, de 08:00 a 18:00" */
export function describeSchedule(schedule: WorkScheduleDto): string {
  const range = `de ${schedule.startTime} a ${schedule.endTime}`;
  const nightly = crossesMidnight(schedule) ? ' del día siguiente' : '';
  return `${describeDays(schedule.days)}, ${range}${nightly}`;
}

/**
 * Cuándo vuelve a abrir, para que el aviso de "cerrado" diga algo accionable.
 * Se busca día a día en vez de calcular: son 8 iteraciones como mucho y el
 * turno nocturno hace que el caso cerrado no sea trivial.
 */
export function describeNextOpening(
  schedule: WorkScheduleDto,
  now: OrgNow = getOrgNow(),
): string | null {
  if (!schedule.enabled || schedule.days.length === 0) return null;

  const start = toMinutes(schedule.startTime);
  const labelOf = (day: number) => WEEKDAYS.find((w) => w.value === day)?.label ?? '';

  for (let offset = 0; offset <= 7; offset += 1) {
    const day = ((now.isoDow - 1 + offset) % 7) + 1;
    if (!schedule.days.includes(day)) continue;
    // Hoy sólo vale si el turno aún no empezó.
    if (offset === 0 && now.minutes >= start) continue;

    const when = offset === 0 ? 'hoy' : offset === 1 ? 'mañana' : `el ${labelOf(day).toLowerCase()}`;
    return `${when} a las ${schedule.startTime}`;
  }

  return null;
}

/** Cuándo cierra el turno en curso. */
export function describeClosing(schedule: WorkScheduleDto): string {
  return crossesMidnight(schedule)
    ? `a las ${schedule.endTime} de mañana`
    : `a las ${schedule.endTime}`;
}

export const SCHEDULE_PRESETS: {
  label: string;
  days: number[];
  startTime: string;
  endTime: string;
}[] = [
  { label: 'Lun a Vie, 08:00–18:00', days: [1, 2, 3, 4, 5], startTime: '08:00', endTime: '18:00' },
  { label: 'Lun a Sáb, 08:00–20:00', days: [1, 2, 3, 4, 5, 6], startTime: '08:00', endTime: '20:00' },
  { label: 'Todos los días, 24 h', days: [1, 2, 3, 4, 5, 6, 7], startTime: '00:00', endTime: '23:59' },
];
