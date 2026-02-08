import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FiPlus, FiSearch, FiEdit3 } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { TableSkeleton } from './Skeleton';

function authFetch(path, opts = {}, token) {
  const API_BASE = import.meta.env.VITE_API_BASE || '';
  if (path.startsWith('/api/')) path = API_BASE + path;
  const headers = Object.assign({}, opts.headers || {});
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(path, Object.assign({}, opts, { headers, credentials: 'include' }));
}

const emptyEmpleado = {
  nombre: '',
  apellido: '',
  documento: '',
  fecha_nacimiento: '',
  telefono: '',
  email: '',
  direccion: '',
  localidad: '',
  sexo: '',
  legajo: '',
  banco: '',
  cbu: '',
  alias: '',
  fecha_inicio: '',
  fecha_fin: '',
  motivo_baja: '',
  activo: true,
};

function formatDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '—';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export default function EmpleadosPage() {
  const { token } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [showOnlyActive, setShowOnlyActive] = useState(false);
  const [modal, setModal] = useState(null); // {mode, data}

  const filtered = useMemo(() => {
    const q = filter.toLowerCase();
    return list.filter(emp => {
      const matchText = !q || `${emp.nombre || ''} ${emp.apellido || ''}`.toLowerCase().includes(q) || (emp.documento || '').toLowerCase().includes(q);
      const matchEstado = showOnlyActive ? emp.activo !== false : true;
      return matchText && matchEstado;
    });
  }, [list, filter, showOnlyActive]);

  function load() {
    setLoading(true);
    authFetch('/api/empleados?estado=todos', {}, token)
      .then(r => r.ok ? r.json() : [])
      .then(data => setList(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (token) load();
  }, [token]);

  function openNew() {
    setModal({ mode: 'new', data: { ...emptyEmpleado } });
  }

  function openEdit(emp) {
    setModal({ mode: 'edit', data: { ...emptyEmpleado, ...emp } });
  }

  async function eliminar(emp) {
    try {
      const res = await authFetch(`/api/empleados/${emp.id}`, { method: 'DELETE' }, token);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Error ${res.status}`);
      }
      toast.success('Empleado eliminado');
      load();
    } catch (e) {
      toast.error(e.message || 'No se pudo eliminar');
    }
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
      apellido: data.apellido || null,
      documento: data.documento || null,
      fecha_nacimiento: data.fecha_nacimiento || null,
      telefono: data.telefono || null,
      email: data.email || null,
      direccion: data.direccion || null,
      localidad: data.localidad || null,
      sexo: data.sexo || null,
      legajo: data.legajo || null,
      banco: data.banco || null,
      cbu: data.cbu || null,
      alias: data.alias || null,
      fecha_inicio: data.fecha_inicio || null,
      fecha_fin: data.fecha_fin || null,
      motivo_baja: data.motivo_baja || null,
      activo: data.activo !== false,
    };

    try {
      const url = mode === 'edit' ? `/api/empleados/${data.id}` : '/api/empleados';
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
      toast.success(mode === 'edit' ? 'Empleado actualizado' : 'Empleado creado');
      setModal(null);
      load();
    } catch (e) {
      toast.error(e.message || 'Error al guardar empleado');
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5 text-slate-900">
      <div className="rounded-2xl border border-slate-200 bg-white shadow p-5">
        <h2 className="text-2xl font-bold mt-1">Empleados</h2>
        <p className="text-sm text-slate-500 mt-1">Gestiona altas, bajas y datos del personal.</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">Empleados</p>
            <h3 className="text-xl font-bold text-slate-900">Gestión de empleados</h3>
          </div>
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold shadow shadow-slate-900/20 hover:bg-slate-800"
          >
            <FiPlus /> Nuevo empleado
          </button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <FiSearch className="text-slate-400" />
            <input
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Buscar por nombre o documento"
              className="w-full bg-transparent text-sm focus:outline-none"
            />
          </div>
          <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
            Solo activos
          </label>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow divide-y divide-slate-100">
          <div className="grid grid-cols-8 gap-3 px-4 py-3 text-xs font-semibold uppercase tracking-tight text-slate-500">
            <span className="col-span-2">Nombre</span>
            <span>Documento</span>
            <span>Teléfono</span>
            <span>F. inicio</span>
            <span>F. fin</span>
            <span>Estado</span>
            <span className="text-right">Acciones</span>
          </div>
          <div className="divide-y divide-slate-100">
            {loading && (
              <div className="px-4 py-3">
                <TableSkeleton rows={4} columns={8} height={12} />
              </div>
            )}
            {!loading && filtered.length === 0 && (
              <div className="px-4 py-3 text-sm text-slate-500">Sin empleados</div>
            )}
            {filtered.map(emp => (
              <div key={emp.id} className="grid grid-cols-8 gap-3 px-4 py-3 items-center text-sm text-slate-800">
                <div className="col-span-2 font-semibold">{emp.nombre} {emp.apellido || ''}</div>
                <div>{emp.documento || '—'}</div>
                <div>{emp.telefono || '—'}</div>
                <div>{formatDate(emp.fecha_inicio)}</div>
                <div>{formatDate(emp.fecha_fin)}</div>
                <div>
                  {emp.activo !== false ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded-full">Activo</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-full">Baja</span>
                  )}
                </div>
                <div className="flex justify-end items-center gap-2">
                  <button
                    onClick={() => openEdit(emp)}
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-900 text-white px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-800"
                  >
                    <FiEdit3 /> Editar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-4xl rounded-2xl bg-white border border-slate-200 shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">{modal.mode === 'edit' ? 'Editar' : 'Nuevo'} empleado</p>
                <h3 className="text-lg font-bold text-slate-900">{modal.data.nombre || 'Crear empleado'}</h3>
              </div>
              <button
                className="text-slate-400 hover:text-slate-600"
                onClick={() => setModal(null)}
                aria-label="Cerrar"
              >
                x
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="text-sm font-semibold text-slate-700 space-y-1">
                <span>Nombre *</span>
                <input
                  type="text"
                  value={modal.data.nombre}
                  onChange={e => setModal(prev => ({ ...prev, data: { ...prev.data, nombre: e.target.value } }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700 space-y-1">
                <span>Apellido</span>
                <input
                  type="text"
                  value={modal.data.apellido}
                  onChange={e => setModal(prev => ({ ...prev, data: { ...prev.data, apellido: e.target.value } }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700 space-y-1">
                <span>DNI / CUIT / CUIL</span>
                <input
                  type="text"
                  value={modal.data.documento}
                  onChange={e => setModal(prev => ({ ...prev, data: { ...prev.data, documento: e.target.value } }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                />
              </label>

              <label className="text-sm font-semibold text-slate-700 space-y-1">
                <span>Fecha de nacimiento</span>
                <input
                  type="date"
                  value={modal.data.fecha_nacimiento || ''}
                  onChange={e => setModal(prev => ({ ...prev, data: { ...prev.data, fecha_nacimiento: e.target.value } }))}
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
                <span>Dirección</span>
                <input
                  type="text"
                  value={modal.data.direccion || ''}
                  onChange={e => setModal(prev => ({ ...prev, data: { ...prev.data, direccion: e.target.value } }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700 space-y-1">
                <span>Localidad</span>
                <input
                  type="text"
                  value={modal.data.localidad || ''}
                  onChange={e => setModal(prev => ({ ...prev, data: { ...prev.data, localidad: e.target.value } }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700 space-y-1">
                <span>Sexo</span>
                <select
                  value={modal.data.sexo || ''}
                  onChange={e => setModal(prev => ({ ...prev, data: { ...prev.data, sexo: e.target.value } }))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                >
                  <option value="">Seleccionar</option>
                  <option value="masculino">Masculino</option>
                  <option value="femenino">Femenino</option>
                </select>
              </label>

              <label className="text-sm font-semibold text-slate-700 space-y-1">
                <span>N° legajo</span>
                <input
                  type="text"
                  value={modal.data.legajo || ''}
                  onChange={e => setModal(prev => ({ ...prev, data: { ...prev.data, legajo: e.target.value } }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700 space-y-1">
                <span>Banco</span>
                <input
                  type="text"
                  value={modal.data.banco || ''}
                  onChange={e => setModal(prev => ({ ...prev, data: { ...prev.data, banco: e.target.value } }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700 space-y-1">
                <span>CBU</span>
                <input
                  type="text"
                  value={modal.data.cbu || ''}
                  onChange={e => setModal(prev => ({ ...prev, data: { ...prev.data, cbu: e.target.value } }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                />
              </label>

              <label className="text-sm font-semibold text-slate-700 space-y-1">
                <span>Alias</span>
                <input
                  type="text"
                  value={modal.data.alias || ''}
                  onChange={e => setModal(prev => ({ ...prev, data: { ...prev.data, alias: e.target.value } }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700 space-y-1">
                <span>Fecha de inicio</span>
                <input
                  type="date"
                  value={modal.data.fecha_inicio || ''}
                  onChange={e => setModal(prev => ({ ...prev, data: { ...prev.data, fecha_inicio: e.target.value } }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700 space-y-1">
                <span>Fecha de fin</span>
                <input
                  type="date"
                  value={modal.data.fecha_fin || ''}
                  onChange={e => setModal(prev => ({ ...prev, data: { ...prev.data, fecha_fin: e.target.value } }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                />
                <span className="text-[11px] text-slate-500">Si trabaja actualmente, deja este campo vacío.</span>
              </label>
              <label className="text-sm font-semibold text-slate-700 space-y-1 md:col-span-2">
                <span>Motivo de baja</span>
                <input
                  type="text"
                  value={modal.data.motivo_baja || ''}
                  onChange={e => setModal(prev => ({ ...prev, data: { ...prev.data, motivo_baja: e.target.value } }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                  placeholder="Completar solo si tiene fecha de fin"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700 space-y-1">
                <span>Estado</span>
                <select
                  value={modal.data.activo ? 'activo' : 'baja'}
                  onChange={e => setModal(prev => ({ ...prev, data: { ...prev.data, activo: e.target.value === 'activo' } }))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                >
                  <option value="activo">Activo</option>
                  <option value="baja">Baja</option>
                </select>
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setModal(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              {modal.mode === 'edit' && modal.data.activo === false && (
                <button
                  onClick={() => eliminar(modal.data)}
                  className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 px-4 py-2 text-sm font-semibold hover:bg-rose-100"
                >
                  Eliminar
                </button>
              )}
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
