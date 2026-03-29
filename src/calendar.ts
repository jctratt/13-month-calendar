export type SpecialDayType = 'solar-day'

export interface Holiday {
  name: string
  shortLabel: string
}

export interface FixedDay {
  isoDate: string
  date: Date
  fixedMonth: number
  fixedDay: number
  gregorianMonth: string
  gregorianDay: number
  weekday: number
  weekdayLabel: string
  holiday: Holiday | null
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
  holiday: Holiday | null
  isToday: boolean
}

export interface FixedCalendarYear {
  year: number
  months: FixedMonth[]
  specialDays: SpecialDay[]
}

export type CalendarEntry =
  | {
      kind: 'fixed-day'
      month: FixedMonth
      day: FixedDay
    }
  | {
      kind: 'special-day'
      day: SpecialDay
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

export function toIsoDate(date: Date) {
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')

  return `${date.getFullYear()}-${month}-${day}`
}

function getNthWeekdayOfMonth(
  year: number,
  month: number,
  weekday: number,
  occurrence: number,
) {
  const firstDay = createDate(year, month, 1)
  const firstWeekdayOffset = (weekday - firstDay.getDay() + 7) % 7

  return 1 + firstWeekdayOffset + (occurrence - 1) * 7
}

function getLastWeekdayOfMonth(year: number, month: number, weekday: number) {
  const lastDay = createDate(year, month + 1, 0)
  const lastWeekdayOffset = (lastDay.getDay() - weekday + 7) % 7

  return lastDay.getDate() - lastWeekdayOffset
}

function buildHolidayMap(year: number) {
  const holidays = new Map<string, Holiday>()

  function addHoliday(month: number, day: number, name: string, shortLabel: string) {
    holidays.set(toIsoDate(createDate(year, month, day)), { name, shortLabel })
  }

  addHoliday(0, 1, "New Year's Day", 'New Year')
  addHoliday(0, getNthWeekdayOfMonth(year, 0, 1, 3), 'Martin Luther King Jr. Day', 'MLK')
  addHoliday(1, 14, "Valentine's Day", 'Valentine')
  addHoliday(1, getNthWeekdayOfMonth(year, 1, 1, 3), "Presidents' Day", 'Pres Day')
  addHoliday(2, 17, "St. Patrick's Day", 'St. Pat')
  addHoliday(4, getLastWeekdayOfMonth(year, 4, 1), 'Memorial Day', 'Memorial')
  addHoliday(5, 19, 'Juneteenth', 'June 19')
  addHoliday(6, 4, 'Independence Day', 'July 4')
  addHoliday(8, getNthWeekdayOfMonth(year, 8, 1, 1), 'Labor Day', 'Labor')
  addHoliday(9, 31, 'Halloween', 'Hallows')
  addHoliday(10, 11, 'Veterans Day', 'Veterans')
  addHoliday(10, getNthWeekdayOfMonth(year, 10, 4, 4), 'Thanksgiving', 'Thanks')
  addHoliday(11, 24, 'Christmas Eve', 'Xmas Eve')
  addHoliday(11, 25, 'Christmas Day', 'Xmas')
  addHoliday(11, 31, "New Year's Eve", 'Year End')

  return holidays
}

export function isLeapYear(year: number) {
  return year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0)
}

function isSpecialDay(date: Date, year: number) {
  const month = date.getMonth()
  const day = date.getDate()

  if (month !== 11) {
    return false
  }

  return day === 31 || (isLeapYear(year) && day === 30)
}

function buildRegularDates(year: number) {
  const dates: Date[] = []
  const cursor = createDate(year, 0, 1)

  while (cursor.getFullYear() === year) {
    if (!isSpecialDay(cursor, year)) {
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
  const holidayMap = buildHolidayMap(year)
  const monthLengths = Array.from({ length: 13 }, () => 28)
  const expectedRegularDays = monthLengths.reduce((sum, length) => sum + length, 0)

  if (regularDates.length !== expectedRegularDays) {
    throw new Error(
      `Expected ${expectedRegularDays} regular days for ${year}, received ${regularDates.length}.`,
    )
  }

  let startIndex = 0

  const months = monthLengths.map((monthLength, index) => {
    const days = regularDates.slice(startIndex, startIndex + monthLength).map((date, dayIndex) => ({
      isoDate: toIsoDate(date),
      date,
      fixedMonth: index + 1,
      fixedDay: dayIndex + 1,
      gregorianMonth: GREGORIAN_MONTHS[date.getMonth()],
      gregorianDay: date.getDate(),
      weekday: date.getDay(),
      weekdayLabel: WEEKDAYS[date.getDay()],
      holiday: holidayMap.get(toIsoDate(date)) ?? null,
      isToday: isSameDate(date, today),
    }))

    startIndex += monthLength

    return {
      index: index + 1,
      label: buildMonthLabel(days[0].date, days[days.length - 1].date),
      rangeLabel: buildRangeLabel(days[0].date, days[days.length - 1].date),
      days,
    }
  })

  const specialDays: SpecialDay[] = []

  if (isLeapYear(year)) {
    const thresholdDay = createDate(year, 11, 30)
    specialDays.push({
      type: 'solar-day',
      label: 'Threshold Day',
      description: 'Standalone Gregorian year-end day outside the fixed months.',
      historicalContext:
        'Year-end intercalary days were often treated as festival thresholds in reform calendars: time set slightly apart from the regular month count before the cycle begins again.',
      celebrationIdea:
        'Use it as the first year-end gathering day: shared meals, storytelling, and a community pause before the final close of the year.',
      isoDate: toIsoDate(thresholdDay),
      date: thresholdDay,
      gregorianMonth: GREGORIAN_MONTHS[thresholdDay.getMonth()],
      gregorianDay: thresholdDay.getDate(),
      weekdayLabel: WEEKDAYS[thresholdDay.getDay()],
      holiday: holidayMap.get(toIsoDate(thresholdDay)) ?? null,
      isToday: isSameDate(thresholdDay, today),
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
    holiday: holidayMap.get(toIsoDate(solarDay)) ?? null,
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

export function parseIsoDate(isoDate: string) {
  const [year, month, day] = isoDate.split('-').map(Number)

  return new Date(year, month - 1, day)
}

export function getCalendarEntryForIsoDate(
  calendarYear: FixedCalendarYear,
  isoDate: string,
): CalendarEntry | null {
  for (const month of calendarYear.months) {
    const day = month.days.find((entry) => entry.isoDate === isoDate)

    if (day) {
      return {
        kind: 'fixed-day',
        month,
        day,
      }
    }
  }

  const specialDay = calendarYear.specialDays.find((entry) => entry.isoDate === isoDate)

  if (specialDay) {
    return {
      kind: 'special-day',
      day: specialDay,
    }
  }

  return null
}

export function getFixedMonthForIsoDate(calendarYear: FixedCalendarYear, isoDate: string) {
  const entry = getCalendarEntryForIsoDate(calendarYear, isoDate)

  return entry?.kind === 'fixed-day' ? entry.month : null
}

export function getFixedWeekForIsoDate(calendarYear: FixedCalendarYear, isoDate: string) {
  const entry = getCalendarEntryForIsoDate(calendarYear, isoDate)

  if (!entry || entry.kind !== 'fixed-day') {
    return null
  }

  const start = Math.floor((entry.day.fixedDay - 1) / 7) * 7

  return entry.month.days.slice(start, start + 7)
}
