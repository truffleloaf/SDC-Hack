/**
 * Drop-in client for the Pivott sign-in bridge (way B in docs/auth.md).
 *
 * Copy this example into the frontend (for example `lib/auth-client.ts`) when the
 * sign-in UI is ready but adding @supabase/supabase-js is not. It uses the
 * backend's /api/auth/* and /api/me/profile endpoints; the access token never
 * needs to be built by hand.
 *
 * For way A (browser talks to Supabase directly), use supabase-js instead and
 * only call `me` / profile helpers with the session's access token.
 */

export type AuthUser = {
  id: string;
  email: string | null;
  role: string;
  provider: string | null;
  emailConfirmed: boolean | null;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: AuthUser;
};

export type SignUpResult = {
  needsEmailConfirmation: boolean;
  user: AuthUser;
  session: AuthSession | null;
};

export type SavedProfile = {
  userId: string;
  email: string | null;
  name: string;
  roleId: string;
  completedSteps: string[];
  customTasks: Record<string, unknown>[];
  customSignals: Record<string, unknown>[];
  storage: "server";
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
};

export type ProfilePayload = {
  roleId: string;
  selections: { taskId: string; share: number }[];
  skills: Record<string, number>;
  scenario: "normal" | "fast";
  hoursPerWeek: number;
  freeOnly: boolean;
  targetRoleId?: string | null;
  name?: string;
  completedSteps?: string[];
  customTasks?: Record<string, unknown>[];
  customSignals?: Record<string, unknown>[];
};

export class AuthError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

type Options = {
  apiBase?: string;
  storage?: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null;
};

const STORAGE_KEY = "pivott:auth:v1";

function defaultStorage(): Pick<Storage, "getItem" | "setItem" | "removeItem"> | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function createPivottAuth(options: Options = {}) {
  const apiBase = (options.apiBase ?? "http://127.0.0.1:8000").replace(/\/+$/, "");
  const storage = options.storage === undefined ? defaultStorage() : options.storage;

  let tokens: { accessToken: string; refreshToken: string } | null = null;

  // Restore a previous session so a refresh keeps the user signed in.
  if (storage) {
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (raw) tokens = JSON.parse(raw);
    } catch {
      tokens = null;
    }
  }

  function setTokens(session: AuthSession | null) {
    tokens = session
      ? { accessToken: session.accessToken, refreshToken: session.refreshToken }
      : null;
    if (!storage) return;
    if (tokens) storage.setItem(STORAGE_KEY, JSON.stringify(tokens));
    else storage.removeItem(STORAGE_KEY);
  }

  async function request<T>(
    path: string,
    init: RequestInit = {},
    { auth = true }: { auth?: boolean } = {},
  ): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    if (init.body) headers.set("Content-Type", "application/json");
    if (auth && tokens?.accessToken) {
      headers.set("Authorization", `Bearer ${tokens.accessToken}`);
    }

    const response = await fetch(`${apiBase}${path}`, { ...init, headers });
    if (response.status === 204) return undefined as T;

    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    if (!response.ok) {
      const message =
        body && typeof body === "object" && "error" in body
          ? String((body as { error: unknown }).error)
          : `Request failed (${response.status})`;
      throw new AuthError(response.status, message);
    }
    return body as T;
  }

  function applySession(session: AuthSession): AuthSession {
    setTokens(session);
    return session;
  }

  async function signIn(email: string, password: string): Promise<AuthSession> {
    const session = await request<AuthSession>("/api/auth/signin", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }, { auth: false });
    return applySession(session);
  }

  async function signUp(email: string, password: string): Promise<SignUpResult> {
    const result = await request<SignUpResult>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }, { auth: false });
    if (result.session) applySession(result.session);
    return result;
  }

  async function refresh(): Promise<AuthSession> {
    if (!tokens?.refreshToken) throw new AuthError(401, "No refresh token");
    const session = await request<AuthSession>("/api/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    }, { auth: false });
    return applySession(session);
  }

  async function signOut(): Promise<void> {
    try {
      await request("/api/auth/signout", {
        method: "POST",
        headers: tokens?.accessToken
          ? { Authorization: `Bearer ${tokens.accessToken}` }
          : undefined,
      }, { auth: false });
    } finally {
      setTokens(null);
    }
  }

  async function forgotPassword(email: string): Promise<void> {
    await request("/api/auth/password/reset", {
      method: "POST",
      body: JSON.stringify({ email }),
    }, { auth: false });
  }

  async function me(): Promise<AuthUser> {
    return request<AuthUser>("/api/auth/me");
  }

  async function getProfile(): Promise<SavedProfile | null> {
    try {
      return await request<SavedProfile>("/api/me/profile");
    } catch (error) {
      if (error instanceof AuthError && error.status === 404) return null;
      throw error;
    }
  }

  async function saveProfile(profile: ProfilePayload): Promise<SavedProfile> {
    return request<SavedProfile>("/api/me/profile", {
      method: "PUT",
      body: JSON.stringify(profile),
    });
  }

  async function deleteProfile(): Promise<boolean> {
    const result = await request<{ deleted: boolean }>("/api/me/profile", {
      method: "DELETE",
    });
    return result.deleted;
  }

  return {
    get accessToken() {
      return tokens?.accessToken ?? null;
    },
    signIn,
    signUp,
    refresh,
    signOut,
    forgotPassword,
    me,
    getProfile,
    saveProfile,
    deleteProfile,
  };
}
