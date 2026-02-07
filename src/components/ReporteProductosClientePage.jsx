import React, { useEffect, useState } from 'react';
import { FiSearch, FiRefreshCw, FiDownload } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { TableSkeleton } from './Skeleton';

function authFetch(path, opts = {}, token) {
  const headers = Object.assign({}, opts.headers || {});
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(path, Object.assign({}, opts, { headers, credentials: 'include' }));
}

export default function ReporteProductosClientePage() {
  const { token } = useAuth();
  const [clientes, setClientes] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [consultado, setConsultado] = useState(false);
  const [filtro, setFiltro] = useState(() => {
    const hoy = new Date();
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const toISO = (dt) => dt.toISOString().slice(0, 10);
    return {
      desde: toISO(inicio),
      hasta: toISO(hoy),
      cliente_id: '',
      local_id: ''
    };
  });

  useEffect(() => {
    if (!token) return;
    authFetch('/api/clientes', {}, token)
      .then(r => r.ok ? r.json() : [])
      .then(data => setClientes(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [token]);

  async function cargar() {
    try {
      setLoading(true);
      setConsultado(true);
      setRows([]);
      const params = new URLSearchParams();
      if (filtro.desde) params.append('desde', filtro.desde);
      if (filtro.hasta) params.append('hasta', filtro.hasta);
      if (filtro.cliente_id) params.append('cliente_id', filtro.cliente_id);
      if (filtro.local_id) params.append('local_id', filtro.local_id);

      const res = await authFetch(`/api/reportes/productos-cliente?${params.toString()}`, {}, token);
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
      if (filtro.cliente_id) params.append('cliente_id', filtro.cliente_id);
      if (filtro.local_id) params.append('local_id', filtro.local_id);
      params.append('formato', 'excel');

      const res = await authFetch(`/api/reportes/productos-cliente?${params.toString()}`, {}, token);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Error ${res.status}`);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `productos_por_cliente_${filtro.desde || 'inicio'}_a_${filtro.hasta || 'fin'}.xlsx`;
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
        <h2 className="text-2xl font-bold mt-1">Producto más comprado por cliente</h2>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
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
            <span>Cliente</span>
            <select
              value={filtro.cliente_id}
              onChange={e => setFiltro(f => ({ ...f, cliente_id: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
            >
              <option value="">Todos</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.nombre || `Cliente ${c.id}`}</option>
              ))}
            </select>
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
        <div className="min-w-[1100px]">
          <div className="grid grid-cols-[220px_220px_220px_220px_220px] gap-3 px-4 py-3 text-xs font-semibold uppercase tracking-tight text-slate-500 border-b border-slate-100 whitespace-nowrap">
            <span>Cliente</span>
            <span>Email</span>
            <span>Producto más comprado</span>
            <span>Producto ID</span>
            <span>Cantidad</span>
          </div>
          <div className="divide-y divide-slate-100">
            {loading && (
              <div className="px-4 py-3">
                <TableSkeleton rows={4} columns={5} height={12} />
              </div>
            )}
            {!loading && rows.length === 0 && (
              <div className="px-4 py-3 text-sm text-slate-500">Sin resultados.</div>
            )}
            {rows.map((r, idx) => (
              <div key={idx} className="grid grid-cols-[220px_220px_220px_220px_220px] gap-3 px-4 py-3 items-center text-sm text-slate-800 whitespace-nowrap">
                <div className="font-semibold">{r.cliente_nombre || 'Sin cliente'}</div>
                <div className="text-slate-600 text-[13px]">{r.email || '—'}</div>
                <div className="font-medium">{r.producto_nombre || '—'}</div>
                <div className="text-slate-600 text-[13px]">{r.producto_id || '—'}</div>
                <div className="font-semibold">{Number(r.cantidad || 0)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
