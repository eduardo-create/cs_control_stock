import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Skeleton from './Skeleton';

export default function NovedadesPage() {
  const { token, user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ titulo: '', contenido: '', modulo: '', tags: '', visible_desde: '', image_base64: '' });
  const [expanded, setExpanded] = useState({});

  async function load() {
    setLoading(true);
    setError('');
    try {
      const API_BASE = import.meta.env.VITE_API_BASE || '';
      const url = API_BASE + '/api/admin/changelog';
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('No se pudo cargar el changelog');
      const data = await res.json();
      setItems(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function toggle(id) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  }

  const latestId = items.length > 0 ? items[0].id : null;

  function formatDateTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.toLocaleDateString()} · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      const payload = {
        titulo: form.titulo,
        contenido: form.contenido,
        modulo: form.modulo || null,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        visible_desde: form.visible_desde || null,
        image_base64: form.image_base64 || null
      };
      const res = await fetch('/api/admin/changelog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('No se pudo crear la novedad');
      setForm({ titulo: '', contenido: '', modulo: '', tags: '', visible_desde: '', image_base64: '' });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 uppercase font-semibold">Novedades</p>
          <h1 className="text-2xl font-bold text-slate-900">Log de cambios</h1>
        </div>
        <button
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          onClick={load}
        >
          Recargar
        </button>
      </div>

      {user?.rol === 'superadmin' && (
        <form onSubmit={handleCreate} className="mb-4 space-y-3 rounded-xl border border-slate-200 bg-white shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">Solo superadmin</p>
              <h2 className="text-lg font-bold text-slate-900">Publicar novedad</h2>
            </div>
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-slate-900 text-white px-3 py-2 text-sm font-semibold hover:bg-slate-800 disabled:opacity-50"
            >
              {creating ? 'Publicando...' : 'Publicar'}
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm text-slate-700 font-semibold flex flex-col gap-1">
              Título
              <input className="border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} required />
            </label>
            <label className="text-sm text-slate-700 font-semibold flex flex-col gap-1">
              Módulo (opcional)
              <input className="border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.modulo} onChange={e => setForm({ ...form, modulo: e.target.value })} placeholder="General" />
            </label>
            <label className="text-sm text-slate-700 font-semibold flex flex-col gap-1">
              Tags (coma separada)
              <input className="border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="reportes,ventas" />
            </label>
            <label className="text-sm text-slate-700 font-semibold flex flex-col gap-1">
              Visible desde (opcional)
              <input type="datetime-local" className="border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.visible_desde} onChange={e => setForm({ ...form, visible_desde: e.target.value })} />
            </label>
          </div>
          <label className="text-sm text-slate-700 font-semibold flex flex-col gap-1">
            Imagen (opcional)
            <input type="file" accept="image/*" className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
              onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => setForm({ ...form, image_base64: reader.result?.toString() || '' });
                reader.readAsDataURL(file);
              }}
            />
            {form.image_base64 && <span className="text-xs text-slate-500">Imagen cargada</span>}
          </label>
          <label className="text-sm text-slate-700 font-semibold flex flex-col gap-1">
            Contenido
            <textarea className="border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[120px]" value={form.contenido} onChange={e => setForm({ ...form, contenido: e.target.value })} required />
          </label>
        </form>
      )}

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(n => (
            <Skeleton key={n} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      )}
      {error && <div className="text-red-600 font-semibold">{error}</div>}

      {!loading && !error && items.length === 0 && (
        <div className="text-slate-500">No hay novedades aún.</div>
      )}

      <div className="space-y-4">
        {items.map(item => (
          <article key={item.id} className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                {latestId === item.id && <span className="inline-flex items-center rounded-full bg-red-100 text-red-700 text-xs font-bold px-2 py-1">Nuevo!</span>}
                <span className="text-xs text-slate-500 font-semibold">{formatDateTime(item.visible_desde)}</span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-2 py-1 font-semibold">{item.modulo || 'General'}</span>
                {(item.tags || []).map((tag, idx) => (
                  <span key={`${item.id}-${tag}-${idx}`} className="inline-flex items-center rounded-full bg-purple-50 text-purple-700 px-2 py-1 font-semibold border border-purple-100">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-900">{item.titulo}</h2>
              <button
                className="text-sm font-semibold text-sky-700 hover:text-sky-800"
                onClick={() => toggle(item.id)}
              >
                {expanded[item.id] ? 'Ocultar detalle' : 'Ver detalle'}
              </button>
            </div>

            <div className={`mt-2 text-sm text-slate-700 ${expanded[item.id] ? 'whitespace-pre-wrap' : 'line-clamp-2'} transition-all`}>
              {item.contenido}
            </div>

            {expanded[item.id] && item.image_base64 && (
              <div className="mt-3">
                <img src={item.image_base64} alt={item.titulo} className="rounded-xl border border-slate-200 max-h-96 object-contain" />
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
