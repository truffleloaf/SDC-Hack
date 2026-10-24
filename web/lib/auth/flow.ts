export type AuthProblem = { code?: string; status?: number; message?: string; name?: string }
interface AuthReply { error: AuthProblem | null }
export interface AuthGateway {
  signInWithOtp: (input: { email: string; options: { shouldCreateUser: true } }) => Promise<AuthReply>
  verifyOtp: (input: { email: string; token: string; type: 'email' }) => Promise<AuthReply & { data?: { session?: unknown } }>
  signInWithOAuth: (input: { provider: 'google'; options: { redirectTo: string } }) => Promise<AuthReply>
  signInWithPassword: (input: { email: string; password: string }) => Promise<AuthReply & { data?: { session?: unknown } }>
  signUp: (input: { email: string; password: string; options: { emailRedirectTo: string } }) => Promise<AuthReply & { data?: { session?: unknown; user?: unknown } }>
  resetPasswordForEmail: (email: string, options: { redirectTo: string }) => Promise<AuthReply>
  updateUser: (input: { password: string }) => Promise<AuthReply>
}
export interface SignInState { step: 'email' | 'code' | 'done'; email: string; busy: boolean; error: string; notice: string; resendAt: number }
export const initialSignIn: SignInState = { step: 'email', email: '', busy: false, error: '', notice: '', resendAt: 0 }
export function authMessage(problem: AuthProblem, action: 'send' | 'verify' | 'google' | 'password' | 'reset' | 'update') {
  if (problem.status === 429 || /rate_limit|too_many/.test(problem.code ?? '')) return 'Too many attempts. Try again in a minute.'
  if (['AbortError', 'TypeError', 'AuthRetryableFetchError'].includes(problem.name ?? '') || problem.status === 0) return 'No connection. Your work is still saved on this device.'
  if (action === 'verify') {
    if ((problem.code === 'otp_expired' || /expired/i.test(problem.message ?? '')) && /invalid/i.test(problem.message ?? '')) return "That code isn't right or has expired. Check the newest email, or resend."
    if (problem.code === 'otp_expired' || /expired/i.test(problem.message ?? '')) return 'That code expired. Request a new one.'
    return "That code isn't right. Check the newest email, or resend."
  }
  if (action === 'password') return 'The email or password is incorrect. Check both and try again.'
  if (action === 'reset') return "We couldn't send a reset email right now. Wait a minute and try again."
  if (action === 'update') return "We couldn't save the new password. Request another reset email and try again."
  return action === 'google' ? 'Google sign-in could not start. Try an email code, or continue without an account.' : "We couldn't send email right now. Try Google, or continue without an account."
}
export function maskedEmail(email: string) { const [name, domain] = email.split('@'); return `${name?.slice(0, 1) || '*'}***@${domain || ''}` }
const returns = new Set(['/', '/workspace', '/account', '/start', '/map', '/skills', '/routes', '/pathway', '/passport', '/signals', '/method', '/jobs'])
export function safeReturnPath(path: string | null) { return path && returns.has(path) ? path : '/workspace' }

/** UI-independent state machine. Each request is fenced when a dialog closes or changes method. */
export class SignInFlow {
  private state: SignInState = { ...initialSignIn }
  private generation = 0
  private resendTimes = new Map<string, number>()
  constructor(private auth: AuthGateway, private changed: (state: SignInState) => void, private now = () => Date.now()) {}
  get snapshot() { return this.state }
  private set(patch: Partial<SignInState>) { this.state = { ...this.state, ...patch }; this.changed(this.state) }
  reset() { this.generation++; this.state = { ...initialSignIn }; this.changed(this.state) }
  changeEmail() { this.generation++; this.set({ step: 'email', busy: false, error: '', resendAt: 0 }) }
  async send(email: string) {
    if (this.state.busy) return
    const clean = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) { this.set({ error: 'Enter a valid email address.' }); return }
    const deadline = this.resendTimes.get(clean) ?? 0
    if (this.now() < deadline) { this.set({ resendAt: deadline }); return }
    const generation = ++this.generation
    this.set({ email: clean, busy: true, error: '', notice: '' })
    try {
      const { error } = await this.auth.signInWithOtp({ email: clean, options: { shouldCreateUser: true } })
      if (generation !== this.generation) return
      if (error) { if (error.status !== 429) console.error('Email delivery failed', { code: error.code ?? 'unknown', status: error.status }); this.set({ error: authMessage(error, 'send') }); return }
      const resendAt = this.now() + 60000
      this.resendTimes.set(clean, resendAt)
      this.set({ step: 'code', resendAt })
    } catch (error) { if (generation === this.generation) this.set({ error: authMessage(error instanceof Error ? error : { name: 'TypeError' }, 'send') }) }
    finally { if (generation === this.generation) this.set({ busy: false }) }
  }
  async verify(token: string) {
    if (this.state.busy || this.state.step !== 'code' || !/^\d{6}$/.test(token)) return
    const generation = ++this.generation
    this.set({ busy: true, error: '', notice: '' })
    try {
      const { error, data } = await this.auth.verifyOtp({ email: this.state.email, token, type: 'email' })
      if (generation !== this.generation) return
      this.set(error ? { error: authMessage(error, 'verify') } : data?.session ? { step: 'done' } : { error: 'Sign-in did not complete. Request a new code and try again.' })
    } catch (error) { if (generation === this.generation) this.set({ error: authMessage(error instanceof Error ? error : { name: 'TypeError' }, 'verify') }) }
    finally { if (generation === this.generation) this.set({ busy: false }) }
  }
  async google(redirectTo: string) {
    if (this.state.busy) return
    const generation = ++this.generation
    this.set({ busy: true, error: '', notice: '' })
    try { const { error } = await this.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } }); if (generation === this.generation && error) this.set({ error: authMessage(error, 'google') }) }
    catch (error) { if (generation === this.generation) this.set({ error: authMessage(error instanceof Error ? error : { name: 'TypeError' }, 'google') }) }
    finally { if (generation === this.generation) this.set({ busy: false }) }
  }
  async password(email: string, password: string, create: boolean, redirectTo: string) {
    if (this.state.busy) return
    const clean = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean) || clean.length > 254) { this.set({ error: 'Enter a valid email address.' }); return }
    if (password.length < 8 || password.length > 72) { this.set({ error: 'Use a password between 8 and 72 characters.' }); return }
    const generation = ++this.generation
    this.set({ email: clean, busy: true, error: '', notice: '' })
    try {
      const reply = create
        ? await this.auth.signUp({ email: clean, password, options: { emailRedirectTo: redirectTo } })
        : await this.auth.signInWithPassword({ email: clean, password })
      if (generation !== this.generation) return
      if (reply.error) { this.set({ error: authMessage(reply.error, 'password') }); return }
      if (reply.data?.session) this.set({ step: 'done' })
      else if (create && reply.data && 'user' in reply.data && reply.data.user) this.set({ notice: 'Account created. Check your email to confirm it, then sign in with your password.' })
      else this.set({ error: 'Sign-in did not complete. Check your email and password, then try again.' })
    } catch (error) { if (generation === this.generation) this.set({ error: authMessage(error instanceof Error ? error : { name: 'TypeError' }, 'password') }) }
    finally { if (generation === this.generation) this.set({ busy: false }) }
  }
  async resetPassword(email: string, redirectTo: string) {
    if (this.state.busy) return
    const clean = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean) || clean.length > 254) { this.set({ error: 'Enter a valid email address.' }); return }
    const generation = ++this.generation
    this.set({ email: clean, busy: true, error: '', notice: '' })
    try {
      const { error } = await this.auth.resetPasswordForEmail(clean, { redirectTo })
      if (generation !== this.generation) return
      this.set(error ? { error: authMessage(error, 'reset') } : { notice: 'If an account uses that address, a password reset email is on its way.' })
    } catch (error) { if (generation === this.generation) this.set({ error: authMessage(error instanceof Error ? error : { name: 'TypeError' }, 'reset') }) }
    finally { if (generation === this.generation) this.set({ busy: false }) }
  }
  async updatePassword(password: string) {
    if (this.state.busy) return
    if (password.length < 8 || password.length > 72) { this.set({ error: 'Use a password between 8 and 72 characters.' }); return }
    const generation = ++this.generation
    this.set({ busy: true, error: '', notice: '' })
    try {
      const { error } = await this.auth.updateUser({ password })
      if (generation !== this.generation) return
      this.set(error ? { error: authMessage(error, 'update') } : { step: 'done' })
    } catch (error) { if (generation === this.generation) this.set({ error: authMessage(error instanceof Error ? error : { name: 'TypeError' }, 'update') }) }
    finally { if (generation === this.generation) this.set({ busy: false }) }
  }
}
