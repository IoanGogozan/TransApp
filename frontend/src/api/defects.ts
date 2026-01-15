import { ApiError, ApiErrorShape, http } from "./http";
import { getToken } from "../auth/token";
import { hasArrayProp, isListMeta, isRecord, ListResponse } from "./types";
import { Defect, DefectAttachment, DefectComment, DefectEvent, DefectStatus } from "../types/defect";

const defectStatuses: DefectStatus[] = ["OPEN", "IN_PROGRESS", "RESOLVED"];

const isDefectStatus = (value: unknown): value is DefectStatus =>
  typeof value === "string" && defectStatuses.includes(value as DefectStatus);

const isDefect = (value: unknown): value is Defect => {
  if (!isRecord(value)) return false;
  const { id, status, title, source, createdAt, updatedAt } = value;
  const hasId = typeof id === "string" || typeof id === "number";
  const hasTitle = typeof title === "string";
  const hasSource = typeof source === "string";
  const hasCreatedAt = typeof createdAt === "string";
  const hasUpdatedAt = updatedAt === undefined || typeof updatedAt === "string";
  return hasId && isDefectStatus(status) && hasTitle && hasSource && hasCreatedAt && hasUpdatedAt;
};

const isDefectComment = (value: unknown): value is DefectComment => {
  if (!isRecord(value)) return false;
  const { id, defectId, message, createdAt, actorUserId } = value;
  const hasId = typeof id === "string" || typeof id === "number";
  const hasDefectId = typeof defectId === "string" || typeof defectId === "number";
  const hasMessage = typeof message === "string";
  const hasCreatedAt = typeof createdAt === "string";
  const actorValid = actorUserId === undefined || actorUserId === null || typeof actorUserId === "number";
  return hasId && hasDefectId && hasMessage && hasCreatedAt && actorValid;
};

const isDefectEvent = (value: unknown): value is DefectEvent => {
  if (!isRecord(value)) return false;
  const { id, defectId, type, createdAt, actorUserId } = value;
  const hasId = typeof id === "string" || typeof id === "number";
  const hasDefectId = typeof defectId === "string" || typeof defectId === "number";
  const hasType = typeof type === "string";
  const hasCreatedAt = typeof createdAt === "string";
  const actorValid = actorUserId === undefined || actorUserId === null || typeof actorUserId === "number";
  return hasId && hasDefectId && hasType && hasCreatedAt && actorValid;
};

const isDefectAttachment = (value: unknown): value is DefectAttachment => {
  if (!isRecord(value)) return false;
  const { id, defectId, title, mimeType, size, uploadedByUserId, storagePath, purgedAt, createdAt } = value;
  const hasId = typeof id === "string" || typeof id === "number";
  const hasDefectId = typeof defectId === "string" || typeof defectId === "number";
  const hasMimeType = typeof mimeType === "string";
  const hasSize = typeof size === "number";
  const hasUploader = typeof uploadedByUserId === "number";
  const hasCreatedAt = typeof createdAt === "string";
  const titleValid = title === undefined || title === null || typeof title === "string";
  const storageValid = storagePath === undefined || storagePath === null || typeof storagePath === "string";
  const purgedValid = purgedAt === undefined || purgedAt === null || typeof purgedAt === "string";
  return (
    hasId &&
    hasDefectId &&
    hasMimeType &&
    hasSize &&
    hasUploader &&
    hasCreatedAt &&
    titleValid &&
    storageValid &&
    purgedValid
  );
};

const filterItems = <T>(arr: unknown[], guard: (item: unknown) => item is T): T[] => {
  const filtered = arr.filter((item): item is T => guard(item));
  if (filtered.length !== arr.length) {
    console.warn("[api] Dropped invalid list items", { total: arr.length, kept: filtered.length });
  }
  return filtered;
};

const normalizeItems = <T>(
  value: unknown,
  guard: (item: unknown) => item is T,
  altKeys: string[] = [],
): T[] => {
  if (Array.isArray(value)) {
    return filterItems(value, guard);
  }
  if (isRecord(value)) {
    const keys = ["items", ...altKeys];
    for (const key of keys) {
      if (hasArrayProp(value, key)) {
        const arr = value[key];
        return filterItems(arr as unknown[], guard);
      }
    }
  }
  return [];
};

const normalizeListResponse = <T>(
  value: unknown,
  guard: (item: unknown) => item is T,
  altKeys: string[] = [],
): ListResponse<T> => {
  const items = normalizeItems<T>(value, guard, altKeys);
  const metaValue = isRecord(value) ? (value as { meta?: unknown }).meta : undefined;
  const meta = isListMeta(metaValue) ? metaValue : { limit: items.length, offset: 0 };
  return { items, meta };
};

const extractDefectResponse = (value: unknown): Defect => {
  if (isRecord(value) && isDefect((value as { defect?: unknown }).defect)) {
    return (value as { defect: Defect }).defect;
  }
  if (isDefect(value)) {
    return value;
  }
  throw new Error("Invalid defect response");
};

const extractCommentResponse = (value: unknown): DefectComment => {
  if (isRecord(value) && isDefectComment((value as { comment?: unknown }).comment)) {
    return (value as { comment: DefectComment }).comment;
  }
  if (isDefectComment(value)) {
    return value;
  }
  throw new Error("Invalid comment response");
};

const extractAttachmentResponse = (value: unknown): DefectAttachment => {
  if (isRecord(value) && isDefectAttachment((value as { attachment?: unknown }).attachment)) {
    return (value as { attachment: DefectAttachment }).attachment;
  }
  if (isDefectAttachment(value)) {
    return value;
  }
  throw new Error("Invalid attachment response");
};

export async function listDefects(params?: {
  status?: DefectStatus;
  vehicleId?: number;
  limit?: number;
  offset?: number;
}): Promise<ListResponse<Defect>> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.vehicleId !== undefined) query.set("vehicleId", String(params.vehicleId));
  if (params?.limit !== undefined) query.set("limit", String(params.limit));
  if (params?.offset !== undefined) query.set("offset", String(params.offset));
  const qs = query.toString();
  const res = await http<unknown>(`/api/v1/defects${qs ? `?${qs}` : ""}`);
  return normalizeListResponse<Defect>(res, isDefect, ["defects"]);
}

export async function getDefect(id: string | number): Promise<Defect> {
  const res = await http<unknown>(`/api/v1/defects/${id}`);
  return extractDefectResponse(res);
}

export const getDefectById = getDefect;

export async function updateDefectStatus(id: string | number, status: DefectStatus): Promise<Defect> {
  const res = await http<unknown>(`/api/v1/defects/${id}/status`, {
    method: "PATCH",
    body: { status },
  });
  return extractDefectResponse(res);
}

export async function updateDefectDetails(
  id: string | number,
  patch: { title?: string; description?: string | null },
): Promise<Defect> {
  const body: { title?: string; description?: string | null } = {};
  if (patch.title !== undefined) body.title = patch.title;
  if (patch.description !== undefined) body.description = patch.description;
  const res = await http<unknown>(`/api/v1/defects/${id}`, {
    method: "PATCH",
    body,
  });
  return extractDefectResponse(res);
}

export async function updateDefectStatusResponse(
  id: string | number,
  status: DefectStatus,
): Promise<{ defect: Defect }> {
  const defect = await updateDefectStatus(id, status);
  return { defect };
}

export async function assignDefect(
  id: string | number,
  assignedToUserId: number | null,
): Promise<Defect> {
  const res = await http<unknown>(`/api/v1/defects/${id}/assign`, {
    method: "PATCH",
    body: { assignedToUserId },
  });
  return extractDefectResponse(res);
}

export async function assignDefectResponse(
  id: string | number,
  assignedToUserId: number | null,
): Promise<{ defect: Defect }> {
  const defect = await assignDefect(id, assignedToUserId);
  return { defect };
}

export async function listDefectComments(
  id: string | number,
  params?: { limit?: number; offset?: number },
): Promise<ListResponse<DefectComment>> {
  const query = new URLSearchParams();
  if (params?.limit !== undefined) query.set("limit", String(params.limit));
  if (params?.offset !== undefined) query.set("offset", String(params.offset));
  const qs = query.toString();
  const res = await http<unknown>(`/api/v1/defects/${id}/comments${qs ? `?${qs}` : ""}`);
  return normalizeListResponse<DefectComment>(res, isDefectComment);
}

export async function addDefectComment(id: string | number, message: string): Promise<DefectComment> {
  const res = await http<unknown>(`/api/v1/defects/${id}/comments`, {
    method: "POST",
    body: { message },
  });
  return extractCommentResponse(res);
}

export async function addDefectCommentResponse(
  id: string | number,
  message: string,
): Promise<{ comment: DefectComment }> {
  const comment = await addDefectComment(id, message);
  return { comment };
}

export async function listDefectHistory(
  id: string | number,
  params?: { limit?: number; offset?: number },
): Promise<ListResponse<DefectEvent>> {
  const query = new URLSearchParams();
  if (params?.limit !== undefined) query.set("limit", String(params.limit));
  if (params?.offset !== undefined) query.set("offset", String(params.offset));
  const qs = query.toString();
  const res = await http<unknown>(`/api/v1/defects/${id}/history${qs ? `?${qs}` : ""}`);
  return normalizeListResponse<DefectEvent>(res, isDefectEvent);
}

export async function listDefectAttachments(
  id: string | number,
  params?: { limit?: number; offset?: number },
): Promise<ListResponse<DefectAttachment>> {
  const query = new URLSearchParams();
  if (params?.limit !== undefined) query.set("limit", String(params.limit));
  if (params?.offset !== undefined) query.set("offset", String(params.offset));
  const qs = query.toString();
  const res = await http<unknown>(`/api/v1/defects/${id}/attachments${qs ? `?${qs}` : ""}`);
  return normalizeListResponse<DefectAttachment>(res, isDefectAttachment);
}

export async function uploadDefectAttachment(
  id: string | number,
  file: File,
  title?: string,
): Promise<DefectAttachment> {
  const form = new FormData();
  form.append("file", file);
  if (title !== undefined) form.append("title", title);
  const res = await http<unknown>(`/api/v1/defects/${id}/attachments`, {
    method: "POST",
    body: form,
  });
  return extractAttachmentResponse(res);
}

export const downloadDefectAttachment = async (id: string | number, attachment: DefectAttachment) => {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`/api/v1/defects/${id}/attachments/${attachment.id}/download`, { headers });
  if (!res.ok) {
    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const data: ApiErrorShape | undefined = isJson ? await res.json() : undefined;
    const apiErr = data?.error;
    const message = apiErr?.message || res.statusText || "Download failed";
    throw new ApiError(res.status, message, apiErr?.code, apiErr?.details);
  }
  const blob = await res.blob();
  const disposition = res.headers.get("content-disposition") || "";
  const match = /filename="([^"]+)"/i.exec(disposition);
  const filename = match?.[1] || attachment.title || "attachment";

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const getDefectAttachmentDownloadUrl = (id: string | number, attachmentId: string | number): string =>
  `/api/v1/defects/${id}/attachments/${attachmentId}/download`;

export const deleteDefectAttachment = async (
  id: string | number,
  attachmentId: string | number,
): Promise<{ ok: boolean }> =>
  http<{ ok: boolean }>(`/api/v1/defects/${id}/attachments/${attachmentId}`, { method: "DELETE" });
