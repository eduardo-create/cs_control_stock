import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { login } = useAuth();

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${import.meta.env.VITE_API_BASE}/api/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, password })
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.message || `Error ${r.status}`);
      }
      const res = await r.json();
      if (!res.token || !res.user) throw new Error('Respuesta de login inválida');
      login(res.token, res.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen w-full bg-slate-950 grid place-items-center px-4 sm:px-6 py-12">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800" aria-hidden="true" />
      <div className="relative z-10 w-full max-w-md mx-auto bg-slate-900/85 backdrop-blur-lg border border-slate-800 shadow-2xl rounded-2xl p-8 sm:p-10 text-white" style={{ maxWidth: 440 }}>
        <div className="text-center">
          <p className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-900/40 text-slate-200 text-xl font-bold">CS</p>
          <h1 className="mt-4 text-2xl font-bold">Inicia sesión</h1>
          <p className="mt-1 text-sm text-slate-300">Accede con tu usuario para continuar.</p>
        </div>

        <form className="mt-8 space-y-4 max-w-sm mx-auto text-white" style={{ maxWidth: 360 }} onSubmit={submit}>
          <div>
            <label className="block text-sm font-semibold text-white">Usuario</label>
            <input
              value={usuario}
              onChange={e => setUsuario(e.target.value)}
              type="text"
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-3 text-white shadow-sm placeholder:text-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-white">Contraseña</label>
              <span className="text-xs font-semibold text-sky-300">¿Olvidaste?</span>
            </div>
            <input
              value={password}
              onChange={e => setPassword(e.target.value)}
              type="password"
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-3 text-white shadow-sm placeholder:text-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-slate-900 text-white font-semibold py-3 shadow-lg shadow-slate-900/30 transition hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
          {error && (
            <div className="text-sm font-semibold text-red-200 bg-red-900/30 border border-red-800 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
