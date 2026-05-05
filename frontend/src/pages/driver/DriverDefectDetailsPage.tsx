import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  addDefectComment,
  deleteDefectAttachment,
  downloadDefectAttachment,
  getDefectById,
  listDefectAttachments,
  listDefectComments,
  updateDefectDetails,
  uploadDefectAttachment,
} from "../../api/defects";
import { ApiError } from "../../api/http";
import { Defect, DefectAttachment, DefectComment } from "../../types/defect";
import { getDefectCategoryLabel } from "../../utils/defects";
import { formatDateTime } from "../../utils/time";
import { tenantPath } from "../../utils/tenantPath";

const DriverDefectDetailsPage = () => {
  const { id, companySlug } = useParams<{ id: string; companySlug?: string }>();
  const defectId = id;
  const slug = companySlug;
  const [defect, setDefect] = useState<Defect | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [comments, setComments] = useState<DefectComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [commentSaving, setCommentSaving] = useState(false);
  const [attachments, setAttachments] = useState<DefectAttachment[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [attachmentsError, setAttachmentsError] = useState<string | null>(null);
  const [attachmentPreviewErrors, setAttachmentPreviewErrors] = useState<Record<string, boolean>>({});
  const [attachmentPreviewUrls, setAttachmentPreviewUrls] = useState<Record<string, string>>({});
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentTitle, setAttachmentTitle] = useState("");
  const [attachmentSaving, setAttachmentSaving] = useState(false);
  const [attachmentDeleting, setAttachmentDeleting] = useState<string | number | null>(null);
  const [attachmentLockError, setAttachmentLockError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [previewAttachmentId, setPreviewAttachmentId] = useState<string | number | null>(null);
  const canEditAttachments = defect?.status === "OPEN" || defect?.status === "IN_PROGRESS";
  const isResolved = defect?.status === "RESOLVED";
  const canEditTitle = defect?.source !== "CHECKLIST";

  const loadDefect = async (defectIdValue: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getDefectById(defectIdValue);
      setDefect(res);
      setTitle(res.title || "");
      setDescription(res.description || "");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to load defect";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async (defectIdValue: string) => {
    setCommentsLoading(true);
    setCommentsError(null);
    try {
      const res = await listDefectComments(defectIdValue);
      setComments(res.items || []);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to load comments";
      setCommentsError(msg);
    } finally {
      setCommentsLoading(false);
    }
  };

  const loadAttachments = async (defectIdValue: string) => {
    setAttachmentsLoading(true);
    setAttachmentsError(null);
    try {
      const res = await listDefectAttachments(defectIdValue);
      setAttachments(res.items || []);
      setAttachmentPreviewErrors({});
      setAttachmentPreviewUrls({});
    } catch (err) {
      const msg =
        err instanceof ApiError &&
        err.status === 404 &&
        (err.code?.includes("NOT_FOUND") || err.message?.includes("not found"))
          ? "Attachments feature is not available on the server yet."
          : err instanceof ApiError
            ? err.message
            : "Failed to load attachments";
      setAttachmentsError(msg);
    } finally {
      setAttachmentsLoading(false);
    }
  };

  useEffect(() => {
    if (!defectId) return;
    loadDefect(defectId);
    loadComments(defectId);
    loadAttachments(defectId);
  }, [defectId]);

  useEffect(() => {
    if (!defectId || attachments.length === 0) return;
    let isCancelled = false;
    const createdUrls: string[] = [];
    const loadPreviews = async () => {
      const previewUrls: Record<string, string> = {};
      for (const attachment of attachments) {
        if (attachment.purgedAt) continue;
        try {
          const res = await fetch(
            `/api/v1/defects/${defectId}/attachments/${attachment.id}/download`,
            { credentials: "include" },
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

  const handleSave = async () => {
    if (!defectId) return;
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    if (!trimmedTitle && !trimmedDescription) {
      setSaveError("Provide a title or description.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateDefectDetails(defectId, {
        ...(canEditTitle && trimmedTitle ? { title: trimmedTitle } : {}),
        ...(description !== "" ? { description: trimmedDescription || null } : {}),
      });
      setDefect(updated);
      setTitle(updated.title || "");
      setDescription(updated.description || "");
      setEditing(false);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to update defect";
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEdit = () => {
    if (editing && defect) {
      const trimmedTitle = title.trim();
      const trimmedDescription = description.trim();
      const nextTitle = defect.title || "";
      const nextDescription = defect.description || "";
      const hasChanges = trimmedTitle !== nextTitle || trimmedDescription !== nextDescription;
      if (hasChanges) {
        setShowDiscardConfirm(true);
        return;
      }
      setTitle(nextTitle);
      setDescription(nextDescription);
      setSaveError(null);
    }
    setEditing((prev) => !prev);
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
      await loadComments(defectId);
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
    setAttachmentLockError(null);
    try {
      await uploadDefectAttachment(defectId, attachmentFile, attachmentTitle.trim() || undefined);
      setAttachmentFile(null);
      setAttachmentTitle("");
      await loadAttachments(defectId);
    } catch (err) {
      if (err instanceof ApiError && err.code === "DEFECT_NOT_EDITABLE") {
        setAttachmentLockError("Attachments are locked because the defect is resolved.");
        await Promise.all([loadDefect(defectId), loadAttachments(defectId)]);
      } else {
        const msg = err instanceof ApiError ? err.message : "Failed to upload attachment";
        setAttachmentsError(msg);
      }
    } finally {
      setAttachmentSaving(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string | number) => {
    if (!defectId) return;
    setAttachmentDeleting(attachmentId);
    setAttachmentsError(null);
    setAttachmentLockError(null);
    try {
      await deleteDefectAttachment(defectId, attachmentId);
      await loadAttachments(defectId);
    } catch (err) {
      if (err instanceof ApiError && err.code === "DEFECT_NOT_EDITABLE") {
        setAttachmentLockError("Attachments are locked because the defect is resolved.");
        await Promise.all([loadDefect(defectId), loadAttachments(defectId)]);
      } else {
        const msg = err instanceof ApiError ? err.message : "Failed to delete attachment";
        setAttachmentsError(msg);
      }
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

  const handleAttachmentPreviewError = (attachmentId: string | number) => {
    setAttachmentPreviewErrors((prev) => ({ ...prev, [String(attachmentId)]: true }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="px-4 py-4 pb-24 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p>Loading defect...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !defect) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="px-4 py-4 pb-24 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="error">{error || "Defect not found"}</div>
            <Link className="text-sm text-blue-600 underline" to={tenantPath(slug, "/driver/defects")}>
              Back to defects
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const vehicleLabel = defect.vehicle?.regNumber || (defect.vehicleId ? `Vehicle ${defect.vehicleId}` : "Vehicle");
  const statusToneMap = {
    IN_PROGRESS: "bg-amber-100 text-amber-800",
    RESOLVED: "bg-emerald-100 text-emerald-800",
    CRITICAL: "bg-rose-100 text-rose-800",
  } as const;
  const statusClasses =
    statusToneMap[defect.status as keyof typeof statusToneMap] || "bg-slate-100 text-slate-700";
  const descriptionText = defect.description?.trim() || "";
  const descriptionItems = descriptionText
    ? descriptionText.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)
    : [];

  const previewUrl =
    previewAttachmentId != null ? attachmentPreviewUrls[String(previewAttachmentId)] : undefined;
  const rawManualTitle = defect.title ?? "Defect";
  const manualTitleNeedsTruncate = defect.source === "MANUAL" && rawManualTitle.length > 60;
  const manualTitle = manualTitleNeedsTruncate ? `${rawManualTitle.slice(0, 60)}…` : rawManualTitle;
  const headerTitle =
    defect.source === "CHECKLIST" ? getDefectCategoryLabel(defect) : manualTitle;
  const headerTitleTooltip = manualTitleNeedsTruncate ? rawManualTitle : undefined;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="px-4 py-4 pb-24 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <Link
              className="min-h-[40px] rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
              to={tenantPath(slug, "/driver/defects")}
            >
              Back
            </Link>
            <button
              className="min-h-[40px] rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
              onClick={handleToggleEdit}
            >
              {editing ? "Cancel" : "Edit"}
            </button>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold leading-snug text-slate-900" title={headerTitleTooltip}>
              {headerTitle}
            </h1>
            <span className="inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold bg-amber-500/20 text-amber-900 ring-1 ring-inset ring-amber-600/25">
              {defect.status}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {vehicleLabel} - Created {formatDateTime(defect.createdAt)}
          </div>

          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">Description</div>
              {descriptionItems.length > 1 ? (
                <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-slate-800">
                  {descriptionItems.map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              ) : (
                <div className="mt-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-800">
                  {descriptionItems[0] || "No description provided."}
                </div>
              )}
            </div>

          {editing ? (
            <div className="space-y-3">
              {canEditTitle ? (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-800" htmlFor="defectTitle">
                    Title
                  </label>
                  <input
                    id="defectTitle"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={saving}
                  />
                </div>
              ) : null}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800" htmlFor="defectDescription">
                  Description
                </label>
                <textarea
                  id="defectDescription"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={saving}
                />
                {!canEditTitle ? (
                  <div className="text-xs text-slate-500">Title is generated from checklist category.</div>
                ) : null}
                <div className="text-xs text-slate-500">Status is managed by admin.</div>
              </div>
              {saveError ? <div className="error">{saveError}</div> : null}
              {showDiscardConfirm ? (
                <div className="rounded-lg border border-slate-200 p-3">
                  <div className="text-sm font-semibold text-slate-800">Discard changes?</div>
                  <div className="mt-2 flex gap-2">
                    <button
                      className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
                      type="button"
                      onClick={() => {
                        if (!defect) return;
                        setTitle(defect.title || "");
                        setDescription(defect.description || "");
                        setSaveError(null);
                        setShowDiscardConfirm(false);
                        setEditing(false);
                      }}
                    >
                      Discard
                    </button>
                    <button
                      className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
                      type="button"
                      onClick={() => setShowDiscardConfirm(false)}
                    >
                      Keep editing
                    </button>
                  </div>
                </div>
              ) : null}
              <button
                className="min-h-[40px] rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          ) : null}

          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">Attachments</div>
              {canEditAttachments ? (
                <button
                  className="mt-3 min-h-[44px] w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                  type="button"
                  onClick={() => setShowUpload(true)}
                >
                  Add photo
                </button>
              ) : null}
              {attachmentsLoading ? <p className="mt-2 text-sm text-slate-500">Loading attachments...</p> : null}
              {attachmentsError ? <div className="error mt-2">{attachmentsError}</div> : null}
              {attachmentLockError ? <div className="error mt-2">{attachmentLockError}</div> : null}
              {attachments.length === 0 && !attachmentsLoading && !attachmentsError ? (
                <p className="mt-2 text-sm text-slate-500">No attachments.</p>
              ) : null}
              <div className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
                {attachments.map((a) => (
                  <div
                    key={a.id}
                    className="min-w-[220px] snap-start overflow-hidden rounded-xl border border-slate-200 bg-white"
                  >
                    <div className="aspect-[4/3] w-full overflow-hidden bg-slate-50">
                      <div className="h-full w-full">
                        {a.purgedAt ? (
                          <div className="flex h-full items-center justify-center text-xs text-slate-500">
                            Purged
                          </div>
                        ) : attachmentPreviewUrls[String(a.id)] ? (
                          <button
                            type="button"
                            className="h-full w-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                            onClick={() => setPreviewAttachmentId(a.id)}
                            aria-label="Open attachment preview"
                          >
                            <img
                              src={attachmentPreviewUrls[String(a.id)]}
                              alt={a.title || "attachment"}
                              className="h-full w-full object-cover"
                            />
                          </button>
                        ) : attachmentPreviewErrors[String(a.id)] ? (
                          <div className="flex h-full items-center justify-center text-xs text-slate-500">
                            Preview unavailable
                          </div>
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-slate-500">
                            Loading preview
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="p-3">
                      {(() => {
                        const title = (a.title ?? "").trim();
                        return title ? (
                          <div
                            className="text-xs text-slate-500"
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
                      <div className="mt-3 flex gap-2">
                        {!a.purgedAt ? (
                          <button
                            className="min-h-[40px] flex-1 rounded-lg bg-slate-900 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                            onClick={() => handleDownloadAttachment(a)}
                          >
                            Download
                          </button>
                        ) : null}
                        {canEditAttachments ? (
                          <button
                            className="min-h-[40px] rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                            onClick={() => handleDeleteAttachment(a.id)}
                            disabled={attachmentDeleting === a.id}
                          >
                            {attachmentDeleting === a.id ? "Deleting..." : "Delete"}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {isResolved ? (
                <p className="mt-2 text-sm text-slate-500">Attachments are locked because the defect is resolved.</p>
              ) : null}
            </div>

            {canEditAttachments ? (
              <div className="space-y-3">
                <button
                  className="min-h-[40px] rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                  type="button"
                  onClick={() => setShowUpload((prev) => !prev)}
                >
                  {showUpload ? "Hide attachment form" : "Add attachment"}
                </button>
                {showUpload ? (
                  <div className="space-y-3 rounded-lg border border-slate-200 p-3">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-800" htmlFor="attachmentFile">
                        File
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          id="attachmentFile"
                          type="file"
                          accept="image/jpeg,image/png"
                          className="hidden"
                          onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
                          disabled={attachmentSaving}
                        />
                        <label
                          htmlFor="attachmentFile"
                          className="min-h-[40px] rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                        >
                          Choose file
                        </label>
                        <span className="truncate text-xs text-slate-500">
                          {attachmentFile ? attachmentFile.name : "No file selected"}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-800" htmlFor="attachmentTitle">
                        Title (optional)
                      </label>
                      <input
                        id="attachmentTitle"
                        value={attachmentTitle}
                        onChange={(e) => setAttachmentTitle(e.target.value)}
                        placeholder="Attachment title"
                        disabled={attachmentSaving}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      className="min-h-[40px] rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                      onClick={handleUploadAttachment}
                      disabled={attachmentSaving || !attachmentFile}
                    >
                      {attachmentSaving ? "Uploading..." : "Upload"}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">Comments</div>
              {commentsLoading ? <p className="mt-2 text-sm text-slate-500">Loading comments...</p> : null}
              {commentsError ? <div className="error mt-2">{commentsError}</div> : null}
              {comments.length === 0 && !commentsLoading && !commentsError ? (
                <p className="mt-2 text-sm text-slate-500">No comments.</p>
              ) : null}
              <div className="mt-3 space-y-3">
                {comments.map((c) => (
                  <div key={c.id} className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                      {(c.actorUserId ? `U` : "D")}
                    </div>
                    <div className="flex-1 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-900">
                        {c.actorUserId ? `User ${c.actorUserId}` : "Driver"}
                      </span>
                      <span className="text-[11px] text-slate-500">{formatDateTime(c.createdAt)}</span>
                    </div>
                      <div className="mt-1 text-sm text-slate-800">{c.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          </div>

          <div className="mt-4">
            <Link
              className="min-h-[40px] text-sm text-blue-600 underline transition-colors hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
              to={tenantPath(slug, "/driver/defects")}
            >
              Back to defects
            </Link>
          </div>
        </div>
      </div>
      {previewUrl ? (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={() => setPreviewAttachmentId(null)}
        >
          <div
            className="max-h-[80vh] max-w-[90vw] overflow-hidden rounded-lg bg-white p-2"
            onClick={(event) => event.stopPropagation()}
          >
            <img src={previewUrl} alt="Attachment preview" className="max-h-[76vh] max-w-[90vw] object-contain" />
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                className="min-h-[40px] rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                onClick={() => setPreviewAttachmentId(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
        <div className="mx-auto flex max-w-[480px] items-center gap-2 px-2">
          <textarea
            id="newComment"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Scrie un comentariu..."
            rows={2}
            className="flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            disabled={commentSaving}
          />
          <button
            className="min-h-[40px] rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
            onClick={handleAddComment}
            disabled={commentSaving || !newComment.trim()}
          >
            {commentSaving ? "Saving..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DriverDefectDetailsPage;
