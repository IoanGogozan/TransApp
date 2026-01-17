import { FormEvent, useEffect, useState } from "react";
import { ApiError } from "../../api/http";
import TableWrap from "../../components/TableWrap";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import FormField from "../../components/ui/FormField";
import Input from "../../components/ui/Input";
import ListState from "../../components/ui/ListState";
import SectionHeader from "../../components/ui/SectionHeader";
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
    <div className="min-h-screen w-full px-3 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto w-full max-w-6xl">
        <Card className="mx-auto w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <SectionHeader title="Documents" subtitle="Upload and manage company documents." />
          <form onSubmit={onSubmit}>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 items-end">
              <div className="w-full">
                <FormField label="Title" htmlFor="doc-title">
                  <Input
                    id="doc-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Policy, manual, or template"
                    required
                  />
                </FormField>
              </div>
              <div className="w-full">
                <label htmlFor="doc-file" className="block text-sm font-medium text-slate-700">
                  File (PDF or DOCX)
                </label>
                <div className="mt-1">
                  <input
                    id="doc-file"
                    type="file"
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                    required
                  />
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button className="w-full sm:w-auto" type="submit" disabled={uploading}>
                {uploading ? "Uploading..." : "Upload document"}
              </Button>
            </div>
            {uploadError ? <div className="error" style={{ marginTop: "8px" }}>{uploadError}</div> : null}
          </form>

          {!loading && !error && documents.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
              <div className="text-sm font-semibold text-slate-900">No documents</div>
              <div className="mt-1 text-sm text-slate-600">No documents yet.</div>
            </div>
          ) : (
            <ListState
              loading={loading}
              hasItems={documents.length > 0}
              emptyTitle="No documents"
              emptyMessage="No documents yet."
              errorMessage={error}
            >
              <TableWrap>
                <table className="min-w-[700px] w-full">
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
                            <Button variant="secondary" size="sm" onClick={() => downloadDocument(doc)}>
                              Download
                            </Button>
                            <Button variant="secondary" size="sm" onClick={() => handleDelete(doc)}>
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            </ListState>
          )}
        </Card>
      </div>
    </div>
  );
};

export default DocumentsPage;
