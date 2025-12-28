export type DefectStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type DefectSource = "MANUAL" | "CHECKLIST";

export type Defect = {
  id: string | number;
  companyId?: number;
  vehicleId?: number;
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
