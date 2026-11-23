import { test, expect, open, startGame, script, FOOL } from './fixtures'

test('opening repertoire flags a rare move against the masters (mocked explorer)', async ({ page }) => {
  await page.route('https://explorer.lichess.ovh/masters**', r => {
    const fen = new URL(r.request().url()).searchParams.get('fen') ?? ''
    const start = fen.startsWith('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP')
    r.fulfill({ json: { moves: start
      ? [{ uci: 'e2e4', san: 'e4', white: 500, draws: 300, black: 200 }, { uci: 'd2d4', san: 'd4', white: 400, draws: 300, black: 200 }, { uci: 'a2a3', san: 'a3', white: 3, draws: 1, black: 1 }]
      : [{ uci: 'g1f3', san: 'Nf3', white: 300, draws: 200, black: 100 }] } })
  })
  await open(page)
  await startGame(page)
  await script(page, FOOL)
  await expect(page.locator('.review .saved')).toBeVisible({ timeout: 45_000 })
  await page.getByRole('button', { name: 'Close review' }).click()
  await page.getByTitle(/^My Coach/).click()
  await page.getByRole('button', { name: /Check my openings/ }).click()
  await expect(page.locator('.mycoach tr.dev').first()).toContainText('a3')
  await page.getByRole('button', { name: /Drill the main moves/ }).click()
  await expect(page.locator('.train')).toContainText('Opening repertoire')
})

test('voice coach reads hints aloud', async ({ page }) => {
  await page.addInitScript(() => {
    const said: string[] = []
    Object.assign(window, { __said: said })
    window.speechSynthesis.speak = (u: SpeechSynthesisUtterance) => { said.push(u.text) }
  })
  await open(page)
  await page.getByTitle('Board style').click()
  await page.getByText('Voice coach').click()
  await page.getByRole('button', { name: 'Close' }).click()
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await page.getByRole('button', { name: '💡 Hint' }).click()
  await expect.poll(() => page.evaluate(() => (window as never as { __said: string[] }).__said.join(' | ')), { timeout: 20_000 }).toMatch(/Hint: try (knight|bishop|rook|queen|king )?[a-h]/)
})
