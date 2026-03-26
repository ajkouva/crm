import { create } from 'zustand';
import { api, setToken, clearToken } from '../utils/api';

/**
 * Global Auth Store (Zustand)
 * Replaces the legacy AuthContext. Use `useAuthStore` in any component
 * instead of the old `useAuth()` hook.
 */
const useAuthStore = create((set) => ({
  user: null,
  loading: true,

  // Bootstrap: call once on app start to hydrate from localStorage token
  bootstrap: async () => {
    const token = localStorage.getItem('pscrm_token');
    if (!token) {
      set({ loading: false });
      return;
    }
    try {
      const user = await api.me();
      set({ user, loading: false });
    } catch {
      clearToken();
      set({ user: null, loading: false });
    }
  },

  login: async (email, password) => {
    const data = await api.login({ email, password });
    setToken(data.token);
    set({ user: data.user });
    return data.user;
  },

  register: async (body) => {
    return await api.register(body);
  },

  logout: () => {
    clearToken();
    set({ user: null });
  },
}));

export default useAuthStore;


