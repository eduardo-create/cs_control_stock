import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { FiPlus, FiTrash2, FiShoppingCart, FiRefreshCw } from 'react-icons/fi';
import Skeleton from './Skeleton';

function authFetch(path, opts = {}, token) {
  const headers = Object.assign({}, opts.headers || {});
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(path, Object.assign({}, opts, { headers, credentials: 'include' }));
}

function money(n) {
  return Number(n || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 });
}

export default function ComprasPage() {
  const { token, user } = useAuth();
  const [proveedores, setProveedores] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [locales, setLocales] = useState([]);
  const [compras, setCompras] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localId, setLocalId] = useState(user?.local_id ? String(user.local_id) : '');
  const [proveedorId, setProveedorId] = useState('');
  const [items, setItems] = useState([{ insumo_id: '', cantidad: '', precio_unitario: '' }]);

  const insumoMap = useMemo(() => {
    const m = new Map();
    insumos.forEach(i => m.set(String(i.id), i));
    return m;
  }, [insumos]);

  const resolvedLocal = useMemo(() => {
    if (localId) return localId;
    if (user?.local_id) return String(user.local_id);
    if (locales.length === 1) return String(locales[0].id);
    return '';
  }, [localId, user?.local_id, locales]);

  function loadAll() {
    if (!token) return;
    setLoading(true);
    Promise.all([
      authFetch('/api/proveedores', {}, token).then(r => r.ok ? r.json() : []),
      authFetch('/api/insumos', {}, token).then(r => r.ok ? r.json() : []),
      authFetch('/api/locales', {}, token).then(r => r.ok ? r.json() : []),
      authFetch('/api/compras', {}, token).then(r => r.ok ? r.json() : [])
    ]).then(([prov, ins, locs, comps]) => {
      if (Array.isArray(prov)) setProveedores(prov);
      if (Array.isArray(ins)) setInsumos(ins);
      if (Array.isArray(locs)) setLocales(locs);
      if (Array.isArray(comps)) setCompras(comps);
      if (!localId && !user?.local_id && Array.isArray(locs) && locs.length === 1) {
        setLocalId(String(locs[0].id));
      }
    }).catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function addItem() {
    setItems(prev => [...prev, { insumo_id: '', cantidad: '', precio_unitario: '' }]);
  }

  function updateItem(idx, field, value) {
    setItems(prev => prev.map((row, i) => i === idx ? { ...row, [field]: value } : row));
  }

  function removeItem(idx) {
    setItems(prev => prev.filter((_, i) => i !== idx));
  }

  async function submit() {
    const targetLocal = resolvedLocal;
    if (!targetLocal) {
      toast.error('Selecciona un local');
      return;
    }

    const detalles = items
      .map(it => ({
        insumo_id: it.insumo_id ? Number(it.insumo_id) : NaN,
        cantidad: Number(it.cantidad),
        precio_unitario: Number(it.precio_unitario)
      }))
      .filter(d => Number.isFinite(d.insumo_id) && d.insumo_id > 0 && d.cantidad > 0 && Number.isFinite(d.precio_unitario));

    if (detalles.length === 0) {
      toast.error('Agrega al menos un insumo con cantidad y precio');
      return;
    }

    const payload = {
      proveedor_id: proveedorId ? Number(proveedorId) : null,
      local_id: Number(targetLocal),
      detalles
    };

    try {
      setSaving(true);
      const res = await authFetch('/api/compras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }, token);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Error ${res.status}`);
      }
      await res.json();
      toast.success('Compra registrada');
      setItems([{ insumo_id: '', cantidad: '', precio_unitario: '' }]);
      loadAll();
    } catch (err) {
      toast.error(err.message || 'No se pudo registrar la compra');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">Compras</p>
          <h3 className="text-xl font-bold text-slate-900">Registrar compra y actualizar stock</h3>
          <p className="text-sm text-slate-500">Selecciona proveedor, local e insumos con cantidades y precios.</p>
        </div>
        <button
          onClick={loadAll}
          className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold border border-slate-200 shadow-sm text-slate-700 hover:bg-slate-50"
        >
          <FiRefreshCw className="text-slate-500" /> Recargar
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm font-semibold text-slate-700">
              <span>Proveedor</span>
              <select
                value={proveedorId}
                onChange={e => setProveedorId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
              >
                <option value="">Sin proveedor</option>
                {proveedores.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}{p.cuit ? ` (${p.cuit})` : ''}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm font-semibold text-slate-700">
              <span>Local</span>
              <select
                value={resolvedLocal}
                onChange={e => setLocalId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
              >
                <option value="">Selecciona un local</option>
                {locales.map(l => (
                  <option key={l.id} value={l.id}>{l.nombre}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="rounded-xl border border-dashed border-slate-200">
            <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[11px] font-semibold uppercase tracking-tight text-slate-500">
              <span className="col-span-5">Insumo</span>
              <span className="col-span-2">Cantidad</span>
              <span className="col-span-3">Precio unitario</span>
              <span className="col-span-2 text-right">Subtotal</span>
            </div>
            <div className="divide-y divide-slate-100">
              {items.map((row, idx) => {
                const insumo = row.insumo_id ? insumoMap.get(String(row.insumo_id)) : null;
                const subtotal = Number(row.cantidad || 0) * Number(row.precio_unitario || 0);
                return (
                  <div key={idx} className="grid grid-cols-12 gap-2 px-3 py-2 items-center">
                    <div className="col-span-5">
                      <select
                        value={row.insumo_id}
                        onChange={e => updateItem(idx, 'insumo_id', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
                      >
                        <option value="">Seleccione insumo</option>
                        {insumos.map(i => (
                          <option key={i.id} value={i.id}>{i.nombre}{i.unidad ? ` (${i.unidad})` : ''}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.cantidad}
                        onChange={e => updateItem(idx, 'cantidad', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        placeholder="0"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.precio_unitario}
                        onChange={e => updateItem(idx, 'precio_unitario', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        placeholder="$"
                      />
                    </div>
                    <div className="col-span-2 flex items-center justify-between gap-2 text-sm font-semibold text-slate-700">
                      <span>{money(subtotal)}</span>
                      {items.length > 1 && (
                        <button
                          onClick={() => removeItem(idx)}
                          className="inline-flex items-center justify-center rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                          aria-label="Eliminar fila"
                        >
                          <FiTrash2 />
                        </button>
                      )}
                    </div>
                    {insumo && (
                      <div className="col-span-12 text-xs text-slate-500 mt-1">Stock actual: {insumo.stock_total ?? 0} {insumo.unidad || ''}</div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="px-3 py-2">
              <button
                onClick={addItem}
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
              >
                <FiPlus /> Agregar insumo
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-slate-600">
              Total estimado: <span className="font-bold text-slate-900">{money(items.reduce((s, r) => s + (Number(r.cantidad || 0) * Number(r.precio_unitario || 0)), 0))}</span>
            </div>
            <button
              onClick={submit}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold shadow shadow-slate-900/20 hover:bg-slate-800 disabled:opacity-60"
            >
              <FiShoppingCart /> {saving ? 'Guardando...' : 'Registrar compra'}
            </button>
          </div>
        </div>

        <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">Últimas compras</p>
              <h4 className="text-lg font-bold text-slate-900">Historial</h4>
            </div>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(n => (
                <Skeleton key={n} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : compras.length === 0 ? (
            <p className="text-sm text-slate-500">No hay compras registradas.</p>
          ) : (
            <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
              {compras.map(c => (
                <div key={c.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3 shadow-sm">
                  <div className="flex items-center justify-between text-sm font-semibold text-slate-800">
                    <span>#{c.id} · {new Date(c.fecha).toLocaleString()}</span>
                    <span>{money(c.total)}</span>
                  </div>
                  <div className="text-sm text-slate-600 flex flex-wrap gap-2 mt-1">
                    {c.proveedor ? <span className="px-2 py-1 rounded-full bg-white text-slate-800 border border-slate-200">{c.proveedor}</span> : <span className="px-2 py-1 rounded-full bg-white text-slate-500 border border-slate-200">Sin proveedor</span>}
                    {c.local && <span className="px-2 py-1 rounded-full bg-white text-slate-700 border border-slate-200">{c.local}</span>}
                  </div>
                  {Array.isArray(c.detalles) && c.detalles.length > 0 && (
                    <div className="mt-2 space-y-1 text-sm text-slate-700">
                      {c.detalles.map((d, idx) => (
                        <div key={idx} className="flex justify-between gap-2">
                          <span className="truncate">{d.nombre || `Insumo ${d.insumo_id}`} ({d.cantidad})</span>
                          <span className="text-right text-slate-600">{money(d.subtotal)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
