import { test as base, expect, type Page } from '@playwright/test'

/** Every test fails on any console error or uncaught page error. */
export const test = base.extend<{ errors: string[] }>({
  errors: async ({ page }, use) => {
    const errors: string[] = []
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
    page.on('pageerror', e => errors.push(String(e)))
    await use(errors)
    expect(errors, 'console errors').toEqual([])
  },
})
export { expect }

/** CI machines have no GPU: software WebGL blocks the page, so flow tests use the 2D board there. */
export const CI_QUALITY = process.env.CI ? 'flat' : 'high'

/** Open the app with dev handles ready. */
export async function open(page: Page, quality = CI_QUALITY) {
  await page.addInitScript(q => { if (!localStorage.getItem('g3d.settings')) localStorage.setItem('g3d.settings', JSON.stringify({ quality: q, sound: false, voice: false })) }, quality)
  await page.goto('/')
  await page.waitForFunction(() => '__game' in window && '__click' in window && '__train' in window)
}

export async function startGame(page: Page, color: 'White' | 'Black' = 'White') {
  await page.getByRole('button', { name: color, exact: true }).click()
  await page.getByRole('button', { name: 'Play', exact: true }).click()
}

export const click = (page: Page, from: string, to: string) =>
  page.evaluate(([f, t]) => { const w = window as never as { __click(s: string): void }; w.__click(f); w.__click(t) }, [from, to])

export const history = (page: Page) =>
  page.evaluate(() => (window as never as { __game: { getState(): { history: { san: string }[] } } }).__game.getState().history.map(h => h.san))

/** Script both sides of a game straight into the store (no engine). */
export const script = (page: Page, moves: [string, string][]) =>
  page.evaluate(ms => {
    const g = (window as never as { __game: { getState(): { move(m: { from: string; to: string }): unknown } } }).__game
    for (const [from, to] of ms) g.getState().move({ from, to })
  }, moves)

export const dbCount = (page: Page) =>
  page.evaluate(() => new Promise<number>(r => {
    const q = indexedDB.open('gambit3d')
    q.onsuccess = () => { const t = q.result.transaction('games').objectStore('games').count(); t.onsuccess = () => r(t.result) }
  }))

/** 1.a3 e5 2.f3 Nc6 3.g4 Qh4# — White blunders into mate. */
export const FOOL: [string, string][] = [['a2', 'a3'], ['e7', 'e5'], ['f2', 'f3'], ['b8', 'c6'], ['g2', 'g4'], ['d8', 'h4']]
