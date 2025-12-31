export type User = {
  id: number | string;
  email?: string | null;
  phone?: string | null;
  username?: string | null;
  role?: string;
  active?: boolean;
};
