import { http } from "./http";

export type CustomerAdmin = {
  id: string;
  name: string;
  orgNumber?: string | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  sortOrder?: number | null;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type CustomerListResponse = { items?: CustomerAdmin[]; customers?: CustomerAdmin[] } | CustomerAdmin[];
type CustomerSingleResponse = { customer?: CustomerAdmin } | CustomerAdmin;

export const listCustomers = async (): Promise<CustomerAdmin[]> => {
  const res = await http<CustomerListResponse>("/api/v1/customers");
  if (Array.isArray(res)) return res;
  if (res?.items && Array.isArray(res.items)) return res.items;
  if (res?.customers && Array.isArray(res.customers)) return res.customers;
  return [];
};

export const createCustomer = async (input: {
  name: string;
  orgNumber?: string | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  sortOrder?: number | null;
  active?: boolean;
}): Promise<CustomerAdmin> => {
  const res = await http<CustomerSingleResponse>("/api/v1/customers", {
    method: "POST",
    body: {
      name: input.name,
      orgNumber: input.orgNumber,
      address: input.address,
      email: input.email,
      phone: input.phone,
      sortOrder: input.sortOrder,
      active: input.active,
    },
  });
  if (!res) throw new Error("Empty response");
  if (!Array.isArray(res) && (res as { customer?: CustomerAdmin }).customer) {
    return (res as { customer: CustomerAdmin }).customer;
  }
  return res as CustomerAdmin;
};

export const updateCustomer = async (
  id: string,
  patch: {
    name?: string;
    orgNumber?: string | null;
    address?: string | null;
    email?: string | null;
    phone?: string | null;
    sortOrder?: number | null;
    active?: boolean;
  },
): Promise<CustomerAdmin> => {
  const res = await http<CustomerSingleResponse>(`/api/v1/customers/${id}`, {
    method: "PATCH",
    body: patch,
  });
  if (!res) throw new Error("Empty response");
  if (!Array.isArray(res) && (res as { customer?: CustomerAdmin }).customer) {
    return (res as { customer: CustomerAdmin }).customer;
  }
  return res as CustomerAdmin;
};
