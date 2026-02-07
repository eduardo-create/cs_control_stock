import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPackage, FiTag, FiCreditCard, FiUsers, FiTruck, FiClipboard, FiPercent } from 'react-icons/fi';

const tiles = [
  { title: 'Productos', desc: 'Registra y edita tus productos', to: '/config/productos', icon: <FiPackage /> },
  { title: 'Categorías', desc: 'Organiza los productos', to: '/config/categorias', icon: <FiTag /> },
  { title: 'Promociones', desc: 'Configura combos y descuentos', to: '/config/promociones', icon: <FiPercent /> },
  { title: 'Métodos de pago', desc: 'Gestiona las formas de cobro', to: '/config/metodos-pago', icon: <FiCreditCard /> },
  { title: 'Usuarios', desc: 'Administra usuarios del negocio', to: '/config/usuarios', icon: <FiUsers /> },
  { title: 'Compras', desc: 'Registra compras y stock', to: '/compras', icon: <FiClipboard /> },
  { title: 'Proveedores', desc: 'Gestiona proveedores del negocio', to: '/config/proveedores', icon: <FiTruck /> },
];

export default function ConfigHome() {
  const navigate = useNavigate();

  return (
    <div className="max-w-6xl mx-auto space-y-5 text-slate-900">
      <div className="rounded-2xl border border-slate-200 bg-white shadow p-5">
        <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">Configuración</p>
        <h2 className="text-2xl font-bold mt-1">Panel de ajustes</h2>
        <p className="text-sm text-slate-500 mt-1">Elige un módulo y se abrirá a la derecha manteniendo el menú lateral.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map(tile => (
          <button
            key={tile.to}
            className="rounded-2xl border border-slate-200 bg-white shadow hover:shadow-lg transition shadow-slate-900/5 text-left p-4 flex flex-col gap-3"
            onClick={() => navigate(tile.to)}
          >
            <div className="flex items-center gap-3">
              <span className="w-12 h-12 rounded-xl bg-slate-900/10 text-slate-700 inline-flex items-center justify-center text-xl">{tile.icon}</span>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{tile.title}</h3>
                <p className="text-sm text-slate-500">{tile.desc}</p>
              </div>
            </div>
            <span className="text-sm font-semibold text-slate-500 inline-flex items-center gap-2">
              Ir a {tile.title.toLowerCase()}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
