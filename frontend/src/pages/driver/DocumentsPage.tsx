import { useEffect, useState } from "react";
import { ApiError } from "../../api/http";
import { DocumentMeta, downloadDocument, getMyDocuments } from "../../api/documents";
import TableWrap from "../../components/TableWrap";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import ListState from "../../components/ui/ListState";
import SectionHeader from "../../components/ui/SectionHeader";

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
    <div className="min-h-screen flex items-start justify-center p-5">
      <Card>
        <SectionHeader title="Documents" />

        <ListState
          loading={loading}
          hasItems={documents.length > 0}
          errorMessage={error ?? null}
          emptyTitle="No documents"
          emptyMessage="No documents yet."
        >
          <TableWrap>
            <table className="min-w-[700px] w-full">
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
                      <Button variant="secondary" size="sm" type="button" onClick={() => downloadDocument(doc)}>
                        Download
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </ListState>
      </Card>
    </div>
  );
};

export default DocumentsPage;
