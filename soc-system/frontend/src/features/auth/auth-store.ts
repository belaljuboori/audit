import { create } from 'zustand';
import { apiClient, AuthenticatedUser } from '../../shared/api/api-client';

interface AuthState {
  user: AuthenticatedUser | null;
  accessToken: string | null;
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated';
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  tryRestoreSession: () => Promise<void>;
}

/**
 * Access tokens live only in memory (this store), never in localStorage —
 * a page reload relies on the HttpOnly refresh cookie to mint a new one via
 * /auth/refresh, so an XSS payload that can read JS state still cannot
 * exfiltrate a token that survives past the current tab's lifetime.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  status: 'idle',
  error: null,

  async login(username, password) {
    set({ status: 'loading', error: null });
    try {
      const { accessToken, user } = await apiClient.login(username, password);
      set({ accessToken, user, status: 'authenticated', error: null });
    } catch (err) {
      set({ status: 'unauthenticated', error: (err as Error).message });
      throw err;
    }
  },

  async logout() {
    await apiClient.logout().catch(() => undefined);
    set({ user: null, accessToken: null, status: 'unauthenticated' });
  },

  async tryRestoreSession() {
    set({ status: 'loading' });
    try {
      const { accessToken, user } = await apiClient.refresh();
      set({ accessToken, user, status: 'authenticated' });
    } catch {
      set({ user: null, accessToken: null, status: 'unauthenticated' });
    }
  },
}));
