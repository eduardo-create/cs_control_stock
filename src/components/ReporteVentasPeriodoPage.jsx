import React, { useEffect, useMemo, useState } from 'react';
import { FiSearch, FiRefreshCw, FiDownload } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { TableSkeleton } from './Skeleton';

function authFetch(path, opts = {}, token) {
  const headers = Object.assign({}, opts.headers || {});
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(path, Object.assign({}, opts, { headers, credentials: 'include' }));
}

function formatMoney(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 });
}

export default function ReporteVentasPeriodoPage() {
  const { token } = useAuth();
  const [filtro, setFiltro] = useState(() => {
    const hoy = new Date();
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const toISO = (dt) => dt.toISOString().slice(0, 10);
    return {
      desde: toISO(inicio),
      hasta: toISO(hoy),
      local_id: '',
        turno: '',
      agrupar: 'dia',
    };
  });
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [consultado, setConsultado] = useState(false);

  const metodos = useMemo(() => {
    const set = new Set();
    rows.forEach(r => Object.keys(r.pagos_por_metodo || {}).forEach(m => set.add(m)));
    return Array.from(set);
  }, [rows]);

  async function cargar() {
    try {
      setLoading(true);
      setConsultado(true);
      setRows([]);
      const params = new URLSearchParams();
      if (filtro.desde) params.append('desde', filtro.desde);
      if (filtro.hasta) params.append('hasta', filtro.hasta);
      if (filtro.local_id) params.append('local_id', filtro.local_id);
      if (filtro.turno) params.append('turno', filtro.turno);
      if (filtro.agrupar) params.append('agrupar', filtro.agrupar);
      params.append('formato', 'json');

      const res = await authFetch(`/api/reportes/ventas-periodo?${params.toString()}`, {}, token);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Error ${res.status}`);
      }
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(e.message || 'No se pudo cargar el reporte');
    } finally {
      setLoading(false);
    }
  }

  async function exportar() {
    if (!consultado) {
      toast.error('Primero consultá el período.');
      return;
    }
    try {
      const params = new URLSearchParams();
      if (filtro.desde) params.append('desde', filtro.desde);
      if (filtro.hasta) params.append('hasta', filtro.hasta);
      if (filtro.local_id) params.append('local_id', filtro.local_id);
      if (filtro.turno) params.append('turno', filtro.turno);
      if (filtro.agrupar) params.append('agrupar', filtro.agrupar);
      params.append('formato', 'excel');

      const res = await authFetch(`/api/reportes/ventas-periodo?${params.toString()}`, {}, token);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Error ${res.status}`);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ventas_periodo_${filtro.desde || 'inicio'}_a_${filtro.hasta || 'fin'}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e.message || 'No se pudo exportar');
    }
  }

  useEffect(() => {
    if (!token) {
      setRows([]);
      setConsultado(false);
    }
  }, [token]);

  return (
    <div className="max-w-7xl mx-auto space-y-5 text-slate-900">
      <div className="rounded-2xl border border-slate-200 bg-white shadow p-5">
        <h2 className="text-2xl font-bold mt-1">Reporte de ventas por período</h2>
        <p className="text-sm text-slate-500 mt-1">Agrega ventas por día, mes o año con desglose por medios de pago.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <label className="text-sm font-semibold text-slate-700 space-y-1">
            <span>Desde</span>
            <input
              type="date"
              value={filtro.desde}
              onChange={e => setFiltro(f => ({ ...f, desde: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
            />
          </label>
          <label className="text-sm font-semibold text-slate-700 space-y-1">
            <span>Hasta</span>
            <input
              type="date"
              value={filtro.hasta}
              onChange={e => setFiltro(f => ({ ...f, hasta: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
            />
          </label>
          <label className="text-sm font-semibold text-slate-700 space-y-1">
            <span>Local (opcional)</span>
            <input
              type="number"
              value={filtro.local_id}
              onChange={e => setFiltro(f => ({ ...f, local_id: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
              placeholder="ID de local"
            />
          </label>
          <label className="text-sm font-semibold text-slate-700 space-y-1">
            <span>Turno</span>
            <select
              value={filtro.turno}
              onChange={e => setFiltro(f => ({ ...f, turno: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
            >
              <option value="">Todos</option>
              <option value="Turno mañana">Turno mañana</option>
              <option value="Turno tarde">Turno tarde</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700 space-y-1">
            <span>Agrupar</span>
            <select
              value={filtro.agrupar}
              onChange={e => setFiltro(f => ({ ...f, agrupar: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
            >
              <option value="dia">Día</option>
              <option value="mes">Mes</option>
              <option value="anio">Año</option>
            </select>
          </label>
        </div>
        <div className="flex gap-2">
          <button
            onClick={cargar}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-semibold shadow shadow-slate-900/20 hover:bg-slate-800 disabled:opacity-60"
          >
            <FiSearch /> Consultar
          </button>
          <button
            onClick={() => setFiltro(f => ({ ...f })) || cargar()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
          >
            <FiRefreshCw /> Refrescar
          </button>
          <button
            onClick={exportar}
            disabled={loading || !consultado}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
          >
            <FiDownload /> Exportar Excel
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow overflow-x-auto">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-[160px_160px_120px_140px_140px_repeat(auto-fit,minmax(120px,1fr))] gap-3 px-4 py-3 text-xs font-semibold uppercase tracking-tight text-slate-500 border-b border-slate-100 whitespace-nowrap">
            <span>Periodo</span>
            <span>Turno</span>
            <span>Tickets</span>
            <span>Total ventas</span>
            <span>Ticket prom.</span>
            {metodos.map(m => (<span key={m}>Pago: {m}</span>))}
          </div>
          {loading && (
            <div className="px-4 py-3">
              <TableSkeleton rows={4} columns={5 + metodos.length} height={12} />
            </div>
          )}
          {!loading && !consultado && <div className="px-4 py-3 text-sm text-slate-500">Completa los filtros y presioná "Consultar".</div>}
          {!loading && consultado && rows.length === 0 && <div className="px-4 py-3 text-sm text-slate-500">Sin datos para el período.</div>}
          <div className="divide-y divide-slate-100">
            {rows.map((r, idx) => (
              <div key={idx} className="grid grid-cols-[160px_160px_120px_140px_140px_repeat(auto-fit,minmax(120px,1fr))] gap-3 px-4 py-3 items-center text-sm text-slate-800 whitespace-nowrap">
                <span>{r.periodo}</span>
                <span>{r.turno || '—'}</span>
                <span>{r.tickets}</span>
                <span>{formatMoney(r.total_ventas)}</span>
                <span>{formatMoney(r.ticket_promedio)}</span>
                {metodos.map(m => (
                  <span key={m}>{formatMoney((r.pagos_por_metodo || {})[m] || 0)}</span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
