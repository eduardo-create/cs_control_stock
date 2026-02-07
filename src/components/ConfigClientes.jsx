import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FiPlus, FiSearch, FiEdit3, FiTrash2, FiToggleLeft, FiToggleRight } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { TableSkeleton } from './Skeleton';

function authFetch(path, opts = {}, token) {
  const headers = { ...(opts.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(path, { ...opts, headers, credentials: 'include' });
}

export default function ConfigClientes() {
  const { token, user } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [showOnlyActive, setShowOnlyActive] = useState(false);
  const [modal, setModal] = useState(null); // { mode: 'new' | 'edit', data }
  const [confirmDelete, setConfirmDelete] = useState(null); // cliente

  const filtered = useMemo(() => {
    const q = filter.toLowerCase();
    return list.filter(c => {
      const matchText = !q ||
        (c.nombre || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.dni || '').toLowerCase().includes(q);
      const matchEstado = showOnlyActive ? c.activo !== false : true;
      return matchText && matchEstado;
    });
  }, [list, filter, showOnlyActive]);

  function load() {
    setLoading(true);
    authFetch('/api/clientes', {}, token)
      .then(r => r.ok ? r.json() : [])
      .then(data => setList(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (token) load();
  }, [token]);

  function openNew() {
    setModal({
      mode: 'new',
      data: { nombre: '', email: '', telefono: '', dni: '', direccion: '', activo: true }
    });
  }

  function openEdit(c) {
    setModal({ mode: 'edit', data: { ...c } });
  }

  async function save() {
    if (!modal) return;
    const { data, mode } = modal;
    if (!data.nombre || !data.nombre.trim()) {
      toast.error('Nombre es obligatorio');
      return;
    }
    if (!user?.local_id) {
      toast.error('No hay local asignado al usuario; no se puede crear/editar clientes');
      return;
    }

    const payload = {
      nombre: data.nombre.trim(),
      email: data.email || null,
      telefono: data.telefono || null,
      dni: data.dni || null,
      direccion: data.direccion || null,
      local_id: user.local_id,
    };

    if (mode === 'edit') {
      payload.activo = data.activo !== false;
    } else {
      payload.activo = true;
    }

    try {
      const url = mode === 'edit' ? `/api/clientes/${data.id}` : '/api/clientes';
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
      toast.success(mode === 'edit' ? 'Cliente actualizado' : 'Cliente creado');
      setModal(null);
      load();
    } catch (e) {
      toast.error(e.message || 'Error al guardar cliente');
    }
  }

  async function remove(id) {
    try {
      const res = await authFetch(`/api/clientes/${id}`, { method: 'DELETE' }, token);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Error ${res.status}`);
      }
      toast.success('Cliente eliminado');
      load();
    } catch (e) {
      toast.error(e.message || 'No se pudo eliminar');
    }
  }

  async function toggleActivo(c) {
    if (!user?.local_id) {
      toast.error('No hay local asignado al usuario; no se puede actualizar clientes');
      return;
    }
    try {
      const res = await authFetch(`/api/clientes/${c.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: c.nombre,
          email: c.email,
          telefono: c.telefono,
          dni: c.dni,
          direccion: c.direccion,
          local_id: user.local_id,
          activo: c.activo === false,
        })
      }, token);
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
          <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">Clientes</p>
          <h3 className="text-xl font-bold text-slate-900">Gestión de clientes</h3>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold shadow shadow-slate-900/20 hover:bg-slate-800"
        >
          <FiPlus /> Nuevo cliente
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <FiSearch className="text-slate-400" />
          <input
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Buscar por nombre, email o DNI"
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
          <span>Email</span>
          <span>Teléfono</span>
          <span>DNI</span>
          <span className="text-right">Acciones</span>
        </div>
        <div className="divide-y divide-slate-100">
          {loading && (
            <div className="px-4 py-3">
              <TableSkeleton rows={4} columns={6} height={12} />
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="px-4 py-3 text-sm text-slate-500">Sin clientes</div>
          )}
          {filtered.map(c => (
            <div key={c.id} className="grid grid-cols-6 gap-3 px-4 py-3 items-center text-sm text-slate-800">
              <div className="col-span-2 font-semibold">
                <div>{c.nombre}</div>
                {c.direccion && <div className="text-slate-500 text-[12px]">{c.direccion}</div>}
              </div>
              <div className="text-[13px] leading-snug text-slate-600">{c.email || '—'}</div>
              <div className="text-[13px] leading-snug text-slate-600">{c.telefono || '—'}</div>
              <div>{c.dni || '—'}</div>
              <div className="flex justify-end items-center gap-2">
                <button
                  onClick={() => toggleActivo(c)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {c.activo !== false ? <FiToggleRight /> : <FiToggleLeft />} {c.activo !== false ? 'Desactivar' : 'Activar'}
                </button>
                <button
                  onClick={() => openEdit(c)}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-900 text-white px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-800"
                >
                  <FiEdit3 /> Editar
                </button>
                <button
                  onClick={() => setConfirmDelete(c)}
                  className="inline-flex items-center gap-1 rounded-lg border border-rose-200 text-rose-700 px-2.5 py-1.5 text-xs font-semibold hover:bg-rose-50"
                >
                  <FiTrash2 /> Borrar
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
                <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">{modal.mode === 'edit' ? 'Editar' : 'Nuevo'} cliente</p>
                <h3 className="text-lg font-bold text-slate-900">{modal.mode === 'edit' ? modal.data.nombre : 'Crear cliente'}</h3>
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
                <span>DNI</span>
                <input
                  type="text"
                  value={modal.data.dni || ''}
                  onChange={e => setModal(prev => ({ ...prev, data: { ...prev.data, dni: e.target.value } }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
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
              {modal.mode === 'edit' && (
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={modal.data.activo !== false}
                    onChange={e => setModal(prev => ({ ...prev, data: { ...prev.data, activo: e.target.checked } }))}
                  />
                  Cliente activo
                </label>
              )}
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

      {confirmDelete && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">Eliminar cliente</p>
                <h3 className="text-lg font-bold text-slate-900">{confirmDelete.nombre}</h3>
                <p className="text-sm text-slate-600 mt-1">Esta acción no se puede deshacer.</p>
              </div>
              <button
                className="text-slate-400 hover:text-slate-600"
                onClick={() => setConfirmDelete(null)}
                aria-label="Cerrar"
              >
                x
              </button>
            </div>

            <div className="space-y-1 text-sm text-slate-700">
              {confirmDelete.email && <p>Email: {confirmDelete.email}</p>}
              {confirmDelete.telefono && <p>Teléfono: {confirmDelete.telefono}</p>}
              {confirmDelete.dni && <p>DNI: {confirmDelete.dni}</p>}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => { await remove(confirmDelete.id); setConfirmDelete(null); }}
                className="rounded-lg bg-rose-600 text-white px-4 py-2 text-sm font-semibold shadow disabled:opacity-60"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
