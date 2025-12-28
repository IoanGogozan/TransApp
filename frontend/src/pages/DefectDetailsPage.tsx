import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  addDefectComment,
  assignDefect,
  getDefectById,
  listDefectComments,
  listDefectHistory,
  updateDefectStatus,
} from "../api/defects";
import { Defect, DefectComment, DefectEvent, DefectStatus } from "../types/defect";
import { listCompanyUsers } from "../api/users";
import { User } from "../types/user";
import { ApiError } from "../api/http";
import { formatDateTime } from "../utils/time";

const statusOptions: DefectStatus[] = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

const DefectDetailsPage = () => {
  const { defectId } = useParams<{ defectId: string }>();
  const [defect, setDefect] = useState<Defect | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusValue, setStatusValue] = useState<DefectStatus | "">("");
  const [saving, setSaving] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updated, setUpdated] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [assignValue, setAssignValue] = useState<string>("");
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignUpdated, setAssignUpdated] = useState(false);
  const [comments, setComments] = useState<DefectComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [commentSaving, setCommentSaving] = useState(false);
  const [history, setHistory] = useState<DefectEvent[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const isPlainObject = (v: unknown): v is Record<string, unknown> =>
    !!v && typeof v === "object" && !Array.isArray(v);

  const loadHistory = async (id: string) => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await listDefectHistory(id);
      const items = [...(res.items || [])].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setHistory(items);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to load history";
      setHistoryError(msg);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      if (!defectId) return;
      setLoading(true);
      setError(null);
      try {
        const [defectResult, usersResult] = await Promise.allSettled([getDefectById(defectId), listCompanyUsers()]);

        if (defectResult.status === "rejected") {
          throw defectResult.reason;
        }

        const res = defectResult.value;
        setDefect(res);
        setStatusValue(res.status);
        setAssignValue(res.assignedToUserId != null ? String(res.assignedToUserId) : "");

        if (usersResult.status === "fulfilled") {
          setUsers(usersResult.value);
        } else {
          console.warn("[defect] Failed to load users", usersResult.reason);
        }
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : "Failed to load defect";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [defectId]);

  useEffect(() => {
    const loadComments = async () => {
      if (!defectId) return;
      setCommentsLoading(true);
      setCommentsError(null);
      try {
        const res = await listDefectComments(defectId);
        setComments(res.items || []);
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : "Failed to load comments";
        setCommentsError(msg);
      } finally {
        setCommentsLoading(false);
      }
    };
    loadComments();
  }, [defectId]);

  useEffect(() => {
    if (defectId) {
      loadHistory(defectId);
    }
  }, [defectId]);

  const handleSaveStatus = async () => {
    if (!defectId || !statusValue) return;
    setSaving(true);
    setUpdateError(null);
    setUpdated(false);
    try {
      const updatedDefect = await updateDefectStatus(defectId, statusValue);
      setDefect(updatedDefect);
      setStatusValue(updatedDefect.status);
      setUpdated(true);
      await loadHistory(defectId);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to update status";
      setUpdateError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAssignee = async () => {
    if (!defectId) return;
    setAssignSaving(true);
    setAssignError(null);
    setAssignUpdated(false);
    try {
      const assignedToUserId = assignValue === "" ? null : Number(assignValue);
      const updatedDefect = await assignDefect(defectId, assignedToUserId);
      setDefect(updatedDefect);
      setAssignValue(updatedDefect.assignedToUserId != null ? String(updatedDefect.assignedToUserId) : "");
      setAssignUpdated(true);
      await loadHistory(defectId);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to update assignment";
      setAssignError(msg);
    } finally {
      setAssignSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!defectId) return;
    const message = newComment.trim();
    if (!message) return;
    setCommentSaving(true);
    setCommentsError(null);
    try {
      await addDefectComment(defectId, message);
      setNewComment("");
      const res = await listDefectComments(defectId);
      setComments(res.items || []);
      await loadHistory(defectId);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to add comment";
      setCommentsError(msg);
    } finally {
      setCommentSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="card">
          <p>Loading defect...</p>
        </div>
      </div>
    );
  }

  if (error || !defect) {
    return (
      <div className="page">
        <div className="card">
          <div className="error">{error || "Defect not found"}</div>
          <Link className="button" to="/admin/defects" style={{ width: "auto" }}>
            Back to list
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="card">
        <h1>{defect.title}</h1>
        <p className="muted">{defect.description || defect.checklistQuestionKey || "No description"}</p>
        <p className="muted">Status: {defect.status}</p>
        <p className="muted">Source: {defect.source}</p>
        <p className="muted">Vehicle: {defect.vehicleId || "-"}</p>
        <p className="muted">Reported by user: {defect.reportedByUserId || "-"}</p>
        <p className="muted">
          Assigned to user:{" "}
          {defect.assignedToUserId != null
            ? users.find((u) => String(u.id) === String(defect.assignedToUserId))?.email || defect.assignedToUserId
            : "-"}
        </p>
        <p className="muted">Created: {formatDateTime(defect.createdAt)}</p>
        <p className="muted">Updated: {defect.updatedAt ? formatDateTime(defect.updatedAt) : "-"}</p>
        <div className="field" style={{ marginTop: "12px", maxWidth: "260px" }}>
          <label htmlFor="statusSelect">Update status</label>
          <select
            id="statusSelect"
            value={statusValue}
            onChange={(e) => setStatusValue(e.target.value as DefectStatus)}
            style={{ padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }}
            disabled={saving}
          >
            {statusOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <button className="button" style={{ width: "auto", marginTop: "8px" }} onClick={handleSaveStatus} disabled={saving}>
            {saving ? "Saving..." : "Save status"}
          </button>
          {updateError ? <div className="error" style={{ marginTop: "6px" }}>{updateError}</div> : null}
          {updated && !updateError ? <div className="muted" style={{ marginTop: "6px" }}>Status updated</div> : null}
        </div>
        <div className="field" style={{ marginTop: "12px", maxWidth: "260px" }}>
          <label htmlFor="assignSelect">Assignment</label>
          <select
            id="assignSelect"
            value={assignValue}
            onChange={(e) => {
              setAssignValue(e.target.value);
              setAssignError(null);
              setAssignUpdated(false);
            }}
            style={{ padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }}
            disabled={assignSaving || users.length === 0}
          >
            <option value="">Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.email}
              </option>
            ))}
          </select>
          <button
            className="button"
            style={{ width: "auto", marginTop: "8px" }}
            onClick={handleSaveAssignee}
            disabled={assignSaving || users.length === 0}
          >
            {assignSaving ? "Saving..." : "Save assignee"}
          </button>
          {assignError ? <div className="error" style={{ marginTop: "6px" }}>{assignError}</div> : null}
          {assignUpdated && !assignError ? <div className="muted" style={{ marginTop: "6px" }}>Assignment updated</div> : null}
          {users.length === 0 ? <div className="muted" style={{ marginTop: "6px" }}>Users unavailable</div> : null}
        </div>
        <div className="field" style={{ marginTop: "16px" }}>
          <h2 style={{ marginBottom: "8px" }}>Comments</h2>
          {commentsLoading ? <p className="muted">Loading comments...</p> : null}
          {commentsError ? <div className="error" style={{ marginBottom: "8px" }}>{commentsError}</div> : null}
          {comments.length === 0 && !commentsLoading && !commentsError ? <p className="muted">No comments.</p> : null}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
            {comments.map((c) => (
              <div key={c.id} style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "8px" }}>
                <div style={{ fontWeight: 600 }}>{c.message}</div>
                <div className="muted" style={{ fontSize: "12px" }}>
                  {formatDateTime(c.createdAt)} {c.actorUserId != null ? `· User: ${c.actorUserId}` : ""}
                </div>
              </div>
            ))}
          </div>
          <label htmlFor="newComment">Add comment</label>
          <textarea
            id="newComment"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
            style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }}
            disabled={commentSaving}
          />
          <button
            className="button"
            style={{ width: "auto", marginTop: "8px" }}
            onClick={handleAddComment}
            disabled={commentSaving || !newComment.trim()}
          >
            {commentSaving ? "Saving..." : "Add comment"}
          </button>
        </div>
        <div className="field" style={{ marginTop: "16px" }}>
          <h2 style={{ marginBottom: "8px" }}>History</h2>
          {historyLoading ? <p className="muted">Loading history...</p> : null}
          {historyError ? <div className="error" style={{ marginBottom: "8px" }}>{historyError}</div> : null}
          {history.length === 0 && !historyLoading && !historyError ? <p className="muted">No history.</p> : null}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {history.map((h) => {
              const actorEmail = users.find((u) => String(u.id) === String(h.actorUserId))?.email;
              let statusChange = "";
              if (h.type === "STATUS_CHANGED" && isPlainObject(h.data)) {
                const from = typeof h.data.from === "string" ? h.data.from : undefined;
                const to = typeof h.data.to === "string" ? h.data.to : undefined;
                if (from || to) {
                  statusChange = ` (from ${from || "-"} to ${to || "-"})`;
                }
              }
              return (
                <div key={h.id} style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "8px" }}>
                  <div style={{ fontWeight: 600 }}>
                    {h.type}
                    {statusChange}
                  </div>
                  <div className="muted" style={{ fontSize: "12px" }}>
                    {formatDateTime(h.createdAt)} {h.actorUserId != null ? `· User: ${actorEmail || h.actorUserId}` : ""}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="row" style={{ marginTop: "12px" }}>
          <Link className="button" to="/admin/defects" style={{ width: "auto" }}>
            Back to list
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DefectDetailsPage;
