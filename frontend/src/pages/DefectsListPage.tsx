import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getDefectAttachmentDownloadUrl, listDefects } from "../api/defects";
import { Defect } from "../types/defect";
import { listVehicles } from "../api/vehicles";
import { listCompanyUsers } from "../api/users";
import { Vehicle } from "../types/vehicle";
import { User } from "../types/user";
import { ApiError } from "../api/http";
import { getToken } from "../auth/token";
import { getDefectCategoryLabel } from "../utils/defects";
import { formatDateTime } from "../utils/time";
import { tenantPath } from "../utils/tenantPath";
import TableWrap from "../components/TableWrap";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import FormField from "../components/ui/FormField";
import Input from "../components/ui/Input";
import ListState from "../components/ui/ListState";
import SectionHeader from "../components/ui/SectionHeader";
import ModalShell from "../components/ui/ModalShell";

const viewOptions = ["ACTIVE", "OVERDUE", "RESOLVED", "ALL"] as const;

const osloDateString = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Oslo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value || "";
  const month = parts.find((part) => part.type === "month")?.value || "";
  const day = parts.find((part) => part.type === "day")?.value || "";
  return `${year}-${month}-${day}`;
};

const osloTodayYYYYMMDD = () => osloDateString(new Date());

const addDaysToOsloDate = (dateYYYYMMDD: string, offsetDays: number) => {
  const [yearStr, monthStr, dayStr] = dateYYYYMMDD.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const utcNoon = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  utcNoon.setUTCDate(utcNoon.getUTCDate() + offsetDays);
  return osloDateString(utcNoon);
};

const osloDaysAgoYYYYMMDD = (days: number) => {
  const today = osloTodayYYYYMMDD();
  return addDaysToOsloDate(today, -days);
};

const isOverdue = (createdAtISO: string, status: string): boolean => {
  if (status === "RESOLVED") return false;
  const createdAt = new Date(createdAtISO).getTime();
  const daysMs = 30 * 24 * 60 * 60 * 1000;
  return Date.now() - createdAt > daysMs;
};

const DefectsListPage = () => {
  const navigate = useNavigate();
  const { companySlug } = useParams();
  const slug = companySlug;
  const [items, setItems] = useState<Defect[]>([]);
  const [usersById, setUsersById] = useState<Record<number, User>>({});
  const [vehiclesById, setVehiclesById] = useState<Record<number, Vehicle>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attachmentPreviewUrls, setAttachmentPreviewUrls] = useState<Record<string, string>>({});
  const [attachmentPreviewErrors, setAttachmentPreviewErrors] = useState<Record<string, boolean>>({});
  const [previewDefectId, setPreviewDefectId] = useState<string | number | null>(null);

  const defaultTo = osloTodayYYYYMMDD();
  const defaultFrom = osloDaysAgoYYYYMMDD(30);

  const [filterFrom, setFilterFrom] = useState(defaultFrom);
  const [filterTo, setFilterTo] = useState(defaultTo);
  const [filterView, setFilterView] = useState<(typeof viewOptions)[number]>("ACTIVE");
  const [filterVehicleId, setFilterVehicleId] = useState("ALL");
  const [filterReporterId, setFilterReporterId] = useState("ALL");

  const previewUrl =
    previewDefectId != null ? attachmentPreviewUrls[String(previewDefectId)] : undefined;

  const loadLookups = async () => {
    try {
      const [usersRes, vehiclesRes] = await Promise.all([listCompanyUsers(), listVehicles()]);
      const usersMap = usersRes.reduce<Record<number, User>>((acc, user) => {
        const key = Number(user.id);
        if (!Number.isNaN(key)) acc[key] = user;
        return acc;
      }, {});
      const vehiclesMap = vehiclesRes.reduce<Record<number, Vehicle>>((acc, vehicle) => {
        const key = Number(vehicle.id);
        if (!Number.isNaN(key)) acc[key] = vehicle;
        return acc;
      }, {});
      setUsersById(usersMap);
      setVehiclesById(vehiclesMap);
    } catch (err) {
      // Keep fallbacks; do not block defects listing
      console.warn("[defects] Failed to load lookups", err);
    }
  };

  const loadDefects = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listDefects();
      setItems(res.items || []);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to load defects";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLookups();
    loadDefects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let isCancelled = false;
    const createdUrls: string[] = [];

    const loadPreviews = async () => {
      const token = getToken();
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      const previews: Record<string, string> = {};
      const errors: Record<string, boolean> = {};

      for (const defect of items) {
        const attachment = defect.attachments?.[0];
        if (!attachment || attachment.purgedAt) continue;
        try {
          const res = await fetch(
            getDefectAttachmentDownloadUrl(defect.id, attachment.id),
            { headers },
          );
          if (!res.ok) {
            throw new Error("Preview fetch failed");
          }
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          createdUrls.push(url);
          previews[String(defect.id)] = url;
        } catch {
          errors[String(defect.id)] = true;
        }
      }

      if (!isCancelled) {
        setAttachmentPreviewUrls(previews);
        setAttachmentPreviewErrors(errors);
      }
    };

    if (items.length === 0) {
      setAttachmentPreviewUrls({});
      setAttachmentPreviewErrors({});
      return;
    }

    loadPreviews();

    return () => {
      isCancelled = true;
      createdUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [items]);

  const vehicleOptions = useMemo(() => {
    const map = new Map<number, { id: number; label: string }>();
    items.forEach((defect) => {
      const id = defect.vehicle?.id ?? defect.vehicleId;
      if (!id) return;
      const reg = defect.vehicle?.regNumber || vehiclesById[Number(id)]?.regNumber;
      const name = defect.vehicle?.name || vehiclesById[Number(id)]?.name;
      const label = reg
        ? `${reg}${name ? ` - ${name}` : ""}`
        : `Vehicle#${id}`;
      map.set(Number(id), { id: Number(id), label });
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [items, vehiclesById]);

  const reporterOptions = useMemo(() => {
    const map = new Map<number, { id: number; label: string }>();
    items.forEach((defect) => {
      const id = defect.reportedByUser?.id ?? defect.reportedByUserId;
      if (!id) return;
      const reporter = defect.reportedByUser || usersById[Number(id)];
      const label =
        reporter?.phone || reporter?.username || reporter?.email || `User#${id}`;
      map.set(Number(id), { id: Number(id), label });
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [items, usersById]);

  const filteredItems = useMemo(() => {
    return items
      .filter((defect) => {
        if (filterView === "ACTIVE") {
          if (defect.status !== "OPEN" && defect.status !== "IN_PROGRESS") return false;
        } else if (filterView === "OVERDUE") {
          if (defect.status !== "OPEN" && defect.status !== "IN_PROGRESS") return false;
          if (!isOverdue(defect.createdAt, defect.status)) return false;
        } else if (filterView === "RESOLVED") {
          if (defect.status !== "RESOLVED") return false;
        }
        if (filterVehicleId !== "ALL") {
          const vehicleId = String(defect.vehicle?.id ?? defect.vehicleId ?? "");
          if (vehicleId !== filterVehicleId) return false;
        }
        if (filterReporterId !== "ALL") {
          const reporterId = String(defect.reportedByUser?.id ?? defect.reportedByUserId ?? "");
          if (reporterId !== filterReporterId) return false;
        }
        if (filterFrom || filterTo) {
          const createdDate = osloDateString(new Date(defect.createdAt));
          if (filterFrom && createdDate < filterFrom) return false;
          if (filterTo && createdDate > filterTo) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [items, filterView, filterVehicleId, filterReporterId, filterFrom, filterTo]);

  const overdueCount = useMemo(
    () => items.filter((defect) => isOverdue(defect.createdAt, defect.status)).length,
    [items],
  );

  const resetFilters = () => {
    setFilterFrom(defaultFrom);
    setFilterTo(defaultTo);
    setFilterView("ACTIVE");
    setFilterVehicleId("ALL");
    setFilterReporterId("ALL");
  };

  const handlePreviewError = (defectId: string | number) => {
    setAttachmentPreviewErrors((prev) => ({ ...prev, [String(defectId)]: true }));
  };

  return (
    <div className="min-h-screen w-full px-3 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto w-full max-w-6xl">
        <Card className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <SectionHeader title="Defects" />
            </div>
            <div className="flex justify-start sm:justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
                onClick={resetFilters}
              >
                Clear filters
              </Button>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:gap-4 items-end">
            <FormField label="From" htmlFor="from">
              <Input
                id="from"
                type="date"
                value={filterFrom}
                onChange={(event) => setFilterFrom(event.target.value)}
              />
            </FormField>
            <FormField label="To" htmlFor="to">
              <Input
                id="to"
                type="date"
                value={filterTo}
                onChange={(event) => setFilterTo(event.target.value)}
              />
            </FormField>
            <FormField label="View" htmlFor="view">
              <select
                id="view"
                className="w-full"
                value={filterView}
                onChange={(event) => setFilterView(event.target.value as (typeof viewOptions)[number])}
              >
                {viewOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === "ALL" ? "All" : opt}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Vehicle" htmlFor="vehicle">
              <select
                id="vehicle"
                className="w-full"
                value={filterVehicleId}
                onChange={(event) => setFilterVehicleId(event.target.value)}
              >
                <option value="ALL">All</option>
                {vehicleOptions.map((option) => (
                  <option key={option.id} value={String(option.id)}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Reported by" htmlFor="reportedBy">
              <select
                id="reportedBy"
                className="w-full"
                value={filterReporterId}
                onChange={(event) => setFilterReporterId(event.target.value)}
              >
                <option value="ALL">All</option>
                {reporterOptions.map((option) => (
                  <option key={option.id} value={String(option.id)}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          {overdueCount > 0 ? (
            <div className="mt-3 flex justify-start">
              <Button
                variant="ghost"
                size="sm"
                className="text-sm font-semibold text-red-600 hover:text-red-700"
                onClick={() => {
                  setFilterFrom("2000-01-01");
                  setFilterTo(defaultTo);
                  setFilterView("OVERDUE");
                }}
              >
                Overdue: {overdueCount}
              </Button>
            </div>
          ) : null}
        </Card>

        <ListState
          loading={loading}
          hasItems={filteredItems.length > 0}
          emptyTitle="No defects"
          emptyMessage="No defects found for the current filters."
          errorMessage={error}
        >
          <div className="mt-4 hidden md:block overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <TableWrap>
              <table className="min-w-[1000px] w-full text-sm">
                <thead>
                  <tr>
                    <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                      Photo
                    </th>
                    <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                      Category/Title
                    </th>
                    <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                      Vehicle
                    </th>
                    <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                      Reported by
                    </th>
                    <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                      Created
                    </th>
                    <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                      Status
                    </th>
                    <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((d) => {
                    const reporterFallback = usersById[Number(d.reportedByUserId)];
                    const reportedLabel =
                      d.reportedByUser?.phone ||
                      d.reportedByUser?.username ||
                      d.reportedByUser?.email ||
                      d.reportedByUser?.id ||
                      reporterFallback?.phone ||
                      reporterFallback?.username ||
                      reporterFallback?.email ||
                      reporterFallback?.id ||
                      d.reportedByUserId ||
                      "-";
                    const title = d.source === "CHECKLIST" ? getDefectCategoryLabel(d) : d.title || "(No title)";
                    const regNumber = d.vehicle?.regNumber || vehiclesById[Number(d.vehicleId)]?.regNumber;
                    const vehicleName = d.vehicle?.name || vehiclesById[Number(d.vehicleId)]?.name;
                  const vehicleLabel = regNumber
                    ? `${regNumber}${vehicleName ? ` - ${vehicleName}` : ""}`
                    : d.vehicleId
                      ? `Vehicle ID ${d.vehicleId}`
                      : "-";
                  const [vehiclePrimary, ...vehicleRest] = vehicleLabel.split(" - ");
                  const vehicleSecondary = vehicleRest.length ? vehicleRest.join(" - ") : "";
                  const firstAttachment = d.attachments?.[0];
                  const previewUrl = attachmentPreviewUrls[String(d.id)];
                  const previewFailed = attachmentPreviewErrors[String(d.id)];
                  const overdue = isOverdue(d.createdAt, d.status);
                  const statusClass =
                    d.status === "OPEN"
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : d.status === "IN_PROGRESS"
                        ? "border-blue-200 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-slate-50 text-slate-700";
                  return (
                    <tr key={d.id} className="odd:bg-white even:bg-slate-50/50">
                      <td className="border-b border-slate-100 px-3 py-3 align-middle text-slate-800">
                        {firstAttachment && !firstAttachment.purgedAt && previewUrl && !previewFailed ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              <button
                                type="button"
                                onClick={() => setPreviewDefectId(d.id)}
                                style={{ padding: 0, border: "none", background: "transparent", cursor: "pointer" }}
                                aria-label="Open attachment preview"
                              >
                                <img
                                  src={previewUrl}
                                  width={48}
                                  height={48}
                                  className="h-12 w-12 rounded-lg object-cover border border-slate-200"
                                  alt="attachment"
                                  onError={() => handlePreviewError(d.id)}
                                />
                              </button>
                              {(() => {
                                const title = (firstAttachment.title ?? "").trim();
                                return title ? (
                                  <div
                                    className="muted"
                                    style={{
                                      fontSize: "11px",
                                      display: "-webkit-box",
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: "vertical",
                                      overflow: "hidden",
                                      maxWidth: "72px",
                                    }}
                                  >
                                    {title}
                                  </div>
                                ) : null;
                              })()}
                            </div>
                          ) : (
                            <span className="muted">-</span>
                          )}
                        </td>
                        <td className="border-b border-slate-100 px-3 py-3 align-middle text-slate-800">
                          <div className="text-sm font-semibold text-slate-900">{title}</div>
                        </td>
                        <td className="border-b border-slate-100 px-3 py-3 align-middle text-slate-800">
                          {vehicleSecondary ? (
                            <div className="text-sm text-slate-800">
                              <span className="font-medium text-slate-900">{vehiclePrimary}</span>
                              <span className="text-slate-700">{" - "}{vehicleSecondary}</span>
                            </div>
                          ) : (
                            <div className="text-sm font-medium text-slate-900">{vehicleLabel}</div>
                          )}
                        </td>
                        <td className="border-b border-slate-100 px-3 py-3 align-middle text-sm text-slate-600">
                          {reportedLabel}
                        </td>
                        <td className="border-b border-slate-100 px-3 py-3 align-middle text-sm text-slate-600">
                          {formatDateTime(d.createdAt)}
                        </td>
                        <td className="border-b border-slate-100 px-3 py-3 align-middle text-slate-800">
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${statusClass}`}>
                              {d.status}
                            </span>
                            {overdue ? (
                              <span
                                style={{
                                  fontSize: "10px",
                                  fontWeight: 700,
                                  padding: "2px 6px",
                                  borderRadius: "999px",
                                  background: "#fee2e2",
                                  color: "#991b1b",
                                  border: "1px solid #fecaca",
                                }}
                              >
                                OVERDUE
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="border-b border-slate-100 px-3 py-3 align-middle text-right text-slate-800">
                          <div className="flex justify-end">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => navigate(tenantPath(slug, `/admin/defects/${d.id}`))}
                            >
                              Manage
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableWrap>
          </div>
          <div className="mt-4 grid gap-3 md:hidden">
            {filteredItems.map((d) => {
              const reporterFallback = usersById[Number(d.reportedByUserId)];
              const reportedLabel =
                d.reportedByUser?.phone ||
                d.reportedByUser?.username ||
                d.reportedByUser?.email ||
                d.reportedByUser?.id ||
                reporterFallback?.phone ||
                reporterFallback?.username ||
                reporterFallback?.email ||
                reporterFallback?.id ||
                d.reportedByUserId ||
                "-";
              const title = d.source === "CHECKLIST" ? getDefectCategoryLabel(d) : d.title || "(No title)";
              const regNumber = d.vehicle?.regNumber || vehiclesById[Number(d.vehicleId)]?.regNumber;
              const vehicleName = d.vehicle?.name || vehiclesById[Number(d.vehicleId)]?.name;
              const vehicleLabel = regNumber
                ? `${regNumber}${vehicleName ? ` - ${vehicleName}` : ""}`
                : d.vehicleId
                  ? `Vehicle ID ${d.vehicleId}`
                  : "-";
              const firstAttachment = d.attachments?.[0];
              const previewUrl = attachmentPreviewUrls[String(d.id)];
              const previewFailed = attachmentPreviewErrors[String(d.id)];
              const statusClass =
                d.status === "OPEN"
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : d.status === "IN_PROGRESS"
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-slate-50 text-slate-700";
              return (
                <div key={d.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm font-semibold text-slate-900">{title}</span>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${statusClass}`}>
                      {d.status}
                    </span>
                  </div>
                  {firstAttachment && !firstAttachment.purgedAt && previewUrl && !previewFailed ? (
                    <img
                      src={previewUrl}
                      alt="attachment"
                      className="mt-3 h-16 w-16 rounded-lg object-cover border border-slate-200"
                      onError={() => handlePreviewError(d.id)}
                    />
                  ) : null}
                  <div className="mt-3 grid gap-1 text-sm text-slate-700">
                    <div>Vehicle: {vehicleLabel}</div>
                    <div>Reported by: {reportedLabel}</div>
                    <div>Created: {formatDateTime(d.createdAt)}</div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(tenantPath(slug, `/admin/defects/${d.id}`))}
                    >
                      Manage
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </ListState>
        {error ? (
          <div style={{ marginTop: "12px" }}>
            <Button
              variant="primary"
              onClick={() => {
                loadLookups();
                loadDefects();
              }}
            >
              Retry
            </Button>
          </div>
        ) : null}
      </div>
      {previewUrl ? (
        <div
          role="presentation"
          onClick={() => setPreviewDefectId(null)}
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
            style={{
              background: "#fff",
              borderRadius: "12px",
              padding: "8px",
              maxWidth: "90vw",
              maxHeight: "90vh",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <ModalShell title="Attachment preview" onClose={() => setPreviewDefectId(null)}>
              <img
                src={previewUrl}
                alt="Attachment preview"
                style={{ maxWidth: "86vw", maxHeight: "80vh", objectFit: "contain" }}
              />
            </ModalShell>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default DefectsListPage;
