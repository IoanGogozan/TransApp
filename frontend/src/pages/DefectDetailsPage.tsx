import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
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

  const statusBadgeClass =
    defect.status === "OPEN"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : defect.status === "IN_PROGRESS"
        ? "border-blue-200 bg-blue-50 text-blue-700"
        : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <div className="min-h-screen w-full px-3 py-4 sm:px-6 sm:py-6">
      <style>
        {`
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
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{defectTitle}</h1>
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${statusBadgeClass}`}>
              {defect.status}
            </span>
          </div>
          <Link
            to={tenantPath(slug, "/admin/defects")}
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Back to list
          </Link>
        </div>
        <Card className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
            <div className="lg:col-span-7">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">Status</div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="w-full sm:w-[260px]">
                    <select
                      id="statusSelect"
                      value={statusValue}
                      onChange={(e) => setStatusValue(e.target.value as DefectStatus)}
                      style={{
                        width: "100%",
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
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveStatus}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save"}
                  </Button>
                  <span className="text-xs text-slate-500">
                    {saving ? "Saving..." : updateError ? updateError : updated ? "Status updated" : ""}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">Vehicle</div>
                  <div className="mt-1 text-sm font-medium text-slate-900">{vehicleLabel}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">Reported by</div>
                  <div className="mt-1 text-sm font-medium text-slate-900">{reportedLabel}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">Created</div>
                  <div className="mt-1 text-sm font-medium text-slate-900">{formatDateTime(defect.createdAt)}</div>
                </div>
                {defect.updatedAt ? (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">Updated</div>
                    <div className="mt-1 text-sm font-medium text-slate-900">{formatDateTime(defect.updatedAt)}</div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="lg:col-span-5 lg:max-w-[420px] lg:justify-self-end">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">Attachments</div>
              {attachmentsLoading ? <p className="mt-2 text-sm text-slate-500">Loading attachments...</p> : null}
              {attachmentsError ? <div className="error mt-2">{attachmentsError}</div> : null}
              {attachments.length === 0 && !attachmentsLoading && !attachmentsError ? (
                <p className="mt-2 text-sm text-slate-500">No attachments.</p>
              ) : null}

              <div className="mt-3 grid grid-cols-2 gap-3">
                {attachments.map((a) => {
                  const previewUrl = attachmentPreviewUrls[String(a.id)];
                  const previewFailed = attachmentPreviewErrors[String(a.id)];
                  return (
                    <div key={a.id} className="rounded-xl border border-slate-200 bg-white p-2">
                      <div className="overflow-hidden rounded-lg border border-slate-200">
                        {a.purgedAt ? (
                          <div className="flex h-28 items-center justify-center text-xs text-slate-500">Purged</div>
                        ) : previewUrl && !previewFailed ? (
                          <button
                            type="button"
                            onClick={() => openPreview(previewUrl, a.title || "attachment")}
                            style={{ padding: 0, border: "none", background: "transparent", cursor: "pointer" }}
                          >
                            <img
                              src={previewUrl}
                              alt={a.title || "attachment"}
                              className="h-28 w-full rounded-lg object-cover"
                            />
                          </button>
                        ) : previewFailed ? (
                          <div className="flex h-28 items-center justify-center text-xs text-slate-500">No preview</div>
                        ) : (
                          <div className="flex h-28 items-center justify-center text-xs text-slate-500">Loading</div>
                        )}
                      </div>
                      {(() => {
                        const title = (a.title ?? "").trim();
                        return title ? (
                          <div
                            className="text-xs text-slate-600"
                            style={{
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
                          className="mt-2 text-xs font-medium text-red-600 hover:text-red-700"
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
                <div className="mt-4 grid gap-3">
                  <div className="text-sm">
                    <input
                      id="attachmentFile"
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
                      disabled={attachmentSaving}
                      className="w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                    <div className="sm:col-span-2">
                      <FormField label="Attachment title" htmlFor="attachmentTitle" hint="Optional">
                        <Input
                          id="attachmentTitle"
                          value={attachmentTitle}
                          onChange={(e) => setAttachmentTitle(e.target.value)}
                          placeholder="Title (optional)"
                          disabled={attachmentSaving}
                          className="w-full"
                        />
                      </FormField>
                    </div>
                    <div className="sm:col-span-1 flex sm:justify-end">
                      <Button
                        variant="primary"
                        size="sm"
                        className="w-full sm:w-auto"
                        onClick={handleUploadAttachment}
                        disabled={attachmentSaving || !attachmentFile}
                      >
                        {attachmentSaving ? "Uploading..." : "Upload"}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : isResolved ? (
                <p className="mt-3 text-sm text-slate-500">
                  Attachments are locked because the defect is resolved.
                </p>
              ) : null}
            </div>
          </div>
        </Card>

        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="text-base font-semibold text-slate-900">Driver comments</div>
          {commentsLoading ? <p className="mt-2 text-sm text-slate-600">Loading comments...</p> : null}
          {commentsError ? <div className="error mt-2">{commentsError}</div> : null}
          {latestComments.length === 0 && !commentsLoading && !commentsError ? (
            <p className="mt-2 text-sm text-slate-600">No comments.</p>
          ) : (
            <>
              <div className="hidden md:block mt-3 overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-[600px] w-full text-sm">
                  <thead>
                    <tr>
                      <th className="bg-slate-50 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600 border-b border-slate-200">When</th>
                      <th className="bg-slate-50 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600 border-b border-slate-200">Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestComments.map((c) => (
                      <tr key={c.id} className="odd:bg-white even:bg-slate-50/50">
                        <td className="px-3 py-2 border-b border-slate-100 text-slate-800">{formatDateTime(c.createdAt)}</td>
                        <td className="px-3 py-2 border-b border-slate-100 text-slate-800">{c.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden mt-3 grid gap-3">
                {latestComments.map((c) => (
                  <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="text-xs font-semibold text-slate-600">{formatDateTime(c.createdAt)}</div>
                    <div className="mt-1 text-sm text-slate-900 whitespace-pre-wrap">{c.message}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="text-base font-semibold text-slate-900">Admin note</div>
          {(() => {
            const hasNote = (defect.adminNote ?? "").trim() !== "";
            const noteTimestamp = defect.adminNoteUpdatedAt || defect.createdAt;
            if (!hasNote || adminEditMode) {
              return (
                <>
                  <div className="mt-3">
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
                  </div>
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
                <div className="hidden md:block mt-3 overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-[600px] w-full text-sm">
                    <thead>
                      <tr>
                        <th className="bg-slate-50 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600 border-b border-slate-200">When</th>
                        <th className="bg-slate-50 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600 border-b border-slate-200">Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="odd:bg-white even:bg-slate-50/50">
                        <td className="px-3 py-2 border-b border-slate-100 text-slate-800">{formatDateTime(noteTimestamp)}</td>
                        <td className="px-3 py-2 border-b border-slate-100 text-slate-800">{defect.adminNote}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="md:hidden mt-3 grid gap-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="text-xs font-semibold text-slate-600">{formatDateTime(noteTimestamp)}</div>
                    <div className="mt-1 text-sm text-slate-900 whitespace-pre-wrap">{defect.adminNote}</div>
                  </div>
                </div>
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







