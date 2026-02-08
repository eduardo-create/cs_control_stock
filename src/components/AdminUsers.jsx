import React, { useEffect, useMemo, useState } from 'react';
import AdminUserForm from './AdminUserForm';
import { useAuth } from '../context/AuthContext';
import { TableSkeleton } from './Skeleton';

const fallbackRoles = [
  { slug: 'admin', nombre: 'admin' },
  { slug: 'caja', nombre: 'caja' },
  { slug: 'cajero', nombre: 'cajero' },
  { slug: 'vendedor', nombre: 'vendedor' },
  { slug: 'encargado', nombre: 'encargado' },
  { slug: 'consulta', nombre: 'consulta' }
];

export default function AdminUsers() {
  const { token, user } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({ nombre: '', email: '', rol: '' });
  const [filtro, setFiltro] = useState('');
  const [confirmUser, setConfirmUser] = useState(null);
  const isAdminRole = user?.rol === 'admin';

  const API_BASE = import.meta.env.VITE_API_BASE || '';

  async function fetchUsuarios() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/usuarios`, {
        method: 'GET',
        headers: { Authorization: token ? `Bearer ${token}` : undefined },
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Error al obtener usuarios');
      const data = await res.json();
      setUsuarios(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchRoles() {
    try {
      const resRoles = await fetch(`${API_BASE}/api/roles`, {
        method: 'GET',
        headers: { Authorization: token ? `Bearer ${token}` : undefined },
        credentials: 'include'
      });
      if (!resRoles.ok) throw new Error('Error al obtener roles');
      const data = await resRoles.json();
      setRoles(Array.isArray(data) ? data : []);
    } catch (err) {
      setRoles([]);
    }
  }

  useEffect(() => {
    fetchUsuarios();
    fetchRoles();
  }, []);

  const roleOptions = useMemo(() => (roles.length ? roles : fallbackRoles), [roles]);

  function startEdit(u) {
    setEditId(u.id);
    setEditData({ nombre: u.nombre, email: u.email, rol: u.rol });
  }

  async function saveEdit(id) {
    await fetch(`${API_BASE}/api/usuarios/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : undefined },
      body: JSON.stringify(editData),
      credentials: 'include'
    });
    setEditId(null);
    fetchUsuarios();
  }

  const usuariosFiltrados = usuarios.filter(u =>
    u.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
    u.email.toLowerCase().includes(filtro.toLowerCase()) ||
    u.rol.toLowerCase().includes(filtro.toLowerCase())
  );

  function exportCSV() {
    const rows = [
      ['ID','Nombre','Email','Rol','Activo'],
      ...usuariosFiltrados.map(u => [u.id, u.nombre, u.email, u.rol, u.activo ? 'Sí' : 'No'])
    ];
    const csv = rows.map(r => r.map(x => '"'+String(x).replace(/"/g,'""')+'"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'usuarios.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5 text-slate-900">
      <div className="rounded-2xl border border-slate-200 bg-white shadow p-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">Usuarios</p>
          <h2 className="text-2xl font-bold">Gestión de accesos</h2>
          <p className="text-sm text-slate-500">Crea, edita y administra los usuarios del negocio.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="w-full md:w-64 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
            placeholder="Buscar por nombre, email o rol"
            value={filtro}
            onChange={e => setFiltro(e.target.value)}
          />
          <button
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
            onClick={exportCSV}
          >
            Exportar CSV
          </button>
        </div>
      </div>

      <AdminUserForm onCreated={fetchUsuarios} roles={roleOptions} />

      <div className="rounded-2xl border border-slate-200 bg-white shadow">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200">
          <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">Listado de usuarios</p>
          {loading && <span className="text-xs text-slate-500">Cargando...</span>}
          {error && <span className="text-xs font-semibold text-red-600">{error}</span>}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 uppercase text-xs font-semibold">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Nombre</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Rol</th>
                <th className="px-4 py-3 text-left">Activo</th>
                <th className="px-4 py-3 text-left">Acción</th>
                <th className="px-4 py-3 text-left">Resetear contraseña</th>
                <th className="px-4 py-3 text-left">Editar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-4">
                    <TableSkeleton rows={4} columns={8} height={12} />
                  </td>
                </tr>
              )}
              {usuariosFiltrados.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-semibold">{u.id}</td>
                  <td className="px-4 py-3">
                    {editId === u.id ? (
                      <input
                        value={editData.nombre}
                        onChange={e=>setEditData({...editData, nombre: e.target.value})}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm"
                      />
                    ) : u.nombre}
                  </td>
                  <td className="px-4 py-3">
                    {editId === u.id ? (
                      <input
                        value={editData.email}
                        onChange={e=>setEditData({...editData, email: e.target.value})}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm"
                      />
                    ) : u.email}
                  </td>
                  <td className="px-4 py-3">
                    {editId === u.id ? (
                      <select
                        value={editData.rol}
                        onChange={e=>setEditData({...editData, rol: e.target.value})}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm"
                      >
                        {(() => {
                          const options = roleOptions.some(r => r.slug === editData.rol)
                            ? roleOptions
                            : [...roleOptions, { slug: editData.rol, nombre: editData.rol }];
                          return options.map(role => (
                            <option key={role.slug} value={role.slug}>{role.nombre || role.slug}</option>
                          ));
                        })()}
                      </select>
                    ) : u.rol}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${u.activo ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                      disabled={!isAdminRole}
                      onClick={() => {
                        if (!isAdminRole) return;
                        setConfirmUser(u);
                      }}
                    >
                      {u.activo ? 'Desactivar' : 'Reactivar'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                      onClick={async () => {
                        const nueva = prompt('Nueva contraseña para ' + u.nombre + ':');
                        if (!nueva || nueva.length < 6) return alert('La contraseña debe tener al menos 6 caracteres');
                        await fetch(`${API_BASE}/api/usuarios/${u.id}/password`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : undefined },
                          body: JSON.stringify({ password: nueva }),
                          credentials: 'include'
                        });
                        alert('Contraseña actualizada');
                      }}
                    >
                      Reset
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    {editId === u.id ? (
                      <div className="flex gap-2">
                        <button
                          className="rounded-lg bg-slate-900 text-white px-3 py-1.5 text-xs font-semibold hover:bg-slate-800"
                          onClick={()=>saveEdit(u.id)}
                        >
                          Guardar
                        </button>
                        <button
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                          onClick={()=>setEditId(null)}
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                        onClick={()=>startEdit(u)}
                      >
                        Editar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!usuariosFiltrados.length && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-sm text-slate-500">Sin usuarios</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {confirmUser && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Confirmar desactivación</h3>
            <p className="text-sm text-slate-600">¿Seguro que deseas desactivar al usuario <strong className="text-slate-900">{confirmUser.nombre}</strong>? Podrás reactivarlo luego.</p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                onClick={() => setConfirmUser(null)}
              >
                Cancelar
              </button>
              <button
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100"
                onClick={async () => {
                  await fetch(`${API_BASE}/api/usuarios/${confirmUser.id}`, {
                    method: 'DELETE',
                    headers: { Authorization: token ? `Bearer ${token}` : undefined },
                    credentials: 'include'
                  });
                  setConfirmUser(null);
                  fetchUsuarios();
                }}
              >
                Desactivar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
