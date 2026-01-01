import { ApiError, ApiErrorShape, http } from "./http";
import { getToken } from "../auth/token";

export type DocumentMeta = {
  id: string;
  title: string;
  mimeType: string;
  size: number;
  uploadedByUserId: number;
  createdAt: string;
};

export const getMyDocuments = () => http<{ documents: DocumentMeta[] }>("/api/v1/me/documents");

export const uploadDocument = async (payload: { title: string; file: File }) => {
  const form = new FormData();
  form.append("title", payload.title);
  form.append("file", payload.file);

  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch("/api/v1/admin/documents", {
    method: "POST",
    body: form,
    headers,
  });

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data: ApiErrorShape | { document: DocumentMeta } | undefined = isJson ? await res.json() : undefined;

  if (!res.ok) {
    const apiErr = (data as ApiErrorShape)?.error;
    const message = apiErr?.message || res.statusText || "Request failed";
    throw new ApiError(res.status, message, apiErr?.code, apiErr?.details);
  }

  return data as { document: DocumentMeta };
};

export const deleteDocument = (id: string) =>
  http<{ ok: boolean }>(`/api/v1/admin/documents/${id}`, { method: "DELETE" });

export const downloadDocument = async (doc: DocumentMeta) => {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`/api/v1/me/documents/${doc.id}/download`, { headers });
  if (!res.ok) {
    throw new ApiError(res.status, res.statusText || "Download failed");
  }
  const blob = await res.blob();
  const disposition = res.headers.get("content-disposition") || "";
  const match = /filename="([^"]+)"/i.exec(disposition);
  const filename = match?.[1] || doc.title || "document";

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
