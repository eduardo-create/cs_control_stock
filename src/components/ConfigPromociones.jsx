import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Skeleton, { CardSkeleton } from './Skeleton';
import { FiPlus } from 'react-icons/fi';

const TURNOS = [
  { value: 'todos', label: 'Todos' },
  { value: 'manana', label: 'Mañana' },
  { value: 'tarde', label: 'Tarde' },
  { value: 'noche', label: 'Noche' },
];

const DIAS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];

const LIMITE_OPTS = [
  { value: '', label: 'Ilimitado' },
  ...Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: `${i + 1} por pedido` })),
];

function authFetch(url, opts = {}, token) {
  const headers = { ...(opts.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(url, { ...opts, headers, credentials: 'include' });
}

export default function ConfigPromociones() {
  const { token } = useAuth();
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sinFechaFin, setSinFechaFin] = useState(true);
  const [diasSel, setDiasSel] = useState([1, 2, 3, 4, 5, 6, 0]);
  const [configuraciones, setConfiguraciones] = useState([defaultConfig()]);
  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    valido_desde: '',
    valido_hasta: '',
    turno: 'todos',
    categoria_id: '',
    tipo_descuento: 'ninguno',
    valor_descuento: '',
    precio_final: '',
    iva: 21,
    excluir_categorias: false,
    limite_por_pedido: '',
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  function defaultConfig() {
    return { categoria_id: '', aplica_todos: true, producto_id: '', cantidad_min: 0, cantidad_max: 0 };
  }

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      authFetch('/api/categorias', {}, token).then(r => (r.ok ? r.json() : [])),
      authFetch('/api/productos', {}, token).then(r => (r.ok ? r.json() : [])),
      authFetch('/api/promociones', {}, token).then(r => (r.ok ? r.json() : [])),
    ])
      .then(([cats, prods, promosData]) => {
        setCategorias(Array.isArray(cats) ? cats : []);
        setProductos(Array.isArray(prods) ? prods : []);
        setPromos(Array.isArray(promosData) ? promosData : []);
      })
      .catch(() => toast.error('No se pudieron cargar datos'))
      .finally(() => setLoading(false));
  }, [token]);

  function updateForm(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function toggleDia(d) {
    setDiasSel(prev => (prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]));
  }

  function updateConfig(index, key, value) {
    setConfiguraciones(prev => prev.map((cfg, i) => {
      if (i !== index) return cfg;
      // Normalizamos tipos numéricos para que hagan match con los ids de productos/categorías
      if (key === 'categoria_id' && value !== '') return { ...cfg, [key]: Number(value), producto_id: '' };
      if (key === 'producto_id' && value !== '') return { ...cfg, [key]: Number(value) };
      if (['cantidad_min', 'cantidad_max'].includes(key)) return { ...cfg, [key]: Number(value || 0) };
      return { ...cfg, [key]: value };
    }));
  }

  function addConfig() {
    setConfiguraciones(prev => [...prev, defaultConfig()]);
  }

  function removeConfig(index) {
    setConfiguraciones(prev => prev.filter((_, i) => i !== index));
  }

  function resetFormState() {
    setForm({
      nombre: '',
      descripcion: '',
      valido_desde: '',
      valido_hasta: '',
      turno: 'todos',
      categoria_id: '',
      tipo_descuento: 'ninguno',
      valor_descuento: '',
      precio_final: '',
      iva: 21,
      excluir_categorias: false,
      limite_por_pedido: '',
    });
    setConfiguraciones([defaultConfig()]);
    setDiasSel([1, 2, 3, 4, 5, 6, 0]);
    setSinFechaFin(true);
    setEditingId(null);
  }

  function openCreateModal() {
    resetFormState();
    setModalOpen(true);
  }

  function openEditModal(promo) {
    setEditingId(promo.id);
    setForm({
      nombre: promo.nombre || '',
      descripcion: promo.descripcion || '',
      valido_desde: promo.valido_desde ? promo.valido_desde.slice(0, 10) : '',
      valido_hasta: promo.valido_hasta ? promo.valido_hasta.slice(0, 10) : '',
      turno: promo.turno || 'todos',
      categoria_id: promo.categoria_id || '',
      tipo_descuento: promo.tipo_descuento || 'ninguno',
      valor_descuento: promo.valor_descuento ?? '',
      precio_final: promo.precio_final ?? '',
      iva: promo.iva ?? 21,
      excluir_categorias: promo.excluir_categorias || false,
      limite_por_pedido: promo.limite_por_pedido ?? ''
    });
    setConfiguraciones((promo.configuraciones || []).map(cfg => ({
      categoria_id: cfg.categoria_id,
      aplica_todos: cfg.aplica_todos,
      producto_id: cfg.producto_id || '',
      cantidad_min: cfg.cantidad_min || 0,
      cantidad_max: cfg.cantidad_max || 0
    })) || [defaultConfig()]);
    setDiasSel(Array.isArray(promo.dias) && promo.dias.length ? promo.dias : [1, 2, 3, 4, 5, 6, 0]);
    setSinFechaFin(!promo.valido_hasta);
    setModalOpen(true);
  }

  const productsByCategory = useMemo(() => {
    const map = {};
    for (const p of productos) {
      const cats = Array.isArray(p.categoria_ids) && p.categoria_ids.length
        ? p.categoria_ids
        : [p.categoria_id || p.categoria || p.categoriaId].filter(Boolean);
      for (const catId of cats) {
        const key = String(catId);
        if (!map[key]) map[key] = [];
        map[key].push(p);
      }
    }
    return map;
  }, [productos]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nombre || !form.precio_final) {
      toast.error('Nombre y precio final son obligatorios');
      return;
    }
    if (!diasSel.length) {
      toast.error('Selecciona al menos un día');
      return;
    }
    if (!configuraciones.length || configuraciones.some(c => !c.categoria_id)) {
      toast.error('Cada configuración debe tener categoría');
      return;
    }

    const payload = {
      ...form,
      categoria_id: form.categoria_id || null,
      valido_hasta: sinFechaFin ? null : form.valido_hasta,
      valor_descuento: form.valor_descuento || 0,
      limite_por_pedido: form.limite_por_pedido ? Number(form.limite_por_pedido) : null,
      dias: diasSel,
      configuraciones: configuraciones.map(c => ({
        categoria_id: Number(c.categoria_id),
        aplica_todos: !!c.aplica_todos,
        producto_id: c.aplica_todos ? null : (c.producto_id ? Number(c.producto_id) : null),
        cantidad_min: Number(c.cantidad_min || 0),
        cantidad_max: Number(c.cantidad_max || 0)
      })),
    };

    setSaving(true);
    try {
      if (editingId) {
        const res = await authFetch(`/api/promociones/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, activo: true })
        }, token);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || data.error || 'No se pudo actualizar');
        toast.success('Promoción actualizada');
        setPromos(prev => prev.map(p => p.id === editingId ? data.promocion : p));
      } else {
        const res = await authFetch('/api/promociones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }, token);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || data.error || 'No se pudo crear la promoción');
        toast.success('Promoción creada');
        setPromos(p => [data.promocion, ...p]);
      }
      setModalOpen(false);
      resetFormState();
    } catch (err) {
      toast.error(err.message || 'Error al guardar promoción');
    } finally {
      setSaving(false);
    }
  }

  async function desactivarPromo(id) {
    if (!window.confirm('Desactivar esta promoción?')) return;
    try {
      const res = await authFetch(`/api/promociones/${id}`, { method: 'DELETE' }, token);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'No se pudo desactivar');
      }
      setPromos(prev => prev.map(p => p.id === id ? { ...p, activo: false } : p));
      toast.success('Promoción desactivada');
    } catch (err) {
      toast.error(err.message || 'Error');
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-4 text-slate-900">
        <div className="rounded-2xl border border-slate-200 bg-white shadow p-5 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">Promociones</p>
            <h2 className="text-2xl font-bold mt-1">Gestión</h2>
          </div>
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow p-5 space-y-3">
          <CardSkeleton lines={2} />
          <div className="grid gap-3 md:grid-cols-2">
            {[1, 2, 3, 4].map(n => (
              <Skeleton key={n} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4 text-slate-900">
      <div className="rounded-2xl border border-slate-200 bg-white shadow p-5 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">Promociones</p>
          <h2 className="text-2xl font-bold mt-1">Gestión</h2>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white font-semibold px-4 py-2 text-sm shadow shadow-slate-900/20 hover:bg-slate-800"
        >
          <FiPlus className="text-base" />
          Crear promoción
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">Promociones creadas</p>
            <h3 className="text-lg font-bold text-slate-900">Listado</h3>
          </div>
        </div>
        {promos.length === 0 && <div className="text-sm text-slate-600">Aún no hay promociones.</div>}
        <div className="space-y-3">
          {promos.map(p => (
            <div key={p.id} className="border border-slate-200 rounded-xl p-3 bg-slate-50">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-base font-bold text-slate-900">{p.nombre}</div>
                  <div className="text-xs text-slate-500">Precio final: ${Number(p.precio_final || 0).toFixed(2)}</div>
                  <div className="text-xs text-slate-500">Turno: {p.turno} · Días: {Array.isArray(p.dias) && p.dias.length ? p.dias.join(',') : 'Todos'}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${p.activo !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                    {p.activo !== false ? 'Activa' : 'Inactiva'}
                  </span>
                  <button onClick={() => openEditModal(p)} className="text-xs text-sky-700 font-semibold">Editar</button>
                  {p.activo !== false && <button onClick={() => desactivarPromo(p.id)} className="text-xs text-red-600 font-semibold">Desactivar</button>}
                </div>
              </div>
              {p.configuraciones && p.configuraciones.length > 0 && (
                <div className="text-xs text-slate-600 mt-2">
                  Configuraciones: {p.configuraciones.map(c => `Cat ${c.categoria_id}${c.producto_id ? ` · Prod ${c.producto_id}` : ''}${c.cantidad_max ? ` (min ${c.cantidad_min || 0} / máx ${c.cantidad_max})` : ''}`).join(' | ')}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-2xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">{editingId ? 'Editar' : 'Crear'} promoción</p>
                <h3 className="text-lg font-bold text-slate-900">{editingId ? 'Editar promoción' : 'Nueva promoción'}</h3>
              </div>
              <button className="text-slate-500 hover:text-slate-800" onClick={() => { setModalOpen(false); resetFormState(); }}>✕</button>
            </div>

            <form className="grid gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
              <label className="text-sm font-semibold text-slate-700 space-y-1">
                <span>Nombre</span>
                <input className="w-full rounded-lg border border-slate-200 px-3 py-2" value={form.nombre} onChange={e => updateForm('nombre', e.target.value)} required />
              </label>
              <label className="text-sm font-semibold text-slate-700 space-y-1">
                <span>Categoría</span>
                <select className="w-full rounded-lg border border-slate-200 px-3 py-2" value={form.categoria_id} onChange={e => updateForm('categoria_id', e.target.value)}>
                  <option value="">Sin categoría</option>
                  {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </label>
              <label className="text-sm font-semibold text-slate-700 space-y-1 md:col-span-2">
                <span>Descripción</span>
                <textarea className="w-full rounded-lg border border-slate-200 px-3 py-2" value={form.descripcion} onChange={e => updateForm('descripcion', e.target.value)} rows={2} />
              </label>
              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold text-slate-700 space-y-1 flex-1">
                  <span>Válido desde</span>
                  <input type="date" className="w-full rounded-lg border border-slate-200 px-3 py-2" value={form.valido_desde} onChange={e => updateForm('valido_desde', e.target.value)} />
                </label>
                <label className="text-sm font-semibold text-slate-700 space-y-1 flex-1">
                  <span>Hasta</span>
                  <input type="date" className="w-full rounded-lg border border-slate-200 px-3 py-2" value={sinFechaFin ? '' : form.valido_hasta} onChange={e => updateForm('valido_hasta', e.target.value)} disabled={sinFechaFin} />
                </label>
                <label className="text-xs font-semibold text-slate-600 flex items-center gap-2 mt-6">
                  <input type="checkbox" checked={sinFechaFin} onChange={e => setSinFechaFin(e.target.checked)} /> Sin fecha fin
                </label>
              </div>
              <label className="text-sm font-semibold text-slate-700 space-y-1">
                <span>Turno</span>
                <select className="w-full rounded-lg border border-slate-200 px-3 py-2" value={form.turno} onChange={e => updateForm('turno', e.target.value)}>
                  {TURNOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </label>
              <label className="text-sm font-semibold text-slate-700 space-y-1">
                <span>Límite por pedido</span>
                <select className="w-full rounded-lg border border-slate-200 px-3 py-2" value={form.limite_por_pedido} onChange={e => updateForm('limite_por_pedido', e.target.value)}>
                  {LIMITE_OPTS.map(opt => <option key={opt.value || 'nil'} value={opt.value}>{opt.label}</option>)}
                </select>
              </label>
              <label className="text-sm font-semibold text-slate-700 space-y-1">
                <span>Tipo de descuento</span>
                <select className="w-full rounded-lg border border-slate-200 px-3 py-2" value={form.tipo_descuento} onChange={e => updateForm('tipo_descuento', e.target.value)}>
                  <option value="ninguno">Sin descuento</option>
                  <option value="porcentaje">% sobre total</option>
                  <option value="fijo">Fijo en $</option>
                </select>
              </label>
              <label className="text-sm font-semibold text-slate-700 space-y-1">
                <span>Valor descuento</span>
                <input type="number" className="w-full rounded-lg border border-slate-200 px-3 py-2" value={form.valor_descuento} onChange={e => updateForm('valor_descuento', e.target.value)} disabled={form.tipo_descuento === 'ninguno'} />
              </label>
              <label className="text-sm font-semibold text-slate-700 space-y-1">
                <span>Precio final</span>
                <input type="number" step="0.01" className="w-full rounded-lg border border-slate-200 px-3 py-2" value={form.precio_final} onChange={e => updateForm('precio_final', e.target.value)} required />
              </label>
              <label className="text-sm font-semibold text-slate-700 space-y-1">
                <span>IVA (%)</span>
                <input type="number" step="0.01" className="w-full rounded-lg border border-slate-200 px-3 py-2" value={form.iva} onChange={e => updateForm('iva', e.target.value)} />
              </label>
              <div className="md:col-span-2">
                <p className="text-sm font-semibold text-slate-700 mb-2">Días de la semana</p>
                <div className="flex flex-wrap gap-2">
                  {DIAS.map(d => (
                    <label key={d.value} className={`px-3 py-1 rounded-full border text-sm font-semibold cursor-pointer ${diasSel.includes(d.value) ? 'bg-sky-100 border-sky-300 text-sky-800' : 'border-slate-200 text-slate-600'}`}>
                      <input type="checkbox" className="mr-2" checked={diasSel.includes(d.value)} onChange={() => toggleDia(d.value)} />
                      {d.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2 border rounded-2xl border-slate-200 p-3 space-y-3 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-800">Configuraciones</p>
                    <p className="text-xs text-slate-500">Agrega las categorías de productos que componen la promo (ej: Sandwiches, Bebidas)</p>
                  </div>
                  <button
                    type="button"
                    onClick={addConfig}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-3 py-1.5 text-xs font-semibold shadow shadow-slate-900/20 hover:bg-slate-800"
                  >
                    <FiPlus className="text-sm" />
                    Agregar configuración
                  </button>
                </div>
                {configuraciones.map((cfg, idx) => (
                  <div key={idx} className="grid md:grid-cols-5 gap-2 border rounded-xl border-slate-200 bg-white p-3">
                    <label className="text-xs font-semibold text-slate-700 space-y-1">
                      <span>Categoría</span>
                      <select className="w-full rounded-lg border border-slate-200 px-2 py-2" value={cfg.categoria_id} onChange={e => updateConfig(idx, 'categoria_id', e.target.value)}>
                        <option value="">Selecciona</option>
                        {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                      </select>
                    </label>
                    <label className="text-xs font-semibold text-slate-700 space-y-1">
                      <span>Aplica a todos</span>
                      <select className="w-full rounded-lg border border-slate-200 px-2 py-2" value={cfg.aplica_todos ? '1' : '0'} onChange={e => updateConfig(idx, 'aplica_todos', e.target.value === '1')}>
                        <option value="1">Sí</option>
                        <option value="0">No</option>
                      </select>
                    </label>
                    <label className="text-xs font-semibold text-slate-700 space-y-1">
                      <span>Producto (opcional)</span>
                      <select className="w-full rounded-lg border border-slate-200 px-2 py-2" value={cfg.producto_id} onChange={e => updateConfig(idx, 'producto_id', e.target.value)} disabled={cfg.aplica_todos}>
                        <option value="">Todos</option>
                        {(productsByCategory[cfg.categoria_id] || []).map(p => (
                          <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs font-semibold text-slate-700 space-y-1">
                      <span>Cant. mínima</span>
                      <input type="number" className="w-full rounded-lg border border-slate-200 px-2 py-2" value={cfg.cantidad_min} onChange={e => updateConfig(idx, 'cantidad_min', e.target.value)} />
                    </label>
                    <label className="text-xs font-semibold text-slate-700 space-y-1">
                      <span>Cant. máxima (0 = sin máx)</span>
                      <input type="number" className="w-full rounded-lg border border-slate-200 px-2 py-2" value={cfg.cantidad_max} onChange={e => updateConfig(idx, 'cantidad_max', e.target.value)} />
                    </label>
                    <div className="md:col-span-5 flex justify-end">
                      <button type="button" onClick={() => removeConfig(idx)} className="text-xs text-red-600 font-semibold">Eliminar</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="md:col-span-2 flex justify-end gap-3">
                <button type="button" onClick={() => { setModalOpen(false); resetFormState(); }} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold">{saving ? 'Guardando...' : (editingId ? 'Actualizar' : 'Guardar')} promoción</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
