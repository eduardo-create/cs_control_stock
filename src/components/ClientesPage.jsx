import React from 'react';
import ConfigClientes from './ConfigClientes';

export default function ClientesPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-5 text-slate-900">
      <div className="rounded-2xl border border-slate-200 bg-white shadow p-5">
        <h2 className="text-2xl font-bold mt-1">Clientes</h2>
        <p className="text-sm text-slate-500 mt-1">Gestiona aquí tus clientes.</p>
      </div>
      <ConfigClientes />
    </div>
  );
}
