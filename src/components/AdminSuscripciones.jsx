import React, { useEffect, useMemo, useState } from 'react';
import { FiCalendar, FiEdit2, FiPlus, FiRefreshCcw, FiX, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { TableSkeleton } from './Skeleton';

function formatDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-AR');
}

function formatMonto(value) {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  return n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AdminSuscripciones() {
  const { token } = useAuth();
  const [subs, setSubs] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [negocios, setNegocios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ id: null, negocio_id: '', plan_id: '', status: 'active', trial_end: '', current_period_end: '', next_billing_date: '', meta: '' });
  const [pendingInvoices, setPendingInvoices] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, invoice: null });
  const [confirmingInvoice, setConfirmingInvoice] = useState(false);

  async function authFetch(url, options = {}) {
    const API_BASE = import.meta.env.VITE_API_BASE || '';
    if (url.startsWith('/api/')) url = API_BASE + url;
    const token = localStorage.getItem('token');
    const headers = { ...(options.headers || {}), Authorization: token ? `Bearer ${token}` : undefined };
    if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    return fetch(url, { ...options, headers, credentials: 'include' })
      .then(res => res.json().then(data => ({ ok: res.ok, status: res.status, ...data })))
      .then(data => {
        if (!data.ok) throw new Error(data.message || data.error || 'Error de red');
        return data;
      });
  }

  async function load() {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const [subsData, planesData, negociosData, invoicesData] = await Promise.all([
        authFetch('/api/admin/subscriptions'),
        authFetch('/api/admin/plans'),
        authFetch('/api/negocios'),
        authFetch('/api/admin/invoices/pending')
      ]);
      setSubs(Array.isArray(subsData) ? subsData : []);
      setPlanes(Array.isArray(planesData) ? planesData : []);
      setNegocios(Array.isArray(negociosData) ? negociosData : []);
      setPendingInvoices(Array.isArray(invoicesData) ? invoicesData : []);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar suscripciones');
    } finally {
      setLoading(false);
    }
  }

  function openConfirmInvoice(inv) {
    setConfirmDialog({ open: true, invoice: inv });
  }

  function closeConfirmInvoice() {
    setConfirmDialog({ open: false, invoice: null });
  }

  async function confirmInvoice() {
    const inv = confirmDialog.invoice;
    if (!inv) return;
    setConfirmingInvoice(true);
    try {
      await authFetch(`/api/admin/invoices/${inv.id}/confirm`, { method: 'POST' });
      toast.success('Pago confirmado');
      await load();
      closeConfirmInvoice();
    } catch (err) {
      toast.error(err.message || 'No se pudo confirmar');
    } finally {
      setConfirmingInvoice(false);
    }
  }

  useEffect(() => { load(); }, [token]);

  function openModal(sub = null) {
    if (sub) {
      setForm({
        id: sub.id,
        negocio_id: sub.negocio_id || '',
        plan_id: sub.plan_id || '',
        status: sub.status || 'active',
        trial_end: sub.trial_end ? sub.trial_end.slice(0, 10) : '',
        current_period_end: sub.current_period_end ? sub.current_period_end.slice(0, 10) : '',
        next_billing_date: sub.next_billing_date ? sub.next_billing_date.slice(0, 10) : '',
        meta: sub.meta ? JSON.stringify(sub.meta, null, 2) : ''
      });
    } else {
      setForm({ id: null, negocio_id: '', plan_id: planes[0]?.id || '', status: 'active', trial_end: '', current_period_end: '', next_billing_date: '', meta: '' });
    }
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.negocio_id || !form.plan_id) {
      toast.error('Selecciona negocio y plan');
      return;
    }
    setSaving(true);
    try {
      let metaParsed = null;
      if (form.meta && form.meta.trim()) {
        try { metaParsed = JSON.parse(form.meta); }
        catch (err) { toast.error('Meta debe ser JSON válido'); setSaving(false); return; }
      }
      const payload = {
        negocio_id: Number(form.negocio_id),
        plan_id: Number(form.plan_id),
        status: form.status,
        trial_end: form.trial_end || null,
        current_period_end: form.current_period_end || null,
        next_billing_date: form.next_billing_date || null,
        meta: metaParsed
      };
      let res;
      if (form.id) {
        res = await authFetch(`/api/admin/subscriptions/${form.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        toast.success('Suscripción actualizada');
      } else {
        res = await authFetch('/api/admin/subscriptions', { method: 'POST', body: JSON.stringify(payload) });
        toast.success('Suscripción creada');
      }
      const sub = res.subscription || res;
      setSubs(prev => {
        if (form.id) return prev.map(s => (s.id === form.id ? sub : s));
        return [sub, ...prev];
      });
      setModalOpen(false);
    } catch (err) {
      toast.error(err.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  const enriched = useMemo(() => subs.map(s => ({
    ...s,
    plan_nombre: s.plan_nombre || planes.find(p => p.id === s.plan_id)?.nombre,
    negocio_nombre: negocios.find(n => n.id === s.negocio_id)?.nombre
  })), [subs, planes, negocios]);

  return (
    <div className="max-w-6xl mx-auto space-y-5 text-slate-900">
      <div className="rounded-2xl border border-slate-200 bg-white shadow p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">SaaS</p>
          <h2 className="text-2xl font-bold">Suscripciones</h2>
          <p className="text-sm text-slate-500">Asigna planes a negocios y ajusta el estado de facturación.</p>
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
            <FiPlus /> Nueva suscripción
          </button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-sm font-semibold">{error}</div>}

      <div className="rounded-2xl border border-slate-200 bg-white shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Negocio</th>
              <th className="px-4 py-3 text-left font-semibold">Plan</th>
              <th className="px-4 py-3 text-left font-semibold">Estado</th>
              <th className="px-4 py-3 text-left font-semibold">Trial / Periodo</th>
              <th className="px-4 py-3 text-left font-semibold">Próxima facturación</th>
              <th className="px-4 py-3 text-left font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan="6" className="px-4 py-4">
                  <TableSkeleton rows={3} columns={6} height={12} />
                </td>
              </tr>
            )}
            {!loading && enriched.length === 0 && (
              <tr>
                <td colSpan="6" className="px-4 py-4 text-center text-slate-500">Sin suscripciones.</td>
              </tr>
            )}
            {!loading && enriched.map(sub => (
              <tr key={sub.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold text-slate-900">{sub.negocio_nombre || `Negocio ${sub.negocio_id}`}</td>
                <td className="px-4 py-3 text-slate-800">{sub.plan_nombre || `Plan ${sub.plan_id || '—'}`}</td>
                <td className="px-4 py-3 text-slate-700">{sub.status || '—'}</td>
                <td className="px-4 py-3 text-slate-700">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <FiCalendar /> Trial: {formatDate(sub.trial_end)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <FiCalendar /> Period end: {formatDate(sub.current_period_end)}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-700">{formatDate(sub.next_billing_date)}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => openModal(sub)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                  >
                    <FiEdit2 /> Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div>
            <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">Pagos reportados</p>
            <h3 className="text-lg font-bold text-slate-900">Pendientes de confirmación</h3>
          </div>
          <FiAlertTriangle className="text-amber-500" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Negocio</th>
                <th className="px-4 py-3 text-left font-semibold">Plan</th>
                <th className="px-4 py-3 text-left font-semibold">Monto</th>
                <th className="px-4 py-3 text-left font-semibold">Referencia</th>
                <th className="px-4 py-3 text-left font-semibold">Fecha</th>
                <th className="px-4 py-3 text-left font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pendingInvoices.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 py-4 text-center text-slate-500">Sin pagos pendientes.</td>
                </tr>
              )}
              {pendingInvoices.map(inv => {
                const meta = inv.meta || {};
                const referencia = meta.referencia || meta.reference || '—';
                const fechaPago = meta.fecha_pago || inv.created_at;
                const monto = formatMonto(inv.monto);
                return (
                  <tr key={inv.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-800">{inv.negocio_nombre || `Negocio ${inv.negocio_id}`}</td>
                    <td className="px-4 py-3 text-slate-700">{inv.plan_nombre || '—'}</td>
                    <td className="px-4 py-3 text-slate-800 font-semibold">{monto !== null ? `$${monto}` : '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{referencia}</td>
                    <td className="px-4 py-3 text-slate-700">{formatDate(fechaPago)}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openConfirmInvoice(inv)}
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                      >
                        <FiCheckCircle /> Confirmar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {confirmDialog.open && confirmDialog.invoice && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">Confirmar pago</p>
                <h3 className="text-lg font-bold text-slate-900">Pago reportado</h3>
              </div>
              <button className="text-slate-400 hover:text-slate-600" onClick={closeConfirmInvoice} aria-label="Cerrar">
                <FiX />
              </button>
            </div>

            <div className="space-y-1 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">{confirmDialog.invoice.negocio_nombre || `Negocio ${confirmDialog.invoice.negocio_id}`}</p>
              <p>Plan: {confirmDialog.invoice.plan_nombre || `Plan ${confirmDialog.invoice.plan_id || '—'}`}</p>
              <p>Monto: {formatMonto(confirmDialog.invoice.monto) ? `$${formatMonto(confirmDialog.invoice.monto)}` : '—'}</p>
              <p>Referencia: {(confirmDialog.invoice.meta || {}).referencia || (confirmDialog.invoice.meta || {}).reference || '—'}</p>
              <p>Fecha: {formatDate((confirmDialog.invoice.meta || {}).fecha_pago || confirmDialog.invoice.created_at)}</p>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={closeConfirmInvoice}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmInvoice}
                disabled={confirmingInvoice}
                className="rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm font-semibold shadow disabled:opacity-60"
              >
                {confirmingInvoice ? 'Confirmando...' : 'Confirmar pago'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">SaaS</p>
                <h3 className="text-xl font-bold">{form.id ? 'Editar suscripción' : 'Nueva suscripción'}</h3>
              </div>
              <button className="text-slate-400 hover:text-slate-600" onClick={() => setModalOpen(false)} aria-label="Cerrar">
                <FiX />
              </button>
            </div>

            <form className="space-y-3" onSubmit={handleSave}>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-semibold text-slate-700 space-y-1">
                  <span>Negocio</span>
                  <select
                    value={form.negocio_id}
                    onChange={e => setForm(f => ({ ...f, negocio_id: e.target.value }))}
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                  >
                    <option value="">Selecciona</option>
                    {negocios.map(n => (
                      <option key={n.id} value={n.id}>{n.nombre || `Negocio ${n.id}`}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-semibold text-slate-700 space-y-1">
                  <span>Plan</span>
                  <select
                    value={form.plan_id}
                    onChange={e => setForm(f => ({ ...f, plan_id: e.target.value }))}
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                  >
                    <option value="">Selecciona</option>
                    {planes.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-semibold text-slate-700 space-y-1">
                  <span>Estado</span>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                  >
                    <option value="active">active</option>
                    <option value="trialing">trialing</option>
                    <option value="past_due">past_due</option>
                    <option value="canceled">canceled</option>
                    <option value="incomplete">incomplete</option>
                  </select>
                </label>
                <label className="text-sm font-semibold text-slate-700 space-y-1">
                  <span>Próxima facturación</span>
                  <input
                    type="date"
                    value={form.next_billing_date}
                    onChange={e => setForm(f => ({ ...f, next_billing_date: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-semibold text-slate-700 space-y-1">
                  <span>Trial end</span>
                  <input
                    type="date"
                    value={form.trial_end}
                    onChange={e => setForm(f => ({ ...f, trial_end: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                  />
                </label>
                <label className="text-sm font-semibold text-slate-700 space-y-1">
                  <span>Current period end</span>
                  <input
                    type="date"
                    value={form.current_period_end}
                    onChange={e => setForm(f => ({ ...f, current_period_end: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                  />
                </label>
              </div>

              <label className="text-sm font-semibold text-slate-700 space-y-1">
                <span>Meta (JSON opcional)</span>
                <textarea
                  value={form.meta}
                  onChange={e => setForm(f => ({ ...f, meta: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                  rows={3}
                  placeholder='{"stripe_subscription_id":"..."}'
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
