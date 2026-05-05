import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
import TimesheetLeftCard from "../../components/timesheet/TimesheetLeftCard";

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
  const [dayWindow, setDayWindow] = useState(7);

  const dayStripRef = useRef<HTMLDivElement | null>(null);

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

  const visibleDays = useMemo(() => {
    const renderWindow = Math.max(5, dayWindow + 4);
    const half = Math.floor(renderWindow / 2);
    const start = addDays(anchorDate, -half);
    return Array.from({ length: renderWindow }, (_, idx) => addDays(start, idx));
  }, [anchorDate, dayWindow]);

  // Robust centering: uses DOM rects (works regardless of padding/gap/flex)
  const centerSelectedDay = useCallback((behavior: ScrollBehavior = "auto") => {
    const container = dayStripRef.current;
    if (!container) return;

    const idx = visibleDays.findIndex((day) => formatYYYYMMDD(day) === selectedDate);
    if (idx === -1) return;

    const maxScroll = container.scrollWidth - container.clientWidth;
    if (maxScroll <= 0) return;

    const chipWidth = container.clientWidth / Math.max(1, dayWindow);
    const target = (idx + 0.5) * chipWidth - container.clientWidth / 2;
    const clamped = Math.max(0, Math.min(target, maxScroll));
    container.scrollTo({ left: clamped, behavior });
  }, [dayWindow, selectedDate, visibleDays]);

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

      if (messageTimeoutRef.current) window.clearTimeout(messageTimeoutRef.current);
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

    const durationMinParsed = parseDurationToMinutes(editDuration);
    if (!durationMinParsed || durationMinParsed <= 0) {
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
        durationMin: durationMinParsed,
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

      if (messageTimeoutRef.current) window.clearTimeout(messageTimeoutRef.current);
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
      if (messageTimeoutRef.current) window.clearTimeout(messageTimeoutRef.current);
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
      if (messageTimeoutRef.current) window.clearTimeout(messageTimeoutRef.current);
    }
  ), []);

  useEffect(() => {
    if (!requiresCheckIn) setCheckInGateError(null);
  }, [requiresCheckIn]);

  useEffect(() => {
    const el = dayStripRef.current;
    if (!el) return;

    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;

      let n = 5;
      if (w >= 680) n = 7;
      if (w >= 840) n = 9;
      if (w >= 1020) n = 11;
      if (w >= 1200) n = 13;

      if (n % 2 === 0) n += 1;
      setDayWindow(n);
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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

  // Center after render when date / visible days change (prevents jump)
  useLayoutEffect(() => {
    // 2x rAF: wait for flex layout + fonts, then measure/scroll
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        centerSelectedDay("auto");
      });
    });
  }, [centerSelectedDay, selectedDate, visibleDays]);

  // Re-center on resize (debounced via rAF)
  useEffect(() => {
    let raf = 0;
    const onResize = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => centerSelectedDay("auto"));
    };
    window.addEventListener("resize", onResize);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [centerSelectedDay]);

  const selectedDateLabel = formatDisplayDate(selectedDateObj);
  const weekLabel = `Week ${isoWeekNumber}`;
  const weekHoursLabel = weekLoading ? "This week: ..." : `This week: ${minutesToHoursLabel(weekTotalMinutes)}`;
  const totalLabel = `Total: ${formatMinutes(activitySummary.totalMinutes)}`;

  const handleCalendarChange = (dateStr: string) => {
    if (!dateStr) return;
    const parsed = parseYYYYMMDD(dateStr);
    if (!parsed) return;
    setSearchParams({ date: formatYYYYMMDD(parsed) }, { replace: true });
  };

  return (
    <div className="min-h-screen p-5">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start lg:overflow-hidden">
        <TimesheetLeftCard
          className="w-full min-w-0 overflow-hidden"
          title="Timesheet"
          selectedDateLabel={selectedDateLabel}
          weekLabel={weekLabel}
          weekHoursLabel={weekHoursLabel}
          weekWarning={weekWarning}
          todayStr={todayStr}
          dayWindow={dayWindow}
          dayStripRef={dayStripRef}
          visibleDays={visibleDays}
          selectedDate={selectedDate}
          onSelectDate={(dateStr) => setSearchParams({ date: dateStr }, { replace: true })}
          formatDayChip={formatDisplayDayChip}
          formatDateParam={formatYYYYMMDD}
          onPrevWeek={() => setAnchorDate((prev) => addDays(prev, -7))}
          onNextWeek={() => setAnchorDate((prev) => {
            const next = addDays(prev, 7);
            const today = parseYYYYMMDD(todayStr) ?? new Date();
            return next > today ? today : next;
          })}
          nextDisabled={anchorDate >= (parseYYYYMMDD(todayStr) ?? new Date())}
          calendarValue={selectedDate}
          onCalendarChange={handleCalendarChange}
          isFutureDate={isFutureDate}
          isTooOldToEdit={isTooOldToEdit}
          isTodaySelected={isTodaySelected}
          error={error}
          successMessage={successMessage}
          errorMessage={errorMessage}
          loading={loading}
          entries={entries}
          dataError={dataError}
          isEditableDate={isEditableDate}
          isSaving={isSaving}
          onEditEntry={openEditEntryModal}
          onDeleteEntry={handleDeleteEntry}
          activityLabelMap={activityLabelMap}
          formatMinutes={formatMinutes}
          totalLabel={totalLabel}
        />

        {!loading && (
          <Card className="w-full">
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
              <label className="field">
                <span>Customer</span>
                <select
                  value={customerOptionId}
                  onChange={(e) => setCustomerOptionId(e.target.value)}
                  disabled={customersLoading || !isEditableDate || isSaving}
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

              <label className="field">
                <span>Activity</span>
                <select
                  value={activityType}
                  onChange={(e) => setActivityType(e.target.value as WorkEntry["activityType"])}
                  disabled={!isEditableDate || isSaving}
                >
                  <option value="DRIVING">Driving</option>
                  <option value="OTHER_WORK">Other work</option>
                  <option value="BREAK">Break</option>
                  <option value="AVAILABILITY">Availability</option>
                </select>
              </label>

              <label className="field">
                <span>Route</span>
                <select value={routeOptionId} onChange={(e) => setRouteOptionId(e.target.value)} disabled={!isEditableDate || isSaving}>
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

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
              <label className="field">
                <span>Vehicle</span>
                <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} disabled={!isEditableDate || isSaving}>
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
              </label>

              {isTodaySelected && (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div
                    className={checkInStatusClassName}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      fontWeight: 600,
                    }}
                  >
                    {hasValidCheckIn && (
                      <svg aria-hidden="true" viewBox="0 0 20 20" width="14" height="14" fill="currentColor">
                        <path d="M7.667 13.2 4.4 9.933l-1.2 1.2 4.467 4.467 9.133-9.133-1.2-1.2-8.133 8.133Z" />
                      </svg>
                    )}
                    {checkInStatusText}
                  </div>

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
                  >
                    Check in
                  </Button>

                  {showCheckInWarning && <p className="muted" style={{ margin: 0 }}>{checkInHelperText}</p>}
                  {checkInStatusError && <p className="error" style={{ margin: 0 }}>{checkInStatusError}</p>}
                </div>
              )}
            </div>

            <div style={{ marginTop: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <label className="field" style={{ margin: 0 }}>
                  <span>Hours</span>
                  <select
                    value={durationHours}
                    onChange={(e) => setDurationHours(Number(e.target.value))}
                    disabled={!isEditableDate || isSaving}
                  >
                    {Array.from({ length: 25 }, (_, idx) => (
                      <option key={idx} value={idx}>
                        {idx}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field" style={{ margin: 0 }}>
                  <span>Minutes</span>
                  <select
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    disabled={!isEditableDate || isSaving}
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
                className="w-full mt-2"
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

              {durationMin === 0 && <p className="muted" style={{ marginTop: "6px" }}>Duration required.</p>}
            </div>
          </Card>
        )}
      </div>

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
