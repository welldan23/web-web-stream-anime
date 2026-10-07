import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getEpisodeInfo, getJikanEpisodes, mergeJikan } from './animeMeta'

/**
 * Info tiap episode dari server (judul, sinopsis, gambar, filler/recap).
 * Kalau server gagal nyambung ke Jikan, judul + filler/recap diambil langsung
 * dari browser lalu digabung. Data server tampil duluan, Jikan nyusul.
 */
export function useEpisodeInfo(anilistId: number | undefined) {
  const { data: info } = useQuery({
    queryKey: ['episode-info', anilistId],
    queryFn: () => getEpisodeInfo(anilistId!),
    enabled: Boolean(anilistId),
    staleTime: 1000 * 60 * 60 * 6,
    retry: false,
  })
  const needsJikan = Boolean(info?.malId && info.failed?.some((f) => f.startsWith('jikan')))
  const { data: jikan } = useQuery({
    queryKey: ['jikan-episodes', info?.malId],
    queryFn: () => getJikanEpisodes(info!.malId!),
    enabled: needsJikan,
    staleTime: 1000 * 60 * 60 * 6,
    retry: false,
  })
  return useMemo(() => (info && jikan?.length ? mergeJikan(info, jikan) : info), [info, jikan])
}
