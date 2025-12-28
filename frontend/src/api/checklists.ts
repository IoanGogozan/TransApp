import { http } from "./http";
import { ChecklistAnswerInput, ChecklistStatus } from "../types/checklist";

type StatusResponse = { done: boolean; checklistId?: string | number };
type SubmitResponse = { checklist?: unknown } | unknown;

export const getChecklistStatus = async (vehicleId: string | number): Promise<ChecklistStatus> => {
  const qs = `/api/v1/checklists/status?vehicleId=${encodeURIComponent(String(vehicleId))}`;
  const res = await http<StatusResponse>(qs);

  return {
    exists: res.done,
    completed: res.done,
    checklistId: res.checklistId,
  };
};

export const submitChecklist = async (vehicleId: string | number, answers: ChecklistAnswerInput[]) => {
  const payload = {
    vehicleId: Number(vehicleId),
    answers,
  };
  await http<SubmitResponse>("/api/v1/checklists/submit", {
    method: "POST",
    body: payload,
  });
};
