import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:3000'

async function requestWithInvalidRefreshCookie(route: string) {
  return fetch(`${BASE_URL}${route}`, {
    headers: {
      cookie: 'refresh_token=invalid-token',
    },
    redirect: 'manual',
  })
}

test('login page does not redirect when refresh token cookie is invalid', async () => {
  const response = await requestWithInvalidRefreshCookie('/login')

  expect(response.status).toBe(200)
  expect(response.headers.get('location')).toBeNull()

  const html = await response.text()
  expect(html).toContain('Entre na sua conta')
  expect(html).toContain('name="email"')
  expect(html).toContain('name="password"')
})

test('dashboard redirects to login when refresh token cookie is invalid', async () => {
  const response = await requestWithInvalidRefreshCookie('/dashboard')

  expect(response.status).toBe(307)
  expect(response.headers.get('location')).toBe('/login')
})