import React, { useState } from 'react';
import { FiSearch, FiDownload, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import Skeleton from './Skeleton';

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

function formatDateTime(val) {
  if (!val) return '—';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return val;
  return d.toLocaleString('es-AR');
}

function ReporteItem({ item }) {
  const [open, setOpen] = useState(false);
  const turno = item.turno || {};
  const resumen = item.resumen || {};
  const nombreTurno = turno.descripcion || (turno.id ? `Turno ${turno.id}` : 'Turno');

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left bg-slate-50 hover:bg-slate-100"
        onClick={() => setOpen(v => !v)}
      >
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">{nombreTurno}</p>
          <p className="text-sm font-bold text-slate-900">{turno.local || 'Sin local'} · Apertura {formatDateTime(turno.fecha_apertura)}</p>
          <p className="text-xs text-slate-500">Cierre {formatDateTime(turno.fecha_cierre)}</p>
        </div>
        <span className="text-slate-500">{open ? <FiChevronUp /> : <FiChevronDown />}</span>
      </button>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-4 pb-3 pt-1 bg-white">
        <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
          <p className="text-[11px] uppercase tracking-tight text-slate-500 font-semibold">Ventas</p>
          <p className="text-sm font-bold text-slate-900">{formatMoney(resumen.total_ventas)}</p>
        </div>
        <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
          <p className="text-[11px] uppercase tracking-tight text-slate-500 font-semibold">Retiros</p>
          <p className="text-sm font-bold text-rose-700">{formatMoney(resumen.total_retiros)}</p>
        </div>
        <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
          <p className="text-[11px] uppercase tracking-tight text-slate-500 font-semibold">Balance</p>
          <p className="text-sm font-bold text-slate-900">{formatMoney(resumen.balance)}</p>
        </div>
        <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
          <p className="text-[11px] uppercase tracking-tight text-slate-500 font-semibold">Promedio por comanda</p>
          <p className="text-sm font-bold text-slate-900">{formatMoney(resumen.promedio_por_comanda)}</p>
        </div>
      </div>

      {open && (
        <div className="divide-y divide-slate-100 bg-white">
          <div className="px-4 py-3">
            <p className="text-sm font-semibold text-slate-800 mb-2">Pagos por método</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {(item.pagos || []).map(p => (
                <div key={p.metodo} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 flex justify-between text-sm">
                  <span>{p.metodo}</span>
                  <span className="font-semibold">{formatMoney(p.total)}</span>
                </div>
              ))}
              {(item.pagos || []).length === 0 && <p className="text-sm text-slate-500">Sin pagos registrados.</p>}
            </div>
          </div>

          <div className="px-4 py-3">
            <p className="text-sm font-semibold text-slate-800 mb-2">Retiros de caja</p>
            <div className="space-y-2">
              {(item.retiros || []).map(r => (
                <div key={r.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-semibold">{formatMoney(r.monto)}</span>
                    <span className="text-slate-500">{formatDateTime(r.fecha)}</span>
                  </div>
                  <p className="text-slate-700">{r.motivo || '—'}</p>
                  <p className="text-xs text-slate-500">Por {r.usuario || '—'}</p>
                </div>
              ))}
              {(item.retiros || []).length === 0 && <p className="text-sm text-slate-500">Sin retiros.</p>}
            </div>
          </div>

          <div className="px-4 py-3">
            <p className="text-sm font-semibold text-slate-800 mb-2">Ventas del turno</p>
            <div className="space-y-2 max-h-64 overflow-auto pr-1">
              {(item.ventas || []).map(v => (
                <div key={v.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm flex justify-between gap-2">
                  <div>
                    <p className="font-semibold">Venta #{v.id}</p>
                    <p className="text-xs text-slate-500">{v.vendedor || '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatMoney(v.total)}</p>
                    <p className="text-xs text-slate-500">{formatDateTime(v.fecha)}</p>
                  </div>
                </div>
              ))}
              {(item.ventas || []).length === 0 && <p className="text-sm text-slate-500">Sin ventas.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReporteCajaPage() {
  const { token } = useAuth();
  const [filtro, setFiltro] = useState({ desde: '', hasta: '' });
  const [loading, setLoading] = useState(false);
  const [consultado, setConsultado] = useState(false);
  const [rows, setRows] = useState([]);

  async function consultar() {
    if (!filtro.desde || !filtro.hasta) {
      toast.error('Elegí fecha desde y hasta');
      return;
    }
    try {
      setLoading(true);
      setConsultado(true);
      setRows([]);
      const params = new URLSearchParams({ desde: filtro.desde, hasta: filtro.hasta, formato: 'json' });
      const res = await authFetch(`/api/reportes/caja?${params.toString()}`, {}, token);
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
    if (!filtro.desde || !filtro.hasta) {
      toast.error('Elegí fecha desde y hasta');
      return;
    }
    try {
      const params = new URLSearchParams({ desde: filtro.desde, hasta: filtro.hasta, formato: 'excel' });
      const res = await authFetch(`/api/reportes/caja?${params.toString()}`, {}, token);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Error ${res.status}`);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_caja_${filtro.desde}_a_${filtro.hasta}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e.message || 'No se pudo exportar');
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5 text-slate-900">
      <div className="rounded-2xl border border-slate-200 bg-white shadow p-5">
        <h2 className="text-2xl font-bold">Reporte de caja por turnos</h2>
        <p className="text-sm text-slate-500 mt-1">Lista turnos entre fechas, con ventas, pagos y retiros. Exportable a Excel.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 items-end">
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

      <div className="space-y-3">
        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map(n => (
              <Skeleton key={n} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        )}
        {!loading && !consultado && <div className="text-sm text-slate-500">Elegí fechas y consulta para ver los turnos.</div>}
        {!loading && consultado && rows.length === 0 && <div className="text-sm text-slate-500">Sin turnos en el rango.</div>}
        {rows.map((item, idx) => (
          <ReporteItem key={idx} item={item} />
        ))}
      </div>
    </div>
  );
}
