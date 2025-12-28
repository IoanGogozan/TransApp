import { http } from "./http";
import { hasArrayProp, isRecord } from "./types";
import { User } from "../types/user";

export const isUser = (value: unknown): value is User => {
  if (!isRecord(value)) return false;
  const { id, email, role, active, isActive } = value as Record<string, unknown>;
  const hasId = typeof id === "number" || typeof id === "string";
  const hasEmail = typeof email === "string";
  const roleValid = role === undefined || typeof role === "string";
  const activeValid = active === undefined || typeof active === "boolean";
  const isActiveValid = isActive === undefined || typeof isActive === "boolean";
  return hasId && hasEmail && roleValid && activeValid && isActiveValid;
};

const isUserArray = (value: unknown): value is User[] => Array.isArray(value) && value.every(isUser);

const normalizeActive = (user: User | (User & { isActive?: boolean })): User => {
  if (typeof user.active === "boolean") return user;
  if (typeof (user as { isActive?: boolean }).isActive === "boolean") {
    return { ...user, active: (user as { isActive: boolean }).isActive };
  }
  return user;
};

export async function listCompanyUsers(): Promise<User[]> {
  const res = await http<unknown>("/api/v1/users");

  if (isUserArray(res)) {
    return res.map(normalizeActive);
  }

  if (isRecord(res)) {
    if (hasArrayProp(res, "users") && isUserArray(res.users)) {
      return res.users.map(normalizeActive);
    }
    if (hasArrayProp(res, "items") && isUserArray(res.items)) {
      return res.items.map(normalizeActive);
    }
  }

  return [];
}

export async function createCompanyUser(input: {
  email: string;
  password: string;
  role: "ADMIN" | "DRIVER";
}): Promise<User | null> {
  const res = await http<unknown>("/api/v1/users", {
    method: "POST",
    body: input,
  });

  if (isUser(res)) {
    return res;
  }

  if (isRecord(res)) {
    if (isUser((res as { user?: unknown }).user)) {
      return (res as { user: User }).user;
    }
    if (isUser((res as { item?: unknown }).item)) {
      return (res as { item: User }).item;
    }
    if (isUser((res as { data?: unknown }).data)) {
      return (res as { data: User }).data;
    }
  }

  return null;
}

export async function updateUserActive(userId: number | string, active: boolean): Promise<User | null> {
  const res = await http<unknown>(`/api/v1/users/${userId}/active`, {
    method: "PATCH",
    body: { active },
  });

  if (isUser(res)) {
    return normalizeActive(res);
  }

  if (isRecord(res)) {
    if (isUser((res as { user?: unknown }).user)) {
      return normalizeActive((res as { user: User }).user);
    }
    if (isUser((res as { item?: unknown }).item)) {
      return normalizeActive((res as { item: User }).item);
    }
    if (isUser((res as { data?: unknown }).data)) {
      return normalizeActive((res as { data: User }).data);
    }
  }

  return null;
}

export async function resetUserPassword(userId: number | string, password: string): Promise<User | null> {
  const res = await http<unknown>(`/api/v1/users/${userId}/password`, {
    method: "PATCH",
    body: { password },
  });

  if (isUser(res)) {
    return normalizeActive(res);
  }

  if (isRecord(res)) {
    if (isUser((res as { user?: unknown }).user)) {
      return normalizeActive((res as { user: User }).user);
    }
    if (isUser((res as { item?: unknown }).item)) {
      return normalizeActive((res as { item: User }).item);
    }
    if (isUser((res as { data?: unknown }).data)) {
      return normalizeActive((res as { data: User }).data);
    }
  }

  return null;
}
