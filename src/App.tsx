import { useEffect, useRef, useState } from 'react'
import './App.css'
import {
  buildFixedCalendarYear,
  findTodayPlacement,
  type FixedMonth,
  type SpecialDay,
} from './calendar'

const TODAY = new Date()
const WEEKDAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

type ScrollTarget =
  | {
      kind: 'month'
      monthIndex: number
    }
  | {
      kind: 'special-days'
    }

function rotateWeekdays(startWeekday: number) {
  return WEEKDAY_HEADERS.map((_, index) => WEEKDAY_HEADERS[(startWeekday + index) % 7])
}

function isWeekendLabel(weekday: string) {
  return weekday === 'Sat' || weekday === 'Sun'
}

function MonthPanel({
  month,
  weekdayHeaders,
  monthRef,
  onJumpToTop,
}: {
  month: FixedMonth
  weekdayHeaders: string[]
  monthRef?: (element: HTMLElement | null) => void
  onJumpToTop: () => void
}) {
  return (
    <section
      ref={monthRef}
      className="month-card"
      aria-labelledby={`month-${month.index}`}
      id={`month-panel-${month.index}`}
    >
      <div className="month-card__header">
        <div className="month-card__heading-row">
          <div>
            <p className="month-card__eyebrow">Fixed Month {month.index}</p>
            <h2 id={`month-${month.index}`}>{month.label}</h2>
            <p className="month-card__range">{month.rangeLabel}</p>
          </div>
          <button type="button" className="month-card__top-button" onClick={onJumpToTop}>
            Jump to Top
          </button>
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
            <article
              key={day.isoDate}
              className={`day-tile${usesAlternateMonthColor ? ' day-tile--month-b' : ' day-tile--month-a'}${startsGregorianMonthSegment ? ' day-tile--month-shift' : ''}${day.isToday ? ' day-tile--today' : ''}${isWeekendLabel(day.weekdayLabel) ? ' day-tile--weekend' : ''}`}
              aria-label={`Fixed month ${month.index}, day ${day.fixedDay}. ${day.gregorianMonth} ${day.gregorianDay}, ${day.weekdayLabel}.`}
            >
              <div className="day-tile__top">
                <span className="day-tile__fixed">{day.fixedDay}</span>
                {day.isToday ? <span className="day-tile__badge">Today</span> : null}
              </div>
              <span className="day-tile__gregorian">{day.gregorianDay}</span>
              <span className="day-tile__meta">{day.gregorianMonth}</span>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function SpecialDayCard({ day }: { day: SpecialDay }) {
  return (
    <article className={`special-card special-card--${day.type}`}>
      <p className="special-card__eyebrow">{day.label}</p>
      <h3>
        {day.gregorianMonth} {day.gregorianDay}
      </h3>
      <p className="special-card__meta">{day.weekdayLabel}</p>
      <p>{day.description}</p>
      <div className="special-card__details">
        <p>
          <strong>Historical context:</strong> {day.historicalContext}
        </p>
        <p>
          <strong>Celebration idea:</strong> {day.celebrationIdea}
        </p>
      </div>
    </article>
  )
}

function describeToday(selectedYear: number) {
  if (selectedYear !== TODAY.getFullYear()) {
    return `Viewing ${selectedYear}. Jump back to ${TODAY.getFullYear()} to see today's placement.`
  }

  const placement = findTodayPlacement(buildFixedCalendarYear(selectedYear, TODAY))

  if (!placement) {
    return 'Today does not fall inside this calendar model.'
  }

  if (placement.kind === 'special-day') {
    return `Today is ${placement.day.label}: ${placement.day.gregorianMonth} ${placement.day.gregorianDay}, ${placement.day.weekdayLabel}.`
  }

  return `Today is ${placement.day.gregorianMonth} ${placement.day.gregorianDay}, ${placement.day.weekdayLabel} — fixed month ${placement.month.index}, day ${placement.day.fixedDay}.`
}

function App() {
  const [selectedYear, setSelectedYear] = useState(TODAY.getFullYear())
  const topRef = useRef<HTMLElement | null>(null)
  const monthRefs = useRef<Record<number, HTMLElement | null>>({})
  const pendingScrollTargetRef = useRef<ScrollTarget | null>(null)
  const specialDaysRef = useRef<HTMLElement | null>(null)
  const calendarYear = buildFixedCalendarYear(selectedYear, TODAY)
  const regularDayCount = calendarYear.months.length * 28
  const weekdayHeaders = rotateWeekdays(calendarYear.months[0]?.days[0]?.weekday ?? 0)

  function jumpToMonth(monthIndex: number) {
    monthRefs.current[monthIndex]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function jumpToSpecialDays() {
    specialDaysRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function jumpToTop() {
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function handleJumpToToday() {
    const todayCalendar =
      selectedYear === TODAY.getFullYear()
        ? calendarYear
        : buildFixedCalendarYear(TODAY.getFullYear(), TODAY)
    const placement = findTodayPlacement(todayCalendar)

    if (!placement) {
      return
    }

    if (selectedYear !== TODAY.getFullYear()) {
      pendingScrollTargetRef.current =
        placement.kind === 'fixed-day'
          ? { kind: 'month', monthIndex: placement.month.index }
          : { kind: 'special-days' }
      setSelectedYear(TODAY.getFullYear())
      return
    }

    if (placement.kind === 'fixed-day') {
      jumpToMonth(placement.month.index)
      return
    }

    jumpToSpecialDays()
  }

  useEffect(() => {
    if (!pendingScrollTargetRef.current) {
      return
    }

    if (pendingScrollTargetRef.current.kind === 'month') {
      jumpToMonth(pendingScrollTargetRef.current.monthIndex)
    } else {
      jumpToSpecialDays()
    }

    pendingScrollTargetRef.current = null
  }, [selectedYear])

  return (
    <main className="app-shell">
      <section ref={topRef} className="hero-panel">
        <div className="hero-panel__copy">
          <p className="eyebrow">13-Month Lunar-Solar Calendar</p>
          <h1>Equal months, real dates, no fake rewrites.</h1>
          <p className="hero-panel__lede">
            The regular year is remapped into thirteen fixed 28-day months. Real Gregorian
            dates stay visible on every tile. Feb 29 stays inside the running sequence in leap
            years, while year-end standalone days sit outside the grid so the 13 fixed months
            keep their shape. Each fixed month starts in the first box, while the weekday strip
            rotates to match the real weekday of Jan 1 for that year.
          </p>
          <div className="hero-panel__note" aria-label="Weekday orientation note">
            Weekday columns shift year to year. In this layout, Jan 1 always starts in the
            first box, so the weekday row rotates with the selected year instead of staying
            in the usual Sunday-to-Saturday order.
          </div>
        </div>

        <div className="hero-panel__controls">
          <div className="month-jump" aria-label="Jump to a fixed month">
            <label className="month-jump__label" htmlFor="month-jump-select">
              Jump to month
            </label>
            <select
              id="month-jump-select"
              defaultValue=""
              onChange={(event) => {
                const value = Number(event.target.value)

                if (!Number.isNaN(value)) {
                  jumpToMonth(value)
                }
              }}
            >
              <option value="" disabled>
                Select a fixed month
              </option>
              {calendarYear.months.map((month) => (
                <option key={month.index} value={month.index}>
                  {`Month ${month.index} · ${month.rangeLabel}`}
                </option>
              ))}
            </select>
          </div>

          <button type="button" className="jump-today-button" onClick={handleJumpToToday}>
            Jump to Today
          </button>

          <div className="year-switcher" aria-label="Year controls">
            <button type="button" onClick={() => setSelectedYear((year) => year - 1)}>
              Previous Year
            </button>
            <span>{selectedYear}</span>
            <button type="button" onClick={() => setSelectedYear((year) => year + 1)}>
              Next Year
            </button>
          </div>

          <div className="status-card">
            <p className="status-card__eyebrow">Current Placement</p>
            <p>{describeToday(selectedYear)}</p>
          </div>
        </div>
      </section>

      <section className="overview-strip" aria-label="Calendar rules overview">
        <article>
          <p className="overview-strip__value">{regularDayCount}</p>
          <p>regular days mapped into the 13 fixed months</p>
        </article>
        <article>
          <p className="overview-strip__value">28</p>
          <p>days per month, kept as four exact weeks with year-specific weekday order</p>
        </article>
        <article>
          <p className="overview-strip__value">{calendarYear.specialDays.length}</p>
          <p>standalone Gregorian-only day{calendarYear.specialDays.length > 1 ? 's' : ''}</p>
        </article>
      </section>

      <section className="calendar-grid" aria-label={`Fixed calendar for ${selectedYear}`}>
        {calendarYear.months.map((month) => (
          <MonthPanel
            key={month.index}
            month={month}
            weekdayHeaders={weekdayHeaders}
            onJumpToTop={jumpToTop}
            monthRef={(element) => {
              monthRefs.current[month.index] = element
            }}
          />
        ))}
      </section>

      <section
        ref={specialDaysRef}
        className="special-days-panel"
        aria-labelledby="special-days-heading"
      >
        <div className="special-days-panel__header">
          <p className="eyebrow">Standalone Days</p>
          <h2 id="special-days-heading">Gregorian-only days outside the fixed months</h2>
          <p>
            These dates keep their real Gregorian identity and do not consume a tile in the
            13-month grid.
          </p>
        </div>

        <div className="special-days-grid">
          {calendarYear.specialDays.map((day) => (
            <SpecialDayCard key={day.isoDate} day={day} />
          ))}
        </div>
      </section>
    </main>
  )
}

export default App
