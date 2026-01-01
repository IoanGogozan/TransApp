import { FormEvent, useEffect, useState } from "react";
import { ApiError } from "../../api/http";
import { DocumentMeta, deleteDocument, downloadDocument, getMyDocuments, uploadDocument } from "../../api/documents";

const formatSize = (size: number) => {
  if (!Number.isFinite(size) || size <= 0) return "-";
  if (size < 1024) return `${size} B`;
  const kb = size / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${Math.round(mb * 10) / 10} MB`;
};

const DocumentsPage = () => {
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyDocuments();
      setDocuments(res.documents || []);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to load documents";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setUploadError(null);
    if (!file) {
      setUploadError("Select a PDF or DOCX file.");
      return;
    }
    if (!title.trim()) {
      setUploadError("Title is required.");
      return;
    }
    setUploading(true);
    try {
      await uploadDocument({ title: title.trim(), file });
      setTitle("");
      setFile(null);
      await load();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Upload failed";
      setUploadError(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc: DocumentMeta) => {
    if (!confirm(`Delete "${doc.title}"?`)) return;
    try {
      await deleteDocument(doc.id);
      setDocuments((prev) => prev.filter((item) => item.id !== doc.id));
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Delete failed";
      setError(msg);
    }
  };

  return (
    <div className="page">
      <div className="card">
        <h1>Documents</h1>
        <form onSubmit={onSubmit} style={{ marginBottom: "16px" }}>
          <div className="field">
            <label htmlFor="doc-title">Title</label>
            <input
              id="doc-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Policy, manual, or template"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="doc-file">File (PDF or DOCX)</label>
            <input
              id="doc-file"
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              required
            />
          </div>
          <button className="button" type="submit" disabled={uploading}>
            {uploading ? "Uploading..." : "Upload document"}
          </button>
          {uploadError ? <div className="error" style={{ marginTop: "8px" }}>{uploadError}</div> : null}
        </form>

        {error ? <div className="error">{error}</div> : null}

        {loading ? (
          <p>Loading documents...</p>
        ) : documents.length === 0 ? (
          <p className="muted">No documents yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Size</th>
                  <th>Uploaded</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td>{doc.title}</td>
                    <td>{doc.mimeType.includes("pdf") ? "PDF" : "DOCX"}</td>
                    <td>{formatSize(doc.size)}</td>
                    <td>{new Date(doc.createdAt).toISOString().slice(0, 10)}</td>
                    <td>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <button className="button" type="button" style={{ width: "auto" }} onClick={() => downloadDocument(doc)}>
                          Download
                        </button>
                        <button className="button" type="button" style={{ width: "auto" }} onClick={() => handleDelete(doc)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentsPage;
