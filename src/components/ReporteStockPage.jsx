import React, { useEffect, useMemo, useState } from 'react';
import { FiSearch, FiDownload } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { TableSkeleton } from './Skeleton';

function authFetch(path, opts = {}, token) {
  const API_BASE = import.meta.env.VITE_API_BASE || '';
  if (path.startsWith('/api/')) path = API_BASE + path;
  const headers = Object.assign({}, opts.headers || {});
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(path, Object.assign({}, opts, { headers, credentials: 'include' }));
}

export default function ReporteStockPage() {
  const { token } = useAuth();
  const [locales, setLocales] = useState([]);
  const [filtro, setFiltro] = useState({ local_id: '' });
  const [loading, setLoading] = useState(false);
  const [consultado, setConsultado] = useState(false);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (!token) return;
    authFetch('/api/locales', {}, token)
      .then(r => r.ok ? r.json() : [])
      .then(data => setLocales(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [token]);

  async function consultar() {
    try {
      setLoading(true);
      setConsultado(true);
      setRows([]);
      const params = new URLSearchParams();
      if (filtro.local_id) params.append('local_id', filtro.local_id);
      params.append('formato', 'json');
      const res = await authFetch(`/api/reportes/stock?${params.toString()}`, {}, token);
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
      const params = new URLSearchParams();
      if (filtro.local_id) params.append('local_id', filtro.local_id);
      params.append('formato', 'excel');
      const res = await authFetch(`/api/reportes/stock?${params.toString()}`, {}, token);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Error ${res.status}`);
      }
      const blob = await res.blob();
      const fechaTag = new Date().toISOString().slice(0, 10);
      const sufLocal = filtro.local_id || 'todos';
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stock_${sufLocal}_${fechaTag}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e.message || 'No se pudo exportar');
    }
  }

  const agrupado = useMemo(() => {
    const map = new Map();
    rows.forEach(r => {
      const localLabel = r.local || 'Todos';
      if (!map.has(localLabel)) map.set(localLabel, []);
      map.get(localLabel).push(r);
    });
    return map;
  }, [rows]);

  return (
    <div className="max-w-6xl mx-auto space-y-5 text-slate-900">
      <div className="rounded-2xl border border-slate-200 bg-white shadow p-5">
        <h2 className="text-2xl font-bold">Reporte de stock</h2>
        <p className="text-sm text-slate-500 mt-1">Stock y ventas por producto, con filtro opcional por local.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
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
            <TableSkeleton rows={4} columns={6} height={12} />
          </div>
        )}
        {!loading && !consultado && <div className="text-sm text-slate-500">Elegí local (o todos) y consultá para ver el stock.</div>}
        {!loading && consultado && rows.length === 0 && <div className="text-sm text-slate-500">Sin datos.</div>}

        {Array.from(agrupado.entries()).map(([local, items]) => (
          <div key={local} className="rounded-2xl border border-slate-200 bg-white shadow">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-800">{local || 'Todos'}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 uppercase text-[11px] tracking-tight">
                    <th className="px-4 py-2 text-left">Producto</th>
                    <th className="px-4 py-2 text-left">Precio</th>
                    <th className="px-4 py-2 text-left">Entradas</th>
                    <th className="px-4 py-2 text-left">Salidas</th>
                    <th className="px-4 py-2 text-left">Vendidos</th>
                    <th className="px-4 py-2 text-left">Stock total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={`${item.local_id || 'all'}-${item.producto_id}`} className="border-t border-slate-100">
                      <td className="px-4 py-2">{item.producto}</td>
                      <td className="px-4 py-2 text-slate-600">${Number(item.precio || 0).toFixed(2)}</td>
                      <td className="px-4 py-2">{item.entradas || 0}</td>
                      <td className="px-4 py-2">{item.salidas || 0}</td>
                      <td className="px-4 py-2">{item.vendidos || 0}</td>
                      <td className="px-4 py-2 font-semibold">{item.stock_total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
