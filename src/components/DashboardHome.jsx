import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import OpenTurnoCard from './OpenTurnoCard';
import Skeleton from './Skeleton';

function authFetch(path, opts = {}, token) {
  const API_BASE = import.meta.env.VITE_API_BASE || '';
  if (path.startsWith('/api/')) path = API_BASE + path;
  const headers = Object.assign({}, opts.headers || {});
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(path, Object.assign({}, opts, { headers, credentials: 'include' }));
}

function formatNumber(n) {
  const num = Number(n || 0);
  return num.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatMoney(n) {
  const num = Number(n || 0);
  return num.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
}

function formatDay(d) {
  if (!d) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) {
    const [y, m, day] = d.split('T')[0].split('-');
    return `${day}-${m}-${y}`;
  }
  try {
    return new Date(d).toLocaleDateString('es-AR');
  } catch (_) {
    return d;
  }
}

function formatDateTimeShort(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow">
      <p className="font-semibold text-slate-800">{label}</p>
      {payload.map(item => {
        const isMoney = item.dataKey !== 'tickets';
        const value = isMoney ? formatMoney(item.value) : formatNumber(item.value);
        return (
          <p key={item.dataKey} className="text-slate-600">
            {item.name || item.dataKey}: {value}
          </p>
        );
      })}
    </div>
  );
}

function Sparkline({ data, dataKey = 'value', color = '#0ea5e9', gradientId = 'spark' }) {
  if (!data || data.length < 2) return null;

  return (
    <div className="h-14">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, left: 0, right: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey={dataKey} stroke={color} fill={`url(#${gradientId})`} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function SummaryCard({ title, value, subtitle, sparkData, gradientId, color = '#0ea5e9' }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow p-4 space-y-3">
      <div>
        <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">{title}</p>
        <h3 className="text-2xl font-extrabold mt-2">{value}</h3>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {sparkData?.length > 1 && <Sparkline data={sparkData} dataKey="value" color={color} gradientId={gradientId} />}
    </div>
  );
}

function ChartSection({ title, hint, loading, hasData, skeletonHeight = 'h-[280px]', emptyText = 'Sin datos en el rango.', children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">{title}</p>
        {hint && <span className="text-xs text-slate-500">{hint}</span>}
      </div>
      {loading ? (
        <Skeleton className={`${skeletonHeight} w-full rounded-xl`} />
      ) : hasData ? (
        children
      ) : (
        <p className="text-sm text-slate-500">{emptyText}</p>
      )}
    </div>
  );
}

function SeverityBadge({ severidad }) {
  const tone = (severidad || '').toLowerCase();
  const base = 'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold border';
  if (tone === 'alta' || tone === 'alta2' || tone === 'critica') {
    return <span className={`${base} border-rose-200 bg-rose-50 text-rose-700`}>Alta</span>;
  }
  if (tone === 'media') {
    return <span className={`${base} border-amber-200 bg-amber-50 text-amber-700`}>Media</span>;
  }
  return <span className={`${base} border-slate-200 bg-slate-50 text-slate-700`}>Info</span>;
}

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function StatusPill({ estado }) {
  const isOpen = estado === 'abierta';
  const base = 'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold';
  if (isOpen) return <span className={`${base} border-emerald-200 bg-emerald-50 text-emerald-700`}>Caja abierta</span>;
  if (!estado) return <span className={`${base} border-slate-200 bg-slate-50 text-slate-600`}>Sin caja</span>;
  return <span className={`${base} border-slate-200 bg-slate-50 text-slate-700`}>{estado}</span>;
}

function Metric({ label, value, tone = 'default', hint }) {
  const toneClass = tone === 'danger' ? 'text-rose-700' : tone === 'muted' ? 'text-slate-600' : 'text-slate-900';
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-3">
      <p className="text-[11px] uppercase tracking-tight text-slate-500 font-semibold">{label}</p>
      <p className={`text-lg font-bold ${toneClass}`}>{value}</p>
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

function AlertsPanel({ token, user }) {
  const isSuperadmin = user?.rol === 'superadmin';
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadAlerts = useCallback(async () => {
    if (!token || isSuperadmin) return;
    setLoading(true);
    setError('');
    try {
      const res = await authFetch('/api/alertas?estado=pending', {}, token);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'No se pudieron cargar alertas');
      }
      const data = await res.json();
      setAlerts(Array.isArray(data) ? data : []);
      setLastUpdated(new Date());
    } catch (e) {
      setAlerts([]);
      setError(e.message || 'No se pudieron cargar alertas');
    } finally {
      setLoading(false);
    }
  }, [token, isSuperadmin]);

  useEffect(() => {
    if (!token || isSuperadmin) return undefined;
    loadAlerts();
    const id = setInterval(() => loadAlerts(), 30000);
    return () => clearInterval(id);
  }, [token, isSuperadmin, loadAlerts]);

  if (isSuperadmin) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">Alertas</p>
          <h3 className="text-xl font-bold">Salud de stock y ventas</h3>
          <p className="text-sm text-slate-500">Solo en pantalla. Sin correo ni Slack.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
          {lastUpdated && <span>Actualizado {formatDateTimeShort(lastUpdated)}</span>}
          <button
            type="button"
            onClick={loadAlerts}
            disabled={loading}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
          >
            {loading ? 'Actualizando…' : 'Refrescar'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-800 px-3 py-2 text-sm font-semibold flex items-center gap-3">
          <span>{error}</span>
          <button
            type="button"
            onClick={loadAlerts}
            className="rounded-lg border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-50"
          >
            Reintentar
          </button>
        </div>
      )}

      <div className="space-y-3">
        {alerts.length === 0 && !loading && !error && (
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Sin alertas activas. Mantén mínimos de stock y revisa rotación.
          </div>
        )}

        {alerts.map(alerta => {
          const tipo = alerta.tipo || 'Alerta';
          const severidad = alerta.severidad || alerta.severity || 'media';
          const msg = alerta.mensaje || alerta.message || alerta.detalle || 'Revisar condición';
          const meta = alerta.meta || alerta.metadata || {};
          const producto = alerta.producto || meta.producto || meta.producto_nombre;
          const local = alerta.local || meta.local || meta.local_nombre;
          const created = alerta.created_at || alerta.fecha || alerta.fecha_creacion;

          return (
            <div key={alerta.id || `${tipo}-${msg}`} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <SeverityBadge severidad={severidad} />
                  <span className="text-xs font-semibold uppercase tracking-tight text-slate-500">{tipo}</span>
                  {producto && <span className="text-xs font-semibold text-slate-600">· {producto}</span>}
                  {local && <span className="text-xs font-semibold text-slate-500">· {local}</span>}
                </div>
                <p className="text-sm font-semibold text-slate-900">{msg}</p>
                <p className="text-xs text-slate-600">
                  {meta?.detalle || meta?.detalle_extra || meta?.motivo || ''}
                </p>
              </div>
              <div className="text-xs text-slate-500 font-semibold">
                {created ? formatDateTimeShort(created) : ''}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(n => (
              <Skeleton key={n} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CajaAbiertaCard({ token, user }) {
  const isSuperadmin = user?.rol === 'superadmin';
  const [locales, setLocales] = useState([]);
  const [localId, setLocalId] = useState(user?.local_id ? String(user.local_id) : '');
  const [turno, setTurno] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [hasCaja, setHasCaja] = useState(false);
  const lastFetchTargetRef = useRef(null);

  useEffect(() => {
    if (!token || isSuperadmin) return;
    async function loadLocales() {
      try {
        const res = await authFetch('/api/locales', {}, token);
        if (!res.ok) return;
        const data = await res.json();
        setLocales(Array.isArray(data) ? data : []);
        const preferred = user?.local_id ? String(user.local_id) : data?.[0]?.id ? String(data[0].id) : '';
        if (!localId && preferred) setLocalId(preferred);
      } catch (_) {
        // Ignorar para no romper el dashboard
      }
    }
    loadLocales();
  }, [token, isSuperadmin, user?.local_id]);

  const fetchCaja = useCallback(async (targetLocal, silent = false) => {
    if (!token || !targetLocal) return false;
    if (!silent) setLoading(true);
    setError('');
    try {
      const fecha = todayStr();
      const resTurnos = await authFetch(`/api/caja/turnos/${targetLocal}?fecha=${fecha}`, {}, token);
      if (resTurnos.status === 404) {
        setTurno(null);
        setMovimientos([]);
        setError('No hay caja abierta para hoy en este local');
        setLastUpdated(new Date());
        setHasCaja(false);
        return false;
      }
      if (!resTurnos.ok) {
        const txt = await resTurnos.text();
        throw new Error(txt || 'No se pudo obtener la caja');
      }
      const data = await resTurnos.json();
      const abierta = (data?.turnos || []).find(t => t.estado === 'abierta');
      if (!abierta) {
        setTurno(null);
        setMovimientos([]);
        setError('No hay caja abierta para hoy en este local');
        setLastUpdated(new Date());
        setHasCaja(false);
        return false;
      }

      const movRes = await authFetch(`/api/caja/movimientos/${abierta.turno_id}`, {}, token);
      if (!movRes.ok) {
        const txt = await movRes.text();
        throw new Error(txt || 'No se pudo obtener los movimientos de caja');
      }
      const movData = await movRes.json();
      setTurno(movData?.turno || abierta);
      setMovimientos(movData?.movimientos || []);
      setLastUpdated(new Date());
      setHasCaja(true);
      return true;
    } catch (e) {
      setError(e.message || 'No se pudo cargar la caja');
      setTurno(null);
      setMovimientos([]);
      setHasCaja(false);
      return false;
    } finally {
      if (!silent) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token || isSuperadmin) return;
    const target = user?.local_id ? String(user.local_id) : localId;
    if (!target) return;
    if (lastFetchTargetRef.current === target) return; // evita doble llamada en StrictMode
    lastFetchTargetRef.current = target;
    let intervalId = null;
    fetchCaja(target).then((hasCaja) => {
      if (hasCaja) {
        intervalId = setInterval(() => fetchCaja(target, true), 15000);
      }
    });
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [token, isSuperadmin, user?.local_id, localId, fetchCaja]);

  const totals = useMemo(() => {
    const base = { VENTA: 0, INGRESO: 0, GASTO: 0, EGRESO: 0, SUELDO: 0, AJUSTE: 0 };
    movimientos.forEach(m => {
      const key = m.tipo || 'OTRO';
      const val = Number(m.monto || 0);
      if (base[key] === undefined) base[key] = 0;
      base[key] += val;
    });
    return base;
  }, [movimientos]);

  const ingresos = useMemo(() => totals.VENTA + totals.INGRESO, [totals]);
  const egresos = useMemo(() => totals.GASTO + totals.EGRESO + totals.SUELDO, [totals]);
  const teorico = useMemo(() => Number(turno?.monto_inicial || 0) + ingresos - egresos + totals.AJUSTE, [turno, ingresos, egresos, totals]);
  const diferencia = useMemo(() => (turno?.monto_final !== null && turno?.monto_final !== undefined ? Number(turno.monto_final) - teorico : null), [turno, teorico]);

  if (isSuperadmin) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold">Caja abierta</h3>
        </div>
        <div className="flex items-center gap-3">
          <StatusPill estado={turno?.estado} />
          {lastUpdated && <span className="text-xs font-semibold text-slate-500">Actualizado {formatDateTimeShort(lastUpdated)}</span>}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm font-semibold text-slate-700 space-y-1">
          <span className="block">Local</span>
          <select
            value={user?.local_id ? String(user.local_id) : localId}
            onChange={e => setLocalId(e.target.value)}
            disabled={Boolean(user?.local_id)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
          >
            <option value="">Selecciona</option>
            {locales.map(l => (
              <option key={l.id} value={l.id}>{l.nombre}</option>
            ))}
          </select>
        </label>
        <div className="text-xs text-slate-500 font-semibold">Caja: {formatMoney(teorico)}</div>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-800 px-3 py-2 text-sm font-semibold flex items-center gap-3">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => {
              const target = user?.local_id ? String(user.local_id) : localId;
              if (!target) return;
              fetchCaja(target, false);
            }}
            className="rounded-lg border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-50"
          >
            Reintentar
          </button>
        </div>
      )}

      {loading && !turno && (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      )}

      {!turno && !loading && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">No hay caja abierta</p>
            <p className="text-sm text-slate-600">Abre la caja desde POS para ver los movimientos aquí.</p>
          </div>
          <div className="flex items-center gap-2">
            <a className="inline-flex items-center gap-2 rounded-full bg-slate-900 text-white font-semibold px-3 py-2 text-sm" href="/pos">Ir al POS</a>
            {!hasCaja && (
              <button
                type="button"
                onClick={() => {
                  const target = user?.local_id ? String(user.local_id) : localId;
                  if (!target) return;
                  fetchCaja(target, false);
                }}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white text-slate-800 font-semibold px-3 py-2 text-sm hover:bg-slate-50"
              >
                Reintentar
              </button>
            )}
          </div>
        </div>
      )}

      {turno && (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Metric label="Teórico en caja" value={formatMoney(teorico)} />
            <Metric label="Ventas" value={formatMoney(totals.VENTA)} />
            <Metric label="Otros ingresos" value={formatMoney(totals.INGRESO)} />
            <Metric label="Gastos" value={formatMoney(totals.GASTO)} tone="danger" />
            <Metric label="Egresos y sueldos" value={formatMoney(totals.EGRESO + totals.SUELDO)} tone="danger" />
            <Metric label="Ajustes" value={formatMoney(totals.AJUSTE)} tone={totals.AJUSTE < 0 ? 'danger' : 'default'} />
            <Metric label="Monto inicial" value={formatMoney(turno.monto_inicial)} tone="muted" />
            {turno.monto_final !== null && turno.monto_final !== undefined && (
              <Metric label="Monto final ingresado" value={formatMoney(turno.monto_final)} />
            )}
            {diferencia !== null && (
              <Metric label="Diferencia" value={formatMoney(diferencia)} tone={Math.abs(diferencia) > 0.5 ? 'danger' : 'default'} />
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border border-slate-100 bg-slate-50 rounded-xl px-4 py-3">
            <div className="text-sm text-slate-700 space-y-1">
              <p className="font-semibold">Caja #{turno.id || turno.turno_id}</p>
              <p>Abierta por {turno.usuario || 'usuario'} · Apertura {turno.hora_apertura ? formatDateTimeShort(turno.hora_apertura) : '—'}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a className="inline-flex items-center gap-2 rounded-full bg-slate-900 text-white font-semibold px-3 py-2 text-sm" href="/pos">Ir al POS</a>
              <a className="inline-flex items-center gap-2 rounded-full bg-slate-900/10 text-slate-800 font-semibold px-3 py-2 text-sm border border-slate-300" href={`/caja/${turno.turno_id || turno.id}`}>Ver detalle</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardHome() {
  const { token, user } = useAuth();
  const isSuperadmin = user?.rol === 'superadmin';
  const [kpis, setKpis] = useState({ ventas_por_dia: [], ventas_por_hora: [], ticket_promedio: {}, margen: {} });
  const [filters, setFilters] = useState({ desde: '', hasta: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [topPromos, setTopPromos] = useState([]);
  const [promosLoading, setPromosLoading] = useState(false);

  useEffect(() => {
    if (!isSuperadmin) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperadmin]);

  async function loadData() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.desde) params.set('desde', filters.desde);
      if (filters.hasta) params.set('hasta', filters.hasta);
      const url = `/api/reportes/kpis${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await authFetch(url, {}, token);
      if (!res.ok) {
        throw new Error(`No se pudieron cargar KPIs (${res.status})`);
      }
      const data = await res.json();
      setKpis(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token || isSuperadmin) return;
    const today = new Date();
    const start = new Date(today);
    start.setMonth(start.getMonth() - 1);
    const desde = start.toISOString().slice(0, 10);
    const hasta = today.toISOString().slice(0, 10);

    async function loadPromos() {
      setPromosLoading(true);
      try {
        const params = new URLSearchParams({ desde, hasta });
        const res = await authFetch(`/api/reportes/promociones?${params.toString()}`, {}, token);
        if (!res.ok) throw new Error('No se pudieron cargar las promociones');
        const data = await res.json();
        setTopPromos(Array.isArray(data) ? data.slice(0, 5) : []);
      } catch (_) {
        setTopPromos([]);
      } finally {
        setPromosLoading(false);
      }
    }

    loadPromos();
  }, [token, isSuperadmin]);

  const totalDia = useMemo(() => {
    return (kpis.ventas_por_dia || []).reduce((acc, row) => acc + Number(row.total_dia || 0), 0);
  }, [kpis]);

  const totalTickets = useMemo(() => {
    return (kpis.ventas_por_dia || []).reduce((acc, row) => acc + Number(row.tickets || 0), 0);
  }, [kpis]);

  const margenPct = useMemo(() => {
    const m = kpis.margen || {};
    if (m.margen_bruto === null || m.margen_bruto === undefined) return null;
    return (Number(m.margen_bruto) * 100).toFixed(1);
  }, [kpis]);

  const ventasDiaData = useMemo(() => (
    (kpis.ventas_por_dia || []).map(row => ({
      label: formatDay(row.dia),
      raw: row.dia,
      total: Number(row.total_dia || 0),
      tickets: Number(row.tickets || 0),
      value: Number(row.total_dia || 0),
    }))
  ), [kpis]);

  const ventasHoraData = useMemo(() => (
    (kpis.ventas_por_hora || []).map(row => ({
      label: `${row.hora}:00`,
      hora: row.hora,
      total: Number(row.total_hora || 0),
      value: Number(row.total_hora || 0),
    }))
  ), [kpis]);

  const showSkeleton = loading && !error;

  const ticketSparkData = useMemo(() => ventasDiaData.map(d => ({ label: d.label, value: d.tickets })), [ventasDiaData]);
  const horaSparkData = useMemo(() => ventasHoraData.map(d => ({ label: d.label, value: d.total })), [ventasHoraData]);

  if (isSuperadmin) {
    return (
      <div className="max-w-4xl mx-auto space-y-5 text-slate-900">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xl p-5 flex flex-col gap-2">
          <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">Hola {user?.nombre || user?.email || 'superadmin'}</p>
          <h2 className="text-2xl font-bold">Panel para superadmin</h2>
          <p className="text-sm text-slate-600">Este dashboard de KPIs es para negocios. Usá los accesos rápidos para gestión global.</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <a className="inline-flex items-center gap-2 rounded-full bg-slate-900 text-white font-semibold px-3 py-2 text-sm" href="/admin">Panel superadmin</a>
            <a className="inline-flex items-center gap-2 rounded-full bg-slate-900 text-white font-semibold px-3 py-2 text-sm" href="/novedades">Novedades</a>
            <a className="inline-flex items-center gap-2 rounded-full bg-slate-900 text-white font-semibold px-3 py-2 text-sm" href="/api/docs" target="_blank" rel="noreferrer">API docs</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5 text-slate-900">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xl p-5 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">Hola {user?.nombre || user?.email || 'usuario'}</p>
          <h2 className="text-2xl font-bold">Inicio</h2>
          <p className="text-sm text-slate-500">Resumen rápido del negocio y locales.</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm font-semibold text-slate-600 space-y-1">
            <span className="block">Desde</span>
            <input
              type="date"
              value={filters.desde}
              onChange={e => setFilters(f => ({ ...f, desde: e.target.value }))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
            />
          </label>
          <label className="text-sm font-semibold text-slate-600 space-y-1">
            <span className="block">Hasta</span>
            <input
              type="date"
              value={filters.hasta}
              onChange={e => setFilters(f => ({ ...f, hasta: e.target.value }))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
            />
          </label>
          <button
            onClick={loadData}
            disabled={loading}
            className="rounded-xl bg-slate-900 text-white font-semibold px-4 py-2.5 shadow-lg shadow-slate-900/20 transition hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? 'Cargando...' : 'Aplicar'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm font-semibold">
          {error}
        </div>
      )}

      <CajaAbiertaCard token={token} user={user} />

      <AlertsPanel token={token} user={user} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {showSkeleton ? (
          <>
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="rounded-2xl border border-slate-200 bg-white shadow p-4 space-y-3">
                <Skeleton className="h-3 w-24 rounded-full" />
                <Skeleton className="h-7 w-32 rounded-full" />
                <Skeleton className="h-4 w-28 rounded-full" />
                <Skeleton className="h-14 w-full rounded-xl" />
              </div>
            ))}
          </>
        ) : (
          <>
            <SummaryCard
              title="Ventas (rango)"
              value={formatMoney(totalDia)}
              subtitle={`Tickets: ${formatNumber(totalTickets)}`}
              sparkData={ventasDiaData}
              gradientId="ventasSpark"
              color="#0284c7"
            />
            <SummaryCard
              title="Ticket promedio"
              value={formatMoney(kpis.ticket_promedio?.ticket_promedio || 0)}
              subtitle={`Total: ${formatMoney(kpis.ticket_promedio?.total || 0)}`}
              sparkData={ticketSparkData}
              gradientId="ticketSpark"
              color="#7c3aed"
            />
            <SummaryCard
              title="Margen bruto"
              value={margenPct !== null ? `${margenPct}%` : '—'}
              subtitle={`Ingreso: ${formatMoney(kpis.margen?.ingreso_total || 0)}`}
              sparkData={ventasDiaData}
              gradientId="margenSpark"
              color="#059669"
            />
            <SummaryCard
              title="Horas pico"
              value={ventasHoraData.length ? 'Ver distribución' : '—'}
              subtitle="Distribución por hora"
              sparkData={horaSparkData}
              gradientId="horaSpark"
              color="#f97316"
            />
          </>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">Promociones más vendidas (último mes)</p>
          {promosLoading && <span className="text-xs text-slate-500">Cargando...</span>}
        </div>
        {promosLoading ? (
          <Skeleton className="h-16 w-full rounded-xl" />
        ) : topPromos.length === 0 ? (
          <p className="text-sm text-slate-500">Sin ventas de promociones en el último mes.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {topPromos.map((p, idx) => (
              <div key={p.promocion_id || idx} className="flex items-center justify-between py-3">
                <div className="space-y-1">
                  <p className="font-semibold text-slate-900">{p.promocion || `Promo ${p.promocion_id}`}</p>
                  <p className="text-xs text-slate-500">Tickets: {formatNumber(p.tickets || 0)} · Total: {formatMoney(p.total_bruto || 0)}</p>
                </div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <span className="rounded-full bg-sky-100 text-sky-800 px-3 py-1">{formatNumber(p.cantidad_total || 0)} uds</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ChartSection
          title="Ventas por día"
          hint="Últimos datos"
          loading={showSkeleton}
          hasData={ventasDiaData.length > 0}
        >
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ventasDiaData} margin={{ left: -10, right: 10 }}>
                <defs>
                  <linearGradient id="ventasDiaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0284c7" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} tickMargin={8} />
                <YAxis tickFormatter={v => formatNumber(v)} tick={{ fontSize: 12 }} width={70} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="total" name="Ventas" stroke="#0284c7" fill="url(#ventasDiaGradient)" strokeWidth={2} />
                <Area type="monotone" dataKey="tickets" name="Tickets" stroke="#7c3aed" fillOpacity={0} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartSection>

        <ChartSection
          title="Ventas por hora"
          hint="Distribución"
          loading={showSkeleton}
          hasData={ventasHoraData.length > 0}
        >
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ventasHoraData} margin={{ left: -10, right: 10 }}>
                <defs>
                  <linearGradient id="ventasHoraGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#f97316" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} tickMargin={8} />
                <YAxis tickFormatter={v => formatNumber(v)} tick={{ fontSize: 12 }} width={70} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="total" name="Ventas" fill="url(#ventasHoraGradient)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartSection>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <OpenTurnoCard />

        <div className="rounded-2xl border border-slate-200 bg-white shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">Accesos rápidos</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {user?.rol !== 'superadmin' && <a className="inline-flex items-center gap-2 rounded-full bg-slate-900/10 text-slate-800 font-semibold px-3 py-2 text-sm border border-slate-300" href="/pos">Ir al POS</a>}
            {user?.rol === 'admin' && <a className="inline-flex items-center gap-2 rounded-full bg-slate-900/10 text-slate-800 font-semibold px-3 py-2 text-sm border border-slate-300" href="/config">Configuración</a>}
            {user?.rol === 'superadmin' && <a className="inline-flex items-center gap-2 rounded-full bg-slate-900/10 text-slate-800 font-semibold px-3 py-2 text-sm border border-slate-300" href="/admin">Panel superadmin</a>}
            {(user?.rol === 'admin' || user?.rol === 'superadmin') && <a className="inline-flex items-center gap-2 rounded-full bg-slate-900 text-white font-semibold px-3 py-2 text-sm" href="/novedades">Novedades</a>}
            <a className="inline-flex items-center gap-2 rounded-full bg-slate-900 text-white font-semibold px-3 py-2 text-sm" href="/api/docs" target="_blank" rel="noreferrer">API docs</a>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">Notas</p>
          </div>
          <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
            <li>Aplica un rango de fechas para ver KPIs.</li>
            <li>Los roles admin/superadmin pueden filtrar todos los locales de su negocio.</li>
            <li>Usa el POS para registrar ventas y ver los cambios aquí.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
