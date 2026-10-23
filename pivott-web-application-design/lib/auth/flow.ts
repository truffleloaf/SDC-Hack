export type AuthProblem = { code?: string; status?: number; message?: string; name?: string }
interface AuthReply { error: AuthProblem | null }
export interface AuthGateway {
  signInWithOtp: (input: { email: string; options: { shouldCreateUser: true } }) => Promise<AuthReply>
  verifyOtp: (input: { email: string; token: string; type: 'email' }) => Promise<AuthReply>
  signInWithOAuth: (input: { provider: 'google'; options: { redirectTo: string } }) => Promise<AuthReply>
}
export interface SignInState { step: 'email' | 'code' | 'done'; email: string; busy: boolean; error: string; resendAt: number }
export const initialSignIn: SignInState = { step: 'email', email: '', busy: false, error: '', resendAt: 0 }
export function authMessage(problem: AuthProblem, action: 'send' | 'verify' | 'google') {
  if (problem.status === 429 || /rate_limit|too_many/.test(problem.code ?? '')) return 'Too many attempts. Try again in a minute.'
  if (['AbortError', 'TypeError', 'AuthRetryableFetchError'].includes(problem.name ?? '') || problem.status === 0) return 'No connection. Your work is still saved on this device.'
  if (action === 'verify') {
    if (problem.code === 'otp_expired' && /invalid/i.test(problem.message ?? '')) return "That code isn't right or has expired. Check the newest email, or resend."
    if (problem.code === 'otp_expired' || /expired/i.test(problem.message ?? '')) return 'That code expired. Request a new one.'
    return "That code isn't right. Check the newest email, or resend."
  }
  return action === 'google' ? 'Google sign-in could not start. Try an email code, or continue without an account.' : "We couldn't send email right now. Try Google, or continue without an account."
}
export function maskedEmail(email: string) { const [name, domain] = email.split('@'); return `${name?.slice(0, 1) || '*'}***@${domain || ''}` }
const returns = new Set(['/workspace', '/account', '/start', '/map', '/skills', '/routes', '/pathway', '/passport', '/signals', '/method'])
export function safeReturnPath(path: string | null) { return path && returns.has(path) ? path : '/workspace' }

/** UI-independent state machine. Each request is fenced when a dialog closes or changes method. */
export class SignInFlow {
  private state: SignInState = { ...initialSignIn }
  private generation = 0
  constructor(private auth: AuthGateway, private changed: (state: SignInState) => void, private now = () => Date.now()) {}
  get snapshot() { return this.state }
  private set(patch: Partial<SignInState>) { this.state = { ...this.state, ...patch }; this.changed(this.state) }
  reset() { this.generation++; this.state = { ...initialSignIn }; this.changed(this.state) }
  changeEmail() { this.generation++; this.set({ step: 'email', busy: false, error: '' }) }
  async send(email: string) {
    if (this.state.busy || this.now() < this.state.resendAt) return
    const clean = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) { this.set({ error: 'Enter a valid email address.' }); return }
    const generation = ++this.generation
    this.set({ email: clean, busy: true, error: '' })
    try {
      const { error } = await this.auth.signInWithOtp({ email: clean, options: { shouldCreateUser: true } })
      if (generation !== this.generation) return
      if (error) { if (error.status !== 429) console.error('Email delivery failed', { code: error.code ?? 'unknown', status: error.status }); this.set({ error: authMessage(error, 'send') }); return }
      this.set({ step: 'code', resendAt: this.now() + 60000 })
    } catch (error) { if (generation === this.generation) this.set({ error: authMessage(error instanceof Error ? error : { name: 'TypeError' }, 'send') }) }
    finally { if (generation === this.generation) this.set({ busy: false }) }
  }
  async verify(token: string) {
    if (this.state.busy || this.state.step !== 'code' || !/^\d{6}$/.test(token)) return
    const generation = ++this.generation
    this.set({ busy: true, error: '' })
    try {
      const { error } = await this.auth.verifyOtp({ email: this.state.email, token, type: 'email' })
      if (generation !== this.generation) return
      this.set(error ? { error: authMessage(error, 'verify') } : { step: 'done' })
    } catch (error) { if (generation === this.generation) this.set({ error: authMessage(error instanceof Error ? error : { name: 'TypeError' }, 'verify') }) }
    finally { if (generation === this.generation) this.set({ busy: false }) }
  }
  async google(redirectTo: string) {
    if (this.state.busy) return
    const generation = ++this.generation
    this.set({ busy: true, error: '' })
    try { const { error } = await this.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } }); if (generation === this.generation && error) this.set({ error: authMessage(error, 'google') }) }
    catch (error) { if (generation === this.generation) this.set({ error: authMessage(error instanceof Error ? error : { name: 'TypeError' }, 'google') }) }
    finally { if (generation === this.generation) this.set({ busy: false }) }
  }
}
