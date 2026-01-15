import { Defect } from "../types/defect";

const checklistLabels: Record<string, string> = {
  tires_ok: "Tyres",
  lights_ok: "Lights",
  brakes_ok: "Brakes",
  fluids_ok: "Fluids",
  mirrors_ok: "Mirrors",
  horn_ok: "Horn",
  seatbelt_ok: "Seatbelts",
  damages: "Damages",
};

export const getDefectDisplayTitle = (defect: Defect): string => {
  if (defect.source === "CHECKLIST" && defect.checklistQuestionKey) {
    const label = checklistLabels[defect.checklistQuestionKey];
    return label ? `${label} - deviation` : "Checklist deviation";
  }
  return defect.title;
};

export const getDefectCategoryLabel = (defect: Defect): string => {
  if (defect.source === "CHECKLIST" && defect.checklistQuestionKey) {
    return checklistLabels[defect.checklistQuestionKey] || "Checklist item";
  }
  return "General";
};

export const getDefectListTitle = (defect: Defect): string => {
  if (defect.source === "CHECKLIST") {
    return `${getDefectCategoryLabel(defect)} - deviation`;
  }
  return defect.title;
};

export const getDefectDriverListTitle = (defect: Defect): string => {
  if (defect.source === "CHECKLIST") {
    return getDefectCategoryLabel(defect);
  }
  return defect.title;
};
