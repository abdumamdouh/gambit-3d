// Lichess OAuth (PKCE, no client secret) + Board API. Docs: https://lichess.org/api
const LICHESS = 'https://lichess.org'
const CLIENT_ID = 'gambit-3d'
const TOKEN_KEY = 'g3d.lichess'
const VERIFIER_KEY = 'g3d.pkce'

const b64url = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

export async function challengeFor(verifier: string) {
  return b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)))
}

const redirectUri = () => location.origin + '/'

export async function login() {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)))
  const state = b64url(crypto.getRandomValues(new Uint8Array(12)))
  sessionStorage.setItem(VERIFIER_KEY, JSON.stringify({ verifier, state }))
  const q = new URLSearchParams({
    response_type: 'code', client_id: CLIENT_ID, redirect_uri: redirectUri(), scope: 'board:play',
    code_challenge_method: 'S256', code_challenge: await challengeFor(verifier), state,
  })
  location.assign(`${LICHESS}/oauth?${q}`)
}

/** Finish the OAuth redirect. Returns true when a token was stored. */
export async function completeLogin(): Promise<boolean> {
  const u = new URL(location.href)
  const code = u.searchParams.get('code')
  if (!code) return false
  const saved = JSON.parse(sessionStorage.getItem(VERIFIER_KEY) ?? 'null') as { verifier: string; state: string } | null
  history.replaceState(null, '', '/')
  if (!saved || saved.state !== u.searchParams.get('state')) return false
  const r = await fetch(`${LICHESS}/api/token`, {
    method: 'POST',
    body: new URLSearchParams({ grant_type: 'authorization_code', code, code_verifier: saved.verifier, redirect_uri: redirectUri(), client_id: CLIENT_ID }),
  })
  sessionStorage.removeItem(VERIFIER_KEY)
  if (!r.ok) return false
  const j = await r.json()
  localStorage.setItem(TOKEN_KEY, j.access_token)
  return true
}

export const token = () => { try { return localStorage.getItem(TOKEN_KEY) } catch { return null } }
export async function logout() {
  const t = token()
  localStorage.removeItem(TOKEN_KEY)
  if (t) await fetch(`${LICHESS}/api/token`, { method: 'DELETE', headers: { Authorization: `Bearer ${t}` } }).catch(() => undefined)
}

const auth = () => ({ Authorization: `Bearer ${token()}` })

export async function account(): Promise<{ username: string } | null> {
  const r = await fetch(`${LICHESS}/api/account`, { headers: auth() }).catch(() => null)
  return r?.ok ? r.json() : null
}

/** Calls onObj for each JSON line; tolerates chunks split mid-line and keep-alive newlines. */
export function ndjsonSplitter(onObj: (o: unknown) => void) {
  let buf = ''
  return (chunk: string) => {
    buf += chunk
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''
    for (const l of lines) if (l.trim()) onObj(JSON.parse(l))
  }
}

/** Stream an NDJSON endpoint until aborted. */
export async function stream(path: string, onObj: (o: unknown) => void, signal: AbortSignal) {
  const r = await fetch(LICHESS + path, { headers: auth(), signal })
  if (!r.ok || !r.body) throw new Error(`Lichess ${r.status}`)
  const reader = r.body.pipeThrough(new TextDecoderStream()).getReader()
  const feed = ndjsonSplitter(onObj)
  for (;;) {
    const { value, done } = await reader.read()
    if (done) return
    feed(value)
  }
}

/** Seek a casual game. The request stays open until paired; abort to cancel. */
export function seek(minutes: number, increment: number, signal: AbortSignal) {
  return fetch(`${LICHESS}/api/board/seek`, { method: 'POST', headers: auth(), body: new URLSearchParams({ time: String(minutes), increment: String(increment), rated: 'false' }), signal })
}

export const sendMove = (game: string, uci: string) => fetch(`${LICHESS}/api/board/game/${game}/move/${uci}`, { method: 'POST', headers: auth() })
export const resignGame = (game: string) => fetch(`${LICHESS}/api/board/game/${game}/resign`, { method: 'POST', headers: auth() })

/** New server moves to play locally; null when the histories disagree. */
export function movesToApply(local: string[], serverMoves: string): string[] | null {
  const server = serverMoves.trim() ? serverMoves.trim().split(' ') : []
  for (let i = 0; i < Math.min(local.length, server.length); i++) if (local[i] !== server[i]) return null
  return server.slice(local.length)
}
