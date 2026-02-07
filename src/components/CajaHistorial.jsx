import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowRight, FiCalendar, FiCheckCircle, FiClock, FiRefreshCcw, FiSearch, FiTrendingUp } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { TableSkeleton } from './Skeleton';

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

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

function formatTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

export default function CajaHistorial() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [locales, setLocales] = useState([]);
  const [localId, setLocalId] = useState('');
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [turnos, setTurnos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadLocales() {
      try {
        const res = await authFetch('/api/locales', {}, token);
        if (!res.ok) throw new Error('No se pudieron cargar los locales');
        const data = await res.json();
        setLocales(data || []);
        if (data?.length && !localId) setLocalId(String(data[0].id));
      } catch (err) {
        setError(err.message || 'Error al cargar locales');
      }
    }
    loadLocales();
  }, [token]);

  const canSearch = useMemo(() => Boolean(localId && fecha), [localId, fecha]);

  async function fetchTurnos() {
    if (!canSearch) {
      toast.error('Selecciona un local y una fecha');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await authFetch(`/api/caja/turnos/${localId}?fecha=${fecha}`, {}, token);
      if (res.status === 404) {
        setTurnos([]);
        toast.error('No se encontraron cajas para esa fecha');
        return;
      }
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'No se pudo obtener el historial');
      }
      const data = await res.json();
      setTurnos(data?.turnos || []);
    } catch (err) {
      setError(err.message || 'Error al obtener historial');
    } finally {
      setLoading(false);
    }
  }

  function handleVerDetalle(turno) {
    navigate(`/caja/${turno.turno_id}`, { state: { turno, localId, fecha } });
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5 text-slate-900">
      <div className="rounded-2xl border border-slate-200 bg-white shadow p-5">
        <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">Ventas · Caja</p>
        <div className="flex flex-wrap items-center justify-between gap-3 mt-1">
          <h2 className="text-2xl font-bold">Historial de caja</h2>
          <button
            type="button"
            onClick={fetchTurnos}
            disabled={loading || !canSearch}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-semibold shadow shadow-slate-900/20 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {loading ? <FiRefreshCcw className="animate-spin" /> : <FiSearch />}
            Buscar
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="text-sm font-semibold text-slate-700 flex flex-col gap-2">
            Local
            {locales.length <= 1 ? (
              <div className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-slate-50 text-slate-700">
                {locales[0]?.nombre || `Local ${locales[0]?.id || '—'}`}
              </div>
            ) : (
              <select
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                value={localId}
                onChange={e => setLocalId(e.target.value)}
              >
                {locales.map(l => (
                  <option key={l.id} value={l.id}>{l.nombre || `Local ${l.id}`}</option>
                ))}
              </select>
            )}
          </label>
          <label className="text-sm font-semibold text-slate-700 flex flex-col gap-2">
            Fecha
            <div className="relative">
              <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                className="w-full rounded-lg border border-slate-200 px-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
              />
            </div>
          </label>
          <div className="flex items-end">
            <div className="text-sm text-slate-500">Filtra y busca turnos de caja por local y fecha.</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow">
        <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">Resultados</p>
            <h3 className="text-lg font-semibold">Cajas encontradas</h3>
          </div>
          {turnos.length > 0 && (
            <div className="text-sm text-slate-500 flex items-center gap-2">
              <FiTrendingUp />
              {turnos.length} turno(s)
            </div>
          )}
        </div>

        {error && <div className="px-5 py-3 text-sm text-rose-600 bg-rose-50 border-t border-rose-100">{error}</div>}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left font-semibold px-5 py-3">ID Caja</th>
                <th className="text-left font-semibold px-5 py-3">Fecha</th>
                <th className="text-left font-semibold px-5 py-3">Turno</th>
                <th className="text-left font-semibold px-5 py-3">Estado</th>
                <th className="text-left font-semibold px-5 py-3">Usuario</th>
                <th className="text-left font-semibold px-5 py-3">Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan="6" className="px-5 py-6">
                    <TableSkeleton rows={4} columns={6} height={12} />
                  </td>
                </tr>
              )}

              {!loading && turnos.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-5 py-6 text-center text-slate-500">
                    No hay cajas para los filtros seleccionados.
                  </td>
                </tr>
              )}

              {!loading && turnos.map(turno => (
                <tr key={turno.turno_id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-5 py-3 font-semibold text-slate-900">#{turno.turno_id}</td>
                  <td className="px-5 py-3 text-slate-700">{formatDate(fecha)}</td>
                  <td className="px-5 py-3 text-slate-700">{formatTime(turno.hora_apertura)}</td>
                  <td className="px-5 py-3"><StatusPill estado={turno.estado} /></td>
                  <td className="px-5 py-3 text-slate-700">{turno.usuario || '—'}</td>
                  <td className="px-5 py-3">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-sm font-semibold text-sky-600 hover:text-sky-700"
                      onClick={() => handleVerDetalle(turno)}
                    >
                      Ver detalle <FiArrowRight />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
