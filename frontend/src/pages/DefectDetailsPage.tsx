import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  addDefectComment,
  assignDefect,
  deleteDefectAttachment,
  downloadDefectAttachment,
  getDefectById,
  listDefectComments,
  listDefectAttachments,
  listDefectHistory,
  uploadDefectAttachment,
  updateDefectStatus,
} from "../api/defects";
import { Defect, DefectAttachment, DefectComment, DefectEvent, DefectStatus } from "../types/defect";
import { listCompanyUsers } from "../api/users";
import { User } from "../types/user";
import { ApiError } from "../api/http";
import { formatDateTime } from "../utils/time";
import { getDefectDisplayTitle } from "../utils/defects";
import { getToken } from "../auth/token";
import { tenantPath } from "../utils/tenantPath";

const statusOptions: DefectStatus[] = ["OPEN", "IN_PROGRESS", "RESOLVED"];

const DefectDetailsPage = () => {
  const { defectId, companySlug } = useParams<{ defectId: string; companySlug?: string }>();
  const slug = companySlug;
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
  const [attachments, setAttachments] = useState<DefectAttachment[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [attachmentsError, setAttachmentsError] = useState<string | null>(null);
  const [attachmentPreviewErrors, setAttachmentPreviewErrors] = useState<Record<string, boolean>>({});
  const [attachmentPreviewUrls, setAttachmentPreviewUrls] = useState<Record<string, string>>({});
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentTitle, setAttachmentTitle] = useState("");
  const [attachmentSaving, setAttachmentSaving] = useState(false);
  const [attachmentDeleting, setAttachmentDeleting] = useState<string | number | null>(null);
  const [activityTab, setActivityTab] = useState<"comments" | "history">("comments");
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [activityModalTab, setActivityModalTab] = useState<"comments" | "history">("comments");
  const isResolved = defect?.status === "RESOLVED";
  const canEditAttachments = defect?.status === "OPEN" || defect?.status === "IN_PROGRESS";

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

  useEffect(() => {
    const loadAttachments = async () => {
      if (!defectId) return;
      setAttachmentsLoading(true);
      setAttachmentsError(null);
      try {
        const res = await listDefectAttachments(defectId);
        setAttachments(res.items || []);
        setAttachmentPreviewErrors({});
        setAttachmentPreviewUrls({});
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : "Failed to load attachments";
        setAttachmentsError(msg);
      } finally {
        setAttachmentsLoading(false);
      }
    };
    loadAttachments();
  }, [defectId]);

  const refreshAttachments = async () => {
    if (!defectId) return;
    try {
      const res = await listDefectAttachments(defectId);
      setAttachments(res.items || []);
      setAttachmentPreviewErrors({});
      setAttachmentPreviewUrls({});
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to load attachments";
      setAttachmentsError(msg);
    }
  };

  useEffect(() => {
    if (!defectId || attachments.length === 0) return;
    let isCancelled = false;
    const createdUrls: string[] = [];
    const loadPreviews = async () => {
      const token = getToken();
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      const previewUrls: Record<string, string> = {};
      for (const attachment of attachments) {
        if (attachment.purgedAt) continue;
        try {
          const res = await fetch(
            `/api/v1/defects/${defectId}/attachments/${attachment.id}/download`,
            { headers },
          );
          if (!res.ok) {
            throw new Error("Preview fetch failed");
          }
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          createdUrls.push(url);
          previewUrls[String(attachment.id)] = url;
        } catch {
          if (!isCancelled) {
            setAttachmentPreviewErrors((prev) => ({
              ...prev,
              [String(attachment.id)]: true,
            }));
          }
        }
      }

      if (!isCancelled) {
        setAttachmentPreviewUrls(previewUrls);
      }
    };

    loadPreviews();

    return () => {
      isCancelled = true;
      createdUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [attachments, defectId]);

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

  const handleUploadAttachment = async () => {
    if (!defectId || !attachmentFile) return;
    setAttachmentSaving(true);
    setAttachmentsError(null);
    try {
      await uploadDefectAttachment(defectId, attachmentFile, attachmentTitle.trim() || undefined);
      setAttachmentFile(null);
      setAttachmentTitle("");
      await refreshAttachments();
      await loadHistory(defectId);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to upload attachment";
      setAttachmentsError(msg);
    } finally {
      setAttachmentSaving(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string | number) => {
    if (!defectId) return;
    setAttachmentDeleting(attachmentId);
    setAttachmentsError(null);
    try {
      await deleteDefectAttachment(defectId, attachmentId);
      await refreshAttachments();
      await loadHistory(defectId);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to delete attachment";
      setAttachmentsError(msg);
    } finally {
      setAttachmentDeleting(null);
    }
  };

  const handleDownloadAttachment = async (attachment: DefectAttachment) => {
    if (!defectId || attachment.purgedAt) return;
    setAttachmentsError(null);
    try {
      await downloadDefectAttachment(defectId, attachment);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to download attachment";
      setAttachmentsError(msg);
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
          <Link className="button" to={tenantPath(slug, "/admin/defects")} style={{ width: "auto" }}>
            Back to list
          </Link>
        </div>
      </div>
    );
  }

  const reportedLabel =
    defect.reportedByUser?.phone ||
    defect.reportedByUser?.username ||
    defect.reportedByUser?.email ||
    defect.reportedByUserId ||
    "-";
  const assignedLabel =
    defect.assignedToUser?.phone ||
    defect.assignedToUser?.username ||
    defect.assignedToUser?.email ||
    defect.assignedToUserId ||
    "-";
  const vehicleLabel =
    defect.vehicle?.regNumber || defect.vehicle?.name
      ? `${defect.vehicle?.regNumber || defect.vehicleId || "-"}${defect.vehicle?.name ? ` - ${defect.vehicle.name}` : ""}`
      : defect.vehicleId || "-";
  const defectTitle = getDefectDisplayTitle(defect);
  const historyLabels: Record<string, string> = {
    CREATED: "Created",
    STATUS_CHANGED: "Status changed",
    ASSIGNED: "Assigned",
    UNASSIGNED: "Unassigned",
    COMMENTED: "Comment added",
    DETAILS_UPDATED: "Details updated",
    ATTACHMENT_ADDED: "Attachment added",
    ATTACHMENT_DELETED: "Attachment deleted",
    ARCHIVED: "Archived",
    ATTACHMENT_PURGED: "Attachment purged",
  };
  const sortedComments = [...comments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const latestComments = sortedComments.slice(0, 3);
  const sortedHistory = history
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const latestHistory = sortedHistory.slice(0, 3);

  return (
    <div className="page defect-details-page">
      <style>
        {`
          .defect-details-page {
            align-items: flex-start;
          }
          .defect-details-container {
            width: 100%;
          }
          .max-w-6xl {
            max-width: 72rem;
          }
          .mx-auto {
            margin-left: auto;
            margin-right: auto;
          }
          .px-4 {
            padding-left: 16px;
            padding-right: 16px;
          }
          .defect-header-compact {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 12px;
            flex-wrap: wrap;
            margin-bottom: 16px;
          }
          .defect-title-row {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
          }
          .defect-title-row h1 {
            margin: 0;
          }
          .defect-status-badge {
            font-size: 12px;
            font-weight: 600;
            padding: 4px 10px;
            border-radius: 999px;
            background: #f3f4f6;
            color: #111827;
            border: 1px solid #e5e7eb;
          }
          .defect-status-open {
            background: #ecfdf3;
            color: #166534;
            border-color: #bbf7d0;
          }
          .defect-status-in_progress {
            background: #eff6ff;
            color: #1d4ed8;
            border-color: #bfdbfe;
          }
          .defect-status-resolved {
            background: #fef3c7;
            color: #92400e;
            border-color: #fde68a;
          }
          .defect-meta-line {
            margin: 6px 0 0;
            font-size: 13px;
          }
          .defect-card-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .defect-card {
            min-height: 420px;
            display: flex;
            flex-direction: column;
          }
          .defect-card-body {
            flex: 1;
            overflow: auto;
          }
          .defect-attachments-grid {
            display: grid;
            gap: 8px;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            margin-bottom: 12px;
          }
          .defect-attachment-thumb {
            width: 100%;
            height: 110px;
            border-radius: 8px;
            background: #f9fafb;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
          }
          .defect-tabs {
            display: flex;
            gap: 8px;
            margin-bottom: 8px;
          }
          .defect-tab {
            border: 1px solid #e5e7eb;
            background: #f3f4f6;
            color: #111827;
            border-radius: 999px;
            padding: 4px 10px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
          }
          .defect-tab.active {
            background: #111827;
            color: #fff;
            border-color: #111827;
          }
          .defect-action-row {
            display: flex;
            gap: 8px;
            align-items: center;
          }
          .defect-action-row select {
            flex: 1;
          }
          .defect-kv {
            display: flex;
            flex-direction: column;
            gap: 6px;
            margin-bottom: 12px;
          }
          @media (min-width: 1024px) {
            .defect-card-grid {
              grid-template-columns: repeat(3, minmax(0, 1fr));
            }
            .defect-card {
              height: 420px;
            }
          }
          @media (max-width: 640px) {
            .defect-action-row {
              flex-direction: column;
              align-items: stretch;
            }
          }
        `}
      </style>
      <div className="defect-details-container max-w-6xl mx-auto px-4">
        <div className="defect-header-compact">
          <div>
            <div className="defect-title-row">
              <h1>{defectTitle}</h1>
              <span className={`defect-status-badge defect-status-${defect.status.toLowerCase()}`}>
                {defect.status}
              </span>
            </div>
            <p className="muted defect-meta-line">
              Source: {defect.source} | Vehicle: {vehicleLabel} | Reported by: {reportedLabel} | Created: {formatDateTime(defect.createdAt)}
            </p>
          </div>
          <Link className="button secondary" to={tenantPath(slug, "/admin/defects")} style={{ width: "auto" }}>
            Back to list
          </Link>
        </div>
        <div className="defect-card-grid">
          <div className="card p-6 defect-card">
            <div className="defect-card-body">
              <h2 style={{ marginTop: 0 }}>Overview</h2>
              <div className="defect-kv muted">
                {defect.source === "MANUAL" ? <div>Source: {defect.source}</div> : null}
                {defect.checklistQuestionKey ? <div>Checklist: {defect.checklistQuestionKey}</div> : null}
                <div>Assigned to: {assignedLabel}</div>
                <div>Updated: {defect.updatedAt ? formatDateTime(defect.updatedAt) : "-"}</div>
              </div>
              <label htmlFor="statusSelect">Status</label>
              <div className="defect-action-row">
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
                <button
                  className="button"
                  style={{ width: "auto" }}
                  onClick={handleSaveStatus}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
              {updateError ? <div className="error" style={{ marginTop: "8px" }}>{updateError}</div> : null}
              {updated && !updateError ? <div className="muted" style={{ marginTop: "8px" }}>Status updated</div> : null}
            </div>
          </div>
          <div className="card p-6 defect-card">
            <div className="defect-card-body">
              <h2 style={{ marginTop: 0 }}>Attachments</h2>
              {attachmentsLoading ? <p className="muted">Loading attachments...</p> : null}
              {attachmentsError ? <div className="error" style={{ marginBottom: "8px" }}>{attachmentsError}</div> : null}
              {attachments.length === 0 && !attachmentsLoading && !attachmentsError ? (
                <p className="muted">No attachments.</p>
              ) : null}
              <div className="defect-attachments-grid">
                {attachments.map((a) => (
                  <div key={a.id} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div className="defect-attachment-thumb">
                      {a.purgedAt ? (
                        <span className="muted">Purged</span>
                      ) : attachmentPreviewUrls[String(a.id)] ? (
                        <img
                          src={attachmentPreviewUrls[String(a.id)]}
                          alt={a.title || "attachment"}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : attachmentPreviewErrors[String(a.id)] ? (
                        <span className="muted">(preview unavailable)</span>
                      ) : (
                        <span className="muted">Loading preview...</span>
                      )}
                    </div>
                    <div className="muted" style={{ fontSize: "12px" }}>{a.title || "(image)"}</div>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {!a.purgedAt ? (
                        <button
                          className="button secondary"
                          style={{ width: "auto" }}
                          onClick={() => handleDownloadAttachment(a)}
                        >
                          Download
                        </button>
                      ) : null}
                      {canEditAttachments && !a.purgedAt ? (
                        <button
                          className="button secondary"
                          style={{ width: "auto" }}
                          onClick={() => handleDeleteAttachment(a.id)}
                          disabled={attachmentDeleting === a.id}
                        >
                          {attachmentDeleting === a.id ? "Deleting..." : "Delete"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
              {canEditAttachments ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label htmlFor="attachmentFile">Upload image</label>
                  <input
                    id="attachmentFile"
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
                    disabled={attachmentSaving}
                  />
                  <label htmlFor="attachmentTitle">Title (optional)</label>
                  <input
                    id="attachmentTitle"
                    value={attachmentTitle}
                    onChange={(e) => setAttachmentTitle(e.target.value)}
                    placeholder="Attachment title"
                    disabled={attachmentSaving}
                    style={{ padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }}
                  />
                  <button
                    className="button"
                    style={{ width: "auto" }}
                    onClick={handleUploadAttachment}
                    disabled={attachmentSaving || !attachmentFile}
                  >
                    {attachmentSaving ? "Uploading..." : "Upload"}
                  </button>
                </div>
              ) : isResolved ? (
                <p className="muted">Attachments locked</p>
              ) : null}
            </div>
          </div>
          <div className="card p-6 defect-card">
            <div className="defect-card-body">
              <h2 style={{ marginTop: 0 }}>Activity</h2>
              <div className="defect-tabs">
                <button
                  className={`defect-tab${activityTab === "comments" ? " active" : ""}`}
                  type="button"
                  onClick={() => setActivityTab("comments")}
                >
                  Comments
                </button>
                <button
                  className={`defect-tab${activityTab === "history" ? " active" : ""}`}
                  type="button"
                  onClick={() => setActivityTab("history")}
                >
                  History
                </button>
              </div>
              {activityTab === "comments" ? (
                <>
                  {commentsLoading ? <p className="muted">Loading comments...</p> : null}
                  {commentsError ? <div className="error" style={{ marginBottom: "8px" }}>{commentsError}</div> : null}
                  {latestComments.length === 0 && !commentsLoading && !commentsError ? (
                    <p className="muted">No comments.</p>
                  ) : null}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
                    {latestComments.map((c) => (
                      <div key={c.id} style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "8px" }}>
                        <div style={{ fontWeight: 600 }}>{c.message}</div>
                        <div className="muted" style={{ fontSize: "12px" }}>
                          {formatDateTime(c.createdAt)} {c.actorUserId != null ? `User: ${c.actorUserId}` : ""}
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
                  <button
                    className="button secondary"
                    type="button"
                    style={{ width: "auto", marginTop: "12px" }}
                    onClick={() => {
                      setActivityModalTab("comments");
                      setActivityModalOpen(true);
                    }}
                  >
                    View all
                  </button>
                </>
              ) : (
                <>
                  {historyLoading ? <p className="muted">Loading history...</p> : null}
                  {historyError ? <div className="error" style={{ marginBottom: "8px" }}>{historyError}</div> : null}
                  {latestHistory.length === 0 && !historyLoading && !historyError ? <p className="muted">No history.</p> : null}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
                    {latestHistory.map((h) => {
                      const actorEmail = users.find((u) => String(u.id) === String(h.actorUserId))?.email;
                      const label = historyLabels[h.type] || h.type;
                      const actorLabel = h.actorUserId != null ? actorEmail || h.actorUserId : "Unknown";
                      const data = isPlainObject(h.data) ? (h.data as Record<string, unknown>) : null;
                      const dataEntries = data ? Object.entries(data).slice(0, 6) : [];
                      return (
                        <div key={h.id} style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "8px" }}>
                          <div style={{ fontWeight: 600 }}>{label}</div>
                          <div className="muted" style={{ fontSize: "12px" }}>
                            {formatDateTime(h.createdAt)} User: {actorLabel}
                          </div>
                          {data ? (
                            <details style={{ marginTop: "6px" }}>
                              <summary className="muted" style={{ fontSize: "12px", cursor: "pointer" }}>
                                Data
                              </summary>
                              <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "6px" }}>
                                {dataEntries.map(([key, value]) => (
                                  <div key={key} className="muted" style={{ fontSize: "12px" }}>
                                    {key}: {typeof value === "string" ? value : JSON.stringify(value)}
                                  </div>
                                ))}
                                {Object.keys(data).length > dataEntries.length ? (
                                  <div className="muted" style={{ fontSize: "12px" }}>
                                    ...more
                                  </div>
                                ) : null}
                              </div>
                            </details>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                  <button
                    className="button secondary"
                    type="button"
                    style={{ width: "auto" }}
                    onClick={() => {
                      setActivityModalTab("history");
                      setActivityModalOpen(true);
                    }}
                  >
                    View all
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        {activityModalOpen ? (
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
            <div className="card" style={{ maxWidth: "720px", width: "100%" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                <h2 style={{ margin: 0 }}>{activityModalTab === "comments" ? "All comments" : "Full history"}</h2>
                <button
                  className="button secondary"
                  type="button"
                  style={{ width: "auto" }}
                  onClick={() => setActivityModalOpen(false)}
                >
                  Close
                </button>
              </div>
              <div style={{ marginTop: "12px", maxHeight: "60vh", overflowY: "auto" }}>
                {activityModalTab === "comments" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {sortedComments.map((c) => (
                      <div key={c.id} style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "8px" }}>
                        <div style={{ fontWeight: 600 }}>{c.message}</div>
                        <div className="muted" style={{ fontSize: "12px" }}>
                          {formatDateTime(c.createdAt)} {c.actorUserId != null ? `User: ${c.actorUserId}` : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {sortedHistory.map((h) => {
                      const actorEmail = users.find((u) => String(u.id) === String(h.actorUserId))?.email;
                      const label = historyLabels[h.type] || h.type;
                      const actorLabel = h.actorUserId != null ? actorEmail || h.actorUserId : "Unknown";
                      const data = isPlainObject(h.data) ? (h.data as Record<string, unknown>) : null;
                      const dataEntries = data ? Object.entries(data).slice(0, 6) : [];
                      return (
                        <div key={h.id} style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "8px" }}>
                          <div style={{ fontWeight: 600 }}>{label}</div>
                          <div className="muted" style={{ fontSize: "12px" }}>
                            {formatDateTime(h.createdAt)} User: {actorLabel}
                          </div>
                          {data ? (
                            <details style={{ marginTop: "6px" }}>
                              <summary className="muted" style={{ fontSize: "12px", cursor: "pointer" }}>
                                Data
                              </summary>
                              <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "6px" }}>
                                {dataEntries.map(([key, value]) => (
                                  <div key={key} className="muted" style={{ fontSize: "12px" }}>
                                    {key}: {typeof value === "string" ? value : JSON.stringify(value)}
                                  </div>
                                ))}
                                {Object.keys(data).length > dataEntries.length ? (
                                  <div className="muted" style={{ fontSize: "12px" }}>
                                    ...more
                                  </div>
                                ) : null}
                              </div>
                            </details>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default DefectDetailsPage;







