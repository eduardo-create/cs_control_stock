import React from 'react';
import CategoriesManager from './CategoriesManager';

export default function ConfigCategorias() {
  return (
    <div className="max-w-6xl mx-auto space-y-5 text-slate-900">
      <div className="rounded-2xl border border-slate-200 bg-white shadow p-5">
        <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">Configuración</p>
        <h2 className="text-2xl font-bold mt-1">Categorías</h2>
        <p className="text-sm text-slate-500 mt-1">Crea y ordena categorías para tus productos.</p>
      </div>
      <CategoriesManager />
    </div>
  );
}
