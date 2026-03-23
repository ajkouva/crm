import { createContext, useContext, useState, useEffect } from 'react';
import { api, setToken, clearToken } from '../utils/api';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem('pscrm_token');
    if (t) api.me().then(setUser).catch(() => clearToken()).finally(() => setLoading(false));
    else setLoading(false);
  }, []);

  const login = async (email, password) => {
    const data = await api.login({ email, password });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (body) => {
    return await api.register(body);
  };

  const logout = () => { clearToken(); setUser(null); };

  return <AuthCtx.Provider value={{ user, loading, login, register, logout }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
