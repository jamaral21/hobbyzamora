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
  try {
    const timeZone = isDateOnly(value) ? 'UTC' : CHILE_TIME_ZONE;
    const date = toDate(isDateOnly(value) ? `${value}T12:00:00Z` : value);
    if (isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('es-CL', { ...options, timeZone }).format(date);
  } catch (e) {
    console.error('Error formatting date:', e);
    return String(value || '');
  }
}

export function formatChileDate(value: DateValue, options: DateFormatOptions = {}): string {
  const hasStyle = 'dateStyle' in options;
  const baseDefaults: DateFormatOptions = hasStyle
    ? {}
    : { day: '2-digit', month: '2-digit', year: 'numeric' };

  return format(value, {
    ...baseDefaults,
    ...options,
  });
}

export function formatChileDateTime(value: DateValue, options: DateFormatOptions = {}): string {
  const hasIndividualComponents = Object.keys(options).some((key) =>
    ['weekday', 'era', 'year', 'month', 'day', 'hour', 'minute', 'second', 'timeZoneName'].includes(key)
  );

  const baseDefaults: DateFormatOptions = hasIndividualComponents
    ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { dateStyle: 'short', timeStyle: 'medium' };

  return format(value, {
    ...baseDefaults,
    ...options,
  });
}

export function formatChileTime(value: DateValue, options: DateFormatOptions = {}): string {
  const hasStyle = 'timeStyle' in options;
  const baseDefaults: DateFormatOptions = hasStyle
    ? {}
    : { hour: '2-digit', minute: '2-digit' };

  return format(value, {
    ...baseDefaults,
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
