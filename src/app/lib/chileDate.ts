const CHILE_TIME_ZONE = 'America/Santiago';

type DateValue = string | number | Date;

type DateFormatOptions = Intl.DateTimeFormatOptions;

function isDateOnly(value: DateValue): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toDate(value: DateValue): Date {
  return value instanceof Date ? value : new Date(value);
}

function format(value: DateValue, options: DateFormatOptions): string {
  const timeZone = isDateOnly(value) ? 'UTC' : CHILE_TIME_ZONE;
  return new Intl.DateTimeFormat('es-CL', { ...options, timeZone }).format(toDate(isDateOnly(value) ? `${value}T12:00:00Z` : value));
}

export function formatChileDate(value: DateValue, options: DateFormatOptions = {}): string {
  return format(value, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...options,
  });
}

export function formatChileDateTime(value: DateValue, options: DateFormatOptions = {}): string {
  return format(value, {
    dateStyle: 'short',
    timeStyle: 'medium',
    ...options,
  });
}

export function formatChileTime(value: DateValue, options: DateFormatOptions = {}): string {
  return format(value, {
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  });
}

export function formatChileMonth(value: DateValue, options: DateFormatOptions = {}): string {
  return format(value, {
    month: 'long',
    year: 'numeric',
    ...options,
  });
}
