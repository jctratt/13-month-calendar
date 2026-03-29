import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import {
  buildFixedCalendarYear,
  getCalendarEntryForIsoDate,
  getFixedMonthForIsoDate,
  type FixedMonth,
  parseIsoDate,
  type SpecialDay,
  toIsoDate,
} from './calendar'
import {
  createEmptyAppointment,
  createEmptyRecord,
  DEFAULT_COLUMNS,
  DEFAULT_VIEW,
  type Appointment,
  type CalendarView,
  type ColumnCount,
  type DayRecord,
  getEffectiveAppointmentsForIsoDate,
  getEffectiveDayRecord,
  hasAppointmentContent,
  loadPlannerState,
  PLANNER_STORAGE_KEY,
  type PlannerState,
  savePlannerState,
  type EffectiveAppointment,
} from './planner'

const TODAY = new Date()
const WEEKDAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function rotateWeekdays(startWeekday: number) {
  return WEEKDAY_HEADERS.map((_, index) => WEEKDAY_HEADERS[(startWeekday + index) % 7])
}

function isWeekendLabel(weekday: string) {
  return weekday === 'Sat' || weekday === 'Sun'
}

function formatDisplayDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function shiftDate(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)

  return next
}

function clampToMonthDay(year: number, month: number, day: number) {
  const lastDay = new Date(year, month + 1, 0).getDate()

  return new Date(year, month, Math.min(day, lastDay))
}

function buildYearOptions(centerYear: number, radius = 20) {
  return Array.from({ length: radius * 2 + 1 }, (_, index) => centerYear - radius + index)
}

function describeSelectedEntry(
  selectedDate: Date,
  entry: ReturnType<typeof getCalendarEntryForIsoDate>,
) {
  if (!entry) {
    return `${formatDisplayDate(selectedDate)} is outside the fixed-month grid.`
  }

  if (entry.kind === 'special-day') {
    return `${entry.day.label} stays outside the 13 fixed months while keeping its Gregorian placement.`
  }

  return `${entry.day.gregorianMonth} ${entry.day.gregorianDay} maps to fixed month ${entry.month.index}, day ${entry.day.fixedDay}.`
}

function getRelativeWeek(date: Date) {
  const start = shiftDate(date, -date.getDay())

  return Array.from({ length: 7 }, (_, index) => shiftDate(start, index))
}

function getRecordSummary(record?: DayRecord) {
  if (!record) {
    return ''
  }

  const appointments = record.appointments.filter(hasAppointmentContent)
  const appointmentCount = appointments.length
  const hasNote = record.note.trim().length > 0
  const firstAppointmentTitle = appointments[0]?.title.trim() ?? ''

  if (!appointmentCount && !hasNote) {
    return ''
  }

  if (firstAppointmentTitle) {
    if (appointmentCount > 1) {
      return `${firstAppointmentTitle} +${appointmentCount - 1}`
    }

    return firstAppointmentTitle
  }

  if (appointmentCount && hasNote) {
    return `${appointmentCount} appointments and notes`
  }

  if (appointmentCount) {
    return `${appointmentCount} appointments`
  }

  return 'Notes'
}

function getAppointmentDisplayTitle(appointment: Appointment, index: number) {
  return appointment.title.trim() || `Appointment ${index + 1}`
}

function getAppointmentMeta(sourceIsoDate: string, appointment: Appointment, isRecurringInstance: boolean) {
  const meta: string[] = []

  if (appointment.allDay) {
    meta.push('All day')
  } else if (appointment.time.trim()) {
    meta.push(appointment.time.trim())
  }

  if (appointment.recurrence === 'annual') {
    meta.push(
      isRecurringInstance
        ? `Repeats yearly from ${formatDisplayDate(parseIsoDate(sourceIsoDate))}`
        : 'Repeats yearly',
    )
  }

  return meta.join(' · ')
}

function DayBadge({ records, isoDate }: { records: Record<string, DayRecord>; isoDate: string }) {
  const record = getEffectiveDayRecord(records, isoDate)
  const summary = getRecordSummary(record)

  if (!summary) {
    return null
  }

  return <span className="record-badge">{summary}</span>
}

function MonthPanel({
  month,
  weekdayHeaders,
  records,
  selectedIsoDate,
  onSelectDate,
}: {
  month: FixedMonth
  weekdayHeaders: string[]
  records: Record<string, DayRecord>
  selectedIsoDate: string
  onSelectDate: (isoDate: string) => void
}) {
  return (
    <section className="month-card" aria-labelledby={`month-${month.index}`}>
      <div className="month-card__header">
        <div>
          <p className="month-card__eyebrow">Fixed Month {month.index}</p>
          <h2 id={`month-${month.index}`}>{month.label}</h2>
          <p className="month-card__range">{month.rangeLabel}</p>
        </div>
      </div>

      <div className="weekday-strip" aria-hidden="true">
        {weekdayHeaders.map((weekday) => (
          <span
            key={`${month.index}-${weekday}`}
            className={isWeekendLabel(weekday) ? 'weekday-strip__weekend' : ''}
          >
            <span className="weekday-strip__label">{weekday}</span>
          </span>
        ))}
      </div>

      <div className="day-grid">
        {month.days.map((day, dayIndex) => {
          const usesAlternateMonthColor = day.date.getMonth() % 2 === 1
          const previousDay = month.days[dayIndex - 1]
          const startsGregorianMonthSegment =
            dayIndex > 0 && previousDay.date.getMonth() !== day.date.getMonth()

          return (
            <button
              key={day.isoDate}
              type="button"
              data-iso-date={day.isoDate}
              className={`day-tile${usesAlternateMonthColor ? ' day-tile--month-b' : ' day-tile--month-a'}${startsGregorianMonthSegment ? ' day-tile--month-shift' : ''}${day.holiday ? ' day-tile--holiday' : ''}${day.isToday ? ' day-tile--today' : ''}${isWeekendLabel(day.weekdayLabel) ? ' day-tile--weekend' : ''}${selectedIsoDate === day.isoDate ? ' day-tile--selected' : ''}`}
              aria-label={`Fixed month ${month.index}, day ${day.fixedDay}. ${day.gregorianMonth} ${day.gregorianDay}, ${day.weekdayLabel}.${day.holiday ? ` Holiday: ${day.holiday.name}.` : ''}`}
              onClick={() => onSelectDate(day.isoDate)}
            >
              <div className="day-tile__top">
                <span className="day-tile__fixed">{day.fixedDay}</span>
                {day.isToday ? <span className="day-tile__badge">Today</span> : null}
              </div>
              <span className="day-tile__gregorian">{day.gregorianDay}</span>
              <span className="day-tile__meta">{day.gregorianMonth}</span>
              {day.holiday ? (
                <span className="day-tile__holiday" title={day.holiday.name}>
                  {day.holiday.shortLabel}
                </span>
              ) : null}
              <DayBadge records={records} isoDate={day.isoDate} />
            </button>
          )
        })}
      </div>
    </section>
  )
}

function SpecialDayCard({
  day,
  records,
  isSelected,
  onSelect,
}: {
  day: SpecialDay
  records: Record<string, DayRecord>
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      data-iso-date={day.isoDate}
      className={`special-card special-card--${day.type}${isSelected ? ' special-card--selected' : ''}`}
      onClick={onSelect}
    >
      <p className="special-card__eyebrow">{day.label}</p>
      {day.holiday ? <p className="special-card__holiday">{day.holiday.name}</p> : null}
      <h3>
        {day.gregorianMonth} {day.gregorianDay}
      </h3>
      <p className="special-card__meta">{day.weekdayLabel}</p>
      <p>{day.description}</p>
      <div className="special-card__details">
        <p>{day.historicalContext}</p>
      </div>
      <DayBadge records={records} isoDate={day.isoDate} />
    </button>
  )
}

function PlannerSidebar({
  selectedDateLabel,
  selectedDateDescription,
  note,
  appointments,
  onNoteChange,
  onAddAppointment,
  onUpdateAppointment,
  onDeleteAppointment,
}: {
  selectedDateLabel: string
  selectedDateDescription: string
  note: string
  appointments: EffectiveAppointment[]
  onNoteChange: (value: string) => void
  onAddAppointment: () => void
  onUpdateAppointment: (sourceIsoDate: string, appointmentId: string, patch: Partial<Appointment>) => void
  onDeleteAppointment: (sourceIsoDate: string, appointmentId: string) => void
}) {
  return (
    <aside className="planner-panel">
      <section className="planner-panel__hero">
        <p className="eyebrow">Appointments and Notes</p>
        <h2>{selectedDateLabel}</h2>
        <p>{selectedDateDescription}</p>
      </section>

      <section className="planner-panel__section">
        <div className="planner-panel__section-header">
          <h3>Appointments</h3>
          <button type="button" onClick={onAddAppointment}>
            Add Appointment
          </button>
        </div>

        <div className="appointment-list">
          {appointments.length === 0 ? (
            <p className="empty-state">No appointments for this date yet.</p>
          ) : null}

          {appointments.map(({ sourceIsoDate, appointment, isRecurringInstance }, index) => (
            <article key={`${sourceIsoDate}-${appointment.id}`} className="appointment-card">
              <div className="appointment-card__header">
                <p className="appointment-card__eyebrow">{getAppointmentDisplayTitle(appointment, index)}</p>
                <button type="button" onClick={() => onDeleteAppointment(sourceIsoDate, appointment.id)}>
                  Remove
                </button>
              </div>
              {getAppointmentMeta(sourceIsoDate, appointment, isRecurringInstance) ? (
                <p className="appointment-card__meta">
                  {getAppointmentMeta(sourceIsoDate, appointment, isRecurringInstance)}
                </p>
              ) : null}
              <label>
                <span>Title</span>
                <input
                  type="text"
                  value={appointment.title}
                  placeholder="Lunch, deadline, school pickup"
                  onChange={(event) =>
                    onUpdateAppointment(sourceIsoDate, appointment.id, { title: event.target.value })
                  }
                />
              </label>
              <label>
                <span>Time</span>
                <input
                  type="text"
                  value={appointment.time}
                  placeholder={appointment.allDay ? 'All day' : '9:00 AM'}
                  disabled={appointment.allDay}
                  onChange={(event) =>
                    onUpdateAppointment(sourceIsoDate, appointment.id, { time: event.target.value })
                  }
                />
              </label>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={appointment.allDay}
                  onChange={(event) =>
                    onUpdateAppointment(sourceIsoDate, appointment.id, {
                      allDay: event.target.checked,
                      time: event.target.checked ? '' : appointment.time,
                    })
                  }
                />
                <span>All day</span>
              </label>
              <label>
                <span>Recurrence</span>
                <select
                  value={appointment.recurrence}
                  onChange={(event) =>
                    onUpdateAppointment(sourceIsoDate, appointment.id, {
                      recurrence: event.target.value === 'annual' ? 'annual' : 'none',
                    })
                  }
                >
                  <option value="none">One-time</option>
                  <option value="annual">Repeat yearly</option>
                </select>
              </label>
              <label>
                <span>Details</span>
                <textarea
                  rows={3}
                  value={appointment.details}
                  placeholder="Address, link, prep notes"
                  onChange={(event) =>
                    onUpdateAppointment(sourceIsoDate, appointment.id, { details: event.target.value })
                  }
                />
              </label>
            </article>
          ))}
        </div>
      </section>

      <section className="planner-panel__section">
        <div className="planner-panel__section-header">
          <h3>Notes</h3>
        </div>
        <label>
          <span>Daily note</span>
          <textarea
            rows={8}
            value={note}
            placeholder="Anything you want to remember for this date."
            onChange={(event) => onNoteChange(event.target.value)}
          />
        </label>
      </section>
    </aside>
  )
}

function App() {
  const initialPlannerState = useMemo(() => loadPlannerState(), [])
  const workspaceMainRef = useRef<HTMLDivElement | null>(null)
  const toolbarRef = useRef<HTMLElement | null>(null)
  const sidebarRef = useRef<HTMLDivElement | null>(null)
  const [view, setView] = useState<CalendarView>(initialPlannerState.preferences.view ?? DEFAULT_VIEW)
  const [columnCount, setColumnCount] = useState<ColumnCount>(
    initialPlannerState.preferences.columns ?? DEFAULT_COLUMNS,
  )
  const [selectedIsoDate, setSelectedIsoDate] = useState(
    initialPlannerState.preferences.selectedIsoDate ?? toIsoDate(TODAY),
  )
  const [pendingScrollIsoDate, setPendingScrollIsoDate] = useState<string | null>(null)
  const [records, setRecords] = useState<Record<string, DayRecord>>(initialPlannerState.records)
  const selectedDate = parseIsoDate(selectedIsoDate)
  const selectedYear = selectedDate.getFullYear()
  const calendarYear = buildFixedCalendarYear(selectedYear, TODAY)
  const selectedEntry = getCalendarEntryForIsoDate(calendarYear, selectedIsoDate)
  const regularDayCount = calendarYear.months.reduce((sum, month) => sum + month.days.length, 0)
  const weekdayHeaders = rotateWeekdays(calendarYear.months[0]?.days[0]?.weekday ?? 0)
  const selectedRecord = records[selectedIsoDate] ?? createEmptyRecord()
  const selectedAppointments = getEffectiveAppointmentsForIsoDate(records, selectedIsoDate)
  const yearOptions = buildYearOptions(selectedYear)
  const weekEntries = getRelativeWeek(selectedDate).map((date) => {
    const isoDate = toIsoDate(date)
    const yearCalendar = buildFixedCalendarYear(date.getFullYear(), TODAY)

    return {
      date,
      isoDate,
      entry: getCalendarEntryForIsoDate(yearCalendar, isoDate),
    }
  })
  const totalAppointments = Object.entries(records)
    .filter(([isoDate]) => isoDate.startsWith(`${calendarYear.year}-`))
    .reduce(
      (sum, [, record]) =>
        sum + record.appointments.filter(hasAppointmentContent).length,
      0,
    )
  const totalNotes = Object.entries(records).filter(
    ([isoDate, record]) => isoDate.startsWith(`${calendarYear.year}-`) && record.note.trim(),
  ).length

  useEffect(() => {
    const toolbar = toolbarRef.current
    const sidebar = sidebarRef.current

    if (!toolbar || !sidebar) {
      return
    }

    const updateToolbarHeight = () => {
      const nextToolbarHeight = toolbar.getBoundingClientRect().height
      sidebar.style.setProperty('--planner-top', `${nextToolbarHeight + 28}px`)
      sidebar.style.setProperty('--planner-offset', `${nextToolbarHeight + 44}px`)
    }

    updateToolbarHeight()

    const resizeObserver = new ResizeObserver(() => {
      updateToolbarHeight()
    })

    resizeObserver.observe(toolbar)
    window.addEventListener('resize', updateToolbarHeight)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateToolbarHeight)
    }
  }, [])

  useEffect(() => {
    const nextState: PlannerState = {
      version: 3,
      preferences: {
        view,
        columns: columnCount,
        selectedIsoDate,
      },
      records,
    }

    savePlannerState(nextState)
  }, [columnCount, records, selectedIsoDate, view])

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== PLANNER_STORAGE_KEY || !event.newValue) {
        return
      }

      const nextState = loadPlannerState()
      setView(nextState.preferences.view)
      setColumnCount(nextState.preferences.columns)
      setSelectedIsoDate(nextState.preferences.selectedIsoDate)
      setRecords(nextState.records)
    }

    window.addEventListener('storage', handleStorage)

    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  useEffect(() => {
    if (!pendingScrollIsoDate || pendingScrollIsoDate !== selectedIsoDate) {
      return
    }

    const frame = window.requestAnimationFrame(() => {
      const container = workspaceMainRef.current
      const target = container?.querySelector<HTMLElement>(`[data-iso-date="${pendingScrollIsoDate}"]`)
      const toolbarHeight = toolbarRef.current?.getBoundingClientRect().height ?? 0
      const scrollOffset = toolbarHeight + 20

      if (target) {
        const targetTop = target.getBoundingClientRect().top + window.scrollY - scrollOffset

        window.scrollTo({
          top: Math.max(0, targetTop),
          behavior: 'smooth',
        })
      } else {
        const containerTop = (container?.getBoundingClientRect().top ?? 0) + window.scrollY - scrollOffset

        window.scrollTo({
          top: Math.max(0, containerTop),
          behavior: 'smooth',
        })
      }

      setPendingScrollIsoDate(null)
    })

    return () => window.cancelAnimationFrame(frame)
  }, [pendingScrollIsoDate, selectedIsoDate, view])

  function updateRecordAt(isoDate: string, updater: (record: DayRecord) => DayRecord) {
    setRecords((currentRecords) => {
      const currentRecord = currentRecords[isoDate] ?? createEmptyRecord()
      const nextRecord = updater(currentRecord)

      if (!nextRecord.note.trim() && nextRecord.appointments.length === 0) {
        const nextRecords = { ...currentRecords }
        delete nextRecords[isoDate]
        return nextRecords
      }

      return {
        ...currentRecords,
        [isoDate]: nextRecord,
      }
    })
  }

  function updateRecord(updater: (record: DayRecord) => DayRecord) {
    updateRecordAt(selectedIsoDate, updater)
  }

  function updateAppointment(sourceIsoDate: string, appointmentId: string, patch: Partial<Appointment>) {
    updateRecordAt(sourceIsoDate, (record) => ({
      ...record,
      appointments: record.appointments.map((appointment) =>
        appointment.id === appointmentId ? { ...appointment, ...patch } : appointment,
      ),
    }))
  }

  function jumpByYear(step: number) {
    const nextDate = clampToMonthDay(
      selectedDate.getFullYear() + step,
      selectedDate.getMonth(),
      selectedDate.getDate(),
    )
    setSelectedIsoDate(toIsoDate(nextDate))
  }

  function jumpByMonth(step: number) {
    if (selectedEntry?.kind === 'special-day') {
      const specialIndex = calendarYear.specialDays.findIndex((day) => day.isoDate === selectedIsoDate)
      const nextSpecial = calendarYear.specialDays[specialIndex + step]

      if (nextSpecial) {
        setSelectedIsoDate(nextSpecial.isoDate)
        return
      }

      if (step < 0) {
        const lastMonth = calendarYear.months[calendarYear.months.length - 1]
        setSelectedIsoDate(lastMonth.days[lastMonth.days.length - 1].isoDate)
        return
      }

      const nextYear = buildFixedCalendarYear(calendarYear.year + 1, TODAY)
      setSelectedIsoDate(nextYear.months[0].days[0].isoDate)
      return
    }

    if (!selectedEntry || selectedEntry.kind !== 'fixed-day') {
      setSelectedIsoDate(toIsoDate(shiftDate(selectedDate, step * 28)))
      return
    }

    let targetYear = calendarYear.year
    let targetMonthIndex = selectedEntry.month.index + step

    if (targetMonthIndex < 1) {
      targetYear -= 1
      targetMonthIndex = 13
    }

    if (targetMonthIndex > 13) {
      targetYear += 1
      targetMonthIndex = 1
    }

    const targetCalendar = buildFixedCalendarYear(targetYear, TODAY)
    const targetMonth = targetCalendar.months[targetMonthIndex - 1]
    const dayIndex = Math.min(selectedEntry.day.fixedDay - 1, 27)
    setSelectedIsoDate(targetMonth.days[dayIndex].isoDate)
  }

  function navigate(step: number) {
    if (view === 'day') {
      setSelectedIsoDate(toIsoDate(shiftDate(selectedDate, step)))
      return
    }

    if (view === 'week') {
      setSelectedIsoDate(toIsoDate(shiftDate(selectedDate, step * 7)))
      return
    }

    if (view === 'month') {
      jumpByMonth(step)
      return
    }

    jumpByYear(step)
  }

  function renderDayView() {
    return (
      <section className="detail-card detail-card--day" data-iso-date={selectedIsoDate}>
        <p className="eyebrow">Day View</p>
        <h2>{formatDisplayDate(selectedDate)}</h2>
        <p>{describeSelectedEntry(selectedDate, selectedEntry)}</p>
        <div className="detail-card__facts">
          {selectedEntry?.kind === 'fixed-day' ? (
            <>
              <article>
                <span>Fixed month</span>
                <strong>{selectedEntry.month.index}</strong>
              </article>
              <article>
                <span>Fixed day</span>
                <strong>{selectedEntry.day.fixedDay}</strong>
              </article>
              <article>
                <span>Weekday</span>
                <strong>{selectedEntry.day.weekdayLabel}</strong>
              </article>
            </>
          ) : (
            <article>
              <span>Standalone day</span>
              <strong>{selectedEntry?.day.label ?? 'Outside grid'}</strong>
            </article>
          )}
        </div>
      </section>
    )
  }

  function renderWeekView() {
    return (
      <section className={`week-grid week-grid--${columnCount}`}>
        {weekEntries.map(({ date, isoDate, entry }) => {
          return (
            <button
              key={isoDate}
              type="button"
              data-iso-date={isoDate}
              className={`compact-card${selectedIsoDate === isoDate ? ' compact-card--selected' : ''}`}
              onClick={() => setSelectedIsoDate(isoDate)}
            >
              <p className="compact-card__eyebrow">{date.toLocaleDateString('en-US', { weekday: 'long' })}</p>
              <h3>
                {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </h3>
              <p>
                {entry?.kind === 'fixed-day'
                  ? `Month ${entry.month.index}, Day ${entry.day.fixedDay}`
                  : entry?.day.label ?? 'Outside grid'}
              </p>
              {entry?.kind === 'fixed-day' && entry.day.holiday ? (
                <p className="compact-card__accent">{entry.day.holiday.name}</p>
              ) : null}
              {entry?.kind === 'special-day' && entry.day.holiday ? (
                <p className="compact-card__accent">{entry.day.holiday.name}</p>
              ) : null}
              <DayBadge records={records} isoDate={isoDate} />
            </button>
          )
        })}
      </section>
    )
  }

  function renderMonthView() {
    const month = getFixedMonthForIsoDate(calendarYear, selectedIsoDate)

    if (!month) {
      return (
        <section className="special-days-panel" aria-labelledby="special-days-heading">
          <div className="special-days-panel__header">
            <p className="eyebrow">Standalone Days</p>
            <h2 id="special-days-heading">Year-end days outside the fixed months</h2>
            <p>These dates keep their Gregorian identity but still carry appointments and notes.</p>
          </div>

          <div className="special-days-grid">
            {calendarYear.specialDays.map((day) => (
              <SpecialDayCard
                key={day.isoDate}
                day={day}
                records={records}
                isSelected={day.isoDate === selectedIsoDate}
                onSelect={() => setSelectedIsoDate(day.isoDate)}
              />
            ))}
          </div>
        </section>
      )
    }

    return (
      <MonthPanel
        month={month}
        weekdayHeaders={weekdayHeaders}
        records={records}
        selectedIsoDate={selectedIsoDate}
        onSelectDate={setSelectedIsoDate}
      />
    )
  }

  function renderYearView() {
    return (
      <>
        <section className={`year-grid year-grid--${columnCount}`} aria-label={`Fixed calendar for ${calendarYear.year}`}>
          {calendarYear.months.map((month) => (
            <MonthPanel
              key={month.index}
              month={month}
              weekdayHeaders={weekdayHeaders}
              records={records}
              selectedIsoDate={selectedIsoDate}
              onSelectDate={setSelectedIsoDate}
            />
          ))}
        </section>

        <section className="special-days-panel" aria-labelledby="year-special-days-heading">
          <div className="special-days-panel__header">
            <p className="eyebrow">
              {calendarYear.specialDays.length === 1 ? 'Standalone Day' : 'Standalone Days'}
            </p>
            <h2 id="year-special-days-heading">Gregorian-only days outside the fixed months</h2>
            <p>
              These days do not consume a fixed-month tile, but they still accept appointments and notes.
            </p>
          </div>

          <div className="special-days-grid">
            {calendarYear.specialDays.map((day) => (
              <SpecialDayCard
                key={day.isoDate}
                day={day}
                records={records}
                isSelected={day.isoDate === selectedIsoDate}
                onSelect={() => setSelectedIsoDate(day.isoDate)}
              />
            ))}
          </div>
        </section>
      </>
    )
  }

  return (
    <main className="app-shell">
      <section className="intro-card" aria-labelledby="app-intro-title">
        <div className="intro-card__header">
          <p className="eyebrow">13-Month Lunar-Solar Calendar</p>
          <h1 id="app-intro-title">13 equal months. Every date real.</h1>
        </div>

        <div className="intro-card__body">
          <div>
            <h2>How it Works</h2>
            <p>
              The regular year is remapped into thirteen fixed 28-day months, creating a
              perpetual cycle where every month behaves identically and contains exactly four full
              weeks. To maintain alignment with the solar year without disrupting the Gregorian
              flow, December 31 always remains outside the 28-day grid as a &quot;Year Day,&quot; and
              December 30 joins it during leap years. This placement ensures that February 29
              stays within the running sequence of the 28-day months, preventing mid-year shifts.
            </p>
            <p>
              Because the original Gregorian dates remain visible on every tile, you can navigate
              this cleaner, more rhythmic 28-day grid for personal planning while staying
              perfectly synchronized with global deadlines, holidays, and appointments.
            </p>
          </div>

          <div className="intro-card__notes">
            <p>
              Common U.S. holidays are highlighted on their real Gregorian dates so nothing
              familiar gets lost in the new structure.
            </p>
            <p>
              One deliberate difference: weekday columns shift year to year because Jan 1 always
              anchors the first tile. The weekday strip rotates with each year rather than locking
              to the usual Sunday-to-Saturday order, so the pattern you see is always true to the
              real week.
            </p>
          </div>
        </div>
      </section>

      <div className="sticky-stack">
        <section ref={toolbarRef} className="floating-toolbar" aria-label="Calendar controls">
          <div className="floating-toolbar__controls">
            <div className="year-switcher" aria-label="View navigation controls">
              <button type="button" onClick={() => navigate(-1)}>
                Previous
              </button>
              <label className="year-switcher__select" htmlFor="year-jump-select">
                <span className="sr-only">Jump to year</span>
                <select
                  id="year-jump-select"
                  aria-label="Jump to a Gregorian year"
                  value={selectedYear}
                  onChange={(event) => {
                    const value = Number(event.target.value)

                    if (!Number.isNaN(value)) {
                      setSelectedIsoDate(
                        toIsoDate(
                          clampToMonthDay(value, selectedDate.getMonth(), selectedDate.getDate()),
                        ),
                      )
                    }
                  }}
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" onClick={() => navigate(1)}>
                Next
              </button>
            </div>

            <div className="segmented-control segmented-control--compact" aria-label="Calendar views">
              {(['day', 'week', 'month', 'year'] as CalendarView[]).map((nextView) => (
                <button
                  key={nextView}
                  type="button"
                  className={view === nextView ? 'is-active' : ''}
                  onClick={() => setView(nextView)}
                >
                  {nextView}
                </button>
              ))}
            </div>

            <div className="segmented-control segmented-control--compact" aria-label="Column controls">
              {[1, 2, 3].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={columnCount === value ? 'is-active' : ''}
                  onClick={() => setColumnCount(value as ColumnCount)}
                >
                  {value} col
                </button>
              ))}
            </div>

            <div className="month-jump month-jump--toolbar">
              <select
                aria-label="Jump to a fixed month"
                id="month-jump-select"
                value={selectedEntry?.kind === 'fixed-day' ? selectedEntry.month.index : ''}
                onChange={(event) => {
                  const value = Number(event.target.value)

                  if (!Number.isNaN(value) && value > 0) {
                    setSelectedIsoDate(calendarYear.months[value - 1].days[0].isoDate)
                    setView('month')
                  }
                }}
              >
                <option value="">Standalone days</option>
                {calendarYear.months.map((month) => (
                  <option key={month.index} value={month.index}>
                    {`Month ${month.index} · ${month.rangeLabel}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="quick-actions quick-actions--toolbar">
              <button
                type="button"
                className="jump-today-button"
                onClick={() => {
                  const todayIsoDate = toIsoDate(new Date())
                  setSelectedIsoDate(todayIsoDate)
                  setPendingScrollIsoDate(todayIsoDate)
                }}
              >
                Today
              </button>
            </div>
          </div>
        </section>
      </div>

      <section className="overview-strip" aria-label="Calendar planner overview">
        <article>
          <p className="overview-strip__value">{regularDayCount}</p>
          <p>regular days mapped into the 13 fixed months</p>
        </article>
        <article>
          <p className="overview-strip__value">{totalAppointments}</p>
          <p>appointments stored in this browser for {calendarYear.year}</p>
        </article>
        <article>
          <p className="overview-strip__value">{totalNotes}</p>
          <p>dated notes recorded this year</p>
        </article>
      </section>

      <section className="workspace">
        <div ref={workspaceMainRef} className="workspace__main">
          {view === 'day' ? renderDayView() : null}
          {view === 'week' ? renderWeekView() : null}
          {view === 'month' ? renderMonthView() : null}
          {view === 'year' ? renderYearView() : null}
        </div>

        <div ref={sidebarRef} className="workspace__sidebar">
          <PlannerSidebar
            selectedDateLabel={formatDisplayDate(selectedDate)}
            selectedDateDescription={describeSelectedEntry(selectedDate, selectedEntry)}
            note={selectedRecord.note}
            appointments={selectedAppointments}
            onNoteChange={(note) => updateRecord((record) => ({ ...record, note }))}
            onAddAppointment={() =>
              updateRecord((record) => ({
                ...record,
                appointments: [...record.appointments, createEmptyAppointment()],
              }))
            }
            onUpdateAppointment={updateAppointment}
            onDeleteAppointment={(sourceIsoDate, appointmentId) =>
              updateRecordAt(sourceIsoDate, (record) => ({
                ...record,
                appointments: record.appointments.filter((appointment) => appointment.id !== appointmentId),
              }))
            }
          />
        </div>
      </section>
    </main>
  )
}

export default App
