import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  getMyRoutes,
  getMyVehicles,
  getMyCustomers,
  getMyEntries,
  createMyEntry,
  updateMyEntry,
  deleteMyEntry,
  getMyVehicleCheckInStatus,
  type RouteOption,
  type VehicleOption,
  type CustomerOption,
  type WorkEntry,
  type VehicleCheckInStatus,
} from "../../api/timesheets";
import { ApiError } from "../../api/http";
import { tenantPath } from "../../utils/tenantPath";
import {
  addDays,
  formatDisplayDate,
  formatDisplayDayChip,
  formatYYYYMMDD,
  getISOWeekNumber,
  parseYYYYMMDD,
  startOfISOWeek,
} from "../../utils/date";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import ListState from "../../components/ui/ListState";
import SectionHeader from "../../components/ui/SectionHeader";

const isActivityType = (value: string | null): value is WorkEntry["activityType"] =>
  value === "DRIVING" || value === "OTHER_WORK" || value === "BREAK" || value === "AVAILABILITY";

const minutesToHoursLabel = (minutes: number) => {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

const formatMinutes = (minutes: number) => {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}h ${m}m`;
};

const InlineSpinner = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    width="12"
    height="12"
    style={{ marginRight: "6px", verticalAlign: "middle" }}
  >
    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.2" />
    <path d="M12 3a9 9 0 0 1 9 9" fill="none" stroke="currentColor" strokeWidth="3">
      <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite" />
    </path>
  </svg>
);

const PencilIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
    <path d="M13.6 3.2 16.8 6.4l-9.4 9.4H4.2v-3.2l9.4-9.4Zm1.4-1.4-1.2-1.2a1.5 1.5 0 0 0-2.1 0l-1.2 1.2 3.2 3.2 1.3-1.2a1.5 1.5 0 0 0 0-2.1Z" />
  </svg>
);

const TrashIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
    <path d="M7 2.5h6l.5 1H17v1.5H3V3.5h3.5l.5-1ZM5 6h10l-.7 10.3A1.5 1.5 0 0 1 12.8 18H7.2a1.5 1.5 0 0 1-1.5-1.7L5 6Z" />
  </svg>
);

const InfoIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 20 20" width="14" height="14" fill="currentColor">
    <path d="M10 1.5A8.5 8.5 0 1 0 18.5 10 8.5 8.5 0 0 0 10 1.5Zm0 3.75a1 1 0 1 1-1 1 1 1 0 0 1 1-1Zm1.25 9h-2.5v-1.5h.75V9h-.75V7.5h2.5v5.25h.75Z" />
  </svg>
);

const CalendarIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
    <path d="M6 2.5a.75.75 0 0 1 .75.75V4h6.5v-.75a.75.75 0 0 1 1.5 0V4H16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1.75v-.75A.75.75 0 0 1 6 2.5Zm9.5 6.5H4v6a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5v-6Z" />
  </svg>
);

const IconButton = ({ label, title, disabled, onClick, children }: {
  label: string;
  title: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) => (
  <button
    type="button"
    aria-label={label}
    title={title}
    onClick={onClick}
    disabled={disabled}
    style={{
      width: "36px",
      height: "36px",
      borderRadius: "10px",
      border: "1px solid #e5e7eb",
      background: "#fff",
      color: "#374151",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.6 : 1,
    }}
  >
    {children}
  </button>
);

const parseYYYYMMDDToLocalDate = (dateStr: string) => {
  const [yearStr, monthStr, dayStr] = dateStr.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return new Date(year, month - 1, day);
};

const formatLocalDateToYYYYMMDD = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const daysBetween = (fromDate: Date, toDate: Date) => {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((toDate.getTime() - fromDate.getTime()) / msPerDay);
};

const DriverTimesheetTodayPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const todayStr = useMemo(() => formatYYYYMMDD(new Date()), []);
  const activityParam = searchParams.get("activity");
  const initialActivity = isActivityType(activityParam) ? activityParam : "DRIVING";
  const initialCustomer = searchParams.get("customer") ?? "";
  const initialRoute = searchParams.get("route") ?? "";
  const initialVehicle = searchParams.get("vehicle") ?? "";
  const initialHoursRaw = Number(searchParams.get("h"));
  const initialMinutesRaw = Number(searchParams.get("m"));
  const initialHours = Number.isFinite(initialHoursRaw) && initialHoursRaw >= 0 && initialHoursRaw <= 24
    ? initialHoursRaw
    : 0;
  const initialMinutes = Number.isFinite(initialMinutesRaw) && [0, 15, 30, 45].includes(initialMinutesRaw)
    ? initialMinutesRaw
    : 0;
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [entries, setEntries] = useState<WorkEntry[]>([]);
  const [activityType, setActivityType] = useState<WorkEntry["activityType"]>(initialActivity);
  const [customerOptionId, setCustomerOptionId] = useState(initialCustomer);
  const [routeOptionId, setRouteOptionId] = useState(initialRoute);
  const [vehicleId, setVehicleId] = useState(initialVehicle);
  const [anchorDate, setAnchorDate] = useState<Date>(() => parseYYYYMMDD(selectedDate) ?? new Date());
  const [loading, setLoading] = useState(true);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [weekLoading, setWeekLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customersError, setCustomersError] = useState<string | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [weekTotalMinutes, setWeekTotalMinutes] = useState(0);
  const [weekWarning, setWeekWarning] = useState<string | null>(null);
  const [checkInStatus, setCheckInStatus] = useState<VehicleCheckInStatus | null>(null);
  const [checkInStatusError, setCheckInStatusError] = useState<string | null>(null);
  const [checkInGateError, setCheckInGateError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [entryEditingId, setEntryEditingId] = useState<string | null>(null);
  const [editActivityType, setEditActivityType] = useState<WorkEntry["activityType"]>("DRIVING");
  const [editCustomerId, setEditCustomerId] = useState("");
  const [editRouteId, setEditRouteId] = useState("");
  const [editVehicleId, setEditVehicleId] = useState("");
  const [editDuration, setEditDuration] = useState("");
  const [editNote, setEditNote] = useState("");
  const messageTimeoutRef = useRef<number | null>(null);
  const [durationHours, setDurationHours] = useState(initialHours);
  const [durationMinutes, setDurationMinutes] = useState(initialMinutes);
  const dayStripRef = useRef<HTMLDivElement | null>(null);
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { companySlug } = useParams();
  const [hasInitializedParams, setHasInitializedParams] = useState(false);
  const hasCustomer = !!customerOptionId;
  const hasRoute = !!routeOptionId;
  const hasVehicle = !!vehicleId;
  const isTodaySelected = selectedDate === formatYYYYMMDD(new Date());
  const selectedLocal = parseYYYYMMDDToLocalDate(selectedDate);
  const todayLocalMidnight = parseYYYYMMDDToLocalDate(formatLocalDateToYYYYMMDD(new Date()));
  const diffDays = selectedLocal && todayLocalMidnight ? daysBetween(selectedLocal, todayLocalMidnight) : 0;
  const isTooOldToEdit = diffDays > 7;
  const isFutureDate = diffDays < 0;
  const isEditableDate = !isFutureDate && !isTooOldToEdit;
  const selectedVehicleId = vehicleId ? Number(vehicleId) : null;
  const hasValidCheckIn = activityType === "DRIVING"
    && selectedVehicleId !== null
    && checkInStatus?.required === true
    && checkInStatus.isValid === true;
  const showCheckInWarning = activityType === "DRIVING"
    && selectedVehicleId !== null
    && checkInStatus?.required === true
    && checkInStatus.isValid === false;
  const requiresCheckIn = showCheckInWarning;
  const checkInHelperText = "Vehicle check-in required before driving today.";
  const checkInStatusText = selectedVehicleId === null
    ? "Select a vehicle to check in."
    : hasValidCheckIn
      ? "Checked in (valid for 24h)."
      : "No valid check-in for this vehicle.";
  const checkInStatusClassName = selectedVehicleId === null
    ? "muted"
    : hasValidCheckIn
      ? "success"
      : "error";
  const durationMin = durationHours * 60 + durationMinutes;
  const activityLabelMap: Record<WorkEntry["activityType"], string> = {
    DRIVING: "Driving",
    OTHER_WORK: "Other work",
    BREAK: "Break",
    AVAILABILITY: "Availability",
  };
  const visibleDays = useMemo(() => {
    const start = addDays(anchorDate, -13);
    return Array.from({ length: 14 }, (_, idx) => addDays(start, idx));
  }, [anchorDate]);

  const buildTimesheetParams = () => {
    const params = new URLSearchParams(searchParams);
    params.set("date", selectedDate);
    params.set("activity", activityType);
    params.set("customer", customerOptionId);
    params.set("route", routeOptionId);
    params.set("vehicle", vehicleId);
    params.set("h", String(durationHours));
    params.set("m", String(durationMinutes));
    return params;
  };

  const load = async (dateStr: string) => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const [routesData, vehiclesData, entriesData] = await Promise.all([
        getMyRoutes(),
        getMyVehicles(),
        getMyEntries(dateStr),
      ]);
      const fetchedRoutes = Array.isArray(routesData) ? routesData : routesData.routes || [];
      const fetchedVehicles = Array.isArray(vehiclesData) ? vehiclesData : vehiclesData.vehicles || [];
      setRoutes(fetchedRoutes);
      setVehicles([...fetchedVehicles].sort((a, b) => a.regNumber.localeCompare(b.regNumber)));
      const items = Array.isArray(entriesData?.items)
        ? entriesData.items
        : Array.isArray((entriesData as { data?: { items?: WorkEntry[] } })?.data?.items)
          ? (entriesData as { data?: { items?: WorkEntry[] } }).data?.items || []
          : [];
      setEntries(items);
      setError(null);
      setDataError(null);
    } catch (err) {
      setDataError("Failed to load data. Please refresh.");
    } finally {
      setLoading(false);
    }
  };

  const openEditEntryModal = (entry: WorkEntry) => {
    setErrorMessage(null);
    setEntryEditingId(entry.id);
    setEditActivityType(entry.activityType);
    setEditCustomerId(entry.customerOption?.id ?? "");
    setEditRouteId(entry.routeOption?.id ?? "");
    setEditVehicleId(entry.vehicle?.id ? String(entry.vehicle.id) : "");
    const hours = Math.floor(entry.durationMin / 60);
    const minutes = entry.durationMin % 60;
    setEditDuration(`${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`);
    setEditNote(entry.note ?? "");
  };

  const closeEditModal = () => {
    if (isSaving) return;
    setErrorMessage(null);
    setEntryEditingId(null);
  };

  const parseDurationToMinutes = (value: string) => {
    const trimmed = value.trim();
    if (!/^\d{1,2}:\d{2}$/.test(trimmed)) return null;
    const [h, m] = trimmed.split(":").map((part) => Number(part));
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    if (h < 0 || m < 0 || m > 59) return null;
    return h * 60 + m;
  };

  const handleQuickCreateEntry = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    if (!isEditableDate) {
      setErrorMessage("Editing is limited to the last 7 days.");
      setIsSaving(false);
      return;
    }
    if (durationMin === 0) {
      setErrorMessage("Duration must be greater than 00:00.");
      setIsSaving(false);
      return;
    }

    if ((activityType === "DRIVING" || activityType === "OTHER_WORK") && !customerOptionId) {
      setErrorMessage("Customer is required for driving or other work.");
      setIsSaving(false);
      return;
    }

    try {
      const payload = {
        date: selectedDate,
        activityType,
        durationMin,
        customerOptionId: customerOptionId || null,
        routeOptionId: routeOptionId || null,
        vehicleId: vehicleId ? Number(vehicleId) : null,
      };
      await createMyEntry(payload);
      await load(selectedDate);
      setSuccessMessage("Entry saved.");
      if (messageTimeoutRef.current) {
        window.clearTimeout(messageTimeoutRef.current);
      }
      messageTimeoutRef.current = window.setTimeout(() => {
        setSuccessMessage(null);
        messageTimeoutRef.current = null;
      }, 4000);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && activityType === "DRIVING" && vehicleId) {
        if (isTodaySelected) {
          const returnTo = `/driver/timesheet?${buildTimesheetParams().toString()}`;
          const path = `/driver/checklist?vehicleId=${vehicleId}&returnTo=${encodeURIComponent(returnTo)}`;
          navigate(tenantPath(companySlug, path));
          return;
        }
        setErrorMessage("Check-in is only available for today. You can still add past driving entries without check-in.");
        return;
      }
      setErrorMessage("Failed to save entry. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveEditEntry = async () => {
    if (!entryEditingId) return;
    if (isSaving) return;
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    if (!isEditableDate) {
      setErrorMessage("Editing is limited to the last 7 days.");
      setIsSaving(false);
      return;
    }
    const durationMin = parseDurationToMinutes(editDuration);
    if (!durationMin || durationMin <= 0) {
      setErrorMessage("Duration must be in HH:MM format and greater than 00:00.");
      setIsSaving(false);
      return;
    }

    if ((editActivityType === "DRIVING" || editActivityType === "OTHER_WORK") && !editCustomerId) {
      setErrorMessage("Customer is required for driving or other work.");
      setIsSaving(false);
      return;
    }

    try {
      const payload = {
        date: selectedDate,
        activityType: editActivityType,
        durationMin,
        customerOptionId: editCustomerId || null,
        routeOptionId: editRouteId || null,
        vehicleId: editVehicleId ? Number(editVehicleId) : null,
        note: editNote.trim() || null,
      };
      await updateMyEntry(entryEditingId, payload);
      if (selectedDate !== todayStr) {
        const path = `/driver/timesheet?date=${todayStr}&saved=1&savedDate=${selectedDate}`;
        closeEditModal();
        navigate(tenantPath(companySlug, path));
        return;
      }
      closeEditModal();
      await load(selectedDate);
      setSuccessMessage("Changes saved.");
      if (messageTimeoutRef.current) {
        window.clearTimeout(messageTimeoutRef.current);
      }
      messageTimeoutRef.current = window.setTimeout(() => {
        setSuccessMessage(null);
        messageTimeoutRef.current = null;
      }, 4000);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && editActivityType === "DRIVING" && editVehicleId) {
        if (isTodaySelected) {
          const returnTo = `${location.pathname}${location.search}`;
          const path = `/driver/checklist?vehicleId=${editVehicleId}&returnTo=${encodeURIComponent(returnTo)}`;
          closeEditModal();
          navigate(tenantPath(companySlug, path));
          return;
        }
        setErrorMessage("Check-in is only available for today. You can still add past driving entries without check-in.");
        return;
      }
      setErrorMessage("Failed to update entry. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEntry = async (entry: WorkEntry) => {
    const ok = window.confirm("Delete this entry?");
    if (!ok) return;
    try {
      await deleteMyEntry(entry.id);
      await load(selectedDate);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to delete entry.");
    }
  };

  const loadCustomers = async () => {
    setCustomersLoading(true);
    setCustomersError(null);
    try {
      const res = await getMyCustomers();
      setCustomers(res.customers || []);
    } catch (err) {
      setCustomersError("Unable to load customers.");
    } finally {
      setCustomersLoading(false);
    }
  };

  const loadCheckInStatus = async (targetVehicleId: number | null, dateStr: string, activity: WorkEntry["activityType"]) => {
    if (activity !== "DRIVING" || targetVehicleId === null) {
      setCheckInStatus(null);
      setCheckInStatusError(null);
      return;
    }
    setCheckInStatusError(null);
    try {
      const status = await getMyVehicleCheckInStatus({ vehicleId: targetVehicleId, date: dateStr });
      setCheckInStatus(status);
    } catch (err) {
      setCheckInStatus(null);
      setCheckInStatusError("Unable to load vehicle check-in status.");
    }
  };

  useEffect(() => {
    const dateParam = searchParams.get("date");
    const parsed = dateParam ? parseYYYYMMDD(dateParam) : null;
    if (!dateParam || !parsed) {
      setSearchParams({ date: todayStr }, { replace: true });
      setSelectedDate(todayStr);
      return;
    }
    setSelectedDate(dateParam);
    setHasInitializedParams(true);
  }, [searchParams, setSearchParams, todayStr]);

  useEffect(() => {
    const saved = searchParams.get("saved");
    const savedDate = searchParams.get("savedDate");
    if (saved === "1" && savedDate) {
      setSuccessMessage(`Entry saved for ${savedDate}.`);
      if (messageTimeoutRef.current) {
        window.clearTimeout(messageTimeoutRef.current);
      }
      messageTimeoutRef.current = window.setTimeout(() => {
        setSuccessMessage(null);
        messageTimeoutRef.current = null;
      }, 4000);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("saved");
      nextParams.delete("savedDate");
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const parsed = parseYYYYMMDD(selectedDate) ?? new Date();
    setAnchorDate(parsed);
  }, [selectedDate]);

  useEffect(() => {
    const hoursRaw = Number(searchParams.get("h"));
    const minutesRaw = Number(searchParams.get("m"));
    const nextHours = Number.isFinite(hoursRaw) && hoursRaw >= 0 && hoursRaw <= 24 ? hoursRaw : 0;
    const nextMinutes = Number.isFinite(minutesRaw) && [0, 15, 30, 45].includes(minutesRaw) ? minutesRaw : 0;
    setDurationHours(nextHours);
    setDurationMinutes(nextMinutes);
  }, [searchParams]);

  useEffect(() => {
    setError(null);
    setCheckInGateError(null);
  }, [activityType, customerOptionId, routeOptionId, vehicleId]);

  useEffect(() => {
    if (!hasInitializedParams) return;
    const params = buildTimesheetParams();
    setSearchParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hasInitializedParams,
    selectedDate,
    activityType,
    customerOptionId,
    routeOptionId,
    vehicleId,
    durationHours,
    durationMinutes,
  ]);

  useEffect(() => {
    load(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  useEffect(() => {
    loadCheckInStatus(selectedVehicleId, selectedDate, activityType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedVehicleId, activityType]);

  useEffect(() => {
    const shouldRefresh = Boolean(location.state && (location.state as { refreshCheckIns?: boolean }).refreshCheckIns);
    if (!shouldRefresh) return;
    loadCheckInStatus(selectedVehicleId, selectedDate, activityType).finally(() => {
      navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  useEffect(() => {
    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => (
    () => {
      if (messageTimeoutRef.current) {
        window.clearTimeout(messageTimeoutRef.current);
      }
    }
  ), []);

  useEffect(() => {
    if (!requiresCheckIn) {
      setCheckInGateError(null);
    }
  }, [requiresCheckIn]);

  useEffect(() => {
    const loadWeekTotals = async () => {
      const selected = parseYYYYMMDD(selectedDate);
      if (!selected) return;
      setWeekLoading(true);
      setWeekWarning(null);
      try {
        const weekStart = startOfISOWeek(selected);
        const days = Array.from({ length: 7 }, (_, idx) => addDays(weekStart, idx));
        const dayStrings = days.map((d) => formatYYYYMMDD(d));
        const results = await Promise.all(dayStrings.map((d) => getMyEntries(d)));
        let totalMinutes = 0;
        let warning: string | null = null;
        results.forEach((res) => {
          const list = res.items || [];
          list.forEach((entry) => {
            totalMinutes += Math.max(0, entry.durationMin || 0);
          });
        });
        setWeekTotalMinutes(totalMinutes);
        setWeekWarning(warning);
      } catch (err) {
        setWeekTotalMinutes(0);
      } finally {
        setWeekLoading(false);
      }
    };

    loadWeekTotals();
  }, [selectedDate, todayStr]);

  const selectedDateObj = parseYYYYMMDD(selectedDate) || new Date();
  const isoWeekNumber = getISOWeekNumber(selectedDateObj);
  const activitySummary = useMemo(() => {
    const totals = {
      DRIVING: 0,
      OTHER_WORK: 0,
      BREAK: 0,
      AVAILABILITY: 0,
    };
    entries.forEach((entry) => {
      totals[entry.activityType] += Math.max(0, entry.durationMin || 0);
    });
    const totalMinutes = Object.values(totals).reduce((sum, value) => sum + value, 0);
    return { totals, totalMinutes };
  }, [entries]);

  useEffect(() => {
    const container = dayStripRef.current;
    if (!container) return;
    const activeChip = container.querySelector(`[data-date="${selectedDate}"]`) as HTMLElement | null;
    if (activeChip) {
      activeChip.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [selectedDate, visibleDays]);

  return (
    <div className="min-h-screen flex items-start justify-center p-5">
      <Card className="w-full max-w-full sm:max-w-2xl lg:max-w-4xl">
        <SectionHeader
          title="Timesheet"
          subtitle={formatDisplayDate(selectedDateObj)}
          right={(
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-end" }}>
              <span className="muted" style={{ fontSize: "14px" }}>Week {isoWeekNumber}</span>
              <span className="muted" style={{ fontSize: "14px" }}>
                {weekLoading ? "This week: ..." : `This week: ${minutesToHoursLabel(weekTotalMinutes)}`}
              </span>
            </div>
          )}
        />
        {weekWarning ? <div className="muted" style={{ marginTop: "8px" }}>{weekWarning}</div> : null}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setAnchorDate((prev) => addDays(prev, -7))}
            className="hidden w-auto md:inline-flex"
          >
            {"<"}
          </Button>
          <div
            ref={dayStripRef}
            className="flex flex-1 flex-nowrap gap-2 overflow-x-auto snap-x snap-mandatory"
          >
            {visibleDays.map((d) => {
              const dateStr = formatYYYYMMDD(d);
              const { dow, dm } = formatDisplayDayChip(d);
              const isSelected = dateStr === selectedDate;
              const isFutureDay = dateStr > todayStr;
              return (
                <Button
                  key={dateStr}
                  type="button"
                  data-date={dateStr}
                  style={{
                    flex: "0 0 54px",
                    width: "54px",
                    minWidth: "54px",
                    maxWidth: "54px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "6px 6px",
                    borderRadius: "10px",
                    background: isSelected ? "#2563eb" : "#f3f4f6",
                    color: isSelected ? "#fff" : "#111827",
                    opacity: isFutureDay ? 0.5 : 1,
                    cursor: isFutureDay ? "not-allowed" : "pointer",
                  }}
                  className="snap-center"
                  disabled={isFutureDay}
                  onClick={() => setSelectedDate(dateStr)}
                >
                  <div style={{ fontWeight: 700, fontSize: "12px" }}>{dow}</div>
                  <div style={{ fontSize: "11px" }}>{dm}</div>
                </Button>
              );
            })}
          </div>
          <div className="flex items-center">
            <IconButton
              label="Jump to date"
              title="Jump to date"
              disabled={false}
              onClick={() => {
                const input = dateInputRef.current;
                if (!input) return;
                if (typeof input.showPicker === "function") {
                  input.showPicker();
                  return;
                }
                input.click();
              }}
            >
              <CalendarIcon />
            </IconButton>
            <input
              ref={dateInputRef}
              type="date"
              className="sr-only"
              value={selectedDate}
              onChange={(e) => {
                if (!e.target.value) return;
                setSelectedDate(e.target.value);
              }}
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setAnchorDate((prev) => {
              const next = addDays(prev, 7);
              const today = parseYYYYMMDD(todayStr) ?? new Date();
              return next > today ? today : next;
            })}
            disabled={anchorDate >= (parseYYYYMMDD(todayStr) ?? new Date())}
            className="hidden w-auto md:inline-flex"
          >
            {">"}
          </Button>
        </div>
        {isFutureDate ? (
          <div className="muted" style={{ marginBottom: "12px" }}>
            You're viewing a future date. You can view entries, but editing is not available.
          </div>
        ) : isTooOldToEdit ? (
          <div className="muted" style={{ marginBottom: "12px" }}>
            You're viewing an older date. You can view entries, but editing is limited to the last 7 days.
          </div>
        ) : !isTodaySelected ? (
          <div className="muted" style={{ marginBottom: "12px" }}>
            You're viewing a past date. You can add/edit entries, but check-in is only available for today.
          </div>
        ) : null}
        {error && <p className="error">Error: {error}</p>}
        {successMessage && <p className="success" style={{ marginTop: "6px" }}>{successMessage}</p>}
        {errorMessage && <p className="error" style={{ marginTop: "6px" }}>{errorMessage}</p>}

        {!loading && (
          <>
            <div style={{ marginTop: "16px" }}>
              <h3 style={{ margin: 0 }}>Entries for this date</h3>
              {loading || dataError ? (
                <ListState
                  loading={loading}
                  hasItems={false}
                  emptyTitle="No entries"
                  emptyMessage="No entries yet for this date."
                  errorMessage={dataError}
                >
                  <></>
                </ListState>
              ) : entries.length === 0 ? (
                <Card className="mt-2 flex min-h-[120px] flex-col items-center justify-center gap-2 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                    <InfoIcon />
                  </div>
                  <div className="text-sm font-semibold text-slate-800">No entries</div>
                  <div className="text-sm text-slate-600">No entries yet for this date.</div>
                </Card>
              ) : (
                <div style={{ marginTop: "8px", display: "grid", gap: "8px" }}>
                  {entries.map((entry) => {
                    const customerName = entry.customerOption?.name || "Internal";
                    const routeName = entry.routeOption?.name || null;
                    const vehicleLabel = entry.vehicle?.regNumber || entry.vehicle?.name || null;
                    const secondaryParts = [routeName, vehicleLabel].filter(Boolean) as string[];
                    return (
                      <div
                        key={entry.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "12px",
                          padding: "6px 8px",
                          borderRadius: "10px",
                          background: "#f9fafb",
                          fontSize: "12px",
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <div style={{ fontWeight: 700 }}>{customerName}</div>
                          {secondaryParts.length > 0 && (
                            <div className="muted" style={{ margin: 0, fontSize: "11px" }}>
                              {secondaryParts.join(" - ")}
                            </div>
                          )}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "6px" }}>
                            {formatMinutes(entry.durationMin)}
                            <span
                              title={`Activity: ${activityLabelMap[entry.activityType]}${entry.note?.trim() ? `\nNote: ${entry.note.trim()}` : ""}`}
                              style={{ color: "#6b7280", display: "inline-flex", alignItems: "center" }}
                            >
                              <InfoIcon />
                            </span>
                          </div>
                          <IconButton
                            label="Edit entry"
                            title="Edit"
                            disabled={!isEditableDate || isSaving}
                            onClick={() => openEditEntryModal(entry)}
                          >
                            <PencilIcon />
                          </IconButton>
                          <IconButton
                            label="Delete entry"
                            title="Delete"
                            disabled={!isEditableDate || isSaving}
                            onClick={() => handleDeleteEntry(entry)}
                          >
                            <TrashIcon />
                          </IconButton>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div style={{ fontWeight: 700, marginTop: "10px" }}>
                Total: {formatMinutes(activitySummary.totalMinutes)}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <label className="field w-full">
                <span>Customer</span>
                <select
                  value={customerOptionId}
                  onChange={(e) => setCustomerOptionId(e.target.value)}
                  disabled={customersLoading || !isEditableDate || isSaving}
                  className="w-full"
                >
                  <option value="">Select customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
                {customersError && <p className="error" style={{ marginTop: "6px" }}>{customersError}</p>}
              </label>

              <label className="field w-full">
                <span>Activity</span>
                <select
                  value={activityType}
                  onChange={(e) => setActivityType(e.target.value as WorkEntry["activityType"])}
                  disabled={!isEditableDate || isSaving}
                  className="w-full"
                >
                  <option value="DRIVING">Driving</option>
                  <option value="OTHER_WORK">Other work</option>
                  <option value="BREAK">Break</option>
                  <option value="AVAILABILITY">Availability</option>
                </select>
              </label>

              <label className="field w-full">
                <span>Route</span>
                <select
                  value={routeOptionId}
                  onChange={(e) => setRouteOptionId(e.target.value)}
                  disabled={!isEditableDate || isSaving}
                  className="w-full"
                >
                  <option value="">Select route</option>
                  {routes.map((route) => (
                    <option key={route.id} value={route.id}>
                      {route.name}
                    </option>
                  ))}
                </select>
                {routes.length === 0 && <p style={{ marginTop: "6px", color: "#666" }}>No routes available. Ask your admin to add routes.</p>}
              </label>
            </div>

            <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end">
              <label className="field w-full md:flex-1">
                <span>Vehicle</span>
                <select
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  disabled={!isEditableDate || isSaving}
                  className="w-full"
                >
                  <option value="">No vehicle</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.regNumber}
                      {vehicle.name ? ` - ${vehicle.name}` : ""}
                    </option>
                  ))}
                </select>
                {vehicles.length === 0 && (
                  <p style={{ marginTop: "6px", color: "#666" }}>No active vehicles available. Ask your admin to add vehicles.</p>
                )}
                <p className={checkInStatusClassName} style={{ marginTop: "6px", fontWeight: 600 }}>
                  {checkInStatusText}
                </p>
                {showCheckInWarning && (
                  <p className="muted" style={{ marginTop: "4px" }}>{checkInHelperText}</p>
                )}
                {checkInStatusError && (
                  <p className="error" style={{ marginTop: "4px" }}>{checkInStatusError}</p>
                )}
              </label>
              {isTodaySelected && (
                <div className="flex flex-col gap-2 md:items-start">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      if (!hasVehicle) return;
                      const returnTo = `${location.pathname}${location.search}`;
                      const path = `/driver/checklist?vehicleId=${vehicleId}&returnTo=${encodeURIComponent(returnTo)}`;
                      navigate(tenantPath(companySlug, path));
                    }}
                    disabled={!hasVehicle || isSaving}
                    className="w-full sm:w-auto"
                  >
                    Check in
                  </Button>
                </div>
              )}
            </div>

            <div style={{ marginTop: "12px" }}>
              <div className="flex flex-wrap items-center gap-3">
                <label className="field w-full sm:w-auto">
                  <span>Hours</span>
                  <select
                    value={durationHours}
                    onChange={(e) => setDurationHours(Number(e.target.value))}
                    disabled={!isEditableDate || isSaving}
                    className="h-10 w-full"
                  >
                    {Array.from({ length: 25 }, (_, idx) => (
                      <option key={idx} value={idx}>
                        {idx}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field w-full sm:w-auto">
                  <span>Minutes</span>
                  <select
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    disabled={!isEditableDate || isSaving}
                    className="h-10 w-full"
                  >
                    {[0, 15, 30, 45].map((value) => (
                      <option key={value} value={value}>
                        {String(value).padStart(2, "0")}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <Button
                type="button"
                variant="primary"
                onClick={handleQuickCreateEntry}
                disabled={isSaving || durationMin === 0 || !isEditableDate}
                className="mt-2 h-11 w-full rounded-xl bg-slate-900 px-4 text-white shadow-sm hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? (
                  <span style={{ display: "inline-flex", alignItems: "center" }}>
                    <InlineSpinner />
                    Saving...
                  </span>
                ) : (
                  "Add entry"
                )}
              </Button>
              {durationMin === 0 && (
                <p className="muted" style={{ marginTop: "6px" }}>Duration required.</p>
              )}
            </div>
          </>
        )}
      </Card>
      {entryEditingId ? (
        <div
          role="presentation"
          onClick={closeEditModal}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(17, 24, 39, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            zIndex: 50,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
            style={{
              background: "#fff",
              width: "100%",
              maxWidth: "520px",
              borderRadius: "12px",
              padding: "20px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
              <div>
                <h2 style={{ margin: 0 }}>Edit entry</h2>
                <p className="muted" style={{ margin: 0 }}>
                  Log your work for {formatDisplayDate(selectedDateObj)}.
                </p>
              </div>
              <Button variant="secondary" size="sm" type="button" onClick={closeEditModal} disabled={isSaving}>
                Cancel
              </Button>
            </div>

            {errorMessage && <div className="error" style={{ marginTop: "12px" }}>{errorMessage}</div>}

            <div style={{ marginTop: "16px", display: "grid", gap: "12px" }}>
              <label className="field">
                <span>Activity</span>
                <select
                  value={editActivityType}
                  onChange={(e) => setEditActivityType(e.target.value as WorkEntry["activityType"])}
                  disabled={isSaving}
                >
                  <option value="DRIVING">Driving</option>
                  <option value="OTHER_WORK">Other work</option>
                  <option value="BREAK">Break</option>
                  <option value="AVAILABILITY">Availability</option>
                </select>
              </label>
              <label className="field">
                <span>Customer</span>
                <select
                  value={editCustomerId}
                  onChange={(e) => setEditCustomerId(e.target.value)}
                  disabled={isSaving}
                >
                  <option value="">Select customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
                {(editActivityType === "DRIVING" || editActivityType === "OTHER_WORK") && (
                  <p className="muted" style={{ marginTop: "6px" }}>Required for driving/other work.</p>
                )}
              </label>
              <label className="field">
                <span>Route</span>
                <select value={editRouteId} onChange={(e) => setEditRouteId(e.target.value)} disabled={isSaving}>
                  <option value="">No route</option>
                  {routes.map((route) => (
                    <option key={route.id} value={route.id}>
                      {route.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Vehicle</span>
                <select value={editVehicleId} onChange={(e) => setEditVehicleId(e.target.value)} disabled={isSaving}>
                  <option value="">No vehicle</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.regNumber}
                      {vehicle.name ? ` - ${vehicle.name}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Duration (HH:MM)</span>
                <Input
                  placeholder="01:30"
                  value={editDuration}
                  onChange={(e) => setEditDuration(e.target.value)}
                  disabled={isSaving}
                />
              </label>
              <label className="field">
                <span>Note</span>
                <textarea
                  rows={3}
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  disabled={isSaving}
                />
              </label>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "16px" }}>
              <Button variant="secondary" onClick={closeEditModal} disabled={isSaving}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSaveEditEntry} disabled={isSaving}>
                {isSaving ? (
                  <span style={{ display: "inline-flex", alignItems: "center" }}>
                    <InlineSpinner />
                    Saving...
                  </span>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default DriverTimesheetTodayPage;








