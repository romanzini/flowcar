import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * CSP Nonce Forwarding Tests
 *
 * Verifies that the CSP nonce generated in middleware is correctly forwarded
 * through request headers so that Next.js Server Components (layout.tsx) can
 * read it via `headers().get('x-nonce')` and stamp it on the rendered <style>.
 *
 * Correct flow (post-fix):
 *   middleware generates nonce
 *     → sets x-nonce in REQUEST headers (for Server Components)
 *     → sets Content-Security-Policy nonce-<X> in RESPONSE headers (for browser)
 *   layout.tsx reads x-nonce from request headers
 *     → renders <style nonce="{X}"> in HTML
 *   Result: CSP nonce in response header === nonce on <style> element in raw HTML
 *
 * Failure mode (REM-001 bug — before fix):
 *   x-nonce was only set on the response, not the request.
 *   layout.tsx received nonce='' → <style nonce=""> or no element at all.
 *   React's injected <style> had no valid nonce → blocked by CSP on public pages.
 *
 * NOTE: Modern browsers intentionally hide nonce values from JavaScript DOM APIs
 * (el.getAttribute('nonce') always returns "") to prevent nonce exfiltration.
 * We therefore validate against the raw HTTP response body, not the DOM.
 */

async function assertNonceForwarded(
  page: Page,
  route: string,
) {
  const response = await page.goto(route, { waitUntil: 'commit' })
  expect(response, `No response for ${route}`).not.toBeNull()

  // 1. CSP header must be present
  const csp = response!.headers()['content-security-policy']
  expect(csp, `CSP header missing on ${route}`).toBeTruthy()

  // 2. CSP must include the same nonce in both script-src and style-src.
  const nonceMatch = csp.match(/nonce-([A-Za-z0-9+/=]+)/)
  expect(nonceMatch, `No nonce in CSP style-src on ${route}`).not.toBeNull()
  const nonceFromCsp = nonceMatch![1]
  expect(csp, `script-src nonce missing on ${route}`).toContain(
    `script-src 'self' 'nonce-${nonceFromCsp}'`,
  )
  expect(csp, `style-src nonce missing on ${route}`).toContain(
    `style-src 'self' 'nonce-${nonceFromCsp}'`,
  )

  // 3. x-nonce must NOT appear in response headers (it's a request-only header
  //    after the fix; exposing it in responses would allow client JS to read it).
  const xNonce = response!.headers()['x-nonce']
  expect(
    xNonce,
    `x-nonce must not be exposed in response headers on ${route}`,
  ).toBeUndefined()

  // 4. Verify the raw HTML body contains both <style> and <script> tags using
  //    the same nonce from the CSP header.
  //    We use the raw response body instead of DOM APIs because browsers
  //    intentionally hide nonce attribute values from JS to prevent exfiltration
  //    (el.getAttribute('nonce') always returns "" in modern browsers).
  const html = await response!.text()
  expect(
    html,
    `Raw HTML does not contain <style nonce="${nonceFromCsp}"> on ${route} — nonce not forwarded in request headers (REM-001)`,
  ).toContain(`nonce="${nonceFromCsp}"`)
  expect(
    html,
    `Raw HTML does not contain a <script> tag with nonce="${nonceFromCsp}" on ${route} — script bootstrap would be blocked by CSP`,
  ).toMatch(new RegExp(`<script[^>]*nonce="${nonceFromCsp}"`, 'i'))
}

for (const route of ['/login', '/cadastro']) {
  test(`CSP nonce is forwarded end-to-end on public route: ${route}`, async ({ page }) => {
    await assertNonceForwarded(page, route)
  })
}

test('CSP nonce is forwarded end-to-end on public contract signing page', async ({ page }) => {
  // Dummy token — only checking CSP/nonce plumbing, not contract data.
  await assertNonceForwarded(page, '/contratos/assinar/test-token-123')
})
