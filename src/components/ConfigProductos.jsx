import React from 'react';
import ProductsManager from './ProductsManager';
import AjusteMasivoPrecios from './AjusteMasivoPrecios';

export default function ConfigProductos() {
  return (
    <div className="max-w-6xl mx-auto space-y-5 text-slate-900">
      <div className="rounded-2xl border border-slate-200 bg-white shadow p-5">
        <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">Configuración</p>
        <h2 className="text-2xl font-bold mt-1">Productos</h2>
        <p className="text-sm text-slate-500 mt-1">Registra, edita y controla los productos del catálogo.</p>
      </div>
      <ProductsManager />
      <AjusteMasivoPrecios />
    </div>
  );
}
