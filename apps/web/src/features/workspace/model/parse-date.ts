export const parseDate = (raw: string) => {
  const value = raw.trim();
  if (!value) return undefined;

  // Validate date component even for ISO timestamps like 2025-02-30T...
  const ymdPrefix = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/);
  if (ymdPrefix) {
    const year = Number(ymdPrefix[1]);
    const month = Number(ymdPrefix[2]);
    const day = Number(ymdPrefix[3]);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return undefined;
    if (month < 1 || month > 12) return undefined;
    const isLeap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const maxDays = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ?? 31;
    if (day < 1 || day > maxDays) return undefined;

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const ts = Date.UTC(year, month - 1, day);
      const dt = new Date(ts);
      if (dt.getUTCFullYear() !== year || dt.getUTCMonth() !== month - 1 || dt.getUTCDate() !== day) return undefined;
      return ts;
    }
  }

  // Treat ISO strings without timezone as UTC (e.g. 2025-01-01T00:00:00).
  // Also supports "YYYY-MM-DD HH:mm" by normalizing whitespace to 'T'.
  const isoWithoutTz = /^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?$/.test(value);
  const normalized = isoWithoutTz ? `${value.replace(/\s+/, 'T')}Z` : value;
  const dt = new Date(normalized);
  if (!Number.isFinite(dt.getTime())) return undefined;
  return dt.getTime();
};

