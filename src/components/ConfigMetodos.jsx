import React from 'react';
import PaymentMethods from './PaymentMethods';

export default function ConfigMetodos() {
  return (
    <div className="max-w-6xl mx-auto space-y-5 text-slate-900">
      <div className="rounded-2xl border border-slate-200 bg-white shadow p-5">
        <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">Configuración</p>
        <h2 className="text-2xl font-bold mt-1">Métodos de pago</h2>
        <p className="text-sm text-slate-500 mt-1">Activa, desactiva y ordena las formas de cobro.</p>
      </div>
      <PaymentMethods />
    </div>
  );
}
