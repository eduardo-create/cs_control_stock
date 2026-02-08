import React, { useEffect, useMemo, useState } from 'react';
import { FiEdit2, FiPlus, FiRefreshCcw, FiTrash2, FiX } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { TableSkeleton } from './Skeleton';

function money(value) {
  const n = Number(value || 0);
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
}

function StatusBadge({ active }) {
  const cls = active ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200';
  return <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${cls}`}>{active ? 'Activo' : 'Inactivo'}</span>;
}

export default function AdminPlanes() {
  const { token } = useAuth();
  const [planes, setPlanes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ id: null, nombre: '', precio: '0', intervalo: 'monthly', descripcion: '', featuresText: '', activo: true });

  async function authFetch(url, options = {}) {
    const API_BASE = import.meta.env.VITE_API_BASE || '';
    if (url.startsWith('/api/')) url = API_BASE + url;
    const headers = { ...(options.headers || {}), Authorization: token ? `Bearer ${token}` : undefined };
    if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const res = await fetch(url, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = data.message || data.error || 'Error de red';
      throw new Error(message);
    }
    return data;
  }

  async function load() {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const data = await authFetch('/api/admin/plans');
      setPlanes(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los planes');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [token]);

  function openModal(plan = null) {
    if (plan) {
      setForm({
        id: plan.id,
        nombre: plan.nombre || '',
        precio: plan.precio ?? '0',
        intervalo: plan.intervalo || 'monthly',
        descripcion: plan.descripcion || '',
        featuresText: Array.isArray(plan.features) ? plan.features.join('\n') : '',
        activo: plan.activo !== false
      });
    } else {
      setForm({ id: null, nombre: '', precio: '0', intervalo: 'monthly', descripcion: '', featuresText: '', activo: true });
    }
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const features = form.featuresText
        .split('\n')
        .map(f => f.trim())
        .filter(Boolean);
      const payload = {
        nombre: form.nombre,
        precio: Number(form.precio || 0),
        intervalo: form.intervalo,
        descripcion: form.descripcion || null,
        features,
        activo: Boolean(form.activo)
      };
      let res;
      if (form.id) {
        res = await authFetch(`/api/admin/plans/${form.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        toast.success('Plan actualizado');
      } else {
        res = await authFetch('/api/admin/plans', { method: 'POST', body: JSON.stringify(payload) });
        toast.success('Plan creado');
      }
      const plan = res.plan || res;
      setPlanes(prev => {
        if (form.id) return prev.map(p => (p.id === form.id ? plan : p));
        return [plan, ...prev];
      });
      setModalOpen(false);
    } catch (err) {
      toast.error(err.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(planId) {
    if (!planId) return;
    const confirmDelete = window.confirm('¿Eliminar este plan?');
    if (!confirmDelete) return;
    setDeletingId(planId);
    try {
      await authFetch(`/api/admin/plans/${planId}`, { method: 'DELETE' });
      toast.success('Plan eliminado');
      setPlanes(prev => prev.filter(p => p.id !== planId));
    } catch (err) {
      toast.error(err.message || 'No se pudo eliminar');
    } finally {
      setDeletingId(null);
    }
  }

  const sorted = useMemo(() => [...planes].sort((a, b) => (b.id || 0) - (a.id || 0)), [planes]);

  return (
    <div className="max-w-6xl mx-auto space-y-5 text-slate-900">
      <div className="rounded-2xl border border-slate-200 bg-white shadow p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">SaaS</p>
          <h2 className="text-2xl font-bold">Planes</h2>
          <p className="text-sm text-slate-500">Gestiona los planes disponibles para negocios.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow hover:bg-slate-50 disabled:opacity-60"
          >
            {loading ? <FiRefreshCcw className="animate-spin" /> : <FiRefreshCcw />} Recargar
          </button>
          <button
            type="button"
            onClick={() => openModal(null)}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-3 py-2 text-sm font-semibold shadow"
          >
            <FiPlus /> Nuevo plan
          </button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-sm font-semibold">{error}</div>}

      <div className="rounded-2xl border border-slate-200 bg-white shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Nombre</th>
              <th className="px-4 py-3 text-left font-semibold">Precio</th>
              <th className="px-4 py-3 text-left font-semibold">Intervalo</th>
              <th className="px-4 py-3 text-left font-semibold">Estado</th>
              <th className="px-4 py-3 text-left font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan="5" className="px-4 py-4">
                  <TableSkeleton rows={3} columns={5} height={12} />
                </td>
              </tr>
            )}
            {!loading && sorted.length === 0 && (
              <tr>
                <td colSpan="5" className="px-4 py-4 text-center text-slate-500">Sin planes aún.</td>
              </tr>
            )}
            {!loading && sorted.map(plan => (
              <tr key={plan.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-900">{plan.nombre || 'Sin nombre'}</div>
                  <div className="text-xs text-slate-500">{plan.descripcion || '—'}</div>
                </td>
                <td className="px-4 py-3 text-slate-800 font-semibold">{money(plan.precio)}</td>
                <td className="px-4 py-3 text-slate-700">{plan.intervalo || 'monthly'}</td>
                <td className="px-4 py-3"><StatusBadge active={plan.activo !== false} /></td>
                <td className="px-4 py-3 space-x-2">
                  <button
                    type="button"
                    onClick={() => openModal(plan)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                  >
                    <FiEdit2 /> Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(plan.id)}
                    disabled={deletingId === plan.id}
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                  >
                    <FiTrash2 /> {deletingId === plan.id ? 'Eliminando...' : 'Eliminar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-xl rounded-2xl bg-white border border-slate-200 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">SaaS</p>
                <h3 className="text-xl font-bold">{form.id ? 'Editar plan' : 'Nuevo plan'}</h3>
              </div>
              <button className="text-slate-400 hover:text-slate-600" onClick={() => setModalOpen(false)} aria-label="Cerrar">
                <FiX />
              </button>
            </div>

            <form className="space-y-3" onSubmit={handleSave}>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-semibold text-slate-700 space-y-1">
                  <span>Nombre</span>
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                  />
                </label>
                <label className="text-sm font-semibold text-slate-700 space-y-1">
                  <span>Precio</span>
                  <input
                    type="number"
                    value={form.precio}
                    onChange={e => setForm(f => ({ ...f, precio: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-semibold text-slate-700 space-y-1">
                  <span>Intervalo</span>
                  <select
                    value={form.intervalo}
                    onChange={e => setForm(f => ({ ...f, intervalo: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                  >
                    <option value="monthly">Mensual</option>
                    <option value="yearly">Anual</option>
                  </select>
                </label>
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.activo}
                    onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-sky-600"
                  />
                  Activo
                </label>
              </div>

              <label className="text-sm font-semibold text-slate-700 space-y-1">
                <span>Descripción</span>
                <textarea
                  value={form.descripcion}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                  rows={2}
                />
              </label>

              <label className="text-sm font-semibold text-slate-700 space-y-1">
                <span>Features (una por línea)</span>
                <textarea
                  value={form.featuresText}
                  onChange={e => setForm(f => ({ ...f, featuresText: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                  rows={4}
                />
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-semibold shadow disabled:opacity-60"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
