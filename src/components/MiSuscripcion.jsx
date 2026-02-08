import React, { useEffect, useMemo, useState } from 'react';
import { FiAlertTriangle, FiCreditCard, FiRefreshCcw, FiSend, FiShield } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-AR', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatMoney(value) {
  const n = Number(value || 0);
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
}

export default function MiSuscripcion() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ monto: '', referencia: '', fecha_pago: '' });

  async function authFetch(url, options = {}) {
    const API_BASE = import.meta.env.VITE_API_BASE || '';
    if (url.startsWith('/api/')) url = API_BASE + url;
    const headers = { ...(options.headers || {}), Authorization: token ? `Bearer ${token}` : undefined };
    if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const res = await fetch(url, { ...options, headers });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = json.message || json.error || 'Error de red';
      throw new Error(message);
    }
    return json;
  }

  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      const res = await authFetch('/api/subscription/me');
      setData(res);
      if (res?.plan?.precio != null) {
        const planAmount = Number(res.plan.precio) || 0;
        setForm(f => ({ ...f, monto: planAmount.toString() }));
      }
    } catch (err) {
      toast.error(err.message || 'No se pudo cargar la suscripción');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [token]);

  const alert = data?.alert;
  const subscription = data?.subscription;
  const plan = data?.plan;

  async function handleReportPayment(e) {
    e.preventDefault();
    if (!form.monto) return toast.error('Ingresa un monto');
    setSaving(true);
    try {
      await authFetch('/api/subscription/me/report-payment', {
        method: 'POST',
        body: JSON.stringify({
          monto: Number(form.monto),
          referencia: form.referencia || undefined,
          fecha_pago: form.fecha_pago || undefined
        })
      });
      toast.success('Pago informado. Pendiente de confirmación.');
      setForm({ monto: '', referencia: '', fecha_pago: '' });
      await load();
    } catch (err) {
      toast.error(err.message || 'No se pudo informar el pago');
    } finally {
      setSaving(false);
    }
  }

  const statusBadge = useMemo(() => {
    const status = (subscription?.status || '—').toLowerCase();
    const map = {
      active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      trial: 'bg-sky-100 text-sky-800 border-sky-200',
      trialing: 'bg-sky-100 text-sky-800 border-sky-200',
      past_due: 'bg-amber-100 text-amber-800 border-amber-200',
      cancelled: 'bg-rose-100 text-rose-800 border-rose-200'
    };
    const cls = map[status] || 'bg-slate-100 text-slate-700 border-slate-200';
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${cls}`}>
        {status}
      </span>
    );
  }, [subscription]);

  return (
    <div className="max-w-4xl mx-auto space-y-4 text-slate-900">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">Suscripción</p>
          <h1 className="text-2xl font-bold">Mi suscripción</h1>
          <p className="text-sm text-slate-500">Consulta tu plan activo, fechas y reporta un pago para renovación.</p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow hover:bg-slate-50 disabled:opacity-60"
        >
          {loading ? <FiRefreshCcw className="animate-spin" /> : <FiRefreshCcw />} Recargar
        </button>
      </div>

      {alert?.show && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 flex items-start gap-3">
          <FiAlertTriangle className="mt-0.5" />
          <div>
            <p className="font-semibold">{alert.message}</p>
            <p className="text-sm text-amber-700">Renueva o informa tu pago para evitar interrupciones.</p>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white shadow p-4 space-y-3">
          <div className="flex items-center gap-2">
            <FiShield className="text-slate-500" />
            <div>
              <p className="text-xs uppercase text-slate-500 font-semibold">Plan</p>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{plan?.nombre || 'Sin plan'}</h2>
                {statusBadge}
              </div>
            </div>
          </div>

          <div className="space-y-1 text-sm text-slate-700">
            <p><span className="font-semibold">Precio: </span>{plan ? formatMoney(plan.precio) : '—'} / {plan?.intervalo || '—'}</p>
            <p><span className="font-semibold">Periodo actual: </span>{formatDate(subscription?.start_date)} — {formatDate(subscription?.current_period_end || subscription?.trial_end)}</p>
            <p><span className="font-semibold">Próximo cobro: </span>{formatDate(subscription?.next_billing_date)}</p>
            <p><span className="font-semibold">Negocio creado: </span>{formatDate(data?.negocio?.creado_en)}</p>
          </div>

          <div className="space-y-1 text-sm text-slate-600">
            <p className="font-semibold">Features incluidas:</p>
            <div className="flex flex-wrap gap-2">
              {Array.isArray(plan?.features) && plan.features.length > 0
                ? plan.features.map(f => (
                    <span key={f} className="px-2 py-1 rounded-full border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700">{f}</span>
                  ))
                : <span className="text-slate-500 text-xs">No configuradas</span>}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow p-4 space-y-3">
          <div className="flex items-center gap-2">
            <FiCreditCard className="text-slate-500" />
            <div>
              <p className="text-xs uppercase text-slate-500 font-semibold">Reportar pago</p>
              <h2 className="text-lg font-bold">Informe de pago</h2>
              <p className="text-sm text-slate-500">Enviaremos este reporte a superadmin para confirmación.</p>
            </div>
          </div>

          <form className="space-y-3" onSubmit={handleReportPayment}>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Monto</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.monto}
                onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                readOnly
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Referencia / comprobante</label>
              <input
                type="text"
                value={form.referencia}
                onChange={e => setForm(f => ({ ...f, referencia: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Fecha de pago (opcional)</label>
              <input
                type="date"
                value={form.fecha_pago}
                onChange={e => setForm(f => ({ ...f, fecha_pago: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 text-white px-3 py-2 text-sm font-semibold shadow hover:bg-slate-800 disabled:opacity-60"
            >
              {saving ? <FiSend className="animate-pulse" /> : <FiSend />} {saving ? 'Enviando...' : 'Informar pago'}
            </button>
          </form>

          {data?.lastInvoice && (
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <p className="font-semibold">Último reporte</p>
              <p>ID: {data.lastInvoice.id} · Monto: {formatMoney(data.lastInvoice.monto)}</p>
              <p>Fecha: {formatDate(data.lastInvoice.created_at)} · Estado: {data.lastInvoice.pagado ? 'Confirmado' : 'Pendiente'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
