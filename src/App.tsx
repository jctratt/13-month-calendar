import { useState } from 'react'
import './App.css'
import {
  buildFixedCalendarYear,
  findTodayPlacement,
  type FixedMonth,
  type SpecialDay,
} from './calendar'

const TODAY = new Date()
const WEEKDAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function MonthPanel({ month }: { month: FixedMonth }) {
  const leadingPads = month.days[0]?.weekday ?? 0
  const trailingPads = month.days.length === 0 ? 0 : 6 - month.days[month.days.length - 1].weekday

  return (
    <section className="month-card" aria-labelledby={`month-${month.index}`}>
      <div className="month-card__header">
        <p className="month-card__eyebrow">Fixed Month {month.index}</p>
        <h2 id={`month-${month.index}`}>{month.label}</h2>
        <p className="month-card__range">{month.rangeLabel}</p>
      </div>

      <div className="weekday-strip" aria-hidden="true">
        {WEEKDAY_HEADERS.map((weekday) => (
          <span key={`${month.index}-${weekday}`}>{weekday}</span>
        ))}
      </div>

      <div className="day-grid">
        {Array.from({ length: leadingPads }, (_, index) => (
          <span
            key={`leading-${month.index}-${index}`}
            className="day-grid__pad"
            aria-hidden="true"
          />
        ))}

        {month.days.map((day) => (
          <article
            key={day.isoDate}
            className={`day-tile${day.isToday ? ' day-tile--today' : ''}`}
            aria-label={`Fixed month ${month.index}, day ${day.fixedDay}. ${day.gregorianMonth} ${day.gregorianDay}, ${day.weekdayLabel}.`}
          >
            <span className="day-tile__fixed">{day.fixedDay}</span>
            <span className="day-tile__gregorian">{day.gregorianDay}</span>
            <span className="day-tile__meta">
              {day.gregorianMonth} · {day.weekdayLabel}
            </span>
          </article>
        ))}

        {Array.from({ length: trailingPads }, (_, index) => (
          <span
            key={`trailing-${month.index}-${index}`}
            className="day-grid__pad"
            aria-hidden="true"
          />
        ))}
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
  const calendarYear = buildFixedCalendarYear(selectedYear, TODAY)
  const regularDayCount = calendarYear.months.length * 28

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div className="hero-panel__copy">
          <p className="eyebrow">13-Month Solar Calendar</p>
          <h1>Equal months, real dates, no fake rewrites.</h1>
          <p className="hero-panel__lede">
            The regular year is remapped into thirteen fixed 28-day months. Real Gregorian
            dates stay visible on every tile, while Feb 29 and Dec 31 remain standalone
            Gregorian-only days outside the grid. The layout keeps real weekday alignment,
            so Jan 1, 2026 still lands on Thursday and Mar 27, 2026 still lands on Friday.
          </p>
        </div>

        <div className="hero-panel__controls">
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
          <p>days per month, aligned against the real Gregorian weekdays</p>
        </article>
        <article>
          <p className="overview-strip__value">{calendarYear.specialDays.length}</p>
          <p>standalone Gregorian-only day{calendarYear.specialDays.length > 1 ? 's' : ''}</p>
        </article>
      </section>

      <section className="calendar-grid" aria-label={`Fixed calendar for ${selectedYear}`}>
        {calendarYear.months.map((month) => (
          <MonthPanel key={month.index} month={month} />
        ))}
      </section>

      <section className="special-days-panel" aria-labelledby="special-days-heading">
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
