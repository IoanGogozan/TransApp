import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  deleteDefectAttachment,
  getDefectById,
  listDefectComments,
  listDefectAttachments,
  uploadDefectAttachment,
  updateDefectAdminNote,
  updateDefectStatus,
} from "../api/defects";
import { Defect, DefectAttachment, DefectComment, DefectStatus } from "../types/defect";
import { ApiError } from "../api/http";
import { formatDateTime } from "../utils/time";
import { getDefectDisplayTitle } from "../utils/defects";
import { getToken } from "../auth/token";
import { tenantPath } from "../utils/tenantPath";
import TableWrap from "../components/TableWrap";
import Button from "../components/ui/Button";
import ButtonLink from "../components/ui/ButtonLink";
import Card from "../components/ui/Card";
import FormField from "../components/ui/FormField";
import Input from "../components/ui/Input";
import SectionHeader from "../components/ui/SectionHeader";
import ModalShell from "../components/ui/ModalShell";

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
  const [adminEditMode, setAdminEditMode] = useState(false);
  const [adminDraft, setAdminDraft] = useState("");
  const [adminOriginal, setAdminOriginal] = useState("");
  const [adminNoteSaving, setAdminNoteSaving] = useState(false);
  const [adminNoteError, setAdminNoteError] = useState<string | null>(null);
  const [adminNoteSaved, setAdminNoteSaved] = useState(false);
  const [comments, setComments] = useState<DefectComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<DefectAttachment[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [attachmentsError, setAttachmentsError] = useState<string | null>(null);
  const [attachmentPreviewErrors, setAttachmentPreviewErrors] = useState<Record<string, boolean>>({});
  const [attachmentPreviewUrls, setAttachmentPreviewUrls] = useState<Record<string, string>>({});
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentTitle, setAttachmentTitle] = useState("");
  const [attachmentSaving, setAttachmentSaving] = useState(false);
  const [attachmentDeleting, setAttachmentDeleting] = useState<string | number | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [previewAlt, setPreviewAlt] = useState<string>("");
  const isResolved = defect?.status === "RESOLVED";
  const canEditAttachments = defect?.status === "OPEN" || defect?.status === "IN_PROGRESS";

  const isPlainObject = (v: unknown): v is Record<string, unknown> =>
    !!v && typeof v === "object" && !Array.isArray(v);

  useEffect(() => {
    const load = async () => {
      if (!defectId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await getDefectById(defectId);
        setDefect(res);
        setStatusValue(res.status);
        setAdminOriginal(res.adminNote ?? "");
        setAdminDraft(res.adminNote ?? "");
        setAdminEditMode(false);
        setAdminNoteSaved(false);
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

  const handleSaveAdminNote = async () => {
    if (!defectId) return;
    setAdminNoteSaving(true);
    setAdminNoteError(null);
    setAdminNoteSaved(false);
    try {
      await updateDefectAdminNote(defectId, adminDraft.trim() || null);
      const refreshed = await getDefectById(defectId);
      setDefect(refreshed);
      setAdminOriginal(refreshed.adminNote ?? "");
      setAdminDraft(refreshed.adminNote ?? "");
      setAdminEditMode(false);
      setAdminNoteSaved(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setAdminNoteError(err.message);
      } else {
        const msg = err instanceof ApiError ? err.message : "Failed to save admin note";
        setAdminNoteError(msg);
      }
    } finally {
      setAdminNoteSaving(false);
    }
  };

  useEffect(() => {
    if (!defect) return;
    if (adminEditMode) return;
    const note = defect.adminNote ?? "";
    setAdminOriginal(note);
    setAdminDraft(note);
  }, [defect, adminEditMode]);

  const openPreview = (src: string, alt: string) => {
    setPreviewSrc(src);
    setPreviewAlt(alt);
    setPreviewOpen(true);
  };

  const closePreview = () => {
    setPreviewOpen(false);
    setPreviewSrc(null);
    setPreviewAlt("");
  };

  useEffect(() => {
    if (!previewOpen) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closePreview();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewOpen]);

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
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to update status";
      setUpdateError(msg);
    } finally {
      setSaving(false);
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
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to delete attachment";
      setAttachmentsError(msg);
    } finally {
      setAttachmentDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-start justify-center p-5">
        <Card>
          <p>Loading defect...</p>
        </Card>
      </div>
    );
  }

  if (error || !defect) {
    return (
      <div className="min-h-screen flex items-start justify-center p-5">
        <Card>
          <div className="error">{error || "Defect not found"}</div>
          <ButtonLink to={tenantPath(slug, "/admin/defects")} variant="secondary" size="sm" className="w-auto">
            Back to list
          </ButtonLink>
        </Card>
      </div>
    );
  }

  const reportedLabel =
    defect.reportedByUser?.phone ||
    defect.reportedByUser?.username ||
    defect.reportedByUser?.email ||
    defect.reportedByUserId ||
    "-";
  const vehicleLabel =
    defect.vehicle?.regNumber || defect.vehicle?.name
      ? `${defect.vehicle?.regNumber || defect.vehicleId || "-"}${defect.vehicle?.name ? ` - ${defect.vehicle.name}` : ""}`
      : defect.vehicleId || "-";
  const defectTitle = getDefectDisplayTitle(defect);
  const sortedComments = [...comments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const latestComments = sortedComments.slice(0, 3);

  return (
    <div className="defect-details-page">
      <style>
        {`
          .defect-details-page {
            min-height: 100vh;
            display: flex;
            align-items: flex-start;
            justify-content: center;
            padding: 20px;
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
          .defect-details-table-wrap {
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            background: #fff;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
          }
          .defect-details-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
          }
          .defect-details-table th {
            width: 220px;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            text-align: left;
            padding: 8px 12px;
            border-bottom: 1px solid #f1f5f9;
            color: #64748b;
            background: #f9fafb;
            vertical-align: top;
          }
          .defect-details-table td {
            font-size: 13px;
            padding: 8px 12px;
            border-bottom: 1px solid #f1f5f9;
            vertical-align: top;
          }
          .defect-details-table tr:last-child th,
          .defect-details-table tr:last-child td {
            border-bottom: none;
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
          .defect-section {
            margin-top: 18px;
          }
          .defect-section h2 {
            margin: 0 0 12px;
          }
          .defect-activity-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            overflow: hidden;
            background: #fff;
          }
          .defect-activity-table th {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            text-align: left;
            padding: 8px 12px;
            border-bottom: 1px solid #f1f5f9;
            color: #64748b;
            background: #f9fafb;
          }
          .defect-activity-table td {
            font-size: 13px;
            padding: 8px 12px;
            border-bottom: 1px solid #f1f5f9;
            vertical-align: top;
          }
          .defect-activity-table tr:last-child td {
            border-bottom: none;
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
          <SectionHeader
            title={defectTitle}
            right={(
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <span className={`defect-status-badge defect-status-${defect.status.toLowerCase()}`}>
                  {defect.status}
                </span>
                <ButtonLink to={tenantPath(slug, "/admin/defects")} variant="secondary" size="sm" className="w-auto">
                  Back to list
                </ButtonLink>
              </div>
            )}
          />
        </div>
        <Card className="p-0">
          <TableWrap className="defect-details-table-wrap border-0 shadow-none">
            <table className="defect-details-table min-w-[700px] w-full">
            <tbody>
              <tr>
                <th>Status</th>
                <td>
                  <div className="defect-action-row">
                    <select
                      id="statusSelect"
                      value={statusValue}
                      onChange={(e) => setStatusValue(e.target.value as DefectStatus)}
                      style={{
                        width: "220px",
                        padding: "8px",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                      }}
                      disabled={saving}
                    >
                      {statusOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSaveStatus}
                      disabled={saving}
                    >
                      {saving ? "Saving..." : "Save"}
                    </Button>
                    <span className="muted" style={{ fontSize: "12px" }}>
                      {saving ? "Saving..." : updateError ? updateError : updated ? "Status updated" : ""}
                    </span>
                  </div>
                </td>
              </tr>
              <tr>
                <th>Attachments</th>
                <td>
                  {attachmentsLoading ? <p className="muted">Loading attachments...</p> : null}
                  {attachmentsError ? <div className="error" style={{ marginBottom: "8px" }}>{attachmentsError}</div> : null}
                  {attachments.length === 0 && !attachmentsLoading && !attachmentsError ? (
                    <p className="muted">No attachments.</p>
                  ) : null}
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "6px",
                      marginBottom: attachments.length > 0 ? "10px" : "0",
                    }}
                  >
                    {attachments.map((a) => {
                      const previewUrl = attachmentPreviewUrls[String(a.id)];
                      const previewFailed = attachmentPreviewErrors[String(a.id)];
                      return (
                        <div key={a.id} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          <div
                            className="defect-attachment-thumb"
                            style={{ width: "56px", height: "56px", borderRadius: "8px" }}
                          >
                            {a.purgedAt ? (
                              <span className="muted" style={{ fontSize: "11px" }}>Purged</span>
                            ) : previewUrl && !previewFailed ? (
                              <button
                                type="button"
                                onClick={() => openPreview(previewUrl, a.title || "attachment")}
                                style={{ padding: 0, border: "none", background: "transparent", cursor: "pointer" }}
                              >
                                <img
                                  src={previewUrl}
                                  alt={a.title || "attachment"}
                                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                />
                              </button>
                            ) : previewFailed ? (
                              <span className="muted" style={{ fontSize: "11px" }}>No preview</span>
                            ) : (
                              <span className="muted" style={{ fontSize: "11px" }}>Loading</span>
                            )}
                          </div>
                          {(() => {
                            const title = (a.title ?? "").trim();
                            return title ? (
                              <div
                                className="muted"
                                style={{
                                  fontSize: "11px",
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                }}
                              >
                                {title}
                              </div>
                            ) : null;
                          })()}
                          {canEditAttachments && !a.purgedAt ? (
                            <button
                              className="text-xs text-red-600 hover:underline"
                              style={{
                                width: "auto",
                                padding: 0,
                                border: "none",
                                background: "transparent",
                                cursor: "pointer",
                              }}
                              onClick={() => handleDeleteAttachment(a.id)}
                              disabled={attachmentDeleting === a.id}
                            >
                              {attachmentDeleting === a.id ? "Deleting..." : "Delete"}
                            </button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                  {canEditAttachments ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
                      <input
                        id="attachmentFile"
                        type="file"
                        accept="image/jpeg,image/png"
                        onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
                        disabled={attachmentSaving}
                        style={{ flex: "1 1 200px" }}
                      />
                      <FormField label="Attachment title" htmlFor="attachmentTitle" hint="Optional">
                        <Input
                          id="attachmentTitle"
                          value={attachmentTitle}
                          onChange={(e) => setAttachmentTitle(e.target.value)}
                          placeholder="Title (optional)"
                          disabled={attachmentSaving}
                          className="w-64"
                        />
                      </FormField>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleUploadAttachment}
                        disabled={attachmentSaving || !attachmentFile}
                      >
                        {attachmentSaving ? "Uploading..." : "Upload"}
                      </Button>
                    </div>
                  ) : isResolved ? (
                    <p className="muted" style={{ marginTop: "8px" }}>
                      Attachments are locked because the defect is resolved.
                    </p>
                  ) : null}
                </td>
              </tr>
              <tr>
                <th>Vehicle</th>
                <td>{vehicleLabel}</td>
              </tr>
              <tr>
                <th>Reported by</th>
                <td>{reportedLabel}</td>
              </tr>
              <tr>
                <th>Created</th>
                <td>{formatDateTime(defect.createdAt)}</td>
              </tr>
              {defect.updatedAt ? (
                <tr>
                  <th>Updated</th>
                  <td>{formatDateTime(defect.updatedAt)}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
          </TableWrap>
        </Card>

        <section className="defect-section">
          <Card>
            <SectionHeader title="Driver comments" />
          {commentsLoading ? <p className="muted">Loading comments...</p> : null}
          {commentsError ? <div className="error" style={{ marginBottom: "8px" }}>{commentsError}</div> : null}
          {latestComments.length === 0 && !commentsLoading && !commentsError ? (
            <p className="muted">No comments.</p>
          ) : (
            <TableWrap>
              <table className="defect-activity-table min-w-[700px] w-full">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {latestComments.map((c) => {
                    return (
                      <tr key={c.id}>
                        <td>{formatDateTime(c.createdAt)}</td>
                        <td>{c.message}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableWrap>
          )}
          </Card>
        </section>

        <section className="defect-section">
          <Card>
            <SectionHeader title="Admin note" />
          {(() => {
            const hasNote = (defect.adminNote ?? "").trim() !== "";
            const noteTimestamp = defect.adminNoteUpdatedAt || defect.createdAt;
            if (!hasNote || adminEditMode) {
              return (
                <>
                  <FormField label="Note">
                    <textarea
                      value={adminDraft}
                      onChange={(event) => {
                        setAdminDraft(event.target.value);
                        setAdminNoteSaved(false);
                      }}
                      rows={3}
                      style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }}
                      disabled={isResolved || adminNoteSaving}
                    />
                  </FormField>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center", marginTop: "8px", flexWrap: "wrap" }}>
                    {!isResolved ? (
                      <>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSaveAdminNote}
                      disabled={adminNoteSaving}
                    >
                      {adminNoteSaving ? "Saving..." : "Save note"}
                    </Button>
                    {hasNote ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setAdminDraft(adminOriginal);
                          setAdminEditMode(false);
                          setAdminNoteError(null);
                        }}
                        disabled={adminNoteSaving}
                      >
                        Cancel
                      </Button>
                    ) : null}
                  </>
                ) : null}
                    {adminNoteSaved ? <span className="muted" style={{ fontSize: "12px" }}>Saved</span> : null}
                    {isResolved ? (
                      <span className="muted" style={{ fontSize: "12px" }}>
                        Locked because resolved.
                      </span>
                    ) : null}
                  </div>
                </>
              );
            }

            return (
              <>
                <TableWrap>
                  <table className="defect-activity-table min-w-[700px] w-full">
                    <thead>
                      <tr>
                        <th>When</th>
                        <th>Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>{formatDateTime(noteTimestamp)}</td>
                        <td>{defect.adminNote}</td>
                      </tr>
                    </tbody>
                  </table>
                </TableWrap>
                <div style={{ display: "flex", gap: "10px", alignItems: "center", marginTop: "8px", flexWrap: "wrap" }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setAdminDraft(adminOriginal);
                      setAdminEditMode(true);
                      setAdminNoteError(null);
                      setAdminNoteSaved(false);
                    }}
                    disabled={isResolved}
                  >
                    Edit
                  </Button>
                  {isResolved ? (
                    <span className="muted" style={{ fontSize: "12px" }}>
                      Locked because resolved.
                    </span>
                  ) : null}
                </div>
              </>
            );
          })()}
          {adminNoteError ? (
            <div className="error" style={{ fontSize: "12px", marginTop: "6px" }}>
              {adminNoteError}
            </div>
          ) : null}
          </Card>
        </section>
      </div>
      {previewOpen && previewSrc ? (
        <div
          role="presentation"
          onClick={closePreview}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 60,
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: "12px",
              padding: "8px",
              maxWidth: "90vw",
              maxHeight: "90vh",
            }}
          >
            <ModalShell title="Attachment preview" onClose={closePreview}>
              <img
                src={previewSrc}
                alt={previewAlt || "Attachment preview"}
                style={{ maxWidth: "86vw", maxHeight: "80vh", objectFit: "contain" }}
              />
            </ModalShell>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default DefectDetailsPage;







