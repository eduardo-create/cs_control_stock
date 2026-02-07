import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Skeleton from './Skeleton';
import { FiPlus } from 'react-icons/fi';

function authFetch(path, opts = {}, token) {
  const headers = Object.assign({}, opts.headers || {});
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(path, Object.assign({}, opts, { headers, credentials: 'include' }));
}

const emptyForm = { nombre: '', precio: '', stock_total: '', categorias: [] };

export default function ProductsManager({ catVersion = 0 }) {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('');
  const [ajusteItem, setAjusteItem] = useState(null);
  const [ajusteForm, setAjusteForm] = useState({ cantidad: '', motivo: '' });

  const catById = useMemo(() => Object.fromEntries(categorias.map(c => [c.id, c])), [categorias]);

  useEffect(() => {
    if (!token) return;
    loadCategorias();
    loadProductos();
  }, [token, catVersion]);

  async function loadProductos() {
    setLoading(true);
    try {
      const res = await authFetch('/api/productos', {}, token);
      if (!res.ok) throw new Error('No se pudieron cargar los productos');
      const data = await res.json();
      if (Array.isArray(data)) setItems(data);
    } catch (e) {
      toast.error(e.message || 'Error al cargar productos');
    } finally {
      setLoading(false);
    }
  }

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

  function updateForm(field, value, target = 'create') {
    if (target === 'edit') {
      setEditForm(prev => ({ ...prev, [field]: value }));
    } else {
      setForm(prev => ({ ...prev, [field]: value }));
    }
  }

  function handleCategoriaSelect(event, target = 'create') {
    const values = Array.from(event.target.selectedOptions).map(opt => Number(opt.value));
    updateForm('categorias', values, target);
  }

  function validarCampos(values) {
    if (!values.nombre.trim()) return 'Nombre requerido';
    const precioNum = parseFloat(values.precio);
    if (Number.isNaN(precioNum) || precioNum < 0) return 'Precio inválido';
    const stockNum = parseInt(values.stock_total, 10);
    if (Number.isNaN(stockNum) || stockNum < 0) return 'Stock inválido';
    return null;
  }

  async function submitCreate(e) {
    e.preventDefault();
    const errorMsg = validarCampos(form);
    if (errorMsg) return toast.error(errorMsg);
    try {
      setSaving(true);
      const res = await authFetch('/api/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: form.nombre,
          precio: parseFloat(form.precio),
          stock_total: parseInt(form.stock_total, 10),
          categorias: form.categorias
        })
      }, token);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Error ${res.status}`);
      }
      toast.success('Producto creado');
      setForm({ ...emptyForm });
      loadProductos();
    } catch (e) {
      toast.error(e.message || 'No se pudo crear');
    } finally {
      setSaving(false);
    }
  }

  function abrirEdicion(item) {
    loadCategorias(); // refresca catálogo de categorías al abrir modal
    setEditItem(item);
    setEditForm({
      nombre: item.nombre,
      precio: item.precio,
      stock_total: item.stock_total,
      categorias: item.categoria_ids || []
    });
  }

  async function submitEdit(e) {
    e.preventDefault();
    if (!editItem) return;
    const errorMsg = validarCampos(editForm);
    if (errorMsg) return toast.error(errorMsg);
    try {
      setSaving(true);
      const res = await authFetch(`/api/productos/${editItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: editForm.nombre,
          precio: parseFloat(editForm.precio),
          stock_total: parseInt(editForm.stock_total, 10),
          categorias: editForm.categorias
        })
      }, token);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Error ${res.status}`);
      }
      toast.success('Producto actualizado');
      setEditItem(null);
      setEditForm({ ...emptyForm });
      loadProductos();
    } catch (e) {
      toast.error(e.message || 'No se pudo actualizar');
    } finally {
      setSaving(false);
    }
  }

  async function eliminar(id) {
    if (!window.confirm('¿Eliminar producto?')) return;
    try {
      const res = await authFetch(`/api/productos/${id}`, { method: 'DELETE' }, token);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Error ${res.status}`);
      }
      toast.success('Producto eliminado');
      loadProductos();
    } catch (e) {
      toast.error(e.message || 'No se pudo eliminar');
    }
  }

  async function submitAjuste(e) {
    e.preventDefault();
    if (!ajusteItem) return;
    const delta = parseFloat(ajusteForm.cantidad);
    if (!Number.isFinite(delta) || delta === 0) return toast.error('Cantidad debe ser distinta de cero');
    try {
      setSaving(true);
      const res = await authFetch(`/api/productos/${ajusteItem.id}/ajuste`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cantidad: delta, motivo: ajusteForm.motivo })
      }, token);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Error ${res.status}`);
      }
      toast.success('Ajuste registrado');
      setAjusteItem(null);
      setAjusteForm({ cantidad: '', motivo: '' });
      loadProductos();
    } catch (e) {
      toast.error(e.message || 'No se pudo ajustar');
    } finally {
      setSaving(false);
    }
  }

  const filtrados = useMemo(() => {
    const q = filter.toLowerCase();
    if (!q) return items;
    return items.filter(p =>
      p.nombre.toLowerCase().includes(q) ||
      String(p.precio).includes(q) ||
      (Array.isArray(p.categorias) && p.categorias.join(',').toLowerCase().includes(q))
    );
  }, [items, filter]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow p-5 space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">Productos</p>
      </div>

      <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 items-end" onSubmit={submitCreate}>
        <label className="text-sm font-semibold text-slate-700 space-y-1">
          <span className="block">Nombre</span>
          <input
            type="text"
            placeholder="Nombre"
            value={form.nombre}
            onChange={e => updateForm('nombre', e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
          />
        </label>
        <label className="text-sm font-semibold text-slate-700 space-y-1">
          <span className="block">Precio</span>
          <input
            type="number"
            step="0.01"
            placeholder="0"
            value={form.precio}
            onChange={e => updateForm('precio', e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
          />
        </label>
        <label className="text-sm font-semibold text-slate-700 space-y-1">
          <span className="block">Stock</span>
          <input
            type="number"
            placeholder="0"
            value={form.stock_total}
            onChange={e => updateForm('stock_total', e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
          />
        </label>
        <label className="text-sm font-semibold text-slate-700 space-y-1 lg:col-span-2">
          <span className="block">Categorías</span>
          <div className="flex flex-wrap gap-2">
            {categorias.map(c => (
              <label key={c.id} className={`flex items-center gap-1 px-2 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer transition hover:bg-sky-50 ${form.categorias.includes(c.id) ? 'ring-2 ring-sky-400 bg-sky-50 border-sky-200' : ''}`}>
                <input
                  type="checkbox"
                  value={c.id}
                  checked={form.categorias.includes(c.id)}
                  onChange={e => {
                    const checked = e.target.checked;
                    setForm(f => ({
                      ...f,
                      categorias: checked
                        ? [...f.categorias, c.id]
                        : f.categorias.filter(id => id !== c.id)
                    }));
                  }}
                  className="accent-sky-500"
                />
                {c.nombre}
              </label>
            ))}
          </div>
          <span className="text-xs text-slate-500 block mt-1">Selecciona una o más categorías</span>
        </label>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white font-semibold px-4 py-2.5 text-sm shadow shadow-slate-900/20 transition hover:bg-slate-800 disabled:opacity-60"
        >
          <FiPlus className="text-base" />
          {saving ? 'Guardando...' : 'Agregar producto'}
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-3">
        <input
          className="flex-1 min-w-[260px] rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
          placeholder="Buscar por nombre, precio o categoría"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
        <button
          type="button"
          onClick={loadProductos}
          disabled={loading}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-60"
        >
          Refrescar
        </button>
      </div>

      <div className="space-y-3">
        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map(n => (
              <Skeleton key={n} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        )}
        {!loading && filtrados.map(prod => (
          <div key={prod.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-slate-200 bg-white shadow-sm px-4 py-3">
            <div className="space-y-1">
              <div className="text-base font-semibold text-slate-900">{prod.nombre}</div>
              <div className="text-sm text-slate-600">${prod.precio} · Stock: {prod.stock_total}</div>
              {Array.isArray(prod.categorias) && prod.categorias.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {prod.categorias.map((cid, idx) => {
                    const cat = catById[cid];
                    return <span key={idx} className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">{cat ? cat.nombre : cid}</span>;
                  })}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => abrirEdicion(prod)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => { setAjusteItem(prod); setAjusteForm({ cantidad: '', motivo: '' }); }}
                className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100"
              >
                Ajustar stock
              </button>
              <button
                type="button"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                onClick={() => eliminar(prod.id)}
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
        {!loading && !filtrados.length && <p className="text-sm text-slate-500">No hay productos</p>}
      </div>

      {editItem && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Editar producto</h3>
              <button
                type="button"
                className="text-sm font-semibold text-slate-500 hover:text-slate-700"
                onClick={() => { setEditItem(null); setEditForm({ ...emptyForm }); }}
              >
                Cerrar
              </button>
            </div>
            <form className="grid gap-3 sm:grid-cols-2" onSubmit={submitEdit}>
              <label className="text-sm font-semibold text-slate-700 space-y-1 sm:col-span-2">
                <span className="block">Nombre</span>
                <input
                  type="text"
                  placeholder="Nombre"
                  value={editForm.nombre}
                  onChange={e => updateForm('nombre', e.target.value, 'edit')}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700 space-y-1">
                <span className="block">Precio</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={editForm.precio}
                  onChange={e => updateForm('precio', e.target.value, 'edit')}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700 space-y-1">
                <span className="block">Stock</span>
                <input
                  type="number"
                  placeholder="0"
                  value={editForm.stock_total}
                  onChange={e => updateForm('stock_total', e.target.value, 'edit')}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700 space-y-1 sm:col-span-2">
                <span className="block">Categorías</span>
                <div className="flex flex-wrap gap-2">
                  {categorias.map(c => (
                    <label key={c.id} className={`flex items-center gap-1 px-2 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer transition hover:bg-sky-50 ${editForm.categorias.includes(c.id) ? 'ring-2 ring-sky-400 bg-sky-50 border-sky-200' : ''}`}>
                      <input
                        type="checkbox"
                        value={c.id}
                        checked={editForm.categorias.includes(c.id)}
                        onChange={e => {
                          const checked = e.target.checked;
                          setEditForm(f => ({
                            ...f,
                            categorias: checked
                              ? [...f.categorias, c.id]
                              : f.categorias.filter(id => id !== c.id)
                          }));
                        }}
                        className="accent-sky-500"
                      />
                      {c.nombre}
                    </label>
                  ))}
                </div>
              </label>
              <div className="sm:col-span-2 flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                  onClick={() => { setEditItem(null); setEditForm({ ...emptyForm }); }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-slate-900 text-white font-semibold px-4 py-2.5 shadow shadow-slate-900/20 hover:bg-slate-800 disabled:opacity-60"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {ajusteItem && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Ajustar stock</h3>
              <button
                type="button"
                className="text-sm font-semibold text-slate-500 hover:text-slate-700"
                onClick={() => { setAjusteItem(null); setAjusteForm({ cantidad: '', motivo: '' }); }}
              >
                Cerrar
              </button>
            </div>
            <p className="text-sm text-slate-600">{ajusteItem.nombre} · Stock actual: {ajusteItem.stock_total}</p>
            <form className="space-y-3" onSubmit={submitAjuste}>
              <label className="text-sm font-semibold text-slate-700 space-y-1">
                <span>Cantidad (usa negativo para salida)</span>
                <input
                  type="number"
                  step="0.01"
                  value={ajusteForm.cantidad}
                  onChange={e => setAjusteForm(f => ({ ...f, cantidad: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700 space-y-1">
                <span>Motivo (opcional)</span>
                <input
                  type="text"
                  value={ajusteForm.motivo}
                  onChange={e => setAjusteForm(f => ({ ...f, motivo: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                />
              </label>
              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                  onClick={() => { setAjusteItem(null); setAjusteForm({ cantidad: '', motivo: '' }); }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-amber-600 text-white font-semibold px-4 py-2.5 shadow hover:bg-amber-700 disabled:opacity-60"
                >
                  {saving ? 'Guardando...' : 'Registrar ajuste'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
