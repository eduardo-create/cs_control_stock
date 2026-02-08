import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FiPlus } from 'react-icons/fi';

const fallbackRoles = [
  { slug: 'admin', nombre: 'admin' },
  { slug: 'caja', nombre: 'caja' },
  { slug: 'cajero', nombre: 'cajero' },
  { slug: 'vendedor', nombre: 'vendedor' },
  { slug: 'encargado', nombre: 'encargado' },
  { slug: 'consulta', nombre: 'consulta' }
];

export default function AdminUserForm({ onCreated, roles = [] }) {
  const { token, user } = useAuth();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [rol, setRol] = useState('caja');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const roleOptions = useMemo(() => (roles.length ? roles : fallbackRoles), [roles]);

  useEffect(() => {
    if (roleOptions.length === 0) return;
    if (!roleOptions.some(r => r.slug === rol)) {
      setRol(roleOptions[0].slug);
    }
  }, [roleOptions, rol]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const API_BASE = import.meta.env.VITE_API_BASE || '';
      const res = await fetch(`${API_BASE}/api/negocios/usuarios-operativos`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          negocio_id: user.negocio_id,
          email,
          rol,
          password,
          nombre
        })
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Error al crear usuario');
      setNombre(''); setEmail(''); setRol(roleOptions[0]?.slug || 'caja'); setPassword('');
      if (onCreated) onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="rounded-2xl border border-slate-200 bg-white shadow p-5 space-y-4" onSubmit={handleSubmit}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">Nuevo usuario</p>
          <span className="text-sm text-slate-500">Completa los datos y asigna rol</span>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700 space-y-1">
          <span className="block">Nombre de usuario</span>
          <input
            value={nombre}
            onChange={e=>setNombre(e.target.value)}
            required
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
          />
        </label>
        <label className="text-sm font-semibold text-slate-700 space-y-1">
          <span className="block">Email</span>
          <input
            type="email"
            value={email}
            onChange={e=>setEmail(e.target.value)}
            required
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
          />
        </label>
        <label className="text-sm font-semibold text-slate-700 space-y-1">
          <span className="block">Rol</span>
          <select
            value={rol}
            onChange={e=>setRol(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
          >
            {roleOptions.map(role => (
              <option key={role.slug} value={role.slug}>{role.nombre || role.slug}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-700 space-y-1">
          <span className="block">Contraseña</span>
          <input
            type="password"
            value={password}
            onChange={e=>setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
          />
        </label>
      </div>
      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white font-semibold px-4 py-2.5 text-sm shadow shadow-slate-900/20 transition hover:bg-slate-800 disabled:opacity-60"
        >
          <FiPlus className="text-base" />
          {loading ? 'Creando...' : 'Crear usuario'}
        </button>
        {error && <span className="text-sm font-semibold text-red-600">{error}</span>}
      </div>
    </form>
  );
}
