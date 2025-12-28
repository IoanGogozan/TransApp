export type ChecklistQuestion = {
  key: string;
  label: string;
  type?: string;
  required?: boolean;
};

export type ChecklistAnswerInput = {
  questionKey: string;
  answer: "OK" | "DEVIATION" | "NOT_APPLICABLE";
  comment?: string;
};

export type ChecklistStatus = {
  exists: boolean;
  completed: boolean;
  osloDate?: string;
  checklistId?: string | number;
};
