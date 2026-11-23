import { test, expect } from '@playwright/test'

test('installable and playable offline after the first visit', async ({ page, context }) => {
  await page.addInitScript(() => { if (!localStorage.getItem('g3d.settings')) localStorage.setItem('g3d.settings', JSON.stringify({ quality: 'flat', sound: false, voice: false })) })
  await page.goto('/')
  const manifest = await page.evaluate(async () => (await fetch('/manifest.webmanifest')).json())
  expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']))
  await page.waitForFunction(async () => (await navigator.serviceWorker.ready).active?.state === 'activated', null, { timeout: 30_000 })
  await expect(page.locator('#opp .dot.ready')).toBeVisible({ timeout: 30_000 })

  await context.setOffline(true)
  await page.reload()
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.locator('#opp .dot.ready')).toBeVisible({ timeout: 30_000 }) // engine came from the cache
  await page.getByRole('button', { name: /^e2/ }).click()
  await page.getByRole('button', { name: /^e4/ }).click()
  await expect(page.locator('#moves .row')).toContainText('e4')
  await expect(page.locator('#moves .row')).not.toHaveText(/^1\.\s*e4\s*$/, { timeout: 20_000 }) // Stockfish answered offline
  await context.setOffline(false)
})
