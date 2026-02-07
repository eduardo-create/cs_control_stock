import React from 'react';
import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
      <div className="max-w-3xl w-full text-center space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">
          Control Stock SaaS
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Gestiona ventas, stock y caja sin complicarte</h1>
        <p className="text-slate-300 text-lg">Pensado para locales gastronómicos y retail: punto de venta, inventario y administración en un solo panel.</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            to="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-white font-semibold shadow-lg shadow-slate-900/30 hover:bg-slate-800"
          >
            Iniciar sesión
          </Link>
          <Link
            to="/onboarding"
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-slate-50 font-semibold hover:bg-white/10"
          >
            Crear mi negocio
          </Link>
        </div>
      </div>
    </div>
  );
}
