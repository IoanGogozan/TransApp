import { http } from "./http";

export type RouteOptionAdmin = {
  id: string;
  name: string;
  sortOrder: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type RouteListResponse = { items?: RouteOptionAdmin[]; routes?: RouteOptionAdmin[] } | RouteOptionAdmin[];
type RouteSingleResponse = { route?: RouteOptionAdmin } | RouteOptionAdmin;

export const listRoutes = async (): Promise<RouteOptionAdmin[]> => {
  const res = await http<RouteListResponse>("/api/v1/routes");
  if (Array.isArray(res)) return res;
  if (res?.items && Array.isArray(res.items)) return res.items;
  if (res?.routes && Array.isArray(res.routes)) return res.routes;
  return [];
};

export const createRoute = async (input: {
  name: string;
  sortOrder?: number;
  active?: boolean;
}): Promise<RouteOptionAdmin> => {
  const res = await http<RouteSingleResponse>("/api/v1/routes", {
    method: "POST",
    body: {
      name: input.name,
      sortOrder: input.sortOrder,
      active: input.active,
    },
  });
  if (!res) throw new Error("Empty response");
  if (!Array.isArray(res) && (res as { route?: RouteOptionAdmin }).route) {
    return (res as { route: RouteOptionAdmin }).route;
  }
  return res as RouteOptionAdmin;
};

export const updateRoute = async (
  id: string,
  patch: { name?: string; sortOrder?: number; active?: boolean },
): Promise<RouteOptionAdmin> => {
  const res = await http<RouteSingleResponse>(`/api/v1/routes/${id}`, {
    method: "PATCH",
    body: patch,
  });
  if (!res) throw new Error("Empty response");
  if (!Array.isArray(res) && (res as { route?: RouteOptionAdmin }).route) {
    return (res as { route: RouteOptionAdmin }).route;
  }
  return res as RouteOptionAdmin;
};
