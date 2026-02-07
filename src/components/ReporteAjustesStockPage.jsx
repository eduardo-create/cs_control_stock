import React, { useEffect, useState } from 'react';
import { FiDownload, FiSearch } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { TableSkeleton } from './Skeleton';

function authFetch(path, opts = {}, token) {
  const headers = Object.assign({}, opts.headers || {});
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(path, Object.assign({}, opts, { headers, credentials: 'include' }));
}

export default function ReporteAjustesStockPage() {
  const { token } = useAuth();
  const [locales, setLocales] = useState([]);
  const [productos, setProductos] = useState([]);
  const [filtro, setFiltro] = useState({ local_id: '', producto_id: '', desde: '', hasta: '' });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [consultado, setConsultado] = useState(false);

  useEffect(() => {
    if (!token) return;
    authFetch('/api/locales', {}, token)
      .then(r => (r.ok ? r.json() : []))
      .then(data => setLocales(Array.isArray(data) ? data : []))
      .catch(() => {});
    authFetch('/api/productos', {}, token)
      .then(r => (r.ok ? r.json() : []))
      .then(data => setProductos(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [token]);

  function buildParams(formato) {
    const params = new URLSearchParams();
    if (filtro.local_id) params.append('local_id', filtro.local_id);
    if (filtro.producto_id) params.append('producto_id', filtro.producto_id);
    if (filtro.desde) params.append('desde', filtro.desde);
    if (filtro.hasta) params.append('hasta', filtro.hasta);
    if (formato) params.append('formato', formato);
    return params;
  }

  async function consultar() {
    try {
      setLoading(true);
      setConsultado(true);
      setRows([]);
      const params = buildParams('json');
      const res = await authFetch(`/api/reportes/stock-ajustes?${params.toString()}`, {}, token);
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
    try {
      const params = buildParams('excel');
      const res = await authFetch(`/api/reportes/stock-ajustes?${params.toString()}`, {}, token);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Error ${res.status}`);
      }
      const blob = await res.blob();
      const fechaTag = new Date().toISOString().slice(0, 10);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ajustes_stock_${fechaTag}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e.message || 'No se pudo exportar');
    }
  }

  function formatFecha(val) {
    if (!val) return '';
    const dt = new Date(val);
    if (Number.isNaN(dt.getTime())) return val;
    return dt.toLocaleString();
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5 text-slate-900">
      <div className="rounded-2xl border border-slate-200 bg-white shadow p-5">
        <h2 className="text-2xl font-bold">Ajustes de stock</h2>
        <p className="text-sm text-slate-500 mt-1">Listado de movimientos manuales (tipo ajuste), filtrables por local, producto y fecha.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <label className="text-sm font-semibold text-slate-700 space-y-1">
            <span>Local</span>
            <select
              value={filtro.local_id}
              onChange={e => setFiltro(f => ({ ...f, local_id: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
            >
              <option value="">Todos</option>
              {locales.map(l => (
                <option key={l.id} value={l.id}>{l.nombre}</option>
              ))}
            </select>
          </label>

          <label className="text-sm font-semibold text-slate-700 space-y-1">
            <span>Producto</span>
            <select
              value={filtro.producto_id}
              onChange={e => setFiltro(f => ({ ...f, producto_id: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
            >
              <option value="">Todos</option>
              {productos.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </label>

          <label className="text-sm font-semibold text-slate-700 space-y-1">
            <span>Desde</span>
            <input
              type="date"
              value={filtro.desde}
              onChange={e => setFiltro(f => ({ ...f, desde: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
            />
          </label>

          <label className="text-sm font-semibold text-slate-700 space-y-1">
            <span>Hasta</span>
            <input
              type="date"
              value={filtro.hasta}
              onChange={e => setFiltro(f => ({ ...f, hasta: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
            />
          </label>
        </div>

        <div className="flex gap-2">
          <button
            onClick={consultar}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-semibold shadow shadow-slate-900/20 hover:bg-slate-800 disabled:opacity-60"
          >
            <FiSearch /> Consultar
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

      <div className="space-y-4">
        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow px-4 py-3">
            <TableSkeleton rows={4} columns={9} height={12} />
          </div>
        )}
        {!loading && !consultado && <div className="text-sm text-slate-500">Elegí filtros y consultá para ver los ajustes.</div>}
        {!loading && consultado && rows.length === 0 && <div className="text-sm text-slate-500">Sin datos.</div>}

        {rows.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600 uppercase text-[11px] tracking-tight">
                  <th className="px-4 py-2 text-left">Fecha</th>
                  <th className="px-4 py-2 text-left">Local</th>
                  <th className="px-4 py-2 text-left">Producto</th>
                  <th className="px-4 py-2 text-left">Stock previo</th>
                  <th className="px-4 py-2 text-left">Ajuste</th>
                  <th className="px-4 py-2 text-left">Stock nuevo</th>
                  <th className="px-4 py-2 text-left">Tipo</th>
                  <th className="px-4 py-2 text-left">Motivo</th>
                  <th className="px-4 py-2 text-left">Usuario</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 whitespace-nowrap">{formatFecha(r.fecha)}</td>
                    <td className="px-4 py-2">{r.local || 'Sin local'}</td>
                    <td className="px-4 py-2">{r.producto}</td>
                    <td className="px-4 py-2">{r.stock_prev ?? '—'}</td>
                    <td className="px-4 py-2 font-semibold">{r.cantidad}</td>
                    <td className="px-4 py-2">{r.stock_nuevo ?? '—'}</td>
                    <td className="px-4 py-2">{r.tipo}</td>
                    <td className="px-4 py-2">{r.motivo || '—'}</td>
                    <td className="px-4 py-2">{r.usuario || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
