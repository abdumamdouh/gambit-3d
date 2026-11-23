import { test, expect, open } from './fixtures'

const overlap = (a: DOMRect | null, b: DOMRect | null) => !!a && !!b && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom

test('main controls do not overlap', async ({ page }) => {
  await open(page, 'low') // the camera bar only exists in 3D
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  const box = (s: string) => page.locator(s).evaluate(e => e.getBoundingClientRect().toJSON() as DOMRect)
  const [coach, cams, me, opp, tools] = await Promise.all(['#coach', '#cams', '#me', '#opp', '#tools'].map(box))
  expect(overlap(coach, cams)).toBe(false)
  expect(overlap(coach, me)).toBe(false)
  expect(overlap(opp, tools)).toBe(false)
  const width = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
  expect(width).toBe(true)
})
