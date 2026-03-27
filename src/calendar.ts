export type SpecialDayType = 'year-bridge-day' | 'solar-day'

export interface FixedDay {
  isoDate: string
  date: Date
  fixedMonth: number
  fixedDay: number
  gregorianMonth: string
  gregorianDay: number
  weekday: number
  weekdayLabel: string
  isToday: boolean
}

export interface FixedMonth {
  index: number
  label: string
  rangeLabel: string
  days: FixedDay[]
}

export interface SpecialDay {
  type: SpecialDayType
  label: string
  description: string
  historicalContext: string
  celebrationIdea: string
  isoDate: string
  date: Date
  gregorianMonth: string
  gregorianDay: number
  weekdayLabel: string
  isToday: boolean
}

export interface FixedCalendarYear {
  year: number
  months: FixedMonth[]
  specialDays: SpecialDay[]
}

const GREGORIAN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function createDate(year: number, month: number, day: number) {
  return new Date(year, month, day)
}

function isSameDate(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

function toIsoDate(date: Date) {
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')

  return `${date.getFullYear()}-${month}-${day}`
}

export function isLeapYear(year: number) {
  return year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0)
}

function isSpecialDay(date: Date) {
  const month = date.getMonth()
  const day = date.getDate()
  const year = date.getFullYear()

  if (month === 11 && day === 31) {
    return true
  }

  return isLeapYear(year) && month === 11 && day === 30
}

function buildRegularDates(year: number) {
  const dates: Date[] = []
  const cursor = createDate(year, 0, 1)

  while (cursor.getFullYear() === year) {
    if (!isSpecialDay(cursor)) {
      dates.push(new Date(cursor))
    }

    cursor.setDate(cursor.getDate() + 1)
  }

  return dates
}

function buildMonthLabel(start: Date, end: Date) {
  const startLabel = GREGORIAN_MONTHS[start.getMonth()]
  const endLabel = GREGORIAN_MONTHS[end.getMonth()]

  if (startLabel === endLabel) {
    return startLabel
  }

  return `${startLabel}-${endLabel}`
}

function buildRangeLabel(start: Date, end: Date) {
  const startLabel = `${GREGORIAN_MONTHS[start.getMonth()]} ${start.getDate()}`
  const endLabel = `${GREGORIAN_MONTHS[end.getMonth()]} ${end.getDate()}`

  return `${startLabel} - ${endLabel}`
}

export function buildFixedCalendarYear(year: number, today = new Date()): FixedCalendarYear {
  const regularDates = buildRegularDates(year)

  if (regularDates.length !== 364) {
    throw new Error(`Expected 364 regular days for ${year}, received ${regularDates.length}.`)
  }

  const months = Array.from({ length: 13 }, (_, index) => {
    const days = regularDates.slice(index * 28, index * 28 + 28).map((date, dayIndex) => ({
      isoDate: toIsoDate(date),
      date,
      fixedMonth: index + 1,
      fixedDay: dayIndex + 1,
      gregorianMonth: GREGORIAN_MONTHS[date.getMonth()],
      gregorianDay: date.getDate(),
      weekday: date.getDay(),
      weekdayLabel: WEEKDAYS[date.getDay()],
      isToday: isSameDate(date, today),
    }))

    return {
      index: index + 1,
      label: buildMonthLabel(days[0].date, days[days.length - 1].date),
      rangeLabel: buildRangeLabel(days[0].date, days[days.length - 1].date),
      days,
    }
  })

  const specialDays: SpecialDay[] = []

  if (isLeapYear(year)) {
    const bridgeDay = createDate(year, 11, 30)
    specialDays.push({
      type: 'year-bridge-day',
      label: 'Year Bridge Day',
      description: 'Leap-year balancing day outside the fixed months.',
      historicalContext:
        'This extra year-end bridge preserves the 13 fixed 28-day months while still honoring the extra solar day accumulated in leap years.',
      celebrationIdea:
        'Use it as a leap-year threshold festival: a pause for reflection, extra rest, and seasonal adjustment before the solar year closes.',
      isoDate: toIsoDate(bridgeDay),
      date: bridgeDay,
      gregorianMonth: GREGORIAN_MONTHS[bridgeDay.getMonth()],
      gregorianDay: bridgeDay.getDate(),
      weekdayLabel: WEEKDAYS[bridgeDay.getDay()],
      isToday: isSameDate(bridgeDay, today),
    })
  }

  const solarDay = createDate(year, 11, 31)
  specialDays.push({
    type: 'solar-day',
    label: 'Solar Day',
    description: 'Year-closing Gregorian-only day outside the fixed months.',
    historicalContext:
      'A standalone year-end day echoes perennial calendar proposals such as the International Fixed Calendar, where an extra day sits outside the monthly count to keep the seasons anchored.',
    celebrationIdea:
      'Use it as a solar new-year eve: a harvest-close, reflection, and reset day before month 1 begins again.',
    isoDate: toIsoDate(solarDay),
    date: solarDay,
    gregorianMonth: GREGORIAN_MONTHS[solarDay.getMonth()],
    gregorianDay: solarDay.getDate(),
    weekdayLabel: WEEKDAYS[solarDay.getDay()],
    isToday: isSameDate(solarDay, today),
  })

  return {
    year,
    months,
    specialDays,
  }
}

export function findTodayPlacement(calendarYear: FixedCalendarYear) {
  for (const month of calendarYear.months) {
    const day = month.days.find((entry) => entry.isToday)

    if (day) {
      return {
        kind: 'fixed-day' as const,
        month,
        day,
      }
    }
  }

  const specialDay = calendarYear.specialDays.find((entry) => entry.isToday)

  if (specialDay) {
    return {
      kind: 'special-day' as const,
      day: specialDay,
    }
  }

  return null
}
