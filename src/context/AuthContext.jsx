import React, { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } else {
        // Limpia storage inconsistente para forzar login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    } catch (e) {
      console.warn('No se pudo leer auth del storage', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = (tok, usr) => {
    setToken(tok);
    setUser(usr || null);
    if (tok) localStorage.setItem('token', tok); else localStorage.removeItem('token');
    if (usr) localStorage.setItem('user', JSON.stringify(usr)); else localStorage.removeItem('user');
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const value = { token, user, loading, login, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
