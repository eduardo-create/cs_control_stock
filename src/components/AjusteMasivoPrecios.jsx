import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

function authFetch(path, opts = {}, token) {
  const API_BASE = import.meta.env.VITE_API_BASE || '';
  if (path.startsWith('/api/')) path = API_BASE + path;
  const headers = { ...(opts.headers || {}), Authorization: token ? `Bearer ${token}` : undefined };
  if (opts.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  return fetch(path, Object.assign({}, opts, { headers, credentials: 'include' }));
}

export default function AjusteMasivoPrecios() {
  const { token } = useAuth();
  const [categorias, setCategorias] = useState([]);
  const [categoriaId, setCategoriaId] = useState('');
  const [tipoAjuste, setTipoAjuste] = useState('porcentaje');
  const [valor, setValor] = useState('');
  const [observacion, setObservacion] = useState('');
  const [loading, setLoading] = useState(false);
  const [historial, setHistorial] = useState([]);

  useEffect(() => {
    loadCategorias();
    loadHistorial();
  }, []);

  async function loadCategorias() {
    try {
      const res = await authFetch('/api/categorias', {}, token);
      if (!res.ok) throw new Error('No se pudieron cargar categorías');
      const data = await res.json();
      if (Array.isArray(data)) setCategorias(data);
    } catch (e) {
      toast.error(e.message || 'Error al cargar categorías');
    }
  }

  async function loadHistorial() {
    try {
      const res = await authFetch('/api/productos/ajuste-masivo/historial', {}, token);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setHistorial(data);
    } catch {}
  }

  async function submitAjuste(e) {
    e.preventDefault();
    if (!valor || isNaN(Number(valor))) return toast.error('Valor inválido');
    setLoading(true);
    try {
      const res = await authFetch('/api/productos/ajuste-masivo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo_ajuste: tipoAjuste,
          valor: Number(valor),
          categoria_id: categoriaId || null,
          observacion
        })
      }, token);
      if (!res.ok) throw new Error(await res.text());
      toast.success('Ajuste aplicado');
      setValor('');
      setObservacion('');
      loadHistorial();
    } catch (e) {
      toast.error(e.message || 'No se pudo aplicar ajuste');
    } finally {
      setLoading(false);
    }
  }

  async function revertirAjuste(id) {
    // Confirmación usando toast en vez de window.confirm
    toast((t) => (
      <span>
        ¿Revertir este ajuste?
        <div className="mt-2 flex gap-2 justify-end">
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              setLoading(true);
              try {
                const res = await authFetch(`/api/productos/ajuste-masivo/${id}/revertir`, { method: 'POST' }, token);
                if (!res.ok) throw new Error(await res.text());
                toast.success('Ajuste revertido');
                loadHistorial();
              } catch (e) {
                toast.error(e.message || 'No se pudo revertir');
              } finally {
                setLoading(false);
              }
            }}
            className="rounded-xl bg-amber-600 text-white font-semibold px-3 py-1.5 text-xs shadow hover:bg-amber-700 disabled:opacity-60 transition"
          >
            Sí, revertir
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="rounded-xl bg-slate-200 text-slate-700 font-semibold px-3 py-1.5 text-xs shadow hover:bg-slate-300 transition"
          >
            Cancelar
          </button>
        </div>
      </span>
    ), { duration: 8000 });
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white shadow p-5">
        <h2 className="text-xl font-bold mb-2">Ajuste masivo de precios</h2>
        <form className="grid gap-3" onSubmit={submitAjuste}>
          <label className="text-sm font-semibold text-slate-700 space-y-1">
            <span>Tipo de ajuste</span>
            <select value={tipoAjuste} onChange={e => setTipoAjuste(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
              <option value="porcentaje">Porcentaje (%)</option>
              <option value="valor">Valor fijo ($)</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700 space-y-1">
            <span>Valor</span>
            <input type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" />
          </label>
          <label className="text-sm font-semibold text-slate-700 space-y-1">
            <span>Categoría (opcional)</span>
            <select value={categoriaId} onChange={e => setCategoriaId(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
              <option value="">Todas</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700 space-y-1">
            <span>Observación (opcional)</span>
            <input type="text" value={observacion} onChange={e => setObservacion(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" />
          </label>
          <button type="submit" disabled={loading} className="rounded-xl bg-slate-900 text-white font-semibold px-4 py-2.5 text-sm shadow hover:bg-slate-800 disabled:opacity-60">
            {loading ? 'Aplicando...' : 'Aplicar ajuste'}
          </button>
        </form>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white shadow p-5">
        <h3 className="text-lg font-bold mb-2">Historial de ajustes</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="px-2 py-1">Fecha</th>
                <th className="px-2 py-1">Tipo</th>
                <th className="px-2 py-1">Valor</th>
                <th className="px-2 py-1">Categoría</th>
                <th className="px-2 py-1">Observación</th>
                <th className="px-2 py-1">Revertido</th>
                <th className="px-2 py-1">Acción</th>
              </tr>
            </thead>
            <tbody>
              {historial.map(a => (
                <tr key={a.id} className={a.revertido ? 'text-slate-400' : ''}>
                  <td className="px-2 py-1 whitespace-nowrap">{a.fecha?.slice(0, 16).replace('T', ' ')}</td>
                  <td className="px-2 py-1">{a.tipo_ajuste}</td>
                  <td className="px-2 py-1">{a.valor}</td>
                  <td className="px-2 py-1">{a.categoria_nombre || 'Todas'}</td>
                  <td className="px-2 py-1">{a.observacion}</td>
                  <td className="px-2 py-1">{a.revertido ? 'Sí' : 'No'}</td>
                  <td className="px-2 py-1">
                    {!a.revertido && (
                      <button
                        onClick={() => revertirAjuste(a.id)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 text-white font-semibold px-3 py-1.5 text-xs shadow hover:bg-amber-700 disabled:opacity-60 transition"
                        style={{ minWidth: 90, height: 36 }}
                      >
                        <span className="w-full text-center">Revertir</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!historial.length && <tr><td colSpan={7} className="text-center text-slate-400 py-2">Sin ajustes registrados</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
