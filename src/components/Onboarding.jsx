import React, { useEffect, useState } from 'react';

export default function Onboarding() {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [onboardingPublic, setOnboardingPublic] = useState(false);
  const API_BASE = import.meta.env.VITE_API_BASE || '';

  useEffect(() => {
    fetch(API_BASE + '/api/negocios')
      .then(res => {
        if (res.status === 403) setOnboardingPublic(true);
        else setOnboardingPublic(false);
      })
      .catch(() => setOnboardingPublic(true));
  }, [API_BASE]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      // 1. Crear negocio
      const negocioRes = await fetch(API_BASE + '/api/negocios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre })
      });
      if (!negocioRes.ok) throw new Error('Error creando negocio');
      const negocio = await negocioRes.json();
      // 2. Asignar admin
      const adminRes = await fetch(API_BASE + '/api/negocios/asignar-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ negocio_id: negocio.negocio.id, email, password })
      });
      if (!adminRes.ok) throw new Error('Error creando usuario admin');
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-6 bg-slate-900/80 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="space-y-1 text-center">
          <p className="text-xs uppercase tracking-tight text-slate-400 font-semibold">Onboarding</p>
          <h2 className="text-2xl font-bold">Registro de nuevo negocio</h2>
          <p className="text-sm text-slate-300">Crea tu negocio y el usuario administrador inicial.</p>
        </div>

        {onboardingPublic && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-900 px-4 py-3 text-sm font-semibold">
            AVISO: El registro público de negocios está habilitado (modo onboarding/demo). Recuerda desactivarlo en producción.
          </div>
        )}

        {success ? (
          <div className="rounded-xl border border-green-200 bg-green-50 text-green-800 px-4 py-3 text-sm font-semibold text-center">
            ¡Negocio y usuario admin creados! Revisa tu email para acceder.
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="text-sm font-semibold text-slate-200 space-y-1">
              <span className="block">Nombre del negocio</span>
              <input
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-3 text-sm text-white shadow-sm placeholder:text-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
              />
            </label>
            <label className="text-sm font-semibold text-slate-200 space-y-1">
              <span className="block">Email del administrador</span>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-3 text-sm text-white shadow-sm placeholder:text-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
              />
            </label>
            <label className="text-sm font-semibold text-slate-200 space-y-1">
              <span className="block">Contraseña</span>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-3 text-sm text-white shadow-sm placeholder:text-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-slate-900 text-white font-semibold py-3 shadow-lg shadow-slate-900/30 transition hover:bg-slate-800 disabled:opacity-60"
            >
              {loading ? 'Registrando...' : 'Registrar negocio'}
            </button>
            {error && <div className="rounded-xl border border-red-200 bg-red-50 text-red-800 px-3 py-2 text-sm font-semibold">{error}</div>}
          </form>
        )}
      </div>
    </div>
  );
}
