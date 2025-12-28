import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getChecklistStatus, submitChecklist } from "../api/checklists";
import { getVehicleById } from "../api/vehicles";
import { ApiError } from "../api/http";
import { getActiveVehicleId } from "../driver/activeVehicle";
import { ChecklistQuestion, ChecklistAnswerInput, ChecklistStatus } from "../types/checklist";
import { Vehicle } from "../types/vehicle";

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
  const activeVehicleId = getActiveVehicleId();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [status, setStatus] = useState<ChecklistStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [answers, setAnswers] = useState<AnswerState>(() =>
    QUESTIONS.reduce(
      (acc, q) => ({
        ...acc,
        [q.key]: { answer: "", comment: "" },
      }),
      {} as AnswerState
    )
  );

  const allAnswered = useMemo(() => QUESTIONS.every((q) => answers[q.key]?.answer), [answers]);

  useEffect(() => {
    const load = async () => {
      if (!activeVehicleId) return;
      setLoading(true);
      setError(null);
      try {
        const [veh, stat] = await Promise.all([getVehicleById(activeVehicleId), getChecklistStatus(activeVehicleId)]);
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
  }, [activeVehicleId]);

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
    if (!activeVehicleId) return;
    if (!allAnswered) {
      setSubmitError("Please answer all questions.");
      return;
    }
    setSubmitError(null);
    setSuccess(null);
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
      await submitChecklist(activeVehicleId, payload);
      setSuccess("Checklist submitted");
      const stat = await getChecklistStatus(activeVehicleId);
      setStatus(stat);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to submit checklist";
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!activeVehicleId) {
    return (
      <div className="page">
        <div className="card">
          <h1>Daily Checklist</h1>
          <p className="muted">No active vehicle selected.</p>
          <Link className="button" to="/driver/vehicles" style={{ width: "auto" }}>
            Select a vehicle
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
          <Link className="button" to="/driver/vehicles" style={{ width: "auto" }}>
            Back to vehicles
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
          Vehicle: {vehicle?.regNumber || activeVehicleId} {vehicle?.name ? `(${vehicle.name})` : ""}
        </p>
        <p className="muted">Status: {completed ? "Completed" : "Pending"}</p>
        {status?.checklistId && <p className="muted">Checklist ID: {status.checklistId}</p>}

        {completed ? (
          <div className="error" style={{ borderColor: "#d1fae5", background: "#ecfdf3", color: "#166534" }}>
            Checklist already submitted for today.
          </div>
        ) : (
          <>
            {submitError && <div className="error">{submitError}</div>}
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
          <Link className="button" to="/driver/shift" style={{ width: "auto" }}>
            Go to Shift
          </Link>
          <Link className="button" to="/driver/timesheet" style={{ width: "auto" }}>
            My Timesheet
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ChecklistPage;
