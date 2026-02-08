import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FiPlus, FiSearch, FiEdit3, FiToggleLeft, FiToggleRight } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { TableSkeleton } from './Skeleton';

function authFetch(path, opts = {}, token) {
  const API_BASE = import.meta.env.VITE_API_BASE || '';
  if (path.startsWith('/api/')) path = API_BASE + path;
  const headers = { ...(opts.headers || {}), Authorization: token ? `Bearer ${token}` : undefined };
  if (opts.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  return fetch(path, Object.assign({}, opts, { headers, credentials: 'include' }));
}

export default function ConfigProveedores() {
  const { token } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [showOnlyActive, setShowOnlyActive] = useState(false);
  const [modal, setModal] = useState(null); // {mode: 'new'|'edit', data}

  const filtered = useMemo(() => {
    const q = filter.toLowerCase();
    return list.filter(p => {
      const matchText = !q || (p.nombre || '').toLowerCase().includes(q) || (p.cuit || '').toLowerCase().includes(q);
      const matchEstado = showOnlyActive ? p.estado !== false : true;
      return matchText && matchEstado;
    });
  }, [list, filter, showOnlyActive]);

  function load() {
    setLoading(true);
    authFetch('/api/proveedores', {}, token)
      .then(r => r.ok ? r.json() : [])
      .then(data => setList(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (token) load();
  }, [token]);

  function openNew() {
    setModal({ mode: 'new', data: { nombre: '', cuit: '', email: '', telefono: '', direccion: '', notas: '' } });
  }

  function openEdit(p) {
    setModal({ mode: 'edit', data: { ...p } });
  }

  async function save() {
    if (!modal) return;
    const { data, mode } = modal;
    if (!data.nombre || !data.nombre.trim()) {
      toast.error('Nombre es obligatorio');
      return;
    }

    const payload = {
      nombre: data.nombre.trim(),
      email: data.email || null,
      telefono: data.telefono || null,
      direccion: data.direccion || null,
      notas: data.notas || null,
    };
    if (mode === 'new') {
      payload.cuit = data.cuit || null;
    }

    try {
      const url = mode === 'edit' ? `/api/proveedores/${data.id}` : '/api/proveedores';
      const method = mode === 'edit' ? 'PUT' : 'POST';
      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }, token);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Error ${res.status}`);
      }
      toast.success(mode === 'edit' ? 'Proveedor actualizado' : 'Proveedor creado');
      setModal(null);
      load();
    } catch (e) {
      toast.error(e.message || 'Error al guardar proveedor');
    }
  }

  async function toggle(id) {
    try {
      const res = await authFetch(`/api/proveedores/${id}/toggle`, { method: 'PATCH' }, token);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Error ${res.status}`);
      }
      load();
    } catch (e) {
      toast.error(e.message || 'No se pudo actualizar estado');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">Proveedores</p>
          <h3 className="text-xl font-bold text-slate-900">Gestión de proveedores</h3>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold shadow shadow-slate-900/20 hover:bg-slate-800"
        >
          <FiPlus /> Nuevo proveedor
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <FiSearch className="text-slate-400" />
          <input
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Buscar por nombre o CUIT"
            className="w-full bg-transparent text-sm focus:outline-none"
          />
        </div>
        <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input type="checkbox" checked={showOnlyActive} onChange={e => setShowOnlyActive(e.target.checked)} />
          Solo activos
        </label>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow divide-y divide-slate-100">
        <div className="grid grid-cols-6 gap-3 px-4 py-3 text-xs font-semibold uppercase tracking-tight text-slate-500">
          <span className="col-span-2">Nombre</span>
          <span>CUIT</span>
          <span>Contacto</span>
          <span>Estado</span>
          <span className="text-right">Acciones</span>
        </div>
        <div className="divide-y divide-slate-100">
          {loading && (
            <div className="px-4 py-3">
              <TableSkeleton rows={4} columns={6} height={12} />
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="px-4 py-3 text-sm text-slate-500">Sin proveedores</div>
          )}
          {filtered.map(p => (
            <div key={p.id} className="grid grid-cols-6 gap-3 px-4 py-3 items-center text-sm text-slate-800">
              <div className="col-span-2 font-semibold">{p.nombre}</div>
              <div>{p.cuit || '—'}</div>
              <div className="text-slate-600 text-[13px] leading-snug">
                {p.email && <div>{p.email}</div>}
                {p.telefono && <div>{p.telefono}</div>}
              </div>
              <div>
                {p.estado !== false ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded-full">Activo</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-full">Inactivo</span>
                )}
              </div>
              <div className="flex justify-end items-center gap-2">
                <button
                  onClick={() => toggle(p.id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {p.estado !== false ? <FiToggleRight /> : <FiToggleLeft />} {p.estado !== false ? 'Desactivar' : 'Activar'}
                </button>
                <button
                  onClick={() => openEdit(p)}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-900 text-white px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-800"
                >
                  <FiEdit3 /> Editar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">{modal.mode === 'edit' ? 'Editar' : 'Nuevo'} proveedor</p>
                <h3 className="text-lg font-bold text-slate-900">{modal.mode === 'edit' ? modal.data.nombre : 'Crear proveedor'}</h3>
              </div>
              <button
                className="text-slate-400 hover:text-slate-600"
                onClick={() => setModal(null)}
                aria-label="Cerrar"
              >
                x
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-sm font-semibold text-slate-700 space-y-1">
                <span>Nombre *</span>
                <input
                  type="text"
                  value={modal.data.nombre || ''}
                  onChange={e => setModal(prev => ({ ...prev, data: { ...prev.data, nombre: e.target.value } }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700 space-y-1">
                <span>CUIT (opcional, único)</span>
                <input
                  type="text"
                  value={modal.data.cuit || ''}
                  onChange={e => setModal(prev => ({ ...prev, data: { ...prev.data, cuit: e.target.value } }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 disabled:bg-slate-100 disabled:text-slate-500"
                  disabled={modal.mode === 'edit'}
                />
              </label>
              <label className="text-sm font-semibold text-slate-700 space-y-1">
                <span>Email</span>
                <input
                  type="email"
                  value={modal.data.email || ''}
                  onChange={e => setModal(prev => ({ ...prev, data: { ...prev.data, email: e.target.value } }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700 space-y-1">
                <span>Teléfono</span>
                <input
                  type="text"
                  value={modal.data.telefono || ''}
                  onChange={e => setModal(prev => ({ ...prev, data: { ...prev.data, telefono: e.target.value } }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700 space-y-1 sm:col-span-2">
                <span>Dirección</span>
                <input
                  type="text"
                  value={modal.data.direccion || ''}
                  onChange={e => setModal(prev => ({ ...prev, data: { ...prev.data, direccion: e.target.value } }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700 space-y-1 sm:col-span-2">
                <span>Notas</span>
                <textarea
                  value={modal.data.notas || ''}
                  onChange={e => setModal(prev => ({ ...prev, data: { ...prev.data, notas: e.target.value } }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                  rows={3}
                />
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setModal(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={save}
                className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-semibold shadow shadow-slate-900/20 hover:bg-slate-800"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
