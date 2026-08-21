const CHILE_TIME_ZONE = 'America/Santiago';

type ChileDateParts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: CHILE_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function getParts(value: Date): ChileDateParts {
  const values = Object.fromEntries(
    formatter.formatToParts(value)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  );

  return values as ChileDateParts;
}

function parseDateOnly(value: string): { year: number; month: number; day: number } {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error('INVALID_CHILE_DATE');

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const validation = new Date(Date.UTC(year, month - 1, day));
  if (validation.getUTCFullYear() !== year || validation.getUTCMonth() !== month - 1 || validation.getUTCDate() !== day) {
    throw new Error('INVALID_CHILE_DATE');
  }

  return { year, month, day };
}

function chileMidnightToUtc(value: string): Date {
  const { year, month, day } = parseDateOnly(value);
  const target = Date.UTC(year, month - 1, day, 0, 0, 0);
  let timestamp = target;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = getParts(new Date(timestamp));
    timestamp += target - Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  }

  return new Date(timestamp);
}

export function addChileDays(value: string, days: number): string {
  const { year, month, day } = parseDateOnly(value);
  const result = new Date(Date.UTC(year, month - 1, day + days));
  return result.toISOString().slice(0, 10);
}

export function getChileDateKey(value = new Date()): string {
  const parts = getParts(value);
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

export function getChileDayRange(value: string): { start: Date; endExclusive: Date } {
  return {
    start: chileMidnightToUtc(value),
    endExclusive: chileMidnightToUtc(addChileDays(value, 1)),
  };
}

export function getChileDateRange(startDate: string, endDate: string): { start: Date; endExclusive: Date } {
  parseDateOnly(startDate);
  parseDateOnly(endDate);
  if (startDate > endDate) throw new Error('INVALID_CHILE_DATE_RANGE');

  return {
    start: chileMidnightToUtc(startDate),
    endExclusive: chileMidnightToUtc(addChileDays(endDate, 1)),
  };
}