import { useRef, type ReactNode, type RefObject, type CSSProperties } from "react";
import { type WorkEntry } from "../../api/timesheets";
import Button from "../ui/Button";
import Card from "../ui/Card";
import ListState from "../ui/ListState";
import SectionHeader from "../ui/SectionHeader";

const InfoIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 20 20" width="14" height="14" fill="currentColor">
    <path d="M10 1.5A8.5 8.5 0 1 0 18.5 10 8.5 8.5 0 0 0 10 1.5Zm0 3.75a1 1 0 1 1-1 1 1 1 0 0 1 1-1Zm1.25 9h-2.5v-1.5h.75V9h-.75V7.5h2.5v5.25h.75Z" />
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

const CalendarIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
    <path d="M6 2.5a.75.75 0 0 1 .75.75V4h6.5v-.75a.75.75 0 0 1 1.5 0V4h.5A2.25 2.25 0 0 1 17 6.25v8.5A2.25 2.25 0 0 1 14.75 17h-9.5A2.25 2.25 0 0 1 3 14.75v-8.5A2.25 2.25 0 0 1 5.25 4h.5v-.75A.75.75 0 0 1 6 2.5Zm-1 6.25v6A.75.75 0 0 0 5.75 15h8.5a.75.75 0 0 0 .75-.75v-6H5Z" />
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

type TimesheetLeftCardProps = {
  className?: string;
  title?: string;
  selectedDateLabel: string;
  weekLabel: string;
  weekHoursLabel: string;
  weekWarning?: string | null;

  todayStr: string;
  dayWindow: number;
  dayStripRef: RefObject<HTMLDivElement>;
  visibleDays: Date[];
  selectedDate: string;

  onSelectDate: (dateStr: string) => void;
  formatDayChip: (date: Date) => { dow: string; dm: string };
  formatDateParam: (date: Date) => string;

  onPrevWeek: () => void;
  onNextWeek: () => void;
  nextDisabled: boolean;

  calendarValue: string;
  onCalendarChange: (dateStr: string) => void;

  isFutureDate: boolean;
  isTooOldToEdit: boolean;
  isTodaySelected: boolean;

  error: string | null;
  successMessage: string | null;
  errorMessage: string | null;

  loading: boolean;
  entries: WorkEntry[];
  dataError: string | null;

  isEditableDate: boolean;
  isSaving: boolean;
  onEditEntry: (entry: WorkEntry) => void;
  onDeleteEntry: (entry: WorkEntry) => void;

  activityLabelMap: Record<WorkEntry["activityType"], string>;
  formatMinutes: (minutes: number) => string;
  totalLabel: string;
};

const TimesheetLeftCard = ({
  className,
  title = "Timesheet",
  selectedDateLabel,
  weekLabel,
  weekHoursLabel,
  weekWarning,
  todayStr,
  dayWindow,
  dayStripRef,
  visibleDays,
  selectedDate,
  onSelectDate,
  formatDayChip,
  formatDateParam,
  onPrevWeek,
  onNextWeek,
  nextDisabled,
  calendarValue,
  onCalendarChange,
  isFutureDate,
  isTooOldToEdit,
  isTodaySelected,
  error,
  successMessage,
  errorMessage,
  loading,
  entries,
  dataError,
  isEditableDate,
  isSaving,
  onEditEntry,
  onDeleteEntry,
  activityLabelMap,
  formatMinutes,
  totalLabel,
}: TimesheetLeftCardProps) => {
  const dateInputRef = useRef<HTMLInputElement | null>(null);

  const chipCount = Math.max(1, dayWindow);
  const chipStyle = { ["--chip-count" as unknown as "--chip-count"]: chipCount } as CSSProperties;

  return (
    <Card className={className}>
      <SectionHeader
        title={title}
        subtitle={selectedDateLabel}
        right={(
          <div className="flex items-start">
            <div className="max-w-[170px] rounded-xl bg-white px-4 py-3 shadow-sm">
              <div className="text-sm font-medium text-slate-700">
                {weekLabel}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {weekHoursLabel}
              </div>
            </div>
          </div>
        )}
      />

      {weekWarning ? <div className="muted" style={{ marginTop: "8px" }}>{weekWarning}</div> : null}
      <div className="mt-3" />

      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onPrevWeek}
          className="w-auto shrink-0"
          title="Previous week"
          aria-label="Previous week"
        >
          {"<"}
        </Button>

        <div
          ref={dayStripRef}
          className="day-strip-scroll"
          style={chipStyle}
        >
          <style>{`
            .day-strip-scroll {
              --chip-count: 5;
              --chip-w: calc(100% / var(--chip-count));

              display: flex;
              flex-wrap: nowrap;
              gap: 0;
              flex: 1;
              min-width: 0;

              overflow-x: auto;
              overflow-y: hidden;

              -webkit-overflow-scrolling: touch;
              touch-action: pan-x;

              scroll-snap-type: x mandatory;
              scroll-padding-inline: 0;

              scrollbar-width: none;
              -ms-overflow-style: none;

              border: 1px solid #e5e7eb;
              border-radius: 12px;
              background: #fff;

              overscroll-behavior-x: contain;
            }
            .day-strip-scroll::-webkit-scrollbar { display: none; }

            .day-chip {
              flex: 0 0 var(--chip-w);
              width: var(--chip-w);
              scroll-snap-align: center;
              scroll-snap-stop: always;

              border-right: 1px solid #e5e7eb;
              overflow: hidden;
            }
            .day-chip:last-of-type { border-right: none; }
          `}</style>

          {visibleDays.map((day) => {
            const dateStr = formatDateParam(day);
            const { dow, dm } = formatDayChip(day);
            const isSelected = dateStr === selectedDate;
            const isToday = dateStr === todayStr;

            const baseBg = isSelected ? "#0b2a4a" : "#ffffff";
            const baseColor = isSelected ? "#ffffff" : "#111827";

            const ring = isToday && !isSelected
              ? "inset 0 0 0 2px rgba(34,197,94,0.95)"
              : "none";

            return (
              <div
                key={dateStr}
                data-date={dateStr}
                className="day-chip"
                title={dateStr}
                aria-current={isSelected ? "date" : undefined}
              >
                <Button
                  type="button"
                  className="w-full"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%",
                    height: "100%",
                    padding: "8px 6px",
                    borderRadius: 0,
                    background: baseBg,
                    color: baseColor,
                    border: "none",
                    boxShadow: ring,
                    WebkitTapHighlightColor: "transparent",
                  }}
                  onClick={() => onSelectDate(dateStr)}
                >
                  <div style={{ fontWeight: 800, fontSize: "12px", lineHeight: 1.1 }}>{dow}</div>
                  <div style={{ fontSize: "11px", opacity: isSelected ? 0.95 : 0.8 }}>{dm}</div>

                  {isToday && !isSelected ? (
                    <div
                      aria-hidden="true"
                      style={{
                        marginTop: 6,
                        width: "6px",
                        height: "6px",
                        borderRadius: "999px",
                        background: "#22c55e",
                      }}
                    />
                  ) : (
                    <div style={{ height: 12 }} />
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        <input
          ref={dateInputRef}
          type="date"
          value={calendarValue}
          onChange={(event) => onCalendarChange(event.target.value)}
          style={{
            position: "absolute",
            width: "1px",
            height: "1px",
            padding: 0,
            margin: "-1px",
            overflow: "hidden",
            clip: "rect(0, 0, 0, 0)",
            border: 0,
          }}
          tabIndex={-1}
          aria-hidden="true"
        />

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onNextWeek}
          disabled={nextDisabled}
          className="w-auto shrink-0"
          title="Next week"
          aria-label="Next week"
        >
          {">"}
        </Button>

        <IconButton
          label="Open calendar"
          title="Calendar"
          disabled={false}
          onClick={() => dateInputRef.current?.showPicker?.() ?? dateInputRef.current?.click()}
        >
          <CalendarIcon />
        </IconButton>
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
      {successMessage && <p className="success mt-2">{successMessage}</p>}
      {errorMessage && <p className="error mt-2">{errorMessage}</p>}

      {!loading && (
        <div style={{ marginTop: "16px" }}>
          <h3 style={{ margin: 0 }}>Entries for this date</h3>

          <ListState
            loading={loading}
            hasItems={entries.length > 0}
            emptyTitle="No entries"
            emptyMessage="No entries yet for this date."
            errorMessage={dataError}
          >
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
                        onClick={() => onEditEntry(entry)}
                      >
                        <PencilIcon />
                      </IconButton>

                      <IconButton
                        label="Delete entry"
                        title="Delete"
                        disabled={!isEditableDate || isSaving}
                        onClick={() => onDeleteEntry(entry)}
                      >
                        <TrashIcon />
                      </IconButton>
                    </div>
                  </div>
                );
              })}
            </div>
          </ListState>

          <div style={{ fontWeight: 700, marginTop: "10px" }}>
            {totalLabel}
          </div>
        </div>
      )}
    </Card>
  );
};

export default TimesheetLeftCard;
