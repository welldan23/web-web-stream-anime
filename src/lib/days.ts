import type { ScheduleDay } from './api'

export const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', "Jum'at", 'Sabtu']

/** Urutan Senin → Minggu + nama parameter jadwal Kuramanime. */
export const WEEK: { name: string; param: ScheduleDay }[] = [
  { name: 'Senin', param: 'monday' },
  { name: 'Selasa', param: 'tuesday' },
  { name: 'Rabu', param: 'wednesday' },
  { name: 'Kamis', param: 'thursday' },
  { name: "Jum'at", param: 'friday' },
  { name: 'Sabtu', param: 'saturday' },
  { name: 'Minggu', param: 'sunday' },
]

// "Jum'at", "Jumat", "JUMAT" -> "jumat"
export function normalizeDay(day: string) {
  return day.toLowerCase().replace(/[^a-z]/g, '')
}

export function todayName() {
  return DAYS[new Date().getDay()]
}

export function todayParam(): ScheduleDay {
  return WEEK.find((d) => d.name === todayName())!.param
}
