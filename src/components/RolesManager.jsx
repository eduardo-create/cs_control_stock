import React, { useEffect, useState } from 'react';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

export default function RolesManager({ onChanged }) {
  const { token, user } = useAuth();
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [editingRole, setEditingRole] = useState(null);
  const [form, setForm] = useState({ nombre: '', slug: '', permisos: [], baseRole: '' });
  const [baseRoles, setBaseRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const negocioId = user?.negocio_id;
  const API_BASE = import.meta.env.VITE_API_BASE || ''; // ya existe

  useEffect(() => {
    if (!negocioId) return;
    fetchRoles();
    fetchPermissions();
    fetchBaseRoles();
  }, [negocioId, token]);

  async function fetchPermissions() {
    try {
      const res = await fetch(`${API_BASE}/api/negocios/${negocioId}/permissions/available`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: 'include',
      });
      if (!res.ok) {
        setPermissions([]);
        return;
      }
      const data = await res.json();
      // Normalizar a array de objetos { slug } para que la UI no dependa del formato
      if (Array.isArray(data)) {
        const normalized = data.map(item => {
          if (typeof item === 'string') return { slug: item };
          if (item && typeof item === 'object') {
            if (item.slug) return { slug: item.slug };
            if (item.id && item.nombre) return { slug: String(item.id) }; // fallback
          }
          return { slug: String(item) };
        });
        setPermissions(normalized);
      } else {
        setPermissions([]);
      }
    } catch (err) {
      console.error('fetchPermissions error', err);
      setPermissions([]);
    }
  }

  async function fetchBaseRoles() {
    try {
      const res = await fetch(`${API_BASE}/api/roles/base-roles`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: 'include',
      });
      if (!res.ok) { setBaseRoles([]); return; }
      const data = await res.json();
      setBaseRoles(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('fetchBaseRoles error', err);
      setBaseRoles([]);
    }
  }

  async function fetchRoles() {
    if (!negocioId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/negocios/${negocioId}/roles`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: 'include',
      });
      if (!res.ok) { setRoles([]); return; }
      const data = await res.json();
      setRoles(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('fetchRoles error', err);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }

  function startEdit(role) {
    setEditingRole(role.id);
    setForm({ nombre: role.nombre, slug: role.slug, permisos: role.permisos || [] });
  }

  function startCreate() {
    setEditingRole('new');
    setForm({ nombre: '', slug: '', permisos: [], baseRole: '' });
  }

  async function saveRole() {
    setLoading(true);
    const payload = { ...form, permisos: form.permisos };
    let url = `${API_BASE}/api/negocios/${negocioId}/roles`;
    let method = 'POST';
    if (editingRole !== 'new') {
      url += `/${editingRole}`;
      method = 'PUT';
    }
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      fetchRoles();
      setEditingRole(null);
      if (onChanged) onChanged();
    }
    setLoading(false);
  }

  async function deleteRole(id) {
    if (!window.confirm('¿Eliminar este rol?')) return;
    setLoading(true);
    await fetch(`${API_BASE}/api/negocios/${negocioId}/roles/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    });
    fetchRoles();
    setLoading(false);
  }

  return (
    <div className="space-y-5">
      <form className="rounded-2xl border border-slate-200 bg-white shadow p-5 space-y-4 mb-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">Roles</p>
            <h2 className="text-2xl font-bold">Roles personalizados</h2>
            <p className="text-sm text-slate-500">Crea, edita y elimina roles del negocio. Solo puedes asignar permisos que posees.</p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white font-semibold px-4 py-2.5 text-sm shadow shadow-slate-900/20 transition hover:bg-slate-800 disabled:opacity-60"
            onClick={startCreate}
          >
            <FiPlus className="text-base" /> Crear rol
          </button>
        </div>
      </form>
      <div className="rounded-2xl border border-slate-200 bg-white shadow p-4 space-y-2">
        {roles.map(role => (
          <div key={role.id} className="flex items-center justify-between border-b border-slate-100 py-2 last:border-b-0">
            <div>
              <div className="font-bold text-slate-900">{role.nombre}</div>
              <div className="text-xs text-slate-500">{role.slug}</div>
              <div className="text-xs text-slate-700 mt-1">Permisos: {role.permisos?.join(', ') || '—'}</div>
            </div>
            <div className="flex gap-2">
              <button className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50" onClick={() => startEdit(role)}>
                <FiEdit2 /> Editar
              </button>
              <button className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100" onClick={() => deleteRole(role.id)}>
                <FiTrash2 /> Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
      {editingRole && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 mb-2">{editingRole === 'new' ? 'Crear rol' : 'Editar rol'}</h3>
            <form className="space-y-4" onSubmit={e => { e.preventDefault(); saveRole(); }}>
              <div className="grid gap-3 md:grid-cols-1">
                <label className="text-sm font-semibold text-slate-700 space-y-1">
                  <span className="block">Rol base permitido</span>
                  <select
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                    value={form.baseRole}
                    onChange={e => setForm(f => ({ ...f, baseRole: e.target.value }))}
                    required
                  >
                    <option value="">Selecciona un rol base</option>
                    {baseRoles.map(r => (
                      <option key={r.slug} value={r.slug}>{r.nombre || r.slug}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-semibold text-slate-700 space-y-1">
                  <span className="block">Nombre del rol</span>
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                    placeholder="Nombre del rol"
                    value={form.nombre}
                    onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                    required
                  />
                </label>
                <label className="text-sm font-semibold text-slate-700 space-y-1">
                  <span className="block">Slug (identificador)</span>
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                    placeholder="Slug (identificador)"
                    value={form.slug}
                    onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                    required
                  />
                </label>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Permisos</label>
                <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2">
                  {(Array.isArray(permissions) ? permissions : []).map((permObj, i) => {
                    const slug = typeof permObj === 'string' ? permObj : (permObj?.slug || String(permObj));
                    const checked = form.permisos.includes(slug);
                    const disabled = !(user?.permissions?.includes ? user.permissions.includes(slug) : false) && user?.rol !== 'superadmin';
                    return (
                      <label key={slug + '-' + i} className="flex items-center gap-2 px-1 py-1 rounded hover:bg-slate-100 transition">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={e => {
                            setForm(f => ({
                              ...f,
                              permisos: e.target.checked
                                ? [...f.permisos, slug]
                                : f.permisos.filter(p => p !== slug)
                            }));
                          }}
                          disabled={disabled}
                          className="accent-sky-600 h-4 w-4 rounded border-slate-300"
                        />
                        <span className="text-xs text-slate-700 break-all">{slug}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white font-semibold px-4 py-2.5 text-sm shadow shadow-slate-900/20 transition hover:bg-slate-800 disabled:opacity-60"
                >
                  <FiPlus className="text-base" />
                  {loading ? 'Guardando...' : 'Guardar rol'}
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-200 text-slate-800 font-semibold px-4 py-2.5 text-sm shadow shadow-slate-900/10 transition hover:bg-slate-300"
                  onClick={() => setEditingRole(null)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
