import React, { useEffect, useMemo, useState } from 'react';
import { FiActivity, FiAlertTriangle, FiClock, FiEdit2, FiKey, FiLayers, FiList, FiRefreshCw, FiX } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Skeleton, { TableSkeleton } from './Skeleton';

const ESTADO_META = {
  activo: { label: 'Activo', badge: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500', desc: 'Operando con normalidad' },
  suspendido: { label: 'Suspendido', badge: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500', desc: 'Acceso bloqueado temporalmente' },
  trial: { label: 'Trial', badge: 'bg-sky-100 text-sky-800', dot: 'bg-sky-500', desc: 'Periodo de prueba' },
  baja: { label: 'Baja', badge: 'bg-slate-200 text-slate-700', dot: 'bg-slate-500', desc: 'Cerrado o dado de baja' },
};

function estadoInfo(negocio) {
  if (!negocio) return ESTADO_META.activo;
  const estado = negocio.estado || (negocio.activo === false ? 'suspendido' : 'activo');
  return ESTADO_META[estado] ? { estado, ...ESTADO_META[estado] } : { estado, ...ESTADO_META.activo };
}

function formatFecha(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function SuperadminPanel() {
  const { token, user } = useAuth();
  const [negocios, setNegocios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nombreNegocio, setNombreNegocio] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [estadoInicial, setEstadoInicial] = useState('activo');
  const [motivoInicial, setMotivoInicial] = useState('');
  const [creando, setCreando] = useState(false);
  const [estadoModal, setEstadoModal] = useState({ open: false, negocio: null, estado: 'activo', motivo: '' });
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  const [logsByNegocio, setLogsByNegocio] = useState({});
  const [adminsByNegocio, setAdminsByNegocio] = useState({});
  const [selectedNegocioId, setSelectedNegocioId] = useState(null);
  const [resetModal, setResetModal] = useState({ open: false, negocio: null, adminEmail: '', adminNombre: '', adminId: null, selectedAdminId: null, password: '', confirm: '' });
  const [reseteando, setReseteando] = useState(false);
  const [planes, setPlanes] = useState([]);
  const [subs, setSubs] = useState([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [planModal, setPlanModal] = useState({ open: false, negocio: null, subId: null, plan_id: '', status: 'active', trial_end: '', current_period_end: '', next_billing_date: '', meta: '' });

  const metrics = useMemo(() => {
    const total = negocios.length;
    const activos = negocios.filter(n => (n.estado || (n.activo !== false ? 'activo' : 'suspendido')) === 'activo').length;
    const suspendidos = negocios.filter(n => (n.estado || (n.activo !== false ? 'activo' : 'suspendido')) === 'suspendido').length;
    return { total, activos, suspendidos };
  }, [negocios]);

  async function authFetch(url, options = {}) {
    const headers = { ...(options.headers || {}), Authorization: 'Bearer ' + token };
    if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const res = await fetch(url, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = data.message || data.error || 'Error de red';
      throw new Error(message);
    }
    return data;
  }

  async function fetchNegocios() {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const data = await authFetch('/api/negocios');
      setNegocios(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchNegocios(); }, [token]);

  async function fetchPlanesYSubs() {
    if (!token) return;
    setSubsLoading(true);
    try {
      const [p, s] = await Promise.all([
        authFetch('/api/admin/plans'),
        authFetch('/api/admin/subscriptions'),
      ]);
      setPlanes(Array.isArray(p) ? p : []);
      setSubs(Array.isArray(s) ? s : []);
    } catch (err) {
      toast.error(err.message || 'No se pudieron cargar planes/suscripciones');
    } finally {
      setSubsLoading(false);
    }
  }

  useEffect(() => { fetchPlanesYSubs(); }, [token]);

  async function crearNegocioYAdmin(e) {
    e.preventDefault();
    setCreando(true);
    try {
      const nuevo = await authFetch('/api/negocios', {
        method: 'POST',
        body: JSON.stringify({ nombre: nombreNegocio })
      });

      const negocio = nuevo.negocio || nuevo;

      await authFetch('/api/negocios/asignar-admin', {
        method: 'POST',
        body: JSON.stringify({ negocio_id: negocio.id, email: adminEmail, password: adminPassword })
      });

      if (estadoInicial !== 'activo' || (motivoInicial && motivoInicial.trim())) {
        await authFetch(`/api/negocios/${negocio.id}/estado`, {
          method: 'PUT',
          body: JSON.stringify({ estado: estadoInicial, motivo: motivoInicial || null })
        });
      }

      toast.success('Negocio y admin creados');
      setNombreNegocio('');
      setAdminEmail('');
      setAdminPassword('');
      setEstadoInicial('activo');
      setMotivoInicial('');
      fetchNegocios();
    } catch (err) {
      toast.error(err.message || 'No se pudo crear');
    } finally {
      setCreando(false);
    }
  }

  function openEstadoModal(negocio) {
    const info = estadoInfo(negocio);
    setEstadoModal({ open: true, negocio, estado: info.estado, motivo: negocio.motivo_estado || '' });
  }

  function openPlanModal(negocio) {
    const sub = subs.find(s => Number(s.negocio_id) === Number(negocio.id));
    setPlanModal({
      open: true,
      negocio,
      subId: sub?.id || null,
      plan_id: sub?.plan_id || planes[0]?.id || '',
      status: sub?.status || 'active',
      trial_end: sub?.trial_end ? sub.trial_end.slice(0, 10) : '',
      current_period_end: sub?.current_period_end ? sub.current_period_end.slice(0, 10) : '',
      next_billing_date: sub?.next_billing_date ? sub.next_billing_date.slice(0, 10) : '',
      meta: sub?.meta ? JSON.stringify(sub.meta, null, 2) : '',
    });
  }

  async function savePlanModal(e) {
    e.preventDefault();
    if (!planModal.negocio || !planModal.plan_id) {
      toast.error('Selecciona plan');
      return;
    }
    let metaParsed = null;
    if (planModal.meta && planModal.meta.trim()) {
      try { metaParsed = JSON.parse(planModal.meta); }
      catch (err) { toast.error('Meta debe ser JSON válido'); return; }
    }
    const payload = {
      negocio_id: Number(planModal.negocio.id),
      plan_id: Number(planModal.plan_id),
      status: planModal.status,
      trial_end: planModal.trial_end || null,
      current_period_end: planModal.current_period_end || null,
      next_billing_date: planModal.next_billing_date || null,
      meta: metaParsed
    };
    try {
      let res;
      if (planModal.subId) {
        res = await authFetch(`/api/admin/subscriptions/${planModal.subId}`, { method: 'PUT', body: JSON.stringify(payload) });
        toast.success('Suscripción actualizada');
      } else {
        res = await authFetch('/api/admin/subscriptions', { method: 'POST', body: JSON.stringify(payload) });
        toast.success('Suscripción creada');
      }
      const saved = res.subscription || res;
      setSubs(prev => {
        const exists = prev.some(s => s.id === saved.id);
        if (exists) return prev.map(s => (s.id === saved.id ? saved : s));
        return [saved, ...prev];
      });
      setPlanModal({ open: false, negocio: null, subId: null, plan_id: '', status: 'active', trial_end: '', current_period_end: '', next_billing_date: '', meta: '' });
    } catch (err) {
      toast.error(err.message || 'No se pudo guardar');
    }
  }

  async function submitEstadoChange(e) {
    e.preventDefault();
    if (!estadoModal.negocio) return;
    setCambiandoEstado(true);
    try {
      const payload = { estado: estadoModal.estado, motivo: estadoModal.motivo || null };
      const updated = await authFetch(`/api/negocios/${estadoModal.negocio.id}/estado`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      const negocio = updated.negocio || updated;
      setNegocios(prev => prev.map(n => n.id === negocio.id ? { ...n, ...negocio } : n));
      setEstadoModal({ open: false, negocio: null, estado: 'activo', motivo: '' });
      toast.success('Estado actualizado');
      if (selectedNegocioId === negocio.id) loadLogs(negocio.id, true);
    } catch (err) {
      toast.error(err.message || 'No se pudo actualizar');
    } finally {
      setCambiandoEstado(false);
    }
  }

  async function loadLogs(negocioId, force = false) {
    if (!negocioId) return;
    if (!force && logsByNegocio[negocioId]?.items) return;
    setLogsByNegocio(prev => ({ ...prev, [negocioId]: { ...(prev[negocioId] || {}), loading: true, error: '' } }));
    try {
      const data = await authFetch(`/api/negocios/${negocioId}/logs`);
      setLogsByNegocio(prev => ({ ...prev, [negocioId]: { items: Array.isArray(data) ? data : [], loading: false, error: '' } }));
    } catch (err) {
      setLogsByNegocio(prev => ({ ...prev, [negocioId]: { items: [], loading: false, error: err.message || 'Error obteniendo logs' } }));
    }
  }

  async function loadAdmins(negocioId, force = false) {
    if (!negocioId) return [];
    if (!force && adminsByNegocio[negocioId]?.items) return adminsByNegocio[negocioId].items;
    setAdminsByNegocio(prev => ({ ...prev, [negocioId]: { ...(prev[negocioId] || {}), loading: true, error: '' } }));
    try {
      const data = await authFetch(`/api/negocios/${negocioId}/admins`);
      const items = Array.isArray(data) ? data : [];
      setAdminsByNegocio(prev => ({ ...prev, [negocioId]: { items, loading: false, error: '' } }));
      return items;
    } catch (err) {
      setAdminsByNegocio(prev => ({ ...prev, [negocioId]: { items: [], loading: false, error: err.message || 'Error obteniendo admins' } }));
      return [];
    }
  }

  function handleViewLogs(negocioId) {
    setSelectedNegocioId(negocioId);
    loadLogs(negocioId);
  }

  const selectedLogs = selectedNegocioId ? logsByNegocio[selectedNegocioId] : null;
  const selectedNegocio = selectedNegocioId ? negocios.find(n => n.id === selectedNegocioId) : null;
  const adminsInfo = resetModal.negocio ? adminsByNegocio[resetModal.negocio.id] : null;

  async function openResetModal(negocio) {
    if (!negocio.admin_id) {
      toast.error('Este negocio no tiene admin asignado');
      return;
    }
    const admins = await loadAdmins(negocio.id, true);
    const selectedAdminId = admins.length ? admins[0].id : negocio.admin_id;
    setResetModal({ open: true, negocio, adminEmail: negocio.admin_email || '', adminNombre: negocio.admin_nombre || '', adminId: selectedAdminId, selectedAdminId, password: '', confirm: '' });
  }

  async function submitResetPassword(e) {
    e.preventDefault();
    if (!resetModal.negocio || !resetModal.adminId) return;
    if (!resetModal.password || resetModal.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (resetModal.password !== resetModal.confirm) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    setReseteando(true);
    try {
      await authFetch(`/api/negocios/${resetModal.negocio.id}/admin/password`, {
        method: 'PUT',
        body: JSON.stringify({ password: resetModal.password, admin_id: resetModal.selectedAdminId || resetModal.adminId })
      });
      toast.success('Contraseña de admin actualizada');
      if (selectedNegocioId === resetModal.negocio.id) {
        loadLogs(resetModal.negocio.id, true); // refresca historial para ver el reset
      }
      setResetModal({ open: false, negocio: null, adminEmail: '', adminNombre: '', adminId: null, selectedAdminId: null, password: '', confirm: '' });
    } catch (err) {
      toast.error(err.message || 'No se pudo actualizar');
    } finally {
      setReseteando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-sky-600 via-teal-500 to-emerald-500 text-white rounded-2xl p-6 shadow-xl border border-white/10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-white/80">Panel superadmin</p>
            <h1 className="text-3xl font-black leading-tight">Negocios y estados</h1>
            <p className="text-white/80 text-sm mt-1">Crea negocios, asigna admins y controla su ciclo de vida</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-slate-900">
            <div className="bg-white/90 rounded-xl px-4 py-3 shadow-sm">
              <p className="text-xs font-semibold text-slate-600 uppercase">Total</p>
              <div className="text-2xl font-black">{metrics.total}</div>
            </div>
            <div className="bg-white/90 rounded-xl px-4 py-3 shadow-sm">
              <p className="text-xs font-semibold text-slate-600 uppercase">Activos</p>
              <div className="text-2xl font-black">{metrics.activos}</div>
            </div>
            <div className="bg-white/90 rounded-xl px-4 py-3 shadow-sm">
              <p className="text-xs font-semibold text-slate-600 uppercase">Suspendidos</p>
              <div className="text-2xl font-black">{metrics.suspendidos}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Crear negocio y admin</p>
              <h3 className="text-xl font-bold text-slate-900">Alta express</h3>
            </div>
            <button
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
              onClick={fetchNegocios}
            >
              <FiRefreshCw className="animate-spin" /> Refrescar
            </button>
          </div>
          <form onSubmit={crearNegocioYAdmin} className="grid md:grid-cols-2 gap-4">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Nombre del negocio</span>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                value={nombreNegocio}
                onChange={e => setNombreNegocio(e.target.value)}
                required
                placeholder="Ej: Cafeteria Norte"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Email del admin</span>
              <input
                type="email"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                value={adminEmail}
                onChange={e => setAdminEmail(e.target.value)}
                required
                placeholder="admin@negocio.com"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Contraseña del admin</span>
              <input
                type="password"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Min. 6 caracteres"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Estado inicial</span>
              <select
                className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                value={estadoInicial}
                onChange={e => setEstadoInicial(e.target.value)}
              >
                <option value="activo">Activo</option>
                <option value="trial">Trial</option>
                <option value="suspendido">Suspendido</option>
                <option value="baja">Baja</option>
              </select>
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-slate-700">Motivo del estado (opcional)</span>
              <textarea
                className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                rows={2}
                placeholder="Ej: Trial por 14 días, suspensión por falta de pago..."
                value={motivoInicial}
                onChange={e => setMotivoInicial(e.target.value)}
              />
            </label>
            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={creando}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold shadow hover:bg-slate-800 disabled:opacity-60"
              >
                {creando ? 'Creando...' : 'Crear negocio y admin'}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-3">
          <div className="flex items-center gap-2 text-slate-700 font-semibold">
            <FiActivity className="text-sky-600" />
            <span>Estados soportados</span>
          </div>
          <ul className="space-y-2 text-sm text-slate-600">
            <li><strong>Activo:</strong> acceso total.</li>
            <li><strong>Trial:</strong> periodo de prueba con todas las funciones.</li>
            <li><strong>Suspendido:</strong> bloquea acceso hasta regularizar pagos.</li>
            <li><strong>Baja:</strong> cierre definitivo; no permite login.</li>
          </ul>
          <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-sm p-3 flex gap-2">
            <FiAlertTriangle className="mt-0.5" />
            <span>Los cambios quedan auditados en el historial del negocio.</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Negocios</p>
            <h3 className="text-lg font-bold text-slate-900">Control de estado y actividad</h3>
          </div>
          {error && <span className="text-sm text-red-600 font-semibold">{error}</span>}
        </div>

        {loading ? (
          <div className="px-4 py-6">
            <TableSkeleton rows={4} columns={8} height={12} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-500 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Admin</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Motivo</th>
                  <th className="px-4 py-3">Creado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {negocios.map(n => {
                  const sub = subs.find(s => Number(s.negocio_id) === Number(n.id));
                  const planNombre = sub?.plan_nombre || planes.find(p => p.id === sub?.plan_id)?.nombre;
                  const info = estadoInfo(n);
                  return (
                    <tr key={n.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-700">{n.id}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{n.nombre}</div>
                        <div className="text-xs text-slate-500">{n.activo === false ? 'Inactivo (legacy)' : 'Registro'}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {n.admin_id ? (
                          <div className="space-y-0.5">
                            <div className="font-semibold">{n.admin_nombre || 'usuario admin'}</div>
                            {n.admin_email && <div className="text-xs text-slate-500">{n.admin_email}</div>}
                            <div className="text-xs text-slate-500">ID {n.admin_id}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm">Sin admin</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${info.badge}`}>
                          <span className={`h-2 w-2 rounded-full ${info.dot}`} />
                          {info.label}
                        </span>
                        <div className="text-[11px] text-slate-500 mt-1">{info.desc}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <div className="font-semibold">{planNombre || 'Sin plan'}</div>
                        {sub?.status && <div className="text-[11px] text-slate-500">{sub.status}</div>}
                        {subsLoading && !sub && <div className="text-[11px] text-slate-400">Cargando...</div>}
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-xs">
                        {n.motivo_estado || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatFecha(n.creado_en || n.created_at)}</td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:border-slate-300 hover:text-slate-900"
                          onClick={() => openEstadoModal(n)}
                        >
                          <FiEdit2 /> Estado
                        </button>
                        <button
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border font-semibold ${n.admin_id ? 'border-slate-200 text-slate-700 hover:border-slate-300 hover:text-slate-900' : 'border-slate-100 text-slate-300 cursor-not-allowed'}`}
                          onClick={() => n.admin_id && openResetModal(n)}
                          disabled={!n.admin_id}
                        >
                          <FiKey /> Reset pass
                        </button>
                        <button
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:border-slate-300 hover:text-slate-900"
                          onClick={() => openPlanModal(n)}
                        >
                          <FiLayers /> Plan
                        </button>
                        <button
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-slate-700 font-semibold hover:text-slate-900 ${selectedNegocioId === n.id ? 'border-sky-300 bg-sky-50 text-sky-800' : 'border-slate-200 hover:border-slate-300'}`}
                          onClick={() => handleViewLogs(n.id)}
                        >
                          <FiList /> Historial
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {negocios.length === 0 && (
              <div className="px-4 py-6 text-center text-slate-500">Aún no hay negocios creados.</div>
            )}
          </div>
        )}
      </div>

      {selectedNegocio && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Historial</p>
              <h3 className="text-lg font-bold text-slate-900">{selectedNegocio.nombre}</h3>
            </div>
            <button
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
              onClick={() => loadLogs(selectedNegocio.id, true)}
            >
              <FiRefreshCw /> Actualizar
            </button>
          </div>
          {selectedLogs?.loading && (
            <div className="space-y-2">
              {[1, 2, 3].map(n => (
                <Skeleton key={n} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          )}
          {selectedLogs?.error && <div className="text-sm text-red-600 font-semibold">{selectedLogs.error}</div>}
          <div className="space-y-3">
            {(selectedLogs?.items || []).map(log => (
              <div key={log.id} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100">
                <div className="mt-1 h-2 w-2 rounded-full bg-slate-400" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 capitalize">{log.accion}</span>
                    {log.motivo && <span className="text-xs text-slate-500">{log.motivo}</span>}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                    <FiClock /> {formatFecha(log.created_at)}
                    {log.usuario_email && <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{log.usuario_email}</span>}
                  </div>
                </div>
              </div>
            ))}
            {(selectedLogs?.items || []).length === 0 && !selectedLogs?.loading && !selectedLogs?.error && (
              <div className="text-sm text-slate-600">Sin movimientos registrados.</div>
            )}
          </div>
        </div>
      )}

      {estadoModal.open && estadoModal.negocio && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Cambiar estado</p>
                <h3 className="text-lg font-bold text-slate-900">{estadoModal.negocio.nombre}</h3>
              </div>
              <button
                className="text-slate-500 hover:text-slate-800"
                onClick={() => setEstadoModal({ open: false, negocio: null, estado: 'activo', motivo: '' })}
              >
                ✕
              </button>
            </div>

            <form className="space-y-4" onSubmit={submitEstadoChange}>
              <label className="space-y-2 block">
                <span className="text-sm font-semibold text-slate-700">Estado</span>
                <select
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  value={estadoModal.estado}
                  onChange={e => setEstadoModal(prev => ({ ...prev, estado: e.target.value }))}
                >
                  <option value="activo">Activo</option>
                  <option value="trial">Trial</option>
                  <option value="suspendido">Suspendido</option>
                  <option value="baja">Baja</option>
                </select>
              </label>

              <label className="space-y-2 block">
                <span className="text-sm font-semibold text-slate-700">Motivo (opcional)</span>
                <textarea
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  rows={3}
                  placeholder="Ej: Falta de pago, periodo de prueba, pedido de cierre..."
                  value={estadoModal.motivo}
                  onChange={e => setEstadoModal(prev => ({ ...prev, motivo: e.target.value }))}
                />
              </label>

              <div className="flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <FiClock />
                  <span>Se registrará en el historial con usuario {user?.email || 'superadmin'}.</span>
                </div>
                <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold">ID {estadoModal.negocio.id}</span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:text-slate-900"
                  onClick={() => setEstadoModal({ open: false, negocio: null, estado: 'activo', motivo: '' })}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={cambiandoEstado}
                  className="px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold shadow hover:bg-slate-800 disabled:opacity-60"
                >
                  {cambiandoEstado ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {resetModal.open && resetModal.negocio && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Resetear contraseña</p>
                <h3 className="text-lg font-bold text-slate-900">{resetModal.negocio.nombre}</h3>
                <p className="text-sm text-slate-600">Admin: {resetModal.adminNombre || resetModal.adminEmail || 'Sin admin'}</p>
              </div>
              <button
                className="text-slate-500 hover:text-slate-800"
                onClick={() => setResetModal({ open: false, negocio: null, adminEmail: '', adminNombre: '', adminId: null, password: '', confirm: '' })}
              >
                ✕
              </button>
            </div>

            <form className="space-y-4" onSubmit={submitResetPassword}>
              <div className="space-y-2 block">
                <span className="text-sm font-semibold text-slate-700">Admin a resetear</span>
                {adminsInfo?.loading && <div className="text-xs text-slate-500">Cargando admins...</div>}
                {adminsInfo?.error && <div className="text-xs text-red-600 font-semibold">{adminsInfo.error}</div>}
                {(adminsInfo?.items || []).length > 0 ? (
                  <select
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                    value={resetModal.selectedAdminId || ''}
                    onChange={e => setResetModal(prev => ({ ...prev, selectedAdminId: Number(e.target.value) }))}
                  >
                    {(adminsInfo?.items || []).map(a => (
                      <option key={a.id} value={a.id}>
                        {(a.nombre || a.email || `Admin ${a.id}`)} {a.email ? `(${a.email})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-xs text-slate-500">No hay admins en este negocio.</div>
                )}
              </div>

              <label className="space-y-2 block">
                <span className="text-sm font-semibold text-slate-700">Nueva contraseña</span>
                <input
                  type="password"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  minLength={6}
                  value={resetModal.password}
                  onChange={e => setResetModal(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Min. 6 caracteres"
                  required
                />
              </label>

              <label className="space-y-2 block">
                <span className="text-sm font-semibold text-slate-700">Confirmar contraseña</span>
                <input
                  type="password"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  minLength={6}
                  value={resetModal.confirm}
                  onChange={e => setResetModal(prev => ({ ...prev, confirm: e.target.value }))}
                  placeholder="Repetir contraseña"
                  required
                />
              </label>

              <div className="text-xs text-slate-500 flex items-center gap-2">
                <FiClock /> Se actualizará de inmediato y no se envía email.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:text-slate-900"
                  onClick={() => setResetModal({ open: false, negocio: null, adminEmail: '', adminNombre: '', adminId: null, password: '', confirm: '' })}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={reseteando}
                  className="px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold shadow hover:bg-slate-800 disabled:opacity-60"
                >
                  {reseteando ? 'Actualizando...' : 'Actualizar contraseña'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {planModal.open && planModal.negocio && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Suscripción</p>
                <h3 className="text-lg font-bold text-slate-900">{planModal.negocio.nombre}</h3>
              </div>
              <button
                className="text-slate-500 hover:text-slate-800"
                onClick={() => setPlanModal({ open: false, negocio: null, subId: null, plan_id: '', status: 'active', trial_end: '', current_period_end: '', next_billing_date: '', meta: '' })}
                aria-label="Cerrar"
              >
                <FiX />
              </button>
            </div>

            <form className="space-y-3" onSubmit={savePlanModal}>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-semibold text-slate-700 space-y-1">
                  <span>Plan</span>
                  <select
                    value={planModal.plan_id}
                    onChange={e => setPlanModal(prev => ({ ...prev, plan_id: e.target.value }))}
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                  >
                    <option value="">Selecciona</option>
                    {planes.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-semibold text-slate-700 space-y-1">
                  <span>Estado</span>
                  <select
                    value={planModal.status}
                    onChange={e => setPlanModal(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                  >
                    <option value="active">active</option>
                    <option value="trialing">trialing</option>
                    <option value="past_due">past_due</option>
                    <option value="canceled">canceled</option>
                    <option value="incomplete">incomplete</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-sm font-semibold text-slate-700 space-y-1">
                  <span>Trial end</span>
                  <input
                    type="date"
                    value={planModal.trial_end}
                    onChange={e => setPlanModal(prev => ({ ...prev, trial_end: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                  />
                </label>
                <label className="text-sm font-semibold text-slate-700 space-y-1">
                  <span>Current period end</span>
                  <input
                    type="date"
                    value={planModal.current_period_end}
                    onChange={e => setPlanModal(prev => ({ ...prev, current_period_end: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                  />
                </label>
                <label className="text-sm font-semibold text-slate-700 space-y-1">
                  <span>Próxima facturación</span>
                  <input
                    type="date"
                    value={planModal.next_billing_date}
                    onChange={e => setPlanModal(prev => ({ ...prev, next_billing_date: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                  />
                </label>
              </div>

              <label className="text-sm font-semibold text-slate-700 space-y-1">
                <span>Meta (JSON opcional)</span>
                <textarea
                  value={planModal.meta}
                  onChange={e => setPlanModal(prev => ({ ...prev, meta: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                  rows={3}
                  placeholder='{"stripe_subscription_id":"..."}'
                />
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:text-slate-900"
                  onClick={() => setPlanModal({ open: false, negocio: null, subId: null, plan_id: '', status: 'active', trial_end: '', current_period_end: '', next_billing_date: '', meta: '' })}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold shadow hover:bg-slate-800 disabled:opacity-60"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


