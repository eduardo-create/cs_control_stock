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

const emptyForm = { nombre: '', orden: 0, estado: true };

export default function CategoriesManager({ onChange }) {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    load();
  }, [token]);

  async function load() {
    setLoading(true);
    try {
      const res = await authFetch('/api/categorias', {}, token);
      if (!res.ok) throw new Error('No se pudieron cargar categorías');
      const data = await res.json();
      if (Array.isArray(data)) setItems(data);
    } catch (e) {
      toast.error(e.message || 'Error al cargar categorías');
    } finally {
      setLoading(false);
    }
  }

  function validar(values) {
    if (!values.nombre.trim()) return 'Nombre requerido';
    const ordenNum = Number(values.orden);
    if (Number.isNaN(ordenNum) || ordenNum < 0) return 'Orden inválido';
    return null;
  }

  async function submitCreate(e) {
    e.preventDefault();
    const msg = validar(form);
    if (msg) return toast.error(msg);
    try {
      setSaving(true);
      const res = await authFetch('/api/categorias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: form.nombre, orden: Number(form.orden) })
      }, token);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Error ${res.status}`);
      }
      toast.success('Categoría creada');
      setForm({ ...emptyForm });
      load();
      onChange && onChange();
    } catch (e) {
      toast.error(e.message || 'No se pudo crear');
    } finally {
      setSaving(false);
    }
  }

  function abrirEdicion(item) {
    setEditItem(item);
    setEditForm({ nombre: item.nombre, orden: item.orden ?? 0, estado: item.estado });
  }

  async function submitEdit(e) {
    e.preventDefault();
    if (!editItem) return;
    const msg = validar(editForm);
    if (msg) return toast.error(msg);
    try {
      setSaving(true);
      const res = await authFetch(`/api/categorias/${editItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: editForm.nombre,
          orden: Number(editForm.orden),
          estado: Boolean(editForm.estado)
        })
      }, token);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Error ${res.status}`);
      }
      toast.success('Categoría actualizada');
      setEditItem(null);
      setEditForm({ ...emptyForm });
      load();
      onChange && onChange();
    } catch (e) {
      toast.error(e.message || 'No se pudo actualizar');
    } finally {
      setSaving(false);
    }
  }

  async function eliminar(id) {
    if (!window.confirm('¿Eliminar categoría?')) return;
    try {
      const res = await authFetch(`/api/categorias/${id}`, { method: 'DELETE' }, token);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Error ${res.status}`);
      }
      toast.success('Categoría eliminada');
      load();
      onChange && onChange();
    } catch (e) {
      toast.error(e.message || 'No se pudo eliminar');
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">Categorías</p>
      </div>

      <form className="grid gap-3 sm:grid-cols-[2fr_1fr_auto] items-end" onSubmit={submitCreate}>
        <label className="text-sm font-semibold text-slate-700 space-y-1">
          <span className="block">Nombre</span>
          <input
            type="text"
            placeholder="Nombre"
            value={form.nombre}
            onChange={e => setForm(prev => ({ ...prev, nombre: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
          />
        </label>
        <label className="text-sm font-semibold text-slate-700 space-y-1">
          <span className="block">Orden</span>
          <input
            type="number"
            min="0"
            placeholder="0"
            value={form.orden}
            onChange={e => setForm(prev => ({ ...prev, orden: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white font-semibold px-4 py-2.5 text-sm shadow shadow-slate-900/20 transition hover:bg-slate-800 disabled:opacity-60"
        >
          <FiPlus className="text-base" />
          {saving ? 'Guardando...' : 'Crear'}
        </button>
      </form>

      <div className="space-y-3">
        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map(n => (
              <Skeleton key={n} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        )}
        {!loading && items.map(item => (
          <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white shadow-sm px-4 py-3">
            <div>
              <div className="text-base font-semibold text-slate-900">{item.nombre}</div>
              <div className="text-sm text-slate-600">Orden {item.orden ?? 0} · {item.estado ? 'Activa' : 'Inactiva'}</div>
            </div>
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
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                onClick={() => eliminar(item.id)}
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
        {!loading && items.length === 0 && <p className="text-sm text-slate-500">No hay categorías</p>}
      </div>

      {editItem && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Editar categoría</h3>
              <button
                type="button"
                className="text-sm font-semibold text-slate-500 hover:text-slate-700"
                onClick={() => { setEditItem(null); setEditForm({ ...emptyForm }); }}
              >
                Cerrar
              </button>
            </div>
            <form className="space-y-3" onSubmit={submitEdit}>
              <label className="text-sm font-semibold text-slate-700 space-y-1">
                <span className="block">Nombre</span>
                <input
                  type="text"
                  placeholder="Nombre"
                  value={editForm.nombre}
                  onChange={e => setEditForm(prev => ({ ...prev, nombre: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700 space-y-1">
                <span className="block">Orden</span>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={editForm.orden}
                  onChange={e => setEditForm(prev => ({ ...prev, orden: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                />
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300"
                  checked={!!editForm.estado}
                  onChange={e => setEditForm(prev => ({ ...prev, estado: e.target.checked }))}
                />
                <span>Activa</span>
              </label>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                  onClick={() => { setEditItem(null); setEditForm({ ...emptyForm }); }}
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
