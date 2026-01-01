import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  getMyRoutes,
  getMyVehicles,
  getMyCustomers,
  getMyRuns,
  startMyRun,
  stopMyRun,
  getMyRecentVehicleCheckIns,
  type RouteOption,
  type VehicleOption,
  type CustomerOption,
  type WorkRun,
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

const formatTime = (iso: string | null) => {
  if (!iso) return "...";
  const d = new Date(iso);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
};

const activityLabels: Record<WorkRun["activityType"], string> = {
  DRIVING: "Driving",
  OTHER_WORK: "Other work",
  BREAK: "Break",
  AVAILABILITY: "Availability",
};

const isActivityType = (value: string | null): value is WorkRun["activityType"] =>
  value === "DRIVING" || value === "OTHER_WORK" || value === "BREAK" || value === "AVAILABILITY";

const minutesToHoursLabel = (minutes: number) => {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (m === 0) return `${h}h`;
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
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [runs, setRuns] = useState<WorkRun[]>([]);
  const [activeRun, setActiveRun] = useState<WorkRun | null>(null);
  const [activityType, setActivityType] = useState<WorkRun["activityType"]>(initialActivity);
  const [customerOptionId, setCustomerOptionId] = useState(initialCustomer);
  const [routeOptionId, setRouteOptionId] = useState(initialRoute);
  const [vehicleId, setVehicleId] = useState(initialVehicle);
  const [loading, setLoading] = useState(true);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [weekLoading, setWeekLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customersError, setCustomersError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<"START" | "STOP" | "CHECKIN" | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [weekTotalMinutes, setWeekTotalMinutes] = useState(0);
  const [weekWarning, setWeekWarning] = useState<string | null>(null);
  const [recentCheckIns, setRecentCheckIns] = useState<RecentVehicleCheckIn[]>([]);
  const [recentCheckInsError, setRecentCheckInsError] = useState<string | null>(null);
  const [checkInGateError, setCheckInGateError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { companySlug } = useParams();
  const [hasInitializedParams, setHasInitializedParams] = useState(false);

  const hasCustomer = !!customerOptionId;
  const hasRoute = !!routeOptionId;
  const hasVehicle = !!vehicleId;
  const hasActiveRun = !!activeRun;
  const isTodaySelected = selectedDate === todayStr;
  const selectedVehicleId = vehicleId ? Number(vehicleId) : null;
  const hasValidCheckIn = selectedVehicleId === null
    ? true
    : recentCheckIns.some((checkIn) => checkIn.vehicleId === selectedVehicleId);
  const requiresCheckIn = selectedVehicleId !== null && !hasValidCheckIn;
  const checkInHelperText = "Vehicle check-in required (valid for 24h).";

  const buildTimesheetParams = () => {
    const params = new URLSearchParams();
    params.set("date", selectedDate);
    params.set("activity", activityType);
    params.set("customer", customerOptionId);
    params.set("route", routeOptionId);
    params.set("vehicle", vehicleId);
    return params;
  };

  const load = async (dateStr: string) => {
    setLoading(true);
    setError(null);
    setLastAction(null);
    setMessage(null);
    try {
      const [routesData, vehiclesData, runsData] = await Promise.all([
        getMyRoutes(),
        getMyVehicles(),
        getMyRuns(dateStr),
      ]);
      const fetchedRoutes = Array.isArray(routesData) ? routesData : routesData.routes || [];
      const fetchedVehicles = Array.isArray(vehiclesData) ? vehiclesData : vehiclesData.vehicles || [];
      setRoutes(fetchedRoutes);
      setVehicles([...fetchedVehicles].sort((a, b) => a.regNumber.localeCompare(b.regNumber)));
      const dayRuns = runsData.runs || [];
      setRuns([...dayRuns].sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()));
      setActiveRun(isTodaySelected ? runsData.activeRun || null : null);
      if (isTodaySelected && runsData.activeRun) {
        setCustomerOptionId(runsData.activeRun.customerOptionId || "");
        setRouteOptionId(runsData.activeRun.routeOptionId);
        setVehicleId(runsData.activeRun.vehicleId ? String(runsData.activeRun.vehicleId) : "");
      }
      setError(null);
      setLastAction(null);
      setDataError(null);
    } catch (err) {
      setDataError("Failed to load data. Please refresh.");
    } finally {
      setLoading(false);
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
    setError(null);
    setLastAction(null);
    setCheckInGateError(null);
  }, [activityType, customerOptionId, routeOptionId, vehicleId]);

  useEffect(() => {
    if (!hasInitializedParams) return;
    const params = buildTimesheetParams();
    setSearchParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasInitializedParams, selectedDate, activityType, customerOptionId, routeOptionId, vehicleId]);

  useEffect(() => {
    load(selectedDate);
    loadRecentCheckIns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

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
        const results = await Promise.all(dayStrings.map((d) => getMyRuns(d)));
        let totalMinutes = 0;
        let warning: string | null = null;
        results.forEach((res, idx) => {
          const dateStr = dayStrings[idx];
          const isToday = dateStr === todayStr;
          const list = res.runs || [];
          list.forEach((run) => {
            if (!run.endedAt) {
              if (isToday) {
                const start = new Date(run.startedAt).getTime();
                const end = Date.now();
                totalMinutes += Math.max(0, Math.floor((end - start) / 60000));
              } else if (!warning) {
                warning = `Unfinished run exists on ${formatDisplayDate(days[idx])}`;
              }
              return;
            }
            const start = new Date(run.startedAt).getTime();
            const end = new Date(run.endedAt).getTime();
            totalMinutes += Math.max(0, Math.floor((end - start) / 60000));
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

  const onStart = async () => {
    if (!hasCustomer || !hasRoute || submitting || !isTodaySelected || customersError || customersLoading) return;
    setSubmitting(true);
    setError(null);
    setLastAction(null);
    setMessage(null);
    try {
      const payload: {
        activityType: WorkRun["activityType"];
        customerOptionId: string;
        routeOptionId: string;
        vehicleId?: number;
      } = {
        activityType,
        customerOptionId,
        routeOptionId,
      };
      if (hasVehicle) {
        payload.vehicleId = Number(vehicleId);
      }
      await startMyRun(payload);
      setMessage("Run started");
      setLastAction(null);
      await load(selectedDate);
    } catch (err) {
      setLastAction("START");
      if (err instanceof ApiError && err.code === "VEHICLE_CHECKIN_REQUIRED") {
        setCheckInGateError(checkInHelperText);
        setError(null);
      } else {
        setError(err instanceof Error ? err.message : "Failed to start run");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const onStop = async () => {
    if (submitting || !isTodaySelected) return;
    setSubmitting(true);
    setError(null);
    setLastAction(null);
    setMessage(null);
    try {
      await stopMyRun();
      setMessage("Run stopped");
      setLastAction(null);
      await load(selectedDate);
    } catch (err) {
      setLastAction("STOP");
      setError(err instanceof Error ? err.message : "Failed to stop run");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedDateObj = parseYYYYMMDD(selectedDate) || new Date();
  const isoWeekNumber = getISOWeekNumber(selectedDateObj);
  const carouselDays = useMemo(() => {
    const base = parseYYYYMMDD(todayStr) || new Date();
    return Array.from({ length: 7 }, (_, idx) => addDays(base, -idx));
  }, [todayStr]);

  return (
    <div className="page">
      <div className="card">
        <h1>Timesheet</h1>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <strong>{formatDisplayDate(selectedDateObj)}</strong>
            <span className="muted">Week {isoWeekNumber}</span>
            <span className="muted">
              {weekLoading ? "This week: ..." : `This week: ${minutesToHoursLabel(weekTotalMinutes)}`}
            </span>
          </div>
          {weekWarning ? <div className="muted">{weekWarning}</div> : null}
        </div>
        <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
          {carouselDays.map((d) => {
            const dateStr = formatYYYYMMDD(d);
            const { dow, dm } = formatDisplayDayChip(d);
            const isSelected = dateStr === selectedDate;
            return (
              <button
                key={dateStr}
                type="button"
                className="button"
                style={{
                  width: "auto",
                  background: isSelected ? "#2563eb" : "#f3f4f6",
                  color: isSelected ? "#fff" : "#111827",
                }}
                onClick={() => setSearchParams({ date: dateStr }, { replace: true })}
              >
                <div style={{ fontWeight: 700 }}>{dow}</div>
                <div style={{ fontSize: "12px" }}>{dm}</div>
              </button>
            );
          })}
        </div>
        {!isTodaySelected && (
          <div className="muted" style={{ marginBottom: "12px" }}>
            Viewing a past date. Start/Stop and Check-in are disabled.
          </div>
        )}
        {loading && <p>Loading...</p>}
        {dataError && <p className="error">{dataError}</p>}
        {error && lastAction && <p className="error">Error: {error}</p>}
        {message && <p className="success">{message}</p>}

        {!loading && (
          <>
            <label className="field">
              <span>Customer (required)</span>
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
              <select value={activityType} onChange={(e) => setActivityType(e.target.value as WorkRun["activityType"])}>
                <option value="DRIVING">Driving</option>
                <option value="OTHER_WORK">Other work</option>
                <option value="BREAK">Break</option>
                <option value="AVAILABILITY">Availability</option>
              </select>
            </label>

            <label className="field">
              <span>Route (required)</span>
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
              <div style={{ marginTop: "8px", display: "flex", gap: "8px" }}>
                <button
                  className="button"
                  type="button"
                  onClick={() => {
                    if (!hasVehicle || !isTodaySelected) return;
                    const returnTo = `/driver/timesheet?${buildTimesheetParams().toString()}`;
                    const path = `/driver/checklist?vehicleId=${vehicleId}&returnTo=${encodeURIComponent(returnTo)}`;
                    navigate(tenantPath(companySlug, path));
                  }}
                  disabled={!hasVehicle || !isTodaySelected}
                >
                  Check in
                </button>
              </div>
            </label>

            <div style={{ marginTop: "16px" }}>
              <h3>Runs for this day</h3>
              {runs.length === 0 && <p>No runs for this day.</p>}
              {runs.length > 0 && (
                <ul style={{ paddingLeft: "16px" }}>
                  {runs.map((run) => (
                    <li key={run.id} style={{ marginBottom: "6px" }}>
                      <strong>
                        {formatTime(run.startedAt)} - {formatTime(run.endedAt)}
                      </strong>{" "}
                      --- {activityLabels[run.activityType]} --- {run.routeOption?.name ?? run.routeOptionId}
                      {run.customerOption?.name ? ` --- ${run.customerOption.name}` : ""}
                      {run.vehicle ? ` --- Vehicle ${run.vehicle.regNumber}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div style={{ marginTop: "16px", position: "sticky", bottom: 0, background: "var(--card-bg, #fff)", padding: "8px 0" }}>
              {hasActiveRun ? (
                <button className="button danger" type="button" onClick={onStop} disabled={submitting || !isTodaySelected}>
                  STOP
                </button>
              ) : (
                <>
                <button
                  className="button primary"
                  type="button"
                  onClick={onStart}
                  disabled={
                    !hasCustomer ||
                    !hasRoute ||
                    submitting ||
                    !isTodaySelected ||
                    requiresCheckIn ||
                    customersLoading ||
                    !!customersError
                  }
                >
                  START
                </button>
                  {requiresCheckIn && (
                    <p className={checkInGateError ? "error" : "muted"} style={{ marginTop: "8px" }}>
                      {checkInHelperText}
                    </p>
                  )}
                  {!requiresCheckIn && checkInGateError && (
                    <p className="error" style={{ marginTop: "8px" }}>
                      {checkInGateError}
                    </p>
                  )}
                  {recentCheckInsError && (
                    <p className="muted" style={{ marginTop: "6px" }}>
                      {recentCheckInsError}
                    </p>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DriverTimesheetTodayPage;


