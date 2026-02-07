import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiArrowRight, FiCheckCircle, FiClock, FiExternalLink, FiInfo, FiLoader, FiXCircle, FiMinusCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Skeleton from './Skeleton';

function authFetch(path, opts = {}, token) {
  return fetch(path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
      Authorization: token ? `Bearer ${token}` : undefined,
    },
  });
}

function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

function formatCurrency(value) {
  const n = Number(value || 0);
  return n.toLocaleString(undefined, { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 });
}

function StatusPill({ estado }) {
  const isCerrada = estado === 'cerrada';
  const isAbierta = estado === 'abierta';
  const color = isCerrada ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : isAbierta ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-700 border-slate-200';
  const Icon = isCerrada ? FiCheckCircle : FiClock;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${color}`}>
      <Icon />
      {estado || '—'}
    </span>
  );
}

const TABS = [
  { id: 'all', label: 'Detalle de movimientos' },
  { id: 'VENTA', label: 'Comandas' },
  { id: 'GASTO', label: 'Gastos' },
  { id: 'INGRESO', label: 'Ingresos' },
  { id: 'EGRESO', label: 'Egresos' },
  { id: 'SUELDO', label: 'Sueldos' },
];

export default function CajaDetalle() {
  const { turnoId } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();
  const { token } = useAuth();

  const [turno, setTurno] = useState(state?.turno || null);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [ventaDetalle, setVentaDetalle] = useState(null);
  const [ventaLoading, setVentaLoading] = useState(false);
  const [ventaError, setVentaError] = useState('');
  const [gastoForm, setGastoForm] = useState({ descripcion: '', monto: '' });
  const [gastoSaving, setGastoSaving] = useState(false);

  useEffect(() => {
    async function fetchDetalle() {
      setLoading(true);
      setError('');
      try {
        const res = await authFetch(`/api/caja/movimientos/${turnoId}`, {}, token);
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || 'No se pudo obtener el detalle de caja');
        }
        const data = await res.json();
        setTurno(data?.turno || state?.turno || null);
        setMovimientos(data?.movimientos || []);
      } catch (err) {
        setError(err.message || 'Error al cargar detalle');
        toast.error(err.message || 'Error al cargar detalle');
      } finally {
        setLoading(false);
      }
    }
    fetchDetalle();
  }, [token, turnoId, state?.turno]);

  const totals = useMemo(() => {
    const base = { VENTA: 0, GASTO: 0, INGRESO: 0, EGRESO: 0, SUELDO: 0, AJUSTE: 0 };
    movimientos.forEach(m => {
      const key = m.tipo || 'OTRO';
      const amount = Number(m.monto || 0);
      if (base[key] === undefined) base[key] = 0;
      base[key] += amount;
    });
    return base;
  }, [movimientos]);

  const ingresosConVentas = useMemo(() => totals.VENTA + totals.INGRESO, [totals]);

  const totalTeorico = useMemo(() => {
    const inicial = Number(turno?.monto_inicial || 0);
    return inicial + totals.VENTA + totals.INGRESO - totals.GASTO - totals.EGRESO - totals.SUELDO + totals.AJUSTE;
  }, [turno, totals]);

  const displayedMovs = useMemo(() => {
    if (activeTab === 'all') return movimientos;
    return movimientos.filter(m => m.tipo === activeTab);
  }, [movimientos, activeTab]);

  async function handleRegistrarGasto(e) {
    e.preventDefault();
    if (!gastoForm.monto) {
      toast.error('Ingresa un monto');
      return;
    }
    setGastoSaving(true);
    try {
      const res = await authFetch('/api/caja/gasto', {
        method: 'POST',
        body: JSON.stringify({
          turno_id: Number(turnoId),
          monto: Number(gastoForm.monto),
          descripcion: gastoForm.descripcion || 'Gasto manual'
        })
      }, token);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'No se pudo registrar el gasto');
      }
      toast.success('Gasto registrado');
      setGastoForm({ descripcion: '', monto: '' });
      // Reload movimientos
      const detalle = await authFetch(`/api/caja/movimientos/${turnoId}`, {}, token);
      if (detalle.ok) {
        const data = await detalle.json();
        setMovimientos(data?.movimientos || []);
        setTurno(data?.turno || turno);
      }
    } catch (err) {
      toast.error(err.message || 'Error al registrar gasto');
    } finally {
      setGastoSaving(false);
    }
  }

  function TabButton({ tab }) {
    const isActive = activeTab === tab.id;
    return (
      <button
        type="button"
        onClick={() => setActiveTab(tab.id)}
        className={`px-3 py-2 text-sm font-semibold rounded-lg border transition ${isActive ? 'bg-sky-100 text-sky-700 border-sky-200' : 'text-slate-600 border-transparent hover:bg-slate-50'}`}
      >
        {tab.label}
      </button>
    );
  }

  function SummaryRow({ label, value, targetTab, accent = 'text-slate-900' }) {
    return (
      <div className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-50 transition">
        <div>
          <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">{label}</p>
          <p className={`text-lg font-bold ${accent}`}>{formatCurrency(value)}</p>
        </div>
        {targetTab && (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-sm font-semibold text-sky-600 hover:text-sky-700"
            onClick={() => setActiveTab(targetTab)}
          >
            Ver detalle <FiArrowRight />
          </button>
        )}
      </div>
    );
  }

  function MovementCard({ mov }) {
    const ventaIdFromDesc = () => {
      const match = (mov.descripcion || '').match(/Venta\s+(\d+)/i);
      return match ? Number(match[1]) : NaN;
    };

    async function handleVerProductos() {
      const ventaId = ventaIdFromDesc();
      if (!ventaId || Number.isNaN(ventaId)) {
        toast.error('No se pudo identificar la venta');
        return;
      }
      setVentaLoading(true);
      setVentaError('');
      try {
        const res = await authFetch(`/api/ventas/${ventaId}`, {}, token);
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || 'No se pudo obtener la venta');
        }
        const data = await res.json();
        setVentaDetalle({ ...data, venta_id: data.venta_id || ventaId });
      } catch (err) {
        setVentaError(err.message || 'Error al cargar venta');
        toast.error(err.message || 'Error al cargar venta');
      } finally {
        setVentaLoading(false);
      }
    }

    return (
      <div className="rounded-xl border border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900">{mov.descripcion || 'Movimiento'}</p>
          <p className="text-xs text-slate-500">{formatDateTime(mov.fecha)}</p>
          <p className="text-xs text-slate-500">Tipo: {mov.tipo || '—'}</p>
        </div>
        <div className="text-right">
          <p className="text-base font-bold text-slate-900">{formatCurrency(mov.monto)}</p>
          {mov.usuario_id && <p className="text-xs text-slate-500">Usuario #{mov.usuario_id}</p>}
          {mov.tipo === 'VENTA' && (
            <button
              type="button"
              onClick={handleVerProductos}
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700"
              disabled={ventaLoading}
            >
              {ventaLoading ? 'Cargando...' : 'Ver productos'} <FiExternalLink />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5 text-slate-900">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            <FiArrowLeft /> Volver
          </button>
          <div>
            <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">Ventas · Caja</p>
            <h2 className="text-2xl font-bold">Caja #{turnoId}</h2>
          </div>
        </div>
        <StatusPill estado={turno?.estado} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-900">Turno de caja</p>
            <p className="text-sm text-slate-600">{turno?.usuario ? `Usuario: ${turno.usuario}` : '—'} · {turno?.local_id ? `Local ${turno.local_id}` : ''}</p>
            <p className="text-sm text-slate-600">Apertura: {formatDateTime(turno?.hora_apertura)} · Cierre: {turno?.hora_cierre ? formatDateTime(turno.hora_cierre) : '—'}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">Monto inicial</p>
              <p className="text-xl font-bold">{formatCurrency(turno?.monto_inicial)}</p>
            </div>
            <div className="h-10 w-px bg-slate-200" />
            <div className="text-right">
              <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">Monto final</p>
              <p className="text-xl font-bold">{turno?.monto_final !== null && turno?.monto_final !== undefined ? formatCurrency(turno?.monto_final) : '—'}</p>
            </div>
          </div>
          {turno?.estado === 'abierta' && (
            <form className="flex flex-wrap items-center gap-2" onSubmit={handleRegistrarGasto}>
              <div className="flex flex-col text-sm">
                <label className="font-semibold text-slate-700">Descripción</label>
                <input
                  type="text"
                  value={gastoForm.descripcion}
                  onChange={e => setGastoForm(f => ({ ...f, descripcion: e.target.value }))}
                  placeholder="Gasto manual / Pago suscripción"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div className="flex flex-col text-sm">
                <label className="font-semibold text-slate-700">Monto</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={gastoForm.monto}
                  onChange={e => setGastoForm(f => ({ ...f, monto: e.target.value }))}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={gastoSaving}
                className="inline-flex items-center gap-2 rounded-lg bg-rose-600 text-white px-3 py-2 text-sm font-semibold shadow hover:bg-rose-700 disabled:opacity-60"
              >
                <FiMinusCircle /> {gastoSaving ? 'Guardando...' : 'Registrar gasto'}
              </button>
            </form>
          )}
        </div>

        <div className="px-5 py-4 grid gap-3 md:grid-cols-2">
          <div className="space-y-3 rounded-2xl border border-slate-200 p-4 bg-slate-50">
            <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">Resumen de movimientos</p>
            <SummaryRow label="Total de ventas" value={totals.VENTA} targetTab="VENTA" accent="text-emerald-700" />
            <SummaryRow label="Ingresos (ventas + otros)" value={ingresosConVentas} accent="text-sky-700" />
            <SummaryRow label="Total de gastos" value={totals.GASTO} targetTab="GASTO" accent="text-rose-700" />
            <SummaryRow label="Total de egresos" value={totals.EGRESO} targetTab="EGRESO" accent="text-orange-700" />
            <SummaryRow label="Total sueldos" value={totals.SUELDO} targetTab="SUELDO" accent="text-indigo-700" />
            <SummaryRow label="Ajustes" value={totals.AJUSTE} targetTab="all" accent="text-slate-700" />
          </div>
          <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <FiInfo />
              Total teórico en caja (online excluido)
            </div>
            <p className="text-3xl font-extrabold text-slate-900">{formatCurrency(totalTeorico)}</p>
            <div className="text-sm text-slate-500">
              Calculado con monto inicial + ventas/ingresos - gastos/egresos/sueldos ± ajustes.
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center gap-2">
          {TABS.map(tab => <TabButton key={tab.id} tab={tab} />)}
        </div>
        {error && <div className="px-5 py-3 text-sm text-rose-600 bg-rose-50 border-b border-rose-100">{error}</div>}
        {loading && (
          <div className="px-5 py-5 grid gap-3 md:grid-cols-2">
            {[1, 2, 3, 4].map(n => (
              <Skeleton key={n} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        )}
        {!loading && displayedMovs.length === 0 && (
          <div className="px-5 py-6 text-center text-slate-500">Sin movimientos para esta pestaña.</div>
        )}
        <div className="px-5 py-5 grid gap-3 md:grid-cols-2">
          {!loading && displayedMovs.map(mov => (
            <MovementCard key={mov.id} mov={mov} />
          ))}
        </div>
      </div>

      {ventaDetalle && (
        <div className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">Venta</p>
                <h3 className="text-lg font-bold">Detalle venta #{ventaDetalle.venta_id}</h3>
              </div>
              <button
                type="button"
                onClick={() => setVentaDetalle(null)}
                className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900"
              >
                <FiXCircle /> Cerrar
              </button>
            </div>

            {ventaError && <div className="px-5 py-3 text-sm text-rose-600 bg-rose-50 border-b border-rose-100">{ventaError}</div>}

            <div className="px-5 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
              <div className="flex flex-wrap gap-4 text-sm text-slate-700">
                <span className="font-semibold">Total:</span> <span>{formatCurrency(ventaDetalle.total)}</span>
                {ventaDetalle.cliente && <span className="font-semibold">Cliente:</span>} {ventaDetalle.cliente?.nombre}
                {ventaDetalle.vendedor && <><span className="font-semibold">Vendedor:</span> {ventaDetalle.vendedor}</>}
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">Productos</p>
                {Array.isArray(ventaDetalle.productos) && ventaDetalle.productos.length > 0 ? (
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {ventaDetalle.productos.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between px-4 py-3">
                        <div className="text-sm text-slate-800">{p.producto} · x{p.cantidad}</div>
                        <div className="text-sm font-semibold text-slate-900">{formatCurrency(p.subtotal)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">Sin productos registrados.</div>
                )}
              </div>

              {Array.isArray(ventaDetalle.promociones) && ventaDetalle.promociones.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">Promociones</p>
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {ventaDetalle.promociones.map((promo, idx) => (
                      <div key={idx} className="px-4 py-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold text-slate-900">{promo.nombre}</div>
                          <div className="text-sm font-semibold text-slate-900">{formatCurrency(promo.subtotal)}</div>
                        </div>
                        <div className="text-xs text-slate-600">{promo.cantidad} x {formatCurrency(promo.precio_unitario)}</div>
                        {Array.isArray(promo.items) && promo.items.length > 0 && (
                          <div className="space-y-1">
                            {promo.items.map((it, j) => (
                              <div key={j} className="text-xs text-slate-700 flex justify-between">
                                <span>{it.cantidad} x {it.producto || `Prod ${it.producto_id}`}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {Array.isArray(ventaDetalle.pagos) && ventaDetalle.pagos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">Pagos</p>
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {ventaDetalle.pagos.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between px-4 py-3">
                        <div className="text-sm text-slate-800">{p.metodo || `Método ${p.metodo_id}`}</div>
                        <div className="text-sm font-semibold text-slate-900">{formatCurrency(p.monto)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
