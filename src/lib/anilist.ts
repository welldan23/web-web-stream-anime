// Data tambahan dari AniList (https://anilist.co): banner, skor, trailer,
// karakter, dan jadwal episode berikutnya. Gratis, tanpa API key.
// Batas pemakaian ±90 request/menit per IP; tiap halaman anime cuma butuh 1–2 request.

const ANILIST_URL = 'https://graphql.anilist.co'

export interface AniListCandidate {
  id: number
  title: { romaji: string | null; english: string | null; native: string | null }
  synonyms: string[]
  format: string | null
  seasonYear: number | null
}

export interface AniListMedia {
  id: number
  idMal: number | null
  siteUrl: string
  title: { romaji: string | null; english: string | null; native: string | null }
  format: string | null
  status: string | null
  episodes: number | null
  duration: number | null
  season: 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL' | null
  seasonYear: number | null
  averageScore: number | null
  popularity: number | null
  favourites: number | null
  bannerImage: string | null
  coverImage: { extraLarge: string | null; color: string | null }
  trailer: { id: string; site: string } | null
  nextAiringEpisode: { episode: number; airingAt: number; timeUntilAiring: number } | null
  studios: { nodes: { name: string }[] }
  characters: {
    edges: {
      role: 'MAIN' | 'SUPPORTING' | 'BACKGROUND'
      node: { id: number; name: { full: string }; image: { medium: string | null } }
      voiceActors: { id: number; name: { full: string }; image: { medium: string | null } }[]
    }[]
  }
}

async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(ANILIST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
  const body = (await res.json().catch(() => null)) as { data?: T; errors?: { message: string }[] } | null
  if (!res.ok || !body?.data) throw new Error(body?.errors?.[0]?.message ?? `AniList ${res.status}`)
  return body.data
}

const SEARCH_QUERY = `
query ($q: String!, $jp: String, $hasJp: Boolean!) {
  a: Page(perPage: 8) { media(search: $q, type: ANIME) { ...c } }
  b: Page(perPage: 5) @include(if: $hasJp) { media(search: $jp, type: ANIME) { ...c } }
}
fragment c on Media { id title { romaji english native } synonyms format seasonYear }`

const DETAIL_QUERY = `
query ($id: Int!) {
  Media(id: $id, type: ANIME) {
    id idMal siteUrl
    title { romaji english native }
    format status episodes duration season seasonYear
    averageScore popularity favourites
    bannerImage coverImage { extraLarge color }
    trailer { id site }
    nextAiringEpisode { episode airingAt timeUntilAiring }
    studios(isMain: true) { nodes { name } }
    characters(sort: [ROLE, RELEVANCE], perPage: 8) {
      edges {
        role
        node { id name { full } image { medium } }
        voiceActors(language: JAPANESE, sort: [RELEVANCE]) { id name { full } image { medium } }
      }
    }
  }
}`

// ---------- Nyocokin judul otakudesu ke AniList ----------

/** "Kimetsu no Yaiba Season 3 (Episode 01 – 11) Subtitle Indonesia" -> "Kimetsu no Yaiba Season 3" */
export function cleanTitle(title: string) {
  return title
    .replace(/\(.*?\)|\[.*?\]/g, ' ')
    .replace(/\b(sub(title)?\s*indo(nesia)?|batch|bd|bluray|episode\s*\d+.*$)\b/gi, ' ')
    .replace(/[|:–—-]+\s*$/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Ambil nomor season/part: "Season 3", "3rd Season", "S3", "Part 2", "2nd Cour". */
export function seasonNumber(title: string): number | null {
  const t = title.toLowerCase()
  const m =
    t.match(/season\s*(\d+)/) ??
    t.match(/(\d+)\s*(?:st|nd|rd|th)\s*season/) ??
    t.match(/\bs(\d+)\b/) ??
    t.match(/\b(?:part|cour)\s*(\d+)/) ??
    t.match(/(\d+)\s*(?:st|nd|rd|th)\s*(?:part|cour)/)
  return m ? Number(m[1]) : null
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()

function bigrams(s: string) {
  const t = normalize(s).replace(/\s+/g, ' ')
  const out = new Map<string, number>()
  for (let i = 0; i < t.length - 1; i++) {
    const g = t.slice(i, i + 2)
    out.set(g, (out.get(g) ?? 0) + 1)
  }
  return out
}

/** Kemiripan 0..1 (Dice coefficient), tahan beda tanda baca & huruf besar-kecil. */
export function similarity(a: string, b: string) {
  if (!a || !b) return 0
  if (normalize(a) === normalize(b)) return 1
  const A = bigrams(a)
  const B = bigrams(b)
  let overlap = 0
  let total = 0
  for (const [g, n] of A) {
    overlap += Math.min(n, B.get(g) ?? 0)
    total += n
  }
  for (const n of B.values()) total += n
  return total ? (2 * overlap) / total : 0
}

export function scoreCandidate(c: AniListCandidate, title: string, japanese?: string) {
  const names = [c.title.romaji, c.title.english, ...c.synonyms].filter((x): x is string => Boolean(x))
  let score = Math.max(0, ...names.map((n) => similarity(title, n)))
  if (japanese && c.title.native) score = Math.max(score, similarity(japanese, c.title.native))

  // season harus cocok: "Season 3" jangan sampai nyasar ke season 1
  const wanted = seasonNumber(title) ?? 1
  const got = Math.max(1, ...names.map((n) => seasonNumber(n) ?? 1))
  if (wanted !== got) score -= 0.25
  return score
}

const MIN_SCORE = 0.6

/**
 * Pilih item yang judulnya paling mirip sama salah satu `names` (nomor season harus sama).
 * Dipakai buat nyocokin judul antar sumber (AniList, trace.moe, Otakudesu, Oploverz).
 */
export function bestTitleMatch<T>(items: T[], getTitle: (item: T) => string, names: string[], min = MIN_SCORE) {
  const wanted = Math.max(1, ...names.map((n) => seasonNumber(n) ?? 1))
  let best: { item: T; score: number } | null = null
  for (const item of items) {
    const title = cleanTitle(getTitle(item))
    let score = Math.max(0, ...names.map((n) => similarity(title, cleanTitle(n))))
    if ((seasonNumber(title) ?? 1) !== wanted) score -= 0.25
    if (!best || score > best.score) best = { item, score }
  }
  return best && best.score >= min ? best.item : null
}

export function pickBest(candidates: AniListCandidate[], title: string, japanese?: string) {
  let best: { c: AniListCandidate; score: number } | null = null
  for (const c of candidates) {
    const score = scoreCandidate(c, title, japanese)
    if (!best || score > best.score) best = { c, score }
  }
  return best && best.score >= MIN_SCORE ? best.c : null
}

// simpan hasil cocok (animeId otakudesu -> id AniList) biar kunjungan berikutnya nggak nyari lagi
const MAP_KEY = 'animeku:anilist-map'
function readMap(): Record<string, number | 0> {
  try {
    return JSON.parse(localStorage.getItem(MAP_KEY) ?? '{}')
  } catch {
    return {}
  }
}
function remember(animeId: string, anilistId: number | 0) {
  try {
    const map = readMap()
    map[animeId] = anilistId
    localStorage.setItem(MAP_KEY, JSON.stringify(map))
  } catch {
    // nggak apa-apa kalau gagal nyimpen
  }
}

/** Cari data AniList buat satu anime otakudesu. `null` kalau nggak ketemu yang cukup mirip. */
export async function findAniList(animeId: string, title: string, japanese?: string): Promise<AniListMedia | null> {
  let id = readMap()[animeId]
  if (id === 0) return null

  if (id === undefined) {
    const q = cleanTitle(title)
    const jp = japanese?.trim() || undefined
    const data = await gql<{ a: { media: AniListCandidate[] }; b?: { media: AniListCandidate[] } }>(SEARCH_QUERY, {
      q,
      jp,
      hasJp: Boolean(jp),
    })
    const best = pickBest([...data.a.media, ...(data.b?.media ?? [])], q, jp)
    id = best?.id ?? 0
    remember(animeId, id)
    if (!id) return null
  }

  return (await gql<{ Media: AniListMedia }>(DETAIL_QUERY, { id })).Media
}

// ---------- Format buat tampilan ----------

const SEASONS = { WINTER: 'Musim Dingin', SPRING: 'Musim Semi', SUMMER: 'Musim Panas', FALL: 'Musim Gugur' }

export function seasonLabel(m: AniListMedia) {
  return m.season && m.seasonYear ? `${SEASONS[m.season]} ${m.seasonYear}` : m.seasonYear ? String(m.seasonYear) : null
}

/** 200000 -> "2 hari 7 jam", 5400 -> "1 jam 30 menit" */
export function countdown(seconds: number) {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d} hari${h ? ` ${h} jam` : ''}`
  if (h > 0) return `${h} jam${m ? ` ${m} menit` : ''}`
  return `${Math.max(1, m)} menit`
}

export function compactNumber(n: number) {
  return new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
}
