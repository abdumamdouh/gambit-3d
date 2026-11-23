import { test, expect, open, click } from './fixtures'

test('placement test opens stages by score', async ({ page }) => {
  await open(page)
  await page.getByTitle('Academy').click()
  await page.getByRole('button', { name: 'Take placement test' }).click()
  const answers: [string, string][][] = [[['d2', 'e4']], [['e1', 'g1']], [['a1', 'a8']], [['d5', 'c7'], ['c7', 'a8']], [['a1', 'a2']]]
  for (const steps of answers) {
    for (const [f, t] of steps) { await click(page, f, t); await page.waitForTimeout(900) }
    await page.waitForTimeout(1300)
  }
  await expect(page.locator('.note')).toContainText('Placement done: 4/5')
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('g3d.academy')!).placement)).toBe(4)
})

test('a lesson undoes a wrong move, then completes', async ({ page }) => {
  await open(page)
  await page.getByTitle('Academy').click()
  await page.getByRole('button', { name: 'Rook', exact: true }).click()
  await click(page, 'd1', 'd2')
  await expect(page.locator('.note')).toContainText('Not quite')
  await page.waitForTimeout(1200)
  await click(page, 'd1', 'd5')
  await expect(page.locator('.note')).toContainText('Well done')
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('g3d.academy')!).done)).toContain('s1-rook')
})

test('Lichess puzzle (mocked): solve raises the rating', async ({ page }) => {
  await page.route('https://lichess.org/api/puzzle/**', r => r.fulfill({
    json: { game: { id: 'x', pgn: '' }, puzzle: { id: 'mock1', rating: 1200, plays: 1, fen: '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1', solution: ['a1a8'], themes: ['mateIn1', 'backRankMate'] } },
  }))
  await open(page)
  await page.getByTitle('Tactics trainer').click()
  await page.getByRole('button', { name: 'Start puzzles' }).click()
  await expect(page.locator('.train')).toContainText('Puzzle')
  await click(page, 'a1', 'a8')
  await expect(page.locator('.note')).toContainText('Solved')
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('g3d.puzzles')!).rating)).toBeGreaterThan(1000)
})

test('styles and the 2D board keep the game playable', async ({ page }) => {
  await open(page)
  await page.getByTitle('Board style').click()
  await page.getByRole('button', { name: /Walnut Classic/ }).click()
  await page.getByRole('button', { name: '2D board' }).click()
  await page.getByRole('button', { name: 'Close' }).click()
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.locator('#board2d')).toBeVisible()
  await page.getByRole('button', { name: /^e2/ }).click()
  await page.getByRole('button', { name: /^e4/ }).click()
  await expect.poll(() => page.evaluate(() => (window as never as { __game: { getState(): { history: unknown[] } } }).__game.getState().history.length), { timeout: 20_000 }).toBe(2)
  expect(await page.evaluate(() => localStorage.getItem('g3d.theme'))).toBe('walnut')
})

test('friend game over peer-to-peer (needs internet)', async ({ browser }) => {
  // WebRTC does not connect between headless contexts; run with P2P=1 (headed) — see README.
  test.skip(!process.env.P2P, 'Run with P2P=1 npm run e2e')
  const host = await (await browser.newContext()).newPage()
  await open(host)
  await host.getByTitle('Play online').click()
  await host.getByRole('button', { name: 'Create invite link' }).click()
  const link = await host.locator('input.link').inputValue({ timeout: 20_000 })
  const guest = await (await browser.newContext()).newPage()
  await guest.goto(link.replace(/^https?:\/\/[^/]+/, ''))
  await expect.poll(() => guest.evaluate(() => (window as never as { __game: { getState(): { mode: string } } }).__game?.getState().mode), { timeout: 30_000 }).toBe('online')
  await host.waitForFunction(() => '__click' in window)
  await click(host, 'e2', 'e4')
  await expect.poll(() => guest.evaluate(() => (window as never as { __game: { getState(): { history: unknown[] } } }).__game.getState().history.length), { timeout: 15_000 }).toBe(1)
})
