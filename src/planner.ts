export type CalendarView = 'day' | 'week' | 'month' | 'year'

export type ColumnCount = 1 | 2 | 3

export type AppointmentRecurrence = 'none' | 'annual'

export interface Appointment {
  id: string
  title: string
  time: string
  details: string
  allDay: boolean
  recurrence: AppointmentRecurrence
}

export interface EffectiveAppointment {
  sourceIsoDate: string
  appointment: Appointment
  isRecurringInstance: boolean
}

export interface DayRecord {
  appointments: Appointment[]
  note: string
}

export interface PlannerPreferences {
  view: CalendarView
  columns: ColumnCount
  selectedIsoDate: string
}

export interface PlannerState {
  version: 3
  preferences: PlannerPreferences
  records: Record<string, DayRecord>
}

export const PLANNER_STORAGE_KEY = 'fixed-calendar-planner'
export const DEFAULT_VIEW: CalendarView = 'month'
export const DEFAULT_COLUMNS: ColumnCount = 2

function pad(value: number) {
  return `${value}`.padStart(2, '0')
}

function todayIsoDate() {
  const today = new Date()

  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
}

export function createEmptyRecord(): DayRecord {
  return {
    appointments: [],
    note: '',
  }
}

export function createEmptyAppointment(): Appointment {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: '',
    time: '',
    details: '',
    allDay: false,
    recurrence: 'none',
  }
}

export function hasAppointmentContent(appointment: Appointment) {
  return Boolean(appointment.title.trim() || appointment.time.trim() || appointment.details.trim())
}

export function isEmptyRecord(record: DayRecord) {
  return record.note.trim().length === 0 && record.appointments.length === 0
}

function normalizeColumns(value: unknown): ColumnCount {
  return value === 1 || value === 2 || value === 3 ? value : DEFAULT_COLUMNS
}

function normalizeView(value: unknown): CalendarView {
  return value === 'day' || value === 'week' || value === 'month' || value === 'year'
    ? value
    : DEFAULT_VIEW
}

function normalizeAppointment(value: unknown): Appointment | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const record = value as Partial<Appointment>

  return {
    id: typeof record.id === 'string' && record.id ? record.id : createEmptyAppointment().id,
    title: typeof record.title === 'string' ? record.title : '',
    time: typeof record.time === 'string' ? record.time : '',
    details: typeof record.details === 'string' ? record.details : '',
    allDay: typeof record.allDay === 'boolean' ? record.allDay : false,
    recurrence: record.recurrence === 'annual' ? 'annual' : 'none',
  }
}

function getMonthDayToken(isoDate: string) {
  const [, month = '', day = ''] = isoDate.split('-')

  return `${month}-${day}`
}

export function getEffectiveAppointmentsForIsoDate(
  records: Record<string, DayRecord>,
  isoDate: string,
): EffectiveAppointment[] {
  const targetMonthDay = getMonthDayToken(isoDate)
  const appointments: EffectiveAppointment[] = []

  for (const [sourceIsoDate, record] of Object.entries(records)) {
    for (const appointment of record.appointments) {
      if (sourceIsoDate === isoDate) {
        appointments.push({
          sourceIsoDate,
          appointment,
          isRecurringInstance: false,
        })
        continue
      }

      if (
        appointment.recurrence === 'annual' &&
        getMonthDayToken(sourceIsoDate) === targetMonthDay &&
        hasAppointmentContent(appointment)
      ) {
        appointments.push({
          sourceIsoDate,
          appointment,
          isRecurringInstance: true,
        })
      }
    }
  }

  return appointments.sort((left, right) => {
    if (left.isRecurringInstance !== right.isRecurringInstance) {
      return Number(left.isRecurringInstance) - Number(right.isRecurringInstance)
    }

    return left.sourceIsoDate.localeCompare(right.sourceIsoDate)
  })
}

export function getEffectiveDayRecord(records: Record<string, DayRecord>, isoDate: string): DayRecord | undefined {
  const exactRecord = records[isoDate]
  const appointments = getEffectiveAppointmentsForIsoDate(records, isoDate).map((entry) => entry.appointment)
  const note = exactRecord?.note ?? ''

  if (!note.trim() && appointments.length === 0) {
    return undefined
  }

  return {
    appointments,
    note,
  }
}

function normalizeRecord(value: unknown): DayRecord | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const entry = value as Partial<DayRecord>
  const appointments = Array.isArray(entry.appointments)
    ? entry.appointments.map(normalizeAppointment).filter((item): item is Appointment => item !== null)
    : []

  return {
    appointments,
    note: typeof entry.note === 'string' ? entry.note : '',
  }
}

function normalizeRecords(value: unknown) {
  if (!value || typeof value !== 'object') {
    return {} satisfies Record<string, DayRecord>
  }

  const normalized: Record<string, DayRecord> = {}

  for (const [isoDate, entry] of Object.entries(value as Record<string, unknown>)) {
    const record = normalizeRecord(entry)

    if (record && !isEmptyRecord(record)) {
      normalized[isoDate] = record
    }
  }

  return normalized
}

export function defaultPlannerState(): PlannerState {
  return {
    version: 3,
    preferences: {
      view: DEFAULT_VIEW,
      columns: DEFAULT_COLUMNS,
      selectedIsoDate: todayIsoDate(),
    },
    records: {},
  }
}

export function loadPlannerState(): PlannerState {
  if (typeof window === 'undefined') {
    return defaultPlannerState()
  }

  const raw = window.localStorage.getItem(PLANNER_STORAGE_KEY)

  if (!raw) {
    return defaultPlannerState()
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PlannerState>
    const fallback = defaultPlannerState()

    return {
      version: 3,
      preferences: {
        view: normalizeView(parsed.preferences?.view),
        columns: normalizeColumns(parsed.preferences?.columns),
        selectedIsoDate:
          typeof parsed.preferences?.selectedIsoDate === 'string' && parsed.preferences.selectedIsoDate
            ? parsed.preferences.selectedIsoDate
            : fallback.preferences.selectedIsoDate,
      },
      records: normalizeRecords(parsed.records),
    }
  } catch {
    return defaultPlannerState()
  }
}

export function savePlannerState(state: PlannerState) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(PLANNER_STORAGE_KEY, JSON.stringify(state))
}