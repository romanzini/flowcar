export async function register() {
  // Only run in the Node.js runtime (not Edge, not during next build static analysis)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    if (process.env.NODE_ENV === 'production' && process.env.TRUSTED_PROXY_IPS === undefined) {
      throw new Error(
        'TRUSTED_PROXY_IPS must be set in production to prevent IP-spoofing on rate limits.',
      )
    }
  }
}
