import type { Browser } from 'playwright'

// SEC-002: Singleton browser launched with security restrictions
let browserInstance: Browser | null = null

async function getBrowser(): Promise<Browser> {
  if (browserInstance) return browserInstance

  const { chromium } = await import('playwright')
  browserInstance = await chromium.launch({
    args: [
      '--disable-extensions',
      '--disable-plugins',
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  })
  return browserInstance
}

/**
 * Converts HTML content to a PDF buffer using Playwright headless Chrome.
 * SEC-002: Blocks file:// URLs and external network access via inline CSP.
 */
export async function generatePDF(htmlContent: string): Promise<Buffer> {
  const browser = await getBrowser()
  const context = await browser.newContext()

  // Block file:// URL access and external requests
  await context.route('**/*', (route) => {
    const url = route.request().url()
    if (url.startsWith('file://') || (!url.startsWith('data:') && !url.startsWith('about:'))) {
      // Allow only data URIs and about:blank; block everything else
      void route.abort()
      return
    }
    void route.continue()
  })

  const page = await context.newPage()
  const start = Date.now()

  // SEC-002: Inject CSP as meta tag; use setContent which avoids any network fetch
  const securedHtml = htmlContent.replace(
    '<head>',
    `<head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:;">`
  )

  await page.setContent(securedHtml, { waitUntil: 'networkidle' })

  const elapsed = Date.now() - start
  if (elapsed > 5000) {
    await context.close()
    throw new Error(`PDF generation timed out (${elapsed}ms)`)
  }

  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
  })

  await context.close()
  return Buffer.from(pdfBuffer)
}
