import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FiRefreshCw, FiSearch, FiDownload } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { TableSkeleton } from './Skeleton';

function authFetch(path, opts = {}, token) {
  const API_BASE = import.meta.env.VITE_API_BASE || '';
  if (path.startsWith('/api/')) path = API_BASE + path;
  const headers = Object.assign({}, opts.headers || {});
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(path, Object.assign({}, opts, { headers, credentials: 'include' }));
}

function formatMoney(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 });
}

function formatDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '—';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function formatTime(d) {
  if (!d) return '—';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

export default function ReporteCierrePage() {
  const { token } = useAuth();
  const [filtro, setFiltro] = useState(() => {
    const hoy = new Date();
    const unaSemana = new Date(hoy.getTime() - 6 * 24 * 60 * 60 * 1000);
    const toISO = (dt) => dt.toISOString().slice(0, 10);
    return {
      desde: toISO(unaSemana),
      hasta: toISO(hoy),
      turno_id: '',
      local_id: '',
      agruparDia: false,
    };
  });
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);

  const metodos = useMemo(() => {
    const set = new Set();
    rows.forEach(r => {
      Object.keys(r.pagos_por_metodo || {}).forEach(m => set.add(m));
    });
    return Array.from(set);
  }, [rows]);

  const gridCols = useMemo(() => {
    const base = [120, 90, 160, 80, 120, 140]; // fecha, hora, turno, pedidos, inicio, total ventas
    const metodoCols = metodos.map(() => 140);
    const tail = [110, 110, 120, 120, 120, 140, 140, 140, 120, 120, 180]; // gastos, sueldos, neto, ingresos, egresos, cierre teórico, cierre real, diferencia, f cierre, h cierre, usuario
    return [...base, ...metodoCols, ...tail].map(n => `${n}px`).join(' ');
  }, [metodos]);

  async function cargar() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filtro.desde) params.append('desde', filtro.desde);
      if (filtro.hasta) params.append('hasta', filtro.hasta);
      if (filtro.turno_id) params.append('turno_id', filtro.turno_id);
      if (filtro.local_id) params.append('local_id', filtro.local_id);
      if (filtro.agruparDia) params.append('agrupar', 'dia');

      const res = await authFetch(`/api/reportes/cierre${params.toString() ? `?${params.toString()}` : ''}`, {}, token);
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

  useEffect(() => {
    if (token) cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function exportarExcel() {
    try {
      const params = new URLSearchParams();
      if (filtro.desde) params.append('desde', filtro.desde);
      if (filtro.hasta) params.append('hasta', filtro.hasta);
      if (filtro.turno_id) params.append('turno_id', filtro.turno_id);
      if (filtro.local_id) params.append('local_id', filtro.local_id);
      if (filtro.agruparDia) params.append('agrupar', 'dia');
      params.append('formato', 'excel');

      const res = await authFetch(`/api/reportes/cierre?${params.toString()}`, {}, token);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Error ${res.status}`);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const fname = `reporte_cierre_${filtro.desde || 'inicio'}_a_${filtro.hasta || 'fin'}.xlsx`;
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e.message || 'No se pudo exportar');
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5 text-slate-900">
      <div className="rounded-2xl border border-slate-200 bg-white shadow p-5">
        <h2 className="text-2xl font-bold mt-1">Reporte de cierre</h2>
        <p className="text-sm text-slate-500 mt-1">Desglose por turno o agrupado por día con pagos, gastos y diferencias.</p>
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
            <span>Turno (opcional)</span>
            <input
              type="number"
              value={filtro.turno_id}
              onChange={e => setFiltro(f => ({ ...f, turno_id: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
              placeholder="ID de turno"
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
          <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={filtro.agruparDia}
              onChange={e => setFiltro(f => ({ ...f, agruparDia: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-sky-600"
            />
            Agrupar por día
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
            onClick={exportarExcel}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
          >
            <FiDownload /> Exportar Excel
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow overflow-x-auto">
        <div className="min-w-[1800px]">
          <div
            className="grid gap-3 px-4 py-3 text-xs font-semibold uppercase tracking-tight text-slate-500 border-b border-slate-100 whitespace-nowrap"
            style={{ gridTemplateColumns: gridCols }}
          >
            <span>Fecha</span>
            <span>Hora</span>
            <span>Turno</span>
            <span>Pedidos</span>
            <span>Inicio caja</span>
            <span>Total ventas</span>
            {metodos.map(m => (<span key={m}>{m}</span>))}
            <span>Gastos</span>
            <span>Sueldos</span>
            <span>Neto día</span>
            <span>Ingresos</span>
            <span>Egresos</span>
            <span>Cierre teórico</span>
            <span>Cierre real</span>
            <span>Diferencia</span>
            <span>F. cierre</span>
            <span>H. cierre</span>
            <span>Usuario cierre</span>
          </div>
          {loading && (
            <div className="px-4 py-3">
              <TableSkeleton rows={4} columns={17 + metodos.length} height={12} />
            </div>
          )}
          {!loading && rows.length === 0 && <div className="px-4 py-3 text-sm text-slate-500">Sin datos</div>}
          <div className="divide-y divide-slate-100">
            {rows.map((r, idx) => (
              <div
                key={idx}
                className="grid gap-3 px-4 py-3 items-center text-sm text-slate-800 whitespace-nowrap"
                style={{ gridTemplateColumns: gridCols }}
              >
                <span className="truncate">{formatDate(r.fecha)}</span>
                <span className="truncate">{formatTime(r.hora)}</span>
                <span className="truncate" title={Array.isArray(r.turnos) ? r.turnos.join(', ') : r.turno_nombre || r.turno_id}>{r.turno_nombre || (Array.isArray(r.turnos) ? r.turnos.join(', ') : r.turno_id) || '—'}</span>
                <span>{r.total_pedidos}</span>
                <span>{formatMoney(r.inicio_caja)}</span>
                <span>{formatMoney(r.total_ventas)}</span>
                {metodos.map(m => (
                  <span key={m}>{formatMoney((r.pagos_por_metodo || {})[m] || 0)}</span>
                ))}
                <span>{formatMoney(r.total_gastos)}</span>
                <span>{formatMoney(r.sueldos)}</span>
                <span>{formatMoney(r.neto_dia)}</span>
                <span>{formatMoney(r.total_ingresos)}</span>
                <span>{formatMoney(r.total_egresos)}</span>
                <span>{formatMoney(r.cierre_teorico)}</span>
                <span>{r.cierre_real === null || r.cierre_real === undefined ? '—' : formatMoney(r.cierre_real)}</span>
                <span>{r.diferencia === null || r.diferencia === undefined ? '—' : formatMoney(r.diferencia)}</span>
                <span>{r.fecha_cierre ? formatDate(r.fecha_cierre) : '—'}</span>
                <span>{r.hora_cierre ? formatTime(r.hora_cierre) : '—'}</span>
                <span>{r.usuario_cierre || '—'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
