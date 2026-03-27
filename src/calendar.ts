export type SpecialDayType = 'leap-day' | 'solar-day'

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

  if (month === 11 && day === 31) {
    return true
  }

  return month === 1 && day === 29
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
    const leapDay = createDate(year, 1, 29)
    specialDays.push({
      type: 'leap-day',
      label: 'Leap Day',
      description: 'Gregorian-only day outside the 13-month grid.',
      isoDate: toIsoDate(leapDay),
      date: leapDay,
      gregorianMonth: GREGORIAN_MONTHS[leapDay.getMonth()],
      gregorianDay: leapDay.getDate(),
      weekdayLabel: WEEKDAYS[leapDay.getDay()],
      isToday: isSameDate(leapDay, today),
    })
  }

  const solarDay = createDate(year, 11, 31)
  specialDays.push({
    type: 'solar-day',
    label: 'Solar Day',
    description: 'Year-closing Gregorian-only day outside the fixed months.',
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
