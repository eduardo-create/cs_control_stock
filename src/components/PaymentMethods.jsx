import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Skeleton from './Skeleton';
import { FiPlus } from 'react-icons/fi';

function authFetch(path, opts = {}, token) {
  const headers = Object.assign({}, opts.headers || {});
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(path, Object.assign({}, opts, { headers, credentials: 'include' }));
}

export default function PaymentMethods() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ nombre: '' }); // crear
  const [editItem, setEditItem] = useState(null);   // item en edición
  const [editForm, setEditForm] = useState({ nombre: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, [token]);

  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      const res = await authFetch('/api/metodos-pago', {}, token);
      if (!res.ok) throw new Error('No se pudieron cargar métodos de pago');
      const data = await res.json();
      if (Array.isArray(data)) setItems(data);
    } catch (e) {
      toast.error(e.message || 'Error cargando métodos');
    } finally {
      setLoading(false);
    }
  }

  async function submitCreate(e) {
    e.preventDefault();
    if (!form.nombre.trim()) {
      toast.error('Nombre requerido');
      return;
    }
    try {
      const res = await authFetch('/api/metodos-pago', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: form.nombre })
      }, token);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Error ${res.status}`);
      }
      toast.success('Método creado');
      setForm({ nombre: '' });
      load();
    } catch (e) {
      toast.error(e.message || 'No se pudo guardar');
    }
  }

  function abrirEdicion(item) {
    setEditItem(item);
    setEditForm({ nombre: item.nombre });
  }

  async function submitEdit(e) {
    e.preventDefault();
    if (!editItem) return;
    if (!editForm.nombre.trim()) {
      toast.error('Nombre requerido');
      return;
    }
    try {
      setSaving(true);
      const res = await authFetch(`/api/metodos-pago/${editItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: editForm.nombre })
      }, token);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Error ${res.status}`);
      }
      toast.success('Método actualizado');
      setEditItem(null);
      setEditForm({ nombre: '' });
      load();
    } catch (e) {
      toast.error(e.message || 'No se pudo actualizar');
    } finally {
      setSaving(false);
    }
  }

  async function eliminar(id) {
    if (!window.confirm('¿Eliminar método de pago?')) return;
    try {
      const res = await authFetch(`/api/metodos-pago/${id}`, { method: 'DELETE' }, token);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Error ${res.status}`);
      }
      toast.success('Método eliminado');
      load();
    } catch (e) {
      toast.error(e.message || 'No se pudo eliminar');
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">Métodos de pago</p>
      </div>

      <form className="flex flex-wrap items-end gap-3" onSubmit={submitCreate}>
        <label className="flex-1 min-w-[220px] text-sm font-semibold text-slate-700 space-y-1">
          <span className="block">Nombre del método</span>
          <input
            type="text"
            placeholder="Nombre del método"
            value={form.nombre}
            onChange={e => setForm({ nombre: e.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white font-semibold px-4 py-2.5 text-sm shadow shadow-slate-900/20 transition hover:bg-slate-800 disabled:opacity-60"
        >
          <FiPlus className="text-base" />
          {loading ? 'Guardando...' : 'Crear'}
        </button>
      </form>

      <div className="space-y-3">
        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map(n => (
              <Skeleton key={n} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        )}
        {!loading && items.map(item => (
          <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white shadow-sm px-4 py-3">
            <div className="text-base font-semibold text-slate-900">{item.nombre}</div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => abrirEdicion(item)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => eliminar(item.id)}
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
        {!loading && items.length === 0 && <p className="text-sm text-slate-500">No hay métodos de pago</p>}
      </div>

      {editItem && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Editar método de pago</h3>
              <button
                type="button"
                className="text-sm font-semibold text-slate-500 hover:text-slate-700"
                onClick={() => { setEditItem(null); setEditForm({ nombre: '' }); }}
              >
                Cerrar
              </button>
            </div>
            <form className="space-y-3" onSubmit={submitEdit}>
              <label className="text-sm font-semibold text-slate-700 space-y-1">
                <span className="block">Nombre</span>
                <input
                  type="text"
                  value={editForm.nombre}
                  onChange={e => setEditForm({ nombre: e.target.value })}
                  placeholder="Nombre"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                />
              </label>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                  onClick={() => { setEditItem(null); setEditForm({ nombre: '' }); }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-slate-900 text-white font-semibold px-4 py-2.5 shadow shadow-slate-900/20 hover:bg-slate-800 disabled:opacity-60"
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
