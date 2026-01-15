import { http } from "./http";
import { ChecklistAnswerInput, ChecklistStatus } from "../types/checklist";

type StatusResponse = { done: boolean; checklistId?: string | number };
type SubmitResponse = { checklist?: { id?: string | number }; createdDefectIds?: unknown } | unknown;

export const getChecklistStatus = async (vehicleId: string | number): Promise<ChecklistStatus> => {
  const qs = `/api/v1/checklists/status?vehicleId=${encodeURIComponent(String(vehicleId))}`;
  const res = await http<StatusResponse>(qs);

  return {
    exists: res.done,
    completed: res.done,
    checklistId: res.checklistId,
  };
};

export const submitChecklist = async (
  vehicleId: string | number,
  answers: ChecklistAnswerInput[],
): Promise<{ checklistId?: string; createdDefectIds?: string[] }> => {
  const payload = {
    vehicleId: Number(vehicleId),
    answers,
  };
  const res = await http<SubmitResponse>("/api/v1/checklists/submit", {
    method: "POST",
    body: payload,
  });
  const data = res as SubmitResponse;
  const checklistIdRaw = (data as { checklist?: { id?: string | number } }).checklist?.id;
  const checklistId =
    typeof checklistIdRaw === "string" || typeof checklistIdRaw === "number" ? String(checklistIdRaw) : undefined;
  const createdDefectIdsRaw = (data as { createdDefectIds?: unknown }).createdDefectIds;
  const createdDefectIds = Array.isArray(createdDefectIdsRaw)
    ? createdDefectIdsRaw.filter((id) => typeof id === "string").map((id) => id)
    : undefined;
  return { checklistId, createdDefectIds };
};
