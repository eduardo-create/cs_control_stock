import React from 'react';
import ConfigProveedores from './ConfigProveedores';

export default function ProveedoresPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-5 text-slate-900">
      <div className="rounded-2xl border border-slate-200 bg-white shadow p-5">
        <h2 className="text-2xl font-bold mt-1">Proveedores</h2>
        <p className="text-sm text-slate-500 mt-1">Gestiona aqui tus proveedores.</p>
      </div>
      <ConfigProveedores />
    </div>
  );
}
