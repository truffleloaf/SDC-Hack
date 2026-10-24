import { describe, expect, it, vi } from 'vitest'
import { authMessage, initialSignIn, maskedEmail, safeReturnPath, SignInFlow, type AuthGateway } from './flow'
function gateway(): AuthGateway { return { signInWithOtp: vi.fn().mockResolvedValue({ error: null }), verifyOtp: vi.fn().mockResolvedValue({ error: null, data: { session: { access_token: 'synthetic' } } }), signInWithOAuth: vi.fn().mockResolvedValue({ error: null }) } }
describe('sign-in flow', () => {
  it('sends a code, enforces per-address resend time and verifies six digits', async () => {
    const auth = gateway(), changed = vi.fn(); let now = 1000
    const flow = new SignInFlow(auth, changed, () => now)
    await flow.send(' person@example.com ')
    expect(auth.signInWithOtp).toHaveBeenCalledWith({ email: 'person@example.com', options: { shouldCreateUser: true } })
    expect(flow.snapshot).toMatchObject({ step: 'code', busy: false, resendAt: 61000 })
    await flow.send('person@example.com'); expect(auth.signInWithOtp).toHaveBeenCalledTimes(1)
    now = 61000; await flow.send('person@example.com'); expect(auth.signInWithOtp).toHaveBeenCalledTimes(2)
    await flow.verify('123'); expect(auth.verifyOtp).not.toHaveBeenCalled()
    await flow.verify('012345'); expect(auth.verifyOtp).toHaveBeenCalledWith({ email: 'person@example.com', token: '012345', type: 'email' })
    expect(flow.snapshot.step).toBe('done')
  })
  it('preserves the email after wrong, expired and rate-limited verification', async () => {
    for (const [error, message] of [[{ code: 'invalid_code' }, "That code isn't right"], [{ code: 'otp_expired', message: 'Expired token' }, 'That code expired'], [{ status: 429 }, 'Too many attempts']] as const) {
      const auth = gateway(); vi.mocked(auth.verifyOtp).mockResolvedValue({ error })
      const flow = new SignInFlow(auth, () => {}); await flow.send('person@example.com'); await flow.verify('123456')
      expect(flow.snapshot.email).toBe('person@example.com'); expect(flow.snapshot.error).toContain(message); expect(flow.snapshot.busy).toBe(false)
    }
    expect(authMessage({ code: 'otp_expired', message: 'Token has expired or is invalid' }, 'verify')).toContain('or has expired')
  })
  it('keeps the form open when verification returns no session', async () => { const auth = gateway(); vi.mocked(auth.verifyOtp).mockResolvedValue({ error: null, data: { session: null } }); const flow = new SignInFlow(auth, () => {}); await flow.send('person@example.com'); await flow.verify('123456'); expect(flow.snapshot.step).toBe('code'); expect(flow.snapshot.error).toContain('did not complete') })
  it('allows another email immediately and does not reuse the previous code', async () => {
    const auth = gateway(), flow = new SignInFlow(auth, () => {}, () => 1000)
    await flow.send('first@example.com'); flow.changeEmail(); await flow.send('second@example.com')
    expect(flow.snapshot.email).toBe('second@example.com'); expect(auth.signInWithOtp).toHaveBeenCalledTimes(2)
  })
  it('starts Google with the return URL and surfaces provider errors', async () => {
    const auth = gateway(), flow = new SignInFlow(auth, () => {})
    await flow.google('https://example.com/signin?next=/pathway')
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({ provider: 'google', options: { redirectTo: 'https://example.com/signin?next=/pathway' } })
    vi.mocked(auth.signInWithOAuth).mockResolvedValue({ error: { code: 'provider_disabled' } }); await flow.google('https://example.com/signin')
    expect(flow.snapshot.error).toContain('Try an email code')
  })
  it('ignores responses after closing and gives actionable offline/sender errors', async () => {
    const auth = gateway(); let complete!: (result: { error: null }) => void
    vi.mocked(auth.signInWithOtp).mockImplementation(() => new Promise((resolve) => { complete = resolve }))
    const flow = new SignInFlow(auth, () => {}), pending = flow.send('person@example.com')
    flow.reset(); complete({ error: null }); await pending
    expect(flow.snapshot).toEqual(initialSignIn)
    expect(authMessage({ name: 'AbortError' }, 'send')).toContain('No connection')
    expect(authMessage({ code: 'email_address_not_authorized' }, 'send')).toContain('Try Google')
  })
  it('masks addresses and prevents open redirects', () => {
    expect(maskedEmail('a.person@gmail.com')).toBe('a***@gmail.com')
    expect(safeReturnPath('https://evil.example')).toBe('/workspace')
    expect(safeReturnPath('//evil.example')).toBe('/workspace')
    expect(safeReturnPath('/pathway')).toBe('/pathway')
  })
})
