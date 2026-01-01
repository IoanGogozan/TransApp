import { useEffect, useState } from "react";
import { ApiError } from "../../api/http";
import { DocumentMeta, downloadDocument, getMyDocuments } from "../../api/documents";

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

  return (
    <div className="page">
      <div className="card">
        <h1>Documents</h1>

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
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td>{doc.title}</td>
                    <td>{doc.mimeType.includes("pdf") ? "PDF" : "DOCX"}</td>
                    <td>{formatSize(doc.size)}</td>
                    <td>
                      <button className="button" type="button" style={{ width: "auto" }} onClick={() => downloadDocument(doc)}>
                        Download
                      </button>
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
