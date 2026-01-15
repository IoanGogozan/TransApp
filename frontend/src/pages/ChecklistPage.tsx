import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getChecklistStatus, submitChecklist } from "../api/checklists";
import { createVehicleCheckIn } from "../api/timesheets";
import { getVehicleById } from "../api/vehicles";
import { ApiError } from "../api/http";
import { ChecklistQuestion, ChecklistAnswerInput, ChecklistStatus } from "../types/checklist";
import { Vehicle } from "../types/vehicle";
import { tenantPath } from "../utils/tenantPath";

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
      <div className="page">
        <div className="card">
          <h1>Daily Checklist</h1>
          <p className="muted">No vehicle selected.</p>
          <Link className="button" to={tenantPath(slug, "/driver/timesheet")} style={{ width: "auto" }}>
            Back to timesheet
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page">
        <div className="card">
          <p>Loading checklist...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="card">
          <div className="error">{error}</div>
          <Link className="button" to={tenantPath(slug, "/driver/timesheet")} style={{ width: "auto" }}>
            Back to timesheet
          </Link>
        </div>
      </div>
    );
  }

  const completed = status?.completed;

  return (
    <div className="page">
      <div className="card">
        <h1>Daily Checklist</h1>
        <p className="muted">
          Vehicle: {vehicle?.regNumber || vehicleIdParam} {vehicle?.name ? `(${vehicle.name})` : ""}
        </p>
        <p className="muted">Status: {completed ? "Completed" : "Pending"}</p>
        {status?.checklistId && <p className="muted">Checklist ID: {status.checklistId}</p>}

        {completed ? (
          <>
            <div className="error" style={{ borderColor: "#d1fae5", background: "#ecfdf3", color: "#166534" }}>
              You already submitted a checklist for this vehicle today.
            </div>
            <button
              className="button primary"
              style={{ marginTop: "12px" }}
              disabled={submitting}
              onClick={handleCreateCheckInNow}
            >
              {submitting ? "Submitting..." : "Create vehicle check-in now"}
            </button>
          </>
        ) : (
          <>
            {submitError && <div className="error">{submitError}</div>}
            {alreadySubmitted && (
              <button
                className="button primary"
                style={{ marginBottom: "12px" }}
                disabled={submitting}
                onClick={handleCreateCheckInNow}
              >
                {submitting ? "Submitting..." : "Create vehicle check-in now"}
              </button>
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
                    {isDeviation && (
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
                    )}
                  </div>
                );
              })}
            </div>
            <button className="button" style={{ marginTop: "12px" }} disabled={submitting || !allAnswered} onClick={handleSubmit}>
              {submitting ? "Submitting..." : "Submit checklist"}
            </button>
          </>
        )}
        <div className="row" style={{ marginTop: "12px" }}>
          <Link className="button" to={tenantPath(slug, returnTo)} style={{ width: "auto" }}>
            My Timesheet
          </Link>
        </div>
      </div>
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
          <div className="card" style={{ maxWidth: "420px", width: "100%" }}>
            <h2 style={{ marginTop: 0 }}>Defects recorded</h2>
            <p className="muted">Defects were recorded from your checklist. Do you want to add photos now?</p>
            <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
              <button
                className="button"
                type="button"
                style={{ width: "auto" }}
                onClick={() => {
                  setDefectDialogOpen(false);
                  const addPhotosTarget = defectFocusId
                    ? `/driver/defects/${defectFocusId}`
                    : "/driver/defects";
                  navigate(tenantPath(slug, addPhotosTarget));
                }}
              >
                Add photos
              </button>
              <button
                className="button secondary"
                type="button"
                style={{ width: "auto" }}
                onClick={() => {
                  setDefectDialogOpen(false);
                  navigate(tenantPath(slug, returnTo), { state: { refreshCheckIns: true } });
                }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ChecklistPage;
