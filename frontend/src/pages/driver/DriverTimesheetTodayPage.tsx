import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  getMyRoutes,
  getMyVehicles,
  getMyCustomers,
  getMyEntries,
  createMyEntry,
  updateMyEntry,
  deleteMyEntry,
  getMyRecentVehicleCheckIns,
  type RouteOption,
  type VehicleOption,
  type CustomerOption,
  type WorkEntry,
  type RecentVehicleCheckIn,
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
  const [message, setMessage] = useState<string | null>(null);
  const [weekTotalMinutes, setWeekTotalMinutes] = useState(0);
  const [weekWarning, setWeekWarning] = useState<string | null>(null);
  const [recentCheckIns, setRecentCheckIns] = useState<RecentVehicleCheckIn[]>([]);
  const [recentCheckInsError, setRecentCheckInsError] = useState<string | null>(null);
  const [checkInGateError, setCheckInGateError] = useState<string | null>(null);
  const [entrySaving, setEntrySaving] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);
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
  const navigate = useNavigate();
  const location = useLocation();
  const { companySlug } = useParams();
  const [hasInitializedParams, setHasInitializedParams] = useState(false);
  const hasCustomer = !!customerOptionId;
  const hasRoute = !!routeOptionId;
  const hasVehicle = !!vehicleId;
  const isTodaySelected = selectedDate === todayStr;
  const selectedVehicleId = vehicleId ? Number(vehicleId) : null;
  const hasValidCheckIn = selectedVehicleId === null
    ? true
    : recentCheckIns.some((checkIn) => checkIn.vehicleId === selectedVehicleId);
  const requiresCheckIn = selectedVehicleId !== null && !hasValidCheckIn;
  const checkInHelperText = "Vehicle check-in required (valid for 24h).";
  const durationMin = durationHours * 60 + durationMinutes;

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
    setMessage(null);
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
    setEntryError(null);
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
    if (entrySaving) return;
    setEntryError(null);
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
    setEntryError(null);
    if (durationMin === 0) {
      setEntryError("Duration must be greater than 00:00.");
      return;
    }

    if ((activityType === "DRIVING" || activityType === "OTHER_WORK") && !customerOptionId) {
      setEntryError("Customer is required for driving or other work.");
      return;
    }

    if (vehicleId) {
      const vehicleIdNumber = Number(vehicleId);
      const hasTodayCheckIn = recentCheckIns.some((checkIn) => {
        if (checkIn.vehicleId !== vehicleIdNumber) return false;
        const checkInDate = formatYYYYMMDD(new Date(checkIn.checkedInAt));
        return checkInDate === selectedDate;
      });
      if (!hasTodayCheckIn) {
        const returnTo = `${location.pathname}${location.search}`;
        const path = `/driver/checklist?vehicleId=${vehicleId}&returnTo=${encodeURIComponent(returnTo)}`;
        navigate(tenantPath(companySlug, path));
        return;
      }
    }

    setEntrySaving(true);
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
      setMessage("Entry saved");
      if (messageTimeoutRef.current) {
        window.clearTimeout(messageTimeoutRef.current);
      }
      messageTimeoutRef.current = window.setTimeout(() => {
        setMessage(null);
        messageTimeoutRef.current = null;
      }, 2000);
    } catch (err) {
      if (
        err instanceof ApiError &&
        err.status === 409 &&
        activityType === "DRIVING" &&
        vehicleId
      ) {
        const returnTo = `/driver/timesheet?${buildTimesheetParams().toString()}`;
        const path = `/driver/checklist?vehicleId=${vehicleId}&returnTo=${encodeURIComponent(returnTo)}`;
        navigate(tenantPath(companySlug, path));
        return;
      }
      setEntryError(err instanceof Error ? err.message : "Failed to create entry.");
    } finally {
      setEntrySaving(false);
    }
  };

  const handleSaveEditEntry = async () => {
    if (!entryEditingId) return;
    setEntryError(null);
    const durationMin = parseDurationToMinutes(editDuration);
    if (!durationMin || durationMin <= 0) {
      setEntryError("Duration must be in HH:MM format and greater than 00:00.");
      return;
    }

    if ((editActivityType === "DRIVING" || editActivityType === "OTHER_WORK") && !editCustomerId) {
      setEntryError("Customer is required for driving or other work.");
      return;
    }

    setEntrySaving(true);
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
      closeEditModal();
      await load(selectedDate);
    } catch (err) {
      if (
        err instanceof ApiError &&
        err.status === 409 &&
        editActivityType === "DRIVING" &&
        editVehicleId
      ) {
        const returnTo = `${location.pathname}${location.search}`;
        const path = `/driver/checklist?vehicleId=${editVehicleId}&returnTo=${encodeURIComponent(returnTo)}`;
        closeEditModal();
        navigate(tenantPath(companySlug, path));
        return;
      }
      setEntryError(err instanceof Error ? err.message : "Failed to update entry.");
    } finally {
      setEntrySaving(false);
    }
  };

  const handleDeleteEntry = async (entry: WorkEntry) => {
    const ok = window.confirm("Delete this entry?");
    if (!ok) return;
    try {
      await deleteMyEntry(entry.id);
      await load(selectedDate);
    } catch (err) {
      setEntryError(err instanceof Error ? err.message : "Failed to delete entry.");
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

  const loadRecentCheckIns = async () => {
    setRecentCheckInsError(null);
    try {
      const checkIns = await getMyRecentVehicleCheckIns(24);
      setRecentCheckIns(checkIns);
    } catch (err) {
      setRecentCheckInsError("Unable to load recent vehicle check-ins.");
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
    loadRecentCheckIns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  useEffect(() => {
    if (!isTodaySelected) return;
    const container = dayStripRef.current;
    if (!container) return;
    container.scrollLeft = container.scrollWidth;
  }, [isTodaySelected]);

  useEffect(() => {
    const shouldRefresh = Boolean(location.state && (location.state as { refreshCheckIns?: boolean }).refreshCheckIns);
    if (!shouldRefresh) return;
    loadRecentCheckIns().finally(() => {
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
  const visibleDays = useMemo(() => {
    const start = addDays(anchorDate, -6);
    return Array.from({ length: 7 }, (_, idx) => addDays(start, idx));
  }, [anchorDate]);

  return (
    <div className="page">
      <div className="card">
        <div style={{ display: "flex", flexDirection: "column" }}>
          <h1 style={{ textAlign: "center", margin: 0 }}>Timesheet</h1>
          <div style={{ fontWeight: 700, marginTop: "4px" }}>{formatDisplayDate(selectedDateObj)}</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span className="muted" style={{ fontSize: "14px" }}>Week {isoWeekNumber}</span>
            <span className="muted" style={{ fontSize: "14px" }}>
              {weekLoading ? "This week: ..." : `This week: ${minutesToHoursLabel(weekTotalMinutes)}`}
            </span>
          </div>
          {weekWarning ? <div className="muted" style={{ marginBottom: "8px" }}>{weekWarning}</div> : null}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
          <button
            type="button"
            className="button secondary"
            onClick={() => setAnchorDate((prev) => addDays(prev, -7))}
            style={{ width: "auto", padding: "6px 10px", fontSize: "12px" }}
          >
            {"<"}
          </button>
          <div
            ref={dayStripRef}
            style={{
              display: "flex",
              flexWrap: "nowrap",
              overflow: "hidden",
              gap: "6px",
              flex: 1,
              justifyContent: "space-between",
            }}
          >
            {visibleDays.map((d) => {
              const dateStr = formatYYYYMMDD(d);
              const { dow, dm } = formatDisplayDayChip(d);
              const isSelected = dateStr === selectedDate;
              return (
                <button
                  key={dateStr}
                  type="button"
                  className="button"
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
                  }}
                  onClick={() => setSearchParams({ date: dateStr }, { replace: true })}
                >
                  <div style={{ fontWeight: 700, fontSize: "12px" }}>{dow}</div>
                  <div style={{ fontSize: "11px" }}>{dm}</div>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="button secondary"
            onClick={() => setAnchorDate((prev) => {
              const next = addDays(prev, 7);
              const today = parseYYYYMMDD(todayStr) ?? new Date();
              return next > today ? today : next;
            })}
            disabled={anchorDate >= (parseYYYYMMDD(todayStr) ?? new Date())}
            style={{ width: "auto", padding: "6px 10px", fontSize: "12px" }}
          >
            {">"}
          </button>
        </div>
        {!isTodaySelected && (
          <div className="muted" style={{ marginBottom: "12px" }}>
            Viewing a past date. Start/Stop and Check-in are disabled.
          </div>
        )}
        {loading && <p>Loading...</p>}
        {dataError && <p className="error">{dataError}</p>}
        {error && <p className="error">Error: {error}</p>}
        {message && <p className="success">{message}</p>}

        {!loading && (
          <>
            <div style={{ marginTop: "16px" }}>
              <h3 style={{ margin: 0 }}>Entries for today</h3>
              {entries.length === 0 ? (
                <p style={{ marginTop: "8px" }}>No entries yet for today.</p>
              ) : (
                <div style={{ marginTop: "8px", display: "grid", gap: "8px" }}>
                  {entries.map((entry) => {
                    const metaParts = [
                      entry.customerOption?.name,
                      entry.routeOption?.name,
                      entry.vehicle?.regNumber || entry.vehicle?.name,
                    ].filter(Boolean) as string[];
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
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                          <strong>{entry.activityType}</strong>
                          {metaParts.length > 0 && <span>{`• ${metaParts.join(" • ")}`}</span>}
                          <span>{`— ${formatMinutes(entry.durationMin)}`}</span>
                        </div>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            className="button"
                            type="button"
                            onClick={() => openEditEntryModal(entry)}
                            style={{ padding: "4px 8px", fontSize: "12px", borderRadius: "8px" }}
                          >
                            Edit
                          </button>
                          <button
                            className="button secondary"
                            type="button"
                            onClick={() => handleDeleteEntry(entry)}
                            style={{ padding: "4px 8px", fontSize: "12px", borderRadius: "8px" }}
                          >
                            Delete
                          </button>
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginTop: "16px" }}>
              <label className="field">
                <span>Customer</span>
                <select
                  value={customerOptionId}
                  onChange={(e) => setCustomerOptionId(e.target.value)}
                  disabled={customersLoading}
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
                <select value={activityType} onChange={(e) => setActivityType(e.target.value as WorkEntry["activityType"])}>
                  <option value="DRIVING">Driving</option>
                  <option value="OTHER_WORK">Other work</option>
                  <option value="BREAK">Break</option>
                  <option value="AVAILABILITY">Availability</option>
                </select>
              </label>

              <label className="field">
                <span>Route</span>
                <select value={routeOptionId} onChange={(e) => setRouteOptionId(e.target.value)}>
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

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", alignItems: "end", marginTop: "12px" }}>
              <label className="field">
                <span>Vehicle</span>
                <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
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
              <button
                className="button"
                type="button"
                onClick={() => {
                  if (!hasVehicle || !isTodaySelected) return;
                  const returnTo = `${location.pathname}${location.search}`;
                  const path = `/driver/checklist?vehicleId=${vehicleId}&returnTo=${encodeURIComponent(returnTo)}`;
                  navigate(tenantPath(companySlug, path));
                }}
                disabled={!hasVehicle || !isTodaySelected}
                style={{ height: "fit-content" }}
              >
                Check in
              </button>
            </div>

            <div style={{ marginTop: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <label className="field" style={{ margin: 0 }}>
                  <span>Hours</span>
                  <select
                    value={durationHours}
                    onChange={(e) => setDurationHours(Number(e.target.value))}
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
                  >
                    {[0, 15, 30, 45].map((value) => (
                      <option key={value} value={value}>
                        {String(value).padStart(2, "0")}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <button
                className="button"
                type="button"
                onClick={handleQuickCreateEntry}
                disabled={entrySaving || durationMin === 0}
                style={{ width: "100%", marginTop: "10px" }}
              >
                Add entry
              </button>
              {durationMin === 0 && (
                <p className="muted" style={{ marginTop: "6px" }}>Duration required.</p>
              )}
              {entryError && <p className="error" style={{ marginTop: "8px" }}>{entryError}</p>}
            </div>
          </>
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
              <button className="button secondary" type="button" onClick={closeEditModal} disabled={entrySaving}>
                Cancel
              </button>
            </div>

            {entryError && <div className="error" style={{ marginTop: "12px" }}>{entryError}</div>}

            <div style={{ marginTop: "16px", display: "grid", gap: "12px" }}>
              <label className="field">
                <span>Activity</span>
                <select
                  value={editActivityType}
                  onChange={(e) => setEditActivityType(e.target.value as WorkEntry["activityType"])}
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
                <select value={editRouteId} onChange={(e) => setEditRouteId(e.target.value)}>
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
                <select value={editVehicleId} onChange={(e) => setEditVehicleId(e.target.value)}>
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
                <input
                  placeholder="01:30"
                  value={editDuration}
                  onChange={(e) => setEditDuration(e.target.value)}
                />
              </label>
              <label className="field">
                <span>Note</span>
                <textarea
                  rows={3}
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                />
              </label>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "16px" }}>
              <button className="button secondary" type="button" onClick={closeEditModal} disabled={entrySaving}>
                Cancel
              </button>
              <button className="button" type="button" onClick={handleSaveEditEntry} disabled={entrySaving}>
                {entrySaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default DriverTimesheetTodayPage;




