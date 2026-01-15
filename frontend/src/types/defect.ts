export type DefectStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED";
export type DefectSource = "MANUAL" | "CHECKLIST";

export type Defect = {
  id: string | number;
  companyId?: number;
  vehicleId?: number;
  vehicle?: {
    id: number;
    regNumber?: string | null;
    name?: string | null;
  } | null;
  reportedByUser?: {
    id: number;
    phone?: string | null;
    username?: string | null;
    email?: string | null;
  } | null;
  assignedToUser?: {
    id: number;
    phone?: string | null;
    username?: string | null;
    email?: string | null;
  } | null;
  reportedByUserId?: number;
  assignedToUserId?: number | null;
  checklistInstanceId?: string | null;
  checklistQuestionKey?: string | null;
  source: DefectSource;
  status: DefectStatus;
  title: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
};

export type DefectAttachment = {
  id: string | number;
  defectId: string | number;
  title?: string | null;
  mimeType: string;
  size: number;
  uploadedByUserId: number;
  storagePath?: string | null;
  purgedAt?: string | null;
  createdAt: string;
};

export type DefectComment = {
  id: string | number;
  defectId: string | number;
  message: string;
  createdAt: string;
  actorUserId?: number | null;
};

export type DefectEvent = {
  id: string | number;
  defectId: string | number;
  type: string;
  createdAt: string;
  actorUserId?: number | null;
  data?: unknown;
};
