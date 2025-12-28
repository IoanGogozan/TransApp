export type ListMeta = {
  limit: number;
  offset: number;
};

export type ListResponse<T> = {
  items: T[];
  meta: ListMeta;
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const hasArrayProp = (
  obj: Record<string, unknown>,
  key: string,
): obj is Record<string, unknown> & { [x: string]: unknown[] } => Array.isArray(obj[key]);

const isNumber = (value: unknown): value is number => typeof value === "number" && !Number.isNaN(value);

export const isListMeta = (value: unknown): value is ListMeta =>
  isRecord(value) && isNumber(value.limit) && isNumber(value.offset);
