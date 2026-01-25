import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getChecklistStatus, submitChecklist } from "../api/checklists";
import { createVehicleCheckIn } from "../api/timesheets";
import { getVehicleById } from "../api/vehicles";
import { ApiError } from "../api/http";
import { ChecklistQuestion, ChecklistAnswerInput, ChecklistStatus } from "../types/checklist";
import { Vehicle } from "../types/vehicle";
import { tenantPath } from "../utils/tenantPath";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import FormField from "../components/ui/FormField";
import SectionHeader from "../components/ui/SectionHeader";
import ModalShell from "../components/ui/ModalShell";

const QUESTIONS: ChecklistQuestion[] = [
  { key: "lights_ok", label: "Do the lights work properly?", required: true },
  { key: "brakes_ok", label: "Do the brakes seem OK?", required: true },
  { key: "tires_ok", label: "Are the tires in acceptable condition?", required: true },
  { key: "fluids_ok", label: "Are fluid levels acceptable?", required: true },
  { key: "mirrors_ok", label: "Are mirrors and windows intact/clean?", required: true },
  { key: "horn_ok", label: "Does the horn work?", required: true },
  { key: "seatbelt_ok", label: "Are seatbelts functioning?", required: true },
  { key: "damages", label: "Any visible damages?", required: true },
];

type AnswerState = Record<string, { answer: "OK" | "DEVIATION" | "NOT_APPLICABLE" | ""; comment?: string }>;

const ChecklistPage = () => {
  const { companySlug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const slug = companySlug;
  const vehicleIdParam = searchParams.get("vehicleId");
  const returnToParam = searchParams.get("returnTo");
  const returnTo = returnToParam || "/driver/timesheet";
  const parsedVehicleId = vehicleIdParam ? Number(vehicleIdParam) : null;
  const isValidVehicleId = parsedVehicleId !== null && Number.isFinite(parsedVehicleId) && parsedVehicleId > 0;
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [status, setStatus] = useState<ChecklistStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [defectDialogOpen, setDefectDialogOpen] = useState(false);
  const [defectFocusId, setDefectFocusId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<AnswerState>(() =>
    QUESTIONS.reduce(
      (acc, q) => ({
        ...acc,
        [q.key]: { answer: "OK", comment: "" },
      }),
      {} as AnswerState
    )
  );

  const allAnswered = useMemo(() => QUESTIONS.every((q) => answers[q.key]?.answer), [answers]);

  useEffect(() => {
    const load = async () => {
      if (!vehicleIdParam || !isValidVehicleId) return;
      setLoading(true);
      setError(null);
      try {
        const [veh, stat] = await Promise.all([getVehicleById(vehicleIdParam), getChecklistStatus(vehicleIdParam)]);
        setVehicle(veh);
        setStatus(stat);
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Failed to load checklist";
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [vehicleIdParam, isValidVehicleId]);

  const handleSelectChange = (key: string, value: "OK" | "DEVIATION" | "NOT_APPLICABLE" | "") => {
    setAnswers((prev) => ({
      ...prev,
      [key]: { ...prev[key], answer: value },
    }));
  };

  const handleCommentChange = (key: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [key]: { ...prev[key], comment: value.slice(0, 500) },
    }));
  };

  const handleSubmit = async () => {
    if (!vehicleIdParam || !isValidVehicleId) return;
    if (!allAnswered) {
      setSubmitError("Please answer all questions.");
      return;
    }
    setSubmitError(null);
    setSuccess(null);
    setAlreadySubmitted(false);
    setSubmitting(true);
    try {
      const payload: ChecklistAnswerInput[] = QUESTIONS.map((q) => {
        const a = answers[q.key];
        return {
          questionKey: q.key,
          answer: a.answer as "OK" | "DEVIATION" | "NOT_APPLICABLE",
          comment: a.comment?.trim() ? a.comment.trim() : undefined,
        };
      });
      const submitResult = await submitChecklist(vehicleIdParam, payload);
      const hasDeviation = payload.some((a) => a.answer === "DEVIATION");
      await createVehicleCheckIn({
        vehicleId: Number(vehicleIdParam),
        allOk: !hasDeviation,
      });
      if (submitResult.createdDefectIds && submitResult.createdDefectIds.length > 0) {
        setDefectFocusId(String(submitResult.createdDefectIds[0]));
        setDefectDialogOpen(true);
      } else {
        navigate(tenantPath(slug, returnTo), { state: { refreshCheckIns: true } });
      }
    } catch (err) {
      if (err instanceof ApiError && err.code === "CHECKLIST_ALREADY_SUBMITTED") {
        setAlreadySubmitted(true);
        setSubmitError("Checklist already submitted today.");
      } else {
        const message = err instanceof ApiError ? err.message : "Failed to submit checklist";
        setSubmitError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateCheckInNow = async () => {
    if (!vehicleIdParam || !isValidVehicleId) return;
    setSubmitError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      await createVehicleCheckIn({
        vehicleId: Number(vehicleIdParam),
        allOk: true,
      });
      navigate(tenantPath(slug, returnTo), { state: { refreshCheckIns: true } });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to create vehicle check-in";
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!vehicleIdParam || !isValidVehicleId) {
    return (
      <div className="min-h-screen flex items-start justify-center p-5">
        <Card>
          <SectionHeader title="Daily Checklist" subtitle="No vehicle selected." />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(tenantPath(slug, "/driver/timesheet"))}
          >
            Back to timesheet
          </Button>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-start justify-center p-5">
        <Card>
          <p>Loading checklist...</p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-start justify-center p-5">
        <Card>
          <div className="error">{error}</div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(tenantPath(slug, "/driver/timesheet"))}
          >
            Back to timesheet
          </Button>
        </Card>
      </div>
    );
  }

  const completed = status?.completed;

  return (
    <div className="min-h-screen flex items-start justify-center p-5">
      <Card>
        <SectionHeader
          title="Daily Checklist"
          subtitle={`Vehicle: ${vehicle?.regNumber || vehicleIdParam}${vehicle?.name ? ` (${vehicle.name})` : ""}`}
        />
        <p className="muted">
          Status: {completed ? "Completed" : "Pending"}
        </p>
        {status?.checklistId && <p className="muted break-words">Checklist ID: {status.checklistId}</p>}

        {completed ? (
          <>
            <div className="error" style={{ borderColor: "#d1fae5", background: "#ecfdf3", color: "#166534" }}>
              You already submitted a checklist for this vehicle today.
            </div>
            <Button
              variant="primary"
              className="mt-3"
              disabled={submitting}
              onClick={handleCreateCheckInNow}
            >
              {submitting ? "Submitting..." : "Create vehicle check-in now"}
            </Button>
          </>
        ) : (
          <>
            {submitError && <div className="error">{submitError}</div>}
            {alreadySubmitted && (
              <Button
                variant="primary"
                className="mb-3"
                disabled={submitting}
                onClick={handleCreateCheckInNow}
              >
                {submitting ? "Submitting..." : "Create vehicle check-in now"}
              </Button>
            )}
            {success && <p className="muted">{success}</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {QUESTIONS.map((q) => {
                const ans = answers[q.key];
                const isDeviation = ans?.answer === "DEVIATION";
                return (
                  <div
                    key={q.key}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: "10px",
                      padding: "12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{q.label}</div>
                    <FormField label="Answer">
                      <select
                        value={ans?.answer || ""}
                        onChange={(e) =>
                          handleSelectChange(
                            q.key,
                            e.target.value as "OK" | "DEVIATION" | "NOT_APPLICABLE" | ""
                          )
                        }
                        style={{
                          padding: "10px",
                          borderRadius: "8px",
                          border: "1px solid #d1d5db",
                        }}
                      >
                        <option value="">Select...</option>
                        <option value="OK">OK</option>
                        <option value="DEVIATION">Deviation</option>
                        <option value="NOT_APPLICABLE">Not applicable</option>
                      </select>
                    </FormField>
                    {isDeviation && (
                      <FormField label="Comment (optional)">
                        <textarea
                          placeholder="Comment (optional)"
                          value={ans?.comment || ""}
                          onChange={(e) => handleCommentChange(q.key, e.target.value)}
                          style={{
                            minHeight: "60px",
                            padding: "10px",
                            borderRadius: "8px",
                            border: "1px solid #d1d5db",
                          }}
                          maxLength={500}
                        />
                      </FormField>
                    )}
                  </div>
                );
              })}
            </div>
            <Button
              variant="primary"
              className="mt-3"
              disabled={submitting || !allAnswered}
              onClick={handleSubmit}
            >
              {submitting ? "Submitting..." : "Submit checklist"}
            </Button>
          </>
        )}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(tenantPath(slug, returnTo))}
          >
            My Timesheet
          </Button>
        </div>
      </Card>
      {defectDialogOpen ? (
        <div
          role="presentation"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 50,
          }}
        >
          <Card className="max-w-[420px] w-full max-h-[80vh] overflow-y-auto">
            <ModalShell
              title="Defects recorded"
              onClose={() => {
                setDefectDialogOpen(false);
                navigate(tenantPath(slug, returnTo), { state: { refreshCheckIns: true } });
              }}
              footer={(
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setDefectDialogOpen(false);
                      navigate(tenantPath(slug, returnTo), { state: { refreshCheckIns: true } });
                    }}
                  >
                    Continue
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setDefectDialogOpen(false);
                      const addPhotosTarget = defectFocusId
                        ? `/driver/defects/${defectFocusId}`
                        : "/driver/defects";
                      navigate(tenantPath(slug, addPhotosTarget));
                    }}
                  >
                    Add photos
                  </Button>
                </>
              )}
            >
              <p className="muted">Defects were recorded from your checklist. Do you want to add photos now?</p>
            </ModalShell>
          </Card>
        </div>
      ) : null}
    </div>
  );
};

export default ChecklistPage;
