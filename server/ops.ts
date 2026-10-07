// Panel kontrol VPS lewat HTTPS, buat ngecek & ngerawat server tanpa SSH.
// Mati total kalau OPS_TOKEN kosong/pendek (semua route jadi 404).
//
// Semua request wajib bawa header `Authorization: Bearer <OPS_TOKEN>`.
//   GET  /_animeku/ops/status          kondisi server, pm2, versi kode, cek Animeku & wajik
//   GET  /_animeku/ops/logs            log pm2
//   GET  /_animeku/ops/check-sources   VPS bisa nyambung ke Jikan/Kitsu/AniList/dll atau nggak
//   POST /_animeku/ops/restart         restart Animeku (jalan di belakang, cek lewat /jobs)
//   POST /_animeku/ops/deploy          git pull + build + restart (jalan di belakang)
//   GET  /_animeku/ops/jobs/:id        hasil restart/deploy
//
// Aksinya cuma yang ada di atas (isinya di scripts/vps-tools.sh & scripts/deploy.sh),
// nggak ada perintah bebas.
import { execFile, spawn } from 'node:child_process'
import { createHash, timingSafeEqual } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, readdir } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'
import { clientIp, createLimiter, json, SERVER_PREFIX, type Next } from './http.ts'

const PREFIX = `${SERVER_PREFIX}/ops`
const MIN_TOKEN_LENGTH = 32
const READ_ACTIONS = ['status', 'logs', 'check-sources'] as const
const JOB_ACTIONS = ['restart', 'deploy'] as const

export interface OpsOptions {
  token?: string
  /** folder project (default: folder tempat server dijalanin) */
  appDir?: string
}

function sameToken(a: string, b: string) {
  const x = createHash('sha256').update(a).digest()
  const y = createHash('sha256').update(b).digest()
  return timingSafeEqual(x, y)
}

function text(res: ServerResponse, status: number, body: string) {
  res.statusCode = status
  res.setHeader('content-type', 'text/plain; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(body)
}

export function createOps(options: OpsOptions = {}) {
  const token = options.token?.trim() ?? ''
  const enabled = token.length >= MIN_TOKEN_LENGTH
  const appDir = path.resolve(options.appDir || process.cwd())
  const jobsDir = path.join(appDir, 'data', 'ops')
  const allowed = createLimiter()
  const running = new Set<string>()
  const inDocker = existsSync('/.dockerenv') || Boolean(process.env.SOURCE_COMMIT)

  function runTool(action: string) {
    return new Promise<string>((resolve) => {
      execFile(
        'bash',
        [path.join(appDir, 'scripts', 'vps-tools.sh'), action],
        { cwd: appDir, timeout: 120_000, maxBuffer: 4 * 1024 * 1024 },
        (error, stdout, stderr) => {
          const tail = error ? `\n\n[selesai dengan error: ${error.message.split('\n')[0]}]` : ''
          resolve(`${stdout}${stderr ? `\n${stderr}` : ''}${tail}`)
        },
      )
    })
  }

  /**
   * Restart/deploy bakal ngematiin proses server ini juga (pm2 restart), jadi dijalanin
   * lepas dari proses ini (setsid + nohup) dan hasilnya ditulis ke data/ops/<id>.log.
   */
  async function startJob(action: (typeof JOB_ACTIONS)[number]) {
    await mkdir(jobsDir, { recursive: true })
    const id = `${new Date().toISOString().replace(/[-:]/g, '').replace(/\..*/, '')}-${action}`
    const log = path.join(jobsDir, `${id}.log`)
    // argumen dikirim terpisah ($1/$2), nggak ada teks dari request yang masuk ke perintah
    spawn('bash', ['-c', 'nohup setsid bash scripts/ops-job.sh "$1" "$2" > /dev/null 2>&1 &', 'ops', action, log], {
      cwd: appDir,
      stdio: 'ignore',
      detached: true,
    }).unref()
    return id
  }

  async function handle(req: IncomingMessage, res: ServerResponse, next: Next) {
    const url = new URL(req.url ?? '/', 'http://localhost')
    if (!url.pathname.startsWith(`${PREFIX}/`)) return next()
    if (!enabled) return json(res, 404, { message: 'Nggak ada.' })

    const ip = clientIp(req)
    const auth = req.headers.authorization ?? ''
    const given = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
    if (!given || !sameToken(given, token)) {
      // batasin tebak-tebakan token
      if (!allowed(`ops-fail:${ip}`, 5, 15 * 60_000)) return json(res, 429, { message: 'Kebanyakan percobaan.' })
      return json(res, 401, { message: 'Token salah.' })
    }
    if (!allowed(`ops:${ip}`, 30, 60_000)) return json(res, 429, { message: 'Kebanyakan request.' })

    const route = url.pathname.slice(PREFIX.length + 1)
    try {
      if (req.method === 'GET' && (READ_ACTIONS as readonly string[]).includes(route)) {
        return text(res, 200, await runTool(route))
      }

      if (req.method === 'POST' && (JOB_ACTIONS as readonly string[]).includes(route)) {
        // di Docker nggak ada git/pm2; container di-build ulang otomatis dari luar tiap ada push
        if (inDocker)
          return json(res, 501, {
            message: 'Server ini jalan di Docker dan update otomatis tiap push ke master; restart/deploy lewat panel nggak dipakai.',
          })
        if (running.has(route)) return json(res, 409, { message: `${route} lagi jalan, tunggu dulu.` })
        running.add(route)
        setTimeout(() => running.delete(route), 60_000)
        const id = await startJob(route as (typeof JOB_ACTIONS)[number])
        return json(res, 202, { id, check: `${PREFIX}/jobs/${id}` })
      }

      if (req.method === 'GET' && route === 'jobs') {
        const files = await readdir(jobsDir).catch(() => [] as string[])
        return json(res, 200, { jobs: files.filter((f) => f.endsWith('.log')).map((f) => f.slice(0, -4)).sort().reverse().slice(0, 20) })
      }

      const job = route.match(/^jobs\/(\d{8}T\d{6}-(?:restart|deploy))$/)
      if (req.method === 'GET' && job) {
        const body = await readFile(path.join(jobsDir, `${job[1]}.log`), 'utf-8').catch(() => null)
        if (body === null) return json(res, 404, { message: 'Job nggak ada.' })
        return text(res, 200, body.length > 200_000 ? body.slice(-200_000) : body)
      }

      return json(res, 404, { message: 'Aksi nggak dikenal.' })
    } catch (error) {
      return json(res, 500, { message: error instanceof Error ? error.message : 'Error' })
    }
  }

  return { handle, enabled }
}
