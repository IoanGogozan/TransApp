export const formatYYYYMMDD = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const parseYYYYMMDD = (s: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return d;
};

export const addDays = (d: Date, n: number): Date => {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
};

export const startOfISOWeek = (d: Date): Date => {
  const copy = new Date(d);
  const day = copy.getDay();
  const isoDay = day === 0 ? 7 : day;
  copy.setDate(copy.getDate() - (isoDay - 1));
  return new Date(copy.getFullYear(), copy.getMonth(), copy.getDate());
};

export const getISOWeekNumber = (d: Date): number => {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = date.getDay();
  const isoDay = day === 0 ? 7 : day;
  date.setDate(date.getDate() + (4 - isoDay));
  const yearStart = new Date(date.getFullYear(), 0, 1);
  const diffMs = date.getTime() - yearStart.getTime();
  const diffDays = Math.floor(diffMs / 86400000) + 1;
  return Math.ceil(diffDays / 7);
};

export const formatDisplayDate = (d: Date): string => {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

export const formatDisplayDayChip = (d: Date): { dow: string; dm: string } => {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dow = dayNames[d.getDay()];
  const dm = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  return { dow, dm };
};
