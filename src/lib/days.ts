export const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', "Jum'at", 'Sabtu']

// nama hari bahasa Inggris -> Indonesia (jaga-jaga kalau sumbernya pakai bahasa Inggris)
const EN: Record<string, string> = {
  sunday: 'minggu',
  monday: 'senin',
  tuesday: 'selasa',
  wednesday: 'rabu',
  thursday: 'kamis',
  friday: 'jumat',
  saturday: 'sabtu',
}

// "Jum'at", "Jumat", "JUMAT", "Friday" -> "jumat"
export function normalizeDay(day: string) {
  const d = day.toLowerCase().replace(/[^a-z]/g, '')
  return EN[d] ?? d
}

export function todayName() {
  return DAYS[new Date().getDay()]
}

/** Urutan Senin -> Minggu (buat ngurutin jadwal). */
export function dayOrder(day: string) {
  const order = [...DAYS.slice(1), DAYS[0]].map(normalizeDay)
  const i = order.indexOf(normalizeDay(day))
  return i === -1 ? 99 : i
}
