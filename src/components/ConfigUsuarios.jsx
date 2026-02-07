import React from 'react';
import AdminUsers from './AdminUsers';
import RolesManager from './RolesManager';

function ConfigUsuarios() {
  return (
    <div className="max-w-6xl mx-auto space-y-5 text-slate-900">
      <div className="rounded-2xl border border-slate-200 bg-white shadow p-5">
        <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">Configuración</p>
        <h2 className="text-2xl font-bold mt-1">Usuarios</h2>
        <p className="text-sm text-slate-500 mt-1">Administra usuarios, roles y accesos del negocio.</p>
      </div>
      <RolesManager />
      <AdminUsers />
    </div>
  );
}

export default ConfigUsuarios;
