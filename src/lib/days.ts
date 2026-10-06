export const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', "Jum'at", 'Sabtu']

// "Jum'at", "Jumat", "JUMAT" -> "jumat"
export function normalizeDay(day: string) {
  return day.toLowerCase().replace(/[^a-z]/g, '')
}

export function todayName() {
  return DAYS[new Date().getDay()]
}
