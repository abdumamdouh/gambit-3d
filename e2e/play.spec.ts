import { test, expect, open, startGame, click, history, script, dbCount, FOOL } from './fixtures'

test('loads with the engine ready and no errors', async ({ page, errors }) => {
  await open(page)
  await expect(page.locator('#opp .dot.ready')).toBeVisible({ timeout: 30_000 })
  expect(errors).toEqual([])
})

test('play a move and Stockfish answers', async ({ page }) => {
  await open(page)
  await startGame(page)
  await click(page, 'e2', 'e4')
  await expect.poll(() => history(page), { timeout: 20_000 }).toHaveLength(2)
  await expect(page.locator('#moves')).toContainText('e4')
})

test('play as Black: Stockfish opens', async ({ page }) => {
  await open(page)
  await startGame(page, 'Black')
  await expect.poll(() => history(page), { timeout: 20_000 }).toHaveLength(1)
})

test('undo returns to my turn', async ({ page }) => {
  await open(page)
  await startGame(page)
  await click(page, 'e2', 'e4')
  await expect.poll(() => history(page), { timeout: 20_000 }).toHaveLength(2)
  await page.getByRole('button', { name: '↶ Undo' }).click()
  await expect.poll(() => history(page)).toHaveLength(0)
})

test('hint shows the best move', async ({ page }) => {
  await open(page)
  await startGame(page)
  await page.getByRole('button', { name: '💡 Hint' }).click()
  await expect(page.locator('#msg')).toContainText('Hint: try', { timeout: 20_000 })
})

test('blunder guard stops a hanging queen', async ({ page }) => {
  await open(page)
  await startGame(page)
  await page.evaluate(() => (window as never as { __game: { getState(): { loadFen(f: string, m: string, c: string): void } } }).__game.getState().loadFen('rnbqkb1r/pppp1ppp/5n2/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 2 3', 'game', 'w'))
  await click(page, 'd1', 'h5')
  await expect(page.getByRole('heading', { name: /Are you sure/ })).toBeVisible({ timeout: 20_000 })
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect.poll(() => history(page)).toHaveLength(0)
})

test('a finished game is reviewed, saved, and a replay does not save twice', async ({ page }) => {
  await open(page)
  await startGame(page)
  await script(page, FOOL)
  await expect(page.locator('.review .saved')).toBeVisible({ timeout: 45_000 })
  await expect(page.locator('.review')).toContainText('Blunder')
  expect(await dbCount(page)).toBe(1)
  await page.getByRole('button', { name: 'Close review' }).click()
  await page.getByTitle('Your progress').click()
  await expect(page.locator('.progress-dlg')).toContainText('Games')
  await page.getByRole('button', { name: 'Replay' }).first().click()
  await expect(page.locator('.review .explain')).toBeVisible({ timeout: 45_000 })
  expect(await dbCount(page)).toBe(1)
})

test('My Coach finds the pattern after two games and builds drills', async ({ page }) => {
  await open(page)
  await startGame(page)
  for (let i = 0; i < 2; i++) {
    await page.evaluate(() => (window as never as { __game: { getState(): { newGame(o: object): void } } }).__game.getState().newGame({ color: 'w', level: 3, minutes: null }))
    await script(page, FOOL)
    await expect(page.locator('.review .saved')).toBeVisible({ timeout: 45_000 })
    await page.getByRole('button', { name: 'Close review' }).click()
  }
  await page.getByTitle(/^My Coach/).click()
  await expect(page.locator('.mycoach')).toContainText('Allowing checkmate')
  await page.getByRole('button', { name: /Train my weaknesses/ }).click()
  await expect(page.locator('.train')).toContainText('From your games')
  const sol = await page.evaluate(() => (window as never as { __train: { getState(): { drill: { solution: string[] } } } }).__train.getState().drill.solution[0])
  await click(page, sol.slice(0, 2), sol.slice(2, 4))
  await expect(page.locator('.note')).toContainText('Fixed')
})
